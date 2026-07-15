const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, createBackup, clearCache } = require('../controllers/systemController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Only Admins can access system routes
router.use(protect);
router.use(authorizeRoles('Admin'));

router.route('/settings')
    .get(getSettings)
    .put(updateSettings);

router.post('/backup', createBackup);
router.post('/cache/clear', clearCache);

module.exports = router;
