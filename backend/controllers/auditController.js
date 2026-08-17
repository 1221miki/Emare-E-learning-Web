const AuditLog = require('../models/AuditLog');
const ActivityLog = require('../models/ActivityLog'); // legacy

const VALID_CATEGORIES = [
    'Enrollment & Financial',
    'Course Approvals & Content',
    'User Security & Activity',
    'System & Diagnostics'
];

const SEVERITY_COLORS = { info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444' };

// ── helpers ────────────────────────────────────────────────────────────────
const resolveCategory = (action = '', description = '') => {
    const a = String(action).toUpperCase();
    const d = String(description || '').toLowerCase();
    if (['LOGIN_SUCCESS','LOGIN_FAILED','LOGIN_BLOCKED','LOGOUT','REGISTER','PASSWORD_RESET','ROLE_CHANGED','ACCOUNT_BLOCKED'].some(x => a.startsWith(x))) return 'User Security & Activity';
    if (['COURSE_APPROVED','COURSE_REJECTED','COURSE_PUBLISHED','COURSE_REVISION','COURSE_DELETED','COURSE_CREATED','COURSE_UPDATED','COURSE_ARCHIVED','COURSE_FLAGGED'].some(x => a.startsWith(x))) return 'Course Approvals & Content';
    if (['CHAPA_PAYMENT','FREE_COURSE','ENROLLMENT','PAYMENT','COUPON'].some(x => a.startsWith(x))) return 'Enrollment & Financial';
    if (d.includes('error') || d.includes('system') || d.includes('api') || a === 'SYSTEM_LOG' || a === 'ERROR_LOG') return 'System & Diagnostics';
    return 'System & Diagnostics';
};

// ── Admin: GET /api/audit-logs  ──────────────────────────────────────────
exports.getAuditLogs = async (req, res) => {
    try {
        const {
            category,
            severity,
            search,
            page     = 1,
            limit    = 20,
            dateFrom,
            dateTo
        } = req.query;

        const perPage = Math.min(Number(limit) || 20, 100);
        const skip    = (Math.max(Number(page), 1) - 1) * perPage;

        // ── Build MongoDB filter ──────────────────────────────────────────
        const filter = {};
        if (category && VALID_CATEGORIES.includes(category)) {
            filter.category = category;
        }
        if (severity && ['info', 'warning', 'critical'].includes(severity)) {
            filter.severity = severity;
        }
        if (dateFrom || dateTo) {
            filter.timestamp = {};
            if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
            if (dateTo)   filter.timestamp.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
        }
        if (search) {
            const re = { $regex: String(search), $options: 'i' };
            filter.$or = [
                { description: re },
                { action: re },
                { 'actorSnapshot.email': re },
                { 'actorSnapshot.fullName': re },
                { 'actorSnapshot.role': re },
                { targetLabel: re },
                { ipAddress: re }
            ];
        }

        // ── Query new AuditLog collection ─────────────────────────────────
        const [newLogs, newTotal] = await Promise.all([
            AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(perPage).lean(),
            AuditLog.countDocuments(filter)
        ]);

        // ── Merge legacy ActivityLogs if needed (bridging) ────────────────
        // Only pull legacy logs on page 1 when no filters break compatibility
        let legacyMapped = [];
        if (!category && !severity && !dateFrom && !dateTo && !search && Number(page) === 1) {
            try {
                const legacyRaw = await ActivityLog.find({})
                    .populate('userRef', 'fullName accountEmail assignedRole')
                    .sort({ timestamp: -1 })
                    .limit(50)
                    .lean();

                legacyMapped = legacyRaw.map(l => ({
                    _id:       l._id,
                    timestamp: l.timestamp || l.createdAt,
                    category:  resolveCategory(l.action, l.description),
                    action:    l.action,
                    description: l.description || l.action,
                    actorSnapshot: {
                        fullName: l.userRef?.fullName || 'Unknown',
                        email:    l.userRef?.accountEmail || '—',
                        role:     l.userRef?.assignedRole || '—'
                    },
                    ipAddress: l.ipAddress || '—',
                    severity:  'info',
                    _legacy:   true
                }));
            } catch (_) { /* legacy table may be empty */ }
        }

        // ── Merge + deduplicate by _id ────────────────────────────────────
        const merged = [...newLogs];
        const newIds = new Set(newLogs.map(l => String(l._id)));
        legacyMapped.forEach(l => { if (!newIds.has(String(l._id))) merged.push(l); });
        merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const total = newTotal + (legacyMapped.length > 0 && Number(page) === 1 ? legacyMapped.length : 0);
        const totalPages = Math.ceil(newTotal / perPage);

        // ── Summary stats ─────────────────────────────────────────────────
        const [categoryStats, severityStats] = await Promise.all([
            AuditLog.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
            AuditLog.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }])
        ]);

        res.status(200).json({
            success: true,
            data: merged,
            pagination: { page: Number(page), limit: perPage, total: newTotal, totalPages },
            stats: { categories: categoryStats, severities: severityStats }
        });
    } catch (error) {
        console.error('getAuditLogs error:', error);
        res.status(500).json({ success: false, message: 'Failed to load audit logs.' });
    }
};

// ── Admin: GET /api/audit-logs/stats  ────────────────────────────────────
exports.getAuditStats = async (req, res) => {
    try {
        const [total, last24h, warnings, critical, byCategory] = await Promise.all([
            AuditLog.countDocuments(),
            AuditLog.countDocuments({ timestamp: { $gte: new Date(Date.now() - 24*60*60*1000) } }),
            AuditLog.countDocuments({ severity: 'warning' }),
            AuditLog.countDocuments({ severity: 'critical' }),
            AuditLog.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 }, lastEvent: { $max: '$timestamp' } } },
                { $sort: { count: -1 } }
            ])
        ]);
        res.json({ success: true, data: { total, last24h, warnings, critical, byCategory } });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

// ── Legacy createAuditEntry — kept for backward compat ───────────────────
exports.createAuditEntry = async ({ user, userId, action, targetType, targetId, description, ipAddress }) => {
    const { auditLog } = require('../utils/auditLogger');
    return auditLog({
        user: user || userId,
        category: resolveCategory(action, description),
        action,
        description: description || action,
        targetType,
        targetId,
        ipAddress,
        severity: 'info'
    });
};
