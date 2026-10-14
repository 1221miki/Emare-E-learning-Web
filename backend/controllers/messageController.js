const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Helper to safely get user ID as string
const getUserId = (user) => (user?._id || user?.id)?.toString();

// @desc    Get all conversations for the logged-in user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
    try {
        const userId = getUserId(req.user);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        // Query conversations where user is a participant
        const conversations = await Conversation.find({ 'participants.userRef': userId })
            .populate('participants.userRef', 'fullName avatarUrl assignedRole accountEmail')
            .sort('-lastMessageAt');

        // Safely format conversations so frontend can easily identify the other participant
        const formattedConversations = conversations.map(convo => {
            const convoObj = convo.toObject();
            
            // Find other participant
            const other = (convoObj.participants || []).find(p => {
                const pid = (p.userRef?._id || p.userRef)?.toString();
                return pid && pid !== userId;
            });

            // Handle deleted / unavailable user gracefully
            const isOtherUnavailable = !other || !other.userRef || !other.userRef._id;
            const otherUser = isOtherUnavailable
                ? {
                    _id: null,
                    fullName: 'Unavailable User',
                    assignedRole: 'Inactive Account',
                    avatarUrl: '',
                    isUnavailable: true
                }
                : {
                    ...other.userRef,
                    isUnavailable: false
                };

            const displayTitle = convoObj.title || otherUser.fullName || 'Conversation';
            const displayRole = otherUser.assignedRole || '';

            return {
                ...convoObj,
                otherParticipant: otherUser,
                displayTitle,
                displayRole,
                isRecipientAvailable: !isOtherUnavailable
            };
        });

        res.status(200).json({ success: true, data: formattedConversations });
    } catch (err) {
        console.error('getConversations error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get messages for a specific conversation
// @route   GET /api/messages/conversations/:id
// @access  Private
exports.getMessages = async (req, res) => {
    try {
        const userId = getUserId(req.user);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const conversation = await Conversation.findOne({ 
            _id: req.params?.id, 
            'participants.userRef': userId 
        }).populate('participants.userRef', 'fullName avatarUrl assignedRole accountEmail');

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const messages = await Message.find({ conversationRef: conversation._id })
            .populate('senderRef', 'fullName avatarUrl assignedRole accountEmail')
            .sort('createdAt');
        
        // Mark unread messages as read
        await Message.updateMany(
            { conversationRef: conversation._id, senderRef: { $ne: userId }, isRead: false },
            { isRead: true }
        );

        // Find other participant for context
        const other = (conversation.participants || []).find(p => {
            const pid = (p.userRef?._id || p.userRef)?.toString();
            return pid && pid !== userId;
        });

        const isOtherUnavailable = !other || !other.userRef || !other.userRef._id;
        const otherParticipant = isOtherUnavailable
            ? {
                _id: null,
                fullName: 'Unavailable User',
                assignedRole: 'Inactive Account',
                isUnavailable: true
            }
            : {
                _id: other.userRef._id,
                fullName: other.userRef.fullName,
                assignedRole: other.userRef.assignedRole,
                avatarUrl: other.userRef.avatarUrl,
                isUnavailable: false
            };

        res.status(200).json({
            success: true,
            data: messages,
            meta: {
                conversationId: conversation._id,
                otherParticipant,
                isRecipientAvailable: !isOtherUnavailable
            }
        });
    } catch (err) {
        console.error('getMessages error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        const userId = getUserId(req.user);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        // Support various parameter naming conventions
        const bodyText = (req.body?.body || req.body?.content || req.body?.message || '').trim();
        let receiverId = (req.body?.receiverId || req.body?.recipientId || req.body?.toUserId)?.toString();
        const conversationId = req.body?.conversationId || req.params?.id;

        if (!bodyText) {
            return res.status(400).json({ success: false, message: 'Please provide a message body' });
        }

        let conversation = null;

        // 1. If conversationId is supplied, find existing conversation
        if (conversationId) {
            conversation = await Conversation.findOne({
                _id: conversationId,
                'participants.userRef': userId
            });

            if (!conversation) {
                return res.status(404).json({ success: false, message: 'Conversation not found' });
            }

            // If receiverId was not explicitly provided, resolve from participants
            if (!receiverId) {
                const other = (conversation.participants || []).find(p => {
                    const pid = (p.userRef?._id || p.userRef)?.toString();
                    return pid && pid !== userId;
                });
                if (other && other.userRef) {
                    receiverId = (other.userRef._id || other.userRef).toString();
                }
            }
        }

        // 2. If receiverId is provided, verify recipient in MongoDB
        let recipientUser = null;
        if (receiverId) {
            recipientUser = await User.findById(receiverId).select('fullName assignedRole avatarUrl isActive accountEmail');
            if (!recipientUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Recipient user account does not exist or has been deleted.'
                });
            }
            if (recipientUser.isActive === false) {
                return res.status(400).json({
                    success: false,
                    message: 'Recipient user account is inactive.'
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'No active recipient available for this conversation.'
            });
        }

        // 3. If conversation wasn't found by conversationId, find or create by participants
        if (!conversation) {
            conversation = await Conversation.findOne({
                $and: [
                    { 'participants.userRef': userId },
                    { 'participants.userRef': receiverId }
                ]
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [
                        { userRef: userId, role: 'Participant' },
                        { userRef: receiverId, role: 'Participant' }
                    ],
                    lastMessage: bodyText,
                    lastMessageAt: new Date()
                });
            }
        }

        // 4. Create and save the message
        const message = await Message.create({
            conversationRef: conversation._id,
            senderRef: userId,
            body: bodyText,
            isRead: false
        });

        // 5. Update conversation last message details
        conversation.lastMessage = bodyText;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Populate sender details for the response
        await message.populate('senderRef', 'fullName avatarUrl assignedRole accountEmail');

        // 6. Real-time Socket.IO emission
        try {
            const io = (req.app && typeof req.app.get === 'function') ? req.app.get('io') : null;
            if (io) {
                const messagePayload = {
                    _id: message._id,
                    conversationRef: conversation._id,
                    senderRef: message.senderRef,
                    body: message.body,
                    createdAt: message.createdAt,
                    isRead: message.isRead
                };

                // Emit to conversation room (for users currently in this chat)
                io.to(`conversation:${conversation._id}`).emit('new_message', {
                    conversationId: conversation._id.toString(),
                    message: messagePayload
                });

                // Emit direct message to recipient's private user room
                io.to(`user:${receiverId}`).emit('direct_message', {
                    conversationId: conversation._id.toString(),
                    message: messagePayload
                });

                // Notify both users that conversation list updated
                io.to(`user:${userId}`).emit('conversation_updated', {
                    conversationId: conversation._id.toString(),
                    lastMessage: bodyText,
                    lastMessageAt: conversation.lastMessageAt
                });
                io.to(`user:${receiverId}`).emit('conversation_updated', {
                    conversationId: conversation._id.toString(),
                    lastMessage: bodyText,
                    lastMessageAt: conversation.lastMessageAt
                });
            }
        } catch (socketErr) {
            console.warn('Socket emission failed (non-fatal):', socketErr.message);
        }

        res.status(201).json({
            success: true,
            data: message,
            conversationId: conversation._id
        });
    } catch (err) {
        console.error('sendMessage error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
