const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({ filename: String, url: String, mimeType: String, size: Number }, { _id: false });

const ProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    courseRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentPage' },
    description: { type: String, default: '' },
    objectives: { type: [String], default: [] },
    requirements: { type: String, default: '' },
    attachments: [AttachmentSchema],
    difficulty: { type: String, enum: ['Beginner','Intermediate','Advanced'], default: 'Intermediate' },
    dueDate: { type: Date },
    allowGroup: { type: Boolean, default: false },
    allowResubmission: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

ProjectSchema.index({ courseRef: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
