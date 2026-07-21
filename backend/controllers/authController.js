const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper: Generate Access Token and Refresh Token and set HTTP-Only cookies
const sendTokenResponse = (user, statusCode, res) => {
    // Access token (15-120 minutes)
    const token = jwt.sign(
        { id: user._id, lastLogin: user.lastLoginTimestamp ? user.lastLoginTimestamp.getTime() : null },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '120m' }
    );

    // Refresh token (7 days)
    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
        { expiresIn: '7d' }
    );

    const isProduction = process.env.NODE_ENV === 'production';

    const cookieOptions = {
        httpOnly: true, // Prevents XSS access via document.cookie
        secure: isProduction, // HTTPS only in production
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 120 * 60 * 1000 // 120 minutes
    };

    const refreshCookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res.status(statusCode)
        .cookie('token', token, cookieOptions)
        .cookie('refreshToken', refreshToken, refreshCookieOptions)
        .json({
            success: true,
            token,
            refreshToken,
            data: {
                id: user._id,
                fullName: user.fullName,
                accountEmail: user.accountEmail,
                assignedRole: user.assignedRole,
                isActive: user.isActive
            }
        });
};

// ─────────────────────────────────────────────
// @desc    Register a new user account
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────
const register = async (req, res, next) => {
    try {
        const { fullName, accountEmail, securedPassword, assignedRole } = req.body;

        // Check for existing user
        const existingUser = await User.findOne({ accountEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }

        // Create new user - password is hashed via pre-save hook in User model
        const user = await User.create({
            fullName,
            accountEmail,
            securedPassword,
            assignedRole: assignedRole || 'Student',
            lastLoginTimestamp: Date.now()
        });

        sendTokenResponse(user, 201, res);
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Login user and issue JWT cookies
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
    try {
        const { accountEmail, securedPassword } = req.body;

        // Find user and include password field
        const user = await User.findOne({ accountEmail }).select('+securedPassword');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (!user.isActive) {
            return res.status(401).json({ success: false, message: 'Your account is deactivated. Please contact an administrator.' });
        }

        // Validate password using bcrypt instance method
        const isMatch = await user.comparePassword(securedPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Update last login timestamp
        user.lastLoginTimestamp = Date.now();
        await user.save({ validateBeforeSave: false });

        sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Refresh access token using HTTP-Only refresh cookie
// @route   POST /api/auth/refresh
// @access  Public (via Refresh Token)
// ─────────────────────────────────────────────
const refresh = async (req, res, next) => {
    try {
        let refreshToken = req.cookies ? req.cookies.refreshToken : null;
        if (!refreshToken && req.body.refreshToken) {
            refreshToken = req.body.refreshToken;
        }

        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh token missing. Please log in.' });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
        );

        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'User invalid or deactivated.' });
        }

        sendTokenResponse(user, 200, res);
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired refresh token. Log in again.' });
    }
};

// ─────────────────────────────────────────────
// @desc    Logout user and clear JWT cookies
// @route   POST /api/auth/logout
// @access  Private
// ─────────────────────────────────────────────
const logout = async (req, res, next) => {
    try {
        res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
        res.cookie('refreshToken', '', { httpOnly: true, expires: new Date(0) });
        res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get currently authenticated user profile
// @route   GET /api/auth/me
// @access  Private
// ─────────────────────────────────────────────
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, refresh, logout, getMe };
