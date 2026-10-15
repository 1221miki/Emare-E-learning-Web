const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
    getAllEnrollments,
    approvePayment,
    rejectPayment,
    uploadPaymentSlip,
    getStudentPaymentStatus,
    deleteEnrollment
} = require('../controllers/enrollmentController');

// ── Student Routes ──────────────────────────────────────────
router.get('/my-status', protect, authorizeRoles('Student'), getStudentPaymentStatus);
router.post('/:id/payment-slip', protect, authorizeRoles('Student'), upload.single('paymentSlip'), uploadPaymentSlip);

// ── Admin & Instructor Routes ───────────────────────────────
router.get('/', protect, authorizeRoles('Admin', 'Instructor'), getAllEnrollments);
router.patch('/:id/approve', protect, authorizeRoles('Admin'), approvePayment);
router.patch('/:id/reject', protect, authorizeRoles('Admin'), rejectPayment);
router.delete('/:id', protect, authorizeRoles('Admin'), deleteEnrollment);

module.exports = router;
