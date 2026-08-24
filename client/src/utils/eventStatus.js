const toMinutes = (t) => {
    const [h, m] = String(t || '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

/**
 * Compute the auto-derived status of an event based on its schedule.
 * - cancelled  → administrator cancelled it
 * - upcoming   → start time has not arrived yet
 * - live       → current time is between start and end (or no end set)
 * - completed  → end time has passed
 */
export function getLiveStatus(event, now = Date.now()) {
    if (!event) return 'upcoming';
    if (event.status === 'CANCELLED') return 'cancelled';
    const start = event.startDate ? new Date(event.startDate).getTime() : null;
    if (start == null) return 'upcoming';
    if (now < start) return 'upcoming';

    let end = event.endDate ? new Date(event.endDate).getTime() : null;
    if (end == null && event.startTime && event.endTime) {
        const dur = toMinutes(event.endTime) - toMinutes(event.startTime);
        end = dur > 0 ? start + dur * 60000 : null;
    }
    if (end == null) return 'live';
    if (now > end) return 'completed';
    return 'live';
}

export const LIVE_STATUS_META = {
    upcoming: { label: 'Upcoming', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    live: { label: 'Live', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    completed: { label: 'Completed', color: '#64748b', bg: 'rgba(100,116,139,0.14)' },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

/**
 * Format a date consistently, e.g. "August 19, 2026 • 10:20 AM".
 */
export function formatEventDate(date, withTime = true) {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!withTime) return dateStr;
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${dateStr} • ${timeStr}`;
}

export const isValidUrl = (value) => {
    if (!value) return true;
    try {
        const u = new URL(value);
        return ['http:', 'https:'].includes(u.protocol);
    } catch {
        return false;
    }
};

export const EVENT_CATEGORIES = [
    'Masterclass',
    'Workshop',
    'Live Stream',
    'Webinar',
    'Bootcamp',
    'Academic',
    'Holiday',
    'Training',
];
