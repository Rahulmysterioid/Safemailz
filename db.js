const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the SQLite database
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
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
                sender_id INTEGER NOT NULL,
                sender_org_id INTEGER NOT NULL,
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
    });
};

module.exports = {
    db,
    initDb
};
