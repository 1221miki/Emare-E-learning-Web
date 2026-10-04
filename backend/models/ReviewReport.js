const mongoose = require('mongoose');

const ReviewReportSchema = new mongoose.Schema({
    reviewRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
    reporterRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String },
    status: { type: String, enum: ['Pending','Resolved','Dismissed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('ReviewReport', ReviewReportSchema);
