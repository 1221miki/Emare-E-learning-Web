const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * DiscountSubscription Model
 *
 * Tracks newsletter/discount subscriptions made from the homepage.
 * Each email can only subscribe once.
 * A server-side device fingerprint (hashed IP + User-Agent) prevents
 * the same browser/device from claiming multiple coupons even if the
 * user tries a different email address.
 */
const DiscountSubscriptionSchema = new mongoose.Schema(
    {
        // Subscriber email — unique per subscriber
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address']
        },

        // Coupon code generated for this subscriber
        couponCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true
        },

        // Reference to the Coupon document created for this subscriber
        couponRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon',
            default: null
        },

        // Subscription status
        status: {
            type: String,
            enum: ['active', 'used', 'expired', 'unsubscribed'],
            default: 'active'
        },

        // Whether the coupon has been used in a purchase
        couponUsed: {
            type: Boolean,
            default: false
        },

        // Coupon expiry (copied here for quick lookup)
        expiresAt: {
            type: Date,
            default: null
        },

        // Hashed device fingerprint: SHA-256(IP + ":" + User-Agent)
        // Stored as a hash — never the raw IP or UA
        deviceFingerprint: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        // Whether the confirmation email was sent successfully
        emailSent: {
            type: Boolean,
            default: false
        },

        // Persistent token issued to the browser via an httpOnly cookie.
        // Lets the same browser be recognized as subscribed on later visits
        // without re-entering an email address. Sparse + unique because many
        // subscribers may not have one (pre-cookie records).
        subscriptionToken: {
            type: String,
            default: null,
            trim: true
        },

        // Linked user account (populated when the subscriber is logged in at subscribe time)
        // Sparse: many subscribers may be anonymous at subscription time
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true
        },

        // Source of subscription (for analytics)
        source: {
            type: String,
            enum: ['homepage', 'checkout', 'other'],
            default: 'homepage'
        }
    },
    { timestamps: true }
);

// --- Indexes ---------------------------------------------------------------

// One email per subscriber (strict uniqueness)
DiscountSubscriptionSchema.index({ email: 1 }, { unique: true });

// One coupon per device fingerprint (prevents multi-email abuse from same device)
DiscountSubscriptionSchema.index({ deviceFingerprint: 1 }, { unique: true });

// For status/expiry queries
DiscountSubscriptionSchema.index({ status: 1, expiresAt: 1 });

// Persistent cookie token lookup (sparse: only records that have a token)
DiscountSubscriptionSchema.index({ subscriptionToken: 1 }, { unique: true, sparse: true });

// --- Static helpers --------------------------------------------------------

/**
 * Build a deterministic, one-way device fingerprint from the request.
 * Uses IP address + User-Agent — never stored in plain text.
 * Falls back gracefully if headers are missing.
 */
DiscountSubscriptionSchema.statics.buildFingerprint = function (req) {
    const ip =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        'unknown';
    const ua = req.headers['user-agent'] || 'unknown-ua';
    const raw = `${ip}:${ua}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
};

module.exports = mongoose.model('DiscountSubscription', DiscountSubscriptionSchema);
