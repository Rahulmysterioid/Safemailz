const { db } = require('../db');
const mailparser = require('mailparser');

// Helper to decode Base64URL
function decodeBase64URL(str) {
    if (!str) return '';
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    return Buffer.from(str, 'base64').toString('utf8');
}

// Extract headers from Gmail Payload
function getGmailHeader(headers, name) {
    if (!headers) return '';
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
}

// Find body in Gmail Payload
function getGmailBody(payload) {
    if (!payload) return '';
    if (payload.body && payload.body.data) {
        return decodeBase64URL(payload.body.data);
    }
    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === 'text/html' && part.body && part.body.data) {
                return decodeBase64URL(part.body.data);
            }
        }
        for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                return decodeBase64URL(part.body.data);
            }
        }
    }
    return '';
}

// -----------------------------------------------------------------------------------
// OAUTH CALLBACKS
// -----------------------------------------------------------------------------------

exports.googleCallback = async (req, res) => {
    const code = req.query.code;
    const userId = req.query.state;

    if (!code || !userId) {
        return res.redirect('/dashboard.html?manage=error');
    }

    try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.GOOGLE_REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.access_token) {
            const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
            
            // Only update refresh token if one was provided (offline access)
            let updateQuery = `UPDATE users SET sync_provider = 'google', sync_access_token = ?, sync_token_expires_at = ?`;
            let params = [tokenData.access_token, expiresAt];
            
            if (tokenData.refresh_token) {
                updateQuery += `, sync_refresh_token = ?`;
                params.push(tokenData.refresh_token);
            }
            updateQuery += ` WHERE id = ?`;
            params.push(userId);

            db.run(updateQuery, params, (err) => {
                if (err) console.error(err);
                res.redirect('/dashboard.html?manage=success');
            });
        } else {
            console.error("Google token error:", tokenData);
            res.redirect('/dashboard.html?manage=error');
        }
    } catch (err) {
        console.error("Callback error", err);
        res.redirect('/dashboard.html?manage=error');
    }
};

exports.microsoftCallback = async (req, res) => {
    const code = req.query.code;
    const userId = req.query.state;

    if (!code || !userId) {
        return res.redirect('/dashboard.html?manage=error');
    }

    try {
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.MS_CLIENT_ID,
                client_secret: process.env.MS_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.MS_REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.access_token) {
            const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
            
            let updateQuery = `UPDATE users SET sync_provider = 'microsoft', sync_access_token = ?, sync_token_expires_at = ?`;
            let params = [tokenData.access_token, expiresAt];
            
            if (tokenData.refresh_token) {
                updateQuery += `, sync_refresh_token = ?`;
                params.push(tokenData.refresh_token);
            }
            updateQuery += ` WHERE id = ?`;
            params.push(userId);

            db.run(updateQuery, params, (err) => {
                if (err) console.error(err);
                res.redirect('/dashboard.html?manage=success');
            });
        } else {
            console.error("MS token error:", tokenData);
            res.redirect('/dashboard.html?manage=error');
        }
    } catch (err) {
        console.error("Callback error", err);
        res.redirect('/dashboard.html?manage=error');
    }
};

// -----------------------------------------------------------------------------------
// TOKEN REFRESH LOGIC
// -----------------------------------------------------------------------------------

async function refreshAccessToken(provider, refreshToken) {
    if (provider === 'google') {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });
        return await response.json();
    } else if (provider === 'microsoft') {
        const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.MS_CLIENT_ID,
                client_secret: process.env.MS_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
                redirect_uri: process.env.MS_REDIRECT_URI
            })
        });
        return await response.json();
    }
    return null;
}

