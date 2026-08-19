const mongoose = require('mongoose');

const EventRegistrationSchema = new mongoose.Schema({
    eventRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    city: { type: String, trim: true, default: '' },
    selectedDate: { type: String, trim: true, default: '' },
    selectedSlot: { type: String, trim: true, default: '' },
    status: {
        type: String,
        enum: ['confirmed', 'waitlisted', 'cancelled'],
        default: 'confirmed'
    },
    bookingRef: { type: String, trim: true }
}, {
    timestamps: true
});

// Prevent duplicate registrations for the same person + event + slot
EventRegistrationSchema.index({ eventRef: 1, phone: 1, selectedSlot: 1 }, { unique: true });

module.exports = mongoose.model('EventRegistration', EventRegistrationSchema);
