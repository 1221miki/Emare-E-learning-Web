const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    courseRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    eventRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'ETB' },
    status: { type: String, enum: ['Pending','Completed','Failed','Cancelled','Refunded'], default: 'Pending' },
    provider: { type: String },
    providerTransactionId: { type: String },
    metadata: { type: Object, default: {} },
    // Store provider webhook/event ids we already processed to ensure idempotency
    processedWebhookIds: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
