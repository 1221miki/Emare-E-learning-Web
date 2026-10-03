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
    category: {
        type: String,
        enum: ['Question', 'Help', 'Announcement', 'Idea', 'General'],
        default: 'Question'
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
    tags: {
        type: [String],
        default: []
    },
    attachments: {
        type: [Object],
        default: []
    },
    replies: [ReplySchema],
    bestReplyId: {
        type: mongoose.Schema.Types.ObjectId
    },
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
    },
    upvotedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Discussion', DiscussionSchema);
