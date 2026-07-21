const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const {
    getAllEnrollments,
    uploadPaymentSlip,
    getStudentPaymentStatus
} = require('../controllers/enrollmentController');

// ── Student Routes ──────────────────────────────────────────
router.get('/my-status', protect, authorizeRoles('Student'), getStudentPaymentStatus);
router.post('/:id/payment-slip', protect, authorizeRoles('Student'), uploadImage.single('paymentSlip'), uploadPaymentSlip);

// ── Admin Routes ────────────────────────────────────────────
router.get('/', protect, authorizeRoles('Admin'), getAllEnrollments);

module.exports = router;
