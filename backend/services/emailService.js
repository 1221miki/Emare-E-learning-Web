const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const normalizePhoneNumber = (phone) => {
    if (!phone) return '';

    const digits = String(phone).replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('+')) return digits.startsWith('+251') ? digits : `+${digits.replace(/^\+/, '')}`;
    if (digits.startsWith('251') && digits.length === 12) return `+${digits}`;
    if (digits.startsWith('0') && digits.length === 10) return `+251${digits.slice(1)}`;
    if (digits.startsWith('9') && digits.length === 9) return `+251${digits}`;

    return `+${digits}`;
};

const getSmsProviderConfig = () => {
    const provider = (process.env.SMS_PROVIDER || process.env.SMS_GATEWAY || '').toLowerCase();
    return {
        provider,
        twilioAccountSid: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
        twilioAuthToken: (process.env.TWILIO_AUTH_TOKEN || '').trim(),
        twilioPhoneNumber: (process.env.TWILIO_PHONE_NUMBER || '').trim(),
        textbeltApiKey: (process.env.TEXTBELT_API_KEY || '').trim(),
        smsFrom: (process.env.SMS_FROM || process.env.TWILIO_PHONE_NUMBER || '').trim()
    };
};

const sendPhoneVerificationCode = async (user, verificationCode) => {
    const phone = normalizePhoneNumber(user?.contactPhone || user?.phoneNumber || user?.phone || '');
    if (!phone) {
        return { success: false, skipped: true, provider: 'none', message: 'No phone number is stored for this account.' };
    }

    const { provider, twilioAccountSid, twilioAuthToken, twilioPhoneNumber, textbeltApiKey } = getSmsProviderConfig();

    if (provider === 'twilio' || (twilioAccountSid && twilioAuthToken && twilioPhoneNumber)) {
        try {
            const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
            const params = new URLSearchParams({
                To: phone,
                From: twilioPhoneNumber,
                Body: `Your Emare verification code is ${verificationCode}. It expires in 15 minutes.`
            });

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            const responseText = await response.text();
            if (!response.ok) {
                throw new Error(responseText || 'Twilio SMS delivery failed.');
            }

            return { success: true, provider: 'twilio', message: `Verification SMS sent to ${phone}.` };
        } catch (error) {
            console.error('❌ Twilio SMS verification delivery failed:', error.message || error);
            return { success: false, provider: 'twilio', message: error.message || 'Twilio SMS failed to send.' };
        }
    }

    if (provider === 'textbelt' || textbeltApiKey) {
        try {
            const response = await fetch('https://api.textbelt.com/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phone.replace(/^\+/, ''),
                    message: `Your Emare verification code is ${verificationCode}. It expires in 15 minutes.`,
                    key: textbeltApiKey
                })
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload?.success === false) {
                throw new Error(payload?.message || 'Textbelt SMS delivery failed.');
            }

            return { success: true, provider: 'textbelt', message: `Verification SMS sent to ${phone}.` };
        } catch (error) {
            console.error('❌ Textbelt SMS verification delivery failed:', error.message || error);
            return { success: false, provider: 'textbelt', message: error.message || 'Textbelt SMS failed to send.' };
        }
    }

    return {
        success: false,
        skipped: true,
        provider: 'none',
        message: 'No SMS provider is configured. The verification code remains available through email and the app notification feed.'
    };
};

/**
 * Email Service - Handles all transactional emails
 *
 * Provider selection via EMAIL_SERVICE (tried in order, all HTTPS-based and
 * free of Gmail's 500/day quota):
 *   resend    — production transactional API (recommended). Uses EMAIL_API_KEY
 *               (legacy alias: RESEND_API_KEY). HTTPS — no SMTP daily quotas.
 *   sendgrid  — SendGrid v3 REST API (free tier: 100 emails/day, no SMTP). Uses
 *               SENDGRID_API_KEY + SENDGRID_FROM. No SDK required (HTTP fetch).
 *   smtp      — Nodemailer SMTP (e.g. Gmail) for local development. Limited to
 *               EMAIL_DAILY_LIMIT (default 450) to stay safely under Gmail's
 *               500/day cap, with a minimum 1s gap between sends.
 *   aws-ses / mailgun — selected but unsupported SDK present: warns and falls
 *               back to SMTP so delivery never silently drops.
 */

const emailService = (process.env.EMAIL_SERVICE || 'smtp').toLowerCase().trim();

// ── Provider 1: Resend (production) ────────────────────────────────────────
const resendApiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || '';
const resendConfigured = emailService === 'resend' && !!resendApiKey;
const resend = resendConfigured ? new Resend(resendApiKey) : null;
const resendFrom = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'Emare <onboarding@resend.dev>';

// ── Provider 2: SendGrid v3 REST API (no SDK required) ─────────────────────
const sendgridConfigured = emailService === 'sendgrid' && !!process.env.SENDGRID_API_KEY;
const sendgridFrom = process.env.SENDGRID_FROM || process.env.EMAIL_FROM || process.env.SMTP_FROM || 'Emare <noreply@example.com>';

