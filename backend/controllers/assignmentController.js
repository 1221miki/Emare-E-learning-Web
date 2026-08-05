const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Enrollment = require('../models/Enrollment');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const { createNotification } = require('./notificationController');

const getUserId = (req) => req.user?._id || req.user?.id;

exports.createAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.create({
            ...req.body,
            createdBy: getUserId(req),
            instructorRef: getUserId(req)
        });
        res.status(201).json({ success: true, data: assignment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        Object.assign(assignment, req.body);
        await assignment.save();
        res.json({ success: true, data: assignment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update assignment' });
    }
};

exports.getAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id).populate('courseRef createdBy');
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
        res.json({ success: true, data: assignment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch assignment' });
    }
};

exports.getAssignmentsByCourse = async (req, res) => {
    try {
        const assignments = await Assignment.find({ courseRef: req.params.courseId }).sort({ dueDate: 1 });
        res.json({ success: true, data: assignments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to list assignments' });
    }
};

exports.getMyAssignments = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ studentRef: getUserId(req) }).select('courseRef');
        const courseIds = enrollments.map(e => e.courseRef);
        const assignments = await Assignment.find({ courseRef: { $in: courseIds }, published: true }).sort({ dueDate: 1 });
        res.json({ success: true, data: assignments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch your assignments' });
    }
};

exports.submitAssignment = async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const { files = [], message = '', fileUrl, fileName, studentNotes } = req.body;

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        if (new Date() > new Date(assignment.dueDate)) {
            return res.status(400).json({ success: false, message: 'Assignment submission deadline has passed' });
        }

        const previous = await Submission.findOne({ assignmentRef: assignmentId, studentRef: getUserId(req) }).sort({ version: -1 });
        const version = previous ? previous.version + 1 : 1;

        const submission = await Submission.create({
            assignmentRef: assignmentId,
            studentRef: getUserId(req),
            files,
            message,
            version,
            status: 'Submitted',
            fileUrl,
            fileName,
            studentNotes
        });

        await createNotification({
            recipientRef: assignment.instructorRef || assignment.createdBy,
            type: 'assignment',
            title: 'New Assignment Submission',
            message: `A student submitted "${assignment.title || 'an assignment'}".`,
            link: '/instructor/dashboard'
        });

        res.status(201).json({ success: true, data: submission });
    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'You have already submitted this assignment' });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.submitAssignmentMultipart = async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const message = req.body.message || '';

        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files attached' });

        const uploadedFiles = [];

        for (const file of req.files) {
            const resourceType = file.mimetype.startsWith('image/') ? 'image' : (file.mimetype === 'application/pdf' ? 'raw' : 'auto');
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({ folder: 'emare_elms/assignments', resource_type: resourceType }, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
                streamifier.createReadStream(file.buffer).pipe(uploadStream);
            }).catch(err => {
                console.warn('Cloud upload failed, falling back to local for file', file.originalname, err.message);
                const fs = require('fs');
                const path = require('path');
                const uploadsDir = path.join(__dirname, '../public/uploads');
                if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                const ext = path.extname(file.originalname) || '';
                const filename = `assign_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
                const filePath = path.join(uploadsDir, filename);
                fs.writeFileSync(filePath, file.buffer);
                const protocol = 'http';
                const host = req.get('host') || 'localhost:5000';
                return { secure_url: `${protocol}://${host}/uploads/${filename}`, public_id: filename, format: ext.replace('.', '') };
            });

            uploadedFiles.push({ filename: file.originalname, url: result.secure_url, mimeType: file.mimetype, size: file.size });
        }

        const previous = await Submission.findOne({ assignmentRef: assignmentId, studentRef: getUserId(req) }).sort({ version: -1 });
        const version = previous ? previous.version + 1 : 1;

        const submission = await Submission.create({
            assignmentRef: assignmentId,
            studentRef: getUserId(req),
            files: uploadedFiles,
            message,
            version,
            status: 'Submitted'
        });

        res.status(201).json({ success: true, data: submission });
    } catch (err) {
        console.error('Multipart submission error', err);
        res.status(500).json({ success: false, message: 'Failed to submit assignment' });
    }
};

exports.getSubmissionsForAssignment = async (req, res) => {
    try {
        const subs = await Submission.find({ assignmentRef: req.params.id }).populate('studentRef');
        res.json({ success: true, data: subs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
    }
};

exports.getMySubmissions = async (req, res) => {
    try {
        const subs = await Submission.find({ studentRef: getUserId(req) }).populate('assignmentRef');
        res.json({ success: true, data: subs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
    }
};

exports.gradeSubmission = async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.submissionId);
        if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

        const { score, comments, allowResubmission } = req.body;
        submission.grade = score;
        submission.status = 'Graded';
        submission.allowResubmission = !!allowResubmission;
        submission.feedback = submission.feedback || [];
        submission.feedback.push({ instructorRef: getUserId(req), comments, score });
        await submission.save();

        res.json({ success: true, data: submission });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to grade submission' });
    }
};

exports.getCourseAssignments = async (req, res) => {
    try {
        const assignments = await Assignment.find({ courseRef: req.params.courseId, isActive: true }).sort('dueDate');
        res.status(200).json({ success: true, data: assignments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getSubmissions = async (req, res) => {
    try {
        const submissions = await Submission.find({ assignmentRef: req.params.id })
            .populate('studentRef', 'fullName accountEmail avatarUrl')
            .sort('-submittedAt');
        res.status(200).json({ success: true, data: submissions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
