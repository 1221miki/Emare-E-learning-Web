const User = require('../models/User');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const qrcode = require('qrcode');
const { 
    sendPasswordResetEmail, 
    sendPasswordResetConfirmationEmail,
    sendAdminPasswordResetEmail,
    sendAccountCreatedEmail,
    sendEmailVerification,
    sendTwoFactorCodeEmail,
    sendPhoneVerificationCode,
    sanitizeEmailError,
    isRateLimitError,
    resetEmailDailyCounter,
    getEmailCounterStatus,
    testSmtpConnection
} = require('../services/emailService');
const { audit, resolveIp } = require('../utils/auditLogger');
const {
    generateSecret,
    verifyTOTP,
    createOtpAuthUrl
} = require('../utils/totp');

// Helper: Generate a fresh 6-digit verification code, its SHA-256 hash, and a
// 15-minute expiry. Only the hash is persisted so a leaked DB never exposes
// usable codes; the plaintext code is returned to the caller for delivery.
const createEmailVerification = () => {
    const code = crypto.randomInt(100000, 1000000).toString();
    return {
        code,
        token: crypto.createHash('sha256').update(code).digest('hex'),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    };
};

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

// Helper: Short-lived JWT issued after a successful password check when the
// account has 2FA enabled. It grants NO session — it only authorizes the
// follow-up verification step, and expires after 10 minutes.
const createPendingTwoFactorToken = (user) => {
    return jwt.sign(
        { id: user._id, purpose: '2fa' },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );
};

// Helper: Generate a 6-digit SMS-style code and persist only its SHA-256 hash
// with a 10-minute expiry. Returns the delivery result — callers must only
// persist the hash AFTER the code was actually delivered to the user.
const issueTwoFactorCode = async (user, req, reason = 'authentication') => {
    const code = crypto.randomInt(100000, 1000000).toString();
    const delivery = await sendTwoFactorCodeEmail(user, code);
    if (!delivery.success) {
        return { success: false, error: delivery.error };
    }
    user.twoFactorCodeHash = crypto.createHash('sha256').update(code).digest('hex');
    user.twoFactorCodeExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    return { success: true, messageId: delivery.messageId };
};

// Helper: Verify a user-provided code against the active 2FA method.
// Returns true only for a currently-valid, unexpired code.
const isTwoFactorCodeValid = (user, code) => {
    const input = String(code || '').replace(/\s+/g, '');
    if (!input) return false;
    if (user.twoFactorMethod === 'authenticator') {
        return user.twoFactorSecret ? verifyTOTP(user.twoFactorSecret, input) : false;
    }
    if (user.twoFactorMethod === 'sms') {
        if (!user.twoFactorCodeHash || !user.twoFactorCodeExpire) return false;
        if (user.twoFactorCodeExpire.getTime() < Date.now()) return false;
        const hashedCode = crypto.createHash('sha256').update(input).digest('hex');
        return hashedCode === user.twoFactorCodeHash;
    }
    return false;
};

