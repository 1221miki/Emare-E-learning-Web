const Discussion = require('../models/Discussion');

// @desc    Get all discussions for a course with optional filtering
// @route   GET /api/discussions/course/:courseId
// @access  Private
exports.getCourseDiscussions = async (req, res) => {
    try {
        const { category, search, tags, isResolved } = req.query;
        const filter = { courseRef: req.params.courseId };

        if (category) filter.category = category;
        if (typeof isResolved !== 'undefined') filter.isResolved = isResolved === 'true';

        if (tags) {
            const tagsArray = Array.isArray(tags)
                ? tags
                : tags.split(',').map((tag) => tag.trim()).filter(Boolean);
            if (tagsArray.length) filter.tags = { $all: tagsArray };
        }

        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { title: regex },
                { body: regex },
                { tags: regex },
                { 'replies.body': regex }
            ];
        }

        const discussions = await Discussion.find(filter)
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
        const { courseId: bodyId, courseRef, title, body, category = 'Question', tags = [], attachments = [] } = req.body;
        const courseId = bodyId || courseRef;  // accept both field names from frontend
        const normalizedTags = Array.isArray(tags)
            ? tags.map((tag) => tag.trim()).filter(Boolean)
            : String(tags).split(',').map((tag) => tag.trim()).filter(Boolean);

        const discussion = await Discussion.create({
            courseRef: courseId,
            authorRef: req.user.id,
            title,
            body,
            category,
            tags: normalizedTags,
            attachments: Array.isArray(attachments) ? attachments : []
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

// @desc    Upvote or remove upvote from a discussion thread
// @route   POST /api/discussions/:id/upvote
// @access  Private
exports.upvoteDiscussion = async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);
        if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });

        const alreadyUpvoted = discussion.upvotedBy.some((userId) => userId.toString() === req.user.id);
        if (alreadyUpvoted) {
            discussion.upvotedBy = discussion.upvotedBy.filter((userId) => userId.toString() !== req.user.id);
            discussion.upvotes = Math.max(discussion.upvotes - 1, 0);
        } else {
            discussion.upvotedBy.push(req.user.id);
            discussion.upvotes += 1;
        }

        await discussion.save();
        res.status(200).json({ success: true, data: discussion });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Mark discussion as resolved or unresolved
// @route   PATCH /api/discussions/:id/resolve
// @access  Private (Author/Instructor/Admin)
exports.resolveDiscussion = async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);
        if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });

        const isOwner = discussion.authorRef.toString() === req.user.id;
        const isInstructorOrAdmin = req.user.assignedRole === 'Instructor' || req.user.assignedRole === 'Admin';
        if (!isOwner && !isInstructorOrAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to resolve this discussion' });
        }

        discussion.isResolved = !!req.body.isResolved;
        await discussion.save();
        res.status(200).json({ success: true, data: discussion });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Select a best answer reply for a discussion
// @route   PATCH /api/discussions/:id/best-reply
// @access  Private (Author/Instructor/Admin)
exports.selectBestReply = async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);
        if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });

        const isOwner = discussion.authorRef.toString() === req.user.id;
        const isInstructorOrAdmin = req.user.assignedRole === 'Instructor' || req.user.assignedRole === 'Admin';
        if (!isOwner && !isInstructorOrAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to select best answer' });
        }

        const reply = discussion.replies.id(req.body.replyId);
        if (!reply) {
            return res.status(404).json({ success: false, message: 'Reply not found' });
        }

        discussion.bestReplyId = req.body.replyId;
        discussion.isResolved = true;
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
