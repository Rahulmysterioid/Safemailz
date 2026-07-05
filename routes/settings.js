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

    // Verify caller has make_admin permission or is an admin/org_owner
    db.get('SELECT role, email, perm_make_admin FROM users WHERE id = ?', [context.userId], (err, callerRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        // Use loose check for 1 or true
        if (!callerRow || (callerRow.role !== 'admin' && callerRow.role !== 'org_owner' && callerRow.perm_make_admin != 1 && callerRow.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to change roles' });
        }

        // Check if caller is trying to demote themselves
        if (callerRow.email === email && role === 'employee') {
            return res.status(400).json({ error: 'You cannot demote yourself' });
        }

        // Verify target user is not an org_owner
        db.get('SELECT role FROM users WHERE email = ? AND organization_id = ?', [email, context.orgId], (err, targetRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!targetRow) return res.status(404).json({ error: 'Employee not found in your organization' });
            if (targetRow.role === 'org_owner') {
                return res.status(403).json({ error: 'Cannot change the role of the Organization Owner' });
            }

            // Update role and set permissions based on role
            const perms = role === 'admin' ? 1 : 0;
            db.run(
                'UPDATE users SET role = ?, perm_add_employees = ?, perm_create_projects = ?, perm_manage_projects = ?, perm_make_admin = ?, perm_delete_project = ? WHERE email = ? AND organization_id = ?',
                [role, perms, perms, perms, perms, perms, email, context.orgId],
                function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Failed to update role' });
                    res.json({ success: true, message: `Role updated to ${role}` });
                }
            );
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

// GET /api/settings/admins
router.get('/admins', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT id, admin_name as name, email, perm_add_employees, perm_create_projects, perm_manage_projects, perm_make_admin, perm_delete_project FROM users WHERE organization_id = ? AND role = ? ORDER BY admin_name ASC',
        [context.orgId, 'admin'],
        (err, rows) => {
            if (err) {
                console.error('[DB Error fetching admins]:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            const mappedRows = rows.map(r => ({
                id: r.id,
                name: r.name,
                email: r.email,
                expiry: 'Expire in 10 days',
                storageUsed: '1.18 GB',
                storageTotal: '50 GB',
                permissions: {
                    addEmployees: r.perm_add_employees === 1,
                    createProjects: r.perm_create_projects === 1,
                    manageProjects: r.perm_manage_projects === 1,
                    makeAdmin: r.perm_make_admin === 1,
                    deleteProject: r.perm_delete_project === 1
                }
            }));
            res.json({ success: true, admins: mappedRows });
        }
    );
});

// GET /api/settings/employees - Fetch all users in the organization
router.get('/employees', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT id, admin_name as name, email, role, created_at FROM users WHERE organization_id = ? AND role = ? ORDER BY created_at ASC',
        [context.orgId, 'employee'],
        (err, rows) => {
            if (err) {
                console.error('[DB Error fetching employees]:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, employees: rows });
        }
    );
});

// PUT /api/settings/admins/:adminId/permissions
router.put('/admins/:adminId/permissions', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { adminId } = req.params;
    const permissions = req.body;

    // Verify caller is admin or has make_admin permission
    db.get('SELECT role, perm_make_admin FROM users WHERE id = ?', [context.userId], (err, caller) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!caller || (caller.role !== 'admin' && caller.perm_make_admin != 1 && caller.perm_make_admin !== true)) {
            return res.status(403).json({ error: 'You do not have permission to change permissions' });
        }

        const query = `
            UPDATE users 
            SET 
                perm_add_employees = ?,
                perm_create_projects = ?,
                perm_manage_projects = ?,
                perm_make_admin = ?,
                perm_delete_project = ?
            WHERE id = ? AND organization_id = ? AND role = 'admin'
        `;

        db.run(query, [
            permissions.addEmployees ? 1 : 0,
            permissions.createProjects ? 1 : 0,
            permissions.manageProjects ? 1 : 0,
            permissions.makeAdmin ? 1 : 0,
            permissions.deleteProject ? 1 : 0,
            adminId,
            context.orgId
        ], function(updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Failed to update permissions' });
            if (this.changes === 0) return res.status(404).json({ error: 'Admin not found' });
            res.json({ success: true, message: 'Permissions updated successfully' });
        });
    });
});

module.exports = router;

