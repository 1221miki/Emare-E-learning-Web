import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { quizService, courseService } from '../../services/api';
import { 
    HelpCircle, Plus, Search, Filter, Edit3, Trash2, Eye, Award, CheckCircle2, XCircle, 
    Clock, RefreshCw, BarChart2, CheckSquare, Layers, ArrowUp, ArrowDown, Download, FileText, 
    BookOpen, Sparkles, ChevronRight, Sliders, AlertCircle
} from 'lucide-react';

// ── Initial Demo Data for Seamless Visual Experience ─────────────────────────
const DEMO_QUIZZES = [
    {
        id: 'q1',
        title: 'MERN Stack Fundamentals & Express Routing',
        description: 'Comprehensive quiz evaluating Node.js event loop, Express middleware, and REST API conventions.',
        courseId: 'c1',
        courseTitle: 'Full-Stack MERN Development 2026',
        lessonTitle: 'Module 3: Express Routing & Middleware',
        timeLimit: 30, // minutes
        passingScore: 75, // %
        maxAttempts: 3,
        status: 'Published',
        questionsCount: 12,
        totalMarks: 30,
        attemptsCount: 84,
        avgScore: 82,
        settings: {
            randomQuestions: true,
            shuffleAnswers: true,
            autoGrading: true,
            showResultAfterSubmit: true,
            allowRetake: true
        },
        questions: [
            {
                id: 'q1_1',
                type: 'mcq',
                text: 'Which Express method is used to bind middleware function to specified path?',
                options: ['app.get()', 'app.use()', 'app.listen()', 'app.post()'],
                correctAnswer: 1, // index of app.use()
                marks: 2
            },
            {
                id: 'q1_2',
                type: 'tf',
                text: 'Node.js event loop runs on multiple background threads by default for non-blocking I/O.',
                correctAnswer: 'False',
                marks: 2
            },
            {
                id: 'q1_3',
                type: 'short',
                text: 'Name the HTTP status code returned for successful resource creation.',
                expectedAnswer: '201',
                marks: 3
            }
        ]
    },
    {
        id: 'q2',
        title: 'React Hooks & State Management Deep Dive',
        description: 'Testing advanced useMemo, useCallback, useReducer, and custom hooks implementation patterns.',
        courseId: 'c1',
        courseTitle: 'Full-Stack MERN Development 2026',
        lessonTitle: 'Module 5: React Context & Custom Hooks',
        timeLimit: 45,
        passingScore: 80,
        maxAttempts: 2,
        status: 'Published',
        questionsCount: 15,
        totalMarks: 40,
        attemptsCount: 62,
        avgScore: 76,
        settings: {
            randomQuestions: true,
            shuffleAnswers: true,
            autoGrading: true,
            showResultAfterSubmit: true,
            allowRetake: true
        },
        questions: [
            {
                id: 'q2_1',
                type: 'mcq',
                text: 'When does the useEffect hook cleanup function run?',
                options: [
                    'Only when component unmounts',
                    'Before re-running the effect on dependency change and component unmount',
                    'Immediately after initial render',
                    'Every 5 seconds automatically'
                ],
                correctAnswer: 1,
                marks: 3
            }
        ]
    },
    {
        id: 'q3',
        title: 'MongoDB Schema Design & Indexing Optimization',
        description: 'Covers MongoDB aggregation pipelines, compound index strategy, and bucket pattern for time-series data.',
        courseId: 'c2',
        courseTitle: 'Database Architecture & Performance Optimization',
        lessonTitle: 'Module 2: Advanced Indexing & Query Plans',
        timeLimit: 25,
        passingScore: 70,
        maxAttempts: 5,
        status: 'Draft',
        questionsCount: 8,
        totalMarks: 20,
        attemptsCount: 0,
        avgScore: 0,
        settings: {
            randomQuestions: false,
            shuffleAnswers: true,
            autoGrading: true,
            showResultAfterSubmit: true,
            allowRetake: true
        },
        questions: []
    }
];

const DEMO_RESULTS = [
    {
        id: 'r1',
        studentName: 'Abebe Bikila',
        studentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        quizTitle: 'MERN Stack Fundamentals & Express Routing',
        score: 28,
        totalMarks: 30,
        percentage: 93,
        passed: true,
        attemptDate: '2026-08-03 14:22',
        timeTaken: '18m 45s'
    },
    {
        id: 'r2',
        studentName: 'Tigist Alemu',
        studentAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
        quizTitle: 'MERN Stack Fundamentals & Express Routing',
        score: 24,
        totalMarks: 30,
        percentage: 80,
        passed: true,
        attemptDate: '2026-08-04 09:15',
        timeTaken: '22m 10s'
    },
    {
        id: 'r3',
        studentName: 'Dawit Yohannes',
        studentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        quizTitle: 'React Hooks & State Management Deep Dive',
        score: 22,
        totalMarks: 40,
        percentage: 55,
        passed: false,
        attemptDate: '2026-08-02 18:40',
        timeTaken: '34m 12s'
    },
    {
        id: 'r4',
        studentName: 'Selamawit Kebede',
        studentAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
        quizTitle: 'React Hooks & State Management Deep Dive',
        score: 36,
        totalMarks: 40,
        percentage: 90,
        passed: true,
        attemptDate: '2026-08-04 11:05',
        timeTaken: '28m 50s'
    }
];

