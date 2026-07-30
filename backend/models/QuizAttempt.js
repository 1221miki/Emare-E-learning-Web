const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId },
    response: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const QuizAttemptSchema = new mongoose.Schema({
    quizRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: [AnswerSchema],
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    durationSeconds: { type: Number },
    score: { type: Number },
    passed: { type: Boolean },
    isAutoGraded: { type: Boolean, default: true }
}, { timestamps: true });

QuizAttemptSchema.index({ quizRef: 1, studentRef: 1 });

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);
