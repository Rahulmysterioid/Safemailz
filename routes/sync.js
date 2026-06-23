const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// Helper to generate Google Auth URL
router.get('/auth/google', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    
    if (!clientId || clientId === 'your_google_client_id_here') {
        return res.status(400).json({ error: 'Google Client ID is not configured in .env' });
    }

    const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send');
    // Using a simple state token containing the user ID (in production, use a secure signed state)
    const state = req.headers['x-user-id'] || 'unknown'; 

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
    res.json({ url });
});

// Helper to generate Microsoft Auth URL
router.get('/auth/microsoft', (req, res) => {
    const clientId = process.env.MS_CLIENT_ID;
    const redirectUri = process.env.MS_REDIRECT_URI;
    
    if (!clientId || clientId === 'your_microsoft_client_id_here') {
        return res.status(400).json({ error: 'Microsoft Client ID is not configured in .env' });
    }

    const scope = encodeURIComponent('offline_access Mail.Read Mail.Send');
    const state = req.headers['x-user-id'] || 'unknown';

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&prompt=consent`;
    res.json({ url });
});

// The OAuth Callbacks
router.get('/callback/google', syncController.googleCallback);
router.get('/callback/microsoft', syncController.microsoftCallback);

// Sync actions
router.post('/refresh', syncController.refreshSync);
router.get('/status', syncController.getSyncStatus);
router.post('/disconnect', syncController.disconnectSync);

module.exports = router;
