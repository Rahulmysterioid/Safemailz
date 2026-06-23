const { db } = require('../db');
const bcrypt = require('bcrypt');

const signup = async (req, res) => {
    const {
        organization_name,
        admin_name,
        email,
        password,
        organization_size,
        backup_email,
        terms_accepted,
        marketing_opt_in
    } = req.body;

    // 1. Basic validation
    if (!organization_name || !admin_name || !email || !password || !organization_size) {
        return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    if (!terms_accepted) {
        return res.status(400).json({ error: 'You must accept the Terms of Service and Privacy Policy.' });
    }

    // 2. Validate email format (simple regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (backup_email && !emailRegex.test(backup_email)) {
        return res.status(400).json({ error: 'Please enter a valid backup email address.' });
    }

    try {
        // 3. Check if email already exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal server error.' });
            }
            if (row) {
                return res.status(400).json({ error: 'An account with this email already exists.' });
            }

            // 4. Hash the password
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);

            // 5. Insert organization and user within a transaction-like approach
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                db.run(
                    `INSERT INTO organizations (organization_name, organization_size, backup_email) VALUES (?, ?, ?)`,
                    [organization_name, organization_size, backup_email || null],
                    function (err) {
                        if (err) {
                            console.error(err);
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Failed to create organization.' });
                        }

                        const organization_id = this.lastID;

                        db.run(
                            `INSERT INTO users (organization_id, admin_name, email, password_hash, marketing_opt_in, terms_accepted) VALUES (?, ?, ?, ?, ?, ?)`,
                            [organization_id, admin_name, email, password_hash, marketing_opt_in ? 1 : 0, terms_accepted ? 1 : 0],
                            function (err) {
                                if (err) {
                                    console.error(err);
                                    db.run('ROLLBACK');
                                    // If email was somehow inserted concurrently, it would violate UNIQUE constraint
                                    if (err.message.includes('UNIQUE constraint failed')) {
                                        return res.status(400).json({ error: 'An account with this email already exists.' });
                                    }
                                    return res.status(500).json({ error: 'Failed to create user account.' });
                                }

                                db.run('COMMIT');
                                return res.status(201).json({
                                    message: 'Account created successfully.',
                                    redirectUrl: 'success.html'
                                });
                            }
                        );
                    }
                );
            });
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

const signin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal server error.' });
            }

            if (!user) {
                return res.status(400).json({ error: 'Invalid email or password.' });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(400).json({ error: 'Invalid email or password.' });
            }

            return res.status(200).json({
                message: 'Login successful.',
                redirectUrl: 'dashboard.html',
                user: {
                    id: user.id,
                    organization_id: user.organization_id,
                    email: user.email,
                    admin_name: user.admin_name,
                    role: user.role
                }
            });
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    signup,
    signin
};
