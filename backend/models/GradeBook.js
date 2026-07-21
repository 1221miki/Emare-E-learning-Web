const mongoose = require('mongoose');

const GradeBookSchema = new mongoose.Schema({
    studentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assessmentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz', // Could also reference an Assignment ID
        required: true
    },
    numericalScoreEarned: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    submittedRepositoryURL: {
        type: String,
        trim: true
    },
    instructorReviewNotes: {
        type: String,
        trim: true
    },
    submissionTimestamp: {
        type: Date,
        default: Date.now
    },
    gradingTimestamp: {
        type: Date
    },
    isGraded: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('GradeBook', GradeBookSchema);
