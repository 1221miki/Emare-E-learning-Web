const express = require('express');
const router = express.Router();
const {
    getCalendarEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    getGoogleAuthUrl,
    getGoogleStatus,
    handleGoogleCallback
} = require('../controllers/calendarController');
const { protect, authorizeRoles } = require('../middleware/auth');

// ── Public (no auth) — Google redirects the browser here directly, so the
//    request carries no JWT/session cookie.  Must be registered BEFORE the
//    protect middleware or the exchange will always get a 401.
router.get('/google/callback', handleGoogleCallback);

// ── Status is also public so the frontend can poll without a valid token
//    (e.g. right after the OAuth redirect lands on the Events page).
router.get('/google/status', getGoogleStatus);

router.use(protect);
router.use(authorizeRoles('Admin'));

// ── Protected Google Meet OAuth — only admins can start the flow.
router.get('/google/auth-url', getGoogleAuthUrl);

router.get('/', getCalendarEvents);
router.post('/', createCalendarEvent);
router.put('/:id', updateCalendarEvent);
router.delete('/:id', deleteCalendarEvent);

module.exports = router;