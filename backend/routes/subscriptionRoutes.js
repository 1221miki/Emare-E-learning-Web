const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { optionalProtect } = require('../middleware/auth');
const {
    subscribeForDiscount,
    checkDeviceSubscription,
    getSubscriptionStatus,
    checkEmailStatus
} = require('../controllers/subscriptionController');

// ── Rate Limiters ─────────────────────────────────────────────────────────────

// Strict: 5 subscribe attempts per IP per hour
const subscriptionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip,
    message: { success: false, code: 'RATE_LIMITED', message: 'Too many subscription attempts from this IP. Please try again in 1 hour.' }
});

// Moderate: 20 email-check requests per IP per 15 minutes
const emailCheckLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' }
});

// Relaxed: 60 status checks per IP per 15 minutes (page loads)
const statusLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' }
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/subscriptions/status
 *
 * PRIMARY cross-browser status endpoint. Backend is the source of truth.
 * Uses optionalProtect — works for both authenticated and anonymous users.
 *
 * Authenticated  → looks up subscription by userId or account email in DB
 * Anonymous      → returns { isSubscribed: false, requiresEmail: true }
 *                  (frontend prompts for email, then calls /status/check-email)
 */
router.get('/status', statusLimiter, optionalProtect, getSubscriptionStatus);

/**
 * POST /api/subscriptions/status/check-email
 *
 * Email-based status lookup for anonymous users.
 * Returns only { isSubscribed, status, expiresAt } — never the coupon code.
 * The user must know their own email to use this endpoint.
 */
router.post('/status/check-email', emailCheckLimiter, checkEmailStatus);

/**
 * POST /api/subscriptions/discount
 *
 * Subscribe with email and receive a personal discount coupon via email.
 * Works for both authenticated (userId linked) and anonymous users.
 */
router.post('/discount', subscriptionLimiter, optionalProtect, subscribeForDiscount);

/**
 * GET /api/subscriptions/discount/check
 *
 * Legacy device-fingerprint check — kept for backwards compatibility.
 * Prefer /status for cross-browser reliability.
 */
router.get('/discount/check', statusLimiter, checkDeviceSubscription);

module.exports = router;
