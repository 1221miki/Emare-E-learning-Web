const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
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
    transactionRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    },
    tx_ref: {
        type: String,
        trim: true,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'ETB'
    },
    paymentMethod: {
        type: String,
        enum: ['cbe', 'telebirr', 'chapa', 'dashen', 'other'],
        default: 'chapa'
    },
    providerTransactionId: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed', 'Cancelled'],
        default: 'Pending'
    },
    metadata: {
        type: Object,
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
