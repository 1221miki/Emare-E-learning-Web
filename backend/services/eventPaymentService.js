const EventRegistration = require('../models/EventRegistration');
const Transaction = require('../models/Transaction');

/**
 * How long a seat is held while waiting for Chapa. Abandoned checkouts release
 * the seat automatically after this window.
 */
const PAYMENT_WINDOW_MINUTES = Number(process.env.EVENT_PAYMENT_WINDOW_MINUTES || 30);

const ACTIVE_STATUSES = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'WAITLISTED'];

/**
 * Event.price is a free-text column ("FREE", "500", "500 ETB", ...).
 * Everything that needs a number goes through here so the amount charged can
 * never disagree with the amount we expect back from Chapa.
 */
const parseEventPrice = (event) => {
    if (!event) return 0;
    if (event.paymentRequired === false) return 0;
    const raw = String(event.price ?? '').trim().toUpperCase();
    if (!raw || raw === 'FREE' || raw === '0' || raw === '0.00') return 0;
    const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    return Number.isFinite(num) && num > 0 ? num : 0;
};

const paymentDeadline = (from = new Date()) =>
    new Date(from.getTime() + PAYMENT_WINDOW_MINUTES * 60 * 1000);

const isExpired = (registration, now = Date.now()) =>
    Boolean(
        registration &&
        registration.paymentExpiresAt &&
        new Date(registration.paymentExpiresAt).getTime() <= now
    );

/** Canonical lifecycle value for a registration document. */
const normalizeStatus = (registration) => EventRegistration.normalizeStatus(registration);

/**
 * A registration only grants access when it is CONFIRMED and, for paid events,
 * Chapa has confirmed the money arrived.
 */
const hasAccess = (registration) => EventRegistration.isAccessGranted(registration);

/**
 * Statuses that occupy one of the event's slots.
 * WAITLISTED is deliberately excluded — being waitlisted means there was no
 * seat left, so it must never consume capacity (otherwise the event can never
 * promote anyone).
 */
const HOLDS_SEAT = new Set(['PENDING_PAYMENT', 'PAID', 'CONFIRMED']);

const isSeatHolding = (registration, now = Date.now()) => {
    const status = normalizeStatus(registration);
    if (!HOLDS_SEAT.has(status)) return false;
    // An abandoned checkout only holds its seat until the payment window ends.
    if (status === 'PENDING_PAYMENT' && isExpired(registration, now)) return false;
    return true;
};

/**
 * Release seats held by abandoned/expired checkouts so capacity is accurate.
 * Safe to call on every read of the event.
 */
const releaseExpiredSeats = async (eventId) => {
    const now = new Date();

    // Collect the affected registrations FIRST — the transaction void must be
    // scoped to exactly these rows, never to every pending payment of the event.
    const expiring = await EventRegistration.find({
        eventRef: eventId,
        paymentExpiresAt: { $ne: null, $lte: now },
        $or: [{ status: 'PENDING_PAYMENT' }, { status: 'waitlisted' }],
        paymentStatus: { $in: ['pending', 'failed'] }
    })
        .select('_id')
        .lean();

    if (!expiring.length) return 0;

    const ids = expiring.map((r) => r._id);
    const result = await EventRegistration.updateMany(
        { _id: { $in: ids } },
        {
            $set: {
                status: 'EXPIRED',
                paymentStatus: 'expired',
                lastVerificationError: 'Payment window expired before Chapa confirmed the payment.'
            }
        }
    );

    if (result.modifiedCount > 0) {
        // Void only the abandoned transactions belonging to those registrations.
        await Transaction.updateMany(
            {
                eventRef: eventId,
                status: 'Pending',
                'metadata.registrationId': { $in: ids }
            },
            { $set: { status: 'Cancelled', 'metadata.expiredBy': 'payment-window' } }
        );
    }
    return result.modifiedCount || 0;
};

/** Registrations that currently occupy a seat (confirmed + live pending payments). */
const countActiveSeats = async (eventId) => {
    const now = Date.now();
    const rows = await EventRegistration.find({
        eventRef: eventId,
        status: { $nin: ['CANCELLED', 'EXPIRED', 'cancelled', 'expired'] }
    })
        .select('status paymentExpiresAt')
        .lean();
    return rows.filter((r) => isSeatHolding(r, now)).length;
};

