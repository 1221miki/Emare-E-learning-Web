const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discountPercent: { type: Number, default: 0 },
    redeemLimit: { type: Number, default: 0 },
    redeemedCount: { type: Number, default: 0 },
    expiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);
