const mongoose = require('mongoose');

const RefundRequestSchema = new mongoose.Schema({
    transactionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String },
    status: { type: String, enum: ['Pending','Approved','Rejected','Processed'], default: 'Pending' },
    processedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('RefundRequest', RefundRequestSchema);
