const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { exportReport } = require('../controllers/reportController');

router.get('/export', protect, authorizeRoles('Admin'), exportReport);

module.exports = router;
