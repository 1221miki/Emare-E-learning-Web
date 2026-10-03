const mongoose = require('mongoose');

const TeamMemberSchema = new mongoose.Schema({ userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: { type: String, default: 'Member' } }, { _id: false });

const ProjectTeamSchema = new mongoose.Schema({
    projectRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    name: { type: String, required: true },
    members: [TeamMemberSchema],
    inviteCode: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

ProjectTeamSchema.index({ projectRef: 1 });

module.exports = mongoose.model('ProjectTeam', ProjectTeamSchema);
