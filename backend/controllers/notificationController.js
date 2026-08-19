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
        await Notification.findOneAndDelete({ _id: req.params.id, recipientRef: req.user.id });
        res.status(200).json({ success: true, message: 'Notification deleted' });
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
        await Notification.create({ recipientRef, type, title, message, link, metadata });
    } catch (err) {
        console.error('Notification creation failed:', err.message);
    }
};

// ── Helper: Broadcast an event notification to all active users ──
exports.broadcastEventNotification = async ({ title, message, link, type = 'event' }) => {
    try {
        const users = await User.find({ isActive: true }).select('_id').lean();
        const payloads = users.map((u) => ({
            recipientRef: u._id,
            type,
            title,
            message,
            link: link || '',
            metadata: { source: 'event' }
        }));
        if (payloads.length) await Notification.insertMany(payloads);
    } catch (err) {
        console.error('Event broadcast failed:', err.message);
    }
};
