const express = require('express');
const { db } = require('../db');

const router = express.Router();

const toIST = (dateString) => {
    if (!dateString) return new Date();
    // SQLite CURRENT_TIMESTAMP is "YYYY-MM-DD HH:MM:SS" (UTC)
    const isoString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z';
    return new Date(isoString);
};

const formatToISTTime = (dateString) => {
    return toIST(dateString).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
};

const formatToISTDateTime = (dateString) => {
    return toIST(dateString).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Helper to get user context from headers
const getUserContext = (req) => {
    const userId = req.headers['x-user-id'];
    const orgId = req.headers['x-org-id'];
    if (!userId || !orgId) {
        return null;
    }
    return { userId: parseInt(userId, 10), orgId: parseInt(orgId, 10) };
};

// GET /api/emails
router.get('/', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const filter = req.query.filter || 'all';
    const search = req.query.search || '';

    let query = `
        SELECT 
            er.id as recipient_id, 
            er.folder, 
            er.is_read as read, 
            er.is_action as action, 
            er.is_replied as replied,
            e.id as email_id, 
            e.email_no as emailNo, 
            e.subject, 
            e.preview, 
            e.created_at,
            u.admin_name as sender_name,
            u.email as sender_email,
            (SELECT u2.email FROM email_recipients er2 JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_email,
            (SELECT u2.admin_name FROM email_recipients er2 JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_name
        FROM email_recipients er
        JOIN emails e ON er.email_id = e.id
        JOIN users u ON e.sender_id = u.id
        WHERE er.user_id = ? AND er.is_deleted = 0
    `;
    const params = [context.userId];

    if (filter === 'read') { query += ' AND er.is_read = 1'; }
    else if (filter === 'unread') { query += ' AND er.is_read = 0'; }
    else if (filter === 'draft') { query += " AND er.folder = 'drafts'"; }
    else if (filter === 'action') { query += ' AND er.is_action = 1'; }
    else if (filter === 'reply') { query += ' AND er.is_replied = 1'; }
    else if (filter.startsWith('folder:')) {
        query += ' AND er.folder = ?';
        params.push(filter.split(':')[1]);
    }

    query += ' ORDER BY e.created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Apply search in memory for simplicity
        let emails = rows.map(row => ({
            id: row.email_id,
            recipient_id: row.recipient_id,
            sender: row.folder === 'sent' ? `To: ${row.recipient_name || row.recipient_email || 'Unknown'}` : row.sender_name,
            senderEmail: row.folder === 'sent' ? row.recipient_email : row.sender_email,
            subject: row.subject,
            preview: row.preview || row.subject,
            folder: row.folder,
            read: !!row.read,
            replied: !!row.replied,
            action: !!row.action,
            emailNo: row.emailNo,
            date: formatToISTTime(row.created_at)
        }));

        if (search) {
            const q = search.trim().toLowerCase();
            emails = emails.filter(email => {
                const haystack = `${email.sender} ${email.subject} ${email.preview} ${email.emailNo} ${email.folder}`.toLowerCase();
                return haystack.includes(q);
            });
        }

        res.json({
            success: true,
            filter,
            search,
            emails
        });
    });
});

// GET /api/emails/:id
router.get('/:id', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const emailId = req.params.id;

    const query = `
        SELECT 
            e.id, 
            e.email_no as emailNo, 
            e.subject, 
            e.body, 
            e.created_at,
            u.admin_name as sender_name,
            u.email as sender_email,
            er.folder,
            er.is_read as read,
            (SELECT u2.email FROM email_recipients er2 JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_email,
            (SELECT u2.admin_name FROM email_recipients er2 JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_name
        FROM emails e
        JOIN email_recipients er ON e.id = er.email_id
        JOIN users u ON e.sender_id = u.id
        WHERE e.id = ? AND er.user_id = ?
    `;

    db.get(query, [emailId, context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Email not found' });

        // Mark as read when opened
        if (!row.read) {
            db.run('UPDATE email_recipients SET is_read = 1 WHERE email_id = ? AND user_id = ?', [emailId, context.userId]);
        }

        res.json({
            success: true,
            email: {
                id: row.id,
                emailNo: row.emailNo,
                subject: row.subject,
                body: row.body,
                sender: row.folder === 'sent' ? `To: ${row.recipient_name || row.recipient_email || 'Unknown'}` : row.sender_name,
                senderEmail: row.folder === 'sent' ? row.recipient_email : row.sender_email,
                folder: row.folder,
                date: formatToISTDateTime(row.created_at)
            }
        });
    });
});

