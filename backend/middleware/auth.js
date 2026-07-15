const jwt = require('jsonwebtoken');
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

module.exports = { protect, authorizeRoles };
