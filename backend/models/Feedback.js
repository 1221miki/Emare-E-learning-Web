const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    instructorRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: { type: String, enum: ['Content','Video','Instructor','Difficulty','UX','Other'], default: 'Other' },
    content: { type: String, required: true },
    status: { type: String, enum: ['Open','InProgress','Closed'], default: 'Open' },
    response: { type: String },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);
