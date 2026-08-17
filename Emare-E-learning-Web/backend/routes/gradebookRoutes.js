const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
    submitAssignment,
    getSubmissionsForCourse,
    gradeSubmission,
    getStudentGrades
} = require('../controllers/gradebookController');

// ── Student Routes ──────────────────────────────────────────
router.post('/', protect, authorizeRoles('Student'), submitAssignment);
router.get('/my-grades', protect, authorizeRoles('Student'), getStudentGrades);

// ── Instructor Routes ──────────────────────────────────────
router.get('/course/:courseId', protect, authorizeRoles('Instructor'), getSubmissionsForCourse);
router.patch('/:id/grade', protect, authorizeRoles('Instructor'), gradeSubmission);

module.exports = router;
