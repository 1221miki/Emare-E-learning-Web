// Global Emare AI Tutor lockout state.
// Restricted pages (quiz/assignment taking) call setAiTutorBlocked() while a
// restricted assessment is open; every AiAssistant instance subscribes and
// hides itself completely, blocking all entry points (floating button, panel,
// quick prompts, voice, file upload, keyboard) on mobile, tablet and desktop.
export const AI_TUTOR_BLOCKED_MESSAGE = 'Emare AI Tutor is disabled for this assessment.';

let blockedReason = null;
const listeners = new Set();

export const setAiTutorBlocked = (reason) => {
    blockedReason = reason || null;
    listeners.forEach((l) => l(blockedReason));
};

export const clearAiTutorBlocked = () => {
    blockedReason = null;
    listeners.forEach((l) => l(blockedReason));
};

export const getAiTutorBlocked = () => blockedReason;

export const subscribeAiTutorBlocked = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
