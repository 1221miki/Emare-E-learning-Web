const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { getLessonCheckpoints, submitCheckpointAttempt } = require('../controllers/inVideoQuizController');

// In-video quiz checkpoints (embedded in lesson video timelines)
router.get('/:courseId/:lessonId', protect, authorizeRoles('Student'), getLessonCheckpoints);
router.post('/:courseId/:lessonId/submit', protect, authorizeRoles('Student'), submitCheckpointAttempt);

module.exports = router;
