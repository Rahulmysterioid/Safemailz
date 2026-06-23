const fetch = require('node-fetch') || global.fetch;

async function test() {
    const res = await fetch('http://localhost:3000/api/emails', {
        headers: {
            // Need the correct user ID and org ID
            'x-user-id': '7',
            'x-org-id': '1'
        }
    });
    const data = await res.json();
    console.log("Emails count:", data.emails?.length);
    if(data.emails?.length > 0) console.log(data.emails[0]);
}
test();
