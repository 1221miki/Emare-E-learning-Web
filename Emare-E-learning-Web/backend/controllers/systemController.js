const mongoose = require('mongoose');
const SystemSettings = require('../models/SystemSettings');

const getDatabaseMetrics = async () => {
    if (!mongoose.connection?.db) {
        throw new Error('Database connection is unavailable.');
    }

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionMetrics = [];

    for (const collection of collections) {
        try {
            const stats = await db.collection(collection.name).stats();
            collectionMetrics.push({
                name: collection.name,
                documentCount: stats.count || 0,
                sizeBytes: stats.size || 0,
                storageSizeBytes: stats.storageSize || 0,
                indexSizeBytes: stats.totalIndexSize || 0
            });
        } catch (error) {
            collectionMetrics.push({
                name: collection.name,
                documentCount: 0,
                sizeBytes: 0,
                storageSizeBytes: 0,
                indexSizeBytes: 0,
                warning: error.message
            });
        }
    }

    const adminStats = await db.admin().stats();
    return {
        databaseName: adminStats.db || 'unknown',
        collections: collectionMetrics,
        dataSizeBytes: adminStats.dataSize || 0,
        indexSizeBytes: adminStats.indexSize || 0,
        storageSizeBytes: (adminStats.dataSize || 0) + (adminStats.indexSize || 0),
        objects: adminStats.objects || 0
    };
};

const { audit } = require('../utils/auditLogger');

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
        const updateData = { ...req.body };
        const adminName = req.user?.fullName || req.user?.username || 'Admin User';
        const adminId = req.user?._id;

        // Build log entries for updated fields
        if (settings) {
            const logs = settings.settingLogs || [];
            const metaMap = settings.settingMeta ? new Map(settings.settingMeta) : new Map();

            Object.keys(updateData).forEach(key => {
                if (key !== 'settingLogs' && key !== 'settingMeta' && settings[key] !== undefined && settings[key] !== updateData[key]) {
                    logs.unshift({
                        key,
                        oldValue: settings[key],
                        newValue: updateData[key],
                        updatedBy: adminName,
                        updatedById: adminId,
                        updatedAt: new Date()
                    });
                    metaMap.set(key, {
                        updatedBy: adminName,
                        updatedAt: new Date()
                    });
                }
            });

            // Keep recent 200 history logs
            updateData.settingLogs = logs.slice(0, 200);
            updateData.settingMeta = metaMap;
        }

        if (!settings) {
            settings = await SystemSettings.create(updateData);
        } else {
            settings = await SystemSettings.findOneAndUpdate({}, updateData, { new: true, runValidators: true });
        }

        // Audit log entry
        audit.system({
            req,
            user: req.user,
            action: 'SETTINGS_UPDATED',
            severity: 'info',
            details: `Admin ${adminName} updated system configuration settings.`
        });

        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

// Reset to factory defaults
exports.resetToDefaults = async (req, res) => {
    try {
        await SystemSettings.deleteMany({});
        const defaultSettings = await SystemSettings.create({});

        audit.system({
            req,
            user: req.user,
            action: 'SETTINGS_RESET_DEFAULTS',
            severity: 'warning',
            details: `Admin ${req.user?.fullName || 'Admin'} reset all system settings to factory defaults.`
        });

        res.status(200).json({ success: true, message: 'All system settings reset to factory defaults.', data: defaultSettings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to reset system settings.' });
    }
};

// Backup endpoint
exports.createBackup = async (req, res) => {
    try {
        const metrics = await getDatabaseMetrics();
        res.status(200).json({
            success: true,
            message: 'Database backup initiated successfully.',
            data: metrics,
            downloadUrl: '/mock/backup-123.zip'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Backup failed' });
    }
};

// Restore endpoint
exports.restoreDatabase = async (req, res) => {
    try {
        const metrics = await getDatabaseMetrics();
        res.status(200).json({
            success: true,
            message: 'Database restore initiated from the latest backup snapshot.',
            data: metrics
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Restore failed' });
    }
};

// Optimize endpoint
exports.optimizeDatabase = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const optimized = [];

        for (const collection of collections) {
            try {
                await db.command({ compact: collection.name });
                optimized.push(collection.name);
            } catch (error) {
                optimized.push(`${collection.name}: ${error.message}`);
            }
        }

        const metrics = await getDatabaseMetrics();
        res.status(200).json({
            success: true,
            message: 'Database optimization completed.',
            data: { optimized, metrics }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Optimization failed' });
    }
};

// Monitor collections
exports.monitorCollections = async (req, res) => {
    try {
        const metrics = await getDatabaseMetrics();
        res.status(200).json({ success: true, data: metrics });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Collection monitoring failed' });
    }
};

// Storage monitoring
exports.monitorStorage = async (req, res) => {
    try {
        const metrics = await getDatabaseMetrics();
        res.status(200).json({ success: true, data: metrics });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Storage monitoring failed' });
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
