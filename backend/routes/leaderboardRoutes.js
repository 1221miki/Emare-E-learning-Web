const router = require('express').Router();
const User = require('../models/User');

// @desc    Get top 50 students by gamification points
// @route   GET /api/leaderboard
// @access  Public
router.get('/', async (req, res) => {
    try {
        const leaders = await User.find({ assignedRole: 'Student', isActive: true })
            .select('fullName avatarUrl gamificationPoints earnedBadges')
            .sort('-gamificationPoints')
            .limit(50);
        res.status(200).json({ success: true, data: leaders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
