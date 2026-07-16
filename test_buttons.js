const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Catch page errors
    const errors = [];
    page.on('pageerror', err => errors.push(err.toString()));

    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

    await page.goto('http://localhost:3000/dashboard.html');
    await page.setViewport({ width: 1536, height: 730 });

    // Wait for emails to load
    await new Promise(r => setTimeout(r, 1000));

    // Array to store results
    const results = {
        toolbar: [],
        readingPane: [],
        contextMenu: []
    };

    // Helper to evaluate and click a button, then capture toast or errors
    async function testButton(selector, name, category, checkToast = true) {
        // Clear previous toast
        await page.evaluate(() => {
            const toast = document.getElementById('toastNotification');
            if (toast) toast.classList.remove('show');
        });

        // Click the button
        let clicked = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            if (el.disabled) return 'disabled';
            // Also handle elements inside SVG if needed
            el.click();
            return true;
        }, selector);

        if (clicked === 'disabled') {
            results[category].push({ name, status: 'disabled' });
            return;
        }
        if (!clicked) {
            results[category].push({ name, status: 'not found' });
            return;
        }

        // Wait a bit for action to happen
        await new Promise(r => setTimeout(r, 200));

        // Check for toast
        let toastText = null;
        if (checkToast) {
            toastText = await page.evaluate(() => {
                const toast = document.getElementById('toastNotification');
                if (toast && toast.classList.contains('show')) {
                    return toast.querySelector('.toast-message')?.textContent || toast.textContent;
                }
                return null;
            });
        }

        // Check for errors
        if (errors.length > 0) {
            results[category].push({ name, status: 'error', error: errors.join(', ') });
            errors.length = 0; // Clear
        } else if (toastText) {
            results[category].push({ name, status: 'ok', toast: toastText });
        } else {
            results[category].push({ name, status: 'no_feedback' });
        }
    }

    // Select the first email to enable toolbar buttons and open reading pane
    console.log('Selecting first email...');
    await page.evaluate(() => {
        const cb = document.querySelector('.email-select-cb');
        if (cb) cb.click();
        
        const row = document.querySelector('.mail-row');
        if (row) row.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Test Toolbar buttons
    console.log('Testing Toolbar buttons...');
    await testButton('#btnToolbarDelete', 'Delete (Toolbar)', 'toolbar');
    await testButton('#btnToolbarReport', 'Report (Toolbar)', 'toolbar');
    await testButton('#btnToolbarArchive', 'Archive (Toolbar)', 'toolbar');
    await testButton('#btnToolbarSweep', 'Sweep (Toolbar)', 'toolbar');
    await testButton('#btnToolbarMove', 'Move (Toolbar)', 'toolbar');
    await testButton('#btnToolbarReply', 'Reply (Toolbar)', 'toolbar', false); // Opens dropdown
    
    // Close dropdown if opened
    await page.mouse.click(0, 0);
    await new Promise(r => setTimeout(r, 100));
    await testButton('#btnToolbarToggleRead', 'Read/Unread (Toolbar)', 'toolbar');

    // Test Reading Pane buttons
    console.log('Testing Reading Pane buttons...');
    await testButton('.icon-btn[onclick*="reply"]', 'Reply (Reading pane)', 'readingPane');
    await testButton('.icon-btn[onclick*="replyAll"]', 'Reply All (Reading pane)', 'readingPane');
    await testButton('.icon-btn[onclick*="forward"]', 'Forward (Reading pane)', 'readingPane');
    await testButton('.icon-btn[onclick*="delete"]', 'Delete (Reading pane)', 'readingPane');

    // Test Context Menu
    console.log('Testing Context Menu...');
    // Open context menu
    await page.evaluate(() => {
        const evt = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: 300,
            clientY: 300
        });
        const row = document.querySelector('.mail-row');
        if (row) row.dispatchEvent(evt);
    });
    await new Promise(r => setTimeout(r, 500));

    // Get context menu options
    const menuItems = await page.evaluate(() => {
        const items = document.querySelectorAll('.email-context-item:not(.disabled)');
        return Array.from(items).map((el, i) => {
            return {
                index: i,
                text: el.querySelector('span')?.textContent || 'Unknown',
                hasSubmenu: el.querySelector('.email-submenu') !== null
            };
        });
    });

    for (const item of menuItems) {
        if (!item.hasSubmenu) {
            // Click item
            await page.evaluate((idx) => {
                const el = document.querySelectorAll('.email-context-item:not(.disabled)')[idx];
                if (el) el.click();
            }, item.index);
            
            await new Promise(r => setTimeout(r, 200));

            let toastText = await page.evaluate(() => {
                const toast = document.getElementById('toastNotification');
                if (toast && toast.classList.contains('show')) {
                    return toast.querySelector('.toast-message')?.textContent || toast.textContent;
                }
                return null;
            });

            if (errors.length > 0) {
                results.contextMenu.push({ name: item.text, status: 'error', error: errors.join(', ') });
                errors.length = 0;
            } else if (toastText) {
                results.contextMenu.push({ name: item.text, status: 'ok', toast: toastText });
            } else {
                results.contextMenu.push({ name: item.text, status: 'no_feedback' });
            }

            // Re-open context menu for next item
            await page.evaluate(() => {
                const toast = document.getElementById('toastNotification');
                if (toast) toast.classList.remove('show');
                const row = document.querySelector('.mail-row');
                if (row) row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 300 }));
            });
            await new Promise(r => setTimeout(r, 500));
        } else {
             results.contextMenu.push({ name: item.text, status: 'skipped (has submenu)' });
        }
    }

    console.log(JSON.stringify(results, null, 2));

    await browser.close();
})();
