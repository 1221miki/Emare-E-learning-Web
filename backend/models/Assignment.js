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
