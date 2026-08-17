const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get all conversations for the logged-in user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({ 'participants.userRef': req.user.id })
            .populate('participants.userRef', 'fullName avatarUrl assignedRole')
            .sort('-lastMessageAt');
        res.status(200).json({ success: true, data: conversations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get messages for a specific conversation
// @route   GET /api/messages/conversations/:id
// @access  Private
exports.getMessages = async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ 
            _id: req.params.id, 
            'participants.userRef': req.user.id 
        });
        if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

        const messages = await Message.find({ conversationRef: conversation._id }).sort('createdAt');
        
        // Mark as read
        await Message.updateMany(
            { conversationRef: conversation._id, senderRef: { $ne: req.user.id }, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ success: true, data: messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, body } = req.body;
        if (!receiverId || !body) return res.status(400).json({ success: false, message: 'Please provide receiverId and body' });

        // Find existing conversation or create new one
        let conversation = await Conversation.findOne({
            $and: [
                { 'participants.userRef': req.user.id },
                { 'participants.userRef': receiverId }
            ]
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [
                    { userRef: req.user.id },
                    { userRef: receiverId }
                ]
            });
        }

        const message = await Message.create({
            conversationRef: conversation._id,
            senderRef: req.user.id,
            body
        });

        conversation.lastMessage = body;
        conversation.lastMessageAt = Date.now();
        await conversation.save();

        res.status(201).json({ success: true, data: message });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
