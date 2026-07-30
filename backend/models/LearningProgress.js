const mongoose = require('mongoose');

const ResourceProgressSchema = new mongoose.Schema({
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    chapterIndex: {
        type: Number,
        default: 0
    },
    lessonIndex: {
        type: Number,
        default: 0
    },
    lessonTitle: {
        type: String,
        trim: true,
        default: ''
    },
    lastWatchedPosition: {
        type: Number,
        default: 0
    },
    completed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
    },
    documentRead: {
        type: Boolean,
        default: false
    },
    resourceDownloads: {
        type: Number,
        default: 0
    }
});

const LearningProgressSchema = new mongoose.Schema({
    studentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    lastLessonRef: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    lastChapterIndex: {
        type: Number,
        default: 0
    },
    lastLessonIndex: {
        type: Number,
        default: 0
    },
    lastWatchedPosition: {
        type: Number,
        default: 0
    },
    completionPercentage: {
        type: Number,
        default: 0
    },
    progressItems: {
        type: [ResourceProgressSchema],
        default: []
    }
}, {
    timestamps: true
});

LearningProgressSchema.index({ studentRef: 1, courseRef: 1 }, { unique: true });

module.exports = mongoose.model('LearningProgress', LearningProgressSchema);
