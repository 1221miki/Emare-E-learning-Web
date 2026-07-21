const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
    userRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'LOGIN', 'LOGOUT', 'REGISTER',
            'COURSE_CREATE', 'COURSE_UPDATE', 'COURSE_DELETE', 'COURSE_APPROVE',
            'ENROLLMENT_CREATE', 'PAYMENT_UPLOAD', 'PAYMENT_CLEAR',
            'QUIZ_SUBMIT', 'ASSIGNMENT_SUBMIT', 'ASSIGNMENT_GRADE',
            'REVIEW_CREATE', 'CERTIFICATE_ISSUE',
            'USER_UPDATE', 'USER_DEACTIVATE', 'PASSWORD_RESET'
        ]
    },
    targetType: {
        type: String,
        enum: ['User', 'Course', 'Enrollment', 'Quiz', 'Assignment', 'Review', 'Certificate', 'System']
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId
    },
    description: {
        type: String,
        trim: true
    },
    ipAddress: {
        type: String
    }
}, {
    timestamps: { createdAt: 'timestamp' }
});

// Index for fast admin queries
ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ userRef: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
