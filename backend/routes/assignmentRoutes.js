const router = require('express').Router();
const { protect, authorizeRoles, denySuspendedActions } = require('../middleware/auth');
const {
    createAssignment, getCourseAssignments, submitAssignment,
    getSubmissions, gradeSubmission, getMySubmissions
} = require('../controllers/assignmentController');

router.use(protect);

// Student routes
router.get('/my-submissions', authorizeRoles('Student'), getMySubmissions);
router.post('/:id/submit', denySuspendedActions, authorizeRoles('Student'), submitAssignment);

// Instructor routes
router.post('/', denySuspendedActions, authorizeRoles('Instructor'), createAssignment);
router.get('/:id/submissions', authorizeRoles('Instructor', 'Admin'), getSubmissions);
router.patch('/submissions/:submissionId/grade', denySuspendedActions, authorizeRoles('Instructor'), gradeSubmission);

// Shared
router.get('/course/:courseId', getCourseAssignments);

module.exports = router;
