const mongoose = require('mongoose');
const crypto = require('crypto');

const CertificateSchema = new mongoose.Schema({
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
    certificateNumber: {
        type: String,
        unique: true,
        default: () => `EMARE-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    },
    completionDate: {
        type: Date,
        default: Date.now
    },
    grade: {
        type: String,
        enum: ['Distinction', 'Merit', 'Pass'],
        default: 'Pass'
    },
    status: {
        type: String,
        enum: ['Issued', 'Reissued', 'Revoked'],
        default: 'Issued'
    },
    templateId: {
        type: String,
        default: 'standard'
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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Certificate', CertificateSchema);
