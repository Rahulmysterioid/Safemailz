const puppeteer = require('puppeteer');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const { PDFDocument, rgb } = require('pdf-lib');
const { db } = require('./db');

async function redactPDF(pdfBuffer) {
    const browser = await puppeteer.launch({ headless: true });
    
    // Use pdf-lib to get page count and dimensions
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    // Base64 encode the PDF for Puppeteer
    const base64Pdf = pdfBuffer.toString('base64');
    
    // We will inject pdf.js from cdnjs into a blank puppeteer page
    const page = await browser.newPage();
    await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
        </head>
        <body>
            <canvas id="pdf-canvas"></canvas>
            <script>
                // We will call this from Puppeteer context
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                window.renderPage = async (base64, pageNum) => {
                    const pdfData = atob(base64);
                    const array = new Uint8Array(pdfData.length);
                    for (let i = 0; i < pdfData.length; i++) {
                        array[i] = pdfData.charCodeAt(i);
                    }
                    
                    const loadingTask = window.pdfjsLib.getDocument({data: array});
                    const pdf = await loadingTask.promise;
                    const page = await pdf.getPage(pageNum);
                    
                    const scale = 2.0; // Higher scale for better OCR
                    const viewport = page.getViewport({scale: scale});
                    
                    const canvas = document.getElementById('pdf-canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    await page.render(renderContext).promise;
                    
                    return {
                        dataUrl: canvas.toDataURL('image/png'),
                        scale: scale,
                        pdfWidth: viewport.width / scale,
                        pdfHeight: viewport.height / scale
                    };
                };
            </script>
        </body>
        </html>
    `);

    // Prepare Tesseract worker
    const worker = await Tesseract.createWorker('eng');

    for (let i = 0; i < pages.length; i++) {
        const pageNum = i + 1;
        const pdfPage = pages[i];
        
        console.log(`Rendering page ${pageNum}...`);
        
        // Ask Puppeteer to render the page to a DataURL
        const renderData = await page.evaluate(async (b64, num) => {
            return await window.renderPage(b64, num);
        }, base64Pdf, pageNum);
        
        const buffer = Buffer.from(renderData.dataUrl.split(',')[1], 'base64');
        
        console.log(`Running OCR on page ${pageNum}...`);
        // Run OCR with bounding boxes
        const { data } = await worker.recognize(buffer, {}, { blocks: true });
        
        // The regex for phones and emails
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
        
        // Find sensitive data in OCR results. 
        if (!data.blocks) continue;
        
        let words = [];
        data.blocks.forEach(b => b.paragraphs.forEach(p => p.lines.forEach(l => l.words.forEach(w => words.push(w)))));
        
        words.forEach(word => {
            let text = word.text.trim();
            if (emailRegex.test(text) || phoneRegex.test(text)) {
                // Ignore small false positives for phones
                if (text.replace(/\D/g, '').length < 8) return;
                
                console.log(`Found sensitive data: ${text} at`, word.bbox);
                
                // OCR coordinates are on the scaled canvas (scale = 2.0).
                // We need to map them back to PDF points.
                const scale = renderData.scale;
                
                // In Tesseract, bbox is {x0, y0, x1, y1} where 0,0 is top-left.
                // In pdf-lib, 0,0 is bottom-left.
                const pdfHeight = renderData.pdfHeight;
                
                const boxX = word.bbox.x0 / scale;
                const boxY = pdfHeight - (word.bbox.y1 / scale); // Convert top-left to bottom-left
                const boxWidth = (word.bbox.x1 - word.bbox.x0) / scale;
                const boxHeight = (word.bbox.y1 - word.bbox.y0) / scale;
                
                pdfPage.drawRectangle({
                    x: boxX - 2,
                    y: boxY - 2,
                    width: boxWidth + 4,
                    height: boxHeight + 4,
                    color: rgb(0, 0, 0), // Black redaction box
                });
            }
        });
    }

    await worker.terminate();
    await browser.close();

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

// Test function
async function test() {
    db.get('SELECT data FROM email_attachments WHERE content_type = \'application/pdf\' LIMIT 1', async (err, row) => {
        if (row) {
            const buffer = Buffer.from(row.data, 'base64');
            const start = Date.now();
            console.log('Starting OCR Redaction...');
            try {
                const newBuffer = await redactPDF(buffer);
                fs.writeFileSync('redacted_test.pdf', newBuffer);
                console.log(`Redaction complete in ${(Date.now() - start)/1000}s! Output saved to redacted_test.pdf`);
            } catch(e) {
                console.error("Error:", e);
            }
        }
        process.exit();
    });
}

test();
