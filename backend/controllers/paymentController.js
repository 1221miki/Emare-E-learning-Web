const axios = require('axios');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const crypto = require('crypto');

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST_mockkey_emare';
const CHAPA_URL = 'https://api.chapa.co/v1/transaction/initialize';
const CHAPA_VERIFY_URL = 'https://api.chapa.co/v1/transaction/verify';

// @desc    Initialize a Chapa payment
// @route   POST /api/payments/initialize
// @access  Private/Student
exports.initializePayment = async (req, res) => {
    try {
        const { courseId } = req.body;
        
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
        
        // Ensure user is not already enrolled/cleared
        let enrollment = await Enrollment.findOne({ studentRef: req.user.id, courseRef: courseId });
        if (enrollment && enrollment.tuitionClearanceFlag) {
            return res.status(400).json({ success: false, message: 'You already own this course' });
        }

        if (!enrollment) {
            enrollment = await Enrollment.create({
                studentRef: req.user.id,
                courseRef: courseId,
                paymentStatus: 'Pending Verification'
            });
        }

        const tx_ref = `EMARE-TX-${crypto.randomBytes(8).toString('hex')}-${Date.now()}`;

        // Save tx_ref to enrollment for later verification
        enrollment.paymentSlipUrl = tx_ref; // Hijacking this field to store tx_ref
        await enrollment.save();

        const payload = {
            amount: 1500, // Hardcoded price for now
            currency: 'ETB',
            email: req.user.accountEmail,
            first_name: req.user.fullName.split(' ')[0],
            last_name: req.user.fullName.split(' ')[1] || '',
            tx_ref: tx_ref,
            callback_url: `http://localhost:3000/student/workspace/${courseId}`,
            return_url: `http://localhost:3000/student/workspace/${courseId}`,
            customization: {
                title: "Emare ELMS",
                description: `Payment for ${course.courseTitle}`
            }
        };

        // --- Mock API Call (Bypass actual Chapa network request for development without real keys) ---
        // Normally this would be: 
        // const response = await axios.post(CHAPA_URL, payload, { headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` } });
        // return res.status(200).json({ success: true, checkout_url: response.data.data.checkout_url });

        // MOCK BEHAVIOR: Just automatically approve it after a delay to simulate payment success
        setTimeout(async () => {
            enrollment.tuitionClearanceFlag = true;
            enrollment.paymentStatus = 'Cleared';
            await enrollment.save();
        }, 3000);

        res.status(200).json({
            success: true,
            message: 'Payment initialized (Mocked). You will be enrolled in 3 seconds automatically.',
            checkout_url: `/student/workspace/${courseId}` // Mock redirect
        });

    } catch (err) {
        console.error('Payment Error:', err);
        res.status(500).json({ success: false, message: 'Payment initialization failed' });
    }
};

// @desc    Verify a Chapa payment (Webhook callback)
// @route   GET /api/payments/verify/:tx_ref
// @access  Public
exports.verifyPayment = async (req, res) => {
    try {
        const { tx_ref } = req.params;
        
        // const response = await axios.get(`${CHAPA_VERIFY_URL}/${tx_ref}`, { headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` } });
        // if (response.data.status === 'success') { ... approve ... }

        const enrollment = await Enrollment.findOne({ paymentSlipUrl: tx_ref });
        if (!enrollment) return res.status(404).json({ success: false, message: 'Transaction not found' });

        enrollment.tuitionClearanceFlag = true;
        enrollment.paymentStatus = 'Cleared';
        await enrollment.save();

        res.status(200).json({ success: true, message: 'Payment verified' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
