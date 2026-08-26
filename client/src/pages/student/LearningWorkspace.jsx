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
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, learningProgressService, certificateService, inVideoQuizService } from '../../services/api.jsx';
import { getPdfUrl } from '../../services/api.jsx';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import AiAssistant from '../../components/AiAssistant';
import { getLessonVideoUrl, getVideoEmbedUrl, getVideoRenderMode, getVideoErrorReason } from '../../utils/videoPlayer';
import CheckpointTimeline from '../../components/student/CheckpointTimeline';

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
function RequirementsBlocker({ reqStatus, courseId, lessonId, onDismiss, onJumpToCheckpoint, colors, isDark }) {
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
    // In-video checkpoint quizzes embedded in the lesson video timeline
    if (reqStatus.checkpointsRequired && !reqStatus.checkpointsPassed) {
        const total = reqStatus.checkpointsTotal || 0;
        items.push({
            done: false,
            label: `In-video checkpoint quiz${total > 1 ? `zes (${total})` : ''}`,
            doneText: 'All passed',
            todoText: 'Watch the video and pass every checkpoint quiz that pops up',
            action: onJumpToCheckpoint,
            actionLabel: '▶ Watch & Take Quiz'
        });
    }
    // Full watch-through requirement (HTML5 video lessons only)
    if (reqStatus.videoWatchRequired && !reqStatus.videoWatched) {
        items.push({
            done: false,
            label: 'Watch full video',
            doneText: 'Fully watched',
            todoText: `You've watched ${reqStatus.videoWatchedPercent || 0}% of this lesson video — keep watching to reach 100%`,
            hint: null,
            action: onJumpToCheckpoint,
            actionLabel: '▶ Resume Video'
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
                                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
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
                                {item.hint || 'Not linked yet'}
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
    const [pageError,       setPageError]       = useState(null);
    const [courseLoading,   setCourseLoading]   = useState(true);

    // Progress — source of truth from backend
    const [completedSet,    setCompletedSet]    = useState(new Set());
    const [progressPct,     setProgressPct]     = useState(0);
    // Full progress data (progressItems) — used to restore video position on return
    const [progressItems,   setProgressItems]   = useState([]);

    // Active lesson navigation
    const [activeFlatIdx,   setActiveFlatIdx]   = useState(0);
    const flatLessons = course ? flattenLessons(course.curriculumTree) : [];

    // Video player state
    const [videoUrl,        setVideoUrl]        = useState('');
    const [videoError,      setVideoError]      = useState('');
    const [videoLoading,    setVideoLoading]    = useState(false);

    // ── In-video quiz checkpoints ─────────────────────────────────────────────
    const videoRef                 = useRef(null);
    const playerContainerRef       = useRef(null);   // fullscreen target for checkpoint player
    const playbackTimeRef          = useRef(0);
    const firedCheckpointsRef      = useRef(new Set());   // checkpointIds already popped this session
    const watchedSecondsRef        = useRef(0);           // real played seconds (seek-immune)
    const lastTickRef              = useRef(-1);          // previous currentTime for delta calc
    const lastHeartbeatRef         = useRef(0);           // throttle for periodic progress saves
    const [checkpointsData,        setCheckpointsData]        = useState(null);
    const [activeCheckpoint,       setActiveCheckpoint]       = useState(null);  // checkpoint open in quiz modal
    const [checkpointAnswers,      setCheckpointAnswers]      = useState({});
    const [checkpointResult,       setCheckpointResult]       = useState(null);
    const [checkpointSubmitting,   setCheckpointSubmitting]   = useState(false);
    const [checkpointError,        setCheckpointError]        = useState('');
    const [playbackFailed,         setPlaybackFailed]         = useState(false);
    const [playbackRetryKey,       setPlaybackRetryKey]       = useState(0);
    // Checkpoint timeline UI state (custom progress bar shown when checkpoints exist)
    const [videoDuration,          setVideoDuration]          = useState(0);
    const [uiTime,                 setUiTime]                 = useState(0);
    const [isPlaying,              setIsPlaying]              = useState(false);
    // True when a lesson HAS checkpoints but no direct MP4 could be resolved —
    // checkpoint quizzes cannot run on the iframe embed, so warn instead of
    // silently playing an un-quizzed video.
    const [checkpointDirectFailed, setCheckpointDirectFailed] = useState(false);

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

    // ── Authenticated PDF download ────────────────────────────────────────────
    // Plain <a href> links fail cross-origin because the browser doesn't send
    // the Authorization header or cross-origin cookies. Instead we fetch the PDF
    // via the Axios-equivalent fetch with the JWT, then trigger a blob download.
    const [pdfDownloading, setPdfDownloading] = useState(false);
    const downloadPdf = async (rawUrl, label = 'document.pdf') => {
        const proxyUrl = getPdfUrl(rawUrl);
        if (!proxyUrl) return;
        // Non-Bunny URLs (Google Drive, etc.) — open normally
        if (proxyUrl === rawUrl || !proxyUrl.includes('/api/pdf-proxy/')) {
            window.open(proxyUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        setPdfDownloading(true);
        try {
            const token = localStorage.getItem('elms_token');
            const res = await fetch(proxyUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: 'include'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = label;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch (err) {
            console.error('[downloadPdf] failed:', err);
            alert('Could not download the PDF. Please try again.');
        } finally {
            setPdfDownloading(false);
        }
    };

    // Does this lesson actually require anything before it can be marked complete?
    // Includes: linked quiz, linked assignment, in-video concept quizzes, video watch-through
    const lessonHasCheckpoints = !!(activeLesson?.quizCheckpoints?.length > 0);
    const lessonHasRequirements = !!(
        activeLesson?.quizRequired ||
        activeLesson?.assignmentRequired ||
        lessonHasCheckpoints
    );

    // ── Theme helpers ─────────────────────────────────────────────────────────
    const isDark   = theme === 'dark';
    const bg       = isDark ? '#0f172a' : '#f8fafc';
    const bgCard   = isDark ? '#1e293b' : '#ffffff';
    const bgSide   = isDark ? '#1e293b' : '#f1f5f9';
    const border   = isDark ? '#334155' : '#e2e8f0';
    const text     = isDark ? '#f1f5f9' : '#0f172a';
    const muted    = isDark ? '#94a3b8' : '#64748b';
    const accent   = '#22c55e';
    const green    = '#10b981';
    const blue     = '#22c55e';
    const gold     = '#f59e0b';

    // ── Load course + backend progress ────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setCourseLoading(true);
        Promise.all([
            courseService.getById(courseId),
            learningProgressService.getCourseProgress(courseId).catch(() => ({ data: { data: null } }))
        ]).then(([courseRes, progressRes]) => {
            if (cancelled) return;
            const courseData   = courseRes.data?.data;
            if (!courseData) { setPageError('This course does not exist or is no longer available.'); return; }
            const progressData = progressRes.data?.data;
            setCourse(courseData);
            const flat = flattenLessons(courseData.curriculumTree);
            const done = buildCompletedSet(progressData?.progressItems);
            // Progress % computed against the CURRENT curriculum — never trust
            // a stale backend percentage (curriculum may have changed).
            const doneInCurrentTree = flat.filter(f => done.has(`${f.chapterIndex}-${f.lessonIndex}`)).length;
            const pct = flat.length > 0 ? Math.round((doneInCurrentTree / flat.length) * 100) : 0;
            setCompletedSet(done);
            setProgressPct(pct);
            // Store progress items so the video load effect can restore position
            setProgressItems(progressData?.progressItems || []);
            const resumeIdx = Math.min(firstUncompletedIndex(flat, done), Math.max(0, flat.length - 1));
            setActiveFlatIdx(resumeIdx);
            setExpandedChapters(new Set([flat[resumeIdx]?.chapterIndex ?? 0]));
            // Celebration screen only when EVERY lesson in the current tree is done
            if (flat.length > 0 && doneInCurrentTree === flat.length) setShowCompletion(true);
        }).catch(err => {
            if (!cancelled) setPageError(err.response?.data?.message || 'Failed to load workspace.');
        }).finally(() => {
            if (!cancelled) setCourseLoading(false);
        });
        return () => { cancelled = true; };
    }, [courseId]);

    // ── Load video whenever active lesson changes ─────────────────────────────
    useEffect(() => {
        if (!activeLesson) return;
        setShowBlocker(false);
        setReqStatus(null);
        // Reset in-video checkpoint state for the new lesson
        setCheckpointsData(null);
        setActiveCheckpoint(null);
        setCheckpointAnswers({});
        setCheckpointResult(null);
        setCheckpointError('');
        firedCheckpointsRef.current = new Set();
        playbackTimeRef.current = 0;
        watchedSecondsRef.current = 0;
        lastTickRef.current = -1;
        lastHeartbeatRef.current = 0;
        autoAdvancingRef.current = false;
        setPlaybackFailed(false);
        setVideoDuration(0);
        setUiTime(0);
        setIsPlaying(false);
        setCheckpointDirectFailed(false);

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

        // Fetch in-video quiz checkpoints — when present, swap to the direct
        // MP4 URL so we can control playback (pause at checkpoints, block skips)
        let cancelled = false;
        inVideoQuizService.getLessonCheckpoints(courseId, activeLesson._id.toString())
            .then(res => {
                if (cancelled) return;
                const data = res.data?.data || null;
                setCheckpointsData(data);
                // Prefer the API's live-resolved URL; fall back to the direct MP4
                // stored on the lesson document (resolved & persisted at upload /
                // by maintenance script) so checkpoint mode survives backend-side
                // transient failures.
                const storedDirect = data?.directVideoUrl || activeLesson.directVideoUrl;
                if (data?.checkpoints?.length > 0 && storedDirect) {
                    setVideoUrl(storedDirect);

                    // ── Restore progress from previous session ─────────────────────
                    // Use stored lastWatchedPosition to resume where the student left off.
                    // Priority:
                    //  1. If lastWatchedPosition falls inside a pending concept's window
                    //     → resume from lastWatchedPosition (mid-concept resume)
                    //  2. Otherwise → resume from the first uncompleted concept's startSeconds
                    const storedItem = progressItems.find(
                        item => item.lessonId?.toString() === activeLesson._id?.toString()
                    );
                    // Restore accumulated watched time so the 85% gate continues correctly
                    if (storedItem?.watchedSeconds > 0) {
                        watchedSecondsRef.current = storedItem.watchedSeconds;
                    }

                    const lastPos = storedItem?.lastWatchedPosition ?? 0;
                    const firstPending = data.checkpoints.find(cp =>
                        !(data.attemptStatus?.[cp.checkpointId]?.passed)
                    );

                    let seekTo = 0;
                    if (firstPending) {
                        const cStart = firstPending.startSeconds ?? 0;
                        const cEnd   = firstPending.timestampSeconds;
                        // If the stored position is inside this concept's window, resume there
                        if (lastPos > cStart && lastPos < cEnd) {
                            seekTo = lastPos;
                        } else {
                            seekTo = cStart;
                        }
                    }

                    if (seekTo > 0) {
                        setTimeout(() => {
                            if (videoRef.current) {
                                videoRef.current.currentTime = seekTo;
                            }
                        }, 600);
                    }
                } else if (data?.checkpoints?.length > 0 && !storedDirect) {
                    // Checkpoints exist but NO direct MP4 could be found anywhere —
                    // quiz popups cannot run on the iframe embed. Warn clearly.
                    setCheckpointDirectFailed(true);
                } else if (!data?.checkpoints?.length) {
                    // No checkpoints — restore last watched position for regular videos
                    const storedItem = progressItems.find(
                        item => item.lessonId?.toString() === activeLesson._id?.toString()
                    );
                    if (storedItem?.watchedSeconds > 0) {
                        watchedSecondsRef.current = storedItem.watchedSeconds;
                    }
                    const lastPos = storedItem?.lastWatchedPosition ?? 0;
                    if (lastPos > 5) {
                        setTimeout(() => {
                            if (videoRef.current) {
                                videoRef.current.currentTime = lastPos;
                            }
                        }, 600);
                    }
                }
            })
            .catch(() => { if (!cancelled) setCheckpointsData(null); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFlatIdx, activeLesson]);

    // ── Fetch requirement status whenever the active lesson changes ───────────
    // We only call the API if the lesson actually has requirements AND isn't done yet.
    useEffect(() => {
        if (!activeLesson || isCurrentDone) return;
        if (!lessonHasRequirements) { setReqStatus(null); return; }
        let cancelled = false;
        setReqLoading(true);
        learningProgressService.getLessonRequirementsStatus(courseId, activeLesson._id.toString(), liveWatchParams())
            .then(res => {
                if (!cancelled) setReqStatus(res.data?.data || null);
            })
            .catch(() => { if (!cancelled) setReqStatus(null); })
            .finally(() => { if (!cancelled) setReqLoading(false); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFlatIdx, activeLesson, isCurrentDone, lessonHasRequirements]);

    // ── In-video checkpoint logic ─────────────────────────────────────────────
    const hasCheckpoints = !!(checkpointsData?.checkpoints?.length > 0);
    const isCheckpointPassed = useCallback((cp) => {
        const status = checkpointsData?.attemptStatus?.[cp.checkpointId];
        return !!status?.passed;
    }, [checkpointsData]);

    // Client-side: are all concepts/checkpoints for this lesson passed?
    // Used to disable "Mark as Complete" button before even hitting the server.
    const allConceptsDone = !hasCheckpoints ||
        (checkpointsData?.checkpoints || []).every(cp => isCheckpointPassed(cp));

    // Timeline order — always ascending by concept end time
    const sortedCheckpoints = useMemo(() =>
        [...(checkpointsData?.checkpoints || [])].sort((a, b) =>
            (a.timestampSeconds ?? 0) - (b.timestampSeconds ?? 0)
        ), [checkpointsData]);

    // Clamp a seek target so the student can never jump past an unanswered
    // checkpoint. Used by both the custom timeline and the native seeking guard.
    const clampSeekTarget = useCallback((target) => {
        if (!hasCheckpoints || activeCheckpoint) return target;
        const pending = sortedCheckpoints.filter(cp => !isCheckpointPassed(cp));
        if (pending.length === 0) return target;
        const limit = Math.min(...pending.map(cp => cp.timestampSeconds)) - 0.2;
        return Math.min(target, Math.max(limit, 0));
    }, [hasCheckpoints, activeCheckpoint, sortedCheckpoints, isCheckpointPassed]);

    const seekTo = useCallback((target) => {
        if (!videoRef.current || !Number.isFinite(target)) return;
        const clamped = Math.max(0, clampSeekTarget(target));
        videoRef.current.currentTime = clamped;
        setUiTime(clamped);
    }, [clampSeekTarget]);

    // Core mid-video quiz trigger — pauses playback and opens the checkpoint's
    // quiz overlay the instant the playhead reaches the concept end timestamp.
    // Shared by the timeupdate handler AND a watchdog interval so a throttled,
    // dropped, or skipped timeupdate event can never let a quiz be bypassed.
    const fireCheckpointIfReached = useCallback((videoEl, t) => {
        if (!videoEl || !hasCheckpoints || activeCheckpoint) return false;
        // Only consider the earliest pending checkpoint — later ones stay dormant
        let nearest = null;
        for (const cp of checkpointsData?.checkpoints || []) {
            if (firedCheckpointsRef.current.has(cp.checkpointId)) continue;
            if (isCheckpointPassed(cp)) { firedCheckpointsRef.current.add(cp.checkpointId); continue; }
            if (!nearest || cp.timestampSeconds < nearest.timestampSeconds) nearest = cp;
        }
        if (nearest && t >= nearest.timestampSeconds - 0.25) {
            videoEl.pause();                       // hard stop BEFORE anything else
            firedCheckpointsRef.current.add(nearest.checkpointId);
            setActiveCheckpoint(nearest);
            setCheckpointAnswers({});
            setCheckpointResult(null);
            setCheckpointError('');
            return true;
        }
        return false;
    }, [hasCheckpoints, activeCheckpoint, checkpointsData, isCheckpointPassed]);

    // Pause safety-net: while a quiz overlay is open the video must NEVER play —
    // covers programmatic play() races and browser autoplay quirks.
    useEffect(() => {
        if (activeCheckpoint) {
            const v = videoRef.current;
            if (v && !v.paused) v.pause();
        }
    }, [activeCheckpoint]);

    // Watchdog: checks the playhead every 500ms independent of timeupdate.
    useEffect(() => {
        if (!hasCheckpoints) return;
        const id = setInterval(() => {
            const v = videoRef.current;
            if (v && !v.paused && !v.ended) fireCheckpointIfReached(v, v.currentTime);
        }, 500);
        return () => clearInterval(id);
    }, [hasCheckpoints, fireCheckpointIfReached]);

    // Accumulates REAL watched seconds, heartbeats progress to the backend,
    // and hands off to the shared quiz trigger.
    const handleVideoTimeUpdate = (e) => {
        const t = e.target.currentTime;
        const dt = t - lastTickRef.current;
        if (dt > 0 && dt < 1.5) watchedSecondsRef.current += dt; // ignore seeks/repeats
        lastTickRef.current = t;
        playbackTimeRef.current = t;
        setUiTime(t);

        // Persist watch progress every ~30s so completion survives reloads
        const now = Date.now();
        if (activeLesson && now - lastHeartbeatRef.current > 30000 && watchedSecondsRef.current > 5) {
            lastHeartbeatRef.current = now;
            learningProgressService.saveLessonProgress(courseId, activeLesson._id.toString(), {
                completed: false,
                currentTime: Math.round(t),
                watchedSeconds: Math.round(watchedSecondsRef.current),
                videoDurationSeconds: Math.round(e.target.duration || 0)
            }).catch(() => {});
        }

        fireCheckpointIfReached(e.target, t);
    };

    // Block seeking past the next unanswered checkpoint (native controls,
    // keyboard shortcuts, devtools — everything funnels through the seeking event)
    const handleVideoSeeking = (e) => {
        const clamped = clampSeekTarget(e.target.currentTime);
        if (clamped < e.target.currentTime) {
            e.target.currentTime = Math.min(playbackTimeRef.current, clamped);
        }
    };

    const toggleCheckpointAnswer = (questionIndex, optionIndex) => {
        setCheckpointAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
        setCheckpointError('');
    };

    const submitCheckpoint = async () => {
        if (!activeCheckpoint || !activeLesson) return;
        const total = activeCheckpoint.questions?.length || 0;
        if (Object.keys(checkpointAnswers).length < total) {
            setCheckpointError('Please answer all questions before submitting.');
            return;
        }
        setCheckpointSubmitting(true);
        setCheckpointError('');
        try {
            const payload = {
                checkpointId: activeCheckpoint.checkpointId,
                answers: Object.entries(checkpointAnswers).map(([questionIndex, selectedIndex]) => ({
                    questionIndex: Number(questionIndex),
                    selectedIndex: Number(selectedIndex)
                }))
            };
            const res = await inVideoQuizService.submitCheckpointAttempt(courseId, activeLesson._id.toString(), payload);
            const result = res.data?.data;
            setCheckpointResult(result);
            // Update local pass status so gating reflects immediately
            setCheckpointsData(prev => prev ? {
                ...prev,
                attemptStatus: {
                    ...prev.attemptStatus,
                    [activeCheckpoint.checkpointId]: {
                        passed: result.passed,
                        scorePercent: result.scorePercent,
                        correctCount: result.correctCount,
                        totalQuestions: result.totalQuestions,
                        attemptsUsed: (prev.attemptStatus?.[activeCheckpoint.checkpointId]?.attemptsUsed || 0) + 1
                    }
                },
                allCheckpointsPassed: (prev.checkpoints || []).every(cp =>
                    cp.checkpointId === activeCheckpoint.checkpointId ? result.passed : (prev.attemptStatus?.[cp.checkpointId]?.passed || false))
            } : prev);
        } catch (err) {
            setCheckpointError(err.response?.data?.message || 'Failed to submit the quiz. Please try again.');
        } finally {
            setCheckpointSubmitting(false);
        }
    };

    // Resume playback from the start of the next concept after passing
    const resumeAfterCheckpoint = () => {
        const passedCpId = activeCheckpoint?.checkpointId;
        const allCps = checkpointsData?.checkpoints || [];

        // Find the next concept (the one after the one just passed)
        const passedIdx = allCps.findIndex(cp => cp.checkpointId === passedCpId);
        const nextCp = allCps[passedIdx + 1] || null;

        // Where to resume: start of the next concept, or fall back to the
        // exact pause point of the current concept (for the final concept)
        const resumeAt = nextCp
            ? (nextCp.startSeconds ?? nextCp.timestampSeconds)
            : (checkpointResult?.resumeAtSeconds ?? activeCheckpoint?.timestampSeconds ?? 0);

        setActiveCheckpoint(null);
        setCheckpointAnswers({});
        setCheckpointResult(null);
        setCheckpointError('');
        // If this was the last checkpoint, refresh gating status so "Mark as
        // Complete" reflects the pass immediately.
        const allPassed = allCps.every(cp =>
            cp.checkpointId === passedCpId
                ? true
                : (checkpointsData?.attemptStatus?.[cp.checkpointId]?.passed || false));
        if (allPassed && lessonHasRequirements) refreshReqStatus();
        if (videoRef.current) {
            videoRef.current.currentTime = resumeAt;
            videoRef.current.play().catch(() => {});
        }
        // Final checkpoint of the lesson → auto-complete + open next video once
        // the remaining segment has played out (retries on video 'ended').
        if (allPassed) {
            setTimeout(() => tryAutoCompleteAndAdvance(), 400);
        }
    };

    // ── Mark Complete button handler ──────────────────────────────────────────
    const performCompletion = useCallback(async () => {
        const lesson = course?.curriculumTree?.[activeChapterIndex]?.lessons?.[activeLessonIndex];
        if (!lesson) return null;
        const res = await learningProgressService.saveLessonProgress(
            courseId,
            lesson._id.toString(),
            {
                completed: true,
                lessonTitle: lesson.lessonTitle || '',
                currentTime: Math.round(playbackTimeRef.current),
                watchedSeconds: Math.round(watchedSecondsRef.current),
                videoDurationSeconds: Math.round(videoRef.current?.duration || 0)
            }
        );
        const updated = res.data?.data;
        if (updated) {
            const newDone = buildCompletedSet(updated.progressItems);
            setCompletedSet(newDone);
            setProgressItems(updated.progressItems || []);
            // Recompute % against the CURRENT curriculum tree
            const doneInCurrentTree = flatLessons.filter(f => newDone.has(`${f.chapterIndex}-${f.lessonIndex}`)).length;
            const pct = flatLessons.length > 0 ? Math.round((doneInCurrentTree / flatLessons.length) * 100) : 0;
            setProgressPct(pct);
            setShowBlocker(false);
            if (flatLessons.length > 0 && doneInCurrentTree === flatLessons.length) {
                setTimeout(() => setShowCompletion(true), 800);
            }
        }
        return updated;
    }, [course, courseId, activeChapterIndex, activeLessonIndex, flatLessons]);

    const handleMarkComplete = async () => {
        if (isCurrentDone || markingDone) return;
        setMarkingDone(true);
        try {
            await performCompletion();
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.data) {
                setReqStatus(err.response.data.data);
                setShowBlocker(true);
            } else {
                console.error('[LearningWorkspace] save progress failed:', err.message);
            }
        } finally {
            setMarkingDone(false);
        }
    };

    // ── Refresh requirement status (called after student returns from quiz/assignment) ──
    // Sends the player's LIVE watch data so the backend gate reflects reality
    // even before the 30s heartbeat has persisted anything.
    const liveWatchParams = () => ({
        watchedSeconds: Math.round(watchedSecondsRef.current),
        durationSeconds: Math.round(videoRef.current?.duration || 0)
    });

    const refreshReqStatus = useCallback(() => {
        if (!activeLesson) return;
        setReqLoading(true);
        learningProgressService.getLessonRequirementsStatus(courseId, activeLesson._id.toString(), liveWatchParams())
            .then(res => setReqStatus(res.data?.data || null))
            .catch(() => {})
            .finally(() => setReqLoading(false));
    }, [activeLesson, courseId]);

    // Jump back into the lesson video so students blocked at "Mark as Complete"
    // have a one-click path: resumes playback at the start of the earliest
    // unanswered concept, or from the current position when only watch-through is missing.
    const jumpToNextCheckpoint = useCallback(() => {
        setShowBlocker(false);
        window.scrollTo(0, 0);
        if (!videoRef.current) return;
        let target = Math.max(0, playbackTimeRef.current - 2);
        if (hasCheckpoints) {
            const pending = (checkpointsData.checkpoints || []).filter(cp => !isCheckpointPassed(cp));
            if (pending.length === 0) { refreshReqStatus(); return; }
            // Jump to the start of the first pending concept
            const firstPending = pending.reduce((a, b) =>
                (a.startSeconds ?? a.timestampSeconds) < (b.startSeconds ?? b.timestampSeconds) ? a : b
            );
            target = Math.max(0, firstPending.startSeconds ?? 0);
        }
        videoRef.current.currentTime = target;
        videoRef.current.play().catch(() => {});
    }, [hasCheckpoints, checkpointsData, isCheckpointPassed, refreshReqStatus]);

    // ── Navigate to a flat lesson index ──────────────────────────────────────
    const goToFlatIdx = useCallback((idx) => {
        if (!flatLessons[idx]) return;
        if (!isLessonAccessible(idx)) return;
        setActiveFlatIdx(idx);
        setExpandedChapters(prev => new Set([...prev, flatLessons[idx].chapterIndex]));
        window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flatLessons, completedSet]);

    // ── Auto-advance ──────────────────────────────────────────────────────────
    // When the student finishes a lesson video (all checkpoints passed AND the
    // video fully played), automatically complete the lesson and open the next
    // one — no manual clicking required.
    const autoAdvancingRef = useRef(false);

    // Countdown-driven auto-navigation after a lesson completes on its own
    const [autoNextIn, setAutoNextIn] = useState(null);
    const autoNextIntervalRef = useRef(null);

    const cancelAutoNext = useCallback(() => {
        if (autoNextIntervalRef.current) {
            clearInterval(autoNextIntervalRef.current);
            autoNextIntervalRef.current = null;
        }
        setAutoNextIn(null);
    }, []);

    const startAutoNextCountdown = useCallback((targetIdx) => {
        cancelAutoNext();
        if (!flatLessons[targetIdx]) return;
        let secs = 5;                                   // 5-second countdown
        setAutoNextIn(secs);
        autoNextIntervalRef.current = setInterval(() => {
            secs -= 1;
            if (secs <= 0) {
                clearInterval(autoNextIntervalRef.current);
                autoNextIntervalRef.current = null;
                setAutoNextIn(null);
                goToFlatIdx(targetIdx);                 // auto-route to next lesson
            } else {
                setAutoNextIn(secs);
            }
        }, 1000);
    }, [cancelAutoNext, flatLessons, goToFlatIdx]);

    // Leaving the lesson (any navigation) always cancels a pending countdown
    useEffect(() => { cancelAutoNext(); }, [activeFlatIdx, cancelAutoNext]);

    const tryAutoCompleteAndAdvance = useCallback(async () => {
        if (!activeLesson || isCurrentDone || autoAdvancingRef.current) return;

        // Every embedded checkpoint quiz must be passed first
        const cps = checkpointsData?.checkpoints || [];
        const allPassed = cps.every(cp => isCheckpointPassed(cp));
        if (cps.length > 0 && !allPassed) return;

        // And the video must be (nearly) fully watched — mirrors backend rule
        const duration = Math.round(videoRef.current?.duration || 0);
        if (duration > 30 && watchedSecondsRef.current < duration * 0.85) return;

        autoAdvancingRef.current = true;
        try {
            const updated = await performCompletion();
            // performCompletion() already: saved completed=true to the backend,
            // updated completedSet (unlocks the "Next Lesson" button) and
            // recomputed the progress %. Now queue the countdown auto-route.
            if (updated && activeFlatIdx < totalLessons - 1) {
                startAutoNextCountdown(activeFlatIdx + 1);
            }
        } catch (err) {
            // Requirements unmet (422) or network issue → student keeps watching;
            // auto-advance retries on the next natural trigger (video ended /
            // final checkpoint passed).
            if (err.response?.status === 422 && err.response?.data?.data) {
                setReqStatus(err.response.data.data);
            } else {
                console.error('[LearningWorkspace] auto-advance failed:', err.message);
            }
        } finally {
            autoAdvancingRef.current = false;
        }
    }, [activeLesson, isCurrentDone, checkpointsData, isCheckpointPassed, performCompletion, activeFlatIdx, totalLessons, startAutoNextCountdown]);

    const handleVideoEnded = useCallback(() => {
        tryAutoCompleteAndAdvance();
    }, [tryAutoCompleteAndAdvance]);

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

    // ── Error / loading screens ───────────────────────────────────────────────
    if (pageError) return <div style={{ color: '#ef4444', padding: 40, textAlign: 'center' }}>{pageError}</div>;
    if (courseLoading || !course) return (
        <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: muted }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid rgba(148,163,184,0.3)', borderTopColor: accent, animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Loading course…</span>
        </div>
    );
    if (!course) return <div style={{ color: '#ef4444', padding: 40, textAlign: 'center' }}>Course not found.</div>;

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
                            <button onClick={handleGetCertificate} disabled={certLoading} style={{ background: certLoading ? muted : 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15, cursor: certLoading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
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
                .lesson-row:hover { background: ${isDark ? '#1e3a5f20' : '#f0fdf4'} !important; }
                .tab-btn { border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 6px; transition: all 0.15s; }
                .action-link { display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; text-decoration: none; transition: transform 0.15s, opacity 0.15s; }
                .action-link:hover { transform: translateY(-1px); opacity: 0.92; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                /* ── Responsive: tablet ── */
                @media (max-width: 1024px) {
                    .lw-sidebar { position: fixed; top: 60px; right: 0; bottom: 0; width: min(85vw, 340px) !important; z-index: 60; box-shadow: -8px 0 30px rgba(0,0,0,0.35); }
                    .lw-nav-center { display: none; }
                    .lw-content-title { font-size: 18px !important; }
                }
                /* ── Responsive: phone ── */
                @media (max-width: 640px) {
                    .lw-nav-secondary { display: none; }
                    .lw-content-padding { padding: 16px 16px 24px !important; }
                    .lw-info-padding { padding: 14px 14px 0 !important; }
                }
            `}</style>

            {/* ── Top Navbar ─────────────────────────────────────────────── */}
            <nav style={{ height: 60, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bgCard, borderBottom: `1px solid ${border}`, flexShrink: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: 6 }}><IconMenu /></button>
                    <button onClick={() => navigate('/student/dashboard')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, fontSize: 13, fontWeight: 600 }}>← Dashboard</button>
                    <div style={{ width: 1, height: 20, background: border }} />
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: text, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.courseTitle}</h2>
                </div>
                <div className="lw-nav-center" style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 280, margin: '0 20px' }}>
                    <div style={{ flex: 1, height: 6, background: border, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: `linear-gradient(90deg, ${accent}, ${green})`, borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: muted, whiteSpace: 'nowrap' }}>{progressPct}% done</span>
                </div>
                <div className="lw-nav-secondary" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: 6 }}>{isDark ? <IconSun /> : <IconMoon />}</button>
                    <button onClick={async () => { await logout(); navigate('/'); }} style={{ background: '#ef444418', border: '1px solid #ef444430', color: '#ef4444', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Sign Out</button>
                </div>
            </nav>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* ── Content area ─────────────────────────────────────── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0 }}>

                    {/* Video Player */}
                    <div ref={playerContainerRef} style={{ background: '#000', width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
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
                                    <button onClick={() => navigate('/student/payments')} style={{ background: `linear-gradient(135deg, ${accent}, #15803d)`, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Proceed to Payment →</button>
                                )}
                            </div>
                        ) : videoUrl ? (
                            (getVideoRenderMode(videoUrl) === 'video' || hasCheckpoints) && getVideoRenderMode(videoUrl) !== 'iframe' ? (
                                playbackFailed ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 30, textAlign: 'center' }}>
                                        <div style={{ fontSize: 30 }}>⚠️</div>
                                        <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: 15 }}>Video could not be loaded</div>
                                        <div style={{ color: '#94a3b8', fontSize: 13, maxWidth: 380, lineHeight: 1.6 }}>
                                            The video file for this lesson is not responding. Try again, or come back later.
                                        </div>
                                        <button onClick={() => { setPlaybackFailed(false); setPlaybackRetryKey(k => k + 1); }} style={{ background: `linear-gradient(135deg, ${accent}, #15803d)`, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                            ↻ Retry
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <video
                                            key={`${videoUrl}#${playbackRetryKey}`}
                                            ref={videoRef}
                                            src={videoUrl}
                                            controls={!hasCheckpoints}
                                            controlsList="nodownload noplaybackrate"
                                            onTimeUpdate={handleVideoTimeUpdate}
                                            onSeeking={hasCheckpoints ? handleVideoSeeking : undefined}
                                            onLoadedMetadata={(e) => { setVideoDuration(e.target.duration || 0); }}
                                            onPlay={() => setIsPlaying(true)}
                                            onPause={() => setIsPlaying(false)}
                                            onError={() => hasCheckpoints && setPlaybackFailed(true)}
                                            onEnded={handleVideoEnded}
                                            onClick={hasCheckpoints ? () => {
                                                const v = videoRef.current;
                                                if (!v) return;
                                                v.paused ? v.play().catch(() => {}) : v.pause();
                                            } : undefined}
                                            onContextMenu={(e) => hasCheckpoints && e.preventDefault()}
                                            preload="metadata"
                                            playsInline
                                            style={{ width: '100%', height: '100%', background: '#000' }}
                                            title={activeLesson?.lessonTitle || 'Lesson video'}
                                        />

                                        {/* ── Checkpoint timeline control bar ── */}
                                        {hasCheckpoints && (
                                            <div style={{
                                                position: 'absolute', left: 0, right: 0, bottom: 0,
                                                zIndex: 5, display: 'flex', alignItems: 'flex-end', gap: 10,
                                                padding: '10px 16px 4px',
                                                background: 'linear-gradient(transparent, rgba(0,0,0,0.88) 55%)'
                                            }}>
                                                <button
                                                    onClick={() => {
                                                        const v = videoRef.current;
                                                        if (!v) return;
                                                        v.paused ? v.play().catch(() => {}) : v.pause();
                                                    }}
                                                    aria-label={isPlaying ? 'Pause' : 'Play'}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.12)', color: '#fff',
                                                        border: 'none', borderRadius: '50%', width: 38, height: 38,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', flexShrink: 0, marginBottom: 10
                                                    }}
                                                >
                                                    {isPlaying ? (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
                                                    ) : (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                                    )}
                                                </button>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <CheckpointTimeline
                                                        duration={videoDuration || videoRef.current?.duration || 0}
                                                        currentTime={uiTime}
                                                        checkpoints={sortedCheckpoints}
                                                        attemptStatus={checkpointsData?.attemptStatus || {}}
                                                        activeCheckpointId={activeCheckpoint?.checkpointId || null}
                                                        onSeek={seekTo}
                                                    />
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        const el = playerContainerRef.current;
                                                        if (!el) return;
                                                        if (document.fullscreenElement) document.exitFullscreen?.();
                                                        else el.requestFullscreen?.();
                                                    }}
                                                    aria-label="Toggle fullscreen"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.12)', color: '#fff',
                                                        border: 'none', borderRadius: 8, width: 38, height: 38,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', flexShrink: 0, marginBottom: 10
                                                    }}
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )
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

                    {/* ── Checkpoint direct-MP4 failure warning ─────────── */}
                    {checkpointDirectFailed && (
                        <div style={{ background: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb', borderBottom: `1px solid ${gold}55`, padding: '10px 20px', fontSize: 12.5, color: isDark ? gold : '#b45309', fontWeight: 600, lineHeight: 1.6, flexShrink: 0 }}>
                            ⚠️ This lesson has {checkpointsData?.checkpoints?.length || 0} concept quiz checkpoints, but the video file could not be loaded in checkpoint mode — the quizzes cannot pop up on this player. Ask your instructor to re-save the lesson video (it may still be processing), or try again later.
                        </div>
                    )}

                    {/* ── Video Concepts Progress Panel ──────────────────── */}
                    {hasCheckpoints && checkpointsData?.checkpoints?.length > 0 && (
                        <div style={{ background: isDark ? '#1e293b' : '#f8fafc', borderTop: `1px solid ${border}`, padding: '10px 20px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: muted, whiteSpace: 'nowrap', flexShrink: 0 }}>CONCEPTS:</span>
                                {checkpointsData.checkpoints.map((cp, idx) => {
                                    const passed = isCheckpointPassed(cp);
                                    const isActive = activeCheckpoint?.checkpointId === cp.checkpointId;
                                    const isPending = !passed && !isActive;
                                    return (
                                        <div key={cp.checkpointId} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '5px 12px', borderRadius: 20, flexShrink: 0,
                                            fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                                            background: isActive
                                                ? `${gold}25`
                                                : passed
                                                    ? `${green}20`
                                                    : isDark ? '#334155' : '#e2e8f0',
                                            color: isActive ? gold : passed ? green : muted,
                                            border: `1px solid ${isActive ? `${gold}50` : passed ? `${green}40` : 'transparent'}`
                                        }}>
                                            <span style={{ fontSize: 13 }}>
                                                {isActive ? '⏸' : passed ? '✓' : `${idx + 1}`}
                                            </span>
                                            {cp.title || `Concept ${idx + 1}`}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Lesson Info */}
                    <div className="lw-info-padding" style={{ padding: '20px 28px 0', animation: 'fadeIn 0.25s ease' }}>
                        {/* Chapter / Lesson label */}
                        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {activeItem?.chapterTitle} — Lesson {activeLessonIndex + 1}
                        </p>
                        <h1 className="lw-content-title" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: text, lineHeight: 1.3 }}>
                            {activeLesson?.lessonTitle || 'Welcome to the course'}
                        </h1>
                        {activeLesson?.durationMinutes > 0 && (
                            <p style={{ margin: '6px 0 0', fontSize: 13, color: muted }}>{activeLesson.durationMinutes} min</p>
                        )}

                        {/* ── Completion requirement indicator ──────────────────── */}
                        {!isCurrentDone && lessonHasRequirements && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: muted, fontWeight: 600 }}>Required to complete:</span>
                                {/* In-video concepts badge — shown whenever checkpoints exist */}
                                {lessonHasCheckpoints && (
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                                        background: allConceptsDone ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                        color: allConceptsDone ? '#10b981' : '#f59e0b',
                                        border: `1px solid ${allConceptsDone ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`
                                    }}>
                                        {allConceptsDone
                                            ? `✓ All ${checkpointsData?.checkpoints?.length} concept${checkpointsData?.checkpoints?.length > 1 ? 's' : ''} done`
                                            : `⚬ ${(checkpointsData?.checkpoints || []).filter(cp => isCheckpointPassed(cp)).length}/${checkpointsData?.checkpoints?.length || '?'} concepts done`
                                        }
                                    </span>
                                )}
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
                                        color: reqStatus?.assignmentSubmitted ? '#10b981' : '#4ade80',
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
                                <button
                                    onClick={handleMarkComplete}
                                    disabled={markingDone || !allConceptsDone}
                                    title={!allConceptsDone ? 'Complete all video concepts first' : 'Mark this lesson as complete'}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        background: !allConceptsDone
                                            ? isDark ? '#334155' : '#e2e8f0'
                                            : `linear-gradient(135deg, ${green}, #059669)`,
                                        color: !allConceptsDone ? muted : '#fff',
                                        border: !allConceptsDone ? `1.5px solid ${border}` : 'none',
                                        borderRadius: 8, padding: '8px 18px',
                                        cursor: (markingDone || !allConceptsDone) ? 'not-allowed' : 'pointer',
                                        fontWeight: 700, fontSize: 13,
                                        opacity: markingDone ? 0.7 : 1
                                    }}
                                >
                                    {markingDone
                                        ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Checking…</>
                                        : !allConceptsDone
                                            ? <><IconLock /> Complete All Concepts First</>
                                            : <><IconCheck /> Mark as Complete</>
                                    }
                                </button>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: green, fontWeight: 700, fontSize: 13, background: `${green}15`, border: `1px solid ${green}30`, borderRadius: 8, padding: '8px 14px' }}>
                                    <IconCheck /> Completed
                                </div>
                            )}

                            {/* Refresh requirements button */}
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
                                <button onClick={goNext} style={{ display: 'flex', alignItems: 'center', gap: 6, background: isFinalLesson ? `linear-gradient(135deg, ${gold}, #d97706)` : `linear-gradient(135deg, ${accent}, #15803d)`, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
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
                                onJumpToCheckpoint={jumpToNextCheckpoint}
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
                    <div className="lw-content-padding" style={{ flex: 1, padding: '20px 28px 32px', animation: 'fadeIn 0.2s ease' }}>
                        {tab === 'overview' && (
                            <div>
                                <p style={{ margin: '0 0 20px', color: muted, fontSize: 14, lineHeight: 1.7 }}>
                                    {activeLesson?.description || `Watch the video above and use the "Mark as Complete" button when you're ready to proceed to the next lesson.`}
                                </p>
                                {(hasPdf || hasResource) && (
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                        {hasPdf && (
                                            <button
                                                onClick={() => downloadPdf(activeLesson.notesPdfUrl, activeLesson.lessonTitle ? `${activeLesson.lessonTitle}.pdf` : 'lesson-notes.pdf')}
                                                disabled={pdfDownloading}
                                                className="action-link"
                                                style={{ background: `linear-gradient(135deg, ${green}, #059669)`, color: '#fff', border: 'none', cursor: pdfDownloading ? 'wait' : 'pointer', opacity: pdfDownloading ? 0.7 : 1 }}
                                            >
                                                <IconPdf /> {pdfDownloading ? 'Downloading…' : 'Download Lesson PDF / Notes'}
                                            </button>
                                        )}
                                        {hasResource && (
                                            <a href={getPdfUrl(activeLesson.resourceLink)} target="_blank" rel="noopener noreferrer" className="action-link" style={{ background: `linear-gradient(135deg, ${blue}, #22c55e)`, color: '#fff' }}>
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
                                        <button
                                                onClick={() => downloadPdf(activeLesson.notesPdfUrl, activeLesson.lessonTitle ? `${activeLesson.lessonTitle}.pdf` : 'lesson-notes.pdf')}
                                                disabled={pdfDownloading}
                                                className="action-link"
                                                style={{ background: `linear-gradient(135deg, ${green}, #059669)`, color: '#fff', fontSize: 12, padding: '8px 16px', border: 'none', cursor: pdfDownloading ? 'wait' : 'pointer', opacity: pdfDownloading ? 0.7 : 1 }}
                                            >{pdfDownloading ? 'Downloading…' : 'Download'}</button>
                                    </div>
                                ) : (
                                    <div style={{ padding: '14px 18px', borderRadius: 10, background: isDark ? '#1e293b' : '#f8fafc', border: `1px solid ${border}`, color: muted, fontSize: 13 }}>No PDF notes attached.</div>
                                )}
                                {hasResource && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 10, background: isDark ? '#1e293b' : '#f0fdf4', border: `1px solid ${isDark ? '#22c55e30' : '#bbf7d0'}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 8, background: `${blue}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: blue }}><IconLink /></div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: text }}>External Resource</div>
                                                <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Drive / External link</div>
                                            </div>
                                        </div>
                                        <a href={getPdfUrl(activeLesson.resourceLink)} target="_blank" rel="noopener noreferrer" className="action-link" style={{ background: `linear-gradient(135deg, ${blue}, #22c55e)`, color: '#fff', fontSize: 12, padding: '8px 16px' }}>Open ↗</a>
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
                    <div className="lw-sidebar" style={{ width: 340, display: 'flex', flexDirection: 'column', background: bgSide, borderLeft: `1px solid ${border}`, flexShrink: 0, overflow: 'hidden' }}>
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
                                                        {!isDone && hasAsgReq && <span style={{ fontSize: 10, background: 'rgba(139,92,246,0.15)', color: '#4ade80', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>Assignment</span>}
                                                        {/* Concept progress for active lesson */}
                                                        {isActive && !isDone && hasCheckpoints && (
                                                            <span style={{ fontSize: 10, background: allConceptsDone ? `${green}20` : `${gold}20`, color: allConceptsDone ? green : gold, borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>
                                                                {(checkpointsData?.checkpoints || []).filter(cp => isCheckpointPassed(cp)).length}/{checkpointsData?.checkpoints?.length} concepts
                                                            </span>
                                                        )}
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

            <AiAssistant context={{ courseName: course.courseTitle, courseId, lessonPdfUrl: activeLesson?.notesPdfUrl || '', lessonTitle: activeLesson?.lessonTitle || '' }} />

            {/* ── Auto-next countdown toast (after lesson auto-completed) ── */}
            {autoNextIn != null && (
                <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 4000, background: bgCard, border: `1.5px solid ${green}66`, borderRadius: 14, boxShadow: '0 16px 50px rgba(0,0,0,0.3)', padding: '16px 18px', width: 300, animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: green, fontWeight: 900, fontSize: 16 }}>✓</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: text }}>Lesson completed!</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: muted, marginTop: 6, lineHeight: 1.5 }}>
                        Opening the next lesson in <strong style={{ color: accent }}>{autoNextIn}s</strong>…
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                            onClick={() => { const t = activeFlatIdx + 1; cancelAutoNext(); goToFlatIdx(t); }}
                            style={{ flex: 1, background: `linear-gradient(135deg, ${accent}, #15803d)`, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                        >
                            Next Lesson Now →
                        </button>
                        <button
                            onClick={cancelAutoNext}
                            style={{ background: 'transparent', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '9px 12px', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                        >
                            Stay
                        </button>
                    </div>
                </div>
            )}

            {/* ── In-Video Quiz Checkpoint Modal (full-screen, cannot be dismissed) ── */}
            {activeCheckpoint && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(2,6,23,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
                    <div style={{ background: bgCard, borderRadius: 18, border: `1px solid ${border}`, width: 'min(100%, 720px)', maxHeight: '94vh', overflowY: 'auto', padding: '26px 26px 22px', boxShadow: '0 30px 90px rgba(0,0,0,0.5)' }}>
                        {!checkpointResult ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                                    <span style={{ background: `${gold}20`, color: gold, borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' }}>
                                        ⏸ CONCEPT {(checkpointsData?.checkpoints?.findIndex(c => c.checkpointId === activeCheckpoint.checkpointId) ?? 0) + 1} OF {checkpointsData?.checkpoints?.length ?? 1}
                                    </span>
                                    {activeCheckpoint.title && (
                                        <span style={{ fontSize: 14, fontWeight: 700, color: text }}>
                                            {activeCheckpoint.title}
                                        </span>
                                    )}
                                </div>
                                <h2 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 800, color: text }}>
                                    Quiz time! Answer all questions to continue
                                </h2>
                                <p style={{ margin: '0 0 18px', fontSize: 13, color: muted }}>
                                    This quiz covers <strong>{activeCheckpoint.title || `Concept ${(checkpointsData?.checkpoints?.findIndex(c => c.checkpointId === activeCheckpoint.checkpointId) ?? 0) + 1}`}</strong>. You need {activeCheckpoint.passingScorePercent ?? 60}% to pass — the video will resume from the next concept after you pass.
                                </p>

                                {(activeCheckpoint.questions || []).map((q, qi) => (
                                    <div key={qi} style={{ background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
                                        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: text }}>
                                            <span style={{ color: accent, marginRight: 6 }}>Q{qi + 1}.</span>{q.questionText}
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {(q.options || []).map((opt, oi) => {
                                                const selected = checkpointAnswers[qi] === oi;
                                                return (
                                                    <label key={oi} style={{
                                                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                                                        padding: '10px 14px', borderRadius: 10, fontSize: 13.5,
                                                        color: text, transition: 'all 0.15s',
                                                        border: `1.5px solid ${selected ? accent : border}`,
                                                        background: selected ? `${accent}12` : 'transparent',
                                                        fontWeight: selected ? 700 : 500
                                                    }}>
                                                        <input type="radio" name={`cpq_${qi}`} checked={selected} onChange={() => toggleCheckpointAnswer(qi, oi)} style={{ accentColor: accent, width: 16, height: 16 }} />
                                                        {opt}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {checkpointError && (
                                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{checkpointError}</div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 12, color: muted }}>
                                        {Object.keys(checkpointAnswers).length}/{activeCheckpoint.questions?.length || 0} answered · video paused
                                    </span>
                                    <button onClick={submitCheckpoint} disabled={checkpointSubmitting} style={{ background: `linear-gradient(135deg, ${accent}, #15803d)`, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 30px', fontWeight: 800, fontSize: 14, cursor: checkpointSubmitting ? 'not-allowed' : 'pointer', opacity: checkpointSubmitting ? 0.7 : 1 }}>
                                        {checkpointSubmitting ? 'Submitting…' : 'Submit Answers'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* ── Result view with instant feedback ── */
                            <>
                                <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: muted, marginBottom: 6 }}>
                                        {activeCheckpoint.title || `Concept ${(checkpointsData?.checkpoints?.findIndex(c => c.checkpointId === activeCheckpoint.checkpointId) ?? 0) + 1}`}
                                    </div>
                                    <div style={{ fontSize: 52, fontWeight: 900, color: checkpointResult.passed ? green : '#ef4444', lineHeight: 1.1 }}>
                                        {checkpointResult.scorePercent}%
                                    </div>
                                    <div style={{ fontSize: 17, fontWeight: 800, color: text, margin: '6px 0 2px' }}>
                                        {checkpointResult.passed ? '🎉 Concept passed!' : 'Almost there — try again'}
                                    </div>
                                    <div style={{ fontSize: 13, color: muted }}>
                                        {checkpointResult.correctCount}/{checkpointResult.totalQuestions} correct · passing score {checkpointResult.passingScorePercent}%{!checkpointResult.passed && ' · review the explanations below and retake the quiz'}
                                    </div>
                                </div>

                                <div style={{ margin: '18px 0' }}>
                                    {(activeCheckpoint.questions || []).map((q, qi) => {
                                        const rev = checkpointResult.review?.find(r => r.questionIndex === qi);
                                        return (
                                            <div key={qi} style={{ background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${border}`, borderRadius: 12, padding: '13px 16px', marginBottom: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                    <span style={{ color: rev?.isCorrect ? green : '#ef4444', fontWeight: 900 }}>{rev?.isCorrect ? '✓' : '✗'}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 700, color: text }}>{q.questionText}</p>
                                                        <p style={{ margin: 0, fontSize: 12.5, color: rev?.isCorrect ? green : '#ef4444', fontWeight: 600 }}>
                                                            Your answer: {q.options?.[rev?.selectedIndex] ?? '—'}{!rev?.isCorrect && ` · Correct answer: ${q.options?.[rev?.correctAnswerIndex] ?? '—'}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, paddingBottom: 4 }}>
                                    {checkpointResult.passed ? (
                                        <button onClick={resumeAfterCheckpoint} style={{ background: `linear-gradient(135deg, ${green}, #059669)`, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                                            {(() => {
                                                const allCps = checkpointsData?.checkpoints || [];
                                                const passedIdx = allCps.findIndex(cp => cp.checkpointId === activeCheckpoint.checkpointId);
                                                return passedIdx < allCps.length - 1
                                                    ? `▶ Continue to Concept ${passedIdx + 2}`
                                                    : '▶ Finish Lesson';
                                            })()}
                                        </button>
                                    ) : (
                                        <button onClick={() => { setCheckpointResult(null); setCheckpointAnswers({}); setCheckpointError(''); }} style={{ background: `linear-gradient(135deg, ${accent}, #15803d)`, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                                            ↻ Retake Quiz
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
