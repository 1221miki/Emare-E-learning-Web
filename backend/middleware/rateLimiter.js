const rateLimit = require('express-rate-limit');

// General API rate limiter (100 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again after 15 minutes.'
    }
});

// Strict rate limiter for authentication routes (10 attempts per 15 minutes)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in 15 minutes for security reasons.'
    }
});

// Rate limiter for AI query endpoints (20 queries per 15 minutes)
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'AI query limit reached for this window. Please wait 15 minutes.'
    }
});

module.exports = { apiLimiter, authLimiter, aiLimiter };
