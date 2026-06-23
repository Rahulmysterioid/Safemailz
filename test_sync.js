const syncController = require('./controllers/syncController');

async function test() {
    try {
        // Need to find a valid user ID
        const { db } = require('./db');
        db.get('SELECT id FROM users LIMIT 1', async (err, row) => {
            if (row) {
                console.log("Testing with user ID:", row.id);
                try {
                    await syncController.syncUserEmails(row.id, 'google');
                    console.log("Sync succeeded!");
                } catch (e) {
                    console.error("Sync error:", e);
                }
            } else {
                console.log("No users found");
            }
        });
    } catch (e) {
        console.error(e);
    }
}
test();
