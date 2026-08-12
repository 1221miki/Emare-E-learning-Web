const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

async function calculateDiscount(coupon, price) {
    if (!coupon) return { discountAmount: 0, finalAmount: price };
    let discountAmount = 0;
    if (coupon.type === 'percent') {
        discountAmount = (price * (coupon.value || 0)) / 100;
    } else {
        discountAmount = coupon.value || 0;
    }
    if (coupon.maxDiscount && coupon.maxDiscount > 0) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    const finalAmount = Math.max(0, Math.round((price - discountAmount) * 100) / 100);
    return { discountAmount, finalAmount };
}

async function validateCoupon(code, courseId, userId, originalAmount) {
    if (!code) return { valid: false, message: 'Missing coupon code' };
    const normalized = String(code || '').trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: normalized });
    if (!coupon) return { valid: false, message: 'Invalid coupon code.' };
    const now = new Date();
    if (!coupon.active) return { valid: false, message: 'This coupon is currently inactive.' };
    if (coupon.startsAt && coupon.startsAt > now) return { valid: false, message: 'This coupon is not available yet.' };
    if (coupon.expiresAt && coupon.expiresAt < now) return { valid: false, message: 'This coupon has expired.' };
    if (coupon.redeemLimit && coupon.redeemedCount >= coupon.redeemLimit) return { valid: false, message: 'This coupon has reached its usage limit.' };

    // Minimum purchase amount validation
    if (coupon.appliesTo?.minimumPurchaseAmount && coupon.appliesTo.minimumPurchaseAmount > 0) {
        if (originalAmount < coupon.appliesTo.minimumPurchaseAmount) {
            return { valid: false, message: `Minimum purchase amount for this coupon is ${coupon.appliesTo.minimumPurchaseAmount} ETB.`, coupon };
        }
    }

    // Course applicability
    if (!coupon.appliesTo?.allCourses) {
        if (Array.isArray(coupon.appliesTo?.courseIds) && coupon.appliesTo.courseIds.length > 0) {
            const match = coupon.appliesTo.courseIds.some(id => id.toString() === String(courseId));
            if (!match) return { valid: false, message: 'This coupon is not valid for this course.', coupon };
        }
    }

    // Per-user limit check
    if (coupon.usageLimitPerUser && coupon.usageLimitPerUser > 0) {
        const usedCount = await CouponUsage.countDocuments({ couponRef: coupon._id, studentRef: userId });
        if (usedCount >= coupon.usageLimitPerUser) return { valid: false, message: 'You have already used this coupon the maximum number of times.', coupon };
    }

    const { discountAmount, finalAmount } = await calculateDiscount(coupon, originalAmount);
    return { valid: true, coupon, discountAmount, finalAmount };
}

