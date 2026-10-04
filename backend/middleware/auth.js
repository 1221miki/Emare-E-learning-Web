const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * protect - Verifies JWT from HTTP-Only cookie and hydrates req.user
 */
const protect = async (req, res, next) => {
    let token;

    // Read token from HTTP-only cookie (primary) or Authorization header (fallback)
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this resource. Please log in.'
        });
    }

    try {
        // Verify JWT signature and decode payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Hydrate request object with full user data (minus password)
        req.user = await User.findById(decoded.id).select('-securedPassword');

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'User no longer exists.' });
        }

        if (!req.user.isActive) {
            return res.status(401).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
        }

        // Allow suspended users to log in but flag them in request
        if (req.user.isSuspended) {
            req.user.suspendedStatus = {
                isSuspended: true,
                reason: req.user.suspensionReason,
                suspensionDate: req.user.suspensionDate,
                suspensionEndDate: req.user.suspensionEndDate
            };
        }

        // Validate that token matches the latest login session
        if (decoded.lastLogin && req.user.lastLoginTimestamp) {
            const tokenTime = new Date(decoded.lastLogin).getTime();
            const userTime = new Date(req.user.lastLoginTimestamp).getTime();
            // If database has a newer login timestamp, reject the request (allow 1s tolerance for saves)
            if (userTime - tokenTime > 1000) {
                return res.status(401).json({ success: false, message: 'Your session has been invalidated by a newer login.' });
            }
        }

        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Session expired or token invalid. Please log in again.' });
    }
};

/**
 * authorizeRoles - Restricts route access to specific user roles
 * Usage: authorizeRoles('Admin', 'Instructor')
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.assignedRole)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Role '${req.user ? req.user.assignedRole : 'Guest'}' is not authorized for this action.`
            });
        }
        next();
    };
};

const denySuspendedActions = (req, res, next) => {
    if (req.user?.isSuspended) {
        return res.status(403).json({
            success: false,
            message: 'Your account is suspended. You can browse the site, but cannot perform this action.'
        });
    }
    next();
};

/**
 * optionalProtect - Optionally verifies JWT and hydrates req.user if token is present
 */
const optionalProtect = async (req, res, next) => {
    let token;

    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-securedPassword');
        if (req.user && req.user.isActive === false) req.user = null;
        next();
    } catch (err) {
        next(); // Ignore errors, proceed as guest
    }
};

/**
 * requireEventAccess — the single backend gate for protected event content.
 *
 * Access is granted only when ALL of the following hold, decided on the server:
 *   1. the caller is authenticated                       (via `protect`)
 *   2. the caller has a registration for that event
 *   3. that registration is CONFIRMED
 *   4. for paid events, Chapa has verified the payment   (paymentStatus === 'completed')
 *
 * The caller's role is never read from the request body or query string.
 * On success `req.event` and `req.eventRegistration` are populated.
 */
const requireEventAccess = async (req, res, next) => {
    // Lazy require to avoid a circular import at module load time.
    const Event = require('../models/Event');
    const EventRegistration = require('../models/EventRegistration');
    const eventPayment = require('../services/eventPaymentService');

    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                code: 'AUTH_REQUIRED',
                message: 'Please log in to access this event.'
            });
        }

        const ref = req.params.id || req.params.slug;
        const event = await Event.findOne({
            $or: [{ slug: ref }, ...(mongoose.isValidObjectId(String(ref)) ? [{ _id: ref }] : [])]
        });
        if (!event) {
            return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
        }

        // Free up seats held by abandoned checkouts before judging capacity/state.
        await eventPayment.releaseExpiredSeats(event._id);

        const registration = await EventRegistration.findOne({
            eventRef: event._id,
            userId: req.user._id,
            status: { $in: ['CONFIRMED', 'PAID', 'PENDING_PAYMENT', 'WAITLISTED', 'confirmed', 'waitlisted'] }
        }).sort({ createdAt: -1 });

        if (!registration) {
            return res.status(403).json({
                success: false,
                code: 'REGISTRATION_REQUIRED',
                message: 'You are not registered for this event.',
                data: { eventSlug: event.slug, requiresRegistration: true }
            });
        }

        if (!eventPayment.hasAccess(registration)) {
            const status = eventPayment.normalizeStatus(registration);
            const expired = eventPayment.isExpired(registration);
            return res.status(403).json({
                success: false,
                code: expired ? 'PAYMENT_EXPIRED' : status === 'PENDING_PAYMENT' ? 'PAYMENT_PENDING' : 'PAYMENT_REQUIRED',
                message: expired
                    ? 'Your payment window expired. Please register again to get a fresh checkout link.'
                    : status === 'PENDING_PAYMENT'
                        ? 'Complete your payment to unlock this event.'
                        : 'Your payment could not be verified, so access has not been granted.',
                data: {
                    eventSlug: event.slug,
                    registrationStatus: status,
                    paymentStatus: registration.paymentStatus,
                    bookingRef: registration.bookingRef,
                    requiresPayment: true
                }
            });
        }

        req.event = event;
        req.eventRegistration = registration;
        return next();
    } catch (err) {
        console.error('requireEventAccess error:', err && err.message);
        return res.status(500).json({ success: false, message: 'Failed to verify event access.' });
    }
};

module.exports = { protect, authorizeRoles, denySuspendedActions, optionalProtect, requireEventAccess };
