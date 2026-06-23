const express = require('express');
const bcrypt = require('bcrypt');
const { db } = require('../db');

const router = express.Router();

// Helper to get user context from headers
const getUserContext = (req) => {
    const userId = req.headers['x-user-id'];
    const orgId = req.headers['x-org-id'];
    if (!userId || !orgId) {
        return null;
    }
    return { userId: parseInt(userId, 10), orgId: parseInt(orgId, 10) };
};

// GET /api/settings/profile
router.get('/profile', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const query = `
        SELECT 
            u.id as user_id, 
            u.admin_name, 
            u.email, 
            u.role,
            u.marketing_opt_in,
            u.terms_accepted,
            u.created_at as user_joined,
            o.id as org_id,
            o.organization_name,
            o.organization_size,
            o.backup_email,
            o.created_at as org_joined
        FROM users u
        JOIN organizations o ON u.organization_id = o.id
        WHERE u.id = ? AND o.id = ?
    `;

    db.get(query, [context.userId, context.orgId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Profile not found' });

        res.json({
            success: true,
            profile: {
                user: {
                    id: row.user_id,
                    admin_name: row.admin_name,
                    email: row.email,
                    role: row.role === 'employee' ? 'Employee' : 'Admin',
                    status: 'Active',
                    marketing_opt_in: row.marketing_opt_in ? true : false,
                    terms_accepted: row.terms_accepted ? true : false,
                    joined_date: row.user_joined
                },
                organization: {
                    id: row.org_id,
                    organization_name: row.organization_name,
                    organization_size: row.organization_size,
                    backup_email: row.backup_email || '',
                    joined_date: row.org_joined
                }
            }
        });
    });
});

// GET /api/settings/employee/:email
router.get('/employee/:email', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.params;

    const query = `
        SELECT 
            u.created_at,
            u.dob
        FROM users u
        WHERE u.email = ? AND u.organization_id = ?
    `;

    db.get(query, [email, context.orgId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Employee not found' });

        res.json({
            success: true,
            joined_date: row.created_at,
            dob: row.dob || 'Not provided'
        });
    });
});

// POST /api/settings/password — uses bcrypt to match authController.js
router.post('/password', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }

    db.get('SELECT password_hash FROM users WHERE id = ?', [context.userId], async (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User not found' });

        try {
            // Verify current password using bcrypt (same as authController.js)
            const isMatch = await bcrypt.compare(currentPassword, row.password_hash);
            if (!isMatch) {
                return res.status(400).json({ error: 'Incorrect current password' });
            }

            // Hash the new password using bcrypt
            const saltRounds = 10;
            const newHash = await bcrypt.hash(newPassword, saltRounds);

            db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, context.userId], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: 'Failed to update password' });
                res.json({ success: true, message: 'Password updated successfully' });
            });
        } catch (hashErr) {
            console.error(hashErr);
            return res.status(500).json({ error: 'Server error during password update' });
        }
    });
});

// DELETE /api/settings/account
router.delete('/account', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { userId } = context;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run('DELETE FROM email_recipients WHERE user_id = ?', [userId], (err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to delete recipient data' });
            }

            db.run('DELETE FROM email_comments WHERE user_id = ?', [userId], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to delete comment data' });
                }

                db.run('UPDATE emails SET sender_id = NULL WHERE sender_id = ?', [userId], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Failed to anonymize sent emails' });
                    }

                    db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Failed to delete user account' });
                        }

                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Transaction commit failed' });
                            }
                            res.json({ success: true, message: 'Account permanently deleted' });
                        });
                    });
                });
            });
        });
    });
});

// DELETE /api/settings/employee/:email
router.delete('/employee/:email', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.params;

    // Verify caller is admin
    db.get('SELECT role FROM users WHERE id = ?', [context.userId], (err, adminRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!adminRow || adminRow.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can delete employees' });
        }

        // Find employee user ID
        db.get('SELECT id FROM users WHERE email = ? AND organization_id = ?', [email, context.orgId], (err, userRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // If user doesn't exist yet, just delete any pending invitations
                if (!userRow) {
                    db.run('DELETE FROM invitations WHERE email = ? AND organization_id = ?', [email, context.orgId], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Failed to delete pending invitation' });
                        }
                        db.run('COMMIT', (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Commit failed' });
                            }
                            return res.json({ success: true, message: 'Pending invitation deleted' });
                        });
                    });
                    return;
                }

                // If user exists, hard delete their account
                const targetUserId = userRow.id;
                
                db.run('DELETE FROM email_recipients WHERE user_id = ?', [targetUserId], (err) => {
                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }
                    
                    db.run('DELETE FROM email_comments WHERE user_id = ?', [targetUserId], (err) => {
                        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }
                        
                        db.run('UPDATE emails SET sender_id = NULL WHERE sender_id = ?', [targetUserId], (err) => {
                            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }
                            
                            db.run('DELETE FROM users WHERE id = ?', [targetUserId], (err) => {
                                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }
                                
                                db.run('DELETE FROM invitations WHERE email = ? AND organization_id = ?', [email, context.orgId], (err) => {
                                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }
                                    
                                    db.run('COMMIT', (err) => {
                                        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Database error' }); }
                                        res.json({ success: true, message: 'Employee permanently deleted' });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;