const buildBookingRef = () =>
    `EMR-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const buildTxRef = (registrationId) =>
    `EMARE-EVT-${String(registrationId).slice(-8)}-${Date.now()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

const sanitize = (value, max) =>
    String(value || '')
        .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
        .trim()
        .slice(0, max);

/** Chapa rejects malformed addresses and anything longer than 50 characters. */
const CHAPA_EMAIL_MAX = 50;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYMENT_FALLBACK_EMAIL = 'payments@emareicthub.com';

/**
 * Resolve the address Chapa will send the receipt to.
 * We never silently truncate a customer's address: a truncated address would
 * send the receipt somewhere else, so an unusable one is reported instead.
 */
const resolveChapaEmail = (user, registration) => {
    const raw = String(
        (user && (user.accountEmail || user.email)) || (registration && registration.email) || ''
    )
        .trim()
        .toLowerCase();

    if (!raw) return PAYMENT_FALLBACK_EMAIL;
    if (raw.length <= CHAPA_EMAIL_MAX && EMAIL_PATTERN.test(raw)) return raw;

    const error = new Error(
        'Your account email address cannot be used for online payment. Please update it from your profile, then try again.'
    );
    error.code = 'PAYMENT_EMAIL_INVALID';
    throw error;
};

/**
 * Chapa rejects descriptions longer than 50 chars and titles longer than 35.
 */
const buildChapaPayload = ({ registration, event, amount, currency, user, callbackUrl, webhookUrl }) => {
    const email = resolveChapaEmail(user, registration);
    const parts = String(registration.fullName || 'Guest').trim().split(/\s+/);
    const firstName = parts[0] || 'Guest';
    const lastName = parts.slice(1).join(' ') || 'User';
    const description = `Event ${sanitize(event.title, 35)}`.slice(0, 50);

    return {
        amount,
        currency,
        email,
        customer_email: email,
        first_name: firstName,
        customer_first_name: firstName,
        last_name: lastName,
        customer_last_name: lastName,
        tx_ref: registration.txRef,
        callback_url: callbackUrl,
        return_url: callbackUrl,
        webhook_url: webhookUrl,
        customization: { title: 'Emare ICT Hub', description }
    };
};

/**
 * Normalise anything Chapa (or the webhook) tells us into one of
 * 'success' | 'failed' | 'pending'.
 */
const normalizeProviderStatus = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'success' || s === 'completed' || s === 'successful') return 'success';
    if (s === 'failed' || s === 'error' || s === 'cancelled' || s === 'canceled') return 'failed';
    return 'pending';
};

/**
 * THE settlement point. Called by the webhook and by on-demand verification.
 *
 * Guarantees:
 *  - Idempotent: repeated calls (webhook retries, double-clicks, refreshes)
 *    never double-mark a registration and never emit a second confirmation.
 *  - Server-trusted: `providerStatus` must come from a Chapa response, never
 *    from the browser. Amount and currency must match the stored transaction.
 *  - Never trusts the client about *which* registration it is — the link is
 *    resolved from the transaction document itself.
 *
 * @returns {{verified:boolean, status:string, alreadySettled:boolean, reason?:string}}
 */
