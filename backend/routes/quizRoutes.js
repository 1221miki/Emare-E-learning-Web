const express = require('express');
const router = express.Router();
const { protect, authorizeRoles, denySuspendedActions } = require('../middleware/auth');
const {
    createQuiz,
    getQuizzesByCourse,
    getQuizById,
    submitQuizAttempt,
    getQuizResults
} = require('../controllers/quizController');

// ── Instructor Routes ──────────────────────────────────────
router.post('/', protect, denySuspendedActions, authorizeRoles('Instructor'), createQuiz);

// ── Shared Routes (authenticated users) ────────────────────
router.get('/course/:courseId', protect, getQuizzesByCourse);
router.get('/:id', protect, getQuizById);

// ── Student Routes ──────────────────────────────────────────
router.post('/:id/attempt', protect, denySuspendedActions, authorizeRoles('Student'), submitQuizAttempt);
router.get('/:id/results', protect, denySuspendedActions, authorizeRoles('Student'), getQuizResults);

module.exports = router;
