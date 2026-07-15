const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
    createQuiz,
    getQuizzesByCourse,
    getQuizById,
    submitQuizAttempt,
    getQuizResults
} = require('../controllers/quizController');

// ── Instructor Routes ──────────────────────────────────────
router.post('/', protect, authorizeRoles('Instructor'), createQuiz);

// ── Shared Routes (authenticated users) ────────────────────
router.get('/course/:courseId', protect, getQuizzesByCourse);
router.get('/:id', protect, getQuizById);

// ── Student Routes ──────────────────────────────────────────
router.post('/:id/attempt', protect, authorizeRoles('Student'), submitQuizAttempt);
router.get('/:id/results', protect, authorizeRoles('Student'), getQuizResults);

module.exports = router;
