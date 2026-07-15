import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, aiService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function LearningWorkspace() {
    const { courseId } = useParams();
    const { colors } = useTheme();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // AI Tutor States
    const [showAiTutor, setShowAiTutor] = useState(false);
    const [aiMessages, setAiMessages] = useState([{ sender: 'ai', text: "Hi! I'm your Emare TutorBot. Ask me anything about this course!" }]);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const chatEndRef = useRef(null);

    // Hardcoded state for demo navigation between modules
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);
    const [activeLessonIndex, setActiveLessonIndex] = useState(0);

    useEffect(() => {
        const fetchWorkspace = async () => {
            try {
                const res = await courseService.getById(courseId);
                setCourse(res.data.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load workspace.');
            } finally {
                setLoading(false);
            }
        };
        fetchWorkspace();
    }, [courseId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiMessages, showAiTutor]);

    const handleAskAi = async (e) => {
        e.preventDefault();
        if (!aiInput.trim()) return;

        const question = aiInput;
        setAiMessages(prev => [...prev, { sender: 'user', text: question }]);
        setAiInput('');
        setAiLoading(true);

        try {
            const context = course?.courseTitle;
            const res = await aiService.askQuestion({ question, courseContext: context });
            setAiMessages(prev => [...prev, { sender: 'ai', text: res.data.data.answer }]);
        } catch (err) {
            setAiMessages(prev => [...prev, { sender: 'ai', text: 'Error: Could not connect to AI service.' }]);
        } finally {
            setAiLoading(false);
        }
    };

    if (loading) return <div style={styles.loading}>Loading Workspace...</div>;
    if (error) return <div style={styles.error}>{error}</div>;
    if (!course) return <div style={styles.error}>Course not found.</div>;

    const activeChapter = course.curriculumTree?.[activeChapterIndex];
    const activeLesson = activeChapter?.lessons?.[activeLessonIndex];

    return (
        <div style={{ ...styles.container, background: colors.bg }}>
            {/* Top Navigation */}
            <nav style={{ ...styles.navbar, background: colors.bgCard, borderBottom: `1px solid ${colors.border}` }}>
                <div style={styles.navLeft}>
                    <button onClick={() => navigate('/student/dashboard')} style={{ ...styles.backBtn, color: colors.textMuted }}>← Back</button>
                    <h2 style={{ ...styles.navTitle, color: colors.text }}>{course.courseTitle}</h2>
                </div>
                <div style={styles.navRight}>
                    <button onClick={() => navigate(`/student/discussions/${course._id}`)} style={styles.navActionBtn}>Q&A Discussions</button>
                    <button onClick={() => navigate(`/student/assignments/${course._id}`)} style={styles.navActionBtn}>Assignments</button>
                </div>
            </nav>

            <div style={styles.mainLayout}>
                {/* Left Panel: Video & Content */}
                <div style={styles.contentArea}>
                    <div style={styles.videoPlayerContainer}>
                        {activeLesson?.contentType === 'Video' ? (
                            <div style={styles.mockVideo}>
                                <div style={styles.playIcon}>▶</div>
                                <div style={styles.mockVideoText}>{activeLesson.lessonTitle}</div>
                            </div>
                        ) : (
                            <div style={styles.documentViewer}>
                                <h3>{activeLesson?.lessonTitle}</h3>
                                <p>Read the document instructions here...</p>
                            </div>
                        )}
                    </div>

                    <div style={{ ...styles.lessonDetails, background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                        <h1 style={{ ...styles.lessonTitle, color: colors.text }}>{activeLesson?.lessonTitle || 'Welcome to the course'}</h1>
                        <div style={{ ...styles.lessonMeta, color: colors.textMuted }}>
                            <span>Chapter: {activeChapter?.chapterTitle}</span>
                            <span>•</span>
                            <span>Duration: {activeLesson?.durationMinutes} mins</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Curriculum Sidebar */}
                <div style={{ ...styles.sidebar, background: colors.bgCard, borderLeft: `1px solid ${colors.border}` }}>
                    <div style={{ ...styles.sidebarHeader, borderBottom: `1px solid ${colors.border}` }}>
                        <h3 style={{ color: colors.text, margin: 0 }}>Course Content</h3>
                    </div>
                    
                    <div style={styles.curriculumList}>
                        {course.curriculumTree?.map((chapter, cIdx) => (
                            <div key={chapter._id || cIdx} style={{ ...styles.chapterBox, borderBottom: `1px solid ${colors.border}` }}>
                                <div style={{ ...styles.chapterHeader, color: colors.text }}>
                                    <strong>Chapter {cIdx + 1}:</strong> {chapter.chapterTitle}
                                </div>
                                <div style={styles.lessonList}>
                                    {chapter.lessons?.map((lesson, lIdx) => {
                                        const isActive = activeChapterIndex === cIdx && activeLessonIndex === lIdx;
                                        return (
                                            <div 
                                                key={lesson._id || lIdx}
                                                onClick={() => { setActiveChapterIndex(cIdx); setActiveLessonIndex(lIdx); }}
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
                                                <span style={styles.lessonDuration}>{lesson.durationMinutes}m</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Tutor Floating Widget */}
            <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px' }}>
                {showAiTutor && (
                    <div style={{ width: '380px', height: '500px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '20px' }}>🤖</span>
                                <span style={{ fontWeight: '700', fontSize: '15px' }}>TutorBot</span>
                            </div>
                            <button onClick={() => setShowAiTutor(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {aiMessages.map((msg, idx) => (
                                <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                    <div style={{ background: msg.sender === 'user' ? colors.primary : colors.bgInput, color: msg.sender === 'user' ? '#fff' : colors.text, padding: '12px 16px', borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', fontSize: '14px', lineHeight: 1.5 }}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {aiLoading && (
                                <div style={{ alignSelf: 'flex-start', background: colors.bgInput, color: colors.text, padding: '12px 16px', borderRadius: '12px 12px 12px 2px', fontSize: '14px' }}>
                                    <span style={{ animation: 'pulse 1.5s infinite' }}>Thinking...</span>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleAskAi} style={{ padding: '16px', borderTop: `1px solid ${colors.border}`, background: colors.bgCard, display: 'flex', gap: '8px' }}>
                            <input type="text" required value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="Ask a question..." style={{ flex: 1, background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '10px 14px', borderRadius: '8px', outline: 'none' }} />
                            <button type="submit" disabled={aiLoading} style={{ background: colors.primary, color: '#fff', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', opacity: aiLoading ? 0.5 : 1 }}>Ask</button>
                        </form>
                    </div>
                )}
                
                <button onClick={() => setShowAiTutor(!showAiTutor)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', boxShadow: '0 10px 20px rgba(59,130,246,0.4)', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                    🤖
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
    loading: { color: '#f1f5f9', padding: '40px', textAlign: 'center' },
    error: { color: '#ef4444', padding: '40px', textAlign: 'center' },
    navbar: { height: '60px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    navLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
    backBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    navTitle: { margin: 0, fontSize: '16px', fontWeight: '700' },
    navRight: { display: 'flex', gap: '12px' },
    navActionBtn: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
    mainLayout: { display: 'flex', flex: 1, overflow: 'hidden' },
    contentArea: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
    videoPlayerContainer: { background: '#000', width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    mockVideo: { textAlign: 'center', color: '#fff' },
    playIcon: { fontSize: '64px', opacity: 0.5, marginBottom: '16px' },
    mockVideoText: { fontSize: '20px', fontWeight: '600' },
    documentViewer: { padding: '40px', color: '#fff' },
    lessonDetails: { padding: '32px', margin: '24px', borderRadius: '12px' },
    lessonTitle: { margin: '0 0 12px', fontSize: '24px', fontWeight: '800' },
    lessonMeta: { display: 'flex', gap: '12px', fontSize: '14px' },
    sidebar: { width: '350px', display: 'flex', flexDirection: 'column' },
    sidebarHeader: { padding: '20px 24px' },
    curriculumList: { flex: 1, overflowY: 'auto' },
    chapterBox: {},
    chapterHeader: { padding: '16px 24px', background: 'rgba(0,0,0,0.1)', fontSize: '14px' },
    lessonList: { display: 'flex', flexDirection: 'column' },
    lessonItem: { padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '13px', transition: 'background 0.2s' },
    lessonItemLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
    lessonIcon: { opacity: 0.6 }
};
