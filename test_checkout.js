const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
    page.on('dialog', async dialog => {
        console.log('DIALOG:', dialog.message());
        await dialog.dismiss();
    });

    // Wait until the page loads
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });

    console.log('Page loaded. Triggering plan modal...');

    // Expose a function to wait
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Open add employees modal
    await page.evaluate(() => {
        openModal('addEmployeesModal');
    });
    await wait(500);

    // Proceed to plan
    await page.evaluate(() => {
        proceedToPlan();
    });
    await wait(500);

    console.log('Clicking Proceed Payment button...');
    await page.evaluate(() => {
        document.getElementById('btnProceedPayment').click();
    });

    await wait(2000); // wait for fetch and Razorpay opening

    console.log('Checking button state...');
    const btnText = await page.evaluate(() => document.getElementById('btnProceedPayment').textContent);
    console.log('Button text is:', btnText);

    await browser.close();
})();
