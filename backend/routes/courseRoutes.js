const express = require('express');
const router = express.Router();
const { protect, authorizeRoles, optionalProtect } = require('../middleware/auth');
const {
    createCourse,
    getPublishedCourses,
    getCourseById,
    updateCourse,
    submitCourseForReview,
    approveCourse,
    enrollInCourse,
    getInstructorCourses,
    getStudentEnrollments,
    toggleTuitionClearance,
    streamLessonVideo
} = require('../controllers/courseController');

// ── Public Routes ──────────────────────────────────────────
router.get('/', getPublishedCourses);

// ── Student Routes (must be above /:id to avoid param capture) ──
router.get('/student/enrolled', protect, authorizeRoles('Student'), getStudentEnrollments);
router.post('/:id/enroll', protect, authorizeRoles('Student'), enrollInCourse);

// ── Instructor Routes (must be above /:id to avoid param capture) ──
router.get('/instructor/mine', protect, authorizeRoles('Instructor'), getInstructorCourses);
router.post('/', protect, authorizeRoles('Instructor'), createCourse);
router.put('/:id', protect, authorizeRoles('Instructor'), updateCourse);
router.patch('/:id/submit', protect, authorizeRoles('Instructor'), submitCourseForReview);

// ── Admin Routes ────────────────────────────────────────────
router.patch('/:id/approve', protect, authorizeRoles('Admin'), approveCourse);
router.patch('/enrollment/:enrollmentId/clear', protect, authorizeRoles('Admin'), toggleTuitionClearance);

// ── Parameterized Routes (must be LAST to avoid catching string paths) ──
router.get('/lessons/:id/stream', protect, streamLessonVideo);
router.get('/:id', optionalProtect, getCourseById);

module.exports = router;
