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
        const util = require('util');
        const dbGet = util.promisify(db.get.bind(db));
        const dbRun = (query, params = []) => new Promise((resolve, reject) => {
            db.run(query, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        // 3. Check if email already exists
        const row = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (row) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // 4. Hash the password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // 5. Insert organization and user within a transaction-like approach
        try {
            await dbRun('BEGIN TRANSACTION');

            const orgResult = await dbRun(
                `INSERT INTO organizations (organization_name, organization_size, backup_email) VALUES (?, ?, ?)`,
                [organization_name, organization_size, backup_email || null]
            );
            const organization_id = orgResult.lastID;

            await dbRun(
                `INSERT INTO users (organization_id, admin_name, email, password_hash, marketing_opt_in, terms_accepted, role, perm_add_employees, perm_create_projects, perm_manage_projects, perm_make_admin, perm_delete_project) VALUES (?, ?, ?, ?, ?, ?, 'org_owner', 1, 1, 1, 1, 1)`,
                [organization_id, admin_name, email, password_hash, marketing_opt_in ? 1 : 0, terms_accepted ? 1 : 0]
            );

            await dbRun('COMMIT');

            return res.status(201).json({
                message: 'Account created successfully.',
                redirectUrl: 'success.html'
            });
        } catch (txnError) {
            console.error('Transaction error:', txnError);
            await dbRun('ROLLBACK').catch(e => console.error('Rollback failed:', e));
            if (txnError.message && txnError.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'An account with this email already exists.' });
            }
            return res.status(500).json({ error: 'Failed to create account.' });
        }
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
        const util = require('util');
        const dbGet = util.promisify(db.get.bind(db));
        
        const user = await dbGet('SELECT * FROM users WHERE email = ? OR admin_name = ?', [email, email]);
        
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
                role: user.role,
                permissions: {
                    addEmployees: user.perm_add_employees == 1 || user.perm_add_employees === true,
                    createProjects: user.perm_create_projects == 1 || user.perm_create_projects === true,
                    manageProjects: user.perm_manage_projects == 1 || user.perm_manage_projects === true,
                    makeAdmin: user.perm_make_admin == 1 || user.perm_make_admin === true,
                    deleteProject: user.perm_delete_project == 1 || user.perm_delete_project === true
                }
            }
        });
    } catch (error) {
        console.error('Signin error:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
};

module.exports = {
    signup,
    signin
};
