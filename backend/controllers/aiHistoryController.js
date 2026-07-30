const AiHistory = require('../models/AiHistory');

exports.getHistory = async (req, res) => {
    try {
        const history = await AiHistory.find({ userRef: req.user.id })
            .sort('-createdAt')
            .limit(20)
            .select('question answer courseContext createdAt');

        res.status(200).json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.clearHistory = async (req, res) => {
    try {
        await AiHistory.deleteMany({ userRef: req.user.id });
        res.status(200).json({ success: true, message: 'AI history cleared.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
