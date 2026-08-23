const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { assertAiTutorAllowed } = require('../middleware/aiTutorGuard');
const { askTutor, generateLearningPath, recommendCourses, generateQuiz, assignmentAssistant, summarize, generateMicroLesson, generateFlashcards } = require('../controllers/aiController');

// Every AI Tutor entry point is guarded: while a student has an
// AI-Tutor-disabled quiz/assignment open, all requests are rejected server-side.
router.post('/ask', protect, authorizeRoles('Student'), assertAiTutorAllowed, askTutor);
router.post('/learning-path', protect, authorizeRoles('Student'), assertAiTutorAllowed, generateLearningPath);
router.post('/recommend-courses', protect, authorizeRoles('Student'), assertAiTutorAllowed, recommendCourses);
router.post('/generate-quiz', protect, authorizeRoles('Student'), assertAiTutorAllowed, generateQuiz);
router.post('/assignment-assistant', protect, authorizeRoles('Student'), assertAiTutorAllowed, assignmentAssistant);
router.post('/summarize', protect, authorizeRoles('Student'), assertAiTutorAllowed, summarize);
router.post('/microlesson', protect, authorizeRoles('Student'), assertAiTutorAllowed, generateMicroLesson);
router.post('/flashcards', protect, authorizeRoles('Student'), assertAiTutorAllowed, generateFlashcards);

module.exports = router;
