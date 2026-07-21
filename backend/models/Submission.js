const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
    assignmentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    studentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileUrl: {
        type: String,
        required: [true, 'Submission file is required']
    },
    fileName: {
        type: String,
        trim: true
    },
    studentNotes: {
        type: String,
        trim: true
    },
    grade: {
        type: Number,
        min: 0,
        default: null
    },
    feedback: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['Submitted', 'Under Review', 'Graded', 'Returned', 'Revision Requested'],
        default: 'Submitted'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    gradedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// A student can only submit once per assignment
SubmissionSchema.index({ assignmentRef: 1, studentRef: 1 }, { unique: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
