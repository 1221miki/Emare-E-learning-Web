const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    attachments: { type: [Object], default: [] },
    targetCourses: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    targetRoles: { type: [String], default: [] },
    publishAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
