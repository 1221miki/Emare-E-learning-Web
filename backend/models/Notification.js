const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipientRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: [
            'enrollment', 'payment', 'grade', 'quiz',
            'announcement', 'certificate', 'badge',
            'review', 'assignment', 'system'
        ],
        default: 'system'
    },
    title: {
        type: String,
        trim: true,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    body: {
        type: String,
        default: ''
    },
    link: {
        type: String,
        default: ''
    },
    isRead: {
        type: Boolean,
        default: false
    },
    read: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    meta: {
        type: Object,
        default: {}
    }
}, {
    timestamps: { createdAt: 'createdAt' }
});

NotificationSchema.index({ recipientRef: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
