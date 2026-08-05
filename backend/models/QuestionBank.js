const mongoose = require('mongoose');

const BankQuestionSchema = new mongoose.Schema({
    authorRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    courseRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    questionText: { type: String, required: true },
    type: { type: String, enum: ['mcq','tf','short','multi','matching','fill'], default: 'mcq' },
    options: { type: [String], default: [] },
    correctAnswerIndex: Number,
    correctAnswers: { type: [String], default: [] },
    matchingPairs: { type: [{ left: String, right: String }], default: [] },
    difficulty: { type: String, enum: ['Easy','Medium','Hard'], default: 'Medium' },
    topics: { type: [String], default: [] },
    explanation: { type: String, default: '' },
    tags: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('QuestionBank', BankQuestionSchema);
