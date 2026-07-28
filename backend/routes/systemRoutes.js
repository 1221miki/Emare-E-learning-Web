const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, createBackup, restoreDatabase, optimizeDatabase, monitorCollections, monitorStorage, clearCache } = require('../controllers/systemController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Only Admins can access system routes
router.use(protect);
router.use(authorizeRoles('Admin'));

router.route('/settings')
    .get(getSettings)
    .put(updateSettings);

router.post('/backup', createBackup);
router.post('/database/restore', restoreDatabase);
router.post('/database/optimize', optimizeDatabase);
router.get('/database/collections', monitorCollections);
router.get('/database/storage', monitorStorage);
router.post('/cache/clear', clearCache);

module.exports = router;
