const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');

exports.submitFeedback = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { category, content, instructorId } = req.body;
        const fb = await Feedback.create({ studentRef: req.user._id, courseRef: courseId || undefined, instructorRef: instructorId || undefined, category, content });
        await Notification.create({ userRef: null, message: `New feedback submitted`, meta: { feedbackId: fb._id } });
        res.status(201).json({ success: true, data: fb });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.getMyFeedback = async (req, res) => {
    try { const items = await Feedback.find({ studentRef: req.user._id }).sort({ createdAt: -1 }); res.json({ success: true, data: items }); } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.getFeedbackForInstructor = async (req, res) => {
    try { const items = await Feedback.find({ instructorRef: req.user._id }).sort({ createdAt: -1 }); res.json({ success: true, data: items }); } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.respondToFeedback = async (req, res) => {
    try {
        const { feedbackId } = req.params;
        const { response } = req.body;
        const fb = await Feedback.findById(feedbackId);
        if (!fb) return res.status(404).json({ success: false });
        fb.response = response; fb.respondedBy = req.user._id; fb.status = 'Closed'; await fb.save();
        await Notification.create({ userRef: fb.studentRef, message: `Your feedback has a response`, meta: { feedbackId: fb._id } });
        res.json({ success: true, data: fb });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

module.exports = exports;
