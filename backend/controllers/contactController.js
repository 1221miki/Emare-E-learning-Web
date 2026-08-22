const ContactMessage = require('../models/ContactMessage');
const { sendEmail, isEmailConfigured } = require('../services/emailService');

// ── Helpers ────────────────────────────────────────────────
// Strip HTML tags and collapse whitespace to sanitize user input
const sanitizeText = (value, maxLength) =>
    String(value || '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Optional, fully isolated email notifications. Never throws — a missing or
// broken email provider must never break the contact flow itself.
const notifyAdminNewMessage = async (doc) => {
    try {
        if (!isEmailConfigured() || !process.env.ADMIN_EMAIL) return;
        await sendEmail({
            to: process.env.ADMIN_EMAIL,
            subject: 'New contact message received — Emare E-Learning',
            text: `A new contact message was received.\n\nFrom: ${doc.name} (${doc.email}, ${doc.phone})\n\n${doc.message}`
        });
    } catch (err) {
        console.error('Contact admin notification failed:', err.message);
    }
};

const escapeHtml = (value) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const notifyUserOfReply = async (doc) => {
    try {
        if (!isEmailConfigured()) return;

        const safeName = escapeHtml(doc.name);
        const safeResponse = escapeHtml(doc.adminResponse);
        const safeOriginal = escapeHtml(doc.message);
        const responder = escapeHtml(doc.respondedByName || 'The Support Team');
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

        const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; padding: 20px; margin: 0; }
          .wrapper { max-width: 600px; margin: 0 auto; }
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%);
            color: #fff;
            padding: 40px 32px;
            border-radius: 16px 16px 0 0;
            text-align: center;
          }
          .header .logo { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
          .body { background: #ffffff; padding: 36px 32px; border: 1px solid #e2e8f0; }
          .body p { color: #374151; font-size: 15px; line-height: 1.7; }
          .reply-box {
            background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
            border-left: 4px solid #10b981;
            border-radius: 10px;
            padding: 20px 24px;
            margin: 24px 0;
          }
          .reply-box h3 { margin: 0 0 10px; color: #065f46; font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; }
          .original-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px 20px;
            margin: 20px 0;
          }
          .original-box h4 { margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
          .message-text { white-space: pre-wrap; word-break: break-word; color: #1e293b; font-size: 14px; line-height: 1.7; }
          .cta-btn {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #7c3aed);
            color: #ffffff !important;
            text-decoration: none;
            padding: 13px 34px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
            margin-top: 8px;
          }
          .footer {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-top: none;
            border-radius: 0 0 16px 16px;
            padding: 20px 32px;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <div class="logo">🎓 Emare ICT Hub</div>
          </div>

          <div class="body">
            <p>Hello <strong>${safeName}</strong>,</p>
            <p>Good news! An administrator has <strong>responded to your support message</strong>. Here is the response:</p>

            <div class="reply-box">
              <h3>💬 Response from ${responder}</h3>
              <div class="message-text">${safeResponse}</div>
            </div>

            <div class="original-box">
              <h4>Your original message</h4>
              <div class="message-text">${safeOriginal}</div>
            </div>

            <p>You can also view all your messages and responses anytime in your account.</p>

            <div style="text-align:center;">
              <a href="${loginUrl}" class="cta-btn">View My Messages &rarr;</a>
            </div>

            <p style="margin-top: 28px;">
              Best regards,<br>
              <strong>The Emare ICT Hub Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
            <p style="margin-top:4px;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>`;

        await sendEmail({
            to: doc.email,
            subject: '💬 The administrator has responded to your message — Emare ICT Hub',
            html: htmlTemplate,
            text: `Hello ${doc.name},\n\n${doc.respondedByName || 'An administrator'} has responded to your support message:\n\n"${String(doc.adminResponse).slice(0, 2000)}"\n\nYour original message:\n"${String(doc.message).slice(0, 1000)}"\n\nVisit My Messages on your account to view all responses.`
        });
        console.log(`✅ Contact reply notification sent to ${doc.email}`);
    } catch (err) {
        console.error('Contact reply notification failed:', err.message);
    }
};

// ── User / Public Endpoints ────────────────────────────────

// @route   POST /api/contact
// @desc    Submit a contact/support message (guests allowed; linked to the
//          authenticated user when a valid session exists)
// @access  Public (optionalProtect attaches req.user when logged in)
exports.createContactMessage = async (req, res, next) => {
    try {
        const name = sanitizeText(req.body.name, 120);
        const phone = sanitizeText(req.body.phone, 30);
        const email = String(req.body.email || '').trim().toLowerCase().slice(0, 254);
        const message = String(req.body.message || '').trim().slice(0, 5000);

        // ── Validation ─────────────────────────────────────
        const errors = [];
        if (!name) errors.push('Name is required.');
        if (!phone) errors.push('Phone number is required.');
        if (!email) errors.push('Email is required.');
        else if (!EMAIL_REGEX.test(email)) errors.push('Please provide a valid email address.');
        if (!message || message.length < 5) errors.push('Message must be at least 5 characters long.');
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors.join(' ') });
        }

        // ── Duplicate submission guard (same email + same content within 60s)
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const duplicate = await ContactMessage.findOne({
            email,
            message,
            createdAt: { $gte: oneMinuteAgo }
        }).select('_id').lean();
        if (duplicate) {
            return res.status(429).json({ success: false, message: 'Your message was just received. Please wait before sending it again.' });
        }

        // userId comes ONLY from the verified session token — never from the body
        const doc = await ContactMessage.create({
            userId: req.user?._id || null,
            name,
            phone,
            email,
            message
        });

        notifyAdminNewMessage(doc); // fire-and-forget, optional

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully. The administrator will respond to you soon.',
            data: { _id: doc._id, status: doc.status, createdAt: doc.createdAt }
        });
    } catch (err) {
        next(err);
    }
};

