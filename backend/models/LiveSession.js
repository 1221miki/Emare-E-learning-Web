const mongoose = require('mongoose');

const LiveSessionSchema = new mongoose.Schema({
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
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    startTime: {
        type: Date,
        required: true
    },
    durationMinutes: {
        type: Number,
        required: true
    },
    meetingLink: {
        type: String,
        required: true
    },
    meetingPassword: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('LiveSession', LiveSessionSchema);
