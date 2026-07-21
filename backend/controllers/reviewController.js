const Review = require('../models/Review');
const Course = require('../models/Course');
const { createNotification } = require('./notificationController');

// @desc    Create a review for a course
// @route   POST /api/reviews
// @access  Private (Student)
exports.createReview = async (req, res) => {
    try {
        const { courseId, rating, reviewText } = req.body;

        const review = await Review.create({
            studentRef: req.user.id,
            courseRef: courseId,
            rating,
            reviewText
        });

        // Update course average rating
        const reviews = await Review.find({ courseRef: courseId });
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await Course.findByIdAndUpdate(courseId, {
            averageRating: Math.round(avgRating * 10) / 10,
            totalReviews: reviews.length
        });

        // Notify the instructor
        const course = await Course.findById(courseId);
        if (course) {
            await createNotification({
                recipientRef: course.creatorRef,
                type: 'review',
                title: 'New Course Review',
                message: `A student left a ${rating}-star review on "${course.courseTitle}".`,
                link: `/instructor/dashboard`
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

// @desc    Get all reviews for a course
// @route   GET /api/reviews/course/:courseId
// @access  Public
exports.getCourseReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ courseRef: req.params.courseId, isApproved: true })
            .populate('studentRef', 'fullName avatarUrl')
            .sort('-createdAt');
        res.status(200).json({ success: true, data: reviews });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Instructor replies to a review
// @route   PATCH /api/reviews/:id/reply
// @access  Private (Instructor)
exports.replyToReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { instructorReply: req.body.reply, instructorReplyDate: Date.now() },
            { new: true }
        );
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
        res.status(200).json({ success: true, data: review });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Admin or Author)
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        if (review.studentRef.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await Review.findByIdAndDelete(req.params.id);

        // Recalculate average
        const remaining = await Review.find({ courseRef: review.courseRef });
        const avg = remaining.length > 0 ? remaining.reduce((s, r) => s + r.rating, 0) / remaining.length : 0;
        await Course.findByIdAndUpdate(review.courseRef, {
            averageRating: Math.round(avg * 10) / 10,
            totalReviews: remaining.length
        });

        res.status(200).json({ success: true, message: 'Review deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