// @route   GET /api/contact/my-messages
// @desc    List the authenticated user's own support messages (with responses)
// @access  Authenticated users only
exports.getMyMessages = async (req, res, next) => {
    try {
        const messages = await ContactMessage.find({ userId: req.user._id })
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: messages.length, data: messages });
    } catch (err) {
        next(err);
    }
};

// ── Admin Endpoints (mounted under /api/admin/contact-messages,
//    behind protect + authorizeRoles('Admin')) ───────────────

// @route   GET /api/admin/contact-messages
// @desc    Get all contact messages, optional ?status= filter
// @access  Admin only
exports.getAllMessages = async (req, res, next) => {
    try {
        const filter = {};
        const validStatuses = ['unread', 'read', 'replied', 'closed'];
        if (req.query.status && validStatuses.includes(req.query.status)) {
            filter.status = req.query.status;
        }
        const messages = await ContactMessage.find(filter)
            .sort({ createdAt: -1 })
            .populate('userId', 'fullName accountEmail')
            .populate('respondedBy', 'fullName');
        const unreadCount = await ContactMessage.countDocuments({ status: 'unread' });
        res.status(200).json({ success: true, count: messages.length, unreadCount, data: messages });
    } catch (err) {
        next(err);
    }
};

// @route   GET /api/admin/contact-messages/unread-count
// @desc    Unread count for the admin navigation badge
// @access  Admin only
exports.getUnreadCount = async (req, res, next) => {
    try {
        const unreadCount = await ContactMessage.countDocuments({ status: 'unread' });
        res.status(200).json({ success: true, data: { unreadCount } });
    } catch (err) {
        next(err);
    }
};

// @route   GET /api/admin/contact-messages/:id
// @desc    Get one specific message
// @access  Admin only
exports.getMessageById = async (req, res, next) => {
    try {
        const message = await ContactMessage.findById(req.params.id)
            .populate('userId', 'fullName accountEmail')
            .populate('respondedBy', 'fullName');
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        res.status(200).json({ success: true, data: message });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid message ID' });
        }
        next(err);
    }
};

// @route   PUT /api/admin/contact-messages/:id/status
// @desc    Update message status (unread | read | replied | closed)
// @access  Admin only
exports.updateMessageStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['unread', 'read', 'replied', 'closed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value.' });
        }
        const message = await ContactMessage.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        res.status(200).json({ success: true, message: `Status updated to '${status}'.`, data: message });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid message ID' });
        }
        next(err);
    }
};

// @route   POST /api/admin/contact-messages/:id/reply
// @desc    Administrator responds to a message (stores responder identity,
//          timestamp, sets status to 'replied'; original message is preserved)
// @access  Admin only
exports.replyToMessage = async (req, res, next) => {
    try {
        const response = sanitizeText(req.body.response, 5000);
        if (!response || response.length < 2) {
            return res.status(400).json({ success: false, message: 'Response text is required.' });
        }

        const message = await ContactMessage.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        message.adminResponse = response;
        message.respondedBy = req.user._id;             // from verified JWT only
        message.respondedByName = req.user.fullName || 'Administrator';
        message.respondedAt = new Date();
        message.status = 'replied';
        await message.save();

        notifyUserOfReply(message); // fire-and-forget, optional

        res.status(200).json({ success: true, message: 'Response sent successfully.', data: message });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid message ID' });
        }
        next(err);
    }
};
