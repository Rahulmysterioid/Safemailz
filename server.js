require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database
initDb();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory (so index.html, signup.html etc. work)
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.html')) {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
}));

// API Routes
app.use('/api', authRoutes);
const paymentRoutes = require('./routes/payment');
app.use('/api/payment', paymentRoutes);
const emailRoutes = require('./routes/emails');
app.use('/api/emails', emailRoutes);
const settingsRoutes = require('./routes/settings');
app.use('/api/settings', settingsRoutes);
const syncRoutes = require('./routes/sync');
app.use('/api/sync', syncRoutes);
const inviteRoutes = require('./routes/invite');
app.use('/api/invite', inviteRoutes);
const clientsRoutes = require('./routes/clients');
app.use('/api/clients', clientsRoutes);

// Clean URL routes (so /signin works the same as /signin.html)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});
app.get('/signin', (req, res) => res.sendFile(path.join(__dirname, 'signin.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/verify', (req, res) => res.sendFile(path.join(__dirname, 'verify.html')));
app.get('/success', (req, res) => res.sendFile(path.join(__dirname, 'success.html')));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
