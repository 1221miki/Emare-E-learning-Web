const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
exports.getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipientRef: req.user.id })
            .sort('-createdAt')
            .limit(50);
        const unreadCount = await Notification.countDocuments({ recipientRef: req.user.id, isRead: false });
        res.status(200).json({ success: true, data: notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipientRef: req.user.id },
            { isRead: true },
            { new: true }
        );
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
        res.status(200).json({ success: true, data: notification });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipientRef: req.user.id, isRead: false }, { isRead: true });
        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
    try {
        const deleted = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipientRef: req.user.id
        });
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Notification not found or unauthorized' });
        }
        res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Delete all notifications for the authenticated user
// @route   DELETE /api/notifications/clear-all
// @access  Private
exports.deleteAllNotifications = async (req, res) => {
    try {
        const result = await Notification.deleteMany({ recipientRef: req.user.id });
        res.status(200).json({
            success: true,
            message: 'All notifications deleted',
            deletedCount: result.deletedCount
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Delete only read notifications for the authenticated user
// @route   DELETE /api/notifications/clear-read
// @access  Private
exports.deleteReadNotifications = async (req, res) => {
    try {
        const result = await Notification.deleteMany({
            recipientRef: req.user.id,
            $or: [{ isRead: true }, { read: true }]
        });
        res.status(200).json({
            success: true,
            message: 'Read notifications cleared',
            deletedCount: result.deletedCount
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Delete notifications (all or by filter like ?filter=read)
// @route   DELETE /api/notifications
// @access  Private
exports.deleteNotifications = async (req, res) => {
    try {
        const filter = req.query.filter || req.query.type;
        const query = { recipientRef: req.user.id };
        if (filter === 'read') {
            query.$or = [{ isRead: true }, { read: true }];
        }
        const result = await Notification.deleteMany(query);
        res.status(200).json({
            success: true,
            message: filter === 'read' ? 'Read notifications cleared' : 'All notifications deleted',
            deletedCount: result.deletedCount
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendAdminNotification = async (req, res) => {
    try {
        const { audience, title, message, type, link, scheduleAt, reminder } = req.body;

        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required.' });
        }

        const query = {};
        if (audience === 'students') query.assignedRole = 'Student';
        else if (audience === 'instructors') query.assignedRole = 'Instructor';
        else if (audience === 'all') {
            query.assignedRole = { $in: ['Student', 'Instructor', 'Admin'] };
        }

        const recipients = await User.find(query).select('_id').lean();
        const recipientIds = recipients.map((user) => user._id);

        if (!recipientIds.length) {
            return res.status(404).json({ success: false, message: 'No matching recipients found.' });
        }

        const notificationPayloads = recipientIds.map((recipientRef) => ({
            recipientRef,
            type: type || 'announcement',
            title,
            message,
            link: link || '',
            metadata: { source: 'admin', reminder: Boolean(reminder), scheduled: Boolean(scheduleAt) }
        }));

        if (scheduleAt) {
            const scheduledAt = new Date(scheduleAt);
            if (Number.isNaN(scheduledAt.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid schedule date.' });
            }
            const scheduledNotifications = notificationPayloads.map((payload) => ({
                ...payload,
                metadata: { ...payload.metadata, scheduledAt: scheduledAt.toISOString() }
            }));
            await Notification.insertMany(scheduledNotifications);
            return res.status(201).json({ success: true, message: 'Announcement scheduled successfully.', data: { scheduledAt, recipientCount: recipientIds.length } });
        }

        await Notification.insertMany(notificationPayloads);
        res.status(201).json({ success: true, message: 'Notification sent successfully.', data: { recipientCount: recipientIds.length } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAdminNotificationSummary = async (req, res) => {
    try {
        const [total, unread, latest] = await Promise.all([
            Notification.countDocuments(),
            Notification.countDocuments({ isRead: false }),
            Notification.find().sort('-createdAt').limit(5).lean()
        ]);

        res.status(200).json({ success: true, data: { total, unread, recent: latest } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Helper: Create a notification (used internally by other controllers) ──
exports.createNotification = async ({ recipientRef, type, title, message, link, metadata }) => {
    try {
        if (!recipientRef) return null;

        // Prevent duplicate notifications for the same recipient, type, and event/title
        const query = {
            recipientRef,
            type,
            title
        };

        if (link) query.link = link;

        if (metadata?.eventId) query['metadata.eventId'] = metadata.eventId;
        if (metadata?.enrollmentId) query['metadata.enrollmentId'] = metadata.enrollmentId;
        if (metadata?.assignmentId) query['metadata.assignmentId'] = metadata.assignmentId;
        if (metadata?.certificateId) query['metadata.certificateId'] = metadata.certificateId;
        if (metadata?.liveSessionId) query['metadata.liveSessionId'] = metadata.liveSessionId;

        const existing = await Notification.findOne(query);
        if (existing) {
            return existing;
        }

        return await Notification.create({ recipientRef, type, title, message, link, metadata });
    } catch (err) {
        console.error('Notification creation failed:', err.message);
        return null;
    }
};

// ── Helper: Broadcast an event notification to all active users ──
exports.broadcastEventNotification = async ({ title, message, link, type = 'event', eventId }) => {
    try {
        const users = await User.find({ isActive: true }).select('_id').lean();
        if (!users.length) return;

        // Deduplication: Find recipients who already received this notification for the same event and type
        const existingRecipients = await Notification.find({
            type,
            title,
            ...(link ? { link } : {}),
            recipientRef: { $in: users.map(u => u._id) }
        }).distinct('recipientRef');

        const existingSet = new Set(existingRecipients.map(id => String(id)));

        const payloads = users
            .filter(u => !existingSet.has(String(u._id)))
            .map((u) => ({
                recipientRef: u._id,
                type,
                title,
                message,
                link: link || '',
                metadata: { source: 'event', ...(eventId ? { eventId } : {}) }
            }));

        if (payloads.length) await Notification.insertMany(payloads);
    } catch (err) {
        console.error('Event broadcast failed:', err.message);
    }
};
