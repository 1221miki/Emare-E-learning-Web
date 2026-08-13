import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import AiAssistant from '../../components/AiAssistant';
import { getLessonVideoUrl, getVideoEmbedUrl } from '../../utils/videoPlayer';

// ── Icon SVGs (inline – no extra deps) ─────────────────────────────────────
const IconPlay    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const IconCheck   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>;
const IconPdf     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-2 8H7v-2h4v2zm2-4H7v-2h6v2z"/></svg>;
const IconLink    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>;
const IconLock    = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>;
const IconMenu    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>;
const IconSun     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 11H1v2h3v-2zm9-9h-2v2.99h2V2zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 11v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg>;
const IconMoon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>;

export default function LearningWorkspace() {
    const { logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse]                     = useState(null);
    const [loading, setLoading]                   = useState(true);
    const [error, setError]                       = useState(null);
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);
    const [activeLessonIndex, setActiveLessonIndex]   = useState(0);
    const [videoUrl, setVideoUrl]                 = useState('');
    const [videoError, setVideoError]             = useState('');
    const [videoLoading, setVideoLoading]         = useState(false);
    const [completedLessons, setCompletedLessons] = useState(new Set());
    const [sidebarOpen, setSidebarOpen]           = useState(true);
    const [expandedChapters, setExpandedChapters] = useState(new Set([0]));
    const [tab, setTab]                           = useState('overview'); // overview | resources | notes

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const playLessonVideo = useCallback(async (assetUrl) => {
        if (!assetUrl) {
            setVideoUrl('');
            setVideoError('No video available for this lesson.');
            return;
        }
        setVideoLoading(true);
        setVideoError('');
        try {
            const normalized = getVideoEmbedUrl(assetUrl);
            if (normalized.startsWith('http')) {
                setVideoUrl(normalized);
            } else {
                setVideoUrl('');
                setVideoError('This lesson does not have a playable video URL.');
            }
        } catch (err) {
            setVideoError(err.response?.data?.message || 'Access Denied. Please ensure you are enrolled.');
        } finally {
            setVideoLoading(false);
        }
    }, []);

    useEffect(() => {
        courseService.getById(courseId)
            .then(res => {
                const data = res.data.data;
                setCourse(data);
                const firstLesson = data.curriculumTree?.[0]?.lessons?.[0];
                if (firstLesson) playLessonVideo(getLessonVideoUrl(firstLesson));
            })
            .catch(err => setError(err.response?.data?.message || 'Failed to load workspace.'))
            .finally(() => setLoading(false));
    }, [courseId, playLessonVideo]);

    const handleLessonSelect = (cIdx, lIdx, assetUrl) => {
        setActiveChapterIndex(cIdx);
        setActiveLessonIndex(lIdx);
        playLessonVideo(assetUrl);
        setTab('overview');
    };

    const markComplete = () => {
        const key = `${activeChapterIndex}-${activeLessonIndex}`;
        setCompletedLessons(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const goNextLesson = () => {
        if (!course) return;
        const chapter = course.curriculumTree[activeChapterIndex];
        if (activeLessonIndex < chapter.lessons.length - 1) {
            handleLessonSelect(activeChapterIndex, activeLessonIndex + 1, getLessonVideoUrl(chapter.lessons[activeLessonIndex + 1]));
        } else if (activeChapterIndex < course.curriculumTree.length - 1) {
            const nextChapter = course.curriculumTree[activeChapterIndex + 1];
            handleLessonSelect(activeChapterIndex + 1, 0, getLessonVideoUrl(nextChapter.lessons[0]));
            setExpandedChapters(prev => new Set([...prev, activeChapterIndex + 1]));
        }
    };

    const toggleChapter = (idx) => {
        setExpandedChapters(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    if (loading) return (
        <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #334155', borderTop: '3px solid #6366f1', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#94a3b8', fontFamily: 'Inter, sans-serif', margin: 0 }}>Loading workspace…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
    if (error) return <div style={{ color: '#ef4444', padding: 40, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>{error}</div>;
    if (!course) return <div style={{ color: '#ef4444', padding: 40, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>Course not found.</div>;

    const activeChapter = course.curriculumTree?.[activeChapterIndex];
    const activeLesson  = activeChapter?.lessons?.[activeLessonIndex];
    const isCompleted   = completedLessons.has(`${activeChapterIndex}-${activeLessonIndex}`);

    const totalLessons     = course.curriculumTree?.reduce((s, c) => s + (c.lessons?.length || 0), 0) || 0;
    const completedCount   = completedLessons.size;
    const progressPct      = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

    const hasPdf      = !!(activeLesson?.notesPdfUrl);
    const hasResource = !!(activeLesson?.resourceLink && activeLesson.resourceLink !== activeLesson.notesPdfUrl);

    // ── Styles ──────────────────────────────────────────────────────────────
    const isDark = theme === 'dark';
    const bg        = isDark ? '#0f172a' : '#f8fafc';
    const bgCard    = isDark ? '#1e293b' : '#ffffff';
    const bgSidebar = isDark ? '#1e293b' : '#f1f5f9';
    const border    = isDark ? '#334155' : '#e2e8f0';
    const text      = isDark ? '#f1f5f9' : '#0f172a';
    const muted     = isDark ? '#94a3b8' : '#64748b';
    const accent    = '#6366f1';
    const green     = '#10b981';
    const blue      = '#3b82f6';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: bg, fontFamily: '"Inter", -apple-system, sans-serif', color: text }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: ${isDark ? '#334155' : '#cbd5e1'}; border-radius: 3px; }
                .lesson-row:hover { background: ${isDark ? '#1e3a5f20' : '#eff6ff'} !important; }
                .nav-btn:hover { opacity: 0.8; }
                .tab-btn { border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 6px; transition: all 0.15s; }
                .action-link { display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; text-decoration: none; transition: transform 0.15s, opacity 0.15s; }
                .action-link:hover { transform: translateY(-1px); opacity: 0.92; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            {/* ── Top Navbar ─────────────────────────────────────────────── */}
            <nav style={{ height: 60, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bgCard, borderBottom: `1px solid ${border}`, flexShrink: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button onClick={() => setSidebarOpen(v => !v)} className="nav-btn" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: 6 }}>
                        <IconMenu />
                    </button>
                    <button onClick={() => navigate('/student/dashboard')} className="nav-btn" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, fontSize: 13, fontWeight: 600 }}>← Dashboard</button>
                    <div style={{ width: 1, height: 20, background: border }} />
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: text, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.courseTitle}</h2>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 300, margin: '0 24px' }}>
                    <div style={{ flex: 1, height: 6, background: border, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: `linear-gradient(90deg, ${accent}, ${green})`, borderRadius: 3, transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: muted, whiteSpace: 'nowrap' }}>{progressPct}% done</span>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button onClick={() => navigate(`/student/discussions/${course._id}`)} className="nav-btn" style={{ background: `${accent}18`, border: `1px solid ${accent}30`, color: accent, borderRadius: 7, padding: '7px 13px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Q&amp;A</button>
                    <button onClick={() => navigate(`/student/assignments/${course._id}`)} className="nav-btn" style={{ background: `${blue}18`, border: `1px solid ${blue}30`, color: blue, borderRadius: 7, padding: '7px 13px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Assignments</button>
                    <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: 6 }}>
                        {isDark ? <IconSun /> : <IconMoon />}
                    </button>
                    <button onClick={handleLogout} className="nav-btn" style={{ background: '#ef444418', border: '1px solid #ef444430', color: '#ef4444', borderRadius: 7, padding: '7px 13px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Sign Out</button>
                </div>
            </nav>

            {/* ── Main Layout ────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Left: Content area */}
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
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Content Gated</div>
                                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, maxWidth: 360 }}>{videoError}</div>
                                <button onClick={() => navigate('/student/payments')} style={{ background: `linear-gradient(135deg, ${accent}, #7c3aed)`, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                                    Proceed to Payment →
                                </button>
                            </div>
                        ) : videoUrl ? (
                            <iframe
                                src={videoUrl}
                                title={activeLesson?.lessonTitle || 'Lesson video'}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                allowFullScreen
                                style={{ width: '100%', height: '100%', border: 'none' }}
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 28 }}>▶</div>
                                <span style={{ color: '#475569', fontSize: 14 }}>Select a lesson to start learning</span>
                            </div>
                        )}
                    </div>

                    {/* Lesson Info Area */}
                    <div style={{ padding: '20px 28px 0', animation: 'fadeIn 0.25s ease' }}>
                        {/* Lesson title row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                            <div>
                                <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Chapter {activeChapterIndex + 1} — Lesson {activeLessonIndex + 1}
                                </p>
                                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: text, lineHeight: 1.3 }}>
                                    {activeLesson?.lessonTitle || 'Welcome to the course'}
                                </h1>
                                <p style={{ margin: '6px 0 0', fontSize: 13, color: muted }}>
                                    {activeChapter?.chapterTitle}
                                    {activeLesson?.durationMinutes ? ` · ${activeLesson.durationMinutes} min` : ''}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginTop: 4 }}>
                                <button
                                    onClick={markComplete}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        background: isCompleted ? `${green}20` : bgCard,
                                        border: `1.5px solid ${isCompleted ? green : border}`,
                                        color: isCompleted ? green : muted,
                                        borderRadius: 8, padding: '8px 16px',
                                        cursor: 'pointer', fontWeight: 700, fontSize: 13,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <IconCheck />
                                    {isCompleted ? 'Completed ' : 'Mark Complete'}
                                </button>
                                <button
                                    onClick={goNextLesson}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: `linear-gradient(135deg, ${accent}, #7c3aed)`, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                                >
                                    Next <IconPlay />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${border}`, marginBottom: 0 }}>
                            {[['overview','Overview'], ['resources','Resources & Notes'], ['notes','About Course']].map(([key, label]) => (
                                <button
                                    key={key}
                                    className="tab-btn"
                                    onClick={() => setTab(key)}
                                    style={{
                                        background: tab === key ? `${accent}18` : 'transparent',
                                        color: tab === key ? accent : muted,
                                        borderBottom: tab === key ? `2px solid ${accent}` : '2px solid transparent',
                                        borderRadius: '6px 6px 0 0'
                                    }}
                                >
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
                                    {activeLesson?.description || `This lesson covers "${activeLesson?.lessonTitle || 'the selected topic'}". Watch the video above and download the accompanying PDF notes to reinforce your learning.`}
                                </p>
                                {/* Resource buttons */}
                                {(hasPdf || hasResource) && (
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                        {hasPdf && (
                                            <a
                                                href={activeLesson.notesPdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="action-link"
                                                style={{ background: `linear-gradient(135deg, ${green}, #059669)`, color: '#fff' }}
                                            >
                                                <IconPdf /> Download Lesson PDF / Notes
                                            </a>
                                        )}
                                        {hasResource && (
                                            <a
                                                href={activeLesson.resourceLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="action-link"
                                                style={{ background: `linear-gradient(135deg, ${blue}, #6366f1)`, color: '#fff' }}
                                            >
                                                <IconLink /> Open External Resource ↗
                                            </a>
                                        )}
                                    </div>
                                )}
                                {!hasPdf && !hasResource && (
                                    <div style={{ padding: '16px 20px', borderRadius: 10, background: isDark ? '#1e293b' : '#f8fafc', border: `1px solid ${border}`, color: muted, fontSize: 13 }}>
                                        No downloadable resources are attached to this lesson yet.
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
                                            <div style={{ width: 40, height: 40, borderRadius: 8, background: `${green}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: green }}>
                                                <IconPdf />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: text }}>Lesson Notes (PDF)</div>
                                                <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Comprehensive notes for this lesson</div>
                                            </div>
                                        </div>
                                        <a href={activeLesson.notesPdfUrl} target="_blank" rel="noopener noreferrer" className="action-link"
                                            style={{ background: `linear-gradient(135deg, ${green}, #059669)`, color: '#fff', fontSize: 12, padding: '8px 16px' }}>
                                            Download
                                        </a>
                                    </div>
                                ) : (
                                    <div style={{ padding: '14px 18px', borderRadius: 10, background: isDark ? '#1e293b' : '#f8fafc', border: `1px solid ${border}`, color: muted, fontSize: 13 }}>
                                        No PDF notes attached to this lesson.
                                    </div>
                                )}
                                {hasResource && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 10, background: isDark ? '#1e293b' : '#eff6ff', border: `1px solid ${isDark ? '#3b82f630' : '#bfdbfe'}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 8, background: `${blue}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: blue }}>
                                                <IconLink />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: text }}>External Resource</div>
                                                <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Drive / External link</div>
                                            </div>
                                        </div>
                                        <a href={activeLesson.resourceLink} target="_blank" rel="noopener noreferrer" className="action-link"
                                            style={{ background: `linear-gradient(135deg, ${blue}, #6366f1)`, color: '#fff', fontSize: 12, padding: '8px 16px' }}>
                                            Open ↗
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'notes' && (
                            <div>
                                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: text }}>About this Course</h3>
                                <p style={{ margin: 0, fontSize: 14, color: muted, lineHeight: 1.7 }}>{course.descriptionText || 'No description provided for this course.'}</p>
                                {course.learningObjectives?.length > 0 && (
                                    <div style={{ marginTop: 20 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: text }}>What you'll learn</h4>
                                        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {course.learningObjectives.map((obj, i) => (
                                                <li key={i} style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>{obj}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Sidebar: Curriculum ───────────────────────────── */}
                {sidebarOpen && (
                    <div style={{ width: 340, display: 'flex', flexDirection: 'column', background: bgSidebar, borderLeft: `1px solid ${border}`, flexShrink: 0, overflow: 'hidden' }}>
                        {/* Sidebar header */}
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, background: bgCard, flexShrink: 0 }}>
                            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: text }}>Course Content</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, height: 5, background: border, borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${progressPct}%`, height: '100%', background: `linear-gradient(90deg, ${accent}, ${green})`, borderRadius: 3, transition: 'width 0.4s ease' }} />
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: muted, whiteSpace: 'nowrap' }}>{completedCount}/{totalLessons}</span>
                            </div>
                        </div>

                        {/* Curriculum list */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {course.curriculumTree?.map((chapter, cIdx) => (
                                <div key={chapter._id || cIdx} style={{ borderBottom: `1px solid ${border}` }}>
                                    {/* Chapter toggle */}
                                    <button
                                        onClick={() => toggleChapter(cIdx)}
                                        style={{ width: '100%', textAlign: 'left', background: isDark ? '#263147' : '#e2e8f0', border: 'none', padding: '12px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
                                    >
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{chapter.chapterTitle}</div>
                                            <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{chapter.lessons?.length || 0} lessons</div>
                                        </div>
                                        <span style={{ color: muted, fontSize: 10, transform: expandedChapters.has(cIdx) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                                    </button>

                                    {/* Lessons */}
                                    {expandedChapters.has(cIdx) && chapter.lessons?.map((lesson, lIdx) => {
                                        const isActive = activeChapterIndex === cIdx && activeLessonIndex === lIdx;
                                        const isDone   = completedLessons.has(`${cIdx}-${lIdx}`);
                                        return (
                                            <div
                                                key={lesson._id || lIdx}
                                                className="lesson-row"
                                                onClick={() => handleLessonSelect(cIdx, lIdx, getLessonVideoUrl(lesson))}
                                                style={{
                                                    padding: '10px 20px 10px 28px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    cursor: 'pointer',
                                                    background: isActive ? `${accent}15` : 'transparent',
                                                    borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                {/* Status circle */}
                                                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? green : isActive ? accent : (isDark ? '#334155' : '#cbd5e1'), color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                                    {isDone ? <IconCheck /> : isActive ? <IconPlay /> : <span style={{ fontSize: 10 }}>{lIdx + 1}</span>}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? accent : text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {lesson.lessonTitle}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                                                        {lesson.durationMinutes && <span style={{ fontSize: 11, color: muted }}>{lesson.durationMinutes}m</span>}
                                                        {(lesson.notesPdfUrl || lesson.resourceLink) && (
                                                            <span style={{ fontSize: 10, color: green, fontWeight: 600 }}>▤ PDF</span>
                                                        )}
                                                        {lesson.isFreePreview && (
                                                            <span style={{ fontSize: 10, background: `${accent}20`, color: accent, borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>Free</span>
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

            {/* Global AI Assistant - Now with Socratic Tutor Backend */}
            <AiAssistant context={{ courseName: course.courseTitle, courseId }} />
        </div>
    );
}
