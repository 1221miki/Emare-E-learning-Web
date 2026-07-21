import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import AiAssistant from '../../components/AiAssistant';

export default function LearningWorkspace() {
    const { logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    // Hardcoded state for demo navigation between modules
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);
    const [activeLessonIndex, setActiveLessonIndex] = useState(0);

    // Video Streaming States
    const [videoUrl, setVideoUrl] = useState('');
    const [videoError, setVideoError] = useState('');
    const [videoLoading, setVideoLoading] = useState(false);

    useEffect(() => {
        courseService.getById(courseId)
            .then(res => {
                setCourse(res.data.data);
                // Select first lesson by default if available
                const firstChapter = res.data.data.curriculumTree?.[0];
                const firstLesson = firstChapter?.lessons?.[0];
                if (firstLesson) {
                    playLessonVideo(firstLesson.videoAssetURL);
                }
            })
            .catch(err => setError(err.response?.data?.message || 'Failed to load course workspace.'))
            .finally(() => setLoading(false));
    }, [courseId]);

    const playLessonVideo = async (assetUrl) => {
        if (!assetUrl) {
            setVideoUrl('');
            setVideoError('No video available for this lesson.');
            return;
        }
        setVideoLoading(true);
        setVideoError('');
        try {
            const res = await courseService.streamVideo(assetUrl);
            setVideoUrl(res.data.streamUrl);
        } catch (err) {
            setVideoError(err.response?.data?.message || 'Access Denied. Please ensure you are enrolled in this course.');
        } finally {
            setVideoLoading(false);
        }
    };

    const handleLessonSelect = (chapIdx, lesIdx, assetUrl) => {
        setActiveChapterIndex(chapIdx);
        setActiveLessonIndex(lesIdx);
        playLessonVideo(assetUrl);
    };

    if (loading) return <div style={{ color: colors.text, padding: '40px', textAlign: 'center' }}>Loading Workspace...</div>;
    if (error) return <div style={{ color: colors.danger, padding: '40px', textAlign: 'center' }}>{error}</div>;
    if (!course) return <div style={{ color: colors.danger, padding: '40px', textAlign: 'center' }}>Course not found.</div>;

    const activeChapter = course.curriculumTree?.[activeChapterIndex];
    const activeLesson = activeChapter?.lessons?.[activeLessonIndex];

    const styles = {
        container: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: colors.bg },
        navbar: { height: '60px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.bgCard, borderBottom: `1px solid ${colors.border}` },
        navLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
        backBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: colors.textMuted },
        navTitle: { margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text },
        navRight: { display: 'flex', gap: '12px', alignItems: 'center' },
        navActionBtn: { background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, color: colors.primary, borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
        mainLayout: { display: 'flex', flex: 1, overflow: 'hidden' },
        contentArea: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
        videoPlayerContainer: { background: '#000', width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
        videoPlayer: { width: '100%', height: '100%', objectFit: 'contain' },
        videoOverlay: { color: '#fff', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        videoOverlayError: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' },
        lockIcon: { fontSize: '48px', marginBottom: '16px', color: colors.danger },
        errorTitle: { fontSize: '20px', fontWeight: '700', color: colors.danger, marginBottom: '8px' },
        errorText: { fontSize: '14px', color: colors.textMuted, marginBottom: '20px', maxWidth: '400px', lineHeight: '1.5' },
        payBtn: { background: colors.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
        lessonDetails: { padding: '32px', margin: '24px', borderRadius: '12px', background: colors.bgCard, border: `1px solid ${colors.border}` },
        lessonTitle: { margin: '0 0 12px', fontSize: '24px', fontWeight: '800', color: colors.text },
        lessonMeta: { display: 'flex', gap: '12px', fontSize: '14px', color: colors.textMuted },
        sidebar: { width: '350px', display: 'flex', flexDirection: 'column', background: colors.bgCard, borderLeft: `1px solid ${colors.border}` },
        sidebarHeader: { padding: '20px 24px', borderBottom: `1px solid ${colors.border}` },
        curriculumList: { flex: 1, overflowY: 'auto' },
        chapterHeader: { padding: '16px 24px', background: colors.bgInput, fontSize: '14px', color: colors.text },
        lessonList: { display: 'flex', flexDirection: 'column' },
        lessonItem: { padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '13px', transition: 'background 0.2s' },
        lessonItemLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
        lessonIcon: { opacity: 0.6 }
    };

    return (
        <div style={styles.container}>
            {/* Top Navigation */}
            <nav style={styles.navbar}>
                <div style={styles.navLeft}>
                    <button onClick={() => navigate('/student/dashboard')} style={styles.backBtn}>← Back</button>
                    <h2 style={styles.navTitle}>{course.courseTitle}</h2>
                </div>
                <div style={styles.navRight}>
                    <button onClick={() => navigate(`/student/discussions/${course._id}`)} style={styles.navActionBtn}>Q&A Discussions</button>
                    <button onClick={() => navigate(`/student/assignments/${course._id}`)} style={styles.navActionBtn}>Assignments</button>
                    <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '6px' }} title="Toggle Theme">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <button onClick={handleLogout} style={{ background: `${colors.danger}15`, border: `1px solid ${colors.danger}30`, color: colors.danger, borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Sign Out</button>
                </div>
            </nav>

            <div style={styles.mainLayout}>
                {/* Left Panel: Video & Content */}
                <div style={styles.contentArea}>
                    <div style={styles.videoPlayerContainer}>
                        {videoLoading ? (
                            <div style={styles.videoOverlay}>
                                <div>Loading Video Stream...</div>
                            </div>
                        ) : videoError ? (
                            <div style={styles.videoOverlayError}>
                                <div style={styles.lockIcon}>🔒</div>
                                <div style={styles.errorTitle}>Video Content Gated</div>
                                <div style={styles.errorText}>{videoError}</div>
                                <button onClick={() => navigate('/student/payments')} style={styles.payBtn}>Proceed to Tuition Clearance</button>
                            </div>
                        ) : videoUrl ? (
                            <video src={videoUrl} controls controlsList="nodownload" style={styles.videoPlayer} autoPlay />
                        ) : (
                            <div style={styles.videoOverlay}>
                                <div>Select a lesson to begin learning</div>
                            </div>
                        )}
                    </div>

                    <div style={styles.lessonDetails}>
                        <h1 style={styles.lessonTitle}>{activeLesson?.lessonTitle || 'Welcome to the course'}</h1>
                        <div style={styles.lessonMeta}>
                            <span>Chapter: {activeChapter?.chapterTitle}</span>
                            <span>•</span>
                            <span>Duration: {activeLesson?.durationMinutes} mins</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Curriculum Sidebar */}
                <div style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        <h3 style={{ color: colors.text, margin: 0 }}>Course Content</h3>
                    </div>
                    
                    <div style={styles.curriculumList}>
                        {course.curriculumTree?.map((chapter, cIdx) => (
                            <div key={chapter._id || cIdx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                <div style={styles.chapterHeader}>
                                    <strong>Chapter {cIdx + 1}:</strong> {chapter.chapterTitle}
                                </div>
                                <div style={styles.lessonList}>
                                    {chapter.lessons?.map((lesson, lIdx) => {
                                        const isActive = activeChapterIndex === cIdx && activeLessonIndex === lIdx;
                                        return (
                                            <div 
                                                key={lesson._id || lIdx}
                                                onClick={() => handleLessonSelect(cIdx, lIdx, lesson.videoAssetURL)}
                                                style={{
                                                    ...styles.lessonItem,
                                                    background: isActive ? colors.bgInput : 'transparent',
                                                    color: isActive ? colors.primary : colors.textMuted,
                                                    borderLeft: isActive ? `3px solid ${colors.primary}` : '3px solid transparent'
                                                }}
                                            >
                                                <div style={styles.lessonItemLeft}>
                                                    <span style={styles.lessonIcon}>{lesson.contentType === 'Video' ? '▶' : '📄'}</span>
                                                    <span>{lesson.lessonTitle}</span>
                                                </div>
                                                <span style={{ fontSize: '11px', opacity: 0.7 }}>{lesson.durationMinutes}m</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Global AI Assistant component injected with contextual awareness */}
            <AiAssistant context={{ courseName: course.courseTitle }} />
        </div>
    );
}
