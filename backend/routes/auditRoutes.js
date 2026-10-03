const express = require('express');
const router = express.Router();
const { getAuditLogs, getAuditStats } = require('../controllers/auditController');
const { protect, authorizeRoles } = require('../middleware/auth');

// All audit-log routes are Admin-only
router.use(protect);
router.use(authorizeRoles('Admin'));

// GET /api/audit-logs          — paginated list with filtering
// Query params: category, severity, search, page, limit, dateFrom, dateTo
router.get('/', getAuditLogs);

// GET /api/audit-logs/stats    — summary counts for dashboard widget
router.get('/stats', getAuditStats);

module.exports = router;
