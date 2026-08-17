const mongoose = require('mongoose');

/**
 * Certificate model
 *
 * certificateId  — globally unique sequential ID: EMARE-CERT-YYYY-NNNNNN
 *                  Generated atomically by CertificateCounter.
 *                  Never reused, never random-only.
 *
 * (studentRef, courseRef) compound unique index:
 *   → ONE certificate per student per course
 *   → prevents accidental duplicates at the database level
 */
const CertificateSchema = new mongoose.Schema({
    // ── Primary unique ID shown on the certificate ─────────────────────────
    certificateId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },

    // ── kept for backward-compatibility (same value as certificateId) ───────
    certificateNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    // ── Ownership ───────────────────────────────────────────────────────────
    studentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },

    // ── Optional template reference ─────────────────────────────────────────
    templateRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CertificateTemplate'
    },
    templateId: {
        type: String,
        default: 'standard'
    },

    // ── Dates ───────────────────────────────────────────────────────────────
    issueDate: {
        type: Date,
        default: Date.now
    },
    completionDate: {
        type: Date,
        default: Date.now
    },

    // ── Status ──────────────────────────────────────────────────────────────
    status: {
        type: String,
        enum: ['Issued', 'Reissued', 'Revoked'],
        default: 'Issued'
    },
    grade: {
        type: String,
        enum: ['Distinction', 'Merit', 'Pass'],
        default: 'Pass'
    },

    // ── File & QR ───────────────────────────────────────────────────────────
    pdfPath: {
        type: String,
        default: ''
    },
    qrCodeData: {
        type: String,
        default: ''
    },

    // ── Issuer info ─────────────────────────────────────────────────────────
    issuerName: {
        type: String,
        default: 'Emare ICT Hub'
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ── Revocation ──────────────────────────────────────────────────────────
    revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    revokedAt:        { type: Date },
    revocationReason: { type: String },

    // ── Re-issue chain ──────────────────────────────────────────────────────
    reissuedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Certificate'
    },

    // ── Download tracking ───────────────────────────────────────────────────
    downloadCount: {
        type: Number,
        default: 0
    },

    metadata: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true
});

// ── Indexes ──────────────────────────────────────────────────────────────────

// Primary: unique certificate ID (globally unique across all students/courses)
CertificateSchema.index({ certificateId: 1 },     { unique: true });
CertificateSchema.index({ certificateNumber: 1 }, { unique: true });

// ONE certificate per student per course (prevents accidental duplicates)
CertificateSchema.index({ studentRef: 1, courseRef: 1 }, { unique: true });

// Admin search helpers
CertificateSchema.index({ studentRef: 1 });
CertificateSchema.index({ courseRef: 1 });
CertificateSchema.index({ status: 1 });
CertificateSchema.index({ issueDate: -1 });

module.exports = mongoose.model('Certificate', CertificateSchema);
