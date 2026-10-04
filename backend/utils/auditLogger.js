/**
 * auditLogger — Central utility to write AuditLog entries.
 *
 * Usage (fire-and-forget, never throws):
 *   const { auditLog } = require('../utils/auditLogger');
 *   auditLog({ req, category: 'User Security & Activity', action: 'LOGIN_SUCCESS',
 *               description: `...`, severity: 'info' });
 */

const AuditLog = require('../models/AuditLog');

/**
 * Resolve the real client IP from the request,
 * handling common proxy headers.
 */
const resolveIp = (req) => {
    if (!req) return '—';
    return (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        '—'
    );
};

/**
 * Build a snapshot of the actor from req.user or an explicit user object.
 */
const buildActorSnapshot = (user) => {
    if (!user) return { fullName: 'System', email: 'system@emare.com', role: 'System' };
    return {
        fullName: user.fullName || user.name || 'Unknown',
        email:    user.accountEmail || user.email || '—',
        role:     user.assignedRole || user.role || 'Unknown'
    };
};

/**
 * Core write function — never throws, failures are logged to stderr only.
 *
 * @param {object} opts
 * @param {import('express').Request} [opts.req]       Express request (for IP, user-agent, actor)
 * @param {object}  [opts.user]       Explicit actor if req.user is not available
 * @param {string}  opts.category     One of the four audit categories
 * @param {string}  opts.action       Machine-readable event code (e.g. LOGIN_FAILED)
 * @param {string}  opts.description  Human-readable summary shown in admin UI
 * @param {string}  [opts.targetType] e.g. 'Course', 'User', 'Payment'
 * @param {*}       [opts.targetId]   MongoDB ObjectId
 * @param {string}  [opts.targetLabel] Display label (course title, username…)
 * @param {string}  [opts.ipAddress]  Override IP address
 * @param {string}  [opts.severity]   'info' | 'warning' | 'critical'
 * @param {object}  [opts.metadata]   Any extra structured data
 */
const auditLog = async (opts = {}) => {
    try {
        const {
            req,
            user,
            category,
            action,
            description,
            targetType = null,
            targetId   = null,
            targetLabel = null,
            ipAddress,
            severity = 'info',
            metadata = {}
        } = opts;

        if (!category || !action || !description) {
            console.warn('[AuditLogger] Missing required fields: category, action, description');
            return null;
        }

        const actor     = user || req?.user || null;
        const actorRef  = actor?._id || null;
        const ip        = ipAddress || resolveIp(req);
        const userAgent = req?.headers?.['user-agent'] || null;

        const entry = await AuditLog.create({
            actorRef,
            actorSnapshot: buildActorSnapshot(actor),
            category,
            action,
            description,
            targetType,
            targetId,
            targetLabel,
            ipAddress: ip,
            userAgent,
            severity,
            metadata
        });

        return entry;
    } catch (err) {
        console.error('[AuditLogger] Failed to write audit entry:', err.message);
        return null;
    }
};

/**
 * Pre-built category shortcuts.
 */
const audit = {
    // Enrollment & Financial
    enrollment: (opts) => auditLog({ ...opts, category: 'Enrollment & Financial' }),

    // Course Approvals & Content
    course: (opts) => auditLog({ ...opts, category: 'Course Approvals & Content' }),

    // User Security & Activity
    security: (opts) => auditLog({ ...opts, category: 'User Security & Activity' }),

    // System & Diagnostics
    system: (opts) => auditLog({ ...opts, category: 'System & Diagnostics' })
};

module.exports = { auditLog, audit, resolveIp };