// ── Provider 3: Brevo HTTP API (no domain verification required) ───────────
// Works on hosting platforms where outbound SMTP ports are blocked (Render etc.)
// because it uses plain HTTPS. Free tier: 300 emails/day, delivers to ANY
// recipient after verifying just the sender address (a normal inbox click).
const brevoApiKey = process.env.BREVO_API_KEY || '';
const brevoConfigured = emailService === 'brevo' && !!brevoApiKey;
// BREVO_FROM must be the email you verified inside Brevo (Senders & IP page).
const brevoFromRaw = process.env.BREVO_FROM || process.env.EMAIL_FROM || process.env.SMTP_FROM || '';
const brevoFromMatch = String(brevoFromRaw).match(/^(.*?)\s*<\s*([^>]+)\s*>$/) || [null, '', String(brevoFromRaw).trim()];
const brevoFromName = (brevoFromMatch[1] || 'Emare ELMS').trim().replace(/^["']|["']$/g, '') || 'Emare ELMS';
const brevoFromEmail = brevoFromMatch[2].trim();

// Unsupported SDKs requested — surface a warning so the operator switches to
// resend/sendgrid/smtp or installs the required SDK.
const unsupportedProvider = ['aws-ses', 'mailgun'].includes(emailService);
if (unsupportedProvider) {
    console.warn(`📧 EMAIL_SERVICE=${emailService} requires an SDK that is not installed. Falling back to SMTP.`);
}

// ── Provider 2: SMTP via Nodemailer (dev / fallback) ───────────────────────
// Reads EMAIL_* vars with SMTP_* aliases so conventional production configs
// (SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM) work out of the box.
// Trim whitespace from all values — trailing newlines or spaces in .env files
// cause Gmail 535 authentication failures that are hard to diagnose.
const smtpHost = (
    process.env.EMAIL_HOST ||
    process.env.SMTP_HOST ||
    (emailService === 'gmail' ? 'smtp.gmail.com' : '')
).trim();
const smtpUser = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
const rawSmtpPass = (process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS || '').trim();
const smtpPass = emailService === 'gmail' ? rawSmtpPass.replace(/\s+/g, '') : rawSmtpPass;
const smtpFrom = (process.env.EMAIL_FROM || process.env.SMTP_FROM || smtpUser).trim();
const smtpFromAddress = (String(smtpFrom).match(/<\s*([^>]+)\s*>/)?.[1] || smtpUser).trim();
const smtpPort = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587;
const smtpSecure = smtpPort === 465;
const smtpConfigured = !!(smtpHost && smtpUser && smtpPass && smtpFromAddress);
const smtpTransport = smtpConfigured
    ? nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          requireTLS: !smtpSecure,
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: 15000,
          socketTimeout: 20000,
          connectionOptions: { family: 4 }
      })
    : null;

const emailConfigured = resendConfigured || sendgridConfigured || brevoConfigured || smtpConfigured;

const replyTo = process.env.EMAIL_REPLY_TO || process.env.SMTP_FROM || process.env.EMAIL_FROM || smtpUser || '';

let smtpVerificationPromise = null;
const logSmtpError = (context, error) => {
    const code = error?.code || 'N/A';
    console.error(`[Email SMTP] ${context} failed`, {
        code,
        message: error?.message || String(error),
        host: smtpHost,
        port: smtpPort
    });
    if (code === 'EAUTH') {
        console.error('[Email SMTP] Check EMAIL_USER and EMAIL_PASSWORD/EMAIL_PASS in .env.');
    }
};
const verifySmtpTransport = (force = false) => {
    if (!smtpTransport) {
        return Promise.reject(Object.assign(new Error('SMTP transport is not configured.'), { code: 'ESMTP' }));
    }
    if (force) smtpVerificationPromise = null;
    if (!smtpVerificationPromise) {
        smtpVerificationPromise = smtpTransport.verify().catch((error) => {
            smtpVerificationPromise = null;
            throw error;
        });
    }
    return smtpVerificationPromise;
};

if (smtpTransport) {
    smtpTransport.on('error', (error) => logSmtpError('transport event', error));
}

// ── Rate limiting ──────────────────────────────────────────────────────────
// Guards the daily quota (critical for Gmail's 500/day free cap) and spaces
// sends out so bursts never trip provider throttling.
// Resend has no meaningful daily cap on paid plans and 3 000/month on free —
// the in-process counter is still incremented for observability, but the limit
// is set high enough (Infinity when EMAIL_SERVICE=resend) that it never blocks.
let emailDailyCount = 0;
let emailDailyDate = new Date().toDateString();
let lastSendTimestamp = 0;

const getDailyLimit = (provider) => {
    // Explicit override wins so operators can tune per provider.
    const override = Number(process.env.EMAIL_DAILY_LIMIT);
    if (override) return override;
    // Resend free tier: 3 000/month → no enforced daily cap in code.
    // SendGrid free tier: 100/day.
    // Brevo free tier: 300/day.
    // SMTP/Gmail: stay safely under the 500/day hard limit.
    if (provider === 'resend') return Infinity;
    if (provider === 'sendgrid') return 100;
    if (provider === 'brevo') return 300;
    return 450; // safe margin under Gmail's 500/day
};

const enforceRateLimit = async (provider) => {
    const today = new Date().toDateString();
    if (emailDailyDate !== today) {
        emailDailyDate = today;
        emailDailyCount = 0;
    }
    const limit = getDailyLimit(provider);
    if (emailDailyCount >= limit) {
        throw new Error(`EMAIL_DAILY_LIMIT:${limit}`);
    }
    const wait = lastSendTimestamp ? Math.max(0, 1000 - (Date.now() - lastSendTimestamp)) : 0;
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    emailDailyCount += 1;
    lastSendTimestamp = Date.now();
};