// Record a coupon usage after payment is verified. Idempotent by tx_ref.
// Accepts optional options: { session }
async function recordUsageIfNeeded(couponObj, tx, options = {}) {
    if (!couponObj || !tx) return { ok: false, message: 'Missing args' };
    const couponId = couponObj._id || couponObj;
    const txRef = tx.metadata?.tx_ref || tx._id?.toString();

    // Avoid double-creating if already recorded
    if (tx.metadata && tx.metadata.couponRecorded) return { ok: true, message: 'Already recorded' };
    // If a session is provided in options, use it; otherwise attempt to start one.
    let session = options.session || null;
    let startedSession = false;
    if (!session) {
        try {
            session = await mongoose.startSession();
            startedSession = true;
        } catch (err) {
            session = null;
            startedSession = false;
        }
    }

    if (session && typeof session.withTransaction === 'function') {
        let resultUsage = null;
        const transactionOptions = { readPreference: 'primary', readConcern: { level: 'local' }, writeConcern: { w: 'majority' } };
        await session.withTransaction(async () => {
            // Reload tx inside transaction
            const txDoc = await Transaction.findById(tx._id).session(session);
            if (!txDoc) throw new Error('Transaction not found');
            if (txDoc.metadata && txDoc.metadata.couponRecorded) return;

            // Atomically increment coupon redeemedCount if under limit and still active.
            const updatedCoupon = await Coupon.findOneAndUpdate(
                {
                    _id: couponId,
                    active: true,
                    $or: [
                        { redeemLimit: { $exists: false } },
                        { redeemLimit: 0 },
                        { $expr: { $lt: ['$redeemedCount', '$redeemLimit'] } }
                    ]
                },
                { $inc: { redeemedCount: 1 } },
                { new: true, session }
            );

            if (!updatedCoupon) {
                const couponDoc = await Coupon.findById(couponId).session(session);
                if (!couponDoc) throw new Error('Coupon not found');
                if (!couponDoc.active) throw new Error('Coupon inactive');
                if (couponDoc.redeemLimit && couponDoc.redeemedCount >= couponDoc.redeemLimit) throw new Error('Redeem limit reached');
                await Coupon.findByIdAndUpdate(couponId, { $inc: { redeemedCount: 1 } }, { session });
            }

            // Create usage record
            resultUsage = await CouponUsage.create([
                {
                    couponRef: couponId,
                    studentRef: txDoc.studentRef,
                    transactionRef: txDoc._id,
                    tx_ref: txDoc.metadata?.tx_ref || '',
                    originalAmount: txDoc.metadata?.originalAmount || txDoc.amount || 0,
                    discountAmount: txDoc.metadata?.discountAmount || 0,
                    finalAmount: txDoc.amount || 0,
                    status: 'applied'
                }
            ], { session });

            // Mark transaction metadata as recorded to ensure idempotency
            txDoc.metadata = { ...txDoc.metadata, couponRecorded: true };
            await txDoc.save({ session });
        }, transactionOptions).catch(err => { throw err; });

        if (startedSession && session) session.endSession();
        return { ok: true, usage: Array.isArray(resultUsage) ? resultUsage[0] : resultUsage };
    }

    // If we started a session but could not use transactions, end it
    if (startedSession && session) session.endSession();

    // Fallback: non-transactional path (best-effort atomic update)
    // Atomically increment coupon redeemedCount if under limit and still active.
    const updated = await Coupon.findOneAndUpdate(
        {
            _id: couponId,
            active: true,
            $or: [
                { redeemLimit: { $exists: false } },
                { redeemLimit: 0 },
                { $expr: { $lt: ['$redeemedCount', '$redeemLimit'] } }
            ]
        },
        { $inc: { redeemedCount: 1 } },
        { new: true }
    );

    if (!updated) {
        const couponDoc = await Coupon.findById(couponId);
        if (!couponDoc) return { ok: false, message: 'Coupon not found' };
        if (!couponDoc.active) return { ok: false, message: 'Coupon inactive' };
        if (couponDoc.redeemLimit && couponDoc.redeemedCount >= couponDoc.redeemLimit) return { ok: false, message: 'Redeem limit reached' };
        await Coupon.findByIdAndUpdate(couponId, { $inc: { redeemedCount: 1 } });
    }

    // Create usage record
    const usage = await CouponUsage.create({
        couponRef: couponId,
        studentRef: tx.studentRef,
        transactionRef: tx._id,
        tx_ref: tx.metadata?.tx_ref || '',
        originalAmount: tx.metadata?.originalAmount || tx.amount || 0,
        discountAmount: tx.metadata?.discountAmount || 0,
        finalAmount: tx.amount || 0,
        status: 'applied'
    });

    // Mark transaction metadata as recorded to ensure idempotency
    try {
        tx.metadata = { ...tx.metadata, couponRecorded: true };
        await tx.save();
    } catch (err) {
        // ignore
    }

    return { ok: true, usage };
}

module.exports = { validateCoupon, calculateDiscount, recordUsageIfNeeded };
