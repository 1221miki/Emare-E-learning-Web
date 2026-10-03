const IssueReport = require('../models/IssueReport');
const Notification = require('../models/Notification');

exports.createIssue = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { category, description, attachments } = req.body;
        const issue = await IssueReport.create({ studentRef: req.user._id, courseRef: courseId || undefined, category, description, attachments: attachments || [] });
        await Notification.create({ userRef: null, message: `New issue reported`, meta: { issueId: issue._id } });
        res.status(201).json({ success: true, data: issue });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.getMyIssues = async (req, res) => {
    try { const items = await IssueReport.find({ studentRef: req.user._id }).sort({ createdAt: -1 }); res.json({ success: true, data: items }); } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.updateIssueStatus = async (req, res) => {
    try {
        const { issueId } = req.params; const { status, assignedTo } = req.body;
        const issue = await IssueReport.findById(issueId);
        if (!issue) return res.status(404).json({ success: false });
        if (status) issue.status = status; if (assignedTo) issue.assignedTo = assignedTo; await issue.save();
        res.json({ success: true, data: issue });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

module.exports = exports;
