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
    }
}, {
    timestamps: true
});

// A student gets only one certificate per course
CertificateSchema.index({ studentRef: 1, courseRef: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', CertificateSchema);
