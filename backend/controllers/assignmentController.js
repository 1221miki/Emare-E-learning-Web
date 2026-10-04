const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Enrollment = require('../models/Enrollment');
const AssessmentAiBlock = require('../models/AssessmentAiBlock');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const { createNotification } = require('./notificationController');
const { getAssignmentAccess, getSequenceForStudent } = require('../services/sequenceService');

const getUserId = (req) => req.user?._id || req.user?.id;

// Annotate the student-facing assignment list with its sequential unlock state
// so the UI can grey out (but never truly forbid) locked assignments. The real
// enforcement happens server-side on submit/grade.
const annotateSequence = async (courseId, studentRef, assignments) => {
    if (!courseId || assignments.length === 0) return assignments;
    try {
        const seq = await getSequenceForStudent(courseId, studentRef);
        return assignments.map((a) => {
            const obj = a.toObject ? a.toObject() : a;
            const entry = seq.byAssignmentId.get(String(obj._id));
            if (entry) {
                obj.lessonTitle = entry.title;
                obj.quizRequired = entry.quizRequired;
                obj.quizPassed = entry.quizStatus.passed;
                obj.sequenceLocked = !entry.unlocked;
                obj.sequenceLockReason = entry.unlocked ? null : (entry.lockReason || null);
            } else {
                obj.lessonTitle = null;
                obj.quizRequired = false;
                obj.quizPassed = true;
                obj.sequenceLocked = false;
                obj.sequenceLockReason = null;
            }
            obj.sequenceStatus = entry ? entry.assignmentStatus : null;
            return obj;
        });
    } catch (err) {
        return assignments;
    }
};

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

        if (req.user.assignedRole === 'Student') {
            const access = await getAssignmentAccess(getUserId(req), assignment);
            if (!access.granted) {
                return res.status(403).json({
                    success: false,
                    message: access.reason,
                    lessonLocked: true,
                    lockReason: access.reason
                });
            }
            const obj = assignment.toObject();
            obj.lessonTitle = access.lesson;
            obj.quizRequired = obj.lessonTitle ? true : false;
            obj.quizPassed = access.quizPassed;
            return res.json({ success: true, data: obj });
        }

        res.json({ success: true, data: assignment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch assignment' });
    }
};

exports.getAssignmentsByCourse = async (req, res) => {
    try {
        const assignments = await Assignment.find({ courseRef: req.params.courseId, isActive: true }).sort({ dueDate: 1 });
        const data = req.user.assignedRole === 'Student'
            ? await annotateSequence(req.params.courseId, getUserId(req), assignments)
            : assignments;
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to list assignments' });
    }
};

// @route   DELETE /api/assignments/:id
// @desc    Soft-delete an assignment (keeps student submissions/grades intact)
// @access  Private (Instructor owner or Admin)
exports.deleteAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        const isOwner = String(assignment.createdBy || assignment.instructorRef) === String(getUserId(req));
        if (!isOwner && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'You are not authorized to delete this assignment' });
        }

        assignment.isActive = false;
        assignment.published = false;
        await assignment.save();

        res.json({ success: true, data: assignment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to delete assignment' });
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

// @route   POST /api/assignments/:id/ai-lock
// @desc    Student opened an AI-Tutor-disabled assignment — server registers a
//          temporary block so the AI Tutor cannot be used until it expires or
//          the assignment is submitted. Enforced server-side, cannot be bypassed.
// @access  Private (Student only)
exports.lockAiTutorForAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id).select('_id courseRef aiTutorEnabled');
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        if (assignment.aiTutorEnabled !== false) {
            return res.json({ success: true, data: { blocked: false } });
        }

        const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hour working window
        await AssessmentAiBlock.findOneAndUpdate(
            { studentRef: getUserId(req), assignmentRef: assignment._id },
            { $set: { studentRef: getUserId(req), assignmentRef: assignment._id, courseRef: assignment.courseRef, expiresAt, reason: AssessmentAiBlock.BLOCK_MESSAGE } },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: { blocked: true, expiresAt } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update AI Tutor status' });
    }
};

exports.submitAssignment = async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const { files = [], message = '', fileUrl, fileName, studentNotes } = req.body;

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        // ── SEQUENTIAL GATE ─────────────────────────────────────────────
        // Lesson-linked assignments may only be submitted once their lesson is
        // unlocked and, when a lesson quiz is required, that quiz is passed.
        if (req.user.assignedRole === 'Student') {
            const access = await getAssignmentAccess(getUserId(req), assignment);
            if (!access.granted) {
                return res.status(403).json({
                    success: false,
                    message: access.reason,
                    lessonLocked: true,
                    lockReason: access.reason
                });
            }
        }

        // No assignment submission deadline: students complete assignments at
        // their own pace once they reach the lesson. Sequential progression is
        // the only gate, enforced above.

        const previous = await Submission.findOne({ assignmentRef: assignmentId, studentRef: getUserId(req) }).sort({ version: -1 });
        const version = previous ? previous.version + 1 : 1;

        // Assignment submitted — release the AI Tutor block for this student
        await AssessmentAiBlock.deleteOne({ studentRef: getUserId(req), assignmentRef: assignmentId });

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

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        // ── SEQUENTIAL GATE — enforced BEFORE any file upload happens ────
        if (req.user.assignedRole === 'Student') {
            const access = await getAssignmentAccess(getUserId(req), assignment);
            if (!access.granted) {
                return res.status(403).json({
                    success: false,
                    message: access.reason,
                    lessonLocked: true,
                    lockReason: access.reason
                });
            }
        }

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
            });

            uploadedFiles.push({ filename: file.originalname, url: result.secure_url, mimeType: file.mimetype, size: file.size });
        }

        const previous = await Submission.findOne({ assignmentRef: assignmentId, studentRef: getUserId(req) }).sort({ version: -1 });
        const version = previous ? previous.version + 1 : 1;

        // Assignment submitted — release the AI Tutor block for this student
        await AssessmentAiBlock.deleteOne({ studentRef: getUserId(req), assignmentRef: assignmentId });

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
        const data = req.user.assignedRole === 'Student'
            ? await annotateSequence(req.params.courseId, getUserId(req), assignments)
            : assignments;
        res.status(200).json({ success: true, data });
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