export default function QuizManagementDashboard() {
    const { colors, theme } = useTheme();
    const [activeTab, setActiveTab] = useState('overview'); // overview | builder | settings | results | analytics
    const [quizzes, setQuizzes] = useState(DEMO_QUIZZES);
    const [results, setResults] = useState(DEMO_RESULTS);
    const [selectedQuiz, setSelectedQuiz] = useState(DEMO_QUIZZES[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourseFilter, setSelectedCourseFilter] = useState('All');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

    // Modals
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [selectedResult, setSelectedResult] = useState(null);

    // Form State for Quiz Create/Edit
    const [quizForm, setQuizForm] = useState({
        id: '',
        title: '',
        description: '',
        courseTitle: 'Full-Stack MERN Development 2026',
        lessonTitle: 'Module 1: Getting Started',
        timeLimit: 30,
        passingScore: 75,
        maxAttempts: 3,
        status: 'Draft',
        settings: {
            randomQuestions: true,
            shuffleAnswers: true,
            autoGrading: true,
            showResultAfterSubmit: true,
            allowRetake: true
        }
    });

    // Form State for Question Add/Edit
    const [questionForm, setQuestionForm] = useState({
        id: '',
        type: 'mcq', // mcq | tf | short
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0, // index for mcq, 'True'/'False' for tf, string for short
        marks: 2
    });

    // Toast notification
    const [toast, setToast] = useState('');
    const showToastMsg = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    // Calculate Dashboard Summary Metrics
    const totalQuizzes = quizzes.length;
    const publishedQuizzes = quizzes.filter(q => q.status === 'Published').length;
    const draftQuizzes = quizzes.filter(q => q.status === 'Draft').length;
    const totalQuestions = quizzes.reduce((sum, q) => sum + (q.questions?.length || 0), 0);
    const totalAttempts = quizzes.reduce((sum, q) => sum + (q.attemptsCount || 0), 0);
    const overallAvgScore = Math.round(
        quizzes.reduce((sum, q) => sum + (q.avgScore || 0), 0) / (quizzes.length || 1)
    );

    // Filtered Quizzes
    const filteredQuizzes = quizzes.filter(q => {
        const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              q.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCourse = selectedCourseFilter === 'All' || q.courseTitle === selectedCourseFilter;
        const matchesStatus = selectedStatusFilter === 'All' || q.status === selectedStatusFilter;
        return matchesSearch && matchesCourse && matchesStatus;
    });

    // Handler: Open Modal for New Quiz
    const handleOpenNewQuizModal = () => {
        setQuizForm({
            id: '',
            title: '',
            description: '',
            courseTitle: 'Full-Stack MERN Development 2026',
            lessonTitle: 'Module 1: Introduction',
            timeLimit: 30,
            passingScore: 75,
            maxAttempts: 3,
            status: 'Draft',
            settings: {
                randomQuestions: true,
                shuffleAnswers: true,
                autoGrading: true,
                showResultAfterSubmit: true,
                allowRetake: true
            }
        });
        setShowQuizModal(true);
    };

    // Handler: Edit Quiz Details
    const handleEditQuiz = (quiz) => {
        setQuizForm({ ...quiz });
        setShowQuizModal(true);
    };

    // Handler: Save Quiz (Create or Update)
    const handleSaveQuiz = (publishStatus) => {
        if (!quizForm.title.trim()) {
            alert('Please enter a quiz title.');
            return;
        }

        const isNew = !quizForm.id;
        const newStatus = publishStatus || quizForm.status;

        const updatedQuizObj = {
            ...quizForm,
            id: quizForm.id || `q_${Date.now()}`,
            status: newStatus,
            questions: quizForm.questions || [],
            questionsCount: quizForm.questions?.length || 0,
            attemptsCount: quizForm.attemptsCount || 0,
            avgScore: quizForm.avgScore || 0
        };

        if (isNew) {
            setQuizzes([updatedQuizObj, ...quizzes]);
            setSelectedQuiz(updatedQuizObj);
            showToastMsg(`Quiz created as ${newStatus}!`);
        } else {
            setQuizzes(quizzes.map(q => q.id === updatedQuizObj.id ? updatedQuizObj : q));
            if (selectedQuiz?.id === updatedQuizObj.id) {
                setSelectedQuiz(updatedQuizObj);
            }
            showToastMsg(`Quiz "${updatedQuizObj.title}" updated!`);
        }

        setShowQuizModal(false);
    };

    // Handler: Delete Quiz
    const handleDeleteQuiz = (quizId) => {
        if (window.confirm('Are you sure you want to delete this quiz?')) {
            const updated = quizzes.filter(q => q.id !== quizId);
            setQuizzes(updated);
            if (selectedQuiz?.id === quizId && updated.length > 0) {
                setSelectedQuiz(updated[0]);
            }
            showToastMsg('Quiz deleted successfully.');
        }
    };

    // Handler: Add / Update Question
    const handleSaveQuestion = () => {
        if (!questionForm.text.trim()) {
            alert('Please provide question text.');
            return;
        }

        const currentQuestions = selectedQuiz.questions || [];
        let updatedQuestions;

        if (editingQuestion) {
            updatedQuestions = currentQuestions.map(q => q.id === editingQuestion.id ? { ...questionForm } : q);
            showToastMsg('Question updated!');
        } else {
            const newQ = { ...questionForm, id: `q_${Date.now()}` };
            updatedQuestions = [...currentQuestions, newQ];
            showToastMsg('New question added!');
        }

        const updatedQuiz = {
            ...selectedQuiz,
            questions: updatedQuestions,
            questionsCount: updatedQuestions.length,
            totalMarks: updatedQuestions.reduce((sum, q) => sum + (parseInt(q.marks) || 0), 0)
        };

        setSelectedQuiz(updatedQuiz);
        setQuizzes(quizzes.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
        setShowQuestionModal(false);
        setEditingQuestion(null);
    };

    // Handler: Delete Question
    const handleDeleteQuestion = (qId) => {
        const updatedQuestions = (selectedQuiz.questions || []).filter(q => q.id !== qId);
        const updatedQuiz = {
            ...selectedQuiz,
            questions: updatedQuestions,
            questionsCount: updatedQuestions.length,
            totalMarks: updatedQuestions.reduce((sum, q) => sum + (parseInt(q.marks) || 0), 0)
        };
        setSelectedQuiz(updatedQuiz);
        setQuizzes(quizzes.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
        showToastMsg('Question removed.');
    };

    // Handler: Reorder Question (up / down)
    const handleReorderQuestion = (index, direction) => {
        const questions = [...(selectedQuiz.questions || [])];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= questions.length) return;

        const temp = questions[index];
        questions[index] = questions[targetIndex];
        questions[targetIndex] = temp;

        const updatedQuiz = { ...selectedQuiz, questions };
        setSelectedQuiz(updatedQuiz);
        setQuizzes(quizzes.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
    };

    // Handler: Toggle Settings Option
    const handleToggleSetting = (settingKey) => {
        const updatedSettings = {
            ...selectedQuiz.settings,
            [settingKey]: !selectedQuiz.settings?.[settingKey]
        };
        const updatedQuiz = { ...selectedQuiz, settings: updatedSettings };
        setSelectedQuiz(updatedQuiz);
        setQuizzes(quizzes.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
        showToastMsg('Quiz setting updated.');
    };

    // Emare AI Tutor Enable/Disable for the selected quiz
    const handleToggleAiTutor = () => {
        const updatedQuiz = { ...selectedQuiz, aiTutorEnabled: selectedQuiz.aiTutorEnabled === false };
        setSelectedQuiz(updatedQuiz);
        setQuizzes(quizzes.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
        showToastMsg(updatedQuiz.aiTutorEnabled !== false ? 'Emare AI Tutor enabled for this quiz.' : 'Emare AI Tutor disabled for this quiz.');
    };

    // Styles setup
    const s = {
        page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', system-ui, sans-serif", background: colors.bg },
        main: { marginLeft: '260px', padding: '32px 32px 60px', flex: 1, minHeight: '100vh' },
        card: { background: colors.bgCard, borderRadius: '20px', padding: '24px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' },
        tabsRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', background: colors.bgCard, padding: '8px', borderRadius: '16px', border: `1px solid ${colors.border}`, marginBottom: '24px' },
        tabBtn: (active) => ({
            padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', border: 'none',
            background: active ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'transparent',
            color: active ? '#fff' : colors.textMuted, transition: 'all 0.2s'
        }),
        gridStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px', marginBottom: '28px' },
        statCard: { background: colors.bgCard, borderRadius: '18px', padding: '20px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '16px' },
        statIcon: (bg, col) => ({ width: '50px', height: '50px', borderRadius: '14px', background: bg, color: col, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
        btnPrimary: { padding: '12px 20px', borderRadius: '12px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
        btnSecondary: { padding: '12px 20px', borderRadius: '12px', background: colors.bgInput || colors.bg, color: colors.text, border: `1px solid ${colors.border}`, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
        input: { width: '100%', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${colors.border}`, background: colors.bgInput || colors.bg, color: colors.text, fontSize: '14px', outline: 'none' },
        badge: (status) => ({
            padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
            background: status === 'Published' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
            color: status === 'Published' ? '#22c55e' : '#eab308',
            border: `1px solid ${status === 'Published' ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`
        }),
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' },
        modalContent: { background: colors.bgCard, width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', padding: '28px', border: `1px solid ${colors.border}`, boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }
    };

    return (
        <div style={s.page}>
            <Sidebar />

            <main style={s.main}>
                {/* Toast Message */}
                {toast && (
                    <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 200, background: '#10b981', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, boxShadow: '0 8px 24px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={18} /> {toast}
                    </div>
                )}

                {/* ── Top Header ─────────────────────────────────────────── */}
                <div style={s.header}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textMuted, fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                            <span>Instructor</span> <ChevronRight size={14} /> <span style={{ color: colors.primary }}>Quiz Management</span>
                        </div>
                        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: colors.text }}>Quiz Management Dashboard</h1>
                    </div>
                    <button style={s.btnPrimary} onClick={handleOpenNewQuizModal}>
                        <Plus size={18} /> Create New Quiz
                    </button>
                </div>

                {/* ── Navigation Tabs ────────────────────────────────────── */}
                <div style={s.tabsRow}>
                    <button style={s.tabBtn(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>
                        ▥ Overview Dashboard
                    </button>
                    <button style={s.tabBtn(activeTab === 'builder')} onClick={() => setActiveTab('builder')}>
                        ? Question Builder ({selectedQuiz ? selectedQuiz.title.substring(0, 20) + '...' : 'Select Quiz'})
                    </button>
                    <button style={s.tabBtn(activeTab === 'settings')} onClick={() => setActiveTab('settings')}>
                        ◈️ Quiz Settings
                    </button>
                    <button style={s.tabBtn(activeTab === 'results')} onClick={() => setActiveTab('results')}>
                        ‍◈ Student Results
                    </button>
                    <button style={s.tabBtn(activeTab === 'analytics')} onClick={() => setActiveTab('analytics')}>
                        ↗ Quiz Analytics
                    </button>
                </div>

                {/* ── 1. OVERVIEW TAB ────────────────────────────────────── */}
                {activeTab === 'overview' && (
                    <div>
                        {/* KPI Summary Cards */}
                        <div style={s.gridStats}>
                            <div style={s.statCard}>
                                <div style={s.statIcon('rgba(59,130,246,0.15)', '#3b82f6')}><HelpCircle size={24} /></div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: colors.text }}>{totalQuizzes}</div>
                                    <div style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600 }}>Total Quizzes</div>
                                </div>
                            </div>
                            <div style={s.statCard}>
                                <div style={s.statIcon('rgba(34,197,94,0.15)', '#22c55e')}><CheckCircle2 size={24} /></div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: colors.text }}>{publishedQuizzes}</div>
                                    <div style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600 }}>Published</div>
                                </div>
                            </div>
                            <div style={s.statCard}>
                                <div style={s.statIcon('rgba(234,179,8,0.15)', '#eab308')}><Edit3 size={24} /></div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: colors.text }}>{draftQuizzes}</div>
                                    <div style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600 }}>Draft Quizzes</div>
                                </div>
                            </div>
                            <div style={s.statCard}>
                                <div style={s.statIcon('rgba(139,92,246,0.15)', '#8b5cf6')}><Layers size={24} /></div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: colors.text }}>{totalQuestions}</div>
                                    <div style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600 }}>Total Questions</div>
                                </div>
                            </div>
                            <div style={s.statCard}>
                                <div style={s.statIcon('rgba(236,72,153,0.15)', '#ec4899')}><Award size={24} /></div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: colors.text }}>{totalAttempts}</div>
                                    <div style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600 }}>Student Attempts</div>
                                </div>
                            </div>
                            <div style={s.statCard}>
                                <div style={s.statIcon('rgba(16,185,129,0.15)', '#10b981')}><BarChart2 size={24} /></div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: colors.text }}>{overallAvgScore}%</div>
                                    <div style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600 }}>Average Score</div>
                                </div>
                            </div>
                        </div>

                        {/* Search & Filter Controls */}
                        <div style={{ ...s.card, marginBottom: '24px', padding: '16px 20px' }}>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
                                        <input 
                                            style={{ ...s.input, paddingLeft: '38px' }} 
                                            placeholder="Search quiz by title or description..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <select style={s.input} value={selectedCourseFilter} onChange={(e) => setSelectedCourseFilter(e.target.value)}>
                                        <option value="All">All Courses</option>
                                        <option value="Full-Stack MERN Development 2026">Full-Stack MERN Development 2026</option>
                                        <option value="Database Architecture & Performance Optimization">Database Architecture</option>
                                    </select>
                                    <select style={s.input} value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)}>
                                        <option value="All">All Statuses</option>
                                        <option value="Published">Published</option>
                                        <option value="Draft">Draft</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Quizzes List Table */}
                        <div style={s.card}>
                            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 800, color: colors.text }}>Manage All Quizzes</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: `2px solid ${colors.border}`, color: colors.textMuted }}>
                                            <th style={{ padding: '12px 16px' }}>Quiz Title & Course</th>
                                            <th style={{ padding: '12px 16px' }}>Questions</th>
                                            <th style={{ padding: '12px 16px' }}>Time & Pass Score</th>
                                            <th style={{ padding: '12px 16px' }}>Attempts</th>
                                            <th style={{ padding: '12px 16px' }}>Avg Score</th>
                                            <th style={{ padding: '12px 16px' }}>Status</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredQuizzes.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
                                                    No quizzes found matching your filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredQuizzes.map((quiz) => (
                                                <tr key={quiz.id} style={{ borderBottom: `1px solid ${colors.border}`, transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '16px' }}>
                                                        <div style={{ fontWeight: 700, color: colors.text, marginBottom: '4px' }}>{quiz.title}</div>
                                                        <div style={{ fontSize: '12px', color: colors.textMuted }}>{quiz.courseTitle} · <span style={{ color: colors.primary }}>{quiz.lessonTitle}</span></div>
                                                    </td>
                                                    <td style={{ padding: '16px', fontWeight: 600, color: colors.text }}>
                                                        {quiz.questionsCount} Questions ({quiz.totalMarks || 0} pts)
                                                    </td>
                                                    <td style={{ padding: '16px', color: colors.textMuted }}>
                                                        ⏱️ {quiz.timeLimit} mins · Pass: <strong style={{ color: colors.text }}>{quiz.passingScore}%</strong>
                                                    </td>
                                                    <td style={{ padding: '16px', fontWeight: 600, color: colors.text }}>
                                                        ◈ {quiz.attemptsCount} attempts
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        <div style={{ fontWeight: 700, color: quiz.avgScore >= 80 ? '#22c55e' : quiz.avgScore >= 60 ? '#eab308' : '#ef4444' }}>
                                                            {quiz.avgScore > 0 ? `${quiz.avgScore}%` : 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        <span style={s.badge(quiz.status)}>{quiz.status}</span>
                                                    </td>
                                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button 
                                                                title="Build / Manage Questions" 
                                                                style={{ ...s.btnSecondary, padding: '8px 12px', fontSize: '12px' }}
                                                                onClick={() => { setSelectedQuiz(quiz); setActiveTab('builder'); }}
                                                            >
                                                                ? Questions
                                                            </button>
                                                            <button 
                                                                title="Edit Quiz Details" 
                                                                style={{ ...s.btnSecondary, padding: '8px 10px', color: '#3b82f6' }}
                                                                onClick={() => handleEditQuiz(quiz)}
                                                            >
                                                                <Edit3 size={16} />
                                                            </button>
                                                            <button 
                                                                title="Delete Quiz" 
                                                                style={{ ...s.btnSecondary, padding: '8px 10px', color: '#ef4444' }}
                                                                onClick={() => handleDeleteQuiz(quiz.id)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── 2. QUESTION BUILDER TAB ────────────────────────────── */}
                {activeTab === 'builder' && selectedQuiz && (
                    <div>
                        <div style={{ ...s.card, marginBottom: '24px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div>
                                    <span style={{ fontSize: '12px', textTransform: 'uppercase', tracking: '1px', fontWeight: 800, color: colors.primary }}>Question Builder</span>
                                    <h2 style={{ margin: '4px 0', fontSize: '22px', fontWeight: 800, color: colors.text }}>{selectedQuiz.title}</h2>
                                    <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>
                                        Total Questions: <strong>{selectedQuiz.questions?.length || 0}</strong> · Total Points: <strong>{selectedQuiz.totalMarks || 0} pts</strong> · Time Limit: <strong>{selectedQuiz.timeLimit} mins</strong>
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button 
                                        style={s.btnPrimary} 
                                        onClick={() => {
                                            setEditingQuestion(null);
                                            setQuestionForm({ id: '', type: 'mcq', text: '', options: ['', '', '', ''], correctAnswer: 0, marks: 2 });
                                            setShowQuestionModal(true);
                                        }}
                                    >
                                        <Plus size={18} /> Add New Question
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Questions List */}
                        <div style={s.card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: colors.text }}>Quiz Questions</h3>
                                <span style={{ fontSize: '13px', color: colors.textMuted }}>Reorder questions using the arrows</span>
                            </div>

                            {(!selectedQuiz.questions || selectedQuiz.questions.length === 0) ? (
                                <div style={{ padding: '60px 20px', textAlign: 'center', border: `2px dashed ${colors.border}`, borderRadius: '16px' }}>
                                    <HelpCircle size={48} style={{ color: colors.textMuted, marginBottom: '16px' }} />
                                    <h4 style={{ margin: '0 0 8px', fontSize: '18px', color: colors.text }}>No Questions Added Yet</h4>
                                    <p style={{ margin: '0 0 20px', color: colors.textMuted, fontSize: '14px' }}>Start building your quiz by adding multiple choice, true/false, or short answer questions.</p>
                                    <button 
                                        style={s.btnPrimary}
                                        onClick={() => {
                                            setEditingQuestion(null);
                                            setQuestionForm({ id: '', type: 'mcq', text: '', options: ['', '', '', ''], correctAnswer: 0, marks: 2 });
                                            setShowQuestionModal(true);
                                        }}
                                    >
                                        <Plus size={18} /> Add First Question
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {selectedQuiz.questions.map((q, idx) => (
                                        <div key={q.id} style={{ padding: '20px', borderRadius: '16px', border: `1px solid ${colors.border}`, background: colors.bgInput || colors.bg }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', marginRight: '8px' }}>
                                                            {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'tf' ? 'True / False' : 'Short Answer'}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>{q.marks} Marks</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                    <button 
                                                        disabled={idx === 0}
                                                        onClick={() => handleReorderQuestion(idx, 'up')}
                                                        style={{ ...s.btnSecondary, padding: '6px', opacity: idx === 0 ? 0.3 : 1 }}
                                                        title="Move Up"
                                                    >
                                                        <ArrowUp size={16} />
                                                    </button>
                                                    <button 
                                                        disabled={idx === selectedQuiz.questions.length - 1}
                                                        onClick={() => handleReorderQuestion(idx, 'down')}
                                                        style={{ ...s.btnSecondary, padding: '6px', opacity: idx === selectedQuiz.questions.length - 1 ? 0.3 : 1 }}
                                                        title="Move Down"
                                                    >
                                                        <ArrowDown size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setEditingQuestion(q);
                                                            setQuestionForm({ ...q });
                                                            setShowQuestionModal(true);
                                                        }}
                                                        style={{ ...s.btnSecondary, padding: '6px 12px', fontSize: '12px', color: '#3b82f6' }}
                                                    >
                                                        <Edit3 size={14} /> Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteQuestion(q.id)}
                                                        style={{ ...s.btnSecondary, padding: '6px 12px', fontSize: '12px', color: '#ef4444' }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ fontSize: '16px', fontWeight: 700, color: colors.text, marginBottom: '14px', paddingLeft: '44px' }}>
                                                {q.text}
                                            </div>

                                            {/* MCQ Options Display */}
                                            {q.type === 'mcq' && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', paddingLeft: '44px' }}>
                                                    {q.options?.map((opt, optIdx) => (
                                                        <div 
                                                            key={optIdx} 
                                                            style={{ 
                                                                padding: '10px 14px', borderRadius: '10px', 
                                                                border: optIdx === q.correctAnswer ? '2px solid #22c55e' : `1px solid ${colors.border}`,
                                                                background: optIdx === q.correctAnswer ? 'rgba(34,197,94,0.08)' : colors.bgCard,
                                                                fontSize: '13px', color: colors.text, display: 'flex', alignItems: 'center', gap: '8px'
                                                            }}
                                                        >
                                                            {optIdx === q.correctAnswer ? <CheckCircle2 size={16} style={{ color: '#22c55e' }} /> : <span style={{ width: 16 }} />}
                                                            <span><strong>{String.fromCharCode(65 + optIdx)}.</strong> {opt}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* True / False Display */}
                                            {q.type === 'tf' && (
                                                <div style={{ paddingLeft: '44px', display: 'flex', gap: '16px' }}>
                                                    <div style={{ padding: '8px 16px', borderRadius: '8px', border: q.correctAnswer === 'True' ? '2px solid #22c55e' : `1px solid ${colors.border}`, background: q.correctAnswer === 'True' ? 'rgba(34,197,94,0.08)' : colors.bgCard, fontWeight: 700, color: colors.text }}>
                                                        True {q.correctAnswer === 'True' && ''}
                                                    </div>
                                                    <div style={{ padding: '8px 16px', borderRadius: '8px', border: q.correctAnswer === 'False' ? '2px solid #22c55e' : `1px solid ${colors.border}`, background: q.correctAnswer === 'False' ? 'rgba(34,197,94,0.08)' : colors.bgCard, fontWeight: 700, color: colors.text }}>
                                                        False {q.correctAnswer === 'False' && ''}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Short Answer Display */}
                                            {q.type === 'short' && (
                                                <div style={{ paddingLeft: '44px', fontSize: '13px', color: colors.textMuted }}>
                                                    Expected Answer / Key Terms: <strong style={{ color: colors.primary }}>{q.expectedAnswer}</strong>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── 3. QUIZ SETTINGS TAB ───────────────────────────────── */}
                {activeTab === 'settings' && selectedQuiz && (
                    <div style={{ maxWidth: '800px' }}>
                        <div style={s.card}>
                            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: colors.text }}>Quiz Settings & Configurations</h3>
                            <p style={{ margin: '0 0 24px', color: colors.textMuted, fontSize: '14px' }}>Configure grading, attempt rules, and display settings for <strong>{selectedQuiz.title}</strong>.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Emare AI Tutor Enable / Disable */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '14px', border: `1px solid ${selectedQuiz.aiTutorEnabled === false ? '#fecaca' : colors.border}`, background: selectedQuiz.aiTutorEnabled === false ? '#fef2f2' : (colors.bgInput || colors.bg) }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: selectedQuiz.aiTutorEnabled === false ? '#dc2626' : colors.text, fontSize: '15px', marginBottom: '4px' }}>⊡ Emare AI Tutor: {selectedQuiz.aiTutorEnabled === false ? 'Disabled' : 'Enabled'}</div>
                                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>{selectedQuiz.aiTutorEnabled === false ? 'AI Tutor is completely blocked while students take this quiz.' : 'Students can use the AI Tutor for this quiz.'}</div>
                                    </div>
                                    <button onClick={handleToggleAiTutor} style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '12px', background: selectedQuiz.aiTutorEnabled === false ? '#ef4444' : '#10b981', color: '#fff' }}>
                                        {selectedQuiz.aiTutorEnabled === false ? 'Enable' : 'Disable'}
                                    </button>
                                </div>
                                {[
                                    { key: 'randomQuestions', title: 'Randomize Questions', desc: 'Shuffle the order of questions for each student attempt.' },
                                    { key: 'shuffleAnswers', title: 'Shuffle Answer Options', desc: 'Randomize the position of MCQ options per question.' },
                                    { key: 'autoGrading', title: 'Auto-Grading', desc: 'Automatically calculate and publish scores upon quiz submission.' },
                                    { key: 'showResultAfterSubmit', title: 'Show Results After Submission', desc: 'Display detailed question-by-question breakdown right after submit.' },
                                    { key: 'allowRetake', title: 'Allow Quiz Retakes', desc: `Permit students to retake the quiz up to max limit (${selectedQuiz.maxAttempts} attempts).` }
                                ].map(item => (
                                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '14px', border: `1px solid ${colors.border}`, background: colors.bgInput || colors.bg }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: colors.text, fontSize: '15px', marginBottom: '4px' }}>{item.title}</div>
                                            <div style={{ color: colors.textMuted, fontSize: '13px' }}>{item.desc}</div>
                                        </div>
                                        <div 
                                            onClick={() => handleToggleSetting(item.key)}
                                            style={{
                                                width: '48px', height: '26px', borderRadius: '999px', cursor: 'pointer',
                                                background: selectedQuiz.settings?.[item.key] ? '#22c55e' : colors.border,
                                                position: 'relative', transition: 'background 0.2s', flexShrink: 0
                                            }}
                                        >
                                            <div style={{
                                                width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                                                position: 'absolute', top: '3px', left: selectedQuiz.settings?.[item.key] ? '25px' : '3px',
                                                transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── 4. STUDENT RESULTS TAB ─────────────────────────────── */}
                {activeTab === 'results' && (
                    <div>
                        <div style={{ ...s.card, marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: colors.text }}>Student Exam Attempts</h3>
                                <p style={{ margin: 0, color: colors.textMuted, fontSize: '13px' }}>Detailed report of student scores, pass rates, and time taken.</p>
                            </div>
                            <button style={s.btnSecondary} onClick={() => alert('Exporting results as CSV report...')}>
                                <Download size={16} /> Export Results (CSV)
                            </button>
                        </div>

                        <div style={s.card}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${colors.border}`, color: colors.textMuted }}>
                                        <th style={{ padding: '12px 16px' }}>Student</th>
                                        <th style={{ padding: '12px 16px' }}>Quiz Title</th>
                                        <th style={{ padding: '12px 16px' }}>Score & Percentage</th>
                                        <th style={{ padding: '12px 16px' }}>Status</th>
                                        <th style={{ padding: '12px 16px' }}>Time Taken</th>
                                        <th style={{ padding: '12px 16px' }}>Attempt Date</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((res) => (
                                        <tr key={res.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <img src={res.studentAvatar} alt={res.studentName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                                    <div style={{ fontWeight: 700, color: colors.text }}>{res.studentName}</div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', color: colors.textMuted, fontWeight: 600 }}>
                                                {res.quizTitle}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ fontWeight: 800, color: colors.text }}>{res.score} / {res.totalMarks} ({res.percentage}%)</div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800,
                                                    background: res.passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                    color: res.passed ? '#22c55e' : '#ef4444'
                                                }}>
                                                    {res.passed ? 'PASSED' : 'FAILED'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', color: colors.textMuted }}>
                                                ⏱️ {res.timeTaken}
                                            </td>
                                            <td style={{ padding: '16px', color: colors.textMuted, fontSize: '13px' }}>
                                                {res.attemptDate}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                <button 
                                                    style={{ ...s.btnSecondary, padding: '6px 12px', fontSize: '12px' }}
                                                    onClick={() => setSelectedResult(res)}
                                                >
                                                    <Eye size={14} /> View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── 5. QUIZ ANALYTICS TAB ──────────────────────────────── */}
                {activeTab === 'analytics' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                            <div style={s.card}>
                                <h4 style={{ margin: '0 0 16px', fontSize: '16px', color: colors.textMuted }}>Pass Rate Overview</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', background: 'conic-gradient(#22c55e 0% 78%, #ef4444 78% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: '74px', height: '74px', borderRadius: '50%', background: colors.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: colors.text, fontSize: '18px' }}>
                                            78%
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>● Passed: 78% (267 Students)</div>
                                        <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '14px' }}>● Failed: 22% (75 Students)</div>
                                    </div>
                                </div>
                            </div>

                            <div style={s.card}>
                                <h4 style={{ margin: '0 0 16px', fontSize: '16px', color: colors.textMuted }}>Score Distribution</h4>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '100px', paddingTop: '10px' }}>
                                    {[
                                        { label: '0-50%', pct: 15, color: '#ef4444' },
                                        { label: '50-70%', pct: 25, color: '#eab308' },
                                        { label: '70-85%', pct: 40, color: '#3b82f6' },
                                        { label: '85-100%', pct: 20, color: '#22c55e' }
                                    ].map((bar, i) => (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '100%', height: `${bar.pct * 1.8}px`, background: bar.color, borderRadius: '6px' }} />
                                            <span style={{ fontSize: '11px', color: colors.textMuted }}>{bar.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Difficult Questions Table */}
                        <div style={s.card}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: colors.text }}>Most Difficult Questions Analysis</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { q: 'When does the useEffect hook cleanup function run?', failureRate: '42%', avgTime: '2m 15s', course: 'React Hooks Deep Dive' },
                                    { q: 'Which Express method is used to bind middleware function?', failureRate: '28%', avgTime: '1m 10s', course: 'MERN Fundamentals' }
                                ].map((item, idx) => (
                                    <div key={idx} style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, background: colors.bgInput || colors.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: colors.text, marginBottom: '4px' }}>{item.q}</div>
                                            <div style={{ fontSize: '12px', color: colors.textMuted }}>Course: {item.course}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '16px' }}>{item.failureRate} Failure Rate</div>
                                            <div style={{ fontSize: '12px', color: colors.textMuted }}>Avg Time: {item.avgTime}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── MODAL: CREATE / EDIT QUIZ ──────────────────────────────── */}
            {showQuizModal && (
                <div style={s.modalOverlay}>
                    <div style={s.modalContent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: colors.text }}>
                                {quizForm.id ? 'Edit Quiz Information' : 'Create New Quiz'}
                            </h3>
                            <button onClick={() => setShowQuizModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '20px' }}></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>Quiz Title</label>
                                <input 
                                    style={s.input} 
                                    placeholder="e.g. MERN Stack & Express Routing Exam"
                                    value={quizForm.title}
                                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>Quiz Description</label>
                                <textarea 
                                    style={{ ...s.input, minHeight: '80px', resize: 'vertical' }} 
                                    placeholder="Provide brief instructions for students..."
                                    value={quizForm.description}
                                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>Course</label>
                                    <select 
                                        style={s.input}
                                        value={quizForm.courseTitle}
                                        onChange={(e) => setQuizForm({ ...quizForm, courseTitle: e.target.value })}
                                    >
                                        <option value="Full-Stack MERN Development 2026">Full-Stack MERN Development 2026</option>
                                        <option value="Database Architecture & Performance Optimization">Database Architecture & Performance</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>Lesson / Module</label>
                                    <input 
                                        style={s.input} 
                                        placeholder="e.g. Module 3: Express Routing"
                                        value={quizForm.lessonTitle}
                                        onChange={(e) => setQuizForm({ ...quizForm, lessonTitle: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>Time Limit (mins)</label>
                                    <input 
                                        type="number"
                                        style={s.input} 
                                        value={quizForm.timeLimit}
                                        onChange={(e) => setQuizForm({ ...quizForm, timeLimit: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>Passing Score (%)</label>
                                    <input 
                                        type="number"
                                        style={s.input} 
                                        value={quizForm.passingScore}
                                        onChange={(e) => setQuizForm({ ...quizForm, passingScore: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>Max Attempts</label>
                                    <input 
                                        type="number"
                                        style={s.input} 
                                        value={quizForm.maxAttempts}
                                        onChange={(e) => setQuizForm({ ...quizForm, maxAttempts: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button style={s.btnSecondary} onClick={() => handleSaveQuiz('Draft')}>
                                    Save as Draft
                                </button>
                                <button style={s.btnPrimary} onClick={() => handleSaveQuiz('Published')}>
                                    Publish Quiz Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: ADD / EDIT QUESTION ─────────────────────────────── */}
            {showQuestionModal && (
                <div style={s.modalOverlay}>
                    <div style={s.modalContent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: colors.text }}>
                                {editingQuestion ? 'Edit Question' : 'Add New Question'}
                            </h3>
                            <button onClick={() => setShowQuestionModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '20px' }}></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>Question Type</label>
                                    <select 
                                        style={s.input}
                                        value={questionForm.type}
                                        onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
                                    >
                                        <option value="mcq">Multiple Choice Question (MCQ)</option>
                                        <option value="tf">True / False</option>
                                        <option value="short">Short Answer</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>Marks / Points</label>
                                    <input 
                                        type="number"
                                        style={s.input} 
                                        value={questionForm.marks}
                                        onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>Question Prompt / Text</label>
                                <textarea 
                                    style={{ ...s.input, minHeight: '80px' }}
                                    placeholder="Type your question here..."
                                    value={questionForm.text}
                                    onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                                />
                            </div>

                            {/* MCQ Options Inputs */}
                            {questionForm.type === 'mcq' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '8px' }}>Answer Options (Select correct answer)</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {questionForm.options.map((opt, oIdx) => (
                                            <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input 
                                                    type="radio" 
                                                    name="correctAnswerIndex"
                                                    checked={questionForm.correctAnswer === oIdx}
                                                    onChange={() => setQuestionForm({ ...questionForm, correctAnswer: oIdx })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontWeight: 800, color: colors.text, width: '20px' }}>{String.fromCharCode(65 + oIdx)}.</span>
                                                <input 
                                                    style={s.input}
                                                    placeholder={`Option ${String.fromCharCode(65 + oIdx)} text...`}
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const newOpts = [...questionForm.options];
                                                        newOpts[oIdx] = e.target.value;
                                                        setQuestionForm({ ...questionForm, options: newOpts });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* True / False Inputs */}
                            {questionForm.type === 'tf' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '8px' }}>Correct Statement Answer</label>
                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, color: colors.text }}>
                                            <input 
                                                type="radio" 
                                                name="tfAnswer" 
                                                checked={questionForm.correctAnswer === 'True'}
                                                onChange={() => setQuestionForm({ ...questionForm, correctAnswer: 'True' })}
                                            />
                                            True
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, color: colors.text }}>
                                            <input 
                                                type="radio" 
                                                name="tfAnswer" 
                                                checked={questionForm.correctAnswer === 'False'}
                                                onChange={() => setQuestionForm({ ...questionForm, correctAnswer: 'False' })}
                                            />
                                            False
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Short Answer Inputs */}
                            {questionForm.type === 'short' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>Expected Answer / Key Phrase</label>
                                    <input 
                                        style={s.input}
                                        placeholder="e.g. 201 Created or app.use()"
                                        value={questionForm.expectedAnswer || ''}
                                        onChange={(e) => setQuestionForm({ ...questionForm, expectedAnswer: e.target.value })}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button style={s.btnSecondary} onClick={() => setShowQuestionModal(false)}>
                                    Cancel
                                </button>
                                <button style={s.btnPrimary} onClick={handleSaveQuestion}>
                                    Save Question
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: VIEW STUDENT RESULT ─────────────────────────────── */}
            {selectedResult && (
                <div style={s.modalOverlay}>
                    <div style={s.modalContent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={selectedResult.studentAvatar} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: colors.text }}>{selectedResult.studentName}</h3>
                                    <div style={{ fontSize: '12px', color: colors.textMuted }}>{selectedResult.quizTitle}</div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedResult(null)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '20px' }}></button>
                        </div>

                        <div style={{ padding: '16px', borderRadius: '14px', background: selectedResult.passed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${selectedResult.passed ? '#22c55e' : '#ef4444'}`, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: selectedResult.passed ? '#22c55e' : '#ef4444' }}>RESULT STATUS</div>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: colors.text }}>{selectedResult.passed ? 'PASSED ' : 'FAILED '}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: colors.text }}>{selectedResult.score} / {selectedResult.totalMarks} ({selectedResult.percentage}%)</div>
                                <div style={{ fontSize: '12px', color: colors.textMuted }}>Time Spent: {selectedResult.timeTaken}</div>
                            </div>
                        </div>

                        <button style={{ ...s.btnPrimary, width: '100%', justifyContent: 'center' }} onClick={() => setSelectedResult(null)}>
                            Close Breakdown
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
