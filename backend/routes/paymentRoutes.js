const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

router.post('/initiate', protect, paymentController.initiatePayment);
router.post('/verify', protect, paymentController.verifyPayment);
router.get('/history', protect, paymentController.getMyTransactions);
router.get('/invoice/:id', protect, paymentController.getInvoiceData);
router.post('/refund', protect, paymentController.requestRefund);
router.post('/coupon', protect, paymentController.applyCoupon);

// Chapa-specific endpoints
router.post('/chapa/initiate', protect, paymentController.initiatePayment);
// Use raw body parser for webhook so signature verification can use the exact payload
router.post('/chapa/webhook', express.raw({ type: 'application/json' }), paymentController.chapaWebhook);
router.get('/chapa/verify/:tx_ref', paymentController.verifyChapa);

module.exports = router;
