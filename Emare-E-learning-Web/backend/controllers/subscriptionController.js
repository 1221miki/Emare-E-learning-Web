const crypto = require('crypto');
const Coupon = require('../models/Coupon');
const DiscountSubscription = require('../models/DiscountSubscription');
const emailService = require('../services/emailService');

// ── Helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(email) {
    return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(String(email || '').trim());
}

function generateCouponCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) suffix += chars[bytes[i] % chars.length];
    return `EMARE-${suffix}`;
}

async function generateUniqueCode() {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCouponCode();
        if (!await Coupon.exists({ code })) return code;
    }
    return `EMARE-${crypto.randomBytes(8).toString('hex').toUpperCase().slice(0, 10)}`;
}

/**
 * Build a safe public subscription status object.
 * Never exposes the actual coupon code — only metadata.
 */
function buildStatusPayload(sub) {
    const now = new Date();
    const expired = sub.expiresAt && sub.expiresAt < now;
    return {
        isSubscribed: true,
        email: sub.email,
        status: expired ? 'expired' : (sub.status || 'active'),
        couponUsed: sub.couponUsed || false,
        expiresAt: sub.expiresAt || null,
        createdAt: sub.createdAt || null
    };
}

// ── GET /api/subscriptions/status ─────────────────────────────────────────────
//
// PRIMARY cross-browser status endpoint.
// Uses optionalProtect middleware — works for both authenticated and anonymous users.
//
// Resolution order (database is ALWAYS the source of truth):
//   1. Authenticated user  → look up by userId in DiscountSubscription
//   2. Authenticated user  → also check by account email as fallback
//      (handles the case where they subscribed before logging in)
//   3. Anonymous           → return { isSubscribed: false, requiresEmail: true }
//      (frontend must ask the user to enter their email to check)
//
// Security: never returns the coupon code itself — only metadata.
//
exports.getSubscriptionStatus = async (req, res) => {
    try {
        // ── Path 1: Authenticated user ────────────────────────────────────
        if (req.user) {
            // Try by userId first (fastest)
            let sub = await DiscountSubscription.findOne({ userId: req.user._id }).lean();

            // Fallback: subscriber might have subscribed before linking their account
            if (!sub) {
                const email = (req.user.accountEmail || req.user.email || '').toLowerCase().trim();
                if (email) sub = await DiscountSubscription.findOne({ email }).lean();

                // If found by email but userId not linked yet, backfill the userId
                if (sub && !sub.userId) {
                    DiscountSubscription.findByIdAndUpdate(sub._id, { userId: req.user._id }).catch(() => {});
                }
            }

            if (sub) {
                return res.json({ success: true, ...buildStatusPayload(sub) });
            }

            // Authenticated but no subscription found
            return res.json({ success: true, isSubscribed: false });
        }

        // ── Path 2: Anonymous user ─────────────────────────────────────────
        // We cannot reliably identify anonymous users cross-browser.
        // Tell the frontend to prompt for email verification instead.
        return res.json({
            success: true,
            isSubscribed: false,
            requiresEmail: true  // frontend should show email-check form
        });

    } catch (err) {
        console.error('[subscriptionController] getSubscriptionStatus error:', err);
        return res.status(500).json({ success: false, isSubscribed: false });
    }
};

