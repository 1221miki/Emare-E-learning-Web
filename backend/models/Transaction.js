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
    // Mirror of metadata.tx_ref so the gateway reference is a first-class,
    // uniquely indexed field. Kept in sync by every writer.
    txRef: { type: String, default: '' },
    // What the provider reported it actually charged — compared against `amount`
    // before access is granted.
    providerAmount: { type: Number, default: null },
    // ...and the currency it settled in, for the same reason.
    providerCurrency: { type: String, default: null },
    paidAt: { type: Date, default: null },
    metadata: { type: Object, default: {} },
    // Store provider webhook/event ids we already processed to ensure idempotency
    processedWebhookIds: { type: [String], default: [] }
}, { timestamps: true });

TransactionSchema.index({ txRef: 1 });
TransactionSchema.index({ 'metadata.tx_ref': 1 });
TransactionSchema.index({ studentRef: 1, status: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
