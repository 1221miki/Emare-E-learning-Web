const mongoose = require('mongoose');

const CONTACT_STATUSES = ['unread', 'read', 'replied', 'closed'];

const ContactMessageSchema = new mongoose.Schema({
    // Linked authenticated user (null for guest submissions)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [120, 'Name must be 120 characters or less']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        maxlength: [30, 'Phone number must be 30 characters or less']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        maxlength: [254, 'Email must be 254 characters or less'],
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        minlength: [5, 'Message must be at least 5 characters'],
        maxlength: [5000, 'Message must be 5000 characters or less']
    },
    status: {
        type: String,
        enum: CONTACT_STATUSES,
        default: 'unread',
        index: true
    },
    adminResponse: {
        type: String,
        trim: true,
        default: '',
        maxlength: [5000, 'Response must be 5000 characters or less']
    },
    respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    respondedByName: {
        type: String,
        trim: true,
        default: ''
    },
    respondedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

ContactMessageSchema.index({ status: 1, createdAt: -1 });
ContactMessageSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ContactMessage', ContactMessageSchema);
module.exports.CONTACT_STATUSES = CONTACT_STATUSES;
