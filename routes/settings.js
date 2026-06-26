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
            u.dob,
            u.role
        FROM users u
        WHERE u.email = ? AND u.organization_id = ?
    `;

    db.get(query, [email, context.orgId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Employee not found' });

        res.json({
            success: true,
            joined_date: row.created_at,
            dob: row.dob || 'Not provided',
            role: row.role || 'employee'
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

// PUT /api/settings/employee/:email/role
router.put('/employee/:email/role', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.params;
    const { role } = req.body;

    if (role !== 'admin' && role !== 'employee') {
        return res.status(400).json({ error: 'Invalid role' });
    }

    // Verify caller is admin
    db.get('SELECT role, email FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!callerRow || callerRow.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can change roles' });
        }

        // Check if caller is trying to demote themselves
        if (callerRow.email === email && role === 'employee') {
            return res.status(400).json({ error: 'You cannot demote yourself' });
        }

        // Update role
        db.run(
            'UPDATE users SET role = ? WHERE email = ? AND organization_id = ?',
            [role, email, context.orgId],
            function (updateErr) {
                if (updateErr) return res.status(500).json({ error: 'Failed to update role' });
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Employee not found in your organization' });
                }
                res.json({ success: true, message: `Role updated to ${role}` });
            }
        );
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

// GET /api/settings/admins
router.get('/admins', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT admin_name as name, email FROM users WHERE organization_id = ? AND role = ? ORDER BY admin_name ASC',
        [context.orgId, 'admin'],
        (err, rows) => {
            if (err) {
                console.error('[DB Error fetching admins]:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            const mappedRows = rows.map((r, index) => ({
                id: 'adm-' + index + '-' + Date.now(),
                name: r.name,
                email: r.email,
                expiry: 'Expire in 10 days',
                storageUsed: '1.18 GB',
                storageTotal: '50 GB',
                permissions: {
                    addEmployees: true,
                    createProjects: true,
                    manageProjects: true,
                    makeAdmin: false,
                    deleteProject: false
                }
            }));
            res.json({ success: true, admins: mappedRows });
        }
    );
});

module.exports = router;

