const mongoose = require('mongoose');

const CertificateVerificationSchema = new mongoose.Schema({
    certificateRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', required: true },
    verifierIp: { type: String },
    verifiedAt: { type: Date, default: Date.now },
    result: { type: String, enum: ['Valid','Revoked','NotFound'], default: 'Valid' },
    rawPayload: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('CertificateVerification', CertificateVerificationSchema);
