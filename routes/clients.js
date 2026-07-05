const express = require('express');
const { db } = require('../db');
const getUserContext = (req) => {
    const userId = req.headers['x-user-id'];
    const orgId = req.headers['x-org-id'];
    if (!userId || !orgId) {
        return null;
    }
    return { userId: parseInt(userId, 10), orgId: parseInt(orgId, 10) };
};

const router = express.Router();

// GET /api/clients
// Fetch all clients for the logged-in user's organization
router.get('/', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        'SELECT id, client_id as clientId, display_name as displayName, name, email, phone, address, created_at as createdAt FROM clients WHERE organization_id = ? ORDER BY created_at DESC',
        [context.orgId],
        (err, rows) => {
            if (err) {
                console.error('[DB Error fetching clients]:', err);
                return res.status(500).json({ error: 'Failed to fetch clients' });
            }
            // Map id to be prefixed with 'c-' for UI compatibility
            const mappedRows = rows.map(r => ({
                ...r,
                id: 'c-' + r.id
            }));
            res.json({ success: true, clients: mappedRows });
        }
    );
});

// POST /api/clients
// Create a new client
router.post('/', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { displayName, name, email, phone, address, clientId } = req.body;
    if (!displayName || !name || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        'INSERT INTO clients (organization_id, display_name, name, email, phone, address, client_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [context.orgId, displayName, name, email, phone || '', address || '', clientId || ''],
        function (err) {
            if (err) {
                console.error('[DB Error creating client]:', err);
                return res.status(500).json({ error: 'Failed to create client' });
            }
            res.json({ success: true, id: 'c-' + this.lastID, clientId: clientId, message: 'Client created successfully' });
        }
    );
});

// PUT /api/clients/:id
// Update an existing client
router.put('/:id', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const numericId = id.startsWith('c-') ? id.substring(2) : id;
    const { displayName, name, email, phone, address, clientId } = req.body;
    
    if (!displayName || !name || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        'UPDATE clients SET display_name = ?, name = ?, email = ?, phone = ?, address = ?, client_id = COALESCE(client_id, ?) WHERE id = ? AND organization_id = ?',
        [displayName, name, email, phone || '', address || '', clientId || '', numericId, context.orgId],
        function (err) {
            if (err) {
                console.error('[DB Error updating client]:', err);
                return res.status(500).json({ error: 'Failed to update client' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Client not found or unauthorized' });
            }
            res.json({ success: true, message: 'Client updated successfully' });
        }
    );
});

// DELETE /api/clients/:id
// Delete a client
router.delete('/:id', (req, res) => {
    const context = getUserContext(req);
    if (!context) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    // Extract actual numeric ID from 'c-XX' format
    const numericId = id.startsWith('c-') ? id.substring(2) : id;

    db.run(
        'DELETE FROM clients WHERE id = ? AND organization_id = ?',
        [numericId, context.orgId],
        function (err) {
            if (err) {
                console.error('[DB Error deleting client]:', err);
                return res.status(500).json({ error: 'Failed to delete client' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Client not found or unauthorized' });
            }
            res.json({ success: true, message: 'Client deleted successfully' });
        }
    );
});

module.exports = router;
