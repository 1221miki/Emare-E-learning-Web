const mongoose = require('mongoose');
const crypto = require('crypto');

const CertificateSchema = new mongoose.Schema({
    certificateId: {
        type: String,
        unique: true,
        default: () => `EMARE-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    },
    certificateNumber: {
        type: String,
        unique: true,
        default: () => `EMARE-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    },
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
    templateRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CertificateTemplate'
    },
    templateId: {
        type: String,
        default: 'standard'
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    completionDate: {
        type: Date,
        default: Date.now
    },
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
    pdfPath: {
        type: String,
        default: ''
    },
    qrCodeData: {
        type: String,
        default: ''
    },
    issuerName: {
        type: String,
        default: 'Emare ELMS'
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    revokedAt: {
        type: Date
    },
    revocationReason: {
        type: String
    },
    reissuedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Certificate'
    },
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

module.exports = mongoose.model('Certificate', CertificateSchema);
