const axios = require('axios');
const crypto = require('crypto');

const Transaction = require('../models/Transaction');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');
const Enrollment = require('../models/Enrollment');
const EventRegistration = require('../models/EventRegistration');
const Course = require('../models/Course');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { audit, resolveIp } = require('../utils/auditLogger');

const chapa = require('../services/chapaService');
const eventPayment = require('../services/eventPaymentService');
const couponService = require('../services/couponService');
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || '';
const CHAPA_WEBHOOK_SECRET = process.env.CHAPA_WEBHOOK_SECRET || CHAPA_SECRET_KEY || '';

// Initiate payment (creates a pending transaction and returns a provider redirect/url)
exports.initiatePayment = async (req, res) => {
    try {
        const { courseId, amount, currency = 'ETB', provider = 'chapa', coupon } = req.body;

        // Check if student is already enrolled in this course
        const existingEnrollment = await Enrollment.findOne({
            studentRef: req.user._id,
            courseRef: courseId,
            paymentStatus: 'Cleared'
        });
        if (existingEnrollment) {
            return res.status(400).json({ success: false, message: 'You are already enrolled in this course.' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const originalAmount = course.price || 0;
        let finalAmount = originalAmount;
        let couponMeta = null;
        if (coupon) {
            try {
                const validation = await couponService.validateCoupon(coupon, courseId, req.user._id, originalAmount);
                if (!validation || !validation.valid) {
                    return res.status(400).json({ success: false, message: validation?.message || 'Invalid coupon' });
                }
                finalAmount = validation.finalAmount;
                couponMeta = {
                    couponId: validation.coupon._id,
                    code: validation.coupon.code,
                    discountAmount: validation.discountAmount,
                    originalAmount
                };
            } catch (err) {
                console.error('Coupon validation error', err);
                return res.status(500).json({ success: false, message: 'Coupon validation failed' });
            }
        }
        if (amount && amount !== finalAmount) {
            console.warn(`Payment amount mismatch for course ${courseId}. Enforcing course price ${finalAmount}.`);
        }

        if (finalAmount <= 0) {
            // Free course — enroll directly without payment
            await Enrollment.findOneAndUpdate(
                { studentRef: req.user._id, courseRef: courseId },
                {
                    $set: {
                        tuitionClearanceFlag: true,
                        paymentStatus: 'Cleared',
                        paymentAmount: 0,
                        paymentMethod: provider,
                        paymentReference: 'FREE-Course'
                    },
                    $setOnInsert: { enrollmentTimestamp: new Date() }
                },
                { upsert: true, new: true }
            );
            // Audit: free course enrollment
            audit.enrollment({ req, user: req.user, action: 'FREE_COURSE_ENROLLED', severity: 'info',
                description: `Student user (${req.user.accountEmail}) enrolled in free course '${course.courseTitle}'.`,
                targetType: 'Course', targetId: courseId, targetLabel: course.courseTitle });
            return res.status(201).json({ success: true, data: { free: true, message: 'Enrolled successfully (free course).' } });
        }

        let tx = await Transaction.findOne({
            studentRef: req.user._id,
            courseRef: courseId,
            provider: provider,
            status: 'Pending'
        });

        if (tx) {
            tx.amount = finalAmount;
            tx.currency = currency;
            tx.metadata = { ...tx.metadata, coupon: couponMeta };
        } else {
            tx = new Transaction({ studentRef: req.user._id, courseRef: courseId, amount: finalAmount, currency, provider, status: 'Pending', metadata: { coupon: couponMeta, originalAmount } });
        }

        if (provider === 'chapa') {
            // create a provider tx reference before writing enrollment metadata
            const tx_ref = `EMARE-TX-${tx._id.toString().slice(-8)}-${Date.now()}`;
            tx.metadata = { ...tx.metadata, tx_ref };
            tx.txRef = tx_ref;
            tx.metadata = { ...tx.metadata, kind: 'course' };
        }
        await tx.save();

        // Create a pending enrollment record (idempotent upsert so we don't duplicate on retries)
        await Enrollment.findOneAndUpdate(
            { studentRef: req.user._id, courseRef: courseId },
            {
                $set: {
                    paymentStatus: 'Pending Verification',
                    paymentAmount: finalAmount,
                    paymentMethod: provider,
                    paymentReference: tx.metadata?.tx_ref || '',
                    metadata: couponMeta ? { coupon: couponMeta } : {}
                }
            },
            { upsert: true, new: true }
        );

        if (provider === 'chapa') {
            const tx_ref = tx.metadata.tx_ref;
            const frontendUrl = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:5173';
            const backendUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;

            const paymentRecord = await Payment.findOneAndUpdate(
                { studentRef: req.user._id, courseRef: courseId, tx_ref },
                {
                    $set: {
                        transactionRef: tx._id,
                        amount: finalAmount,
                        currency,
                        paymentMethod: provider,
                        status: 'Pending',
                        metadata: tx.metadata || {}
                    }
                },
                { upsert: true, new: true }
            );

            // Build payload for Chapa
            const callbackUrl = `${frontendUrl}/payment/callback?tx_ref=${tx_ref}`;
            const webhookUrl = `${backendUrl}/api/payments/chapa/webhook`;

            // Sanitize description for Chapa: max 50 chars, only letters/numbers/hyphens/underscores/spaces/dots
            const courseTitle = (course.courseTitle || 'course')
                .replace(/[^a-zA-Z0-9\s\-_\.]/g, '') // Remove invalid characters
                .slice(0, 35); // Leave room for "Payment for " prefix
            const sanitizedDescription = `Payment for ${courseTitle}`.slice(0, 50);

            const userEmail = req.user.accountEmail || req.user.email || 'payments@emareicthub.com';
            const userFirstName = (req.user.fullName || '').split(' ')[0] || 'Student';
            const userLastName = (req.user.fullName || '').split(' ')[1] || 'User';

            const payload = {
                amount: finalAmount,
                currency,
                email: userEmail,
                customer_email: userEmail,
                first_name: userFirstName,
                customer_first_name: userFirstName,
                last_name: userLastName,
                customer_last_name: userLastName,
                tx_ref,
                callback_url: callbackUrl,
                return_url: callbackUrl,
                webhook_url: webhookUrl,
                customization: { title: 'Emare ICT Hub', description: sanitizedDescription }
            };

            // Call Chapa
            try {
                const chapaRes = await chapa.initialize(payload);
                const checkoutUrl = chapaRes?.data?.data?.checkout_url || chapaRes?.data?.checkout_url;
                if (!checkoutUrl) {
                    console.error('Chapa response missing checkout_url:', JSON.stringify(chapaRes?.data));
                    return res.status(500).json({ success: false, message: 'Chapa did not return a checkout URL.' });
                }
                return res.status(201).json({ success: true, data: { transactionId: tx._id, paymentId: paymentRecord._id, paymentUrl: checkoutUrl, tx_ref } });
            } catch (err) {
                console.error('Chapa init error', err.response ? err.response.data : err.message);
                return res.status(500).json({ success: false, message: 'Chapa initialization failed. Please try again.' });
            }
        }

        // Fallback stub for other providers
        const paymentUrl = `https://payments.example.com/${provider}/pay?tx=${tx._id}`;
        res.status(201).json({ success: true, data: { transactionId: tx._id, paymentUrl } });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Failed to initiate payment' }); }
};

// Generic verify (used by frontend/manual checks)
exports.verifyPayment = async (req, res) => {
    try {
        const { transactionId, providerTransactionId, status } = req.body;
        const tx = await Transaction.findById(transactionId);
        if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

        tx.providerTransactionId = providerTransactionId || tx.providerTransactionId;
        tx.status = (status === 'success' || status === 'Completed') ? 'Completed' : (status === 'pending' ? 'Pending' : 'Failed');
        await tx.save();

        if (tx.status === 'Completed') {
            await Enrollment.create({ studentRef: tx.studentRef, courseRef: tx.courseRef, tuitionClearanceFlag: true, paymentStatus: 'Cleared', paymentAmount: tx.amount });
        }

        res.json({ success: true, data: tx });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

// Chapa webhook (public) - Chapa POSTs payment status here
exports.chapaWebhook = async (req, res) => {
    try {
        // Prefer rawBody preserved by express.json verify or the raw buffer from express.raw
        let rawBody = req.rawBody || req.body;
        let rawStr = '';
        if (Buffer.isBuffer(rawBody)) rawStr = rawBody.toString('utf8');
        else rawStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});

        const signature = (req.get('x-chapa-signature') || req.get('x-signature') || req.get('signature') || '').trim();

        if (CHAPA_WEBHOOK_SECRET && signature) {
            const expectedHex = crypto.createHmac('sha256', CHAPA_WEBHOOK_SECRET).update(rawStr).digest('hex');
            const expectedB64 = crypto.createHmac('sha256', CHAPA_WEBHOOK_SECRET).update(rawStr).digest('base64');
            if (signature !== expectedHex && signature !== expectedB64) {
                console.warn('Chapa webhook signature mismatch', { received: signature, expectedHex, expectedB64 });
                return res.status(403).json({ success: false, message: 'Invalid signature' });
            }
        } else if (CHAPA_WEBHOOK_SECRET && !signature) {
            console.warn('CHAPA_WEBHOOK_SECRET present but no signature header');
            return res.status(400).json({ success: false, message: 'Missing signature header' });
        }

        const payload = JSON.parse(rawStr);
        const data = payload.data || payload;
        const tx_ref = data.tx_ref || (data && data.transaction && data.transaction.tx_ref) || null;
        const status = (data.status || (data.transaction && data.transaction.status) || '').toLowerCase();
        const eventId = data.id || payload.id || (data.transaction && data.transaction.id) || null;

        if (!tx_ref) return res.status(400).json({ success: false, message: 'Missing tx_ref' });

        const tx = await Transaction.findOne({ $or: [{ txRef: tx_ref }, { 'metadata.tx_ref': tx_ref }] });
        if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

        // Idempotency: if we've already processed this webhook event, acknowledge and exit
        if (eventId && Array.isArray(tx.processedWebhookIds) && tx.processedWebhookIds.includes(eventId)) {
            return res.json({ success: true, message: 'Event already processed' });
        }

        // If transaction already completed, still record the event id to avoid reprocessing
        if (eventId) tx.processedWebhookIds = Array.from(new Set([...(tx.processedWebhookIds || []), eventId]));

        if (status === 'success' || status === 'completed') {
            const providerAmount = data.amount ?? (data.transaction && data.transaction.amount);
            if (providerAmount != null) tx.providerAmount = Number(providerAmount);
            const providerCurrency = data.currency ?? (data.transaction && data.transaction.currency);
            if (providerCurrency) {
                tx.providerCurrency = String(providerCurrency).toUpperCase();
                if (tx.metadata) tx.metadata.providerCurrency = tx.providerCurrency;
            }
            const providerTxId = data.id || (data.transaction && data.transaction.id) || null;
            tx.providerTransactionId = providerTxId || tx.providerTransactionId;

            // Event bookings settle through the shared service so the webhook and
            // the browser-triggered verify can never disagree. Settle FIRST so the
            // amount/currency checks decide the outcome — a transaction we already
            // voided (expired window or a cancelled retry) is never auto-granted.
            if (tx.eventRef) {
                const wasVoided = tx.status === 'Cancelled';
                if (wasVoided) {
                    tx.lastVerificationError = 'Payment arrived after the seat was released — refund required.';
                    await tx.save();
                    console.warn('Chapa: late payment for a voided event transaction', { tx_ref });
                    return res.json({ success: true, action: 'refund_required' });
                }
                tx.status = 'Pending';
                tx.paidAt = tx.paidAt || new Date();
                const settled = await eventPayment.settleTransaction({
                    tx,
                    providerStatus: 'success',
                    providerTransactionId: providerTxId,
                    source: 'chapa-webhook'
                });
                if (settled.verified && !settled.alreadySettled) {
                    audit.enrollment({ req, action: 'CHAPA_PAYMENT_VERIFIED', severity: 'info',
                        user: tx.studentRef ? await User.findById(tx.studentRef) : null,
                        description: `Event payment verified for '${tx.metadata?.eventTitle || 'event'}' (${tx_ref}).`,
                        targetType: 'Event', targetId: tx.eventRef, targetLabel: tx.metadata?.eventTitle,
                        metadata: { tx_ref, amount: tx.amount, currency: tx.currency } });
                }
                return res.json({ success: true });
            }

            tx.status = 'Completed';
            tx.paidAt = tx.paidAt || new Date();
            await tx.save();

            // Payment records only exist for course transactions (model is course-only).
            if (tx.courseRef) {
                await Payment.findOneAndUpdate(
                    { tx_ref },
                    {
                        $set: {
                            status: 'Completed',
                            providerTransactionId: tx.providerTransactionId,
                            currency: tx.currency,
                            paymentMethod: tx.provider
                        }
                    },
                    { upsert: true, new: true }
                );
            }

            // Record coupon usage atomically if a coupon was attached to the tx
            try {
                if (tx.metadata && tx.metadata.coupon && !tx.metadata.couponRecorded) {
                    await couponService.recordUsageIfNeeded(tx.metadata.coupon.couponId || tx.metadata.coupon.couponId || tx.metadata.coupon, tx);
                }
            } catch (err) {
                console.error('Failed to record coupon usage from webhook:', err);
            }

            // Idempotent enrollment creation or update (course payments only)
            if (tx.courseRef) {
                await Enrollment.findOneAndUpdate(
                    { studentRef: tx.studentRef, courseRef: tx.courseRef },
                    { $set: { tuitionClearanceFlag: true, paymentStatus: 'Cleared', paymentAmount: tx.amount }, $setOnInsert: { enrollmentTimestamp: new Date() } },
                    { upsert: true, new: true }
                );
            }

            // Send confirmation email asynchronously
            try {
                const user = await User.findById(tx.studentRef);
                const course = await Course.findById(tx.courseRef);
                if (user && course && emailService.sendCourseEnrollmentEmail) {
                    emailService.sendCourseEnrollmentEmail(user, course, tx_ref);
                }
            } catch (err) {
                console.error('Failed to send enrollment email from webhook:', err);
            }
        } else if (status === 'failed' || status === 'error' || status === 'cancelled') {
            if (tx.eventRef) {
                await eventPayment.settleTransaction({
                    tx,
                    providerStatus: 'failed',
                    source: 'chapa-webhook'
                });
                return res.json({ success: true });
            }
            tx.status = 'Failed';
            await tx.save();
            if (tx.courseRef) await Payment.findOneAndUpdate({ tx_ref }, { $set: { status: 'Failed', providerTransactionId: tx.providerTransactionId } });
        } else {
            await tx.save();
            if (tx.courseRef) await Payment.findOneAndUpdate({ tx_ref }, { $set: { status: 'Pending' } });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Chapa webhook error', err);
        res.status(500).json({ success: false });
    }
};

// On-demand Chapa verify by tx_ref. Authenticated + ownership-checked: a
// transaction reference alone must never be enough to settle a payment.
exports.verifyChapa = async (req, res) => {
    try {
        const { tx_ref } = req.params;
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Please log in to verify this payment.' });
        }

        const existingTx = await Transaction.findOne({ $or: [{ txRef: tx_ref }, { 'metadata.tx_ref': tx_ref }] });
        if (!existingTx) return res.status(404).json({ success: false, message: 'Transaction not found' });

        const isOwner = existingTx.studentRef && String(existingTx.studentRef) === String(user._id);
        const isAdmin = user.assignedRole === 'Admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, code: 'NOT_TRANSACTION_OWNER', message: 'You cannot verify this transaction.' });
        }

        const chapaRes = await chapa.verify(tx_ref);
        const body = chapaRes?.data || {};
        const data = body.data || {};
        const status = body.status || data.status || '';
        const normalizedStatus = eventPayment.normalizeProviderStatus(status);

        const tx = existingTx;

        const providerAmount = body.amount ?? data.amount ?? null;
        const providerCurrency = body.currency ?? data.currency ?? null;
        const providerTxId = data.id || body.id || null;

        // ── Event bookings: settle through the shared service ────────────
        if (tx.eventRef) {
            if (normalizedStatus === 'pending') {
                return res.json({ success: true, verified: false, transactionStatus: 'pending', eventSlug: tx.metadata?.eventSlug, raw: body });
            }
            if (providerAmount != null) tx.providerAmount = Number(providerAmount);
            if (providerCurrency) {
                tx.providerCurrency = String(providerCurrency).toUpperCase();
                if (tx.metadata) tx.metadata.providerCurrency = tx.providerCurrency;
            }
            const settled = await eventPayment.settleTransaction({
                tx,
                providerStatus: normalizedStatus,
                providerTransactionId: providerTxId,
                source: 'chapa-verify'
            });
            const registration = tx.metadata?.registrationId
                ? await EventRegistration.findById(tx.metadata.registrationId)
                : null;
            return res.json({
                success: settled.verified,
                verified: settled.verified,
                transactionStatus: normalizedStatus,
                eventSlug: tx.metadata?.eventSlug,
                bookingRef: registration?.bookingRef || tx.metadata?.bookingRef || null,
                registrationId: tx.metadata?.registrationId || null,
                raw: body
            });
        }

        if (normalizedStatus === 'success') {
            if (providerAmount && Number(providerAmount) !== tx.amount) {
                console.warn('Chapa verification amount mismatch', { expected: tx.amount, received: providerAmount, tx_ref });
                tx.status = 'Failed';
                await tx.save();
                if (tx.courseRef) await Payment.findOneAndUpdate({ tx_ref }, { $set: { status: 'Failed' } });
                return res.status(400).json({ success: false, verified: false, transactionStatus: 'failed', message: 'Payment verification amount mismatch' });
            }

            tx.status = 'Completed';
            tx.paidAt = tx.paidAt || new Date();
            if (providerTxId) tx.providerTransactionId = String(providerTxId);
            await tx.save();
            if (tx.courseRef) {
                await Payment.findOneAndUpdate(
                    { tx_ref },
                    {
                        $set: {
                            status: 'Completed',
                            providerTransactionId: tx.providerTransactionId || providerTxId,
                            paymentMethod: tx.provider || 'chapa'
                        }
                    },
                    { upsert: true, new: true }
                );
            }

            // Record coupon usage now that we have a verified, completed transaction
            try {
                if (tx.metadata && tx.metadata.coupon && !tx.metadata.couponRecorded) {
                    await couponService.recordUsageIfNeeded(tx.metadata.coupon.couponId || tx.metadata.coupon, tx);
                }
            } catch (err) {
                console.error('Failed to record coupon usage from verify:', err);
            }

            if (tx.courseRef) {
                await Enrollment.findOneAndUpdate(
                    { studentRef: tx.studentRef, courseRef: tx.courseRef },
                    {
                        $set: {
                            tuitionClearanceFlag: true,
                            paymentStatus: 'Cleared',
                            paymentAmount: tx.amount,
                            paymentReference: tx_ref,
                            paymentMethod: tx.provider || 'chapa'
                        },
                        $setOnInsert: { enrollmentTimestamp: new Date() }
                    },
                    { upsert: true, new: true }
                );
            }

            try {
                const user = await User.findById(tx.studentRef);
                if (tx.courseRef) {
                    const course = await Course.findById(tx.courseRef);
                    if (user && course && emailService.sendCourseEnrollmentEmail) {
                        emailService.sendCourseEnrollmentEmail(user, course, tx_ref);
                    }
                }
                const course = tx.courseRef ? await Course.findById(tx.courseRef) : null;
                const targetLabel = course?.courseTitle || 'Course';
                audit.enrollment({ action: 'CHAPA_PAYMENT_VERIFIED', severity: 'info',
                    user,
                    description: `Payment verified for course '${targetLabel}' (${tx_ref}).`,
                    targetType: 'Course', targetId: tx.courseRef, targetLabel,
                    metadata: { tx_ref, amount: tx.amount, currency: tx.currency } });
            } catch (err) {
                console.error('Failed to send email from verify:', err);
            }

            return res.json({ success: true, verified: true, transactionStatus: normalizedStatus, courseId: tx.courseRef, raw: body });
        }

        if (normalizedStatus === 'failed') {
            tx.status = 'Failed';
            await tx.save();
            if (tx.courseRef) await Payment.findOneAndUpdate({ tx_ref }, { $set: { status: 'Failed' } });
            return res.json({ success: false, verified: false, transactionStatus: normalizedStatus, courseId: tx.courseRef, raw: body });
        }

        // Pending or unknown status
        tx.status = 'Pending';
        await tx.save();
        if (tx.courseRef) await Payment.findOneAndUpdate({ tx_ref }, { $set: { status: 'Pending' } }, { upsert: true, new: true });
        return res.json({ success: true, verified: false, transactionStatus: normalizedStatus || 'pending', courseId: tx.courseRef, raw: body });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

exports.getMyTransactions = async (req, res) => {
    try {
        const tx = await Transaction.find({ studentRef: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: tx });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

exports.getInvoiceData = async (req, res) => {
    try {
        const tx = await Transaction.findById(req.params.id).populate('studentRef courseRef').lean();
        if (!tx) return res.status(404).json({ success: false });
        res.json({ success: true, data: {
            invoiceNumber: `INV-${tx._id.toString().slice(-8).toUpperCase()}`,
            date: tx.createdAt,
            amount: tx.amount,
            currency: tx.currency,
            course: tx.courseRef,
            student: tx.studentRef,
            transactionId: tx._id
        }});
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.applyCoupon = async (req, res) => {
    try {
        const { code, courseId } = req.body;

        // courseId is REQUIRED — coupons must always be validated against a specific course
        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: 'A course must be selected before applying a coupon. Please go to a course checkout page.'
            });
        }

        if (!code || !String(code).trim()) {
            return res.status(400).json({ success: false, message: 'Please enter a coupon code.' });
        }

        const course = await Course.findById(courseId).lean();
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const originalAmount = course.price || 0;
        const userId = req.user?._id;

        const validation = await couponService.validateCoupon(
            String(code).trim(),
            courseId,
            userId,
            originalAmount
        );

        if (!validation || !validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation?.message || 'Invalid or expired coupon code.'
            });
        }

        return res.json({
            success: true,
            data: {
                coupon: {
                    code: validation.coupon.code,
                    type: validation.coupon.type,
                    value: validation.coupon.value,
                    maxDiscount: validation.coupon.maxDiscount
                },
                discountAmount: validation.discountAmount,
                finalAmount: validation.finalAmount,
                originalAmount
            }
        });
    } catch (err) {
        console.error('[applyCoupon]', err);
        res.status(500).json({ success: false, message: 'Coupon validation failed. Please try again.' });
    }
};

module.exports = exports;
