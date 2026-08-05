const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    instructorRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    reviewText: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    likes: { type: Number, default: 0 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    instructorReply: { type: String, trim: true, default: '' },
    instructorReplyDate: { type: Date },
    helpfulVotes: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: true }
}, { timestamps: true });

ReviewSchema.index({ studentRef: 1, courseRef: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
