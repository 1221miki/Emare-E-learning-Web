const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    type: { type: String, enum: ['mcq','tf','short','multi','matching','fill'], default: 'mcq' },
    options: { type: [String], default: [] }, // for mcq, multi, matching (left/right stored in paired way)
    correctAnswerIndex: { type: Number }, // for single-choice
    correctAnswers: { type: [String], default: [] }, // for multi-select or text answers
    matchingPairs: { type: [{ left: String, right: String }], default: [] },
    points: { type: Number, default: 1 },
    explanation: { type: String, default: '' }
});

const QuizSchema = new mongoose.Schema({
    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    // lessonRef: optional — links this quiz to a specific embedded lesson (_id inside curriculumTree)
    // When set, this quiz gates lesson completion when the lesson has quizRequired: true
    lessonRef: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    quizTitle: {
        type: String,
        required: true,
        trim: true
    },
    allottedDurationMinutes: {
        type: Number,
        required: true,
        min: [5, 'Quiz must be at least 5 minutes'],
        max: [180, 'Quiz cannot exceed 180 minutes']
    },
    passingScoreThreshold: {
        type: Number,
        default: 60.0,
        min: 0,
        max: 100
    },
    questionArray: [QuestionSchema],
    submissionDeadline: { type: Date },
    attemptLimit: { type: Number, default: 1 },
    allowReview: { type: Boolean, default: true },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Quiz', QuizSchema);
