const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    value: { type: Number, required: true, default: 0 }, // percent (e.g. 20) or fixed amount in currency
    maxDiscount: { type: Number, default: 0 }, // optional cap on discount amount
    appliesTo: {
        allCourses: { type: Boolean, default: true },
        courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
        categoryIds: [{ type: mongoose.Schema.Types.ObjectId }]
    },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    redeemLimit: { type: Number, default: 0 }, // 0 = unlimited
    usageLimitPerUser: { type: Number, default: 0 }, // 0 = unlimited
    redeemedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ active: 1, expiresAt: 1 });

module.exports = mongoose.model('Coupon', CouponSchema);
