const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_T0qGvs8egbRbcW',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'qSJatLZ3Sv2Curz1GnrcYWea'
});

// Mock payment endpoint (Legacy)
router.post('/pay', (req, res) => {
    const { cardNumber, expiryDate, cvv, amount } = req.body;
    if (!cardNumber || !expiryDate || !cvv) {
        return res.status(400).json({ success: false, message: 'Missing card details' });
    }
    const txnId = 'TXN-' + Math.floor(100000000 + Math.random() * 900000000);
    setTimeout(() => {
        res.json({ success: true, txnId: txnId, message: 'Payment processed successfully' });
    }, 1500);
});

// Razorpay Create Order Endpoint
router.post('/razorpay-order', async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount) return res.status(400).json({ success: false, message: 'Amount is required' });

        const options = {
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            receipt: 'receipt_order_' + Math.floor(Math.random() * 10000)
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        console.error('Razorpay Error:', error);
        res.status(500).json({ success: false, message: 'Error creating order' });
    }
});

// Razorpay Verify Signature Endpoint
router.post('/razorpay-verify', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Create signature to verify
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'qSJatLZ3Sv2Curz1GnrcYWea')
                                    .update(body.toString())
                                    .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // Payment is legit
        res.json({ success: true, txnId: razorpay_payment_id });
    } else {
        // Signature failed
        res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
});

// PDF Invoice generator endpoint
router.get('/invoice/:txnId', (req, res) => {
    const { txnId } = req.params;
    const { amount, plan, method, date, nextDate } = req.query;

    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set headers so the browser downloads the file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Safemailz-Receipt-${txnId}.pdf`);

    // Pipe the PDF directly to the response
    doc.pipe(res);

    // --- Header ---
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1A6BA8').text('SAFEMAILZ', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text('PROTECT YOUR CLIENTS', { align: 'center' });
    doc.moveDown(2);

    // --- Title ---
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#333333').text('Payment Receipt', { align: 'center' });
    doc.moveDown(2);

    // --- Receipt Info ---
    doc.fontSize(12).font('Helvetica');
    const startX = 50;
    let currentY = doc.y;

    const drawRow = (label, value) => {
        doc.font('Helvetica-Bold').fillColor('#333333').text(label, startX, currentY);
        doc.font('Helvetica').fillColor('#555555').text(value, 200, currentY, { width: 300, align: 'right' });
        currentY += 25;
        doc.moveTo(startX, currentY - 10).lineTo(550, currentY - 10).strokeColor('#E0E0E0').stroke();
        currentY += 5;
    };

    drawRow('Transaction ID:', txnId);
    drawRow('Payment Date:', date || new Date().toLocaleDateString());
    drawRow('Payment Method:', method || 'Credit Card');
    drawRow('Plan:', plan || 'Subscription Plan');
    
    // Amount Row (Blue)
    doc.font('Helvetica-Bold').fillColor('#333333').text('Amount Paid:', startX, currentY);
    doc.font('Helvetica-Bold').fillColor('#1A6BA8').text(amount ? `Rs ${amount}` : 'Rs 0', 200, currentY, { width: 300, align: 'right' });
    currentY += 25;
    doc.moveTo(startX, currentY - 10).lineTo(550, currentY - 10).strokeColor('#E0E0E0').stroke();
    currentY += 5;

    drawRow('Next Billing Date:', nextDate || 'N/A');

    // --- Footer ---
    doc.moveDown(4);
    doc.fontSize(10).font('Helvetica').fillColor('#999999').text('Thank you for choosing Safemailz.', { align: 'center' });
    doc.text('If you have any questions, please contact support@safemailz.com', { align: 'center' });

    // Finalize the PDF
    doc.end();
});

module.exports = router;
