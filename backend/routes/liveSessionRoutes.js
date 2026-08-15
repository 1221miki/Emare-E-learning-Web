const router = require('express').Router();
const { protect, optionalProtect, authorizeRoles, denySuspendedActions } = require('../middleware/auth');
const { getUpcomingSessions, getCourseSessions, getMyLiveSessions, createLiveSession, markLiveSessionAttendance, deleteLiveSession, reserveSession } = require('../controllers/liveSessionController');
const { createGoogleMeetEvent } = require('../controllers/googleMeetController');

// Public: upcoming live sessions for the landing page (optional auth flags reservations)
router.get('/upcoming', optionalProtect, getUpcomingSessions);
router.post('/:id/reserve', protect, denySuspendedActions, reserveSession);

router.use(protect);
router.get('/course/:courseId', getCourseSessions);
router.get('/me', getMyLiveSessions);
router.post('/', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), createLiveSession);
router.post('/google/create', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), createGoogleMeetEvent);
router.put('/:id/attendance', markLiveSessionAttendance);
router.delete('/:id', denySuspendedActions, authorizeRoles('Instructor', 'Admin'), deleteLiveSession);

module.exports = router;
