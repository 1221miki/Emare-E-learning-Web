const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: [true, 'Slug is required'],
        unique: true,
        trim: true,
        lowercase: true
    },
    title: {
        type: String,
        required: [true, 'Event title is required'],
        minlength: [10, 'Title must be at least 10 characters'],
        trim: true
    },
    category: { type: String, trim: true, default: 'Masterclass' },
    visibility: {
        type: String,
        enum: ['internal', 'public'],
        default: 'public'
    },
    tagline: { type: String, trim: true, default: '' },
    description: {
        type: [String],
        default: []
    },
    // Type of event: where it happens
    eventType: {
        type: String,
        enum: ['Physical', 'Online', 'Hybrid'],
        default: 'Physical'
    },
    venue: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
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
    meetingId: { type: String, trim: true, default: '' },
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
    // Validated, deduplicated invitee emails (parsed from meetingInvitees on save)
    invitees: { type: [String], default: [] },
    meetingPassword: { type: String, trim: true, default: '' },
    // Scheduling
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    startTime: { type: String, trim: true, default: '15:00' },
    endTime: { type: String, trim: true, default: '18:30' },
    timeLabel: { type: String, trim: true, default: '' },
    allDay: { type: Boolean, default: false },
    // Pricing & capacity
    price: { type: String, trim: true, default: 'FREE' },
    currency: { type: String, trim: true, default: 'ETB' },
    totalSlots: { type: Number, default: 0, min: 0 },
    // Media
    image: { type: String, trim: true, default: '' },
    gallery: { type: [String], default: [] },
    speaker: {
        name: { type: String, trim: true, default: '' },
        role: { type: String, trim: true, default: '' },
        avatar: { type: String, trim: true, default: '' },
        bio: { type: String, trim: true, default: '' }
    },
    // ── Moderation / Status Pipeline ───────────────────────────
    status: {
        type: String,
        enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
        default: 'DRAFT'
    },
    isFeatured: { type: Boolean, default: false },
    registrationEnabled: { type: Boolean, default: true },
    reviewNote: { type: String, trim: true, default: '' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    publishedAt: { type: Date },
    // Registered (logged-in) user references — guests are tracked via EventRegistration
    registeredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Snapshot of the last validation run
    lastValidation: {
        passed: { type: Boolean, default: false },
        checkedAt: { type: Date },
        checks: { type: [mongoose.Schema.Types.Mixed], default: [] }
    }
}, {
    timestamps: true
});

EventSchema.index({ slug: 1 }, { unique: true });
EventSchema.index({ status: 1, startDate: -1 });
EventSchema.index({ title: 'text' });

module.exports = mongoose.model('Event', EventSchema);
