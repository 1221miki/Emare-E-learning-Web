const mongoose = require('mongoose');

// One attempt at an in-video quiz checkpoint embedded in a lesson video.
// Attempts are graded server-side (correct answers never sent to the client
// before submission) and recorded so instructors can review learning progress.
const InVideoQuizAttemptSchema = new mongoose.Schema({
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
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    checkpointId: {
        type: String,
        required: true
    },
    checkpointIndex: {
        type: Number,
        required: true,
        min: 0
    },
    checkpointTimestamp: {
        type: Number,
        default: 0
    },
    // [{ questionIndex, selectedIndex, isCorrect }]
    answers: [{
        _id: false,
        questionIndex: { type: Number, required: true },
        selectedIndex: { type: Number, required: true },
        isCorrect: { type: Boolean, required: true }
    }],
    scorePercent: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    correctCount: {
        type: Number,
        default: 0
    },
    totalQuestions: {
        type: Number,
        default: 0
    },
    passed: {
        type: Boolean,
        default: false
    },
    attemptNumber: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

InVideoQuizAttemptSchema.index({ studentRef: 1, courseRef: 1, lessonId: 1, checkpointId: 1, createdAt: -1 });

module.exports = mongoose.model('InVideoQuizAttempt', InVideoQuizAttemptSchema);
