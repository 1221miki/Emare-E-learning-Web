const router = require('express').Router();
const User = require('../models/User');

// @desc    Get top 50 students by gamification points
// @route   GET /api/leaderboard
// @access  Public
router.get('/', async (req, res) => {
    // Leaderboard disabled per application requirements
    res.status(200).json({ success: true, data: [] });
});

module.exports = router;
