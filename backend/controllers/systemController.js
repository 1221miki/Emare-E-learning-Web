const SystemSettings = require('../models/SystemSettings');

// Get settings
exports.getSettings = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings.create({});
        }
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update settings
exports.updateSettings = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings.create(req.body);
        } else {
            settings = await SystemSettings.findOneAndUpdate({}, req.body, { new: true, runValidators: true });
        }
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Mock Backup endpoint
exports.createBackup = async (req, res) => {
    try {
        // In a real app, this would trigger a mongodump or equivalent
        res.status(200).json({ success: true, message: 'Database backup initiated successfully.', downloadUrl: '/mock/backup-123.zip' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Backup failed' });
    }
};

// Mock Clear Cache endpoint
exports.clearCache = async (req, res) => {
    try {
        res.status(200).json({ success: true, message: 'System cache cleared successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Cache clear failed' });
    }
};
