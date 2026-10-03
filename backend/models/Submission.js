const mongoose = require('mongoose');

const FileMetaSchema = new mongoose.Schema({
    filename: String,
    url: String,
    mimeType: String,
    size: Number
}, { _id: false });

const FeedbackSchema = new mongoose.Schema({
    instructorRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comments: String,
    score: Number,
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

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
    files: [FileMetaSchema],
    fileUrl: {
        type: String,
        default: ''
    },
    fileName: {
        type: String,
        trim: true
    },
    studentNotes: {
        type: String,
        trim: true,
        default: ''
    },
    message: {
        type: String,
        default: ''
    },
    grade: {
        type: Number,
        min: 0,
        default: null
    },
    feedback: [FeedbackSchema],
    status: {
        type: String,
        enum: ['Submitted', 'Pending Review', 'Under Review', 'Graded', 'Returned', 'Revision Requested'],
        default: 'Submitted'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    gradedAt: {
        type: Date
    },
    version: {
        type: Number,
        default: 1
    },
    allowResubmission: {
        type: Boolean,
        default: false
    },
    previousSubmissionRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Submission'
    }
}, {
    timestamps: true
});

SubmissionSchema.index({ assignmentRef: 1, studentRef: 1 }, { unique: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