// ─────────────────────────────────────────────
// @desc    Register a new user account
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────
const register = async (req, res, next) => {
    try {
        const { fullName, accountEmail, email, securedPassword, password, assignedRole, username, phoneNumber, contactPhone } = req.body;
        const normalizedEmail = (accountEmail || email || '').trim().toLowerCase();
        const normalizedPhone = (phoneNumber || contactPhone || '').toString().replace(/[-\s]/g, '').trim();
        const newPassword = securedPassword || password;

        // ── 1. Required-field validation → 400 ─────────────────────────────
        if (!fullName || !normalizedEmail || !newPassword) {
            const missing = !fullName ? 'fullName' : !normalizedEmail ? 'accountEmail' : 'securedPassword';
            return res.status(400).json({
                success: false,
                message: missing === 'fullName'
                    ? 'Please provide full name, email, and password.'
                    : `Please provide ${missing}.`,
                field: missing
            });
        }

        if (normalizedPhone && !/^(09|07)\d{8}$/.test(normalizedPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Phone number must start with 09 or 07 and contain exactly 10 digits.',
                field: 'phoneNumber'
            });
        }

        // ── 2. Duplicate email → 409 ──────────────────────────────────────
        const existingUser = await User.findOne({ accountEmail: normalizedEmail }).select('_id');
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.', field: 'accountEmail' });
        }

        // ── 3. Duplicate username (case-insensitive) → 409 ────────────────
        if (username) {
            const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const existingUsername = await User.findOne({ username: { $regex: new RegExp(`^${escaped}$`, 'i') } }).select('_id');
            if (existingUsername) {
                return res.status(409).json({ success: false, message: 'Username already taken.', field: 'username' });
            }
        }

        const {
            code: verificationCode,
            token: hashedVerificationCode,
            expiresAt: verificationExpire
        } = createEmailVerification();

        // ── 4. Create user (password is hashed in the pre-save hook) ───────
        //     Explicitly catch duplicate-key races (two concurrent signups with
        //     the same email) so they return 409 instead of a 500 crash.
        let user;
        try {
            user = await User.create({
                fullName,
                accountEmail: normalizedEmail,
                securedPassword: newPassword,
                assignedRole: assignedRole || 'Student',
                username: username || undefined,
                contactPhone: normalizedPhone || undefined,
                isEmailVerified: false,
                emailVerificationToken: hashedVerificationCode,
                emailVerificationExpire: verificationExpire
            });
        } catch (createErr) {
            if (createErr.code === 11000) {
                const dupField = (createErr.keyValue && Object.keys(createErr.keyValue)[0]) || 'accountEmail';
                const isUsername = dupField === 'username';
                return res.status(409).json({
                    success: false,
                    message: isUsername ? 'Username already taken.' : 'An account with this email already exists.',
                    field: isUsername ? 'username' : 'accountEmail'
                });
            }
            throw createErr; // rethrown → central errorHandler logs it and returns a safe 500
        }

        // ── 5. Audit (fire-and-forget, never throws) ───────────────────────
        audit.security({ req, user, action: 'REGISTER', severity: 'info',
            description: `New ${user.assignedRole} account registered: ${user.fullName} (${user.accountEmail}).`,
            targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });

        // ── 6. Build success payload ──────────────────────────────────────
        // Email OTP is the required registration verification path; the code is
        // delivered only through the user's email inbox and never returned in the API response.
        const responsePayload = {
            success: true,
            message: 'Registration successful. Verification code sent to your email.'
        };

        // ── 7. Registration notification — available to the app / notification feed ──
        try {
            await Notification.create({
                recipientRef: user._id,
                type: 'system',
                title: 'Welcome to Emare',
                message: 'Your student account was created successfully. Please verify your email to activate your profile.',
                link: '/verify-email',
                metadata: { source: 'registration', phoneNumber: normalizedPhone || '' }
            });
        } catch (notificationErr) {
            console.error(`⚠️ Failed to create registration notification for ${user.accountEmail}:`, notificationErr?.message || notificationErr);
        }

        // ── 8. Verification email — required registration verification path ──
        const emailResult = await sendEmailVerification(user, verificationCode);
        if (!emailResult.success) {
            console.error(`❌ Failed to send verification email to ${user.accountEmail}: ${emailResult.error}`);
            await Notification.deleteMany({ recipientRef: user._id }).catch(() => {});
            await User.findByIdAndDelete(user._id).catch(() => {});
            return res.status(502).json({
                success: false,
                message: 'Unable to send verification email. Please try again.',
                field: 'accountEmail'
            });
        }
        console.log(`✅ Verification email sent to ${user.accountEmail}`);

        res.status(201).json(responsePayload);
    } catch (err) {
        // Every DB / hash / save / unexpected error lands here and is
        // formatted + logged by the central errorHandler (never a raw 500).
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

        // Find user and include password + 2FA code fields (excluded by default via 'select: false')
        const user = await User.findOne({ accountEmail: normalizedEmail })
            .select('+securedPassword +twoFactorCodeHash +twoFactorCodeExpire');

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

        // Two-Factor Authentication step: password matched, but the account has
        // 2FA enabled. Do NOT issue the session cookie yet — hand back a short-lived
        // pending token so the client can complete the second factor at
        // POST /api/auth/2fa/verify-login. lastLoginTimestamp stays untouched until
        // the full login succeeds so old sessions remain valid.
        if (user.twoFactorEnabled && user.twoFactorMethod) {
            audit.security({ req, user, action: 'LOGIN_2FA_REQUIRED', severity: 'info',
                description: `User (${user.accountEmail}) entered correct password; awaiting 2FA verification (method: ${user.twoFactorMethod}).`,
                targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });

            // Auto-send the 2FA code via email for the "sms" method so the user
            // doesn't have to click "Resend code" before entering anything.
            // Fire-and-forget: delivery failure is logged but does not block login.
            if (user.twoFactorMethod === 'sms') {
                issueTwoFactorCode(user, req, '2fa-login')
                    .catch(err => console.error(`❌ Auto-send 2FA code failed for ${user.accountEmail}:`, err.message));
            }

            return res.status(200).json({
                success: true,
                twoFactorRequired: true,
                twoFactorMethod: user.twoFactorMethod,
                pendingToken: createPendingTwoFactorToken(user),
                message: 'Two-factor authentication is required to complete sign in.'
            });
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
                skills: skills ? (Array.isArray(skills) ? skills.join(', ') : skills) : '',
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
            return res.status(404).json({ success: false, message: 'No account found with that email address.' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ success: false, message: 'This email is already verified. You can proceed to sign in.' });
        }

        const { code: verificationCode, token, expiresAt } = createEmailVerification();

        let emailResult;
        try {
            emailResult = await sendEmailVerification(user, verificationCode);
        } catch (emailErr) {
            console.error(`❌ Resend verification email threw for ${user.accountEmail}:`, emailErr);
            emailResult = { success: false, error: emailErr.message || 'Unknown email delivery error.' };
        }

        if (!emailResult.success) {
            const errorText = emailResult.error || 'Unknown delivery error.';
            const friendlyMessage = sanitizeEmailError(errorText);
            const rateLimited = isRateLimitError(errorText);

            return res.status(rateLimited ? 429 : 502).json({
                success: false,
                message: friendlyMessage,
                rateLimited,
                retryAfterSeconds: rateLimited ? 60 : 30
            });
        }

        user.emailVerificationToken = token;
        user.emailVerificationExpire = expiresAt;
        await user.save({ validateBeforeSave: false });

        console.log(`✅ Resend verification code sent successfully to ${user.accountEmail}`);
        return res.status(200).json({
            success: true,
            message: 'A new verification code was sent to your email. It expires in 15 minutes.'
        });
    } catch (err) {
        console.error('❌ Error in resendVerificationCode controller:', err);
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

        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, message: 'Invalid verification code.' });
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

