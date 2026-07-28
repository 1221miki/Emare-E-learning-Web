const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
    websiteName: { type: String, default: 'Emare E-Learning' },
    siteLogo: { type: String, default: '' },
    favicon: { type: String, default: '' },
    theme: { type: String, default: 'light', enum: ['light', 'dark', 'system'] },
    timezone: { type: String, default: 'Africa/Addis_Ababa' },
    language: { type: String, default: 'en' },
    maintenanceMode: { type: Boolean, default: false },
    allowRegistration: { type: Boolean, default: true },
    currency: { type: String, default: 'ETB' },
    contactEmail: { type: String, default: 'support@emareicthub.com' },
    emailFromName: { type: String, default: 'Emare E-Learning' },
    emailFromAddress: { type: String, default: 'support@emareicthub.com' },
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpUsername: { type: String, default: '' },
    smtpPassword: { type: String, default: '' },
    smtpSecure: { type: Boolean, default: true },
    maxUploadSizeMB: { type: Number, default: 25 },
    allowedUploadTypes: { type: String, default: 'jpg,jpeg,png,pdf,doc,docx,ppt,pptx,zip' },
    maxVideoSizeMB: { type: Number, default: 500 },
    videoFormat: { type: String, default: 'mp4' },
    videoTranscodingEnabled: { type: Boolean, default: true },
    storageProvider: { type: String, default: 'cloudinary' },
    storageBucket: { type: String, default: '' },
    backupEnabled: { type: Boolean, default: true },
    backupFrequency: { type: String, default: 'daily' },
    backupRetentionDays: { type: Number, default: 30 },
    backupLocation: { type: String, default: 'local' },
    paymentGatewayActive: { type: Boolean, default: true },
    cloudinaryActive: { type: Boolean, default: true },
    requireEmailVerification: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
