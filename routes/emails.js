const express = require('express');
const { db } = require('../db');
const nodemailer = require('nodemailer');
const { getValidAccessToken } = require('../controllers/syncController');

const router = express.Router();

// Helper to encode to base64url for Gmail API
function toBase64Url(str) {
    return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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
            e.external_sender_name,
            e.external_sender_email,
            e.to_address,
            e.cc,
            e.bcc,
            u.admin_name as sender_name,
            u.email as sender_email,
            (SELECT u2.email FROM email_recipients er2 LEFT JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_email,
            (SELECT u2.admin_name FROM email_recipients er2 LEFT JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_name
        FROM email_recipients er
        JOIN emails e ON er.email_id = e.id
        LEFT JOIN users u ON e.sender_id = u.id
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

    db.all(`SELECT folder, COUNT(*) as count FROM email_recipients WHERE user_id = ? AND is_deleted = 0 GROUP BY folder`, [context.userId], (err, countRows) => {
        let counts = { inbox: 0, sent: 0, drafts: 0, deleted: 0, junk: 0, archive: 0, notes: 0, conversation: 0 };
        if (!err && countRows) {
            countRows.forEach(r => counts[r.folder] = r.count);
        }

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }

        // Apply search in memory for simplicity
        let emails = rows.map(row => {
            let sender = '';
            let senderEmail = '';
            
            if (row.folder === 'sent') {
                const displayName = row.recipient_name || row.to_address || row.recipient_email || 'Unknown';
                sender = `To: ${displayName}`;
                senderEmail = row.to_address || row.recipient_email;
            } else {
                const displayName = row.sender_name || row.external_sender_name || row.external_sender_email || 'Unknown Sender';
                sender = displayName;
                senderEmail = row.sender_email || row.external_sender_email;
            }

            return {
                id: row.email_id,
                recipient_id: row.recipient_id,
                sender: sender,
                senderEmail: senderEmail,
                to: row.to_address,
                cc: row.cc,
                bcc: row.bcc,
                subject: row.subject,
                preview: row.preview || row.subject,
                folder: row.folder,
                read: !!row.read,
                replied: !!row.replied,
                action: !!row.action,
                emailNo: row.emailNo,
                date: formatToISTTime(row.created_at)
            };
        });

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
            counts,
            emails
        });
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
            e.external_sender_name,
            e.external_sender_email,
            e.to_address,
            e.cc,
            e.bcc,
            u.admin_name as sender_name,
            u.email as sender_email,
            er.folder,
            er.is_read as read,
            (SELECT u2.email FROM email_recipients er2 LEFT JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_email,
            (SELECT u2.admin_name FROM email_recipients er2 LEFT JOIN users u2 ON er2.user_id = u2.id WHERE er2.email_id = e.id AND er2.folder = 'inbox' LIMIT 1) as recipient_name
        FROM emails e
        JOIN email_recipients er ON e.id = er.email_id
        LEFT JOIN users u ON e.sender_id = u.id
        WHERE e.id = ? AND er.user_id = ?
    `;

    db.get(query, [emailId, context.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Email not found' });

        // Mark as read when opened
        if (!row.read) {
            db.run('UPDATE email_recipients SET is_read = 1 WHERE email_id = ? AND user_id = ?', [emailId, context.userId]);
        }

        let sender = '';
        let senderEmail = '';
        if (row.folder === 'sent') {
            const displayName = row.recipient_name || row.to_address || row.recipient_email || 'Unknown';
            sender = `To: ${displayName}`;
            senderEmail = row.to_address || row.recipient_email;
        } else {
            const displayName = row.sender_name || row.external_sender_name || row.external_sender_email || 'Unknown Sender';
            sender = displayName;
            senderEmail = row.sender_email || row.external_sender_email;
        }

        res.json({
            success: true,
            email: {
                id: row.id,
                emailNo: row.emailNo,
                subject: row.subject,
                body: row.body,
                sender: sender,
                senderEmail: senderEmail,
                to: row.to_address,
                cc: row.cc,
                bcc: row.bcc,
                folder: row.folder,
                date: formatToISTDateTime(row.created_at)
            }
        });
    });
});

// POST /api/emails/send
router.post('/send', async (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { to, cc, bcc, subject, body } = req.body;
    if (!to || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Fetch sender details and sync provider
        const senderUser = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [context.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!senderUser) return res.status(404).json({ error: 'Sender not found' });

        const senderEmail = senderUser.email;
        const senderName = senderUser.admin_name || 'Safemailz User';

        if (senderUser.sync_provider === 'google') {
            const token = await getValidAccessToken(senderUser);
            if (!token) return res.status(401).json({ error: 'Google OAuth token expired or invalid' });

            const emailLines = [
                `To: ${to}`,
                `From: "${senderName}" <${senderEmail}>`,
                `Subject: ${subject}`,
                `MIME-Version: 1.0`,
                `Content-Type: text/html; charset=utf-8`
            ];
            if (cc) emailLines.push(`Cc: ${cc}`);
            if (bcc) emailLines.push(`Bcc: ${bcc}`);
            emailLines.push('');
            emailLines.push(body);
            
            const rawEmail = toBase64Url(emailLines.join('\r\n'));

            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw: rawEmail })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gmail send error:', errorData);
                if (response.status === 403 || response.status === 401) {
                    return res.status(403).json({ error: 'Permission denied. Please reconnect your Google account in Manage Apps to grant send permissions.' });
                }
                const errorMessage = errorData.error && errorData.error.message ? errorData.error.message : 'Failed to send via Gmail';
                return res.status(500).json({ error: `Gmail Error: ${errorMessage}` });
            }
        } else if (senderUser.sync_provider === 'microsoft') {
            const token = await getValidAccessToken(senderUser);
            if (!token) return res.status(401).json({ error: 'Microsoft OAuth token expired or invalid' });

            const graphMessage = {
                subject: subject,
                body: {
                    contentType: 'HTML',
                    content: body
                },
                toRecipients: to.split(',').map(email => ({ emailAddress: { address: email.trim() } }))
            };
            if (cc) graphMessage.ccRecipients = cc.split(',').map(email => ({ emailAddress: { address: email.trim() } }));
            if (bcc) graphMessage.bccRecipients = bcc.split(',').map(email => ({ emailAddress: { address: email.trim() } }));

            const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: graphMessage,
                    saveToSentItems: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('MS Graph send error:', errorData);
                if (response.status === 403) {
                    return res.status(403).json({ error: 'Permission denied. Please reconnect your Microsoft account in Manage Apps to grant send permissions.' });
                }
                return res.status(500).json({ error: 'Failed to send via Microsoft' });
            }
        } else {
            // Fallback: SMTP via nodemailer
            if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
                return res.status(500).json({ error: 'SMTP configuration is missing. Please connect an email provider.' });
            }

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_EMAIL,
                    pass: process.env.SMTP_PASSWORD
                }
            });

            await transporter.sendMail({
                from: `"${senderName} (via Safemailz)" <${process.env.SMTP_EMAIL}>`,
                replyTo: senderEmail,
                to: to,
                cc: cc || undefined,
                bcc: bcc || undefined,
                subject: subject,
                html: body
            });
        }

        // External send successful. Now save locally.
        const recipientUser = await new Promise((resolve) => {
            db.get('SELECT id, organization_id FROM users WHERE email = ?', [to], (err, row) => resolve(row));
        });

        const emailNo = Math.floor(10000 + Math.random() * 90000).toString(); // Simple random 5 digit No
        // Strip HTML tags for the preview text
        const plainTextBody = body.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
        const preview = plainTextBody.substring(0, 100);

        const dbRun = (query, params = []) => new Promise((resolve, reject) => {
            db.run(query, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        try {
            await dbRun('BEGIN TRANSACTION');

            const emailInsertResult = await dbRun(
                `INSERT INTO emails (email_no, sender_id, sender_org_id, subject, body, preview, to_address, cc, bcc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [emailNo, context.userId, context.orgId, subject, body, preview, to, cc || null, bcc || null]
            );
            const emailId = emailInsertResult.lastID;

            // Insert for recipient (Inbox) if they are internal
            if (recipientUser) {
                await dbRun(
                    `INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'inbox', 0)`,
                    [emailId, recipientUser.id, recipientUser.organization_id]
                );
            }

            // Insert for sender (Sent)
            await dbRun(
                `INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'sent', 1)`,
                [emailId, context.userId, context.orgId]
            );

            await dbRun('COMMIT');
            res.json({ success: true, message: 'Email sent' });
        } catch (dbErr) {
            console.error('Local DB save failed:', dbErr);
            await dbRun('ROLLBACK').catch(e => console.error('Rollback failed:', e));
            return res.json({ success: true, message: 'Email sent, but failed to save in local sent items' });
        }

    } catch (err) {
        console.error('Send mail error:', err);
        return res.status(500).json({ error: 'An unexpected error occurred while sending email' });
    }
});

