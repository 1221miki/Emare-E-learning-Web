const Project = require('../models/Project');
const ProjectTeam = require('../models/ProjectTeam');
const ProjectSubmission = require('../models/ProjectSubmission');
const Rubric = require('../models/Rubric');
const Enrollment = require('../models/Enrollment');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');

exports.createProject = async (req, res) => {
    try {
        const payload = req.body;
        const project = await Project.create({ ...payload, createdBy: req.user._id });
        res.status(201).json({ success: true, data: project });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create project' });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        Object.assign(project, req.body);
        await project.save();
        res.json({ success: true, data: project });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.getProject = async (req, res) => {
    try { const project = await Project.findById(req.params.id).populate('createdBy'); if (!project) return res.status(404).json({ success: false }); res.json({ success: true, data: project }); } catch (err) { next(err); }
};

exports.getProjectsByCourse = async (req, res) => {
    try { const projects = await Project.find({ courseRef: req.params.courseId, published: true }).sort({ dueDate: 1 }); res.json({ success: true, data: projects }); } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Failed to list projects' }); }
};

exports.getMyProjects = async (req, res) => {
    try {
        const enrolls = await Enrollment.find({ studentRef: req.user._id }).select('courseRef');
        const courseIds = enrolls.map(e => e.courseRef);
        const projects = await Project.find({ courseRef: { $in: courseIds }, published: true }).sort({ dueDate: 1 });
        res.json({ success: true, data: projects });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

// Team creation with optional invite code
exports.createTeam = async (req, res) => {
    try {
        const { projectId, name } = req.body;
        const inviteCode = Math.random().toString(36).slice(2,8).toUpperCase();
        const team = await ProjectTeam.create({ projectRef: projectId, name, inviteCode, createdBy: req.user._id, members: [{ userRef: req.user._id, role: 'Owner' }] });
        res.status(201).json({ success: true, data: team });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.joinTeamByInvite = async (req, res) => {
    try {
        const { inviteCode, teamId } = req.body;
        const team = await ProjectTeam.findOne({ _id: teamId, inviteCode });
        if (!team) return res.status(404).json({ success: false, message: 'Team not found or invalid invite' });
        if (team.members.some(m => m.userRef.toString() === req.user._id.toString())) return res.json({ success: true, data: team });
        team.members.push({ userRef: req.user._id, role: 'Member' });
        await team.save();
        res.json({ success: true, data: team });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

// Multipart submission (files uploaded directly)
exports.submitProjectMultipart = async (req, res) => {
    try {
        const projectId = req.params.id;
        const message = req.body.message || '';
        const teamRef = req.body.teamRef || null;
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files attached' });

        const uploaded = [];
        for (const file of req.files) {
            const resourceType = file.mimetype.startsWith('image/') ? 'image' : (file.mimetype === 'application/pdf' ? 'raw' : 'auto');
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ folder: 'emare_elms/projects', resource_type: resourceType }, (err, result) => { if (err) reject(err); else resolve(result); });
                streamifier.createReadStream(file.buffer).pipe(stream);
            });
            uploaded.push({ filename: file.originalname, url: result.secure_url, mimeType: file.mimetype, size: file.size });
        }

        const previous = await ProjectSubmission.findOne({ projectRef: projectId, studentRef: req.user._id, teamRef }).sort({ version: -1 });
        const version = previous ? previous.version + 1 : 1;
        const submission = await ProjectSubmission.create({ projectRef: projectId, studentRef: req.user._id, teamRef, files: uploaded, message, version, status: 'Submitted' });
        res.status(201).json({ success: true, data: submission });
    } catch (err) { console.error('Project submit error', err); res.status(500).json({ success: false, message: 'Failed to submit project' }); }
};

exports.getSubmissionsForProject = async (req, res) => {
    try { const subs = await ProjectSubmission.find({ projectRef: req.params.id }).populate('studentRef teamRef'); res.json({ success: true, data: subs }); } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.getMySubmissions = async (req, res) => {
    try { const subs = await ProjectSubmission.find({ $or: [{ studentRef: req.user._id }, { teamRef: { $in: await ProjectTeam.find({ 'members.userRef': req.user._id }).distinct('_id') } }] }).populate('projectRef'); res.json({ success: true, data: subs }); } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.gradeSubmission = async (req, res) => {
    try {
        const submission = await ProjectSubmission.findById(req.params.submissionId);
        if (!submission) return res.status(404).json({ success: false });
        const { score, comments } = req.body;
        submission.evaluation = submission.evaluation || [];
        submission.evaluation.push({ instructorRef: req.user._id, comments, score });
        submission.status = 'Graded';
        await submission.save();
        res.json({ success: true, data: submission });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

module.exports = exports;
