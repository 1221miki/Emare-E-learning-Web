const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
    websiteName: { type: String, default: 'Emare E-Learning' },
    maintenanceMode: { type: Boolean, default: false },
    allowRegistration: { type: Boolean, default: true },
    currency: { type: String, default: 'ETB' },
    contactEmail: { type: String, default: 'support@emareicthub.com' },
    paymentGatewayActive: { type: Boolean, default: true },
    cloudinaryActive: { type: Boolean, default: true },
    requireEmailVerification: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