// POST /api/emails/draft
router.post('/draft', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { id, to, subject, body } = req.body;
    const preview = body ? body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 100).trim() : '';

    const dbRun = (query, params = []) => new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

    if (id) {
        // Updating an existing draft
        db.get('SELECT sender_id FROM emails WHERE id = ?', [id], async (err, emailRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!emailRow) return res.status(404).json({ error: 'Draft not found' });
            if (emailRow.sender_id !== context.userId) return res.status(403).json({ error: 'Access denied' });

            try {
                await dbRun('BEGIN TRANSACTION');
                await dbRun('UPDATE emails SET subject = ?, body = ?, preview = ? WHERE id = ?', [subject || '', body || '', preview, id]);
                await dbRun('COMMIT');
                res.json({ success: true, message: 'Draft updated', emailId: id });
            } catch (updateErr) {
                console.error('Draft update error:', updateErr);
                await dbRun('ROLLBACK').catch(() => {});
                return res.status(500).json({ error: 'Failed to update draft' });
            }
        });
    } else {
        // Creating a new draft
        const emailNo = Math.floor(10000 + Math.random() * 90000).toString(); // Simple random 5 digit No

        (async () => {
            try {
                await dbRun('BEGIN TRANSACTION');

                const insertResult = await dbRun(
                    `INSERT INTO emails (email_no, sender_id, sender_org_id, subject, body, preview) VALUES (?, ?, ?, ?, ?, ?)`,
                    [emailNo, context.userId, context.orgId, subject || '', body || '', preview]
                );
                const emailId = insertResult.lastID;

                await dbRun(
                    `INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'drafts', 1)`,
                    [emailId, context.userId, context.orgId]
                );

                await dbRun('COMMIT');
                res.json({ success: true, message: 'Draft saved', emailId: emailId });
            } catch (draftErr) {
                console.error('Draft save error:', draftErr);
                await dbRun('ROLLBACK').catch(() => {});
                return res.status(500).json({ error: 'Failed to create draft' });
            }
        })();
    }
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
