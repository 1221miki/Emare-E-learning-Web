const mongoose = require('mongoose');

const CouponUsageSchema = new mongoose.Schema({
    couponRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    tx_ref: { type: String, trim: true },
    originalAmount: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    status: { type: String, enum: ['reserved', 'applied', 'failed'], default: 'applied' },
    redeemedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

CouponUsageSchema.index({ couponRef: 1 });
CouponUsageSchema.index({ studentRef: 1, couponRef: 1 });

module.exports = mongoose.model('CouponUsage', CouponUsageSchema);
