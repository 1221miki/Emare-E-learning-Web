const express = require('express');
const router = express.Router();
const {
    getPublishedEvents,
    getPublishedEvent,
    registerForEvent,
    verifyEventPayment,
    getMyEventRegistration,
    getMyEventRegistrations,
    getEventAccess,
    cancelMyEventRegistration,
    getAdminEvents,
    validateStatusAdminEvent,
    getEventCategories
} = require('../controllers/eventController');
const {
    protect,
    authorizeRoles,
    optionalProtect,
    requireEventAccess,
    denySuspendedActions
} = require('../middleware/auth');

// ── Public browsing (no login required) ────────────────────────────────
// optionalProtect lets the response carry the viewer's own registration state
// when a valid session happens to exist.
router.get('/published', optionalProtect, getPublishedEvents);
router.get('/', optionalProtect, getPublishedEvents);

// ── The signed-in user's own bookings ──────────────────────────────────
router.get('/me/registrations', protect, getMyEventRegistrations);

// ── Registration: authentication is REQUIRED ───────────────────────────
// The server decides the amount, the status and whether payment is needed.
router.post('/register/:id', protect, registerForEvent);

// ── Payment verification (server-side Chapa check, idempotent) ─────────
// Authenticated, and ownership is checked against the stored transaction.
router.post('/:id/payments/verify', protect, verifyEventPayment);
router.get('/verify-payment/:tx_ref', protect, verifyEventPayment);

// ── Own registration state / cancel ────────────────────────────────────
router.get('/:id/registration', protect, getMyEventRegistration);
router.post('/:id/registration/cancel', protect, cancelMyEventRegistration);

// ── Protected event content (meeting link, password) ───────────────────
// Backend gate: authenticated + registered + payment verified by Chapa.
// Typing the URL directly grants nothing.
router.get(
    '/:id/access',
    protect,
    denySuspendedActions,
    requireEventAccess,
    getEventAccess
);

// ── Admin sub-resource (mounts under /api/events/admin) ─────────────────
router.use('/admin', protect, authorizeRoles('Admin'));
router.get('/admin/all', getAdminEvents);
router.get('/admin/categories', getEventCategories);
router.put('/admin/validate/:id', validateStatusAdminEvent);

// ── Event detail (must stay last so it does not swallow the routes above) ─
router.get('/:id', optionalProtect, getPublishedEvent);

// ── Legacy alias kept for backward compatibility ───────────────────────
router.post('/:id/register', protect, registerForEvent);

module.exports = router;
