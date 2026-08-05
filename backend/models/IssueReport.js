const mongoose = require('mongoose');

const IssueReportSchema = new mongoose.Schema({
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    category: { type: String, enum: ['Video','Payment','Access','Content','Other'], default: 'Other' },
    description: { type: String, required: true },
    attachments: { type: [String], default: [] },
    status: { type: String, enum: ['Open','Investigating','Resolved','Closed'], default: 'Open' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('IssueReport', IssueReportSchema);
