const router = require('express').Router();
const { protect, authorizeRoles, denySuspendedActions } = require('../middleware/auth');
const { getCourseDiscussions, createDiscussion, addReply, togglePin, deleteDiscussion } = require('../controllers/discussionController');

router.use(protect);
router.get('/course/:courseId', getCourseDiscussions);
router.post('/', denySuspendedActions, createDiscussion);
router.post('/:id/reply', denySuspendedActions, addReply);
router.patch('/:id/pin', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), togglePin);
router.delete('/:id', denySuspendedActions, deleteDiscussion);

module.exports = router;
