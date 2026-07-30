const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');

// Conversations
exports.createConversation = async (req, res) => {
    try {
        const { participantIds = [], title, isGroup } = req.body;
        const participants = participantIds.map(id => ({ userRef: id }));
        const convo = await Conversation.create({ title, participants, isGroup });
        res.status(201).json({ success: true, data: convo });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.getMyConversations = async (req, res) => {
    try {
        const convos = await Conversation.find({ 'participants.userRef': req.user._id }).sort({ updatedAt: -1 });
        res.json({ success: true, data: convos });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { body, attachments = [] } = req.body;
        const message = await Message.create({ conversationRef: conversationId, senderRef: req.user._id, body, attachments });
        // mark conversation updatedAt
        await Conversation.findByIdAndUpdate(conversationId, { $set: { updatedAt: new Date() } });
        res.status(201).json({ success: true, data: message });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const messages = await Message.find({ conversationRef: conversationId }).sort({ createdAt: 1 }).lean();
        res.json({ success: true, data: messages });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

// Notifications
exports.getMyNotifications = async (req, res) => {
    try { const notes = await Notification.find({ userRef: req.user._id }).sort({ createdAt: -1 }).limit(50); res.json({ success: true, data: notes }); } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.markNotificationRead = async (req, res) => {
    try { await Notification.findByIdAndUpdate(req.params.id, { read: true }); res.json({ success: true }); } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

// Announcements
exports.createAnnouncement = async (req, res) => {
    try {
        const payload = req.body;
        const ann = await Announcement.create({ ...payload, createdBy: req.user._id });
        res.status(201).json({ success: true, data: ann });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

exports.getAnnouncements = async (req, res) => {
    try { const anns = await Announcement.find({}).sort({ publishAt: -1 }).limit(50); res.json({ success: true, data: anns }); } catch (err) { console.error(err); res.status(500).json({ success: false }); }
};

module.exports = exports;
