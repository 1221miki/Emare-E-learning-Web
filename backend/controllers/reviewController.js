const Review = require('../models/Review');
const ReviewLike = require('../models/ReviewLike');
const ReviewReport = require('../models/ReviewReport');
const Enrollment = require('../models/Enrollment');
const Notification = require('../models/Notification');
const Course = require('../models/Course');
const { createNotification } = require('./notificationController');

const getUserId = (req) => req.user?._id || req.user?.id;

const recalculateCourseReviewStats = async (courseId) => {
    const reviews = await Review.find({ courseRef: courseId });
    const avgRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length
        : 0;

    await Course.findByIdAndUpdate(courseId, {
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: reviews.length
    });
};

exports.createOrUpdateReview = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { rating, title, content } = req.body;
        const studentId = getUserId(req);

        const enrollment = await Enrollment.findOne({ studentRef: studentId, courseRef: courseId });
        if (!enrollment) {
            return res.status(403).json({ success: false, message: 'Only enrolled students can review' });
        }

        const existing = await Review.findOne({ studentRef: studentId, courseRef: courseId });
        if (existing) {
            existing.rating = rating;
            existing.title = title || existing.title || '';
            existing.content = content || existing.content || '';
            existing.reviewText = content || existing.reviewText || '';
            existing.status = 'Pending';
            existing.isApproved = false;
            await existing.save();
            return res.json({ success: true, data: existing });
        }

        const review = await Review.create({
            studentRef: studentId,
            courseRef: courseId,
            rating,
            title: title || '',
            content: content || '',
            reviewText: content || '',
            status: 'Pending',
            isApproved: false
        });

        await Notification.create({
            userRef: null,
            message: `New review pending for course ${courseId}`,
            meta: { courseId }
        });

        res.status(201).json({ success: true, data: review });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getCourseReviews = async (req, res) => {
    try {
        const { courseId } = req.params;
        const reviews = await Review.find({
            courseRef: courseId,
            $or: [{ status: 'Approved' }, { isApproved: true }]
        })
            .populate('studentRef', 'fullName avatarUrl')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: reviews });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = getUserId(req);
        const like = await ReviewLike.findOne({ reviewRef: reviewId, userRef: userId });

        if (like) {
            await like.deleteOne();
            await Review.findByIdAndUpdate(reviewId, { $inc: { likes: -1 } });
            return res.json({ success: true, data: { liked: false } });
        }

        await ReviewLike.create({ reviewRef: reviewId, userRef: userId });
        await Review.findByIdAndUpdate(reviewId, { $inc: { likes: 1 } });
        res.json({ success: true, data: { liked: true } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.reportReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { reason } = req.body;
        const report = await ReviewReport.create({ reviewRef: reviewId, reporterRef: getUserId(req), reason });

        await Notification.create({
            userRef: null,
            message: `Review reported: ${reviewId}`,
            meta: { reviewId }
        });

        res.status(201).json({ success: true, data: report });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.moderateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { action } = req.body;
        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        review.status = action === 'approve' ? 'Approved' : 'Rejected';
        review.isApproved = action === 'approve';
        review.approvedBy = getUserId(req);
        await review.save();

        res.json({ success: true, data: review });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ studentRef: getUserId(req) })
            .populate('courseRef')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: reviews });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createReview = async (req, res) => {
    try {
        const { courseId, rating, reviewText, title, content } = req.body;
        const studentId = getUserId(req);

        const review = await Review.create({
            studentRef: studentId,
            courseRef: courseId,
            rating,
            reviewText: reviewText || content || '',
            title: title || '',
            content: content || reviewText || '',
            status: 'Pending',
            isApproved: false
        });

        await recalculateCourseReviewStats(courseId);

        const course = await Course.findById(courseId);
        if (course) {
            await createNotification({
                recipientRef: course.creatorRef,
                type: 'review',
                title: 'New Course Review',
                message: `A student left a ${rating}-star review on "${course.courseTitle}".`,
                link: '/instructor/dashboard'
            });
        }

        res.status(201).json({ success: true, data: review });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this course' });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.replyToReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            {
                instructorReply: req.body.reply || req.body.instructorReply || '',
                instructorReplyDate: Date.now(),
                status: 'Approved',
                isApproved: true
            },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        res.status(200).json({ success: true, data: review });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        if (review.studentRef.toString() !== getUserId(req) && req.user?.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await Review.findByIdAndDelete(req.params.id);
        await recalculateCourseReviewStats(review.courseRef);

        res.status(200).json({ success: true, message: 'Review deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
