const mongoose = require('mongoose');

/**
 * AuditLog — Immutable security audit trail for the Emare ELMS Admin Portal.
 * Tracks enrollment/financial, course moderation, user security, and system events.
 */
const AuditLogSchema = new mongoose.Schema({
    // ── Actor ─────────────────────────────────────────────────
    actorRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null  // null = System / automated action
    },
    actorSnapshot: {
        // Denormalized actor info at the time of the event
        fullName:  { type: String, default: 'System' },
        email:     { type: String, default: 'system@emare.com' },
        role:      { type: String, default: 'System' }
    },

    // ── Event Classification ──────────────────────────────────
    category: {
        type: String,
        required: true,
        enum: [
            'Enrollment & Financial',
            'Course Approvals & Content',
            'User Security & Activity',
            'System & Diagnostics'
        ],
        index: true
    },
    action: {
        type: String,
        required: true,
        trim: true
        // e.g. LOGIN_SUCCESS, LOGIN_FAILED, ENROLLMENT_CREATED, COURSE_APPROVED …
    },

    // ── Human-readable summary ────────────────────────────────
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },

    // ── Optional Target References ────────────────────────────
    targetType: {
        type: String,
        enum: ['User', 'Course', 'Enrollment', 'Payment', 'Transaction', 'Quiz', 'Assignment', 'Certificate', 'System', null],
        default: null
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    targetLabel: {
        type: String,
        default: null  // e.g. course title, username — for display without a DB join
    },

    // ── Security & Source Info ────────────────────────────────
    ipAddress:  { type: String, default: '—' },
    userAgent:  { type: String, default: null },
    severity:   { type: String, enum: ['info', 'warning', 'critical'], default: 'info', index: true },
    metadata:   { type: mongoose.Schema.Types.Mixed, default: {} }

}, {
    timestamps: { createdAt: 'timestamp', updatedAt: false }
});

// ── Indexes for fast admin queries ────────────────────────────
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ category: 1, timestamp: -1 });
AuditLogSchema.index({ 'actorSnapshot.email': 1, timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });

// Prevent any modifications after creation (immutability guard)
AuditLogSchema.pre('save', function (next) {
    if (!this.isNew) {
        return next(new Error('AuditLog records are immutable and cannot be modified.'));
    }
    next();
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
