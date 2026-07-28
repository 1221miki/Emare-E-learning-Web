const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Course = require('../models/Course');
const PDFDocument = require('pdfkit');
const { createNotification } = require('./notificationController');

const buildCertificatePdfBuffer = async (certificate, student, course) => {
    const doc = new PDFDocument({ size: 'A4', margin: 54 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));

    return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        doc.fontSize(24).text('Certificate of Completion', { align: 'center' });
        doc.moveDown(1.5);
        doc.fontSize(12).text('Emare Learning Institute', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(16).text(`This certificate is awarded to`, { align: 'center' });
        doc.moveDown(0.4);
        doc.fontSize(22).text(student?.fullName || 'Student Name', { align: 'center' });
        doc.moveDown(0.6);
        doc.fontSize(12).text(`for successfully completing the course: ${course?.courseTitle || 'Course Title'}`, { align: 'center' });
        doc.moveDown(1.2);
        doc.fontSize(12).text(`Certificate Number: ${certificate.certificateNumber}`);
        doc.text(`Issued On: ${new Date(certificate.completionDate || certificate.createdAt).toLocaleDateString()}`);
        doc.text(`Status: ${certificate.status || 'Issued'}`);
        doc.moveDown(1.6);
        doc.fontSize(11).text('This document is issued by Emare Learning Institute.', { align: 'center' });
        doc.end();
    });
};

// @desc    Generate certificate when course is 100% complete
// @route   POST /api/certificates/generate
// @access  Private (Student)
exports.generateCertificate = async (req, res) => {
    try {
        const { courseId } = req.body;

        const enrollment = await Enrollment.findOne({
            studentRef: req.user.id,
            courseRef: courseId
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        if (enrollment.completionPercentage < 100) {
            return res.status(400).json({
                success: false,
                message: `Course is only ${enrollment.completionPercentage}% complete. Must be 100%.`
            });
        }

        const existing = await Certificate.findOne({ studentRef: req.user.id, courseRef: courseId, status: { $ne: 'Revoked' } });
        if (existing) {
            return res.status(200).json({ success: true, message: 'Certificate already issued', data: existing });
        }

        const certificate = await Certificate.create({
            studentRef: req.user.id,
            courseRef: courseId,
            status: 'Issued'
        });

        await createNotification({
            recipientRef: req.user.id,
            type: 'certificate',
            title: 'Certificate Earned! 🎉',
            message: `Congratulations! Your certificate has been issued. Number: ${certificate.certificateNumber}`,
            link: '/student/certificates'
        });

        res.status(201).json({ success: true, data: certificate });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyCertificates = async (req, res) => {
    try {
        const certificates = await Certificate.find({ studentRef: req.user.id })
            .populate('courseRef', 'courseTitle technicalCategory estimatedDurationHours')
            .sort('-completionDate');
        res.status(200).json({ success: true, data: certificates });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllCertificates = async (req, res) => {
    try {
        const certificates = await Certificate.find()
            .populate('studentRef', 'fullName accountEmail')
            .populate('courseRef', 'courseTitle technicalCategory')
            .populate('issuedBy', 'fullName')
            .populate('revokedBy', 'fullName')
            .sort('-createdAt');

        res.status(200).json({ success: true, data: certificates });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.generateCertificateForAdmin = async (req, res) => {
    try {
        const { studentId, courseId, templateId } = req.body;

        const [student, course] = await Promise.all([
            User.findById(studentId),
            Course.findById(courseId)
        ]);

        if (!student || !course) {
            return res.status(404).json({ success: false, message: 'Student or course not found.' });
        }

        const existing = await Certificate.findOne({ studentRef: studentId, courseRef: courseId, status: { $ne: 'Revoked' } });
        if (existing) {
            return res.status(200).json({ success: true, message: 'Certificate already exists for this learner and course.', data: existing });
        }

        const certificate = await Certificate.create({
            studentRef: studentId,
            courseRef: courseId,
            issuedBy: req.user.id,
            templateId: templateId || 'standard',
            status: 'Issued'
        });

        res.status(201).json({ success: true, data: certificate });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.reissueCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found.' });
        }

        await Certificate.findByIdAndUpdate(req.params.id, {
            status: 'Reissued',
            reissuedAt: new Date()
        });

        const reissued = await Certificate.create({
            studentRef: certificate.studentRef,
            courseRef: certificate.courseRef,
            issuedBy: req.user.id,
            templateId: req.body.templateId || certificate.templateId || 'standard',
            status: 'Issued',
            reissuedFrom: certificate._id
        });

        res.status(201).json({ success: true, message: 'Certificate reissued successfully.', data: reissued });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.revokeCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found.' });
        }

        certificate.status = 'Revoked';
        certificate.revokedBy = req.user.id;
        certificate.revokedAt = new Date();
        certificate.revocationReason = req.body.reason || 'Revoked by administrator';
        await certificate.save();

        res.status(200).json({ success: true, message: 'Certificate revoked successfully.', data: certificate });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.downloadCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id)
            .populate('studentRef', 'fullName accountEmail')
            .populate('courseRef', 'courseTitle');

        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found.' });
        }

        if (certificate.studentRef?._id?.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'You are not authorized to download this certificate.' });
        }

        const buffer = await buildCertificatePdfBuffer(certificate, certificate.studentRef, certificate.courseRef);
        certificate.downloadCount = (certificate.downloadCount || 0) + 1;
        await certificate.save();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateNumber}.pdf"`);
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.verifyCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findOne({ certificateNumber: req.params.certNumber })
            .populate('studentRef', 'fullName accountEmail')
            .populate('courseRef', 'courseTitle technicalCategory');

        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found or invalid number' });
        }

        res.status(200).json({ success: true, data: certificate });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
