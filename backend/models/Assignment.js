const mongoose = require('mongoose');

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
        required: true
    },
    dueDate: {
        type: Date,
        required: [true, 'Due date is required']
    },
    maxScore: {
        type: Number,
        required: true,
        default: 100
    },
    rubricItems: [RubricItemSchema],
    allowedFileTypes: {
        type: [String],
        default: ['pdf', 'zip', 'doc', 'docx', 'png', 'jpg']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Assignment', AssignmentSchema);
