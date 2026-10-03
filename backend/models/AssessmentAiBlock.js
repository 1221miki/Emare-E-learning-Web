const mongoose = require('mongoose');

// Tracks students who currently have an AI-Tutor-disabled assessment open.
// A document is created server-side when a student opens a restricted quiz or
// assignment, and automatically expires. While an unexpired record exists for
// the student, every Emare AI Tutor endpoint rejects their requests — so the
// restriction cannot be bypassed by calling the API directly.
const AssessmentAiBlockSchema = new mongoose.Schema({
    studentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    quizRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        default: null
    },
    assignmentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        default: null
    },
    reason: {
        type: String,
        default: 'Emare AI Tutor is disabled for this assessment.'
    },
    // TTL index — Mongo removes the document automatically once expired
    expiresAt: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

AssessmentAiBlockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AssessmentAiBlockSchema.index({ studentRef: 1, quizRef: 1 }, { unique: true, sparse: true });
AssessmentAiBlockSchema.index({ studentRef: 1, assignmentRef: 1 }, { unique: true, sparse: true });

AssessmentAiBlockSchema.statics.BLOCK_MESSAGE = 'Emare AI Tutor is disabled for this assessment.';

module.exports = mongoose.model('AssessmentAiBlock', AssessmentAiBlockSchema);
