const { db } = require('../db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

let transporter;

if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
    // Use real SMTP (e.g. Gmail)
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });
    console.log("Email transporter configured with Gmail SMTP.");
} else {
    // Set up a mock ethereal email for local testing
    nodemailer.createTestAccount((err, account) => {
        if (err) {
            console.error('Failed to create a testing account. ' + err.message);
            return;
        }
        transporter = nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: {
                user: account.user,
                pass: account.pass
            }
        });
        console.log("Email transporter configured with Ethereal (Mock).");
    });
}

const sendInvite = async (req, res) => {
    const { firstName, lastName, email } = req.body;
    
    // User must be logged in as admin
    const userId = req.headers['x-user-id'];
    const orgId = req.headers['x-org-id'];

    if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!firstName || !email) {
        return res.status(400).json({ error: 'First name and email are required.' });
    }

    // Check if the user is already registered
    db.get('SELECT id, organization_id FROM users WHERE email = ?', [email], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        if (row) {
            if (row.organization_id == orgId) {
                return res.json({ success: true, message: 'This user is already an employee in your organization.', alreadyExists: true });
            } else {
                return res.status(400).json({ error: 'User is already registered with another organization.' });
            }
        }

        // Generate a secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        db.run(
            `INSERT INTO invitations (organization_id, email, token, expires_at) VALUES (?, ?, ?, ?)`,
            [orgId, email, token, expiresAt.toISOString()],
            async function (err) {
                if (err) {
                    console.error('Invite insert error:', err);
                    return res.status(500).json({ error: 'Failed to create invite.' });
                }

                // Create the invite URL
                const protocol = req.protocol === 'file' ? 'http' : req.protocol;
                const host = req.get('host') || 'localhost:3000';
                const inviteUrl = `${protocol}://${host}/signup-invite.html?token=${token}`;

                // Removed email sending logic to prevent SMTP timeouts on Render free tier.
                console.log('Invite URL generated:', inviteUrl);

                res.json({ success: true, message: 'Invite sent successfully', token: token, inviteUrl: inviteUrl });
            }
        );
    });
};

const verifyInvite = (req, res) => {
    const { token } = req.params;

    if (!token) return res.status(400).json({ error: 'Token is required' });

    db.get('SELECT * FROM invitations WHERE token = ?', [token], (err, invite) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!invite) return res.status(404).json({ error: 'Invalid or expired token.' });
        if (invite.status !== 'pending') return res.status(400).json({ error: 'This invitation has already been used.' });
        
        const expiresAt = new Date(invite.expires_at);
        if (expiresAt < new Date()) {
            return res.status(400).json({ error: 'This invitation has expired.' });
        }

        // Return invite info
        db.get('SELECT organization_name FROM organizations WHERE id = ?', [invite.organization_id], (err, org) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({
                success: true,
                email: invite.email,
                organization_name: org ? org.organization_name : 'the organization'
            });
        });
    });
};

const signupInvited = async (req, res) => {
    const { token, firstName, password, dob } = req.body;

    if (!token || !firstName || !password) {
        return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    // 1. Verify token
    db.get('SELECT * FROM invitations WHERE token = ?', [token], async (err, invite) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!invite) return res.status(404).json({ error: 'Invalid token.' });
        if (invite.status !== 'pending') return res.status(400).json({ error: 'This invitation has already been used.' });
        
        const expiresAt = new Date(invite.expires_at);
        if (expiresAt < new Date()) {
            return res.status(400).json({ error: 'This invitation has expired.' });
        }

        // 2. Ensure email is not already registered (edge case)
        db.get('SELECT id FROM users WHERE email = ?', [invite.email], async (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (row) return res.status(400).json({ error: 'An account with this email already exists.' });

            try {
                // 3. Hash password
                const saltRounds = 10;
                const password_hash = await bcrypt.hash(password, saltRounds);

                // 4. Insert user
                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');

                    // Map firstName to admin_name, insert dob and set role='employee'
                    db.run(
                        `INSERT INTO users (organization_id, admin_name, email, password_hash, marketing_opt_in, terms_accepted, role, dob) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [invite.organization_id, firstName, invite.email, password_hash, 0, 1, 'employee', dob || null],
                        function (err) {
                            if (err) {
                                console.error(err);
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Failed to create user account.' });
                            }

                            // 5. Update invite status to 'used'
                            db.run(`UPDATE invitations SET status = 'used' WHERE id = ?`, [invite.id], (err) => {
                                if (err) {
                                    console.error(err);
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: 'Failed to update invite.' });
                                }

                                db.run('COMMIT');
                                return res.status(201).json({
                                    message: 'Account created successfully.',
                                    redirectUrl: 'signin.html'
                                });
                            });
                        }
                    );
                });
            } catch (error) {
                console.error(error);
                return res.status(500).json({ error: 'Internal server error.' });
            }
        });
    });
};

module.exports = {
    sendInvite,
    verifyInvite,
    signupInvited
};
