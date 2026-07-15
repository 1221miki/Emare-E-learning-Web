const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { initializePayment, verifyPayment } = require('../controllers/paymentController');

router.post('/initialize', protect, authorizeRoles('Student'), initializePayment);
router.get('/verify/:tx_ref', verifyPayment); // Webhook

module.exports = router;
