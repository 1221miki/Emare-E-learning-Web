const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
    authorRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    body: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

const DiscussionSchema = new mongoose.Schema({
    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    authorRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Discussion title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    body: {
        type: String,
        required: [true, 'Discussion body is required'],
        trim: true
    },
    replies: [ReplySchema],
    isPinned: {
        type: Boolean,
        default: false
    },
    isResolved: {
        type: Boolean,
        default: false
    },
    upvotes: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Discussion', DiscussionSchema);
