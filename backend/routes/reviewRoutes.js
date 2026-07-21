const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { createReview, getCourseReviews, replyToReview, deleteReview } = require('../controllers/reviewController');

router.get('/course/:courseId', getCourseReviews);
router.post('/', protect, authorizeRoles('Student'), createReview);
router.patch('/:id/reply', protect, authorizeRoles('Instructor'), replyToReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
