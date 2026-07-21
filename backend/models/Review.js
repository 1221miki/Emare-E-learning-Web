const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    studentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: 1,
        max: 5
    },
    reviewText: {
        type: String,
        required: [true, 'Review text is required'],
        trim: true,
        maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
    instructorReply: {
        type: String,
        trim: true,
        default: ''
    },
    instructorReplyDate: {
        type: Date
    },
    helpfulVotes: {
        type: Number,
        default: 0
    },
    isApproved: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// A student can only review a course once
ReviewSchema.index({ studentRef: 1, courseRef: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