/**
 * Reset the in-process daily email counter.
 * Useful in development when the server has NOT been restarted but the
 * in-memory counter needs to be cleared (e.g. after hitting EMAIL_DAILY_LIMIT
 * during testing). This has no effect on the upstream provider's own quota —
 * if Gmail has blocked the account for the day, switch to Resend instead.
 */
const resetEmailDailyCounter = () => {
    emailDailyCount = 0;
    emailDailyDate = new Date().toDateString();
    lastSendTimestamp = 0;
    console.log('📧 Email daily counter reset. emailDailyCount = 0');
};

/**
 * Return the current counter state (for diagnostics / admin endpoint).
 */
const getEmailCounterStatus = () => ({
    provider: emailService,
    emailDailyCount,
    emailDailyDate,
    limit: getDailyLimit(emailService),
    resendConfigured,
    sendgridConfigured,
    brevoConfigured,
    smtpConfigured,
    emailConfigured
});

// ── Error sanitization ─────────────────────────────────────────────────────
// Maps raw SMTP/API traces to friendly, user-safe messages. Never leaks
// credentials, hostnames or provider internals to the UI.
const sanitizeEmailError = (raw) => {
    const msg = String((raw && raw.message) || raw || '').toLowerCase();
    if (!msg) return 'Verification email failed to send due to an email server issue. Please try again later or contact support.';
    if (msg.includes('daily user sending limit') || msg.includes('daily limit') || msg.includes('quota') || msg.includes('rate limit')) {
        return 'Email server daily sending limit reached. Please try again later or contact support.';
    }
    if (msg.includes('535') || msg.includes('authentication') || msg.includes('auth failed') || msg.includes('invalid credentials')) {
        return 'Email server authentication failed. Please check the configured sender credentials and contact support.';
    }
    if (msg.includes('421') || msg.includes('temporarily unavailable')) {
        return 'Email server is temporarily unavailable. Please try again later.';
    }
    if (msg.includes('550') && (msg.includes('mailbox') || msg.includes('recipient') || msg.includes('address'))) {
        return 'The recipient email address could not be reached.';
    }
    return 'Verification email failed to send due to an email server issue. Please try again later or contact support.';
};

/**
 * Detect provider rate-limit / daily-quota errors so callers can set an extended
 * retry cooldown instead of hammering a provider that has shut the tap.
 */
const isRateLimitError = (raw) => {
    const msg = String((raw && raw.message) || raw || '').toLowerCase();
    if (!msg) return false;
    return /daily user sending limit|daily limit|quota|rate limit|too many|429|5\.4\.5/.test(msg);
};

/**
 * Anti-spam / deliverability headers. OTP emails with missing or ambiguous
 * headers are more likely to land in Spam/Junk. These headers give Gmail,
 * Outlook and other filters the signals they look for:
 *   - X-Entity-Ref-ID: unique per-message id (recognized by Gmail).
 *   - List-Unsubscribe + List-Unsubscribe-Post: one-click unsubscribe (signals
 *     a legitimate transactional sender, not a spam campaign).
 *   - Precedence / X-Auto-Response-Suppress: suppress vacation/auto replies.
 */
