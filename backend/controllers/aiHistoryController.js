const AiHistory = require('../models/AiHistory');
const AiConversation = require('../models/AiConversation');

exports.getHistory = async (req, res) => {
    try {
        const filter = { userRef: req.user.id };
        if (req.query.conversationId) filter.conversationId = req.query.conversationId;

        const history = await AiHistory.find(filter)
            .sort('createdAt')
            .limit(50)
            .select('conversationId question answer courseContext conversationTitle type createdAt');

        res.status(200).json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const conversations = await AiConversation.find({ userRef: req.user.id })
            .sort('-lastInteractionAt')
            .select('conversationId title courseContext lastMessage lastInteractionAt createdAt');

        res.status(200).json({ success: true, data: conversations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.clearHistory = async (req, res) => {
    try {
        const filter = { userRef: req.user.id };
        if (req.query.conversationId) filter.conversationId = req.query.conversationId;

        await AiHistory.deleteMany(filter);

        if (req.query.conversationId) {
            await AiConversation.deleteOne({ userRef: req.user.id, conversationId: req.query.conversationId });
            return res.status(200).json({ success: true, message: 'AI conversation cleared.' });
        }

        await AiConversation.deleteMany({ userRef: req.user.id });
        res.status(200).json({ success: true, message: 'AI history cleared.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
