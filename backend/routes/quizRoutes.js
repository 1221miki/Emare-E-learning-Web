const express = require('express');
const router = express.Router();
const { protect, authorizeRoles, denySuspendedActions } = require('../middleware/auth');
const {
    createQuiz,
    getQuizzesByCourse,
    getQuizById,
    submitQuizAttempt,
    checkQuestionAnswer,
    getQuizTracking,
    getQuizResults,
    getInstructorQuizzes,
    updateQuiz,
    deleteQuiz
} = require('../controllers/quizController');

// ── Instructor Routes ──────────────────────────────────────
router.get('/instructor/mine', protect, denySuspendedActions, authorizeRoles('Instructor'), getInstructorQuizzes);
router.post('/', protect, denySuspendedActions, authorizeRoles('Instructor'), createQuiz);
router.put('/:id', protect, denySuspendedActions, authorizeRoles('Instructor'), updateQuiz);
router.delete('/:id', protect, denySuspendedActions, authorizeRoles('Instructor'), deleteQuiz);

// ── Shared Routes (authenticated users) ────────────────────
router.get('/course/:courseId', protect, getQuizzesByCourse);
router.get('/:id', protect, getQuizById);

// ── Student Routes ──────────────────────────────────────────
router.post('/:id/attempt', protect, denySuspendedActions, authorizeRoles('Student'), submitQuizAttempt);
router.post('/:id/check', protect, denySuspendedActions, authorizeRoles('Student'), checkQuestionAnswer);
router.get('/:id/tracking', protect, denySuspendedActions, authorizeRoles('Student'), getQuizTracking);
router.get('/:id/results', protect, denySuspendedActions, authorizeRoles('Student'), getQuizResults);

module.exports = router;
