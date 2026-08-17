const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');

/**
 * GET /api/coupons/active
 * Public endpoint - Returns all active promotional coupons
 * Students can see available coupon codes and their details
 */
router.get('/active', async (req, res) => {
    try {
        const now = new Date();
        
        // Find all active coupons that haven't expired and haven't reached their global limit
        const activeCoupons = await Coupon.find({
            active: true,
            $or: [
                { startsAt: { $lte: now } },
                { startsAt: { $exists: false } }
            ],
            $or: [
                { expiresAt: { $gte: now } },
                { expiresAt: { $exists: false } }
            ]
        })
        .select('code type value maxDiscount description metadata redeemLimit redeemedCount expiresAt')
        .sort({ createdAt: -1 })
        .lean();

        // Filter out coupons that have reached their limit
        const availableCoupons = activeCoupons.filter(coupon => {
            if (coupon.redeemLimit && coupon.redeemLimit > 0) {
                return coupon.redeemedCount < coupon.redeemLimit;
            }
            return true; // Unlimited coupons are always available
        });

        res.json({
            success: true,
            data: availableCoupons
        });
    } catch (err) {
        console.error('Error fetching active coupons:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active promotions'
        });
    }
});

module.exports = router;
