const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const feedbackController = require('../controllers/feedbackController');

router.post('/:courseId?', protect, feedbackController.submitFeedback);
router.get('/my', protect, feedbackController.getMyFeedback);
router.get('/instructor', protect, feedbackController.getFeedbackForInstructor);
router.post('/respond/:feedbackId', protect, authorizeRoles('Instructor','Admin'), feedbackController.respondToFeedback);

module.exports = router;
