const router = require('express').Router();
const { protect, authorizeRoles, denySuspendedActions } = require('../middleware/auth');
const { getCourseSessions, createLiveSession, deleteLiveSession } = require('../controllers/liveSessionController');

router.use(protect);
router.get('/course/:courseId', getCourseSessions);
router.post('/', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), createLiveSession);
router.delete('/:id', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), deleteLiveSession);

module.exports = router;
