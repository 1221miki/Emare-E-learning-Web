const mongoose = require('mongoose');

const oAuthTokenSchema = new mongoose.Schema({
    provider: { type: String, required: true, unique: true, index: true },
    refreshToken: { type: String, required: true },
    email: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('OAuthToken', oAuthTokenSchema);