// ─────────────────────────────────────────────
// @desc    Reset in-process email daily counter (dev/admin only)
// @route   POST /api/auth/reset-email-counter
// @access  Private (Admin) — blocked in production unless
//          ALLOW_EMAIL_COUNTER_RESET=true is explicitly set
// ─────────────────────────────────────────────
const resetEmailCounter = (req, res) => {
    // Safety guard: refuse in production unless the operator explicitly opts in.
    const isProduction = process.env.NODE_ENV === 'production';
    const optedIn = process.env.ALLOW_EMAIL_COUNTER_RESET === 'true';
    if (isProduction && !optedIn) {
        return res.status(403).json({
            success: false,
            message: 'Email counter reset is disabled in production. Set ALLOW_EMAIL_COUNTER_RESET=true to enable it.'
        });
    }

    const before = getEmailCounterStatus();
    resetEmailDailyCounter();
    const after = getEmailCounterStatus();

    console.log(`🔄 Email daily counter reset by ${req.user ? req.user.accountEmail : 'system'}.`);
    return res.status(200).json({
        success: true,
        message: 'Email daily counter has been reset to 0. You can now send verification emails again.',
        before,
        after
    });
};

// ─────────────────────────────────────────────
// @desc    Get current 2FA status
// @route   GET /api/auth/2fa/status
// @access  Private
// ─────────────────────────────────────────────
const getTwoFactorStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('twoFactorEnabled twoFactorMethod');
        // Legacy accounts may carry twoFactorEnabled=true from the old single-toggle
        // UI without a configured method — treat those as disabled (they are not
        // actually enforced at login).
        const enabled = !!(user && user.twoFactorEnabled && user.twoFactorMethod);
        res.status(200).json({
            success: true,
            data: {
                twoFactorEnabled: enabled,
                twoFactorMethod: enabled ? user.twoFactorMethod : ''
            }
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Begin 2FA setup (authenticator QR / sms code)
// @route   POST /api/auth/2fa/setup
// @access  Private
// ─────────────────────────────────────────────
const setupTwoFactor = async (req, res, next) => {
    try {
        const { method, currentPassword } = req.body;

        if (!['authenticator', 'sms'].includes(method)) {
            return res.status(400).json({ success: false, message: 'Invalid 2FA method. Choose "authenticator" or "sms".', field: 'method' });
        }
        if (!currentPassword) {
            return res.status(400).json({ success: false, message: 'Your current password is required to enable two-factor authentication.', field: 'currentPassword' });
        }

        const user = await User.findById(req.user.id).select('+securedPassword +twoFactorTempSecret +twoFactorCodeHash +twoFactorCodeExpire');
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            audit.security({ req, user, action: 'TWO_FACTOR_SETUP_FAILED', severity: 'warning',
                description: `2FA setup attempt failed for (${user.accountEmail}) — wrong current password.`,
                targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });
            return res.status(400).json({ success: false, message: 'Current password is incorrect.', field: 'currentPassword' });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: 'Two-factor authentication is already enabled on this account.' });
        }

        if (method === 'authenticator') {
            // Generate a fresh TOTP secret, provisioning URI and QR data URL.
            // Only the temp secret is stored — it is promoted to the real secret
            // in verifyTwoFactorSetup once the user proves they scanned it.
            const secret = generateSecret();
            const issuer = process.env.TWO_FA_ISSUER || 'Emare ELMS';
            const otpauthUrl = createOtpAuthUrl(secret, user.accountEmail, issuer);
            const qrDataUrl = await qrcode.toDataURL(otpauthUrl);

            user.twoFactorTempSecret = secret;
            await user.save({ validateBeforeSave: false });

            return res.status(200).json({
                success: true,
                data: {
                    method: 'authenticator',
                    secret,
                    otpauthUrl,
                    qrDataUrl,
                    codeSent: false
                }
            });
        }

        // Method: sms — deliver a code; only persist its hash after successful delivery.
        const delivery = await issueTwoFactorCode(user, req, '2fa-setup');
        if (!delivery.success) {
            const friendlyMessage = sanitizeEmailError(delivery.error);
            const rateLimited = isRateLimitError(delivery.error);
            return res.status(rateLimited ? 429 : 502).json({
                success: false,
                message: friendlyMessage,
                rateLimited,
                retryAfterSeconds: rateLimited ? 60 : 30
            });
        }

        return res.status(200).json({
            success: true,
            data: { method: 'sms', codeSent: true, expiresInMinutes: 10 }
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Confirm 2FA setup with one-time code, enabling 2FA
// @route   POST /api/auth/2fa/verify-setup
// @access  Private
// ─────────────────────────────────────────────
const verifyTwoFactorSetup = async (req, res, next) => {
    try {
        const { method, code, currentPassword } = req.body;

        if (!['authenticator', 'sms'].includes(method)) {
            return res.status(400).json({ success: false, message: 'Invalid 2FA method.', field: 'method' });
        }
        const inputCode = String(code || '').replace(/\s+/g, '');
        if (!inputCode) {
            return res.status(400).json({ success: false, message: 'Please enter the verification code.', field: 'code' });
        }
        if (!currentPassword) {
            return res.status(400).json({ success: false, message: 'Your current password is required to enable two-factor authentication.', field: 'currentPassword' });
        }

        const user = await User.findById(req.user.id).select('+securedPassword +twoFactorTempSecret +twoFactorCodeHash +twoFactorCodeExpire');
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.', field: 'currentPassword' });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: 'Two-factor authentication is already enabled on this account.' });
        }

        if (method === 'authenticator') {
            if (!user.twoFactorTempSecret) {
                return res.status(400).json({ success: false, message: '2FA setup was not started. Please begin setup again.' });
            }
            if (!verifyTOTP(user.twoFactorTempSecret, inputCode)) {
                return res.status(400).json({ success: false, message: 'The verification code is invalid or has expired.' });
            }
            user.twoFactorSecret = user.twoFactorTempSecret;
            user.twoFactorTempSecret = undefined;
            user.twoFactorMethod = 'authenticator';
            user.twoFactorEnabled = true;
        } else {
            if (!user.twoFactorCodeHash || !user.twoFactorCodeExpire) {
                return res.status(400).json({ success: false, message: 'No verification code was sent. Please request a new one.' });
            }
            if (user.twoFactorCodeExpire.getTime() < Date.now()) {
                return res.status(400).json({ success: false, message: 'The verification code has expired. Please request a new one.' });
            }
            const hashedCode = crypto.createHash('sha256').update(inputCode).digest('hex');
            if (hashedCode !== user.twoFactorCodeHash) {
                return res.status(400).json({ success: false, message: 'The verification code is invalid or has expired.' });
            }
            user.twoFactorCodeHash = undefined;
            user.twoFactorCodeExpire = undefined;
            user.twoFactorMethod = 'sms';
            user.twoFactorEnabled = true;
        }

        await user.save({ validateBeforeSave: false });

        audit.security({ req, user, action: 'TWO_FACTOR_ENABLED', severity: 'warning',
            description: `Two-factor authentication enabled for (${user.accountEmail}) via ${method}.`,
            targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });

        res.status(200).json({
            success: true,
            message: 'Two-factor authentication has been enabled.',
            data: { twoFactorEnabled: true, twoFactorMethod: method }
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Send a fresh management code to the logged-in user (SMS method)
// @route   POST /api/auth/2fa/send-management-code
// @access  Private
// ─────────────────────────────────────────────
const sendManagementCode = async (req, res, next) => {
    try {
        const { currentPassword } = req.body;
        if (!currentPassword) {
            return res.status(400).json({ success: false, message: 'Your current password is required.', field: 'currentPassword' });
        }

        const user = await User.findById(req.user.id).select('+securedPassword +twoFactorCodeHash +twoFactorCodeExpire');
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }
        if (!user.twoFactorEnabled || user.twoFactorMethod !== 'sms') {
            return res.status(400).json({ success: false, message: 'SMS two-factor authentication is not enabled on this account.' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.', field: 'currentPassword' });
        }

        const delivery = await issueTwoFactorCode(user, req, '2fa-management');
        if (!delivery.success) {
            const friendlyMessage = sanitizeEmailError(delivery.error);
            const rateLimited = isRateLimitError(delivery.error);
            return res.status(rateLimited ? 429 : 502).json({
                success: false,
                message: friendlyMessage,
                rateLimited,
                retryAfterSeconds: rateLimited ? 60 : 30
            });
        }

        res.status(200).json({
            success: true,
            message: 'A new verification code has been sent to your email.',
            data: { codeSent: true, expiresInMinutes: 10 }
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Disable 2FA (requires password + current code)
// @route   POST /api/auth/2fa/disable
// @access  Private
// ─────────────────────────────────────────────
const disableTwoFactor = async (req, res, next) => {
    try {
        const { currentPassword, code } = req.body;
        if (!currentPassword) {
            return res.status(400).json({ success: false, message: 'Your current password is required to disable two-factor authentication.', field: 'currentPassword' });
        }

        const user = await User.findById(req.user.id).select('+securedPassword +twoFactorSecret +twoFactorCodeHash +twoFactorCodeExpire +twoFactorMethod');
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }
        if (!user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: 'Two-factor authentication is not enabled on this account.' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            audit.security({ req, user, action: 'TWO_FACTOR_DISABLE_FAILED', severity: 'warning',
                description: `2FA disable attempt failed for (${user.accountEmail}) — wrong current password.`,
                targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });
            return res.status(400).json({ success: false, message: 'Current password is incorrect.', field: 'currentPassword' });
        }

        // A configured method requires a valid current code. Legacy accounts with
        // only the old boolean toggle (no method) may be cleaned up with password.
        if (user.twoFactorMethod) {
            if (!code) {
                return res.status(400).json({ success: false, message: 'Please enter your current verification code.', field: 'code' });
            }
            if (!isTwoFactorCodeValid(user, code)) {
                audit.security({ req, user, action: 'TWO_FACTOR_DISABLE_FAILED', severity: 'warning',
                    description: `2FA disable attempt failed for (${user.accountEmail}) — invalid/expired verification code.`,
                    targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });
                return res.status(400).json({ success: false, message: 'The verification code is invalid or has expired.' });
            }
        }

        user.twoFactorEnabled = false;
        user.twoFactorMethod = '';
        user.twoFactorSecret = undefined;
        user.twoFactorTempSecret = undefined;
        user.twoFactorCodeHash = undefined;
        user.twoFactorCodeExpire = undefined;
        await user.save({ validateBeforeSave: false });

        audit.security({ req, user, action: 'TWO_FACTOR_DISABLED', severity: 'warning',
            description: `Two-factor authentication disabled by the user for (${user.accountEmail}).`,
            targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });

        res.status(200).json({
            success: true,
            message: 'Two-factor authentication has been disabled.',
            data: { twoFactorEnabled: false, twoFactorMethod: '' }
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Complete 2FA login step and issue the session cookie
// @route   POST /api/auth/2fa/verify-login
// @access  Public (requires valid pendingToken + code)
// ─────────────────────────────────────────────
const verifyTwoFactorLogin = async (req, res, next) => {
    try {
        const { pendingToken, code } = req.body;
        const inputCode = String(code || '').replace(/\s+/g, '');

        if (!pendingToken || !inputCode) {
            return res.status(400).json({ success: false, message: 'Verification token and code are required.' });
        }

        // Verify the pending token (10-minute validity, purpose-locked).
        let decoded;
        try {
            decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Your verification session has expired. Please sign in again.' });
        }
        if (!decoded || decoded.purpose !== '2fa' || !decoded.id) {
            return res.status(401).json({ success: false, message: 'Invalid verification token. Please sign in again.' });
        }

        const user = await User.findById(decoded.id).select('+securedPassword +twoFactorSecret +twoFactorCodeHash +twoFactorCodeExpire +twoFactorMethod +twoFactorEnabled');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid verification token. Please sign in again.' });
        }
        if (!user.twoFactorEnabled || !user.twoFactorMethod) {
            return res.status(400).json({ success: false, message: 'Two-factor authentication is not enabled on this account.' });
        }

        if (!isTwoFactorCodeValid(user, inputCode)) {
            audit.security({ req, user, action: 'LOGIN_FAILED_2FA', severity: 'warning',
                description: `2FA login failed for (${user.accountEmail}) — invalid/expired code from IP ${resolveIp(req)}.`,
                targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });
            return res.status(401).json({ success: false, message: 'The verification code is incorrect or has expired. Please try again.' });
        }

        // One-time-use: consume the SMS code on success so it cannot be reused.
        if (user.twoFactorMethod === 'sms') {
            user.twoFactorCodeHash = undefined;
            user.twoFactorCodeExpire = undefined;
        }
        user.lastLoginTimestamp = Date.now();
        await user.save({ validateBeforeSave: false });

        audit.security({ req, user, action: 'LOGIN_SUCCESS', severity: 'info',
            description: `${user.assignedRole} user (${user.accountEmail}) logged in successfully after 2FA from IP ${resolveIp(req)}.`,
            targetType: 'User', targetId: user._id, targetLabel: user.accountEmail });

        sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Resend the SMS login code during the 2FA login step
// @route   POST /api/auth/2fa/resend-login-code
// @access  Public (requires valid pendingToken)
// ─────────────────────────────────────────────
const resendTwoFactorLoginCode = async (req, res, next) => {
    try {
        const { pendingToken } = req.body;
        if (!pendingToken) {
            return res.status(400).json({ success: false, message: 'Verification token is required.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Your verification session has expired. Please sign in again.' });
        }
        if (!decoded || decoded.purpose !== '2fa' || !decoded.id) {
            return res.status(401).json({ success: false, message: 'Invalid verification token. Please sign in again.' });
        }

        const user = await User.findById(decoded.id).select('+twoFactorCodeHash +twoFactorCodeExpire +twoFactorMethod +twoFactorEnabled');
        if (!user || !user.twoFactorEnabled || user.twoFactorMethod !== 'sms') {
            return res.status(400).json({ success: false, message: 'SMS two-factor authentication is not enabled on this account.' });
        }

        const delivery = await issueTwoFactorCode(user, req, '2fa-login-resend');
        if (!delivery.success) {
            const friendlyMessage = sanitizeEmailError(delivery.error);
            const rateLimited = isRateLimitError(delivery.error);
            return res.status(rateLimited ? 429 : 502).json({
                success: false,
                message: friendlyMessage,
                rateLimited,
                retryAfterSeconds: rateLimited ? 60 : 30
            });
        }

        res.status(200).json({
            success: true,
            message: 'A new verification code has been sent to your email.',
            data: { codeSent: true, expiresInMinutes: 10 }
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Test email / SMTP connectivity (admin diagnostic)
// @route   POST /api/auth/test-email
// @access  Private (Admin)
// ─────────────────────────────────────────────
const testEmail = async (req, res, next) => {
    try {
        const result = await testSmtpConnection();
        if (result.success) {
            return res.status(200).json({ success: true, message: 'SMTP connection verified. Emails should work.', data: result });
        }
        return res.status(502).json({ success: false, message: result.hint || result.errorMessage || 'SMTP connection failed.', data: result });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, logout, getMe, socialLogin, forgotPassword, resetPassword, verifyEmail, resendVerificationCode, resetEmailCounter, getTwoFactorStatus, setupTwoFactor, verifyTwoFactorSetup, sendManagementCode, disableTwoFactor, verifyTwoFactorLogin, resendTwoFactorLoginCode, testEmail };

