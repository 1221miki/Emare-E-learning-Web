const express = require('express');
const router = express.Router();
const {
    getPublishedEvents,
    getPublishedEvent,
    registerForEvent,
    verifyEventPayment,
    getAdminEvents,
    validateStatusAdminEvent,
    getEventCategories,
    recordEventAttendance,
    submitEventFeedback
} = require('../controllers/eventController');
const { optionalProtect, protect, authorizeRoles } = require('../middleware/auth');

// GET /api/events/published — all APPROVED events (public listing)
router.get('/published', optionalProtect, getPublishedEvents);

// POST /api/events/register/:id — register a user (guest or logged-in) for an event
router.post('/register/:id', optionalProtect, registerForEvent);

// POST /api/events/:id/attendance — record student attendance when entering meeting
router.post('/:id/attendance', protect, recordEventAttendance);

// POST /api/events/:id/feedback — submit feedback for completed event
router.post('/:id/feedback', protect, submitEventFeedback);

// GET /api/events/verify-payment/:tx_ref — verify event payment (public, called by callback page)
router.get('/verify-payment/:tx_ref', verifyEventPayment);

// ── Admin sub-resource (mounts under /api/events/admin) ───────────────────
// GET  /api/events/admin/all        — view all events regardless of status
// PUT  /api/events/admin/validate/:id — approve or reject with status + rejectionReason
router.use('/admin', protect, authorizeRoles('Admin'));
router.get('/admin/all', getAdminEvents);
router.get('/admin/categories', getEventCategories);
router.put('/admin/validate/:id', validateStatusAdminEvent);

// GET /api/events/:id — single event detail
router.get('/:id', optionalProtect, getPublishedEvent);

// Legacy aliases (kept for backward compatibility)
router.get('/', optionalProtect, getPublishedEvents);
router.post('/:id/register', optionalProtect, registerForEvent);

module.exports = router;