async function getValidAccessToken(user) {
    if (!user.sync_access_token) return null;
    
    // Check if token expires in less than 5 minutes
    const expiresAt = new Date(user.sync_token_expires_at).getTime();
    if (Date.now() > expiresAt - 300000) {
        if (!user.sync_refresh_token) return null; // Can't refresh
        
        const tokenData = await refreshAccessToken(user.sync_provider, user.sync_refresh_token);
        if (tokenData && tokenData.access_token) {
            const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
            
            let updateQuery = `UPDATE users SET sync_access_token = ?, sync_token_expires_at = ?`;
            let params = [tokenData.access_token, newExpiresAt];
            if (tokenData.refresh_token) {
                updateQuery += `, sync_refresh_token = ?`;
                params.push(tokenData.refresh_token);
            }
            updateQuery += ` WHERE id = ?`;
            params.push(user.id);
            
            await new Promise((resolve) => db.run(updateQuery, params, resolve));
            return tokenData.access_token;
        }
        return null; // Refresh failed
    }
    return user.sync_access_token;
}


// -----------------------------------------------------------------------------------
// SYNC LOGIC
// -----------------------------------------------------------------------------------

async function syncGoogleEmails(user, accessToken) {
    const util = require('util');
    const dbGet = util.promisify(db.get.bind(db));
    const dbRun = (query, params = []) => new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

    try {
        // Fetch up to 50 recent messages from Inbox
        const listResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=50', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const listData = await listResponse.json();
        
        if (!listData.messages || listData.messages.length === 0) return;

        // Process in batches of 5 to avoid overloading the API or database
        const batchSize = 5;
        for (let i = 0; i < listData.messages.length; i += batchSize) {
            const batch = listData.messages.slice(i, i + batchSize);
            
            await Promise.allSettled(batch.map(async (msg) => {
                try {
                    // Check if already synced
                    const existing = await dbGet('SELECT e.id as email_id, er.is_deleted FROM emails e LEFT JOIN email_recipients er ON e.id = er.email_id AND er.user_id = ? WHERE e.external_id = ?', [user.id, msg.id]);
                    
                    if (existing) {
                        if (existing.is_deleted === 1) {
                            await dbRun('UPDATE email_recipients SET is_deleted = 0, folder = "inbox" WHERE email_id = ? AND user_id = ?', [existing.email_id, user.id]);
                        } else if (existing.is_deleted === null) {
                            const isUnread = msg.labelIds && msg.labelIds.includes('UNREAD');
                            await dbRun(`INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'inbox', ?)`,
                                [existing.email_id, user.id, user.organization_id, isUnread ? 0 : 1]);
                        }
                        return;
                    }

                    // Fetch full message
                    const msgResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (!msgResponse.ok) throw new Error('Failed to fetch full message details');
                    const msgData = await msgResponse.json();

                    const fromHeader = getGmailHeader(msgData.payload.headers, 'From');
                    let senderName = fromHeader;
                    let senderEmail = fromHeader;
                    const match = fromHeader.match(/(.*)<(.*)>/);
                    if (match) {
                        senderName = match[1].trim() || match[2].trim();
                        senderEmail = match[2].trim();
                    }

                    const subject = getGmailHeader(msgData.payload.headers, 'Subject') || 'No Subject';
                    const dateStr = getGmailHeader(msgData.payload.headers, 'Date');
                    const dateObj = dateStr ? new Date(dateStr) : new Date();
                    const preview = msgData.snippet || '';
                    const body = getGmailBody(msgData.payload) || preview;
                    const emailNo = Math.floor(10000 + Math.random() * 90000).toString();

                    // Insert without transaction to allow safe parallel SQLite insertions
                    const insertResult = await dbRun(
                        `INSERT INTO emails (email_no, sender_id, sender_org_id, external_sender_name, external_sender_email, external_id, subject, body, preview, created_at) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)`,
                        [emailNo, senderName, senderEmail, msg.id, subject, body, preview, dateObj.toISOString()]
                    );
                    
                    const isRead = msgData.labelIds && msgData.labelIds.includes('UNREAD') ? 0 : 1;
                    await dbRun(
                        `INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'inbox', ?)`,
                        [insertResult.lastID, user.id, user.organization_id, isRead]
                    );

                } catch (msgErr) {
                    console.error("Error processing single message", msg.id, msgErr);
                }
            }));
        }
    } catch (e) {
        console.error("Google Sync Error:", e);
    }
}

