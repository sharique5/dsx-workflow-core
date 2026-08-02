/**
 * Quick test script to verify Razorpay credentials
 * Run: node scripts/test-razorpay.js
 */

const Razorpay = require('razorpay');
require('dotenv').config();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log('🔍 Testing Razorpay Configuration...\n');
console.log(`Key ID: ${keyId ? keyId.substring(0, 15) + '...' : 'NOT SET'}`);
console.log(`Key Secret: ${keySecret ? '***' + keySecret.substring(keySecret.length - 4) : 'NOT SET'}\n`);

if (!keyId || !keySecret) {
  console.error('❌ Razorpay credentials not found in .env file!');
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

// Test by creating a small order
const testAmount = 100; // ₹1 in paise

console.log('🚀 Attempting to create test order...\n');

// Razorpay receipt max length: 40 characters
const receipt = `test_${Date.now()}`;
console.log(`Receipt: ${receipt} (${receipt.length} chars)\n`);

razorpay.orders.create({
  amount: testAmount,
  currency: 'INR',
  receipt,
  notes: {
    test: true,
  },
})
  .then((order) => {
    console.log('✅ SUCCESS! Razorpay is configured correctly.\n');
    console.log('Test Order Details:');
    console.log('------------------');
    console.log(`Order ID: ${order.id}`);
    console.log(`Amount: ₹${order.amount / 100}`);
    console.log(`Currency: ${order.currency}`);
    console.log(`Status: ${order.status}`);
    console.log('\n✅ Your Razorpay integration is working fine!');
    console.log('The issue might be with your backend not restarting or request data.\n');
  })
  .catch((error) => {
    console.error('❌ FAILED! Razorpay error:\n');
    console.error('Error Details:');
    console.error('-------------');
    
    if (error.statusCode) {
      console.error(`Status Code: ${error.statusCode}`);
    }
    
    if (error.error) {
      console.error(`Error Code: ${error.error.code}`);
      console.error(`Description: ${error.error.description}`);
      console.error(`Field: ${error.error.field || 'N/A'}`);
      console.error(`Source: ${error.error.source || 'N/A'}`);
      console.error(`Step: ${error.error.step || 'N/A'}`);
      console.error(`Reason: ${error.error.reason || 'N/A'}`);
    } else {
      console.error(`Message: ${error.message}`);
      console.error('\nFull Error:', JSON.stringify(error, null, 2));
    }
    
    console.error('\n💡 Common Issues:');
    console.error('   1. Invalid API credentials');
    console.error('   2. Network/firewall blocking Razorpay API');
    console.error('   3. Razorpay account not activated');
    console.error('   4. API keys expired or revoked');
    
    process.exit(1);
  });
