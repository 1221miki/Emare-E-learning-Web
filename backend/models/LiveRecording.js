const mongoose = require('mongoose');

const LiveRecordingSchema = new mongoose.Schema({
    liveSession: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LiveSession',
        required: true,
        index: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    instructor: {
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
    videoUrl: {
        type: String,
        required: true
    },
    thumbnailUrl: {
        type: String,
        default: ''
    },
    storageProvider: {
        type: String,
        enum: ['bunny', 'cloudinary', 'zoom', 'googleMeet', 'other'],
        default: 'bunny'
    },
    fileName: {
        type: String,
        default: ''
    },
    fileSize: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['processing', 'available', 'failed', 'draft'],
        default: 'processing',
        index: true
    },
    isPublished: {
        type: Boolean,
        default: false,
        index: true
    },
    publishedAt: {
        type: Date,
        default: null
    },
    recordingStartTime: {
        type: Date
    },
    recordingEndTime: {
        type: Date
    }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

LiveRecordingSchema.index({ course: 1, isPublished: 1 });
LiveRecordingSchema.index({ instructor: 1 });

module.exports = mongoose.model('LiveRecording', LiveRecordingSchema);