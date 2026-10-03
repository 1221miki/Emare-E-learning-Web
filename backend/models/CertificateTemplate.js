const mongoose = require('mongoose');

const CertificateTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    active: { type: Boolean, default: true },
    layout: { type: Object, default: {} },
    logoUrl: { type: String, default: '' },
    backgroundUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#0b5fff' },
    fontFamily: { type: String, default: 'Helvetica' },
    signatureImage: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('CertificateTemplate', CertificateTemplateSchema);
