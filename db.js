const { createClient } = require('@libsql/client');
const path = require('path');

let dbPath;
let authToken;
let client;

if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    dbPath = process.env.TURSO_DATABASE_URL;
    authToken = process.env.TURSO_AUTH_TOKEN;
    console.log('Connecting to Turso Cloud Database via @libsql/client...');
    client = createClient({ url: dbPath, authToken: authToken });
} else {
    // Prevent fallback to local database on Render production because the ephemeral disk will wipe data
    if (process.env.RENDER === 'true' || process.env.NODE_ENV === 'production') {
        throw new Error('CRITICAL: Turso Cloud Database credentials (TURSO_DATABASE_URL and TURSO_AUTH_TOKEN) are missing in Production! Falling back to local database will cause data wiping on every restart.');
    }
    dbPath = 'file:database.sqlite';
    console.log('Connecting to Local SQLite Database via @libsql/client...');
    client = createClient({ url: dbPath });
}

// Ensure callback works exactly like sqlite3
function extractArgs(args) {
    let sql = args[0];
    let params = [];
    let callback = null;

    if (args.length === 2) {
        if (typeof args[1] === 'function') callback = args[1];
        else params = args[1];
    } else if (args.length === 3) {
        params = args[1];
        callback = args[2];
    }

    return { sql, params, callback };
}

// Wrapper to make @libsql/client drop-in compatible with sqlite3 API
const db = {
    get: function(...args) {
        const { sql, params, callback } = extractArgs(args);
        client.execute({ sql, args: params }).then(rs => {
            if (callback) {
                const row = rs.rows.length > 0 ? rs.rows[0] : undefined;
                callback(null, row);
            }
        }).catch(err => {
            console.error('[DB GET Error]:', err.message);
            if (callback) callback(err);
        });
    },
    all: function(...args) {
        const { sql, params, callback } = extractArgs(args);
        client.execute({ sql, args: params }).then(rs => {
            if (callback) callback(null, rs.rows);
        }).catch(err => {
            console.error('[DB ALL Error]:', err.message);
            if (callback) callback(err);
        });
    },
    run: function(...args) {
        const { sql, params, callback } = extractArgs(args);
        
        // HTTP protocol doesn't support interactive transactions directly.
        // We shim BEGIN/COMMIT/ROLLBACK to auto-commit to prevent errors.
        if (typeof sql === 'string') {
            const sqlUpper = sql.trim().toUpperCase();
            if (sqlUpper === 'BEGIN TRANSACTION' || sqlUpper === 'COMMIT' || sqlUpper === 'ROLLBACK') {
                if (callback) callback.call({ lastID: undefined, changes: 0 }, null);
                return;
            }
        }

        client.execute({ sql, args: params }).then(rs => {
            if (callback) {
                const context = {
                    lastID: rs.lastInsertRowid ? Number(rs.lastInsertRowid) : undefined,
                    changes: rs.rowsAffected
                };
                callback.call(context, null);
            }
        }).catch(err => {
            // Suppress duplicate column errors during migrations
            if (err && err.message && err.message.indexOf('duplicate column name') === -1) {
                console.error('[DB RUN Error]:', err.message);
            }
            if (callback) callback(err);
        });
    },
    serialize: function(cb) {
        // @libsql/client is stateless and doesn't queue synchronously. 
        if (cb) cb();
    }
};

// Initialize the database tables
const initDb = async () => {
    const runQuery = (query) => new Promise((resolve, reject) => {
        db.run(query, [], (err) => {
            if (err) resolve(err); // Resolve with error instead of rejecting to allow migrations to fail safely
            else resolve(null);
        });
    });

    try {
        // Create organizations table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS organizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                organization_name TEXT NOT NULL,
                organization_size TEXT NOT NULL,
                backup_email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create users table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                organization_id INTEGER NOT NULL,
                admin_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                marketing_opt_in BOOLEAN DEFAULT 0,
                terms_accepted BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id)
            )
        `);

        // Create emails table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS emails (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email_no TEXT UNIQUE,
                sender_id INTEGER,
                sender_org_id INTEGER,
                external_sender_name TEXT,
                external_sender_email TEXT,
                external_id TEXT UNIQUE,
                subject TEXT,
                body TEXT,
                preview TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (sender_org_id) REFERENCES organizations(id)
            )
        `);

        // Create email recipients table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS email_recipients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                organization_id INTEGER NOT NULL,
                folder TEXT DEFAULT 'inbox',
                is_read BOOLEAN DEFAULT 0,
                is_action BOOLEAN DEFAULT 0,
                is_replied BOOLEAN DEFAULT 0,
                is_deleted BOOLEAN DEFAULT 0,
                FOREIGN KEY (email_id) REFERENCES emails(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (organization_id) REFERENCES organizations(id)
            )
        `);

        // Create email comments table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS email_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                comment TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email_id) REFERENCES emails(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Create invitations table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS invitations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                organization_id INTEGER NOT NULL,
                email TEXT NOT NULL,
                token TEXT NOT NULL UNIQUE,
                status TEXT DEFAULT 'pending',
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id)
            )
        `);

        // Create clients table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                organization_id INTEGER NOT NULL,
                display_name TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id)
            )
        `);

        // Run Migrations (safe to fail if column already exists)
        const runMigration = async (query) => {
            const err = await runQuery(query);
            if (err && err.message.indexOf('duplicate column name') === -1 && err.message.indexOf('already exists') === -1) {
                console.error('Migration error:', err.message);
            }
        };

        // Migrations for users table
        await runMigration("ALTER TABLE users ADD COLUMN sync_provider TEXT");
        await runMigration("ALTER TABLE users ADD COLUMN sync_access_token TEXT");
        await runMigration("ALTER TABLE users ADD COLUMN sync_refresh_token TEXT");
        await runMigration("ALTER TABLE users ADD COLUMN sync_token_expires_at DATETIME");
        await runMigration("ALTER TABLE users ADD COLUMN sync_last_sync_time DATETIME");
        await runMigration("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'");
        await runMigration("ALTER TABLE users ADD COLUMN dob TEXT");
        
        // Role-Based Permissions
        await runMigration("ALTER TABLE users ADD COLUMN perm_add_employees BOOLEAN DEFAULT 0");
        await runMigration("ALTER TABLE users ADD COLUMN perm_create_projects BOOLEAN DEFAULT 0");
        await runMigration("ALTER TABLE users ADD COLUMN perm_manage_projects BOOLEAN DEFAULT 0");
        await runMigration("ALTER TABLE users ADD COLUMN perm_make_admin BOOLEAN DEFAULT 0");
        await runMigration("ALTER TABLE users ADD COLUMN perm_delete_project BOOLEAN DEFAULT 0");

        // Migrations for emails table
        await runMigration("ALTER TABLE emails ADD COLUMN external_sender_name TEXT");
        await runMigration("ALTER TABLE emails ADD COLUMN external_sender_email TEXT");
        await runMigration("ALTER TABLE emails ADD COLUMN external_id TEXT");
        await runMigration("ALTER TABLE emails ADD COLUMN to_address TEXT");
        await runMigration("ALTER TABLE emails ADD COLUMN cc TEXT");
        await runMigration("ALTER TABLE emails ADD COLUMN bcc TEXT");

    } catch (e) {
        console.error("Failed to initialize database:", e);
    }
};

module.exports = {
    db,
    initDb
};
