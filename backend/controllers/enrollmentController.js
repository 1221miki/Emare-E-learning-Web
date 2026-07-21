const Enrollment = require('../models/Enrollment');

// ─────────────────────────────────────────────
// @desc    Get all enrollments (Admin view with payment details)
// @route   GET /api/enrollments
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const getAllEnrollments = async (req, res, next) => {
    try {
        const { status } = req.query;
        const query = {};

        // Filter by payment status if specified
        if (status && ['Unpaid', 'Pending Verification', 'Cleared'].includes(status)) {
            query.paymentStatus = status;
        }

        const enrollments = await Enrollment.find(query)
            .populate({ path: 'studentRef', select: 'fullName accountEmail assignedRole' })
            .populate({ path: 'courseRef', select: 'courseTitle technicalCategory price' })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Upload payment slip for an enrollment
// @route   POST /api/enrollments/:id/payment-slip
// @access  Private (Student only)
// ─────────────────────────────────────────────
const uploadPaymentSlip = async (req, res, next) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id);

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment record not found.' });
        }

        // Verify ownership — only the enrolled student can upload their own slip
        if (enrollment.studentRef.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only upload payment slips for your own enrollments.' });
        }

        // Check if file was uploaded via multer/cloudinary middleware
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a payment slip image.' });
        }

        enrollment.paymentSlipUrl = req.file.path; // Cloudinary URL
        enrollment.paymentStatus = 'Pending Verification';
        await enrollment.save();

        res.status(200).json({
            success: true,
            message: 'Payment slip uploaded. Awaiting admin verification.',
            data: enrollment
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get payment/clearance status for the logged-in student
// @route   GET /api/enrollments/my-status
// @access  Private (Student only)
// ─────────────────────────────────────────────
const getStudentPaymentStatus = async (req, res, next) => {
    try {
        const enrollments = await Enrollment.find({ studentRef: req.user.id })
            .populate({ path: 'courseRef', select: 'courseTitle technicalCategory price' })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAllEnrollments, uploadPaymentSlip, getStudentPaymentStatus };
