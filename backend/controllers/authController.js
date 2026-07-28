const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { 
    sendPasswordResetEmail, 
    sendPasswordResetConfirmationEmail,
    sendAdminPasswordResetEmail,
    sendAccountCreatedEmail
} = require('../services/emailService');

// Helper: Generate JWT and set as HTTP-Only cookie
const sendTokenResponse = (user, statusCode, res) => {
    const token = jwt.sign(
        { id: user._id, lastLogin: user.lastLoginTimestamp ? user.lastLoginTimestamp.getTime() : null }, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRE || '120m' }
    );

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
                isActive: user.isActive,
                socialProvider: user.socialProvider
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
            assignedRole: assignedRole || 'Student',
            lastLoginTimestamp: Date.now()
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
        let { accountEmail, securedPassword } = req.body;
        accountEmail = accountEmail?.trim().toLowerCase();

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

// ─────────────────────────────────────────────
// @desc    Social Authentication (Google, GitHub, Microsoft, Facebook)
// @route   POST /api/auth/social-login
// @access  Public
// ─────────────────────────────────────────────
const socialLogin = async (req, res, next) => {
    try {
        const { 
            provider, email, name, socialId, role,
            firstName: reqFirstName, lastName: reqLastName, username: reqUsername,
            country, city, address, educationLevel, institution, fieldOfStudy,
            learningInterests, preferredLanguage, professionalTitle, biography, skills
        } = req.body;

        if (!provider || !email) {
            return res.status(400).json({ success: false, message: 'Provider and email are required for social login.' });
        }

        const validProvider = ['google', 'github', 'microsoft', 'facebook'].includes(provider.toLowerCase())
            ? provider.toLowerCase()
            : 'google';

        // Check if user exists by email or socialId
        let user = await User.findOne({ 
            $or: [
                { accountEmail: email.toLowerCase() },
                { socialId: socialId || `sim_${validProvider}_${email}` }
            ]
        });

        if (user) {
            if (!user.isActive) {
                return res.status(401).json({ success: false, message: 'Your account is deactivated.' });
            }
            // Update social provider details if needed
            user.socialProvider = validProvider;
            user.socialId = socialId || user.socialId || `sim_${validProvider}_${email}`;
            user.lastLoginTimestamp = Date.now();
            await user.save({ validateBeforeSave: false });
        } else {
            // Create user for social login
            const tempPassword = `Soc@${crypto.randomBytes(8).toString('hex')}!`;
            const nameParts = (name || email.split('@')[0]).trim().split(' ');
            const firstName = reqFirstName || nameParts[0] || 'Social';
            const lastName = reqLastName || nameParts.slice(1).join(' ') || 'User';

            user = await User.create({
                fullName: name || `${firstName} ${lastName}`,
                firstName,
                lastName,
                username: reqUsername || `${validProvider}_${Date.now().toString().slice(-6)}`,
                accountEmail: email.toLowerCase(),
                securedPassword: tempPassword,
                assignedRole: role || 'Student',
                socialProvider: validProvider,
                socialId: socialId || `sim_${validProvider}_${email}`,
                country: country || '',
                city: city || '',
                address: address || '',
                educationLevel: educationLevel || '',
                institution: institution || '',
                fieldOfStudy: fieldOfStudy || '',
                learningInterests: learningInterests || '',
                preferredLanguage: preferredLanguage || 'English',
                professionalTitle: professionalTitle || '',
                biography: biography || '',
                skills: skills ? (Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim())) : [],
                lastLoginTimestamp: Date.now()
            });
        }

        sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Request Password Reset Token
// @route   POST /api/auth/forgot-password
// @access  Public
// ─────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
    try {
        const { accountEmail } = req.body;

        if (!accountEmail) {
            return res.status(400).json({ success: false, message: 'Please provide your email address.' });
        }

        const user = await User.findOne({ accountEmail: accountEmail.toLowerCase() });

        if (!user) {
            // Don't reveal if email exists for security
            return res.status(200).json({ 
                success: true, 
                message: 'If an account with that email exists, password reset instructions have been sent.' 
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save({ validateBeforeSave: false });

        // Send reset email
        const emailResult = await sendPasswordResetEmail(user, resetToken);

        if (!emailResult.success) {
            console.warn('⚠️ Email failed to send, but token was created in DB');
            // Still return success but log the email failure
        }

        res.status(200).json({
            success: true,
            message: 'If an account with that email exists, password reset instructions have been sent. Please check your email.'
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Reset Password using Reset Token
// @route   POST /api/auth/reset-password
// @access  Public
// ─────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }

        const trimmedToken = resetToken.trim();
        const hashedToken = crypto.createHash('sha256').update(trimmedToken).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        }).select('+resetPasswordToken +resetPasswordExpire');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired password reset token.' });
        }

        user.securedPassword = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        user.lastLoginTimestamp = Date.now();

        await user.save({ validateBeforeSave: false });

        // Send confirmation email with new password
        const emailResult = await sendPasswordResetConfirmationEmail(user, newPassword);

        if (!emailResult.success) {
            console.warn('⚠️ Confirmation email failed to send');
        }

        res.status(200).json({
            success: true,
            message: 'Password reset successfully! You are now signed in. A confirmation email has been sent.',
            data: {
                id: user._id,
                fullName: user.fullName,
                accountEmail: user.accountEmail,
                assignedRole: user.assignedRole,
                isActive: user.isActive,
                socialProvider: user.socialProvider
            },
            token: jwt.sign(
                { id: user._id, lastLogin: user.lastLoginTimestamp ? user.lastLoginTimestamp.getTime() : null },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE || '120m' }
            )
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, logout, getMe, socialLogin, forgotPassword, resetPassword };

