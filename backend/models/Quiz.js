const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true
    },
    options: {
        type: [String],
        required: true,
        validate: {
            validator: function (v) {
                return v.length >= 2 && v.length <= 6;
            },
            message: 'Options must be between 2 and 6'
        }
    },
    correctAnswerIndex: {
        type: Number,
        required: true,
        min: 0
    }
});

const QuizSchema = new mongoose.Schema({
    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
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
    submissionDeadline: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Quiz', QuizSchema);
