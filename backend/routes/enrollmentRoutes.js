const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const {
    getAllEnrollments,
    approvePayment,
    rejectPayment,
    uploadPaymentSlip,
    getStudentPaymentStatus
} = require('../controllers/enrollmentController');

// ── Student Routes ──────────────────────────────────────────
router.get('/my-status', protect, authorizeRoles('Student'), getStudentPaymentStatus);
router.post('/:id/payment-slip', protect, authorizeRoles('Student'), uploadImage.single('paymentSlip'), uploadPaymentSlip);

// ── Admin Routes ────────────────────────────────────────────
router.get('/', protect, authorizeRoles('Admin'), getAllEnrollments);
router.patch('/:id/approve', protect, authorizeRoles('Admin'), approvePayment);
router.patch('/:id/reject', protect, authorizeRoles('Admin'), rejectPayment);

module.exports = router;
