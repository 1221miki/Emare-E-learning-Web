/**
 * eventValidation.js — Admin Event Validation Engine
 *
 * Pure, framework-free checks used by the backend controller (authoritative)
 * and mirrored by the Admin UI for the live checklist drawer.
 *
 * Returns: {
 *   passed: boolean,
 *   checks: [{ key, label, passed, critical, message }]
 * }
 */

const toMinutes = (t) => {
    if (!t || typeof t !== 'string') return null;
    const m = t.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
};

const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\/.+/i.test(v.trim());

/**
 * @param {object} event    Event doc (plain object / lean is fine)
 * @param {object|null} instructor  Optional populated User doc (submittedBy)
 * @returns {{passed: boolean, checks: Array}}
 */
const validateEvent = (event, instructor = null) => {
    const checks = [];
    const push = (key, label, passed, message) =>
        checks.push({ key, label, passed, critical: true, message });

    // 1. Title & Description
    const titleOk = typeof event.title === 'string' && event.title.trim().length >= 10;
    const descOk = Array.isArray(event.description) && event.description.length > 0;
    push(
        'titleDescription',
        'Title & Description',
        titleOk && descOk,
        titleOk && descOk
            ? 'Title is descriptive and full description provided.'
            : (titleOk ? 'Description is missing.' : 'Title must be at least 10 characters and a description is required.')
    );

    // 2. Date & Time Schedule
    const startFuture =
        event.startDate && new Date(event.startDate).getTime() > Date.now();
    const startMin = toMinutes(event.startTime);
    const endMin = toMinutes(event.endTime);
    const endAfterStart =
        startMin !== null && endMin !== null && endMin > startMin;
    push(
        'schedule',
        'Date & Time Schedule',
        Boolean(startFuture) && Boolean(endAfterStart),
        !startFuture
            ? 'Start date must be in the future.'
            : (!endAfterStart ? 'End time must be after start time.' : 'Schedule is valid.')
    );

    // 3. Capacity & Seats
    const capacityOk = Number(event.totalSlots) > 0;
    push(
        'capacity',
        'Capacity & Seats',
        capacityOk,
        capacityOk ? 'Capacity is set above zero.' : 'totalSlots must be greater than 0.'
    );

    // 4. Location / Stream Link
    const hasVenue = typeof event.venue === 'string' && event.venue.trim().length > 0;
    const hasStream = isHttpUrl(event.streamUrl);
    const needsVenue = event.eventType !== 'Online';
    const needsStream = event.eventType !== 'Physical';
    const locationOk = (!needsVenue || hasVenue) && (!needsStream || hasStream);
    push(
        'locationOrStream',
        'Location / Stream Link',
        locationOk,
        locationOk
            ? 'Venue and/or live stream link provided.'
            : (needsVenue && !hasVenue
                ? 'Physical venue required for this event type.'
                : 'A valid live-stream URL (http/https) is required for online events.')
    );

    // 5. Instructor Verification
    const user = instructor || (event.submittedBy && typeof event.submittedBy === 'object' ? event.submittedBy : null);
    const instructorOk =
        Boolean(user) &&
        user.isActive !== false &&
        ['Instructor', 'Admin'].includes(user.assignedRole);
    push(
        'instructorVerified',
        'Instructor Verification',
        instructorOk,
        instructorOk
            ? 'Submitted by a verified active instructor.'
            : 'A valid active instructor profile must be attached to the event.'
    );

    // 6. Cover Image & Banner
    const coverOk = typeof event.image === 'string' && event.image.trim().length > 0;
    push(
        'coverImage',
        'Cover Image & Banner',
        coverOk,
        coverOk ? 'High-resolution cover image attached.' : 'Cover image is missing — upload one to media storage.'
    );

    return { passed: checks.every((c) => c.passed), checks };
};

module.exports = { validateEvent };
