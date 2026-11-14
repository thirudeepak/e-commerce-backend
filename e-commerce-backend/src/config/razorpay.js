'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const Razorpay = require('razorpay');

const keyId = (process.env.RAZORPAY_KEY_ID || '').trim() || 'rzp_test_placeholder';
const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim() || 'test_secret_placeholder';

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

module.exports = razorpay;
