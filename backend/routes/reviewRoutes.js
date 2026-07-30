const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

router.post('/:courseId', protect, reviewController.createOrUpdateReview);
router.get('/course/:courseId', reviewController.getCourseReviews);
router.post('/like/:reviewId', protect, reviewController.toggleLike);
router.post('/report/:reviewId', protect, reviewController.reportReview);
router.post('/moderate/:reviewId', protect, authorizeRoles('Admin'), reviewController.moderateReview);
router.get('/my', protect, reviewController.getMyReviews);
router.post('/', protect, authorizeRoles('Student'), reviewController.createReview);
router.patch('/:id/reply', protect, authorizeRoles('Instructor'), reviewController.replyToReview);
router.delete('/:id', protect, reviewController.deleteReview);

module.exports = router;
