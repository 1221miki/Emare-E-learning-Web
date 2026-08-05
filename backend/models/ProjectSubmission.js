const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({ filename: String, url: String, mimeType: String, size: Number }, { _id: false });

const EvalSchema = new mongoose.Schema({ instructorRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, comments: String, score: Number, createdAt: { type: Date, default: Date.now } }, { _id: false });

const ProjectSubmissionSchema = new mongoose.Schema({
    projectRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    teamRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectTeam' },
    files: [FileSchema],
    message: { type: String },
    submittedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ['Submitted','Under Review','Graded','Returned'], default: 'Submitted' },
    evaluation: [EvalSchema]
}, { timestamps: true });

ProjectSubmissionSchema.index({ projectRef: 1, studentRef: 1 });

module.exports = mongoose.model('ProjectSubmission', ProjectSubmissionSchema);
