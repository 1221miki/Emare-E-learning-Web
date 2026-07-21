const mongoose = require('mongoose');

const EnrollmentSchema = new mongoose.Schema({
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
    completionPercentage: {
        type: Number,
        default: 0.0,
        min: 0,
        max: 100
    },
    paymentSlipUrl: {
        type: String,
        default: ''
    },
    paymentStatus: {
        type: String,
        enum: ['Unpaid', 'Pending Verification', 'Cleared'],
        default: 'Unpaid'
    },
    tuitionClearanceFlag: {
        type: Boolean,
        default: false // Requires admin manual confirmation
    },
    enrollmentTimestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Ensure a student can only enroll in a course once
EnrollmentSchema.index({ studentRef: 1, courseRef: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', EnrollmentSchema);