const buildAntiSpamHeaders = () => ({
    'X-Mailer': 'Emare ELMS',
    'X-Entity-Ref-ID': crypto.randomBytes(16).toString('hex'),
    'Precedence': 'Bulk',
    'X-Auto-Response-Suppress': 'OOF, AutoReply, RN, NDR, NRN',
    'List-Unsubscribe': `<mailto:${smtpFromAddress || process.env.EMAIL_USER || ''}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
});

/**
 * Send an email via the active transport.
 * Delivery strategy (ordered, with fallback + retry):
 *   1. Resend API (if configured) — HTTPS, no SMTP quotas.
 *   2. SMTP (Nodemailer) — retried once after a short delay for transient errors.
 * If every provider fails, the combined error is thrown so controllers can
 * surface a sanitized, user-friendly reason instead of a silent drop.
 * @param {{ to: string|string[], subject: string, html: string, text?: string }} options
 * @returns {Promise<{ id: string }>} message id
 */
const sendEmail = async ({ to, subject, html, text }) => {
    const recipients = Array.isArray(to) ? to : [to];

    if (!emailConfigured) {
        console.error('[Email] No email provider is configured. Email was not sent.');
        throw new Error('No email provider is configured.');
    }

    const failures = [];

    // ── Provider 1: Resend ───────────────────────────────────────────────
    if (resendConfigured) {
        try {
            await enforceRateLimit('resend');
            // The Resend SDK returns { data, error } and does NOT throw on API errors.
            const { data, error } = await resend.emails.send({
                from: resendFrom,
                to: recipients,
                subject,
                html,
                ...(text ? { text } : {}),
                ...(replyTo ? { reply_to: [replyTo] } : {}),
                headers: buildAntiSpamHeaders()
            });

            if (error) throw new Error(error.message || 'Failed to send email via Resend');
            return data;
        } catch (error) {
            if (error.message && error.message.startsWith('EMAIL_DAILY_LIMIT')) {
                failures.push('Resend: daily sending limit reached');
            } else {
                failures.push(`Resend: ${error.message}`);
            }
            console.error('Resend Email API Error:', error.message || error);
        }
    }

    // ── Provider 2: SendGrid v3 REST API (no SDK required) ───────────────
    if (sendgridConfigured) {
        try {
            await enforceRateLimit('sendgrid');
            const sgPayload = {
                personalizations: [{
                    to: recipients.map((r) => ({ email: r })),
                    ...(replyTo ? { reply_to: { email: replyTo } } : {})
                }],
                from: { email: sendgridFrom },
                subject,
                content: [
                    { type: 'text/plain', value: text || '' },
                    { type: 'text/html', value: html }
                ],
                headers: buildAntiSpamHeaders()
            };
            const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sgPayload)
            });
            if (!sgRes.ok) {
                const body = await sgRes.text().catch(() => '');
                throw new Error(`SendGrid API ${sgRes.status}: ${body.slice(0, 300)}`);
            }
            return { id: `sendgrid_${Date.now()}` };
        } catch (error) {
            if (error.message && error.message.startsWith('EMAIL_DAILY_LIMIT')) {
                failures.push('SendGrid: daily sending limit reached');
            } else {
                failures.push(`SendGrid: ${error.message}`);
            }
            console.error('SendGrid Email API Error:', error.message || error);
        }
    }

    // ── Provider 3: Brevo HTTP API (HTTPS — no SMTP port restrictions) ───
    if (brevoConfigured) {
        try {
            await enforceRateLimit('brevo');
            const bvRes = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': brevoApiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: brevoFromName, email: brevoFromEmail },
                    to: recipients.map((r) => ({ email: r })),
                    subject,
                    htmlContent: html,
                    ...(text ? { textContent: text } : {}),
                    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
                    headers: buildAntiSpamHeaders()
                })
            });
            if (!bvRes.ok) {
                const body = await bvRes.text().catch(() => '');
                throw new Error(`Brevo API ${bvRes.status}: ${body.slice(0, 300)}`);
            }
            const bvData = await bvRes.json().catch(() => ({}));
            return { id: bvData.messageId || `brevo_${Date.now()}` };
        } catch (error) {
            if (error.message && error.message.startsWith('EMAIL_DAILY_LIMIT')) {
                failures.push('Brevo: daily sending limit reached');
            } else {
                failures.push(`Brevo: ${error.message}`);
            }
            console.error('Brevo Email API Error:', error.message || error);
        }
    }

    // ── Provider 4: SMTP (retried once) ──────────────────────────────────
    if (smtpConfigured) {
        const attempts = 2;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                await enforceRateLimit('smtp');
                await verifySmtpTransport();
                const info = await smtpTransport.sendMail({
                    from: smtpFrom,
                    to: recipients,
                    subject,
                    html,
                    ...(text ? { text } : {}),
                    // multipart/alternative (HTML + plain text) plus anti-spam
                    // headers maximize inbox (not Spam/Junk) placement.
                    ...(replyTo ? { replyTo } : {}),
                    text,
                    headers: buildAntiSpamHeaders(),
                    envelope: { from: smtpFromAddress, to: recipients }
                });
                return { id: info.messageId };
            } catch (error) {
                smtpVerificationPromise = null;
                const isDailyLimit = error.message && error.message.startsWith('EMAIL_DAILY_LIMIT');
                failures.push(isDailyLimit
                    ? 'SMTP: daily sending limit reached'
                    : `SMTP (attempt ${attempt}): ${error.message}`);
                logSmtpError(`send attempt ${attempt}/${attempts}`, error);
                if (!isDailyLimit && attempt < attempts) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
        }
    }

    throw new Error(failures.length ? failures.join(' | ') : 'No email provider is configured.');
};

const logEmailTransportStatus = () => {
    if (resendConfigured) {
        console.log('📧 Email service configured: Resend API (production).');
    } else if (sendgridConfigured) {
        console.log(`📧 Email service configured: SendGrid v3 API — rate-limited to ${getDailyLimit('sendgrid')} emails/day.`);
    } else if (brevoConfigured) {
        console.log(`📧 Email service configured: Brevo HTTP API (from: ${brevoFromEmail}) — rate-limited to ${getDailyLimit('brevo')} emails/day.`);
    } else if (smtpConfigured) {
        const providerName = emailService === 'gmail' ? 'Gmail SMTP' : 'SMTP';
        console.log(`📧 Email service configured: ${providerName} (${smtpHost}:${smtpPort}) — rate-limited to ${getDailyLimit('smtp')} emails/day.`);
        if (process.env.NODE_ENV === 'production') {
            console.warn('⚠️  SMTP is configured in production. SMTP relays (e.g. Gmail) enforce daily quotas and are not recommended — set EMAIL_SERVICE=resend + EMAIL_API_KEY or EMAIL_SERVICE=sendgrid + SENDGRID_API_KEY for reliable production delivery.');
        }
    } else {
        console.warn('📧 Email service is not configured. Set EMAIL_SERVICE=gmail, EMAIL_USER, and EMAIL_PASSWORD (or EMAIL_PASS).');
    }
};

// Non-blocking startup log
setTimeout(logEmailTransportStatus, 100);

// Non-blocking SMTP connection validation — logs a warning if credentials are
// wrong so operators see it immediately in the console instead of discovering it
// when the first email fails. Does NOT block server startup.
if (smtpConfigured) {
    setTimeout(() => {
        console.log(`📧 SMTP: verifying connection to ${smtpHost}:${smtpPort}...`);
        verifySmtpTransport()
            .then(() => console.log('✅ SMTP connection verified successfully.'))
            .catch((error) => logSmtpError('startup verification', error));
    }, 200); // small delay so the server starts listening first
}

/**
 * Diagnostic: test the SMTP connection and return detailed result.
 * Used by the /api/auth/test-email endpoint so admins can verify credentials
 * from the browser without checking server logs.
 */
const testSmtpConnection = async () => {
    if (!smtpConfigured) {
        return { success: false, provider: 'none', message: 'No SMTP provider configured. Set EMAIL_SERVICE=gmail, EMAIL_USER, and EMAIL_PASSWORD (or EMAIL_PASS) in .env.' };
    }
    try {
        await verifySmtpTransport(true);
        return { success: true, provider: emailService === 'gmail' ? 'gmail' : 'smtp', host: smtpHost, port: smtpPort };
    } catch (err) {
        logSmtpError('manual verification', err);
        const detail = {
            success: false,
            provider: emailService === 'gmail' ? 'gmail' : 'smtp',
            host: smtpHost,
            port: smtpPort,
            errorCode: err.code || null,
            errorMessage: err.message || 'Unknown error'
        };
        if (err.code === 'EAUTH') {
            detail.hint = 'SMTP authentication failed. Check EMAIL_USER and EMAIL_PASSWORD/EMAIL_PASS in .env.';
        } else if (err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
            detail.hint = 'Cannot reach the SMTP server. Check EMAIL_HOST/EMAIL_PORT, or ensure outbound port 587 is not blocked.';
        }
        return detail;
    }
};

/**
 * Send Password Reset Email with Reset Link
 * User receives a secure link to reset their password
 */
const sendPasswordResetEmail = async (user, resetToken) => {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${user.accountEmail}`;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; color: #6366f1; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .button { 
            display: inline-block; 
            background: #6366f1; 
            color: white; 
            padding: 12px 30px; 
            border-radius: 4px; 
            text-decoration: none; 
            margin: 20px 0; 
          }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Emare ELMS</div>
            <p style="color: #666; margin: 10px 0;">E-Learning Management System</p>
          </div>

          <div class="content">
            <p>Hi ${user.fullName || user.accountEmail},</p>

            <p>We received a request to reset the password for your Emare ELMS account. If you didn't make this request, you can safely ignore this email.</p>

            <p>To reset your password, click the button below:</p>

            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Your Password</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f9f9f9; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
              ${resetLink}
            </p>

            <div class="warning">
              <strong>⏰ This link expires in 15 minutes.</strong> If it expires, you can request a new password reset.
            </div>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Emare ELMS Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
            <p>Do not reply to this email. This is an automated message.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const data = await sendEmail({
            to: user.accountEmail,
            subject: '🔐 Reset Your Emare ELMS Password',
            html: htmlTemplate,
            text: `Hi ${user.fullName || user.accountEmail},\n\nReset your password using this link:\n${resetLink}\n\nThis link expires in 15 minutes.\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ Password reset email sent to ${user.accountEmail} (Message ID: ${data.id})`);
        return { success: true, messageId: data.id };
    } catch (error) {
        console.error(`❌ Failed to send password reset email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Password Reset Confirmation Email
 * User receives confirmation that their password was successfully changed
 */
const sendPasswordResetConfirmationEmail = async (user, newPassword) => {
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; color: #6366f1; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; color: #155724; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .password-display { 
            background: #f9f9f9; 
            padding: 15px; 
            border-radius: 4px; 
            border: 1px solid #ddd;
            font-family: monospace;
            word-break: break-all;
            margin: 15px 0;
          }
          .security-tip { background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Emare ELMS</div>
            <p style="color: #666; margin: 10px 0;">E-Learning Management System</p>
          </div>

          <div class="content">
            <p>Hi ${user.fullName || user.accountEmail},</p>

            <div class="success-box">
              <strong>✅ Your password has been successfully reset!</strong>
            </div>

            <p>Your new temporary password is:</p>

            <div class="password-display">
              <strong>${newPassword}</strong>
            </div>

            <p style="color: #d32f2f;">
              <strong>⚠️ Important:</strong> Please change this password to something memorable after your first login.
            </p>

            <div class="security-tip">
              <strong>🔒 Security Tip:</strong> Never share your password with anyone. Emare ELMS staff will never ask for your password via email or chat.
            </div>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Emare ELMS Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
            <p>If you did not request this password reset, please contact support immediately.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const data = await sendEmail({
            to: user.accountEmail,
            subject: '✅ Your Emare ELMS Password Has Been Reset',
            html: htmlTemplate,
            text: `Hi ${user.fullName || user.accountEmail},\n\nYour password has been successfully reset.\n\nYour new temporary password is: ${newPassword}\n\nPlease change this password to something memorable after your first login.\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ Password confirmation email sent to ${user.accountEmail} (Message ID: ${data.id})`);
        return { success: true, messageId: data.id };
    } catch (error) {
        console.error(`❌ Failed to send password confirmation email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

const sendEmailVerification = async (user, verificationCode) => {
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; color: #6366f1; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .code-box { background: #f9fafb; border: 1px solid #d1d5db; padding: 20px; border-radius: 8px; text-align: center; font-size: 24px; letter-spacing: 4px; font-weight: 700; }
          .button { 
            display: inline-block; 
            background: #6366f1; 
            color: white; 
            padding: 12px 30px; 
            border-radius: 4px; 
            text-decoration: none; 
            margin: 20px 0; 
          }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .preheader { display: none; max-height: 0; overflow: hidden; mso-hide: all; }
        </style>
      </head>
      <body>
        <div class="preheader">Your Emare ELMS verification code is ${verificationCode}. It expires in 15 minutes.</div>
        <div class="container">
          <div class="header">
            <div class="logo">Emare ELMS</div>
            <p style="color: #666; margin: 10px 0;">E-Learning Management System</p>
          </div>

          <div class="content">
            <p>Hi ${user.fullName || user.accountEmail},</p>
            <p>Welcome to Emare ELMS! Please verify your email address by entering the code below.</p>

            <div class="code-box">${verificationCode}</div>

            <p>Enter this code on the verification page to activate your account.</p>
            <div class="warning">
              <strong>⏰ This code expires in 15 minutes.</strong>
            </div>

            <p>If you did not create an account with this email, please ignore this message.</p>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Emare ELMS Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
            <p>Do not reply to this email. This is an automated message.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const data = await sendEmail({
            to: user.accountEmail,
            subject: '🔒 Verify your Emare ELMS email address',
            html: htmlTemplate,
            text: `Hi ${user.fullName || user.accountEmail},\n\nYour verification code is: ${verificationCode}\n\nThis code expires in 15 minutes.\n\nBest regards,\nThe Emare ELMS Team`
        });

        // The provider may resolve with no message id (dev mode, or a thin API
        // response) — treat any resolved send as delivered; guard the read so a
        // missing id can never turn this into an uncaught TypeError.
        console.log(`✅ Email verification sent to ${user.accountEmail} (Message ID: ${data && data.id || 'n/a'})`);
        return { success: true, messageId: data && data.id || null };
    } catch (error) {
        console.error(`❌ Failed to send verification email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message || 'Unknown email delivery error.' };
    }
};

/**
 * Send Two-Factor Authentication (2FA) Verification Code
 * Used when the account has 2FA enabled with the "sms" method, so a one-time
 * 6-digit code is delivered to the account email (falls back gracefully to the
 * account email when no phone is stored). The code is never echoed back in the
 * API response — only its SHA-256 hash + expiry are persisted.
 */
const sendTwoFactorCodeEmail = async (user, code) => {
    const phoneNumber = normalizePhoneNumber(user?.contactPhone || user?.phoneNumber || user?.phone || '');
    const smsConfig = getSmsProviderConfig();

    if (phoneNumber && (smsConfig.provider === 'twilio' || smsConfig.provider === 'textbelt' || smsConfig.twilioAccountSid || smsConfig.textbeltApiKey)) {
        const smsResult = await sendPhoneVerificationCode(user, code);
        if (smsResult.success) {
            return { success: true, messageId: `sms_${phoneNumber}` };
        }
        return { success: false, error: smsResult.message || 'SMS delivery failed.' };
    }

    const expiryStr = '10 minutes';
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; color: #6366f1; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .code-box { background: #f9fafb; border: 1px solid #d1d5db; padding: 20px; border-radius: 8px; text-align: center; font-size: 28px; letter-spacing: 6px; font-weight: 700; color: #1f2937; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .preheader { display: none; max-height: 0; overflow: hidden; mso-hide: all; }
        </style>
      </head>
      <body>
        <div class="preheader">Your Emare ELMS two-factor authentication code is ${code}. It expires in ${expiryStr}.</div>
        <div class="container">
          <div class="header">
            <div class="logo">Emare ELMS</div>
            <p style="color: #666; margin: 10px 0;">E-Learning Management System</p>
          </div>

          <div class="content">
            <p>Hi ${user.fullName || user.accountEmail},</p>
            <p>Enter the code below to finish signing in to your Emare ELMS account:</p>

            <div class="code-box">${code}</div>

            <div class="warning">
              <strong>⏰ This code expires in ${expiryStr}.</strong> Do not share it with anyone.
            </div>

            <p>If you did not attempt to sign in, your password may be compromised — please change it immediately.</p>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Emare ELMS Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
            <p>Do not reply to this email. This is an automated message.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const data = await sendEmail({
            to: user.accountEmail,
            subject: '🔐 Your Emare ELMS Two-Factor Authentication Code',
            html: htmlTemplate,
            text: `Hi ${user.fullName || user.accountEmail},\n\nYour two-factor authentication code is: ${code}\n\nThis code expires in ${expiryStr}. Enter it on the sign-in page to continue.\n\nIf you did not attempt to sign in, please change your password immediately.\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ 2FA code email sent to ${user.accountEmail} (Message ID: ${data && data.id || 'n/a'})`);
        return { success: true, messageId: data && data.id || null };
    } catch (error) {
        console.error(`❌ Failed to send 2FA code email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message || 'Unknown email delivery error.' };
    }
};

/**
 * Send Admin-Initiated Password Reset Email
 * Admin sends reset link to user from admin dashboard
 */
const sendAdminPasswordResetEmail = async (user, resetToken) => {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${user.accountEmail}`;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; color: #6366f1; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .button { 
            display: inline-block; 
            background: #6366f1; 
            color: white; 
            padding: 12px 30px; 
            border-radius: 4px; 
            text-decoration: none; 
            margin: 20px 0; 
          }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Emare ELMS</div>
            <p style="color: #666; margin: 10px 0;">E-Learning Management System</p>
          </div>

          <div class="content">
            <p>Hello ${user.fullName || user.accountEmail},</p>

            <div class="info-box">
              <strong>ℹ️ Administrator Password Reset Request</strong><br>
              An administrator has initiated a password reset for your account.
            </div>

            <p>To set a new password, click the button below:</p>

            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Set New Password</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f9f9f9; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
              ${resetLink}
            </p>

            <p style="color: #d32f2f; margin-top: 20px;">
              <strong>⏰ This link expires in 15 minutes.</strong> If it expires, contact your administrator.
            </p>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Emare ELMS Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const data = await sendEmail({
            to: user.accountEmail,
            subject: '🔐 Admin Initiated: Reset Your Emare ELMS Password',
            html: htmlTemplate,
            text: `Hello ${user.fullName || user.accountEmail},\n\nAn administrator has initiated a password reset for your account.\n\nReset your password using this link:\n${resetLink}\n\nThis link expires in 15 minutes.\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ Admin password reset email sent to ${user.accountEmail} (Message ID: ${data.id})`);
        return { success: true, messageId: data.id };
    } catch (error) {
        console.error(`❌ Failed to send admin password reset email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Welcome/Account Created Email
 * New account created by admin
 */
const sendAccountCreatedEmail = async (user, temporaryPassword) => {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; color: #6366f1; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .button { 
            display: inline-block; 
            background: #6366f1; 
            color: white; 
            padding: 12px 30px; 
            border-radius: 4px; 
            text-decoration: none; 
            margin: 20px 0; 
          }
          .credentials { background: #f9f9f9; padding: 15px; border-radius: 4px; border: 1px solid #ddd; margin: 20px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Emare ELMS</div>
            <p style="color: #666; margin: 10px 0;">E-Learning Management System</p>
          </div>

          <div class="content">
            <p>Welcome to Emare ELMS, ${user.fullName}!</p>

            <p>Your account has been successfully created by an administrator. You can now log in and start using the platform.</p>

            <h3>Your Login Credentials:</h3>
            <div class="credentials">
              <p><strong>Email:</strong> ${user.accountEmail}</p>
              <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
              <p><strong>Role:</strong> ${user.assignedRole}</p>
            </div>

            <p style="color: #d32f2f;">
              <strong>⚠️ Important:</strong> Please change your password to something memorable after your first login.
            </p>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Sign In to Emare ELMS</a>
            </div>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Emare ELMS Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const data = await sendEmail({
            to: user.accountEmail,
            subject: '👋 Welcome to Emare ELMS - Your Account is Ready',
            html: htmlTemplate,
            text: `Welcome to Emare ELMS, ${user.fullName}!\n\nYour account has been created. Your login credentials are:\n\nEmail: ${user.accountEmail}\nTemporary Password: ${temporaryPassword}\n\nPlease change your password after your first login.\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ Welcome email sent to ${user.accountEmail} (Message ID: ${data.id})`);
        return { success: true, messageId: data.id };
    } catch (error) {
        console.error(`❌ Failed to send welcome email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Course Enrollment Confirmation Email
 */
const sendCourseEnrollmentEmail = async (user, course, txRef) => {
    const amount = typeof course.price !== 'undefined' ? `${course.price} ETB` : 'N/A';
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
    const courseUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/learn/${course._id}`;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #64748b; }
          .receipt { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Enrollment Confirmed! 🎉</h1>
        </div>
        <div class="content">
          <p>Hi ${user.fullName},</p>
          <p>Great news! Your payment was successful and you are now enrolled in <strong>${course.courseTitle || course.title}</strong>.</p>
          
          <div class="receipt">
            <h3 style="margin-top:0">Receipt Summary</h3>
            <p><strong>Course:</strong> ${course.courseTitle || course.title}</p>
            <p><strong>Amount Paid:</strong> ${amount}</p>
            <p><strong>Transaction Ref:</strong> ${txRef}</p>
            <p><strong>Status:</strong> Completed</p>
          </div>

          <p>You can start learning right away. Dive into the course materials, watch the lectures, and take quizzes at your own pace.</p>
          
          <div style="text-align: center;">
            <a href="${courseUrl}" class="button">Start Learning Now</a>
          </div>
          
          <p style="margin-top: 30px;">
            Happy learning!<br>
            <strong>The Emare ELMS Team</strong>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
        </div>
      </body>
    </html>
    `;

    try {
        const data = await sendEmail({
            to: user.accountEmail,
            subject: `🎉 Enrollment Confirmed: ${course.courseTitle || course.title}`,
            html: htmlTemplate,
            text: `Hi ${user.fullName},\n\nYour payment for ${course.courseTitle || course.title} was successful (Ref: ${txRef}).\nYou can start learning now: ${courseUrl}\n\nBest regards,\nThe Emare ELMS Team`
        });

        console.log(`✅ Enrollment email sent to ${user.accountEmail} (Message ID: ${data.id})`);
        return { success: true, messageId: data.id };
    } catch (error) {
        console.error(`❌ Failed to send enrollment email to ${user.accountEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Discount Coupon Email
 * Sent after a successful homepage newsletter subscription.
 * The coupon code is delivered only via this email — never exposed in the API response.
 */
const sendDiscountEmail = async (toEmail, couponCode, expiresAt) => {
    const expiryStr = expiresAt
        ? new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '30 days from now';
    const coursesUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/courses`;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; padding: 20px; }
          .wrapper { max-width: 600px; margin: 0 auto; }
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%);
            color: #fff;
            padding: 40px 32px;
            border-radius: 16px 16px 0 0;
            text-align: center;
          }
          .header .logo { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
          .header .tagline { font-size: 13px; opacity: 0.85; margin-top: 6px; }
          .body { background: #ffffff; padding: 36px 32px; border: 1px solid #e2e8f0; }
          .body p { color: #374151; font-size: 15px; line-height: 1.7; margin-bottom: 16px; }
          .coupon-box {
            background: linear-gradient(135deg, #eff6ff, #f5f3ff);
            border: 2px dashed #6366f1;
            border-radius: 12px;
            padding: 28px 24px;
            text-align: center;
            margin: 28px 0;
          }
          .coupon-label { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
          .coupon-code {
            font-size: 32px;
            font-weight: 900;
            color: #4f46e5;
            letter-spacing: 0.12em;
            background: #fff;
            border: 2px solid #c7d2fe;
            border-radius: 8px;
            padding: 10px 24px;
            display: inline-block;
            margin: 8px 0 12px;
          }
          .coupon-detail { font-size: 13px; color: #6b7280; margin-top: 4px; }
          .coupon-detail strong { color: #4f46e5; }
          .expiry-note {
            background: #fff7ed;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
            padding: 12px 16px;
            font-size: 13px;
            color: #92400e;
            margin: 20px 0;
          }
          .cta-btn {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #7c3aed);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 36px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
            margin-top: 8px;
          }
          .how-to { background: #f8fafc; border-radius: 10px; padding: 20px 24px; margin: 24px 0; }
          .how-to h4 { color: #1e293b; font-size: 14px; font-weight: 700; margin-bottom: 12px; }
          .how-to ol { padding-left: 18px; color: #475569; font-size: 13px; line-height: 2; }
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
            <div class="tagline">E-Learning Management System &mdash; Ethiopia&apos;s Premier Tech Learning Platform</div>
          </div>

          <div class="body">
            <p>Hello,</p>
            <p>
              Thank you for subscribing to <strong>Emare ICT Hub</strong>! 🎉<br>
              As a welcome gift, here is your exclusive <strong>10% discount coupon</strong> valid on any course.
            </p>

            <div class="coupon-box">
              <div class="coupon-label">Your Exclusive Coupon Code</div>
              <div class="coupon-code">${couponCode}</div>
              <div class="coupon-detail">
                <strong>10% OFF</strong> any course &nbsp;&bull;&nbsp; Max discount: 500 ETB
              </div>
              <div class="coupon-detail" style="margin-top:6px;">One-time use on a single course &nbsp;&bull;&nbsp; Valid until <strong>${expiryStr}</strong></div>
            </div>

            <div class="expiry-note">
              ⏰ <strong>Important:</strong> This coupon expires on <strong>${expiryStr}</strong>.
              Apply it at checkout before it expires!
            </div>

            <div class="how-to">
              <h4>📋 How to use your coupon:</h4>
              <ol>
                <li>Browse our course catalog and pick the course you want</li>
                <li>Proceed to checkout for that course</li>
                <li>Enter the coupon code <strong>${couponCode}</strong> in the discount field</li>
                <li>Your 10% discount is applied to that single course only</li>
              </ol>
              <p style="font-size:12px; color:#6b7280; margin-top:8px;">
                The discount applies to <strong>one course</strong> per checkout and
                cannot be combined with other offers or reused after checkout.
              </p>
            </div>

            <div style="text-align:center; margin-top: 28px;">
              <a href="${coursesUrl}" class="cta-btn">Browse Courses Now &rarr;</a>
            </div>

            <p style="margin-top: 32px; font-size: 13px; color: #6b7280;">
              If you did not subscribe on our website, please ignore this email.
              This coupon is personal and linked to your email address.
            </p>
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
            <p style="margin-top:4px;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
    `;

    try {
        const data = await sendEmail({
            to: toEmail,
            subject: '🎉 Your Exclusive 10% Discount Coupon — Emare ICT Hub',
            html: htmlTemplate,
            text: [
                `Hello,`,
                ``,
                `Thank you for subscribing to Emare ICT Hub!`,
                `Here is your exclusive 10% discount coupon: ${couponCode}`,
                ``,
                `Details:`,
                `  - 10% OFF any course (max 500 ETB)`,
                `  - One-time use on a single course`,
                `  - Valid until: ${expiryStr}`,
                ``,
                `How to use:`,
                `  1. Go to ${coursesUrl}`,
                `  2. Choose a course and proceed to checkout`,
                `  3. Enter the code ${couponCode} in the discount field`,
                `  4. The discount is applied to that single course only`,
                ``,
                `Best regards,`,
                `The Emare ICT Hub Team`
            ].join('\n')
        });

        console.log(`✅ Discount coupon email sent to ${toEmail} (Message ID: ${data.id})`);
        return { success: true, messageId: data.id };
    } catch (error) {
        console.error(`❌ Failed to send discount email to ${toEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    normalizePhoneNumber,
    sendPhoneVerificationCode,
    sendEmail,
    sendPasswordResetEmail,
    sendPasswordResetConfirmationEmail,
    sendAdminPasswordResetEmail,
    sendAccountCreatedEmail,
    sendEmailVerification,
    sendCourseEnrollmentEmail,
    sendDiscountEmail,
    sendTwoFactorCodeEmail,
    isEmailConfigured: () => emailConfigured,
    sanitizeEmailError,
    isRateLimitError,
    resetEmailDailyCounter,
    getEmailCounterStatus,
    testSmtpConnection
};
