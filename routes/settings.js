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
                    role: 'Admin',
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

module.exports = router;
