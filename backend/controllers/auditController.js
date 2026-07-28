const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

const deriveCategory = (action = '', description = '') => {
    const normalizedAction = String(action).toUpperCase();
    const normalizedDescription = String(description || '').toLowerCase();

    if (['LOGIN', 'LOGOUT', 'REGISTER'].includes(normalizedAction)) return 'login';
    if (['USER_UPDATE', 'USER_DEACTIVATE', 'PASSWORD_RESET'].includes(normalizedAction)) return 'user';
    if (['COURSE_CREATE', 'COURSE_UPDATE', 'COURSE_DELETE', 'COURSE_APPROVE', 'COURSE_REVIEW', 'COURSE_REVISE', 'COURSE_REJECT'].includes(normalizedAction)) return 'course';
    if (['ENROLLMENT_CREATE', 'PAYMENT_UPLOAD', 'PAYMENT_CLEAR', 'PAYMENT_APPROVE', 'PAYMENT_REJECT'].includes(normalizedAction)) return 'enrollment';
    if (normalizedAction === 'ADMIN_ACTION' || normalizedDescription.includes('admin')) return 'admin';
    if (normalizedAction === 'ERROR_LOG' || normalizedDescription.includes('error')) return 'error';
    if (normalizedAction === 'SYSTEM_LOG' || normalizedDescription.includes('system')) return 'system';
    return 'system';
};

exports.createAuditEntry = async ({ user, userId, action, targetType, targetId, description, ipAddress }) => {
    try {
        let resolvedUserId = user?._id || user || userId;
        if (!resolvedUserId) {
            const fallbackAdmin = await User.findOne({ assignedRole: 'Admin' }).lean();
            resolvedUserId = fallbackAdmin?._id;
        }

        if (!resolvedUserId) return null;

        const auditEntry = await ActivityLog.create({
            userRef: resolvedUserId,
            action,
            targetType,
            targetId,
            description,
            ipAddress
        });

        return auditEntry;
    } catch (error) {
        console.warn('Audit log write failed:', error.message);
        return null;
    }
};

exports.getAuditLogs = async (req, res) => {
    try {
        const { category, search, limit = 100, page = 1 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const logs = await ActivityLog.find({})
            .populate('userRef', 'fullName accountEmail assignedRole')
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const normalizedLogs = logs
            .map((entry) => ({
                ...entry,
                category: deriveCategory(entry.action, entry.description)
            }))
            .filter((entry) => {
                if (category && entry.category !== category) return false;
                if (!search) return true;
                const haystack = `${entry.description || ''} ${entry.action || ''} ${entry.userRef?.fullName || ''} ${entry.userRef?.accountEmail || ''}`.toLowerCase();
                return haystack.includes(String(search).toLowerCase());
            });

        const total = normalizedLogs.length;

        res.status(200).json({ success: true, count: normalizedLogs.length, total, data: normalizedLogs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load audit logs.' });
    }
};
