const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
    filename: String,
    url: String,
    mimeType: String,
    size: Number
}, { _id: false });

const MessageSchema = new mongoose.Schema({
    conversationRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    senderRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    body: {
        type: String,
        required: true
    },
    attachments: [AttachmentSchema],
    isRead: {
        type: Boolean,
        default: false
    },
    isReadBy: {
        type: [mongoose.Schema.Types.ObjectId],
        default: []
    }
}, { timestamps: true });
module.exports = mongoose.model('Message', MessageSchema);
