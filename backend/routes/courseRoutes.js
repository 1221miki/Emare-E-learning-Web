const express = require('express');
const router = express.Router();
const { protect, authorizeRoles, denySuspendedActions, optionalProtect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
    createCourse,
    getPublishedCourses,
    getAllCourses,
    getCourseById,
    updateCourse,
    submitCourseForReview,
    approveCourse,
    requestCourseRevision,
    rejectCourse,
    publishCourse,
    archiveCourse,
    restoreCourse,
    featureCourse,
    sendCourseFeedback,
    assignInstructor,
    removeInstructor,
    changeCourseCategory,
    enrollInCourse,
    getInstructorCourses,
    getStudentEnrollments,
    toggleTuitionClearance,
    streamLessonVideo,
    deleteCourse,
    unpublishCourse,
    duplicateCourse,
    getInstructorAnalytics,
    uploadCourseThumbnail,
    debugCourseThumbnails,
    fixCourseThumbnails
} = require('../controllers/courseController');

// ── Public Routes ──────────────────────────────────────────
router.get('/', getPublishedCourses);
router.get('/debug/thumbnails', debugCourseThumbnails);
router.post('/admin/fix-thumbnails', protect, authorizeRoles('Admin'), fixCourseThumbnails);

// ── Admin Course Management Routes ───────────────────────────
router.get('/admin/all', protect, authorizeRoles('Admin'), getAllCourses);
router.patch('/:id/request-revision', protect, denySuspendedActions, authorizeRoles('Admin'), requestCourseRevision);
router.patch('/:id/reject', protect, denySuspendedActions, authorizeRoles('Admin'), rejectCourse);
router.patch('/:id/publish', protect, denySuspendedActions, authorizeRoles('Admin'), publishCourse);
router.patch('/:id/restore', protect, denySuspendedActions, authorizeRoles('Admin'), restoreCourse);
router.patch('/:id/feature', protect, denySuspendedActions, authorizeRoles('Admin'), featureCourse);
router.patch('/:id/feedback', protect, denySuspendedActions, authorizeRoles('Admin'), sendCourseFeedback);
router.patch('/:id/assign-instructor', protect, denySuspendedActions, authorizeRoles('Admin'), assignInstructor);
router.patch('/:id/remove-instructor', protect, denySuspendedActions, authorizeRoles('Admin'), removeInstructor);
router.patch('/:id/change-category', protect, denySuspendedActions, authorizeRoles('Admin'), changeCourseCategory);

// ── Student Routes (must be above /:id to avoid param capture) ──
router.get('/student/enrolled', protect, authorizeRoles('Student'), getStudentEnrollments);
router.post('/:id/enroll', protect, denySuspendedActions, authorizeRoles('Student'), enrollInCourse);

// ── Instructor Routes (must be above /:id to avoid param capture) ──
router.get('/instructor/mine', protect, authorizeRoles('Instructor'), getInstructorCourses);
router.get('/instructor/analytics', protect, authorizeRoles('Instructor'), getInstructorAnalytics);
router.post('/', protect, denySuspendedActions, authorizeRoles('Instructor'), createCourse);
router.put('/:id', protect, denySuspendedActions, authorizeRoles('Instructor'), updateCourse);
router.post('/:id/thumbnail', protect, denySuspendedActions, authorizeRoles('Instructor'), upload.single('thumbnail'), uploadCourseThumbnail);
router.delete('/:id', protect, denySuspendedActions, authorizeRoles('Instructor'), deleteCourse);
router.patch('/:id/submit', protect, denySuspendedActions, authorizeRoles('Instructor'), submitCourseForReview);
router.patch('/:id/archive', protect, denySuspendedActions, authorizeRoles('Instructor','Admin'), archiveCourse);
router.patch('/:id/unpublish', protect, denySuspendedActions, authorizeRoles('Instructor','Admin'), unpublishCourse);
router.post('/:id/duplicate', protect, denySuspendedActions, authorizeRoles('Instructor'), duplicateCourse);

// ── Admin Routes ────────────────────────────────────────────
router.patch('/:id/approve', protect, denySuspendedActions, authorizeRoles('Admin'), approveCourse);
router.patch('/enrollment/:enrollmentId/clear', protect, denySuspendedActions, authorizeRoles('Admin'), toggleTuitionClearance);

// ── Parameterized Routes (must be LAST to avoid catching string paths) ──
router.get('/lessons/:id/stream', protect, streamLessonVideo);
router.get('/:id', optionalProtect, getCourseById);

module.exports = router;