// ── POST /api/subscriptions/status/check-email ────────────────────────────────
//
// Allows an anonymous visitor to check whether their email is already subscribed.
// Returns ONLY a boolean — no coupon code, no personal details beyond what they
// already know (their own email).
//
// Rate-limited by the router. Used by the frontend to show the correct UI state
// when the user types their email into the subscription form.
//
exports.checkEmailStatus = async (req, res) => {
    try {
        const rawEmail = String(req.body?.email || '').toLowerCase().trim();

        if (!rawEmail || !isValidEmail(rawEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        const sub = await DiscountSubscription.findOne({ email: rawEmail })
            .select('status expiresAt couponUsed createdAt email')
            .lean();

        if (!sub) {
            return res.json({ success: true, isSubscribed: false });
        }

        return res.json({ success: true, ...buildStatusPayload(sub) });

    } catch (err) {
        console.error('[subscriptionController] checkEmailStatus error:', err);
        return res.status(500).json({ success: false, isSubscribed: false });
    }
};

// ── POST /api/subscriptions/discount ─────────────────────────────────────────
//
// Subscribe a visitor and issue a personal discount coupon.
//
// Flow:
//  1. Validate email
//  2. If authenticated, also link userId
//  3. Check duplicate by email (primary dedup)
//  4. Check duplicate by device fingerprint (secondary abuse-prevention signal)
//  5. Generate unique coupon code
//  6. Create Coupon document (10% off, 30-day expiry, single-use)
//  7. Create DiscountSubscription (unique indexes as final race-condition guard)
//  8. Send coupon via email (non-blocking)
//  9. Return success — coupon code NEVER in response body
//
exports.subscribeForDiscount = async (req, res) => {
    try {
        // ── 1. Input validation ────────────────────────────────────────────
        const rawEmail = String(req.body?.email || '').toLowerCase().trim();
        if (!rawEmail) {
            return res.status(400).json({ success: false, code: 'EMAIL_REQUIRED', message: 'Please enter your email address.' });
        }
        if (!isValidEmail(rawEmail)) {
            return res.status(400).json({ success: false, code: 'EMAIL_INVALID', message: 'Please enter a valid email address.' });
        }

        // ── 2. Authenticated user context ─────────────────────────────────
        const userId = req.user?._id || null;

        // ── 3. Duplicate email check (primary — works across all browsers/devices) ─
        const existingByEmail = await DiscountSubscription.findOne({ email: rawEmail }).lean();
        if (existingByEmail) {
            // Backfill userId if the user is now logged in and wasn't before
            if (userId && !existingByEmail.userId) {
                DiscountSubscription.findByIdAndUpdate(existingByEmail._id, { userId }).catch(() => {});
            }
            return res.status(409).json({
                success: false,
                code: 'EMAIL_ALREADY_SUBSCRIBED',
                message: 'This email has already received a discount coupon. Check your inbox!'
            });
        }

        // ── 4. Authenticated user — also check if their account already has a sub ─
        if (userId) {
            const existingByUser = await DiscountSubscription.findOne({ userId }).lean();
            if (existingByUser) {
                return res.status(409).json({
                    success: false,
                    code: 'ACCOUNT_ALREADY_SUBSCRIBED',
                    message: 'Your account has already received a discount coupon. Check your inbox!'
                });
            }
        }

        // ── 5. Device fingerprint (secondary — abuse prevention only, not primary identity) ─
        const fingerprint = DiscountSubscription.buildFingerprint(req);
        const existingByDevice = await DiscountSubscription.findOne({ deviceFingerprint: fingerprint }).lean();
        if (existingByDevice) {
            return res.status(409).json({
                success: false,
                code: 'DEVICE_ALREADY_SUBSCRIBED',
                message: 'This device has already received a discount coupon.'
            });
        }

        // ── 6. Generate unique coupon code ────────────────────────────────
        const couponCode = await generateUniqueCode();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // ── 7. Create the Coupon document ─────────────────────────────────
        const couponDoc = await Coupon.create({
            code: couponCode,
            type: 'percent',
            value: 10,
            maxDiscount: 500,
            appliesTo: { allCourses: true, minimumPurchaseAmount: 0 },
            startsAt: new Date(),
            expiresAt,
            redeemLimit: 1,
            usageLimitPerUser: 1,
            redeemedCount: 0,
            active: true,
            metadata: {
                purpose: 'newsletter_welcome',
                subscriberEmail: rawEmail,
                description: `10% welcome discount for newsletter subscriber ${rawEmail}`
            }
        });

        // ── 8. Create DiscountSubscription (unique indexes as final guard) ─
        let subscription;
        try {
            subscription = await DiscountSubscription.create({
                email: rawEmail,
                couponCode,
                couponRef: couponDoc._id,
                status: 'active',
                expiresAt,
                deviceFingerprint: fingerprint,
                source: 'homepage',
                emailSent: false,
                userId   // null for anonymous, ObjectId for authenticated
            });
        } catch (dbErr) {
            if (dbErr.code === 11000) {
                await Coupon.findByIdAndDelete(couponDoc._id).catch(() => {});
                const isDevDup = dbErr.keyPattern?.deviceFingerprint;
                const isEmailDup = dbErr.keyPattern?.email;
                return res.status(409).json({
                    success: false,
                    code: isDevDup ? 'DEVICE_ALREADY_SUBSCRIBED' : 'EMAIL_ALREADY_SUBSCRIBED',
                    message: isDevDup
                        ? 'This device has already received a discount coupon.'
                        : 'This email has already received a discount coupon. Check your inbox!'
                });
            }
            throw dbErr;
        }

        // ── 9. Send email non-blocking ────────────────────────────────────
        setImmediate(async () => {
            try {
                const result = await emailService.sendDiscountEmail(rawEmail, couponCode, expiresAt);
                await DiscountSubscription.findByIdAndUpdate(subscription._id, {
                    emailSent: result?.success === true
                });
            } catch (emailErr) {
                console.error('[subscriptionController] Email delivery failed for', rawEmail, emailErr?.message);
            }
        });

        // ── 10. Respond — coupon code intentionally NOT in response ───────
        return res.status(201).json({
            success: true,
            message: 'You have successfully subscribed! Your discount coupon code has been sent to your email.',
            expiresAt
        });

    } catch (err) {
        console.error('[subscriptionController] subscribeForDiscount error:', err);
        return res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again later.' });
    }
};

// ── GET /api/subscriptions/discount/check ─────────────────────────────────────
// KEPT for backwards compatibility — device fingerprint check.
// The new /status endpoint is preferred; this remains as a supplementary signal.
exports.checkDeviceSubscription = async (req, res) => {
    try {
        const fingerprint = DiscountSubscription.buildFingerprint(req);
        const existing = await DiscountSubscription.exists({ deviceFingerprint: fingerprint });
        return res.json({ success: true, alreadySubscribed: Boolean(existing) });
    } catch (err) {
        console.error('[subscriptionController] checkDeviceSubscription error:', err);
        return res.status(500).json({ success: false, alreadySubscribed: false });
    }
};
