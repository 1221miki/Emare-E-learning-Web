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

router.use(protect);
router.use(authorizeRoles('Admin'));

// Google Meet OAuth — server-side credentials only.
router.get('/google/auth-url', getGoogleAuthUrl);
router.get('/google/status', getGoogleStatus);
router.get('/google/callback', handleGoogleCallback);

router.get('/', getCalendarEvents);
router.post('/', createCalendarEvent);
router.put('/:id', updateCalendarEvent);
router.delete('/:id', deleteCalendarEvent);

module.exports = router;