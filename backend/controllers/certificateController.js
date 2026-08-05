const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const CertificateVerification = require('../models/CertificateVerification');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Course = require('../models/Course');
const PDFDocument = require('pdfkit');
const { createNotification } = require('./notificationController');
const { generateCertificatePdf, generateCertificateId } = require('../services/certificateService');

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
        doc.fontSize(16).text('This certificate is awarded to', { align: 'center' });
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

exports.checkEligibility = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user._id;
        const enrollment = await Enrollment.findOne({ studentRef: studentId, courseRef: courseId });
        if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });

        const eligible = enrollment.tuitionClearanceFlag && (enrollment.completionPercentage || 0) >= 90;
        res.json({ success: true, data: { eligible, completionPercentage: enrollment.completionPercentage } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.issueCertificate = async (req, res) => {
    try {
        const { courseId } = req.params;
        const student = req.user;
        const enrollment = await Enrollment.findOne({ studentRef: student._id, courseRef: courseId });
        if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });

        if (!(enrollment.tuitionClearanceFlag && (enrollment.completionPercentage || 0) >= 90)) {
            return res.status(400).json({ success: false, message: 'Not eligible for certificate' });
        }

        const existing = await Certificate.findOne({ studentRef: student._id, courseRef: courseId, status: 'Issued' });
        if (existing) return res.json({ success: true, data: existing });

        const course = await Course.findById(courseId);
        const template = await CertificateTemplate.findOne({ active: true }) || {};

        const certificateId = generateCertificateId();
        const pdfResult = await generateCertificatePdf({
            studentName: student.fullName || student.username || student.email,
            courseName: course ? (course.courseTitle || course.title) : 'Course',
            issuerName: template && template.createdBy ? 'Instructor' : 'Emare ELMS',
            issueDate: new Date(),
            certificateId,
            logoUrl: template.logoUrl,
            signatureImage: template.signatureImage,
            template
        });

        const cert = await Certificate.create({
            certificateId,
            studentRef: student._id,
            courseRef: courseId,
            templateRef: template._id,
            pdfPath: `/certificates/${pdfResult.filename}`,
            qrCodeData: pdfResult.verifyUrl
        });

        res.status(201).json({ success: true, data: cert });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.downloadCertificate = async (req, res) => {
    try {
        const cert = await Certificate.findOne({ certificateId: req.params.certificateId }).populate('studentRef courseRef');
        if (!cert) return res.status(404).json({ success: false });
        const filePath = require('path').join(__dirname, '..', 'public', cert.pdfPath || '');
        return res.download(filePath);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

exports.verify = async (req, res) => {
    try {
        const { certificateId } = req.params;
        const cert = await Certificate.findOne({ certificateId }).populate('studentRef courseRef templateRef');
        if (!cert) {
            return res.status(404).json({ success: false, message: 'Certificate not found' });
        }

        const result = cert.status === 'Issued' ? 'Valid' : 'Revoked';
        await CertificateVerification.create({ certificateRef: cert._id, verifierIp: req.ip, result, rawPayload: { certificateId } });

        res.json({ success: true, data: {
            certificateId: cert.certificateId,
            studentName: cert.studentRef && (cert.studentRef.fullName || cert.studentRef.username || ''),
            course: cert.courseRef && (cert.courseRef.courseTitle || cert.courseRef.title || ''),
            issuer: cert.issuerName,
            issueDate: cert.issueDate,
            status: cert.status
        }});
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

exports.getMyCertificates = async (req, res) => {
    try {
        const certs = await Certificate.find({ studentRef: req.user._id }).sort({ issueDate: -1 }).populate('courseRef');
        res.json({ success: true, data: certs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

exports.revokeCertificate = async (req, res) => {
    try {
        const { certificateId } = req.params;
        const cert = await Certificate.findOne({ certificateId });
        if (!cert) return res.status(404).json({ success: false });
        cert.status = 'Revoked';
        await cert.save();
        res.json({ success: true, data: cert });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

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
