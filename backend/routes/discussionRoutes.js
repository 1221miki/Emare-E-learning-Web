const router = require('express').Router();
const { protect, authorizeRoles, denySuspendedActions } = require('../middleware/auth');
const {
    getCourseDiscussions,
    createDiscussion,
    addReply,
    togglePin,
    upvoteDiscussion,
    resolveDiscussion,
    selectBestReply,
    deleteDiscussion
} = require('../controllers/discussionController');

router.use(protect);
router.get('/course/:courseId', getCourseDiscussions);
router.post('/', denySuspendedActions, createDiscussion);
router.post('/:id/reply', denySuspendedActions, addReply);
router.post('/:id/upvote', denySuspendedActions, upvoteDiscussion);
router.patch('/:id/pin', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), togglePin);
router.patch('/:id/resolve', denySuspendedActions, resolveDiscussion);
router.patch('/:id/best-reply', denySuspendedActions, selectBestReply);
router.delete('/:id', denySuspendedActions, deleteDiscussion);

module.exports = router;
