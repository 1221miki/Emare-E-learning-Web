const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    category: {
        type: String,
        required: true,
        enum: ['academic', 'exam', 'assignment', 'holiday', 'training', 'event']
    },
    visibility: {
        type: String,
        enum: ['internal', 'public'],
        default: 'internal'
    },
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    location: { type: String, default: '' },
    eventType: {
        type: String,
        enum: ['Online', 'Physical', 'Hybrid'],
        default: 'Physical'
    },
    streamUrl: { type: String, trim: true, default: '' },
    meetingProvider: {
        type: String,
        enum: ['googleMeet', 'zoom', 'microsoftTeams', 'jitsi', 'internal', 'custom'],
        default: 'internal'
    },
    // Real provider meeting resource (populated from the provider API, never fabricated)
    meetingUrl: { type: String, trim: true, default: '' },
    meetingSpaceName: { type: String, trim: true, default: '' },
    meetingProviderId: { type: String, trim: true, default: '' },
    meetingCreatedAt: { type: Date, default: null },
    meetingStatus: {
        type: String,
        enum: ['created', 'preserved', 'failed', 'none'],
        default: 'none'
    },
    meetingMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Virtual meeting & live stream settings (admin-entered or from the provider)
    meetingPlatform: { type: String, trim: true, default: '' },
    meetingInvitees: { type: String, trim: true, default: '' },
    meetingPassword: { type: String, trim: true, default: '' },
    isAllDay: { type: Boolean, default: false },
    color: { type: String, default: '#2563eb' },
    status: {
        type: String,
        enum: ['SCHEDULED', 'CANCELLED'],
        default: 'SCHEDULED'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

calendarEventSchema.index({ startDate: 1, category: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
