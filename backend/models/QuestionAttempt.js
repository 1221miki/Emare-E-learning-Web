const mongoose = require('mongoose');

/**
 * QuestionAttempt
 *
 * Tracks per-question quiz attempts for the three-attempt answer-and-reveal
 * system. One document exists per (student, quiz, question).
 *
 * Storing the attempt/reveal state server-side means a student cannot bypass
 * the three-attempt rule or the "answer revealed" state by refreshing the
 * page, logging out, or opening the quiz in another tab.
 */
const QuestionAttemptSchema = new mongoose.Schema({
    studentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    quizRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
        index: true
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    // Number of wrong selections made for this question.
    attemptsUsed: {
        type: Number,
        default: 0,
        min: 0,
        max: 3
    },
    // True once the student has exhausted all three attempts and the correct
    // answer has been revealed. Permanently persisted so a refresh can't hide
    // the revealed answer again.
    correctAnswerRevealed: {
        type: Boolean,
        default: false
    },
    // True once the student has (eventually) selected/entered the correct
    // answer, marking this question as completed.
    answered: {
        type: Boolean,
        default: false
    },
    // The selected index of the correct answer once the student completes it.
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Enforce a single tracking row per (student, quiz, question).
QuestionAttemptSchema.index({ studentRef: 1, quizRef: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('QuestionAttempt', QuestionAttemptSchema);
