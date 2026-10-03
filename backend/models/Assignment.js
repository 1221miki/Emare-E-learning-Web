const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
    filename: String,
    url: String,
    mimeType: String,
    size: Number
}, { _id: false });

const RubricItemSchema = new mongoose.Schema({
    criterion: { type: String, required: true },
    maxPoints: { type: Number, required: true }
});

const AssignmentSchema = new mongoose.Schema({
    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    instructorRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Assignment title is required'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    instructions: {
        type: String,
        default: ''
    },
    moduleRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContentPage'
    },
    lessonRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContentPage'
    },
    // embeddedLessonId: the _id of the embedded lesson inside Course.curriculumTree
    // Used to link this assignment to a specific lesson for completion gating
    embeddedLessonId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    attachments: [AttachmentSchema],
    rubricItems: [RubricItemSchema],
    maxScore: {
        type: Number,
        required: true,
        default: 100
    },
    // passingScore: the minimum grade required for the assignment to count as
    // passed/approved for course completion and certificate eligibility.
    // 0 = any graded submission counts as passed (default).
    passingScore: {
        type: Number,
        default: 0,
        min: 0,
        description: 'Minimum grade (%) required to consider the assignment passed'
    },
    // submissionType: how students are expected to submit.
    // 'file' — upload a file, 'text' — write a text answer, 'both' — either/both.
    submissionType: {
        type: String,
        enum: ['file', 'text', 'both'],
        default: 'both'
    },
    // required: when true this assignment counts toward course completion and
    // certificate eligibility even if it is not linked to a specific lesson.
    required: {
        type: Boolean,
        default: false,
        description: 'Required for course completion / certificate eligibility'
    },
    allowedFileTypes: {
        type: [String],
        default: ['pdf', 'zip', 'doc', 'docx', 'png', 'jpg']
    },
    dueDate: {
        type: Date
    },
    allowLate: {
        type: Boolean,
        default: false
    },
    published: {
        type: Boolean,
        default: false
    },
    // Emare AI Tutor access for this assignment (instructor-controlled).
    // false = students cannot use the AI Tutor while working on this assignment.
    aiTutorEnabled: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

AssignmentSchema.index({ courseRef: 1, createdBy: 1 });

module.exports = mongoose.model('Assignment', AssignmentSchema);
