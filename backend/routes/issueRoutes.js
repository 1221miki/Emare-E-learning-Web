const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const issueController = require('../controllers/issueController');

router.post('/:courseId?', protect, issueController.createIssue);
router.get('/my', protect, issueController.getMyIssues);
router.post('/update/:issueId', protect, authorizeRoles('Admin','Support'), issueController.updateIssueStatus);

module.exports = router;
