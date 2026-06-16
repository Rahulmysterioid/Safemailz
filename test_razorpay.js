const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_T0qGvs8egbRbcW',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'qSJatLZ3Sv2Curz1GnrcYWea'
});

async function test() {
  try {
    const options = {
      amount: 500 * 100, // 500 INR in paise
      currency: 'INR',
      receipt: 'receipt_order_test'
    };
    console.log('Sending request to Razorpay...');
    const order = await razorpay.orders.create(options);
    console.log('Order created successfully:', order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
  }
}

test();
