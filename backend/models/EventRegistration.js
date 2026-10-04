const mongoose = require('mongoose');

/**
 * Registration lifecycle
 * ─────────────────────
 *  PENDING_PAYMENT → seat reserved, waiting for Chapa to confirm the money arrived
 *  PAID           → Chapa confirmed the payment (server-side verified)
 *  CONFIRMED      → final state, event access is granted
 *  WAITLISTED     → legacy value kept so historical rows remain readable/saveable
 *  EXPIRED        → payment window elapsed without payment, seat released
 *  CANCELLED      → user or admin cancelled the registration
 *
 * The legacy lowercase spellings ('confirmed' | 'waitlisted' | 'cancelled') are still
 * accepted so pre-existing documents keep working — read them through
 * `normalizeRegistrationStatus()` which always returns the canonical value.
 */
const REGISTRATION_STATUSES = [
    'PENDING_PAYMENT',
    'PAID',
    'CONFIRMED',
    'WAITLISTED',
    'EXPIRED',
    'CANCELLED',
    'confirmed',
    'waitlisted',
    'cancelled'
];

const PAYMENT_STATUSES = ['none', 'pending', 'completed', 'failed', 'expired', 'refunded'];

const EventRegistrationSchema = new mongoose.Schema({
    eventRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    // Always set for the self-service flow — guest bookings are no longer accepted.
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    city: { type: String, trim: true, default: '' },
    selectedDate: { type: String, trim: true, default: '' },
    selectedSlot: { type: String, trim: true, default: '' },
    status: {
        type: String,
        enum: REGISTRATION_STATUSES,
        default: 'PENDING_PAYMENT'
    },
    bookingRef: { type: String, trim: true },
    paymentStatus: {
        type: String,
        enum: PAYMENT_STATUSES,
        default: 'none'
    },
    // Amount the attendee must pay (0 for free events). `amountPaid` is only set
    // once Chapa has confirmed the transaction.
    amountDue: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    currency: { type: String, trim: true, default: '' },
    txRef: { type: String, trim: true, default: '' },
    // Chapa's own transaction id, captured from the verify/webhook response.
    chapaTransactionId: { type: String, trim: true, default: '' },
    // Seat is held only until this instant; after it the row is EXPIRED and the
    // seat becomes available again.
    paymentExpiresAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    // Last time the backend successfully reconciled this registration with Chapa.
    verifiedAt: { type: Date, default: null },
    // Set the moment access is granted so the UI can explain itself.
    accessGrantedAt: { type: Date, default: null },
    verificationSource: { type: String, trim: true, default: '' },
    lastVerificationError: { type: String, trim: true, default: '' },
    registeredVia: {
        type: String,
        enum: ['web', 'admin', 'import'],
        default: 'web'
    }
}, {
    timestamps: true
});

// Duplicate protection for the self-service flow: one live registration per user
// per event. Enforced in application code (so cancellations can re-register) and
// backed by this index for fast lookups.
EventRegistrationSchema.index({ eventRef: 1, userId: 1 });
EventRegistrationSchema.index({ eventRef: 1, status: 1 });
EventRegistrationSchema.index({ userId: 1, status: 1 });
EventRegistrationSchema.index({ txRef: 1 }, { sparse: true });
// Kept exactly as originally defined so the existing database index is not
// rewritten on boot (it still guards against double-booking a phone + slot).
EventRegistrationSchema.index({ eventRef: 1, phone: 1, selectedSlot: 1 }, { unique: true });

// Canonical status for a document, no matter which spelling it was stored with.
EventRegistrationSchema.statics.normalizeStatus = function normalizeStatus(doc) {
    const raw = doc && doc.status ? String(doc.status) : '';
    const upper = raw.toUpperCase();
    if (upper === 'CONFIRMED' || upper === 'WAITLISTED' || upper === 'CANCELLED') return upper;
    if (upper === 'PENDING_PAYMENT' || upper === 'PAID' || upper === 'EXPIRED') return upper;
    return 'PENDING_PAYMENT';
};

/** True when the backend considers this registration a valid, access-granting booking. */
EventRegistrationSchema.statics.isAccessGranted = function isAccessGranted(doc) {
    const status = this.normalizeStatus(doc);
    if (status !== 'CONFIRMED') return false;
    const payment = doc && doc.paymentStatus ? String(doc.paymentStatus) : 'none';

    // Pre-migration rows have no amountDue. We cannot tell whether they were
    // free, so require the payment record rather than assuming the event was
    // free and handing out the meeting link.
    if (!doc || doc.amountDue == null) return payment === 'completed';

    const amountDue = Number(doc.amountDue);
    // Free events are confirmed without a gateway call.
    if (amountDue <= 0) return true;
    return payment === 'completed';
};

const EventRegistration = mongoose.model('EventRegistration', EventRegistrationSchema);

EventRegistration.STATUSES = REGISTRATION_STATUSES;
EventRegistration.PAYMENT_STATUSES = PAYMENT_STATUSES;
EventRegistration.normalizeStatus = EventRegistrationSchema.statics.normalizeStatus;
EventRegistration.isAccessGranted = EventRegistrationSchema.statics.isAccessGranted;

module.exports = EventRegistration;
