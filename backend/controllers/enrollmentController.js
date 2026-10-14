const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const LearningProgress = require('../models/LearningProgress');
const { createNotification } = require('./notificationController');
const { uploadImage } = require('../services/cloudinaryService');

// ─────────────────────────────────────────────
// @desc    Get enrollments (Admin view all, Instructor view own courses)
// @route   GET /api/enrollments
// @access  Private (Admin & Instructor)
// ─────────────────────────────────────────────
const getAllEnrollments = async (req, res, next) => {
    try {
        const { status, courseId, courseRef, course } = req.query;
        const targetCourseId = courseId || courseRef || course;
        const query = {};

        // Filter by payment status if specified
        if (status && ['Unpaid', 'Pending Verification', 'Cleared'].includes(status)) {
            query.paymentStatus = status;
        }

        // Scoping based on user role
        if (req.user.assignedRole === 'Instructor') {
            // Find all courses where this instructor is creator or assigned instructor
            const instructorCourses = await Course.find({
                $or: [
                    { creatorRef: req.user.id },
                    { assignedInstructorRef: req.user.id }
                ]
            }).select('_id').lean();

            const instructorCourseIds = instructorCourses.map(c => c._id.toString());

            if (targetCourseId) {
                // If instructor requested a specific course, verify they teach it
                if (!instructorCourseIds.includes(targetCourseId.toString())) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. You do not teach this course.'
                    });
                }
                query.courseRef = targetCourseId;
            } else {
                // Instructor sees enrollments for all their courses
                query.courseRef = { $in: instructorCourses.map(c => c._id) };
            }
        } else if (req.user.assignedRole === 'Admin') {
            if (targetCourseId) {
                query.courseRef = targetCourseId;
            }
        } else {
            return res.status(403).json({
                success: false,
                message: 'Access denied.'
            });
        }

        const enrollments = await Enrollment.find(query)
            .populate({ path: 'studentRef', select: 'fullName accountEmail avatarUrl assignedRole' })
            .populate({ path: 'courseRef', select: 'courseTitle technicalCategory price level thumbnailUrl creatorRef assignedInstructorRef' })
            .sort({ createdAt: -1 })
            .lean();

        // Filter out broken records where studentRef or courseRef no longer exist
        const validEnrollments = enrollments.filter(e => e.studentRef && e.courseRef);

        // Fetch LearningProgress to enrich completion, watch time, and last activity
        const studentCoursePairs = validEnrollments
            .filter(e => e.studentRef?._id && e.courseRef?._id)
            .map(e => ({ studentRef: e.studentRef._id, courseRef: e.courseRef._id }));

        let progressDocs = [];
        if (studentCoursePairs.length > 0) {
            progressDocs = await LearningProgress.find({
                $or: studentCoursePairs.map(p => ({ studentRef: p.studentRef, courseRef: p.courseRef }))
            }).lean();
        }

        const progressMap = new Map();
        for (const p of progressDocs) {
            const key = `${p.studentRef.toString()}_${p.courseRef.toString()}`;
            progressMap.set(key, p);
        }

        const enrichedEnrollments = validEnrollments.map(en => {
            const studentIdStr = en.studentRef?._id ? en.studentRef._id.toString() : '';
            const courseIdStr = en.courseRef?._id ? en.courseRef._id.toString() : '';
            const key = `${studentIdStr}_${courseIdStr}`;
            const lp = progressMap.get(key);

            let totalWatchSeconds = 0;
            if (lp && Array.isArray(lp.progressItems)) {
                totalWatchSeconds = lp.progressItems.reduce((sum, item) => sum + (item.watchedSeconds || 0), 0);
            }

            const completionPercentage = lp && typeof lp.completionPercentage === 'number'
                ? Math.max(lp.completionPercentage, en.completionPercentage || 0)
                : (en.completionPercentage || 0);

            const lastActivityAt = (lp && lp.updatedAt) || en.updatedAt || en.enrollmentTimestamp || en.createdAt;

            return {
                ...en,
                completionPercentage,
                lastActivityAt,
                totalWatchMinutes: Math.round(totalWatchSeconds / 60),
                enrollmentDate: en.enrollmentTimestamp || en.createdAt
            };
        });

        res.status(200).json({ success: true, count: enrichedEnrollments.length, data: enrichedEnrollments });
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

        const result = await uploadImage(req.file.buffer, 'emare_elms/payment_slips');
        enrollment.paymentSlipUrl = result.secure_url;
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
