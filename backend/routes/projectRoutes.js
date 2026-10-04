const router = require('express').Router();
const { protect, authorizeRoles, denySuspendedActions } = require('../middleware/auth');
const projectController = require('../controllers/projectController');
const upload = require('../middleware/assignmentUpload');

// Instructor routes
router.post('/', protect, authorizeRoles('Instructor'), projectController.createProject);
router.put('/:id', protect, authorizeRoles('Instructor'), projectController.updateProject);

// Public/student
router.get('/course/:courseId', protect, projectController.getProjectsByCourse);
router.get('/my', protect, projectController.getMyProjects);
router.get('/:id', protect, projectController.getProject);

// Team management
router.post('/teams', protect, projectController.createTeam);
router.post('/teams/join', protect, projectController.joinTeamByInvite);

// Submissions
router.post('/:id/submit-multipart', protect, upload.array('files'), projectController.submitProjectMultipart);
router.get('/:id/submissions', protect, authorizeRoles('Instructor'), projectController.getSubmissionsForProject);
router.get('/submissions/my', protect, projectController.getMySubmissions);
router.patch('/submissions/:submissionId/grade', protect, authorizeRoles('Instructor'), projectController.gradeSubmission);

module.exports = router;
