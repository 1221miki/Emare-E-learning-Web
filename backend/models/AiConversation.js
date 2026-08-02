const mongoose = require('mongoose');

const AiConversationSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        default: 'AI Tutor Session'
    },
    courseContext: {
        type: Object,
        default: {}
    },
    meta: {
        type: Object,
        default: {}
    },
    lastMessage: {
        type: String,
        default: ''
    },
    lastInteractionAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('AiConversation', AiConversationSchema);
