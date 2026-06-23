const sqlite3 = require('@libsql/sqlite3').verbose();
const path = require('path');

let dbPath;
if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    dbPath = `${process.env.TURSO_DATABASE_URL}?authToken=${process.env.TURSO_AUTH_TOKEN}`;
    console.log('Connecting to Turso Cloud Database...');
} else {
    dbPath = path.resolve(__dirname, 'database.sqlite');
    console.log('Connecting to Local SQLite Database...');
}

// Connect to the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Successfully connected to the database.');
    }
});

// Initialize the database tables
const initDb = () => {
    db.serialize(() => {
        // Create organizations table
        db.run(`
            CREATE TABLE IF NOT EXISTS organizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                organization_name TEXT NOT NULL,
                organization_size TEXT NOT NULL,
                backup_email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create users table
        db.run(`
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
        db.run(`
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

        // Create email recipients table (handles folders, read state, visibility per user)
        db.run(`
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
        db.run(`
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
        db.run(`
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
        // Run Migrations (safe to fail if column already exists)
        const runMigration = (query) => {
            db.run(query, (err) => {
                if (err && err.message.indexOf('duplicate column name') === -1 && err.message.indexOf('already exists') === -1) {
                    console.error('Migration error:', err.message);
                }
            });
        };

        // Migrations for users table
        runMigration("ALTER TABLE users ADD COLUMN sync_provider TEXT");
        runMigration("ALTER TABLE users ADD COLUMN sync_access_token TEXT");
        runMigration("ALTER TABLE users ADD COLUMN sync_refresh_token TEXT");
        runMigration("ALTER TABLE users ADD COLUMN sync_token_expires_at DATETIME");
        runMigration("ALTER TABLE users ADD COLUMN sync_last_sync_time DATETIME");
        runMigration("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'");
        runMigration("ALTER TABLE users ADD COLUMN dob TEXT");

        // Migrations for emails table (Adding columns to existing tables where they might have been created without them)
        runMigration("ALTER TABLE emails ADD COLUMN external_sender_name TEXT");
        runMigration("ALTER TABLE emails ADD COLUMN external_sender_email TEXT");
        runMigration("ALTER TABLE emails ADD COLUMN external_id TEXT");
        runMigration("ALTER TABLE emails ADD COLUMN to_address TEXT");
        runMigration("ALTER TABLE emails ADD COLUMN cc TEXT");
        runMigration("ALTER TABLE emails ADD COLUMN bcc TEXT");

        // To drop NOT NULL constraint from existing emails table, we'll recreate if we need to but for local dev it's often easier to just delete the db if it's new.
        // Wait, SQLite doesn't let us ALTER COLUMN. If we have existing data, we can ignore the NOT NULL on insert if we insert dummy values, or we can just let developers delete the DB.
        // I will add a schema check and recreate emails if it has NOT NULL sender_id.
    });
};

module.exports = {
    db,
    initDb
};
