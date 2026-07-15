const Discussion = require('../models/Discussion');

// @desc    Get all discussions for a course
// @route   GET /api/discussions/course/:courseId
// @access  Private
exports.getCourseDiscussions = async (req, res) => {
    try {
        const discussions = await Discussion.find({ courseRef: req.params.courseId })
            .populate('authorRef', 'fullName avatarUrl assignedRole')
            .populate('replies.authorRef', 'fullName avatarUrl assignedRole')
            .sort({ isPinned: -1, createdAt: -1 });
        res.status(200).json({ success: true, data: discussions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Create a new discussion thread
// @route   POST /api/discussions
// @access  Private
exports.createDiscussion = async (req, res) => {
    try {
        const { courseId, title, body } = req.body;
        const discussion = await Discussion.create({
            courseRef: courseId,
            authorRef: req.user.id,
            title,
            body
        });
        const populated = await discussion.populate('authorRef', 'fullName avatarUrl assignedRole');
        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Add a reply to a discussion
// @route   POST /api/discussions/:id/reply
// @access  Private
exports.addReply = async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);
        if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });

        discussion.replies.push({ authorRef: req.user.id, body: req.body.body });
        await discussion.save();

        const populated = await discussion.populate([
            { path: 'authorRef', select: 'fullName avatarUrl assignedRole' },
            { path: 'replies.authorRef', select: 'fullName avatarUrl assignedRole' }
        ]);
        res.status(200).json({ success: true, data: populated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Toggle pin status of a discussion
// @route   PATCH /api/discussions/:id/pin
// @access  Private (Instructor/Admin)
exports.togglePin = async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);
        if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });
        discussion.isPinned = !discussion.isPinned;
        await discussion.save();
        res.status(200).json({ success: true, data: discussion });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Delete a discussion
// @route   DELETE /api/discussions/:id
// @access  Private (Author/Admin)
exports.deleteDiscussion = async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);
        if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });

        if (discussion.authorRef.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await Discussion.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Discussion deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
