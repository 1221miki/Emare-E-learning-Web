const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { 
    sendPasswordResetEmail, 
    sendPasswordResetConfirmationEmail,
    sendAdminPasswordResetEmail,
    sendAccountCreatedEmail,
    sendEmailVerification,
    isEmailConfigured
} = require('../services/emailService');
const { audit, resolveIp } = require('../utils/auditLogger');

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
        // Allow cross-site cookies in production when frontend and backend are on different origins.
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'lax',
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
                username: user.username || '',
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
        const { fullName, accountEmail, email, securedPassword, password, assignedRole, username } = req.body;
        const normalizedEmail = (accountEmail || email || '').trim().toLowerCase();
        const newPassword = securedPassword || password;

        // Validate required fields
        if (!fullName || !normalizedEmail || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide full name, email, and password.' });
        }

        // Check for existing user
        const existingUser = await User.findOne({ accountEmail: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedVerificationCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
        const verificationExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

        // Create new user - password is hashed via pre-save hook in User model
        const user = await User.create({
            fullName,
            accountEmail: normalizedEmail,
            securedPassword: newPassword,
            assignedRole: assignedRole || 'Student',
            username: username || undefined,
            isEmailVerified: false,
            emailVerificationToken: hashedVerificationCode,
            emailVerificationExpire: verificationExpire
        });

        // Audit: new account registered
        audit.security({ req, user, action: 'REGISTER', severity: 'info',
            description: `New ${user.assignedRole} account registered: ${user.fullName} (${user.accountEmail}).`,
            targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });

        // Send response immediately without waiting for email (fire-and-forget)
        const responsePayload = {
            success: true,
            message: 'Registration successful. Please verify your email with the OTP sent to your inbox.'
        };
        if (!isEmailConfigured() && process.env.NODE_ENV !== 'production') {
            responsePayload.verificationCode = verificationCode;
            responsePayload.warning = 'SMTP is not configured. Use the code returned here to verify your account.';
        }

        res.status(201).json(responsePayload);

        // Send verification email in background (non-blocking)
        sendEmailVerification(user, verificationCode).then(emailResult => {
            if (emailResult.success) {
                console.log(`✅ Verification email sent to ${user.accountEmail}`);
            } else {
                console.error(`❌ Failed to send verification email to ${user.accountEmail}: ${emailResult.error}`);
            }
        }).catch(error => {
            console.error(`❌ Verification email error for ${user.accountEmail}:`, error.message);
        });
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
        let { accountEmail, email, securedPassword, password } = req.body;
        const normalizedEmail = (accountEmail || email || '').trim().toLowerCase();
        const loginPassword = securedPassword || password;

        if (!normalizedEmail || !loginPassword) {
            return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
        }

        // Find user and include password field (excluded by default via 'select: false')
        const user = await User.findOne({ accountEmail: normalizedEmail }).select('+securedPassword');

        if (!user) {
            // Audit: login attempt for non-existent account
            audit.security({ req, action: 'LOGIN_FAILED', severity: 'warning',
                description: `Failed login attempt for unknown account (${normalizedEmail}) from IP ${resolveIp(req)}.`,
                ipAddress: resolveIp(req) });
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        if (!user.isActive) {
            // Audit: login attempt on deactivated account
            audit.security({ req, user, action: 'LOGIN_BLOCKED', severity: 'warning',
                description: `Login blocked for deactivated account (${normalizedEmail}) from IP ${resolveIp(req)}.`,
                targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });
            return res.status(401).json({ success: false, message: 'Your account is deactivated. Please contact an administrator.' });
        }

        if (user.isEmailVerified === false) {
            return res.status(401).json({ success: false, message: 'Please verify your email before logging in.' });
        }

        // Validate password using bcrypt instance method
        const isMatch = await user.comparePassword(loginPassword);
        if (!isMatch) {
            // Audit: wrong password
            audit.security({ req, user, action: 'LOGIN_FAILED', severity: 'warning',
                description: `Failed login attempt for user account (${normalizedEmail}) from IP ${resolveIp(req)}.`,
                targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Optional: restrict login to Admins only when enabled via env var
        if (process.env.ALLOW_ONLY_ADMIN_LOGIN === 'true' && user.assignedRole !== 'Admin') {
            audit.security({ req, user, action: 'LOGIN_BLOCKED_NON_ADMIN', severity: 'warning',
                description: `Login blocked for non-admin account (${normalizedEmail}) because ALLOW_ONLY_ADMIN_LOGIN is enabled.`,
                targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });
            return res.status(403).json({ success: false, message: 'Login disabled for non-admin users.' });
        }

        // Update last login timestamp
        user.lastLoginTimestamp = Date.now();
        await user.save({ validateBeforeSave: false });

        // Audit: successful login
        audit.security({ req, user, action: 'LOGIN_SUCCESS', severity: 'info',
            description: `${user.assignedRole} user (${user.accountEmail}) logged in successfully from IP ${resolveIp(req)}.`,
            targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });

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
        // Audit: logout
        if (req.user) {
            audit.security({ req, user: req.user, action: 'LOGOUT', severity: 'info',
                description: `${req.user.assignedRole} user (${req.user.accountEmail}) logged out.`,
                targetType: 'User', targetId: req.user._id, targetLabel: req.user.accountEmail });
        }
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
        console.log('Social login body:', req.body);

        const { 
            provider, email, accountEmail, name, socialId, role,
            idToken, credential, accessToken,
            firstName: reqFirstName, lastName: reqLastName, username: reqUsername,
            country, city, address, educationLevel, institution, fieldOfStudy,
            learningInterests, preferredLanguage, professionalTitle, biography, skills
        } = req.body;

        const normalizedEmail = (accountEmail || email || '').trim().toLowerCase();
        const oauthToken = idToken || credential || accessToken;

        if (!provider) {
            return res.status(400).json({ success: false, message: 'Invalid or missing OAuth provider.' });
        }

        if (!normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: oauthToken
                    ? 'Could not extract an email address from the OAuth token payload. Please re-authenticate with the provider.'
                    : 'Invalid or missing OAuth token — no email was provided. Please re-authenticate with the provider.'
            });
        }

        const validProvider = ['google', 'github', 'microsoft', 'facebook'].includes(provider.toLowerCase())
            ? provider.toLowerCase()
            : null;

        if (!validProvider) {
            return res.status(400).json({ success: false, message: `Unsupported social provider: ${provider}. Supported providers: google, github, microsoft, facebook.` });
        }

        // Always find by email first (most reliable — email is unique)
        let user = await User.findOne({ accountEmail: normalizedEmail });

        // If not found by email, try by socialId as fallback
        if (!user && socialId) {
            user = await User.findOne({ socialId });
        }

        if (user) {
            if (!user.isActive) {
                return res.status(401).json({ success: false, message: 'Your account is deactivated.' });
            }
            // Update social provider details if needed
            user.socialProvider = validProvider;
            user.socialId = socialId || user.socialId || `sim_${validProvider}_${normalizedEmail}`;
            user.lastLoginTimestamp = Date.now();
            await user.save({ validateBeforeSave: false });
        } else {
            // Create user for social login
            const tempPassword = `Soc@${crypto.randomBytes(8).toString('hex')}!`;
            const nameParts = (name || normalizedEmail.split('@')[0]).trim().split(' ');
            const firstName = reqFirstName || nameParts[0] || 'Social';
            const lastName = reqLastName || nameParts.slice(1).join(' ') || 'User';

            user = await User.create({
                fullName: name || `${firstName} ${lastName}`,
                firstName,
                lastName,
                username: reqUsername || `${validProvider}_${Date.now().toString().slice(-6)}`,
                accountEmail: normalizedEmail,
                securedPassword: tempPassword,
                assignedRole: role || 'Student',
                socialProvider: validProvider,
                socialId: socialId || `sim_${validProvider}_${normalizedEmail}`,
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
const resendVerificationCode = async (req, res, next) => {
    try {
        const { accountEmail } = req.body;
        const normalizedEmail = (accountEmail || '').trim().toLowerCase();

        if (!normalizedEmail) {
            return res.status(400).json({ success: false, message: 'Email is required to resend verification code.' });
        }

        const user = await User.findOne({ accountEmail: normalizedEmail });
        if (!user) {
            return res.status(400).json({ success: false, message: 'No account found with that email.' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ success: false, message: 'Email is already verified.' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedVerificationCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
        const verificationExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

        user.emailVerificationToken = hashedVerificationCode;
        user.emailVerificationExpire = verificationExpire;
        await user.save({ validateBeforeSave: false });

        // Send response immediately (non-blocking)
        const responsePayload = {
            success: true,
            message: 'A new verification code was sent. It expires in 15 minutes.'
        };
        if (!isEmailConfigured() && process.env.NODE_ENV !== 'production') {
            responsePayload.verificationCode = verificationCode;
            responsePayload.warning = 'SMTP is not configured. Use the code returned here to verify your account.';
        }

        res.status(200).json(responsePayload);

        // Send verification email in background (non-blocking)
        sendEmailVerification(user, verificationCode).then(emailResult => {
            if (emailResult.success) {
                console.log(`✅ Resend verification email sent to ${user.accountEmail}`);
            } else {
                console.error(`❌ Failed to resend verification email to ${user.accountEmail}: ${emailResult.error}`);
            }
        }).catch(error => {
            console.error(`❌ Resend verification email error for ${user.accountEmail}:`, error.message);
        });
    } catch (err) {
        next(err);
    }
};

const verifyEmail = async (req, res, next) => {
    try {
        const { accountEmail, verificationCode } = req.body;
        const normalizedEmail = (accountEmail || '').trim().toLowerCase();
        const code = (verificationCode || '').trim();

        if (!normalizedEmail || !code) {
            return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
        }

        const user = await User.findOne({ accountEmail: normalizedEmail })
            .select('+emailVerificationToken +emailVerificationExpire +isEmailVerified');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid verification details.' });
        }

        if (user.isEmailVerified === true) {
            return res.status(400).json({ success: false, message: 'Email is already verified. Please log in.' });
        }

        if (!user.emailVerificationToken || !user.emailVerificationExpire || user.emailVerificationExpire.getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'Verification code is expired. Please request a new one.' });
        }

        const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
        if (hashedCode !== user.emailVerificationToken) {
            return res.status(400).json({ success: false, message: 'Invalid verification code.' });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({ success: true, message: 'Email verified successfully. You may now log in.' });
    } catch (err) {
        next(err);
    }
};

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

        // Audit: password reset completed
        audit.security({ req, user, action: 'PASSWORD_RESET', severity: 'warning',
            description: `Password reset completed for account (${user.accountEmail}) from IP ${resolveIp(req)}.`,
            targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });

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

module.exports = { register, login, logout, getMe, socialLogin, forgotPassword, resetPassword, verifyEmail, resendVerificationCode };

