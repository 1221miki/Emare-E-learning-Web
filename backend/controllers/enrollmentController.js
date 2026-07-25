const Enrollment = require('../models/Enrollment');
const { createNotification } = require('./notificationController');

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
// @desc    Approve a payment slip and clear tuition for a student
// @route   PATCH /api/enrollments/:id/approve
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const approvePayment = async (req, res, next) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id).populate('studentRef', 'fullName email');
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found.' });
        }

        if (enrollment.paymentStatus !== 'Pending Verification') {
            return res.status(400).json({ success: false, message: 'Only pending payments can be approved.' });
        }

        enrollment.paymentStatus = 'Cleared';
        enrollment.tuitionClearanceFlag = true;
        await enrollment.save();

        await createNotification({
            recipientRef: enrollment.studentRef._id,
            type: 'payment',
            title: 'Payment Approved',
            message: `Your payment for the course has been approved and tuition is now cleared.`,
            link: '/student/payments',
            metadata: { enrollmentId: enrollment._id }
        });

        res.status(200).json({ success: true, message: 'Payment approved and clearance granted.', data: enrollment });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Reject a payment slip and request a new receipt
// @route   PATCH /api/enrollments/:id/reject
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const rejectPayment = async (req, res, next) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id).populate('studentRef', 'fullName email');
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found.' });
        }

        if (enrollment.paymentStatus !== 'Pending Verification') {
            return res.status(400).json({ success: false, message: 'Only pending payments can be rejected.' });
        }

        enrollment.paymentStatus = 'Unpaid';
        enrollment.tuitionClearanceFlag = false;
        await enrollment.save();

        await createNotification({
            recipientRef: enrollment.studentRef._id,
            type: 'payment',
            title: 'Payment Rejected',
            message: `Your receipt was rejected. Please upload a valid payment slip to complete clearance.`,
            link: '/student/payments',
            metadata: { enrollmentId: enrollment._id }
        });

        res.status(200).json({ success: true, message: 'Payment rejected and student notified.', data: enrollment });
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
        enrollment.paymentMethod = req.body.paymentMethod || enrollment.paymentMethod;
        enrollment.paymentReference = req.body.paymentReference || enrollment.paymentReference;
        enrollment.paymentAmount = req.body.paymentAmount ? Number(req.body.paymentAmount) : enrollment.paymentAmount;
        enrollment.paymentStatus = 'Pending Verification';
        enrollment.tuitionClearanceFlag = false;
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
            .populate({
                path: 'courseRef',
                select: 'courseTitle technicalCategory price creatorRef',
                populate: { path: 'creatorRef', select: 'fullName' }
            })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAllEnrollments, approvePayment, rejectPayment, uploadPaymentSlip, getStudentPaymentStatus };
