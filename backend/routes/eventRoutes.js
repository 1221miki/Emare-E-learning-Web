const express = require('express');
const router = express.Router();
const {
    getAdminEvents,
    getAdminStats,
    getAdminEvent,
    createAdminEvent,
    updateAdminEvent,
    deleteAdminEvent,
    validateAdminEvent,
    approveAdminEvent,
    rejectAdminEvent,
    validateStatusAdminEvent,
    cancelAdminEvent,
    regenerateMeetingUrl,
    generateMeetingLink
} = require('../controllers/eventController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect);
router.use(authorizeRoles('Admin'));

router.get('/', getAdminEvents);
router.get('/all', getAdminEvents);
router.get('/stats', getAdminStats);
router.post('/meetings/generate', generateMeetingLink);
router.get('/:id', getAdminEvent);
router.post('/', createAdminEvent);
router.put('/:id', updateAdminEvent);
router.delete('/:id', deleteAdminEvent);
router.post('/:id/regenerate-meeting', regenerateMeetingUrl);
router.post('/:id/validate', validateAdminEvent);
router.put('/:id/validate', validateStatusAdminEvent);
router.post('/:id/approve', approveAdminEvent);
router.post('/:id/reject', rejectAdminEvent);
router.post('/:id/cancel', cancelAdminEvent);

module.exports = router;
