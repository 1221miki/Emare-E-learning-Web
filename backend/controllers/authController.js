const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper: Generate JWT and set as HTTP-Only cookie
const sendTokenResponse = (user, statusCode, res) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '120m'
    });

    const cookieOptions = {
        httpOnly: true, // Prevents XSS access via document.cookie
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax',
        maxAge: 120 * 60 * 1000 // 120 minutes in milliseconds
    };

    res.status(statusCode)
        .cookie('token', token, cookieOptions)
        .json({
            success: true,
            token,
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

        // Validate required fields
        if (!fullName || !accountEmail || !securedPassword) {
            return res.status(400).json({ success: false, message: 'Please provide full name, email, and password.' });
        }

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
            assignedRole: assignedRole || 'Student'
        });

        sendTokenResponse(user, 201, res);
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Login user and issue JWT cookie
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
    try {
        const { accountEmail, securedPassword } = req.body;

        if (!accountEmail || !securedPassword) {
            return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
        }

        // Find user and include password field (excluded by default via 'select: false')
        const user = await User.findOne({ accountEmail }).select('+securedPassword');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        if (!user.isActive) {
            return res.status(401).json({ success: false, message: 'Your account is deactivated. Please contact an administrator.' });
        }

        // Validate password using bcrypt instance method
        const isMatch = await user.comparePassword(securedPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
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
// @desc    Logout user and clear JWT cookie
// @route   POST /api/auth/logout
// @access  Private
// ─────────────────────────────────────────────
const logout = async (req, res, next) => {
    try {
        res.cookie('token', 'expired', {
            httpOnly: true,
            expires: new Date(Date.now() + 5 * 1000) // Expire in 5 seconds
        });
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

module.exports = { register, login, logout, getMe };
