/**
 * CertificateCounter.js
 *
 * Stores a single atomic counter per year for generating sequential
 * certificate IDs in the format: EMARE-CERT-YYYY-NNNNNN
 *
 * MongoDB's $inc on findOneAndUpdate is atomic — safe for concurrent requests.
 * Two students completing a course at the same moment will get different IDs.
 */
const mongoose = require('mongoose');

const CertificateCounterSchema = new mongoose.Schema({
    // One document per year: key = "EMARE-CERT-2026"
    key:     { type: String, required: true, unique: true },
    seq:     { type: Number, default: 0 }
});

CertificateCounterSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('CertificateCounter', CertificateCounterSchema);
