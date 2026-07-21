const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipientRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'enrollment', 'payment', 'grade', 'quiz',
            'announcement', 'certificate', 'badge',
            'review', 'assignment', 'system'
        ],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    link: {
        type: String,
        default: ''
    },
    isRead: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: { createdAt: 'createdAt' }
});

// Index for fast unread queries
NotificationSchema.index({ recipientRef: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
