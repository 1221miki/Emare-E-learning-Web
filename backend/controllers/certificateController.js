const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const { createNotification } = require('./notificationController');

// @desc    Generate certificate when course is 100% complete
// @route   POST /api/certificates/generate
// @access  Private (Student)
exports.generateCertificate = async (req, res) => {
    try {
        const { courseId } = req.body;

        // Verify enrollment and completion
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

        // Check if certificate already exists
        const existing = await Certificate.findOne({ studentRef: req.user.id, courseRef: courseId });
        if (existing) {
            return res.status(200).json({ success: true, message: 'Certificate already issued', data: existing });
        }

        const certificate = await Certificate.create({
            studentRef: req.user.id,
            courseRef: courseId
        });

        // Notify student
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

// @desc    Get all certificates for the logged-in student
// @route   GET /api/certificates/mine
// @access  Private (Student)
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

// @desc    Verify a certificate by its number
// @route   GET /api/certificates/verify/:certNumber
// @access  Public
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
