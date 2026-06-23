const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run(`CREATE TABLE emails_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email_no TEXT UNIQUE,
                sender_id INTEGER,
                sender_org_id INTEGER,
                subject TEXT,
                body TEXT,
                preview TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                external_sender_name TEXT, 
                external_sender_email TEXT, 
                external_id TEXT UNIQUE,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (sender_org_id) REFERENCES organizations(id)
            )`);
    db.run(`INSERT INTO emails_new (id, email_no, sender_id, sender_org_id, subject, body, preview, created_at, external_sender_name, external_sender_email, external_id)
            SELECT id, email_no, sender_id, sender_org_id, subject, body, preview, created_at, external_sender_name, external_sender_email, external_id FROM emails`);
    db.run(`DROP TABLE emails`);
    db.run(`ALTER TABLE emails_new RENAME TO emails`);
    db.run('COMMIT', (err) => {
        if(err) console.error("Migration failed:", err);
        else console.log("Migration complete.");
        db.close();
    });
});