async function syncMicrosoftEmails(user, accessToken) {
    const util = require('util');
    const dbGet = util.promisify(db.get.bind(db));
    const dbRun = (query, params = []) => new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

    try {
        const listResponse = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$top=50&$select=id,sender,subject,bodyPreview,body,receivedDateTime,isRead', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const listData = await listResponse.json();

        if (!listData.value || listData.value.length === 0) return;

        // Process in batches of 5 to avoid overloading the database
        const batchSize = 5;
        for (let i = 0; i < listData.value.length; i += batchSize) {
            const batch = listData.value.slice(i, i + batchSize);
            
            await Promise.allSettled(batch.map(async (msg) => {
                try {
                    const existing = await dbGet('SELECT e.id as email_id, er.is_deleted FROM emails e LEFT JOIN email_recipients er ON e.id = er.email_id AND er.user_id = ? WHERE e.external_id = ?', [user.id, msg.id]);
                    
                    if (existing) {
                        if (existing.is_deleted === 1) {
                            await dbRun('UPDATE email_recipients SET is_deleted = 0, folder = "inbox" WHERE email_id = ? AND user_id = ?', [existing.email_id, user.id]);
                        } else if (existing.is_deleted === null) {
                            await dbRun(`INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'inbox', ?)`,
                                [existing.email_id, user.id, user.organization_id, msg.isRead ? 1 : 0]);
                        }
                        return;
                    }

                    const senderName = msg.sender?.emailAddress?.name || msg.sender?.emailAddress?.address || 'Unknown';
                    const senderEmail = msg.sender?.emailAddress?.address || 'unknown@example.com';
                    const subject = msg.subject || 'No Subject';
                    const dateObj = msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date();
                    const preview = msg.bodyPreview || '';
                    const body = msg.body?.content || preview;
                    const emailNo = Math.floor(10000 + Math.random() * 90000).toString();

                    const insertResult = await dbRun(
                        `INSERT INTO emails (email_no, sender_id, sender_org_id, external_sender_name, external_sender_email, external_id, subject, body, preview, created_at) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)`,
                        [emailNo, senderName, senderEmail, msg.id, subject, body, preview, dateObj.toISOString()]
                    );

                    await dbRun(
                        `INSERT INTO email_recipients (email_id, user_id, organization_id, folder, is_read) VALUES (?, ?, ?, 'inbox', ?)`,
                        [insertResult.lastID, user.id, user.organization_id, msg.isRead ? 1 : 0]
                    );
                } catch (msgErr) {
                    console.error("Error processing MS message", msg.id, msgErr);
                }
            }));
        }
    } catch (e) {
        console.error("MS Sync Error:", e);
    }
}

async function performSync(userId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT id, organization_id, sync_provider, sync_access_token, sync_refresh_token, sync_token_expires_at FROM users WHERE id = ?`, [userId], async (err, user) => {
            if (err || !user || !user.sync_provider) return resolve(false);

            const token = await getValidAccessToken(user);
            if (!token) return resolve(false);

            if (user.sync_provider === 'google') {
                await syncGoogleEmails(user, token);
            } else if (user.sync_provider === 'microsoft') {
                await syncMicrosoftEmails(user, token);
            }

            // Update sync time
            db.run(`UPDATE users SET sync_last_sync_time = CURRENT_TIMESTAMP WHERE id = ?`, [userId]);
            resolve(true);
        });
    });
}

// -----------------------------------------------------------------------------------
// EXPORTS
// -----------------------------------------------------------------------------------

exports.refreshSync = async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const success = await performSync(userId);
    if (success) {
        res.json({ message: 'Sync complete' });
    } else {
        res.status(500).json({ error: 'Sync failed' });
    }
};

exports.getSyncStatus = (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT sync_provider, sync_last_sync_time FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User not found' });
        
        if (row.sync_provider) {
            res.json({
                isSynced: true,
                provider: row.sync_provider,
                lastSync: row.sync_last_sync_time
            });
        } else {
            res.json({ isSynced: false });
        }
    });
};

exports.disconnectSync = (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.run(`UPDATE users SET sync_provider = NULL, sync_access_token = NULL, sync_refresh_token = NULL, sync_token_expires_at = NULL WHERE id = ?`, [userId], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to disconnect' });
        res.json({ message: 'Disconnected successfully' });
    });
};

exports.getValidAccessToken = getValidAccessToken;
