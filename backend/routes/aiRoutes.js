const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { askTutor, generateLearningPath, recommendCourses, generateQuiz, assignmentAssistant } = require('../controllers/aiController');

router.post('/ask', protect, authorizeRoles('Student'), askTutor);
router.post('/learning-path', protect, authorizeRoles('Student'), generateLearningPath);
router.post('/recommend-courses', protect, authorizeRoles('Student'), recommendCourses);
router.post('/generate-quiz', protect, authorizeRoles('Student'), generateQuiz);
router.post('/assignment-assistant', protect, authorizeRoles('Student'), assignmentAssistant);

module.exports = router;
