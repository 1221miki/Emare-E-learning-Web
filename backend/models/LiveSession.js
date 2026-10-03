const mongoose = require('mongoose');

const LiveSessionSchema = new mongoose.Schema({
    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    instructorRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    startTime: {
        type: Date,
        required: true
    },
    actualStartTime: {
        type: Date,
        default: null
    },
    actualEndTime: {
        type: Date,
        default: null
    },
    durationMinutes: {
        type: Number,
        required: true
    },
    platform: {
        type: String,
        enum: ['Zoom', 'Google Meet', 'Jitsi Meet', 'Custom'],
        default: 'Jitsi Meet'
    },
    meetingLink: {
        type: String,
        default: ''
    },
    meetingProvider: {
        type: String,
        enum: ['zoom', 'googleMeet', 'jitsi', 'custom', ''],
        default: ''
    },
    meetingProviderId: {
        type: String,
        default: ''
    },
    meetingPassword: {
        type: String
    },
    status: {
        type: String,
        enum: ['upcoming', 'live', 'ended', 'cancelled'],
        default: 'upcoming',
        index: true
    },
    isLive: {
        type: Boolean,
        default: false
    },
    recordingStatus: {
        type: String,
        enum: ['not_started', 'recording', 'processing', 'available', 'failed'],
        default: 'not_started'
    },
    recording: {
        recordingId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveRecording', default: null },
        recordingUrl: { type: String, default: '' },
        thumbnailUrl: { type: String, default: '' },
        fileName: { type: String, default: '' },
        fileSize: { type: Number, default: 0 },
        duration: { type: Number, default: 0 },
        recordingStartTime: { type: Date, default: null },
        recordingEndTime: { type: Date, default: null },
        storageProvider: { type: String, default: '' },
        uploadStatus: { type: String, enum: ['pending', 'uploading', 'completed', 'failed'], default: 'pending' }
    },
    attendance: [{
        userRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fullName: {
            type: String
        },
        checkedInAt: {
            type: Date,
            default: Date.now
        }
    }],
    reservations: [{
        userRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reservedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('LiveSession', LiveSessionSchema);