const settleTransaction = async ({ tx, providerStatus, providerTransactionId, source = 'server' }) => {
    const outcome = normalizeProviderStatus(providerStatus);
    const registrationId = tx && tx.metadata ? tx.metadata.registrationId : null;

    const markTx = async (status, extra = {}) => {
        tx.status = status;
        if (providerTransactionId) tx.providerTransactionId = String(providerTransactionId);
        if (extra) Object.assign(tx, extra);
        await tx.save();
        return tx;
    };

    // Nothing to do for courses — the caller handles those separately.
    if (!tx.eventRef || !registrationId) {
        if (outcome === 'success' && tx.status !== 'Completed') await markTx('Completed');
        return { verified: tx.status === 'Completed', status: outcome, alreadySettled: tx.status === 'Completed', event: false };
    }

    // ── Success ────────────────────────────────────────────────────────────
    if (outcome === 'success') {
        // A voided transaction (cancelled by the attendee, or replaced by a
        // newer checkout attempt) must never confirm a registration, even if
        // Chapa later reports it as successful. The money is real and has to be
        // refunded by hand, so we record it and tell the caller to refund.
        const reg = registrationId ? await EventRegistration.findById(registrationId) : null;
        const registrationCancelled = reg && normalizeStatus(reg) === 'CANCELLED';
        if (tx.status === 'Cancelled' || registrationCancelled) {
            if (reg && !hasAccess(reg)) {
                reg.paymentStatus = 'failed';
                reg.lastVerificationError =
                    'Payment received for a cancelled registration — refund required.';
                await reg.save();
            }
            if (providerTransactionId) {
                tx.providerTransactionId = String(providerTransactionId);
                await tx.save();
            }
            return {
                verified: false,
                status: 'success',
                alreadySettled: false,
                event: true,
                reason: 'transaction_cancelled',
                refundRequired: true
            };
        }

        // Refuse to grant access if Chapa settled a different amount or
        // currency than the price we quoted. `providerAmount` may arrive on
        // either the top-level field (webhook / verify) or in metadata.
        const providerAmount = tx.providerAmount != null
            ? tx.providerAmount
            : (tx.metadata ? tx.metadata.providerAmount : null);
        if (providerAmount != null && Number(providerAmount) !== Number(tx.amount)) {
            await markTx('Failed');
            await EventRegistration.updateOne(
                { _id: registrationId },
                {
                    $set: {
                        paymentStatus: 'failed',
                        status: 'PENDING_PAYMENT',
                        lastVerificationError: 'Payment amount mismatch — access not granted.'
                    }
                }
            );
            return { verified: false, status: 'failed', alreadySettled: false, event: true, reason: 'amount_mismatch' };
        }

        const providerCurrency =
            (tx.metadata && tx.metadata.providerCurrency) || tx.providerCurrency || null;
        if (providerCurrency && tx.currency
            && String(providerCurrency).toUpperCase() !== String(tx.currency).toUpperCase()) {
            await markTx('Failed');
            await EventRegistration.updateOne(
                { _id: registrationId },
                {
                    $set: {
                        paymentStatus: 'failed',
                        status: 'PENDING_PAYMENT',
                        lastVerificationError: 'Payment currency mismatch — access not granted.'
                    }
                }
            );
            return { verified: false, status: 'failed', alreadySettled: false, event: true, reason: 'currency_mismatch' };
        }

        const alreadySettled = tx.status === 'Completed' && !providerTransactionId;
        await markTx('Completed');

        if (!reg) {
            return { verified: false, status: outcome, alreadySettled, event: true, reason: 'registration_missing' };
        }

        const changed =
            reg.paymentStatus !== 'completed' || normalizeStatus(reg) !== 'CONFIRMED';

        if (changed) {
            reg.paymentStatus = 'completed';
            reg.status = 'CONFIRMED';
            reg.amountPaid = Number(tx.amount);
            reg.currency = tx.currency || reg.currency;
            reg.paidAt = reg.paidAt || new Date();
            reg.verifiedAt = new Date();
            reg.accessGrantedAt = reg.accessGrantedAt || new Date();
            reg.verificationSource = source;
            reg.lastVerificationError = '';
            reg.paymentExpiresAt = null;
            if (providerTransactionId) reg.chapaTransactionId = String(providerTransactionId);
            await reg.save();

            // Only confirmed, paid users are tracked on the event document.
            const Event = require('../models/Event');
            await Event.updateOne(
                { _id: reg.eventRef, registeredUsers: { $ne: reg.userId } },
                { $addToSet: { registeredUsers: reg.userId } }
            );
        } else if (providerTransactionId && !reg.chapaTransactionId) {
            reg.chapaTransactionId = String(providerTransactionId);
            await reg.save();
        }

        return { verified: true, status: 'success', alreadySettled: !changed, event: true };
    }

    // ── Failed / cancelled ─────────────────────────────────────────────────
    if (outcome === 'failed') {
        const alreadySettled = tx.status === 'Failed';
        await markTx('Failed');
        await EventRegistration.updateOne(
            { _id: registrationId, status: { $ne: 'CONFIRMED' } },
            {
                $set: {
                    paymentStatus: 'failed',
                    lastVerificationError: 'Payment was declined or cancelled. Complete checkout to confirm your seat.'
                }
            }
        );
        return { verified: false, status: 'failed', alreadySettled, event: true };
    }

    // ── Still pending at the provider ──────────────────────────────────────
    if (tx.status !== 'Completed') await markTx('Pending');
    return { verified: false, status: 'pending', alreadySettled: false, event: true };
};

/**
 * Called by the browser-facing verify endpoint. Re-checks Chapa server-side and
 * settles only from the provider's answer.
 */
const verifyWithProvider = async ({ tx_ref, source = 'user-verify' }) => {
    const chapa = require('./chapaService');

    const tx = await Transaction.findOne({ 'metadata.tx_ref': tx_ref });
    if (!tx) {
        const err = new Error('Transaction not found.');
        err.status = 404;
        throw err;
    }

    // Already settled by the webhook — return the same answer without hitting
    // Chapa again (this is what makes refreshes and duplicate callbacks safe).
    if (tx.status === 'Completed') {
        return { tx, result: { verified: true, status: 'success', alreadySettled: true, event: Boolean(tx.eventRef) } };
    }

    let providerStatus = 'pending';
    let providerTransactionId = null;
    try {
        const res = await chapa.verify(tx_ref);
        const body = res?.data || {};
        const data = body.data || {};
        providerStatus = body.status || data.status;
        providerTransactionId = data.id || body.id || null;
        const amount = body.amount ?? data.amount;
        if (amount != null) tx.providerAmount = Number(amount);
        const currency = body.currency ?? data.currency;
        if (currency) tx.providerCurrency = String(currency).toUpperCase();
    } catch (err) {
        console.error('[eventPayment] Chapa verification error:', err.message);
        // Never grant access when the provider cannot be reached.
        return {
            tx,
            result: {
                verified: false,
                status: 'pending',
                alreadySettled: false,
                event: Boolean(tx.eventRef),
                reason: 'provider_unreachable'
            }
        };
    }

    const result = await settleTransaction({
        tx,
        providerStatus,
        providerTransactionId,
        source
    });

    const refreshed = await Transaction.findById(tx._id);
    return { tx: refreshed, result };
};

module.exports = {
    PAYMENT_WINDOW_MINUTES,
    ACTIVE_STATUSES,
    parseEventPrice,
    paymentDeadline,
    isExpired,
    normalizeStatus,
    hasAccess,
    isSeatHolding,
    releaseExpiredSeats,
    countActiveSeats,
    buildBookingRef,
    buildTxRef,
    resolveChapaEmail,
    buildChapaPayload,
    normalizeProviderStatus,
    settleTransaction,
    verifyWithProvider
};
