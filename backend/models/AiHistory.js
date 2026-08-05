const mongoose = require('mongoose');

const AiHistorySchema = new mongoose.Schema({
    userRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    conversationId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        default: 'chat'
    },
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    },
    courseContext: {
        type: Object,
        default: {}
    },
    conversationTitle: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('AiHistory', AiHistorySchema);