// POST /api/emails/send
router.post('/send', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find recipient by email
    db.get('SELECT id, organization_id FROM users WHERE email = ?', [to], (err, recipientUser) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!recipientUser) return res.status(404).json({ error: 'Recipient not found' });

        const emailNo = Math.floor(10000 + Math.random() * 90000).toString(); // Simple random 5 digit No
        const preview = body.substring(0, 100);

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run(`INSERT INTO emails (email_no, sender_id, sender_org_id, subject, body, preview) VALUES (?, ?, ?, ?, ?, ?)`,
                [emailNo, context.userId, context.orgId, subject, body, preview],
                function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Failed to send email' });
                    }
                    const emailId = this.lastID;

                    // Insert for recipient (Inbox)
                    db.run(`INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'inbox', 0)`,
                        [emailId, recipientUser.id, recipientUser.organization_id]);

                    // Insert for sender (Sent)
                    db.run(`INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'sent', 1)`,
                        [emailId, context.userId, context.orgId],
                        (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Failed to save sent item' });
                            }
                            db.run('COMMIT');
                            res.json({ success: true, message: 'Email sent' });
                        }
                    );
                });
        });
    });
});

// PUT /api/emails/:id/status
router.put('/:id/status', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const emailId = req.params.id;
    const { folder, is_read, is_deleted } = req.body;

    let updates = [];
    let params = [];
    if (folder !== undefined) { updates.push('folder = ?'); params.push(folder); }
    if (is_read !== undefined) { updates.push('is_read = ?'); params.push(is_read ? 1 : 0); }
    if (is_deleted !== undefined) { updates.push('is_deleted = ?'); params.push(is_deleted ? 1 : 0); }

    if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

    params.push(emailId, context.userId);
    const query = `UPDATE email_recipients SET ${updates.join(', ')} WHERE email_id = ? AND user_id = ?`;

    db.run(query, params, function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

// GET /api/emails/:id/comments
router.get('/:id/comments', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const emailId = req.params.id;

    // Ensure user has access to this email
    db.get('SELECT 1 FROM email_recipients WHERE email_id = ? AND user_id = ?', [emailId, context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(403).json({ error: 'Access denied' });

        const query = `
            SELECT c.id, c.comment, c.created_at, u.admin_name as user_name
            FROM email_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.email_id = ?
            ORDER BY c.created_at DESC
        `;
        db.all(query, [emailId], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({
                success: true,
                comments: rows.map(r => ({
                    id: r.id,
                    comment: r.comment,
                    user_name: r.user_name,
                    date: formatToISTDateTime(r.created_at)
                }))
            });
        });
    });
});

// POST /api/emails/:id/comments
router.post('/:id/comments', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const emailId = req.params.id;
    const { comment } = req.body;

    if (!comment) return res.status(400).json({ error: 'Comment required' });

    db.get('SELECT 1 FROM email_recipients WHERE email_id = ? AND user_id = ?', [emailId, context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(403).json({ error: 'Access denied' });

        db.run('INSERT INTO email_comments (email_id, user_id, comment) VALUES (?, ?, ?)', [emailId, context.userId, comment], function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, commentId: this.lastID });
        });
    });
});

module.exports = router;
