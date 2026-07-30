const axios = require('axios');
const crypto = require('crypto');

const Transaction = require('../models/Transaction');
const Coupon = require('../models/Coupon');
const RefundRequest = require('../models/RefundRequest');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

const chapa = require('../services/chapaAdapter');
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || '';

// Initiate payment (creates a pending transaction and returns a provider redirect/url)
exports.initiatePayment = async (req, res) => {
    try {
        const { courseId, amount, currency = 'ETB', provider = 'chapa', coupon } = req.body;

        const tx = await Transaction.create({ studentRef: req.user._id, courseRef: courseId, amount, currency, provider, status: 'Pending', metadata: { coupon } });

        if (provider === 'chapa') {
            // create a provider tx reference
            const tx_ref = `EMARE-TX-${tx._id.toString().slice(-8)}-${Date.now()}`;
            tx.metadata = { ...tx.metadata, tx_ref };
            await tx.save();

            // Build payload for Chapa
            const course = await Course.findById(courseId);
            const payload = {
                amount: amount || (course && course.price) || 0,
                currency,
                email: req.user.accountEmail || req.user.email,
                first_name: (req.user.fullName || '').split(' ')[0] || '',
                last_name: (req.user.fullName || '').split(' ')[1] || '',
                tx_ref,
                callback_url: `${process.env.APP_BASE_URL || 'http://localhost:5000'}/api/payments/chapa/webhook`,
                return_url: req.body.returnUrl || (process.env.APP_BASE_URL || 'http://localhost:3000'),
                customization: { title: 'Emare ELMS', description: `Payment for ${course ? course.courseTitle || course.title : 'course'}` }
            };

            // Call Chapa
            try {
                const chapaRes = await chapa.initialize(payload);
                const checkoutUrl = chapaRes && chapaRes.data && chapaRes.data.checkout_url;
                return res.status(201).json({ success: true, data: { transactionId: tx._id, paymentUrl: checkoutUrl, raw: chapaRes.data } });
            } catch (err) {
                console.error('Chapa init error', err.response ? err.response.data : err.message);
                return res.status(500).json({ success: false, message: 'Chapa initialization failed' });
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

        if (CHAPA_SECRET_KEY && signature) {
            const expectedHex = crypto.createHmac('sha256', CHAPA_SECRET_KEY).update(rawStr).digest('hex');
            const expectedB64 = crypto.createHmac('sha256', CHAPA_SECRET_KEY).update(rawStr).digest('base64');
            if (signature !== expectedHex && signature !== expectedB64) {
                console.warn('Chapa webhook signature mismatch', { received: signature, expectedHex, expectedB64 });
                return res.status(403).json({ success: false, message: 'Invalid signature' });
            }
        } else if (CHAPA_SECRET_KEY && !signature) {
            console.warn('CHAPA_SECRET_KEY present but no signature header');
            return res.status(400).json({ success: false, message: 'Missing signature header' });
        }

        const payload = JSON.parse(rawStr);
        const data = payload.data || payload;
        const tx_ref = data.tx_ref || (data && data.transaction && data.transaction.tx_ref) || null;
        const status = (data.status || (data.transaction && data.transaction.status) || '').toLowerCase();
        const eventId = data.id || payload.id || (data.transaction && data.transaction.id) || null;

        if (!tx_ref) return res.status(400).json({ success: false, message: 'Missing tx_ref' });

        const tx = await Transaction.findOne({ 'metadata.tx_ref': tx_ref });
        if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

        // Idempotency: if we've already processed this webhook event, acknowledge and exit
        if (eventId && Array.isArray(tx.processedWebhookIds) && tx.processedWebhookIds.includes(eventId)) {
            return res.json({ success: true, message: 'Event already processed' });
        }

        // If transaction already completed, still record the event id to avoid reprocessing
        if (eventId) tx.processedWebhookIds = Array.from(new Set([...(tx.processedWebhookIds || []), eventId]));

        if (status === 'success' || status === 'completed') {
            tx.status = 'Completed';
            tx.providerTransactionId = data.id || (data.transaction && data.transaction.id) || tx.providerTransactionId;
            await tx.save();

            // Idempotent enrollment creation: update existing or create if missing
            await Enrollment.findOneAndUpdate(
                { studentRef: tx.studentRef, courseRef: tx.courseRef },
                { $set: { tuitionClearanceFlag: true, paymentStatus: 'Cleared', paymentAmount: tx.amount }, $setOnInsert: { enrollmentTimestamp: new Date() } },
                { upsert: true, new: true }
            );
        } else if (status === 'failed' || status === 'error') {
            tx.status = 'Failed';
            await tx.save();
        } else {
            // For other statuses (pending/cancelled) just save updated processedWebhookIds
            await tx.save();
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Chapa webhook error', err);
        res.status(500).json({ success: false });
    }
};

// On-demand Chapa verify by tx_ref (public)
exports.verifyChapa = async (req, res) => {
    try {
        const { tx_ref } = req.params;
        const chapaRes = await chapa.verify(tx_ref);
        const status = (chapaRes && chapaRes.data && chapaRes.data.status) || (chapaRes && chapaRes.data && chapaRes.data.data && chapaRes.data.data.status) || '';

        const tx = await Transaction.findOne({ 'metadata.tx_ref': tx_ref });
        if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

        if (status === 'success' || status === 'completed') {
            tx.status = 'Completed';
            await tx.save();
            await Enrollment.create({ studentRef: tx.studentRef, courseRef: tx.courseRef, tuitionClearanceFlag: true, paymentStatus: 'Cleared', paymentAmount: tx.amount });
        }

        res.json({ success: true, raw: chapaRes.data });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.getMyTransactions = async (req, res) => {
    try { const tx = await Transaction.find({ studentRef: req.user._id }).sort({ createdAt: -1 }); res.json({ success: true, data: tx }); } catch (err) { console.error(err); res.status(500).json({ success: false }); }
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

exports.requestRefund = async (req, res) => {
    try {
        const { transactionId, reason } = req.body;
        const tx = await Transaction.findById(transactionId);
        if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
        const rr = await RefundRequest.create({ transactionRef: tx._id, studentRef: req.user._id, reason });
        res.status(201).json({ success: true, data: rr });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const coupon = await Coupon.findOne({ code });
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        if (coupon.expiresAt && coupon.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'Coupon expired' });
        if (coupon.redeemLimit && coupon.redeemedCount >= coupon.redeemLimit) return res.status(400).json({ success: false, message: 'Coupon limit reached' });
        res.json({ success: true, data: coupon });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

module.exports = exports;
