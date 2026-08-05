const router = require('express').Router();
const { protect, authorizeRoles, denySuspendedActions } = require('../middleware/auth');
const assignmentController = require('../controllers/assignmentController');
const upload = require('../middleware/assignmentUpload');

router.use(protect);

// Student routes
router.get('/my-submissions', authorizeRoles('Student'), assignmentController.getMySubmissions);
router.post('/:id/submit', denySuspendedActions, authorizeRoles('Student'), assignmentController.submitAssignment);
router.post('/:id/submit-multipart', upload.array('files'), assignmentController.submitAssignmentMultipart);

// Instructor routes
router.post('/', denySuspendedActions, authorizeRoles('Instructor'), assignmentController.createAssignment);
router.put('/:id', authorizeRoles('Instructor'), assignmentController.updateAssignment);
router.get('/:id/submissions', authorizeRoles('Instructor', 'Admin'), assignmentController.getSubmissionsForAssignment);
router.patch('/submissions/:submissionId/grade', denySuspendedActions, authorizeRoles('Instructor'), assignmentController.gradeSubmission);

// Shared routes
router.get('/course/:courseId', assignmentController.getAssignmentsByCourse);
router.get('/my', assignmentController.getMyAssignments);
router.get('/submissions/my', assignmentController.getMySubmissions);
router.get('/:id', assignmentController.getAssignment);

module.exports = router;
