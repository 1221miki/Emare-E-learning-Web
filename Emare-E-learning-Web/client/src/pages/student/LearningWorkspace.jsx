/**
 * LearningWorkspace.jsx
 *
 * Sequential course learning — backend is the source of truth.
 *
 * Rules:
 *  - Only the first unfinished lesson is accessible at any time
 *  - A lesson is "completed" when the student marks it complete
 *  - Completion is saved to the backend → persists across browsers/devices/logouts
 *  - Next lesson is locked until current lesson is completed
 *  - If a lesson has quizRequired=true or assignmentRequired=true, those must
 *    be satisfied before "Mark as Complete" is accepted (enforced on backend too)
 *  - After the final lesson → completion screen → certificate
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, learningProgressService, certificateService } from '../../services/api.jsx';
import { getPdfUrl } from '../../services/api.jsx';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import AiAssistant from '../../components/AiAssistant';
import { getLessonVideoUrl, getVideoEmbedUrl, getVideoRenderMode, getVideoErrorReason } from '../../utils/videoPlayer';

// ── Inline icons ──────────────────────────────────────────────────────────────
const IconPlay  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>;
const IconPdf   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-2 8H7v-2h4v2zm2-4H7v-2h6v2z"/></svg>;
const IconLink  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>;
const IconLock  = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>;
const IconMenu  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>;
const IconSun   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 11H1v2h3v-2zm9-9h-2v2.99h2V2zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 11v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg>;
const IconMoon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>;

// ── Helper: flatten curriculum into an ordered list of lesson refs ────────────
function flattenLessons(curriculumTree = []) {
    const flat = [];
    curriculumTree.forEach((ch, ci) => {
        (ch.lessons || []).forEach((l, li) => {
            flat.push({ chapterIndex: ci, lessonIndex: li, lesson: l, chapterTitle: ch.chapterTitle });
        });
    });
    return flat;
}

// ── Helper: build Set of completed lesson keys from backend progress ──────────
function buildCompletedSet(progressItems = []) {
    const s = new Set();
    (progressItems || []).forEach(item => {
        if (item.completed) s.add(`${item.chapterIndex}-${item.lessonIndex}`);
    });
    return s;
}

// ── Helper: find first lesson NOT yet completed ───────────────────────────────
function firstUncompletedIndex(flat, completedSet) {
    for (let i = 0; i < flat.length; i++) {
        const { chapterIndex, lessonIndex } = flat[i];
        if (!completedSet.has(`${chapterIndex}-${lessonIndex}`)) return i;
    }
    return flat.length; // all done
}

// ── RequirementsBlocker — professional blocking panel shown below nav row ─────
function RequirementsBlocker({ reqStatus, courseId, lessonId, onDismiss, colors, isDark }) {
    const navigate = useNavigate();
    const border  = isDark ? '#334155' : '#e2e8f0';
    const text    = isDark ? '#f1f5f9' : '#0f172a';
    const muted   = isDark ? '#94a3b8' : '#64748b';
    const red     = '#ef4444';
    const green   = '#10b981';

    const { quizRequired, quizPassed, assignmentRequired, assignmentSubmitted, linkedQuizId, linkedAssignmentId } = reqStatus;

    const items = [];
    if (quizRequired) {
        items.push({
            done: quizPassed,
            label: 'Quiz',
            doneText: 'Completed',
            todoText: 'Not completed',
            action: linkedQuizId ? () => navigate(`/student/quiz/${linkedQuizId}`) : null,
            actionLabel: 'Complete Quiz'
        });
    }
    if (assignmentRequired) {
        items.push({
            done: assignmentSubmitted,
            label: 'Assignment',
            doneText: 'Submitted',
            todoText: 'Not submitted',
            action: linkedAssignmentId ? () => navigate(`/student/assignments/${courseId}`) : null,
            actionLabel: 'Submit Assignment'
        });
    }

    return (
        <div style={{
            margin: '14px 0 0',
            borderRadius: 14,
            border: `1.5px solid ${isDark ? 'rgba(239,68,68,0.35)' : '#fca5a5'}`,
            background: isDark ? 'rgba(239,68,68,0.08)' : '#fff7f7',
            padding: '16px 20px',
            animation: 'fadeIn 0.2s ease'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: isDark ? '#fca5a5' : '#b91c1c' }}>
                        Complete required activities first
                    </span>
                </div>
                <button
                    onClick={onDismiss}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                    aria-label="Dismiss"
                >×</button>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: 13, color: muted, lineHeight: 1.6 }}>
                Please complete the required activities below before marking this lesson as complete.
            </p>

            {/* Status rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item) => (
                    <div key={item.label} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                        border: `1px solid ${isDark ? border : '#fde8e8'}`,
                        borderRadius: 10, padding: '10px 14px', gap: 12
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 16 }}>{item.done ? '🟢' : '🔴'}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: text }}>{item.label}</div>
                                <div style={{ fontSize: 12, color: item.done ? green : red, fontWeight: 600 }}>
                                    {item.done ? item.doneText : item.todoText}
                                </div>
                            </div>
                        </div>
                        {!item.done && item.action && (
                            <button
                                onClick={item.action}
                                style={{
                                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                    color: '#fff', border: 'none', borderRadius: 8,
                                    padding: '7px 14px', fontWeight: 700, fontSize: 12,
                                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
                                }}
                            >
                                {item.actionLabel}
                            </button>
                        )}
                        {!item.done && !item.action && (
                            <span style={{ fontSize: 11, color: muted, fontStyle: 'italic', flexShrink: 0 }}>
                                Not linked yet
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function LearningWorkspace() {
    const { logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const { courseId } = useParams();
    const navigate     = useNavigate();

    // ── Core state ────────────────────────────────────────────────────────────
    const [course,          setCourse]          = useState(null);
    const [pageLoading,     setPageLoading]     = useState(true);
    const [pageError,       setPageError]       = useState(null);

    // Progress — source of truth from backend
    const [completedSet,    setCompletedSet]    = useState(new Set());
    const [progressPct,     setProgressPct]     = useState(0);

    // Active lesson navigation
    const [activeFlatIdx,   setActiveFlatIdx]   = useState(0);
    const flatLessons = course ? flattenLessons(course.curriculumTree) : [];

    // Video player state
    const [videoUrl,        setVideoUrl]        = useState('');
    const [videoError,      setVideoError]      = useState('');
    const [videoLoading,    setVideoLoading]    = useState(false);

    // Completion actions
    const [markingDone,     setMarkingDone]     = useState(false);
    const [showCompletion,  setShowCompletion]  = useState(false);
    const [certLoading,     setCertLoading]     = useState(false);
    const [certError,       setCertError]       = useState('');
    const [certId,          setCertId]          = useState('');

    // ── Requirement-gating state ──────────────────────────────────────────────
    // null = not yet fetched; object = { quizRequired, quizPassed, assignmentRequired, assignmentSubmitted, canComplete }
    const [reqStatus,       setReqStatus]       = useState(null);
    const [reqLoading,      setReqLoading]      = useState(false);
    // showBlocker is true after a failed "Mark Complete" attempt until dismissed or retried
    const [showBlocker,     setShowBlocker]     = useState(false);

    // Sidebar / UI
    const [sidebarOpen,     setSidebarOpen]     = useState(true);
    const [expandedChapters,setExpandedChapters]= useState(new Set([0]));
    const [tab,             setTab]             = useState('overview');

    const saveInFlight = useRef(false);

    // ── Computed from activeFlatIdx ───────────────────────────────────────────
    const activeItem    = flatLessons[activeFlatIdx] || null;
    const activeLesson  = activeItem?.lesson || null;
    const activeChapterIndex = activeItem?.chapterIndex ?? 0;
    const activeLessonIndex  = activeItem?.lessonIndex ?? 0;
    const activeKey     = `${activeChapterIndex}-${activeLessonIndex}`;
    const isCurrentDone = completedSet.has(activeKey);

    const totalLessons   = flatLessons.length;
    const completedCount = completedSet.size;
    const isFinalLesson  = activeFlatIdx === totalLessons - 1;

    const firstUncompIdx     = firstUncompletedIndex(flatLessons, completedSet);
    const isLessonAccessible = (flatIdx) => flatIdx <= firstUncompIdx;

    const hasPdf      = !!(activeLesson?.notesPdfUrl);
    const hasResource = !!(activeLesson?.resourceLink && activeLesson.resourceLink !== activeLesson.notesPdfUrl);

    // Does this lesson actually require anything?
    const lessonHasRequirements = !!(activeLesson?.quizRequired || activeLesson?.assignmentRequired);

    // ── Theme helpers ─────────────────────────────────────────────────────────
    const isDark   = theme === 'dark';
    const bg       = isDark ? '#0f172a' : '#f8fafc';
    const bgCard   = isDark ? '#1e293b' : '#ffffff';
    const bgSide   = isDark ? '#1e293b' : '#f1f5f9';
    const border   = isDark ? '#334155' : '#e2e8f0';
    const text     = isDark ? '#f1f5f9' : '#0f172a';
    const muted    = isDark ? '#94a3b8' : '#64748b';
    const accent   = '#6366f1';
    const green    = '#10b981';
    const blue     = '#3b82f6';
    const gold     = '#f59e0b';

    // ── Load course + backend progress ────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setPageLoading(true);
        Promise.all([
            courseService.getById(courseId),
            learningProgressService.getCourseProgress(courseId).catch(() => ({ data: { data: null } }))
        ]).then(([courseRes, progressRes]) => {
            if (cancelled) return;
            const courseData   = courseRes.data.data;
            const progressData = progressRes.data?.data;
            setCourse(courseData);
            const flat = flattenLessons(courseData.curriculumTree);
            const done = buildCompletedSet(progressData?.progressItems);
            const pct  = progressData?.completionPercentage ?? 0;
            setCompletedSet(done);
            setProgressPct(pct);
            const resumeIdx = Math.min(firstUncompletedIndex(flat, done), Math.max(0, flat.length - 1));
            setActiveFlatIdx(resumeIdx);
            setExpandedChapters(new Set([flat[resumeIdx]?.chapterIndex ?? 0]));
            if (pct >= 100 && flat.length > 0) setShowCompletion(true);
        }).catch(err => {
            if (!cancelled) setPageError(err.response?.data?.message || 'Failed to load workspace.');
        }).finally(() => {
            if (!cancelled) setPageLoading(false);
        });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId]);

    // ── Load video whenever active lesson changes ─────────────────────────────
    useEffect(() => {
        if (!activeLesson) return;
        setShowBlocker(false);
        setReqStatus(null);
        const raw = getLessonVideoUrl(activeLesson);
        if (!raw) { setVideoUrl(''); setVideoError('No video available for this lesson.'); return; }
        setVideoLoading(true);
        setVideoError('');
        const url = getVideoEmbedUrl(raw);
        if (url) { setVideoUrl(url); } else {
            setVideoUrl('');
            setVideoError(getVideoErrorReason(raw) || 'This lesson does not have a playable video.');
        }
        setVideoLoading(false);
        setTab('overview');
    }, [activeFlatIdx, activeLesson]);

    // ── Fetch requirement status whenever the active lesson changes ───────────
    // We only call the API if the lesson actually has requirements AND isn't done yet.
    useEffect(() => {
        if (!activeLesson || isCurrentDone) return;
        if (!lessonHasRequirements) { setReqStatus(null); return; }
        let cancelled = false;
        setReqLoading(true);
        learningProgressService.getLessonRequirementsStatus(courseId, activeLesson._id.toString())
            .then(res => {
                if (!cancelled) setReqStatus(res.data?.data || null);
            })
            .catch(() => { if (!cancelled) setReqStatus(null); })
            .finally(() => { if (!cancelled) setReqLoading(false); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFlatIdx, activeLesson, isCurrentDone, lessonHasRequirements]);

    // ── Save lesson completion to backend ─────────────────────────────────────
    const saveCompletionToBackend = useCallback(async (ciIdx, liIdx) => {
        if (saveInFlight.current || !course) return;
        saveInFlight.current = true;
        try {
            const lesson = course.curriculumTree?.[ciIdx]?.lessons?.[liIdx];
            if (!lesson) return;
            const res = await learningProgressService.saveLessonProgress(
                courseId,
                lesson._id.toString(),
                { completed: true, lessonTitle: lesson.lessonTitle || '' }
            );
            const updated = res.data?.data;
            if (updated) {
                const newDone = buildCompletedSet(updated.progressItems);
                setCompletedSet(newDone);
                setProgressPct(updated.completionPercentage ?? 0);
                setShowBlocker(false);
                if (updated.completionPercentage >= 100) {
                    setTimeout(() => setShowCompletion(true), 600);
                }
            }
        } catch (err) {
            // 422 = requirements not met — backend returned the detailed status
            if (err.response?.status === 422 && err.response?.data?.data) {
                setReqStatus(err.response.data.data);
                setShowBlocker(true);
            } else {
                console.error('[LearningWorkspace] save progress failed:', err.message);
            }
        } finally {
            saveInFlight.current = false;
        }
    }, [course, courseId]);

    // ── Mark Complete button handler ──────────────────────────────────────────
    const handleMarkComplete = async () => {
        if (isCurrentDone || markingDone) return;
        setMarkingDone(true);
        await saveCompletionToBackend(activeChapterIndex, activeLessonIndex);
        setMarkingDone(false);
    };

    // ── Refresh requirement status (called after student returns from quiz/assignment) ──
    const refreshReqStatus = useCallback(() => {
        if (!activeLesson || !lessonHasRequirements) return;
        setReqLoading(true);
        learningProgressService.getLessonRequirementsStatus(courseId, activeLesson._id.toString())
            .then(res => setReqStatus(res.data?.data || null))
            .catch(() => {})
            .finally(() => setReqLoading(false));
    }, [activeLesson, lessonHasRequirements, courseId]);

    // ── Navigate to a flat lesson index ──────────────────────────────────────
    const goToFlatIdx = useCallback((idx) => {
        if (!flatLessons[idx]) return;
        if (!isLessonAccessible(idx)) return;
        setActiveFlatIdx(idx);
        setExpandedChapters(prev => new Set([...prev, flatLessons[idx].chapterIndex]));
        window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flatLessons, completedSet]);

    const goPrev = () => { if (activeFlatIdx > 0) goToFlatIdx(activeFlatIdx - 1); };

    const goNext = () => {
        if (!isCurrentDone) return;
        if (isFinalLesson) { setShowCompletion(true); } else { goToFlatIdx(activeFlatIdx + 1); }
    };

    // ── Certificate generation ────────────────────────────────────────────────
    const handleGetCertificate = async () => {
        setCertLoading(true); setCertError('');
        try {
            const res = await certificateService.issue(courseId);
            const cert = res.data?.data;
            setCertId(cert?.certificateId || cert?.certificateNumber || '');
        } catch (err) {
            setCertError(err?.response?.data?.message || 'Failed to generate certificate.');
        } finally { setCertLoading(false); }
    };

    const toggleChapter = (idx) => {
        setExpandedChapters(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    // ── Loading / error screens ───────────────────────────────────────────────
    if (pageLoading) return (
        <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #334155', borderTop: '3px solid #6366f1', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#94a3b8', fontFamily: 'Inter, sans-serif', margin: 0 }}>Loading workspace…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
    if (pageError) return <div style={{ color: '#ef4444', padding: 40, textAlign: 'center' }}>{pageError}</div>;
    if (!course)   return <div style={{ color: '#ef4444', padding: 40, textAlign: 'center' }}>Course not found.</div>;

    // ── 🎉 Completion Screen ──────────────────────────────────────────────────
    if (showCompletion) return (
        <div style={{ minHeight: '100vh', background: isDark ? '#0f172a' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: '"Inter", sans-serif' }}>
            <div style={{ maxWidth: 540, width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
                <h1 style={{ color: isDark ? '#f1f5f9' : '#065f46', fontSize: 32, fontWeight: 900, margin: '0 0 10px' }}>Congratulations!</h1>
                <p style={{ color: isDark ? '#94a3b8' : '#047857', fontSize: 16, marginBottom: 4 }}>You have successfully completed</p>
                <p style={{ color: isDark ? '#f1f5f9' : '#1a1a2e', fontSize: 18, fontWeight: 700, marginBottom: 28 }}>{course.courseTitle}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 32 }}>
                    {[['Lessons', `${totalLessons}/${totalLessons}`], ['Progress', '100%'], ['Status', 'Complete']].map(([label, value]) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: green }}>{value}</div>
                            <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
                        </div>
                    ))}
                </div>
                <div style={{ background: isDark ? '#1e293b' : '#fff', border: `2px solid ${isDark ? 'rgba(16,185,129,0.3)' : '#6ee7b7'}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
                    {certId ? (
                        <>
                            <div style={{ fontSize: 32, marginBottom: 10 }}>📜</div>
                            <h3 style={{ color: isDark ? '#34d399' : '#065f46', margin: '0 0 6px', fontSize: 17, fontWeight: 800 }}>Certificate Ready!</h3>
                            <div style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f0fdf4', borderRadius: 8, padding: '10px 16px', marginBottom: 14 }}>
                                <div style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Certificate ID</div>
                                <div style={{ color: gold, fontFamily: 'monospace', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em' }}>{certId}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => navigate('/student/certificates')} style={{ background: `linear-gradient(135deg, ${green}, #059669)`, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>📥 Download Certificate</button>
                                <button onClick={() => navigate(`/verify-certificate/${certId}`)} style={{ background: 'rgba(255,255,255,0.1)', color: isDark ? '#e2e8f0' : '#374151', border: `1px solid ${border}`, borderRadius: 10, padding: '12px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>🔍 Verify</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: 36, marginBottom: 10 }}>🏆</div>
                            <h3 style={{ color: isDark ? '#f1f5f9' : '#1a1a2e', margin: '0 0 6px', fontSize: 17, fontWeight: 800 }}>Your Certificate Awaits</h3>
                            <p style={{ color: muted, fontSize: 13, marginBottom: 16 }}>Generate your unique certificate for this course.</p>
                            {certError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>⚠ {certError}</p>}
                            <button onClick={handleGetCertificate} disabled={certLoading} style={{ background: certLoading ? muted : 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15, cursor: certLoading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                {certLoading ? <><span style={{ display: 'inline-block', width: 15, height: 15, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Generating…</> : '🎓 Get My Certificate'}
                            </button>
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button onClick={() => { setShowCompletion(false); setActiveFlatIdx(0); }} style={{ background: 'transparent', border: `1px solid ${border}`, color: muted, borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>← Review Course</button>
                    <button onClick={() => navigate('/student/dashboard')} style={{ background: `${accent}20`, border: `1px solid ${accent}40`, color: accent, borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Dashboard →</button>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // ── Main Workspace ────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: bg, fontFamily: '"Inter", -apple-system, sans-serif', color: text }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; }
                ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: ${isDark ? '#334155' : '#cbd5e1'}; border-radius: 3px; }
                .lesson-row:hover { background: ${isDark ? '#1e3a5f20' : '#eff6ff'} !important; }
                .tab-btn { border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 6px; transition: all 0.15s; }
                .action-link { display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; text-decoration: none; transition: transform 0.15s, opacity 0.15s; }
                .action-link:hover { transform: translateY(-1px); opacity: 0.92; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            {/* ── Top Navbar ─────────────────────────────────────────────── */}
            <nav style={{ height: 60, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bgCard, borderBottom: `1px solid ${border}`, flexShrink: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: 6 }}><IconMenu /></button>
                    <button onClick={() => navigate('/student/dashboard')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, fontSize: 13, fontWeight: 600 }}>← Dashboard</button>
                    <div style={{ width: 1, height: 20, background: border }} />
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: text, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.courseTitle}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 280, margin: '0 20px' }}>
                    <div style={{ flex: 1, height: 6, background: border, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: `linear-gradient(90deg, ${accent}, ${green})`, borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: muted, whiteSpace: 'nowrap' }}>{progressPct}% done</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => navigate(`/student/discussions/${course._id}`)} style={{ background: `${accent}18`, border: `1px solid ${accent}30`, color: accent, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Q&amp;A</button>
                    <button onClick={() => navigate(`/student/assignments/${course._id}`)} style={{ background: `${blue}18`, border: `1px solid ${blue}30`, color: blue, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Assignments</button>
                    <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: 6 }}>{isDark ? <IconSun /> : <IconMoon />}</button>
                    <button onClick={async () => { await logout(); navigate('/'); }} style={{ background: '#ef444418', border: '1px solid #ef444430', color: '#ef4444', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Sign Out</button>
                </div>
            </nav>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* ── Content area ─────────────────────────────────────── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0 }}>

                    {/* Video Player */}
                    <div style={{ background: '#000', width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                        {videoLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #334155', borderTop: `3px solid ${accent}`, animation: 'spin 0.8s linear infinite' }} />
                                <span style={{ color: '#94a3b8', fontSize: 13 }}>Loading video…</span>
                            </div>
                        ) : videoError ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, textAlign: 'center' }}>
                                <div style={{ color: '#ef4444', marginBottom: 12 }}><IconLock /></div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>
                                    {videoError.includes('YouTube') || videoError.includes('format') ? 'Video Not Available' : 'Content Gated'}
                                </div>
                                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, maxWidth: 400, lineHeight: 1.6 }}>{videoError}</div>
                                {!videoError.includes('YouTube') && !videoError.includes('format') && !videoError.includes('instructor') && (
                                    <button onClick={() => navigate('/student/payments')} style={{ background: `linear-gradient(135deg, ${accent}, #7c3aed)`, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Proceed to Payment →</button>
                                )}
                            </div>
                        ) : videoUrl ? (
                            getVideoRenderMode(videoUrl) === 'video' ? (
                                <video key={videoUrl} src={videoUrl} controls controlsList="nodownload" style={{ width: '100%', height: '100%', background: '#000' }} title={activeLesson?.lessonTitle || 'Lesson video'} />
                            ) : (
                                <iframe key={videoUrl} src={videoUrl} title={activeLesson?.lessonTitle || 'Lesson video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen style={{ width: '100%', height: '100%', border: 'none' }} />
                            )
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 28 }}>▶</div>
                                <span style={{ color: '#475569', fontSize: 14 }}>Select a lesson to start learning</span>
                            </div>
                        )}
                    </div>

                    {/* Lesson Info */}
                    <div style={{ padding: '20px 28px 0', animation: 'fadeIn 0.25s ease' }}>
                        {/* Chapter / Lesson label */}
                        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {activeItem?.chapterTitle} — Lesson {activeLessonIndex + 1}
                        </p>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: text, lineHeight: 1.3 }}>
                            {activeLesson?.lessonTitle || 'Welcome to the course'}
                        </h1>
                        {activeLesson?.durationMinutes > 0 && (
                            <p style={{ margin: '6px 0 0', fontSize: 13, color: muted }}>{activeLesson.durationMinutes} min</p>
                        )}

                        {/* ── Completion requirement indicator (shown when lesson has gates) ── */}
                        {!isCurrentDone && lessonHasRequirements && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: muted, fontWeight: 600 }}>Required to complete:</span>
                                {activeLesson.quizRequired && (
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                                        background: reqStatus?.quizPassed ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                        color: reqStatus?.quizPassed ? '#10b981' : '#f59e0b',
                                        border: `1px solid ${reqStatus?.quizPassed ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`
                                    }}>
                                        {reqStatus?.quizPassed ? '✓ Quiz done' : '⚬ Quiz required'}
                                    </span>
                                )}
                                {activeLesson.assignmentRequired && (
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                                        background: reqStatus?.assignmentSubmitted ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
                                        color: reqStatus?.assignmentSubmitted ? '#10b981' : '#a78bfa',
                                        border: `1px solid ${reqStatus?.assignmentSubmitted ? 'rgba(16,185,129,0.35)' : 'rgba(139,92,246,0.35)'}`
                                    }}>
                                        {reqStatus?.assignmentSubmitted ? '✓ Assignment done' : '⚬ Assignment required'}
                                    </span>
                                )}
                                {reqLoading && (
                                    <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(148,163,184,0.3)', borderTopColor: muted, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                )}
                            </div>
                        )}

                        {/* ── Navigation row ──────────────────────────── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                            {/* Previous */}
                            <button onClick={goPrev} disabled={activeFlatIdx === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, background: activeFlatIdx === 0 ? 'transparent' : bgCard, border: `1.5px solid ${border}`, color: activeFlatIdx === 0 ? muted : text, borderRadius: 8, padding: '8px 16px', cursor: activeFlatIdx === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, opacity: activeFlatIdx === 0 ? 0.4 : 1 }}>
                                ← Previous
                            </button>

                            {/* Mark Complete */}
                            {!isCurrentDone ? (
                                <button onClick={handleMarkComplete} disabled={markingDone} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `linear-gradient(135deg, ${green}, #059669)`, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: markingDone ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>
                                    {markingDone
                                        ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Checking…</>
                                        : <><IconCheck /> Mark as Complete</>
                                    }
                                </button>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: green, fontWeight: 700, fontSize: 13, background: `${green}15`, border: `1px solid ${green}30`, borderRadius: 8, padding: '8px 14px' }}>
                                    <IconCheck /> Completed
                                </div>
                            )}

                            {/* Refresh requirements button (visible when lesson has unfulfilled requirements) */}
                            {!isCurrentDone && lessonHasRequirements && reqStatus && !reqStatus.canComplete && (
                                <button onClick={refreshReqStatus} disabled={reqLoading} title="Refresh requirement status" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '8px 12px', cursor: reqLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 12 }}>
                                    {reqLoading
                                        ? <span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid rgba(148,163,184,0.3)', borderTopColor: muted, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                        : '↻'
                                    } Refresh
                                </button>
                            )}

                            {/* Next / Finish */}
                            {!isCurrentDone ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isDark ? '#1e293b' : '#f1f5f9', border: `1.5px solid ${border}`, color: muted, borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600 }}>
                                    <IconLock />
                                    {isFinalLesson ? 'Finish Course (complete lesson first)' : 'Next Lesson (complete lesson first)'}
                                </div>
                            ) : (
                                <button onClick={goNext} style={{ display: 'flex', alignItems: 'center', gap: 6, background: isFinalLesson ? `linear-gradient(135deg, ${gold}, #d97706)` : `linear-gradient(135deg, ${accent}, #7c3aed)`, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                                    {isFinalLesson ? '🏆 Finish Course' : <>Next Lesson <IconPlay /></>}
                                </button>
                            )}
                        </div>

                        {/* ── Requirements Blocker panel ───────────────── */}
                        {showBlocker && reqStatus && !reqStatus.canComplete && (
                            <RequirementsBlocker
                                reqStatus={reqStatus}
                                courseId={courseId}
                                lessonId={activeLesson?._id?.toString()}
                                onDismiss={() => setShowBlocker(false)}
                                colors={colors}
                                isDark={isDark}
                            />
                        )}

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${border}`, marginTop: 18 }}>
                            {[['overview','Overview'], ['resources','Resources & Notes'], ['notes','About Course']].map(([key, label]) => (
                                <button key={key} className="tab-btn" onClick={() => setTab(key)} style={{ background: tab === key ? `${accent}18` : 'transparent', color: tab === key ? accent : muted, borderBottom: tab === key ? `2px solid ${accent}` : '2px solid transparent', borderRadius: '6px 6px 0 0' }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab content */}
                    <div style={{ flex: 1, padding: '20px 28px 32px', animation: 'fadeIn 0.2s ease' }}>
                        {tab === 'overview' && (
                            <div>
                                <p style={{ margin: '0 0 20px', color: muted, fontSize: 14, lineHeight: 1.7 }}>
                                    {activeLesson?.description || `Watch the video above and use the "Mark as Complete" button when you're ready to proceed to the next lesson.`}
                                </p>
                                {(hasPdf || hasResource) && (
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                        {hasPdf && (
                                            <a href={getPdfUrl(activeLesson.notesPdfUrl)} target="_blank" rel="noopener noreferrer" className="action-link" style={{ background: `linear-gradient(135deg, ${green}, #059669)`, color: '#fff' }}>
                                                <IconPdf /> Download Lesson PDF / Notes
                                            </a>
                                        )}
                                        {hasResource && (
                                            <a href={getPdfUrl(activeLesson.resourceLink)} target="_blank" rel="noopener noreferrer" className="action-link" style={{ background: `linear-gradient(135deg, ${blue}, #6366f1)`, color: '#fff' }}>
                                                <IconLink /> Open Resource ↗
                                            </a>
                                        )}
                                    </div>
                                )}
                                {!hasPdf && !hasResource && (
                                    <div style={{ padding: '16px 20px', borderRadius: 10, background: isDark ? '#1e293b' : '#f8fafc', border: `1px solid ${border}`, color: muted, fontSize: 13 }}>
                                        No downloadable resources for this lesson.
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'resources' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: text }}>Lesson Resources</h3>
                                <p style={{ margin: '0 0 16px', fontSize: 13, color: muted }}>All downloadable materials and external links for this lesson.</p>
                                {hasPdf ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 10, background: isDark ? '#1e293b' : '#f0fdf4', border: `1px solid ${isDark ? '#10b98130' : '#bbf7d0'}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 8, background: `${green}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: green }}><IconPdf /></div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: text }}>Lesson Notes (PDF)</div>
                                                <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Comprehensive notes for this lesson</div>
                                            </div>
                                        </div>
                                        <a href={getPdfUrl(activeLesson.notesPdfUrl)} target="_blank" rel="noopener noreferrer" className="action-link" style={{ background: `linear-gradient(135deg, ${green}, #059669)`, color: '#fff', fontSize: 12, padding: '8px 16px' }}>Download</a>
                                    </div>
                                ) : (
                                    <div style={{ padding: '14px 18px', borderRadius: 10, background: isDark ? '#1e293b' : '#f8fafc', border: `1px solid ${border}`, color: muted, fontSize: 13 }}>No PDF notes attached.</div>
                                )}
                                {hasResource && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 10, background: isDark ? '#1e293b' : '#eff6ff', border: `1px solid ${isDark ? '#3b82f630' : '#bfdbfe'}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 8, background: `${blue}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: blue }}><IconLink /></div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: text }}>External Resource</div>
                                                <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Drive / External link</div>
                                            </div>
                                        </div>
                                        <a href={getPdfUrl(activeLesson.resourceLink)} target="_blank" rel="noopener noreferrer" className="action-link" style={{ background: `linear-gradient(135deg, ${blue}, #6366f1)`, color: '#fff', fontSize: 12, padding: '8px 16px' }}>Open ↗</a>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'notes' && (
                            <div>
                                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: text }}>About this Course</h3>
                                <p style={{ margin: 0, fontSize: 14, color: muted, lineHeight: 1.7 }}>{course.descriptionText || 'No description provided.'}</p>
                                {course.learningObjectives?.length > 0 && (
                                    <div style={{ marginTop: 20 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: text }}>What you'll learn</h4>
                                        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {course.learningObjectives.map((obj, i) => <li key={i} style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>{obj}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Sidebar ─────────────────────────────────────── */}
                {sidebarOpen && (
                    <div style={{ width: 340, display: 'flex', flexDirection: 'column', background: bgSide, borderLeft: `1px solid ${border}`, flexShrink: 0, overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, background: bgCard, flexShrink: 0 }}>
                            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: text }}>Course Content</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 5, background: border, borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${progressPct}%`, height: '100%', background: `linear-gradient(90deg, ${accent}, ${green})`, borderRadius: 3, transition: 'width 0.5s ease' }} />
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: muted, whiteSpace: 'nowrap' }}>{completedCount}/{totalLessons}</span>
                            </div>
                        </div>

                        {/* Curriculum */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {course.curriculumTree?.map((chapter, cIdx) => (
                                <div key={chapter._id || cIdx} style={{ borderBottom: `1px solid ${border}` }}>
                                    <button onClick={() => toggleChapter(cIdx)} style={{ width: '100%', textAlign: 'left', background: isDark ? '#263147' : '#e2e8f0', border: 'none', padding: '11px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{chapter.chapterTitle}</div>
                                            <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{chapter.lessons?.length || 0} lessons</div>
                                        </div>
                                        <span style={{ color: muted, fontSize: 10, transform: expandedChapters.has(cIdx) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                                    </button>

                                    {expandedChapters.has(cIdx) && chapter.lessons?.map((lesson, lIdx) => {
                                        const flatIdx  = flatLessons.findIndex(f => f.chapterIndex === cIdx && f.lessonIndex === lIdx);
                                        const isActive = activeFlatIdx === flatIdx;
                                        const isDone   = completedSet.has(`${cIdx}-${lIdx}`);
                                        const locked   = !isLessonAccessible(flatIdx);
                                        const hasQuizReq = lesson.quizRequired;
                                        const hasAsgReq  = lesson.assignmentRequired;

                                        return (
                                            <div key={lesson._id || lIdx} className={locked ? '' : 'lesson-row'} onClick={() => !locked && goToFlatIdx(flatIdx)} style={{ padding: '10px 18px 10px 26px', display: 'flex', alignItems: 'flex-start', gap: 10, cursor: locked ? 'not-allowed' : 'pointer', background: isActive ? `${accent}15` : 'transparent', borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent', opacity: locked ? 0.45 : 1, transition: 'all 0.15s' }}>
                                                {/* Status icon */}
                                                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? green : isActive ? accent : isDark ? '#334155' : '#cbd5e1', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                                    {locked ? '🔒' : isDone ? <IconCheck /> : isActive ? <IconPlay /> : <span style={{ fontSize: 10 }}>{lIdx + 1}</span>}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: locked ? muted : isActive ? accent : text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {lesson.lessonTitle}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                                                        {lesson.durationMinutes > 0 && <span style={{ fontSize: 11, color: muted }}>{lesson.durationMinutes}m</span>}
                                                        {locked && <span style={{ fontSize: 10, color: muted }}>Complete previous lesson first</span>}
                                                        {isDone && !locked && <span style={{ fontSize: 10, color: green, fontWeight: 600 }}>✓ Done</span>}
                                                        {lesson.isFreePreview && !locked && <span style={{ fontSize: 10, background: `${accent}20`, color: accent, borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>Free</span>}
                                                        {/* Requirement badges in sidebar */}
                                                        {!isDone && hasQuizReq && <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>Quiz</span>}
                                                        {!isDone && hasAsgReq && <span style={{ fontSize: 10, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>Assignment</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <AiAssistant context={{ courseName: course.courseTitle, courseId }} />
        </div>
    );
}
