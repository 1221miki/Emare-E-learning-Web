import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import {
    courseService,
    quizService,
    gradebookService,
    reviewService,
    userService,
    enrollmentService,
    assignmentService,
    uploadService,
    notificationService,
    liveSessionService
} from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import InstructorOverview from '../../components/instructor/InstructorOverview';
import StudentManagement from '../../components/instructor/StudentManagement';
import AssignmentManagement from '../../components/instructor/assignments/AssignmentManagement';
import InstructorSettings from '../../components/instructor/InstructorSettings';
import QuizManagement from '../../components/instructor/QuizManagement';
import { LayoutDashboard, BookOpen, NotebookPen, ClipboardList, FileQuestion, Video, Users, GraduationCap, Award, BarChart3, MessagesSquare, MessageCircle, Megaphone, CalendarDays, Star, Settings, Upload, UploadCloud, FilePen, FileText, Archive, PlusCircle, AlertTriangle, X, Link2, Trash2, ArrowUp, ArrowDown, Edit3, PauseCircle } from 'lucide-react';


export default function InstructorDashboard() {
    const { user, logout, isSuspended } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const s = {
        // Layout
        page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', sans-serif", background: colors.bg },
        sidebar: { width: '260px', background: theme === 'dark' ? 'rgba(15,20,34,0.7)' : 'rgba(226,232,240,0.8)', backdropFilter: 'blur(12px)', borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', height: '100vh', zIndex: 10 },
        logoBox: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px', paddingLeft: '8px' },
        logo: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '18px' },
        logoText: { color: colors.text, fontWeight: '700', fontSize: '16px' },
        nav: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto' },
        navItem: { textAlign: 'left', background: 'transparent', border: 'none', color: colors.textMuted, padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', outline: 'none' },
        catalogBtn: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
        logoutBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },

        // Main
        main: { marginLeft: '260px', flex: 1, padding: '40px', overflowY: 'auto', background: colors.bg },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' },
        greeting: { color: colors.text, fontSize: '26px', fontWeight: '800', margin: 0 },
        subGreeting: { color: colors.textMuted, fontSize: '14px', margin: '4px 0 0' },
        avatar: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '20px' },
        loadingBox: { color: colors.textMuted, fontSize: '16px', textAlign: 'center', padding: '100px 0' },

        // Tabs
        tabHeader: { marginBottom: '28px' },
        tabTitle: { color: colors.text, fontSize: '22px', fontWeight: '800', margin: 0 },
        tabSubtitle: { color: colors.textMuted, fontSize: '14px', margin: '4px 0 0' },

        // Stats
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' },
        statCard: { background: colors.bgCard, backdropFilter: 'blur(10px)', borderRadius: '14px', padding: '22px', border: `1px solid ${colors.border}` },
        statValue: { display: 'block', fontSize: '32px', fontWeight: '800', color: colors.text },
        statLabel: { color: colors.textMuted, fontSize: '12px', fontWeight: '500', marginTop: '4px', display: 'block' },

        // Cards
        panelCard: { background: colors.bgCard, backdropFilter: 'blur(10px)', borderRadius: '14px', padding: '28px', border: `1px solid ${colors.border}`, marginBottom: '24px', cursor: 'default', transition: 'border-color 0.2s' },
        panelTitle: { color: colors.text, fontSize: '16px', fontWeight: '700', margin: '0 0 20px' },
        recentItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colors.border}` },
        courseRow: { background: colors.bgCard, backdropFilter: 'blur(10px)', borderRadius: '14px', padding: '24px', border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', gap: '20px' },
        dashboardGrid: { display: 'grid', gap: '24px' },
        heroCard: { background: colors.bgCard, borderRadius: '20px', padding: '32px', border: `1px solid ${colors.border}`, boxShadow: `0 28px 80px ${theme === 'dark' ? 'rgba(15,23,42,0.12)' : 'rgba(0,0,0,0.06)'}` },
        heroTitle: { color: colors.text, fontSize: '30px', fontWeight: '800', margin: '0 0 10px' },
        heroSubtitle: { color: colors.textMuted, fontSize: '15px', margin: 0, lineHeight: 1.75 },
        heroActions: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px' },
        chartCard: { background: colors.bgCard, borderRadius: '20px', padding: '24px', border: `1px solid ${colors.border}`, minHeight: '320px' },
        miniCard: { background: colors.bgCard, borderRadius: '18px', padding: '18px', border: `1px solid ${colors.border}` },
        cardLabel: { color: colors.textMuted, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' },
        cardValue: { color: colors.text, fontSize: '28px', fontWeight: '800', marginTop: '8px' },
        sectionRow: { display: 'grid', gap: '24px', marginTop: '24px' },
        subtleText: { color: colors.textMuted, fontSize: '13px', lineHeight: 1.7 },
        badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', display: 'inline-block' },
        miniStat: { background: colors.bgDarker, padding: '14px 16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '2px' },

        // Empty
        emptyBox: { padding: '48px', textAlign: 'center', background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}` },
        emptyText: { color: colors.textMuted, fontSize: '14px', margin: 0 },

        // Table
        tableCard: { background: colors.bgCard, backdropFilter: 'blur(10px)', borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden' },
        table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
        thRow: { background: colors.bgDarkest },
        th: { padding: '14px 20px', color: colors.textMuted, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
        tr: { borderBottom: `1px solid ${colors.border}` },
        td: { padding: '14px 20px', color: colors.text, fontSize: '14px' },

        // Buttons
        primaryBtn: { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 22px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.2s' },
        actionBtn: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', transition: 'background 0.2s' },
        actionBtnAlt: { background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', transition: 'background 0.2s' },
        dangerBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' },
        textBtn: { background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: '600', fontSize: '13px', textDecoration: 'underline' },

        // Forms
        formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
        formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
        label: { color: colors.textMuted, fontSize: '12px', fontWeight: '600' },
        input: { background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '11px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' },
        select: { background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '11px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' },
        successAlert: { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '600' },

        // Modals
        backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
        modal: { background: colors.bgCard, backdropFilter: 'blur(16px)', border: `1px solid ${colors.border}`, borderRadius: '18px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflow: 'auto', boxShadow: `0 25px 60px ${theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'}` },
        modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' },
        modalTitle: { color: colors.text, fontSize: '18px', fontWeight: '700', margin: 0 },
        closeBtn: { background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        modalBody: { padding: '20px 24px 24px' }
    };
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');

    // Data States
    const [courses, setCourses] = useState([]);
    const [analytics, setAnalytics] = useState({});
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [courseTab, setCourseTab] = useState('all');
    const [courseSearch, setCourseSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterLevel, setFilterLevel] = useState('all');
    const [filterLanguage, setFilterLanguage] = useState('all');
    const [filterPrice, setFilterPrice] = useState('all');
    const [submissions, setSubmissions] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [liveSessions, setLiveSessions] = useState([]);

    // Modal & Form States
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [isEditCourseModal, setIsEditCourseModal] = useState(false);
    const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState(false);
    const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);

    const [newChapterTitle, setNewChapterTitle] = useState('');
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [newLessonContent, setNewLessonContent] = useState('');
    const [lessonChapterIndex, setLessonChapterIndex] = useState(0);

    const [courseForm, setCourseForm] = useState({
        courseTitle: '', subtitle: '', descriptionText: '', technicalCategory: 'Web Coding',
        estimatedDurationHours: 1, level: 'Beginner', language: 'English', price: 0,
        learningObjectives: '', requirements: '', tags: ''
    });
    const [quizForm, setQuizForm] = useState({
        quizTitle: '', allottedDurationMinutes: 15, passingScoreThreshold: 60, aiTutorEnabled: true,
        questions: [{ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]
    });
    const [gradeForm, setGradeForm] = useState({ numericalScoreEarned: 0, instructorReviewNotes: '' });
    const [selectedSubmission, setSelectedSubmission] = useState(null);

    const [assignmentForm, setAssignmentForm] = useState({
        title: '',
        description: '',
        instructions: '',
        dueDate: '',
        dueTime: '23:59',
        maxScore: 100,
        attachment: null,
        attachmentPreview: ''
    });
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
    const [assignmentMsg, setAssignmentMsg] = useState('');

    // Learning Content States
    const [isContentModalOpen, setIsContentModalOpen] = useState(false);
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);
    const [activeLessonIndex, setActiveLessonIndex] = useState(0);
    const [contentUploadState, setContentUploadState] = useState({ file: null, type: '', uploading: false, message: '' });
    const [lessonNotes, setLessonNotes] = useState('');

    // Profile States
    const [profileForm, setProfileForm] = useState({
        fullName: user?.fullName || '', biography: '', contactPhone: '',
        qualifications: '', workExperience: '', teachingLanguages: '',
        socialMediaLinks: { linkedin: '', twitter: '', website: '', youtube: '' }
    });
    const [profileMsg, setProfileMsg] = useState('');

    // Settings States
    const [settingsForm, setSettingsForm] = useState({
        notifyEnrollments: true, notifyReviews: true, notifyAssignments: true, notifyPayments: true
    });

    // Thumbnail Upload States
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const [thumbnailUploadError, setThumbnailUploadError] = useState('');
    const [thumbnailPreview, setThumbnailPreview] = useState('');
    const [selectedThumbnailFile, setSelectedThumbnailFile] = useState(null);
    const [isContentExpanded, setIsContentExpanded] = useState(false);

    // ── Data Fetching ──────────────────────────────────────────
    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [coursesRes, analyticsRes, notificationsRes] = await Promise.all([
                courseService.getInstructorCourses(),
                courseService.getInstructorAnalytics(),
                notificationService.getAll()
            ]);

            const instructorCourses = coursesRes.data.data || [];
            setCourses(instructorCourses);
            setAnalytics(analyticsRes.data.data || {});
            setNotifications(notificationsRes.data.data || []);

            const defaultCourse = instructorCourses[0] || null;
            setSelectedCourse(defaultCourse);

            if (defaultCourse) {
                const sessionsRes = await liveSessionService.getCourseSessions(defaultCourse._id).catch(() => ({ data: { data: [] } }));
                setLiveSessions(sessionsRes.data.data || []);
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        }
    };

    // When grading tab or selected course changes, fetch submissions
    useEffect(() => {
        if (activeTab === 'grading' && selectedCourse) {
            gradebookService.getSubmissionsForCourse(selectedCourse._id)
                .then(res => setSubmissions(res.data.data || []))
                .catch(console.error);
        }
    }, [activeTab, selectedCourse]);

    // When reviews tab or selected course changes, fetch reviews
    useEffect(() => {
        if (activeTab === 'reviews' && selectedCourse) {
            reviewService.getCourseReviews(selectedCourse._id)
                .then(res => setReviews(res.data.data || []))
                .catch(console.error);
        }
    }, [activeTab, selectedCourse]);

    // Populate edit form when modal opens with selected course data
    useEffect(() => {
        if (isEditCourseModal && selectedCourse) {
            setCourseForm({
                courseTitle: selectedCourse.courseTitle || '',
                subtitle: selectedCourse.subtitle || '',
                descriptionText: selectedCourse.descriptionText || '',
                technicalCategory: selectedCourse.technicalCategory || 'Web Coding',
                level: selectedCourse.level || 'Beginner',
                language: selectedCourse.language || 'English',
                estimatedDurationHours: selectedCourse.estimatedDurationHours || 1,
                price: selectedCourse.price || 0,
                discountPrice: selectedCourse.discountPrice || null,
                thumbnailUrl: selectedCourse.thumbnailUrl || '',
                learningObjectives: (selectedCourse.learningObjectives || []).join('\n'),
                requirements: (selectedCourse.requirements || []).join('\n'),
                tags: (selectedCourse.tags || []).join(', ')
            });
            setThumbnailPreview('');
            setSelectedThumbnailFile(null);
            setThumbnailUploadError('');
        }
    }, [isEditCourseModal, selectedCourse]);

    const handleLogout = async () => { await logout(); navigate('/'); };

    // ── Course Actions ─────────────────────────────────────────
    const handleContentUpload = async () => {
        if (!contentUploadState.type || !contentUploadState.file) {
            setContentUploadState({ ...contentUploadState, message: 'Please select a file and upload type.' });
            return;
        }
        const formData = new FormData();
        formData.append('file', contentUploadState.file);
        formData.append('contentType', contentUploadState.type);
        setContentUploadState({ ...contentUploadState, uploading: true, message: '' });
        try {
            const res = await uploadService.uploadFile(formData);
            setContentUploadState({ file: null, type: '', uploading: false, message: 'Upload successful.' });
            console.log('Content uploaded', res.data.data);
        } catch (err) {
            setContentUploadState({ ...contentUploadState, uploading: false, message: 'Upload failed. Please try again.' });
            console.error('Content upload error', err);
        }
    };

    const handleSaveLessonNotes = () => {
        if (!lessonNotes.trim()) {
            alert('Enter lesson notes before saving.');
            return;
        }
        alert('Lesson notes saved locally. Implement backend storage to persist this content.');
    };

    const fetchCourseAssignments = async (courseId) => {
        if (!courseId) return;
        try {
            const res = await assignmentService.getByCourse(courseId);
            setAssignments(res.data.data || []);
        } catch (err) {
            console.error('Failed to load assignments', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'content' && selectedCourse) {
            fetchCourseAssignments(selectedCourse._id);
        }
    }, [activeTab, selectedCourse]);

    const handleAttachmentChange = (e) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            setAssignmentForm(prev => ({
                ...prev,
                attachment: file,
                attachmentPreview: file.name
            }));
        } else {
            setAssignmentForm(prev => ({ ...prev, attachment: null, attachmentPreview: '' }));
        }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        if (!selectedCourse) {
            setAssignmentMsg('Please select a course before creating an assignment.');
            return;
        }

        try {
            const dueAt = assignmentForm.dueDate ? new Date(`${assignmentForm.dueDate}T${assignmentForm.dueTime || '23:59'}:00`) : null;
            const payload = {
                courseRef: selectedCourse._id,
                title: assignmentForm.title,
                description: assignmentForm.description,
                instructions: assignmentForm.instructions,
                dueDate: dueAt,
                maxScore: Number(assignmentForm.maxScore),
                allowLate: false,
                published: false
            };

            if (assignmentForm.attachment) {
                const fd = new FormData();
                fd.append('file', assignmentForm.attachment);
                const uploadRes = await uploadService.uploadFile(fd);
                if (uploadRes.data?.success) {
                    payload.attachments = [{
                        filename: assignmentForm.attachment.name,
                        url: uploadRes.data.data.url,
                        mimeType: assignmentForm.attachment.type,
                        size: assignmentForm.attachment.size
                    }];
                }
            }

            const res = await assignmentService.create(payload);
            setAssignments(prev => [res.data.data, ...prev]);
            setAssignmentForm({ title: '', description: '', instructions: '', dueDate: '', dueTime: '23:59', maxScore: 100, attachment: null, attachmentPreview: '' });
            setAssignmentMsg('Assignment draft created successfully. You can publish it from the list.');
        } catch (err) {
            setAssignmentMsg(err.response?.data?.message || 'Failed to create assignment.');
            console.error('Assignment creation error', err);
        }
    };

    const handlePublishAssignment = async (assignment) => {
        try {
            const res = await assignmentService.update(assignment._id, { published: !assignment.published });
            setAssignments(prev => prev.map(a => a._id === assignment._id ? res.data.data : a));
            setAssignmentMsg(assignment.published ? 'Assignment unpublished.' : 'Assignment published.');
        } catch (err) {
            setAssignmentMsg(err.response?.data?.message || 'Failed to update assignment state.');
            console.error('Assignment publish error', err);
        }
    };

    const handleViewAssignmentSubmissions = async (assignment) => {
        try {
            const res = await assignmentService.getSubmissions(assignment._id);
            setSelectedAssignment(assignment);
            setAssignmentSubmissions(res.data.data || []);
        } catch (err) {
            console.error('Failed to load assignment submissions', err);
        }
    };

    const handleResetAssignmentForm = () => {
        setAssignmentForm({ title: '', description: '', instructions: '', dueDate: '', maxScore: 100, allowLate: false });
        setAssignmentMsg('');
    };

    const handleCreateCourse = () => {
        navigate('/instructor/courses/new');
    };

    const handleAddChapter = async (e) => {
        e?.preventDefault?.();
        if (!selectedCourse) return alert('Select a course first');
        if (!newChapterTitle.trim()) return alert('Enter chapter title');
        try {
            const tree = Array.isArray(selectedCourse.curriculumTree) ? [...selectedCourse.curriculumTree] : [];
            tree.push({ title: newChapterTitle.trim(), lessons: [] });
            const updated = { ...selectedCourse, curriculumTree: tree };
            const res = await courseService.update(selectedCourse._id, updated);
            setSelectedCourse(res.data.data);
            setCourses(prev => prev.map(c => c._id === res.data.data._id ? res.data.data : c));
            setNewChapterTitle('');
            setIsAddChapterModalOpen(false);
        } catch (err) { alert(err.response?.data?.message || 'Failed to add chapter'); }
    };

    const handleAddLesson = async (e) => {
        e?.preventDefault?.();
        if (!selectedCourse) return alert('Select a course first');
        if (!newLessonTitle.trim()) return alert('Enter lesson title');
        try {
            const tree = Array.isArray(selectedCourse.curriculumTree) ? [...selectedCourse.curriculumTree] : [];
            const idx = Number(lessonChapterIndex) || 0;
            if (!tree[idx]) return alert('Invalid chapter selected');
            const lessons = Array.isArray(tree[idx].lessons) ? [...tree[idx].lessons] : [];
            lessons.push({ title: newLessonTitle.trim(), content: newLessonContent });
            tree[idx] = { ...tree[idx], lessons };
            const updated = { ...selectedCourse, curriculumTree: tree };
            const res = await courseService.update(selectedCourse._id, updated);
            setSelectedCourse(res.data.data);
            setCourses(prev => prev.map(c => c._id === res.data.data._id ? res.data.data : c));
            setNewLessonTitle(''); setNewLessonContent(''); setIsAddLessonModalOpen(false);
        } catch (err) { alert(err.response?.data?.message || 'Failed to add lesson'); }
    };

    const handleSaveCurriculumChanges = async () => {
        if (!selectedCourse) return alert('No course selected');
        try {
            const payload = { ...selectedCourse };
            const res = await courseService.update(selectedCourse._id, payload);
            setSelectedCourse(res.data.data);
            setCourses(prev => prev.map(c => c._id === res.data.data._id ? res.data.data : c));
            alert('Course curriculum saved');
        } catch (err) {
            console.error('Save curriculum error', err);
            alert(err.response?.data?.message || 'Failed to save curriculum');
        }
    };

    const moveChapter = (index, dir) => {
        if (!selectedCourse || !Array.isArray(selectedCourse.curriculumTree)) return;
        const tree = [...selectedCourse.curriculumTree];
        const to = index + dir;
        if (to < 0 || to >= tree.length) return;
        const item = tree.splice(index, 1)[0];
        tree.splice(to, 0, item);
        setSelectedCourse(prev => ({ ...prev, curriculumTree: tree }));
    };

    const moveLesson = (chapterIdx, lessonIdx, dir) => {
        if (!selectedCourse || !Array.isArray(selectedCourse.curriculumTree)) return;
        const tree = [...selectedCourse.curriculumTree];
        const lessons = [...(tree[chapterIdx].lessons || [])];
        const to = lessonIdx + dir;
        if (to < 0 || to >= lessons.length) return;
        const item = lessons.splice(lessonIdx, 1)[0];
        lessons.splice(to, 0, item);
        tree[chapterIdx] = { ...tree[chapterIdx], lessons };
        setSelectedCourse(prev => ({ ...prev, curriculumTree: tree }));
    };

    const handleRenameLesson = async (chapterIdx, lessonIdx) => {
        const current = selectedCourse?.curriculumTree?.[chapterIdx]?.lessons?.[lessonIdx];
        const title = prompt('Lesson title', current?.title || `Lesson ${lessonIdx + 1}`);
        if (!title) return;
        const tree = [...selectedCourse.curriculumTree];
        const lessons = [...(tree[chapterIdx].lessons || [])];
        lessons[lessonIdx] = { ...lessons[lessonIdx], title };
        tree[chapterIdx] = { ...tree[chapterIdx], lessons };
        try {
            const res = await courseService.update(selectedCourse._id, { ...selectedCourse, curriculumTree: tree });
            setSelectedCourse(res.data.data);
            setCourses(prev => prev.map(c => c._id === res.data.data._id ? res.data.data : c));
        } catch (err) { alert('Failed to rename lesson'); }
    };

    const handleDeleteLesson = async (chapterIdx, lessonIdx) => {
        if (!window.confirm('Delete this lesson?')) return;
        const tree = [...selectedCourse.curriculumTree];
        const lessons = [...(tree[chapterIdx].lessons || [])];
        lessons.splice(lessonIdx, 1);
        tree[chapterIdx] = { ...tree[chapterIdx], lessons };
        try {
            const res = await courseService.update(selectedCourse._id, { ...selectedCourse, curriculumTree: tree });
            setSelectedCourse(res.data.data);
            setCourses(prev => prev.map(c => c._id === res.data.data._id ? res.data.data : c));
        } catch (err) { alert('Failed to delete lesson'); }
    };

    const handleUpdateSelectedCourseField = (field, value) => {
        setSelectedCourse(prev => prev ? ({ ...prev, [field]: value }) : prev);
    };

    // ── Thumbnail Management ───────────────────────────────────
    const handleThumbnailFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setThumbnailUploadError('Please upload a JPG, PNG, or WebP image');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setThumbnailUploadError('Image size must be less than 5MB');
            return;
        }

        setSelectedThumbnailFile(file);
        setThumbnailUploadError('');

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setThumbnailPreview(e.target?.result || '');
        };
        reader.readAsDataURL(file);
    };

    const handleUploadThumbnail = async () => {
        if (!selectedThumbnailFile || !selectedCourse) return;

        setIsUploadingThumbnail(true);
        setThumbnailUploadError('');

        try {
            const formData = new FormData();
            formData.append('thumbnail', selectedThumbnailFile);

            console.log('Uploading thumbnail for course:', selectedCourse._id);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || '/api'}/courses/${selectedCourse._id}/thumbnail`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                }
            );

            if (!response.ok) {
                const error = await response.json();
                console.error('Upload failed:', error);
                throw new Error(error.message || 'Upload failed');
            }

            const result = await response.json();
            console.log('Upload successful:', result.data.thumbnailUrl);
            
            // Update local state and course form
            setSelectedCourse(result.data);
            setCourseForm(prev => ({ ...prev, thumbnailUrl: result.data.thumbnailUrl }));
            setCourses(prev => prev.map(c => c._id === selectedCourse._id ? result.data : c));
            
            setSelectedThumbnailFile(null);
            setThumbnailPreview('');
            
            // Show success message
            alert('Thumbnail uploaded successfully! The image will be visible on the course catalog after refresh.');
        } catch (err) {
            console.error('Thumbnail upload error:', err);
            setThumbnailUploadError(err.message || 'Failed to upload thumbnail');
            alert('Error: ' + (err.message || 'Failed to upload thumbnail'));
        } finally {
            setIsUploadingThumbnail(false);
        }
    };

    const handleRemoveThumbnail = async () => {
        if (!selectedCourse) return;
        try {
            const res = await courseService.update(selectedCourse._id, { thumbnailUrl: null });
            setSelectedCourse(res.data.data);
            setCourseForm(prev => ({ ...prev, thumbnailUrl: null }));
            setCourses(prev => prev.map(c => c._id === selectedCourse._id ? res.data.data : c));
        } catch (err) {
            alert('Failed to remove thumbnail');
        }
    };

    const handleEditCourse = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...courseForm,
                learningObjectives: courseForm.learningObjectives.split('\n').filter(Boolean),
                requirements: courseForm.requirements.split('\n').filter(Boolean),
                tags: courseForm.tags.split(',').map(t => t.trim()).filter(Boolean)
            };
            const res = await courseService.update(selectedCourse._id, payload);
            setCourses(prev => prev.map(c => c._id === selectedCourse._id ? res.data.data : c));
            setIsEditCourseModal(false);
        } catch (err) { alert(err.response?.data?.message || 'Failed to update course'); }
    };

    const handleDeleteCourse = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this course?')) return;
        try {
            await courseService.delete(id);
            setCourses(prev => prev.filter(c => c._id !== id));
        } catch (err) { alert(err.response?.data?.message || 'Failed to delete course'); }
    };

    const handleArchiveCourse = async (id) => {
        try {
            await courseService.archive(id);
            setCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Archived' } : c));
        } catch (err) { alert(err.response?.data?.message || 'Failed to archive'); }
    };

    const handleUnpublishCourse = async (id) => {
        try {
            await courseService.unpublish(id);
            setCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Draft' } : c));
        } catch (err) { alert(err.response?.data?.message || 'Failed to unpublish'); }
    };

    const handleDuplicateCourse = async (id) => {
        try {
            const res = await courseService.duplicate(id);
            setCourses(prev => [res.data.data, ...prev]);
        } catch (err) { alert(err.response?.data?.message || 'Failed to duplicate'); }
    };

    const handleSubmitForReview = async (id) => {
        try {
            await courseService.submitForReview(id);
            setCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Pending Review' } : c));
        } catch (err) { alert(err.response?.data?.message || 'Submission failed'); }
    };

    // ── Quiz Actions ───────────────────────────────────────────
    const addQuestion = () => {
        setQuizForm(prev => ({
            ...prev,
            questions: [...prev.questions, { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]
        }));
    };

    const updateQuestion = (idx, field, value) => {
        setQuizForm(prev => {
            const questions = [...prev.questions];
            questions[idx] = { ...questions[idx], [field]: value };
            return { ...prev, questions };
        });
    };

    const updateOption = (qIdx, oIdx, value) => {
        setQuizForm(prev => {
            const questions = [...prev.questions];
            const options = [...questions[qIdx].options];
            options[oIdx] = value;
            questions[qIdx] = { ...questions[qIdx], options };
            return { ...prev, questions };
        });
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                quizTitle: quizForm.quizTitle,
                courseRef: selectedCourse._id,
                allottedDurationMinutes: quizForm.allottedDurationMinutes,
                passingScoreThreshold: quizForm.passingScoreThreshold,
                submissionDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                questionArray: quizForm.questions,
                aiTutorEnabled: quizForm.aiTutorEnabled !== false
            };
            await quizService.create(payload);
            alert('Quiz created successfully!');
            setIsQuizModalOpen(false);
            setQuizForm({ quizTitle: '', allottedDurationMinutes: 15, passingScoreThreshold: 60, aiTutorEnabled: true, questions: [{ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }] });
        } catch (err) { alert(err.response?.data?.message || 'Failed to create quiz'); }
    };

    // ── Grading Actions ────────────────────────────────────────
    const handleGradeSubmission = async (e) => {
        e.preventDefault();
        try {
            await gradebookService.gradeSubmission(selectedSubmission._id, gradeForm);
            setSubmissions(prev => prev.map(s => s._id === selectedSubmission._id
                ? { ...s, numericalScoreEarned: gradeForm.numericalScoreEarned, isGraded: true } : s));
            setIsGradeModalOpen(false);
        } catch (err) { alert(err.response?.data?.message || 'Failed to grade'); }
    };

    // ── Profile Actions ────────────────────────────────────────
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (profileForm.contactPhone && !/^(09|07)\d{8}$/.test(profileForm.contactPhone)) {
            setProfileMsg('Phone number must start with 09 or 07 and be exactly 10 digits (e.g. 0912345678).');
            return;
        }
        setProfileMsg('');
        try {
            const payload = {
                ...profileForm,
                qualifications: profileForm.qualifications.split('\n').filter(Boolean),
                workExperience: profileForm.workExperience.split('\n').filter(Boolean),
                teachingLanguages: profileForm.teachingLanguages.split(',').map(l => l.trim()).filter(Boolean)
            };
            await userService.updateInstructorProfile(payload);
            setProfileMsg('Profile updated successfully!');
        } catch (err) { alert(err.response?.data?.message || 'Failed to update profile'); }
    };

    // ── Review Reply ───────────────────────────────────────────
    const handleReviewReply = async (reviewId, reply) => {
        try {
            // Store optimistically — server endpoint may vary
            setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, instructorReply: reply } : r));
        } catch (err) { alert('Failed to reply'); }
    };

    // ── Stat helpers ───────────────────────────────────────────
    const completedCoursesCount = courses.filter(c => c.publicationState === 'Active').length;

    // ═══════════════════════════════════════════════════════════
    // ── TAB RENDERERS ─────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    // ── 1. Overview Tab ────────────────────────────────────────
    const renderOverview = () => (
        <InstructorOverview
            user={user}
            analytics={analytics}
            courses={courses}
            onCreateCourse={handleCreateCourse}
            onManageCourses={() => setActiveTab('courses')}
            onViewAnalytics={() => setActiveTab('analytics')}
            onManageReviews={() => setActiveTab('reviews')}
            onManageStudents={() => setActiveTab('students')}
        />
    );
    // ── 2. Profile Tab ─────────────────────────────────────────
    const renderProfile = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Profile Management</h2>
                <p style={s.tabSubtitle}>Manage your professional profile, qualifications, and social links</p>
            </div>
            <div style={s.panelCard}>
                {profileMsg && <div style={s.successAlert}>{profileMsg}</div>}
                <form onSubmit={handleProfileUpdate} style={s.formGrid}>
                    <div style={s.formGroup}>
                        <label style={s.label}>Full Name</label>
                        <input style={s.input} value={profileForm.fullName} onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })} required />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Phone Number</label>
                        <input
                            style={{ ...s.input, borderColor: profileForm.contactPhone && !/^(09|07)\d{8}$/.test(profileForm.contactPhone) ? '#ef4444' : undefined }}
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            value={profileForm.contactPhone}
                            onChange={e => setProfileForm({ ...profileForm, contactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            placeholder="0912345678"
                        />
                        {profileForm.contactPhone && !/^(09|07)\d{8}$/.test(profileForm.contactPhone) && (
                            <span style={{ color: '#ef4444', fontSize: '12px' }}>Phone number must start with 09 or 07 and be exactly 10 digits (e.g. 0912345678).</span>
                        )}
                    </div>
                    <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}>
                        <label style={s.label}>Biography</label>
                        <textarea style={{ ...s.input, minHeight: '100px' }} value={profileForm.biography} onChange={e => setProfileForm({ ...profileForm, biography: e.target.value })} placeholder="Tell students about yourself..." />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Qualifications (one per line)</label>
                        <textarea style={{ ...s.input, minHeight: '80px' }} value={profileForm.qualifications} onChange={e => setProfileForm({ ...profileForm, qualifications: e.target.value })} placeholder="BSc in Computer Science&#10;Certified AWS Architect" />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Work Experience (one per line)</label>
                        <textarea style={{ ...s.input, minHeight: '80px' }} value={profileForm.workExperience} onChange={e => setProfileForm({ ...profileForm, workExperience: e.target.value })} placeholder="5 years at Google&#10;3 years at Ethio Telecom" />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Teaching Languages (comma separated)</label>
                        <input style={s.input} value={profileForm.teachingLanguages} onChange={e => setProfileForm({ ...profileForm, teachingLanguages: e.target.value })} placeholder="English, Amharic" />
                    </div>

                    {/* Social Links */}
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(30,41,59,0.5)', paddingTop: '20px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Link2 size={18} aria-hidden="true" />
                            <h4 style={{ color: colors.text, margin: 0, fontSize: '15px' }}>Social Media Links</h4>
                        </div>
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>LinkedIn</label>
                        <input style={s.input} value={profileForm.socialMediaLinks.linkedin} onChange={e => setProfileForm({ ...profileForm, socialMediaLinks: { ...profileForm.socialMediaLinks, linkedin: e.target.value } })} placeholder="https://linkedin.com/in/..." />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Twitter / X</label>
                        <input style={s.input} value={profileForm.socialMediaLinks.twitter} onChange={e => setProfileForm({ ...profileForm, socialMediaLinks: { ...profileForm.socialMediaLinks, twitter: e.target.value } })} placeholder="https://x.com/..." />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>Website</label>
                        <input style={s.input} value={profileForm.socialMediaLinks.website} onChange={e => setProfileForm({ ...profileForm, socialMediaLinks: { ...profileForm.socialMediaLinks, website: e.target.value } })} placeholder="https://yoursite.com" />
                    </div>
                    <div style={s.formGroup}>
                        <label style={s.label}>YouTube</label>
                        <input style={s.input} value={profileForm.socialMediaLinks.youtube} onChange={e => setProfileForm({ ...profileForm, socialMediaLinks: { ...profileForm.socialMediaLinks, youtube: e.target.value } })} placeholder="https://youtube.com/@..." />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <button type="submit" style={s.primaryBtn}>Save Profile Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );

    // ── 3. Course Management Tab ───────────────────────────────
    const renderCourses = () => {
        const counts = {
            total: courses.length,
            published: courses.filter(c => ['Active', 'Published'].includes(c.publicationState)).length,
            draft: courses.filter(c => c.publicationState === 'Draft').length,
            pending: courses.filter(c => ['Pending Review', 'Under Evaluation', 'Pending'].includes(c.publicationState)).length,
            archived: courses.filter(c => c.publicationState === 'Archived').length
        };

        const courseStatusTabs = [
            { key: 'all', label: 'All Courses', count: counts.total },
            { key: 'published', label: 'Published', count: counts.published },
            { key: 'draft', label: 'Drafts', count: counts.draft },
            { key: 'pending', label: 'Pending Approval', count: counts.pending },
            { key: 'archived', label: 'Archived', count: counts.archived }
        ];

        const filteredCourses = courses.filter(c => {
            const state = c.publicationState || 'Draft';
            if (courseTab === 'published' && !['Active', 'Published'].includes(state)) return false;
            if (courseTab === 'draft' && state !== 'Draft') return false;
            if (courseTab === 'pending' && !['Pending Review', 'Under Evaluation', 'Pending'].includes(state)) return false;
            if (courseTab === 'archived' && state !== 'Archived') return false;

            if (courseSearch && !c.courseTitle?.toLowerCase().includes(courseSearch.toLowerCase())) return false;
            if (filterCategory !== 'all' && c.technicalCategory !== filterCategory) return false;
            if (filterLevel !== 'all' && c.level !== filterLevel) return false;
            if (filterLanguage !== 'all' && c.language !== filterLanguage) return false;
            if (filterPrice !== 'all') {
                const price = Number(c.price || 0);
                if (filterPrice === 'free' && price > 0) return false;
                if (filterPrice === 'paid' && price <= 0) return false;
            }
            return true;
        });

        const statusLabel = (state) => {
            if (['Active', 'Published'].includes(state)) return 'Published';
            if (state === 'Draft') return 'Draft';
            if (['Pending Review', 'Under Evaluation', 'Pending'].includes(state)) return 'Pending Review';
            if (state === 'Archived') return 'Archived';
            return state || 'Draft';
        };

        return (
            <div>
                <div style={{ ...s.tabHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 360px' }}>
                        <h2 style={s.tabTitle}>My Courses</h2>
                        <p style={s.tabSubtitle}>Manage and organize your complete course library.</p>
                    </div>
                    <button
                        onClick={() => {
                            if (isSuspended) return;
                            handleCreateCourse();
                        }}
                        style={{ ...s.primaryBtn, opacity: isSuspended ? 0.5 : 1, cursor: isSuspended ? 'not-allowed' : 'pointer' }}
                        disabled={isSuspended}
                    >
                        + Create New Course
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {[
                        { label: 'Total Courses', value: counts.total, color: '#3b82f6' },
                        { label: 'Published', value: counts.published, color: '#10b981' },
                        { label: 'Draft', value: counts.draft, color: '#f59e0b' },
                        { label: 'Pending Approval', value: counts.pending, color: '#6366f1' },
                        { label: 'Archived', value: counts.archived, color: '#64748b' }
                    ].map(stat => (
                        <div key={stat.label} style={{ ...s.panelCard, padding: '22px 24px', borderTop: `3px solid ${stat.color}` }}>
                            <span style={{ ...s.statValue, color: stat.color, fontSize: '28px' }}>{stat.value}</span>
                            <span style={s.statLabel}>{stat.label}</span>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                    {courseStatusTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setCourseTab(tab.key)}
                            style={{
                                ...s.actionBtnAlt,
                                background: courseTab === tab.key ? 'rgba(59,130,246,0.18)' : 'transparent',
                                borderColor: courseTab === tab.key ? '#3b82f6' : 'rgba(51,65,85,0.6)',
                                color: courseTab === tab.key ? '#3b82f6' : colors.text
                            }}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, minmax(180px, 220px))', gap: '14px', marginBottom: '20px' }}>
                    <input
                        type="text"
                        placeholder="Search courses by title..."
                        value={courseSearch}
                        onChange={e => setCourseSearch(e.target.value)}
                        style={{ ...s.input, gridColumn: '1 / 2', minWidth: '220px' }}
                    />
                    <select style={s.select} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="all">All Categories</option>
                        {['Web Coding', 'Creative Media', 'Robotics Hardware', 'Network Engineering', 'Mobile Development', 'Data Science', 'Cybersecurity', 'Cloud Computing', 'Artificial Intelligence', 'Business & Management', 'Databases', 'DevOps & CI/CD', 'Graphic Design'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <select style={s.select} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                        <option value="all">All Levels</option>
                        {['Beginner', 'Intermediate', 'Advanced'].map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                    <select style={s.select} value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)}>
                        <option value="all">All Languages</option>
                        {['English', 'Amharic', 'Afaan Oromo', 'Tigrinya', 'Other'].map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                    <select style={s.select} value={filterPrice} onChange={e => setFilterPrice(e.target.value)}>
                        <option value="all">All Price Types</option>
                        <option value="free">Free</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>

                {filteredCourses.length === 0 ? (
                    <div style={s.emptyBox}>
                        <p style={s.emptyText}>No courses match the selected filters. Adjust search or filters to find courses.</p>
                    </div>
                ) : (
                    <div style={s.tableCard}>
                        <table style={s.table}>
                            <thead style={s.thRow}>
                                <tr>
                                    <th style={s.th}>Course</th>
                                    <th style={s.th}>Category</th>
                                    <th style={s.th}>Level</th>
                                    <th style={s.th}>Language</th>
                                    <th style={s.th}>Price</th>
                                    <th style={s.th}>Students</th>
                                    <th style={s.th}>Rating</th>
                                    <th style={s.th}>Status</th>
                                    <th style={s.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCourses.map(course => (
                                    <tr key={course._id} style={s.tr}>
                                        <td style={s.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700' }}>
                                                    {course.courseTitle?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <strong style={{ color: colors.text, display: 'block', fontSize: '14px' }}>{course.courseTitle}</strong>
                                                    <span style={{ color: colors.textMuted, fontSize: '12px' }}>{course.subtitle || 'No subtitle available'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={s.td}>{course.technicalCategory || '—'}</td>
                                        <td style={s.td}>{course.level || '—'}</td>
                                        <td style={s.td}>{course.language || 'English'}</td>
                                        <td style={s.td}>{course.price > 0 ? `${course.price} ETB` : 'Free'}</td>
                                        <td style={s.td}>{course.totalEnrollments || 0}</td>
                                        <td style={s.td}>{course.averageRating ? `${course.averageRating.toFixed(1)} ` : '—'}</td>
                                        <td style={s.td}><span style={{ ...s.badge, background: statusLabel(course.publicationState) === 'Published' ? 'rgba(16,185,129,0.15)' : statusLabel(course.publicationState) === 'Draft' ? 'rgba(245,158,11,0.15)' : statusLabel(course.publicationState) === 'Pending Review' ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.15)', color: statusLabel(course.publicationState) === 'Published' ? '#10b981' : statusLabel(course.publicationState) === 'Draft' ? '#f59e0b' : statusLabel(course.publicationState) === 'Pending Review' ? '#2563eb' : '#64748b' }}>{statusLabel(course.publicationState)}</span></td>
                                        <td style={s.td}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                <button onClick={() => { setSelectedCourse(course); setIsEditCourseModal(true); }} style={s.actionBtnAlt}>Edit Info</button>
                                                <button onClick={() => navigate('/instructor/courses/new')} style={s.actionBtn}>New/Wizard</button>
                                                <button onClick={() => navigate(`/courses/${course._id}`)} style={s.actionBtnAlt}>Preview</button>
                                                <button onClick={() => handleDeleteCourse(course._id)} style={s.dangerBtn}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // ── 4. Student Management Tab ──────────────────────────────
    const renderStudents = () => (
        <StudentManagement
            courses={courses}
            colors={colors}
            s={s}
        />
    );

    const renderAssignments = () => (
        <AssignmentManagement courses={courses} />
    );

    const renderQuizzes = () => (
        <QuizManagement courses={courses} colors={colors} s={s} />
    );

    const renderLiveClasses = () => {
        // Build upcoming events from live sessions
        const upcomingEvents = liveSessions
            .filter(ls => ls.startTime && new Date(ls.startTime) >= new Date())
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
            .slice(0, 8);

        return (
            <div>
                <div style={s.tabHeader}>
                    <h2 style={s.tabTitle}>Live Classes</h2>
                    <p style={s.tabSubtitle}>Schedule live sessions and interact with learners in real time.</p>
                </div>

                {/* Quick action */}
                <div style={{ ...s.panelCard, marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <p style={{ color: colors.text, fontWeight: '700', margin: '0 0 4px', fontSize: '15px' }}>Manage Live Sessions</p>
                        <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>Create, edit, and join live virtual classrooms with your students.</p>
                    </div>
                    <button onClick={() => navigate('/live-sessions')} style={s.primaryBtn}>
                        <Video size={16} aria-hidden="true" style={{ marginRight: '6px' }} /> Open Live Sessions
                    </button>
                </div>

                {/* ── Schedule Calendar ───────────────────────── */}
                <div style={s.panelCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CalendarDays size={18} color="#818cf8" aria-hidden="true" />
                            </div>
                            <div>
                                <h3 style={{ ...s.panelTitle, margin: 0 }}>Schedule Calendar</h3>
                                <p style={{ color: colors.textMuted, fontSize: '12px', margin: '2px 0 0' }}>Upcoming live classes and course events</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/live-sessions')} style={s.actionBtn}>
                            + Schedule New Session
                        </button>
                    </div>

                    {upcomingEvents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(9,13,22,0.35)', borderRadius: '12px', border: '1px dashed rgba(51,65,85,0.4)' }}>
                            <CalendarDays size={36} color="#1e293b" style={{ display: 'block', margin: '0 auto 12px' }} aria-hidden="true" />
                            <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 16px' }}>No upcoming live sessions scheduled.</p>
                            <button onClick={() => navigate('/live-sessions')} style={s.primaryBtn}>Schedule Your First Session</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {upcomingEvents.map((session, idx) => {
                                const sessionDate = new Date(session.startTime);
                                const isToday = sessionDate.toDateString() === new Date().toDateString();
                                const isTomorrow = sessionDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                                const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                const timeLabel = sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <div key={session._id || idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', background: 'rgba(9,13,22,0.45)', borderRadius: '12px', border: `1px solid ${isToday ? 'rgba(99,102,241,0.35)' : 'rgba(51,65,85,0.35)'}` }}>
                                        {/* Date block */}
                                        <div style={{ textAlign: 'center', minWidth: '56px', padding: '8px', background: isToday ? 'rgba(99,102,241,0.15)' : 'rgba(30,41,59,0.5)', borderRadius: '10px', border: `1px solid ${isToday ? 'rgba(99,102,241,0.3)' : 'rgba(51,65,85,0.3)'}` }}>
                                            <div style={{ color: isToday ? '#818cf8' : colors.textMuted, fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dayLabel.split(' ')[0]}</div>
                                            <div style={{ color: isToday ? '#818cf8' : colors.text, fontSize: '18px', fontWeight: '800', lineHeight: 1.2 }}>
                                                {isToday || isTomorrow ? sessionDate.getDate() : dayLabel.split(' ').slice(-1)[0]}
                                            </div>
                                        </div>
                                        {/* Info */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ color: colors.text, fontSize: '14px', fontWeight: '700', marginBottom: '3px' }}>{session.title || session.sessionTitle || 'Live Class'}</div>
                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                <span style={{ color: colors.textMuted, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Video size={11} aria-hidden="true" /> {timeLabel}
                                                </span>
                                                {session.durationMinutes && (
                                                    <span style={{ color: colors.textMuted, fontSize: '12px' }}>{session.durationMinutes} min</span>
                                                )}
                                                {session.courseRef?.courseTitle && (
                                                    <span style={{ color: '#818cf8', fontSize: '12px', fontWeight: '600' }}>{session.courseRef.courseTitle}</span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Badge + Join */}
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                                            {isToday && (
                                                <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '800' }}>
                                                    TODAY
                                                </span>
                                            )}
                                            {session.meetingLink && session.meetingLink !== '#' && (
                                                <button onClick={() => window.open(session.meetingLink, '_blank')} style={s.actionBtn}>
                                                    Join
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderMessages = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Messages</h2>
                <p style={s.tabSubtitle}>Message enrolled students and manage conversations.</p>
            </div>
            <div style={s.panelCard}>
                <p style={{ color: colors.textMuted }}>Go to the messaging center for full conversation support.</p>
                <button onClick={() => navigate('/messages')} style={s.primaryBtn}>Open Messaging</button>
            </div>
        </div>
    );

    const renderGrading = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Grading Portal</h2>
                <p style={s.tabSubtitle}>Review and grade student submissions</p>
            </div>
            <div style={{ marginBottom: '24px' }}>
                <label style={{ ...s.label, display: 'block', marginBottom: '8px' }}>Select Course:</label>
                <select style={s.select} value={selectedCourse?._id || ''} onChange={e => setSelectedCourse(courses.find(c => c._id === e.target.value))}>
                    {courses.map(c => <option key={c._id} value={c._id}>{c.courseTitle}</option>)}
                </select>
            </div>
            {submissions.length === 0 ? (
                <div style={s.emptyBox}><p style={s.emptyText}>No submissions for this course yet.</p></div>
            ) : (
                <div style={s.tableCard}>
                    <table style={s.table}>
                        <thead>
                            <tr style={s.thRow}>
                                <th style={s.th}>Student</th>
                                <th style={s.th}>Assessment</th>
                                <th style={s.th}>Date</th>
                                <th style={s.th}>Status / Score</th>
                                <th style={s.th}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map(sub => (
                                <tr key={sub._id} style={s.tr}>
                                    <td style={s.td}><strong>{sub.studentRef?.fullName}</strong></td>
                                    <td style={s.td}>{sub.assessmentRef?.quizTitle || 'Assignment'}</td>
                                    <td style={s.td}>{new Date(sub.submissionTimestamp).toLocaleDateString()}</td>
                                    <td style={s.td}>
                                        {sub.isGraded
                                            ? <span style={{ color: '#10b981', fontWeight: '700' }}>{sub.numericalScoreEarned}/100</span>
                                            : <span style={{ ...s.badge, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Needs Grading</span>}
                                    </td>
                                    <td style={s.td}>
                                        <button onClick={() => { setSelectedSubmission(sub); setGradeForm({ numericalScoreEarned: sub.numericalScoreEarned || 0, instructorReviewNotes: sub.instructorReviewNotes || '' }); setIsGradeModalOpen(true); }} style={{ ...s.textBtn, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                            {sub.isGraded
                                                ? <><Edit3 size={16} aria-hidden="true" /> Edit Grade</>
                                                : <><FileText size={16} aria-hidden="true" /> Grade Now</>}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // ── 6. Communication Tab ───────────────────────────────────
    const renderCommunication = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Communication Hub</h2>
                <p style={s.tabSubtitle}>Send announcements and communicate with your students</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                <div style={s.panelCard} onClick={() => navigate('/messages')} role="button">
                    <div style={{ marginBottom: '12px', color: '#60a5fa' }}><MessagesSquare size={32} /></div>
                    <h3 style={{ color: colors.text, margin: '0 0 6px', fontSize: '16px', fontWeight: '700' }}>Direct Messages</h3>
                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>Send private messages to enrolled students</p>
                </div>
                <div style={s.panelCard}>
                    <div style={{ marginBottom: '12px', color: '#f59e0b' }}><Megaphone size={32} /></div>
                    <h3 style={{ color: colors.text, margin: '0 0 6px', fontSize: '16px', fontWeight: '700' }}>Announcements</h3>
                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>Post announcements visible to all enrolled students</p>
                </div>
                <div style={s.panelCard}>
                    <div style={{ marginBottom: '12px', color: '#38bdf8' }}><MessageCircle size={32} /></div>
                    <h3 style={{ color: colors.text, margin: '0 0 6px', fontSize: '16px', fontWeight: '700' }}>Discussion Forum</h3>
                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>Reply to student questions and discussion posts</p>
                </div>
                <div style={s.panelCard} onClick={() => navigate('/live-sessions')} role="button">
                    <div style={{ marginBottom: '12px', color: '#a855f7' }}><Video size={32} /></div>
                    <h3 style={{ color: colors.text, margin: '0 0 6px', fontSize: '16px', fontWeight: '700' }}>Live Sessions</h3>
                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>Schedule and manage live Q&A sessions</p>
                </div>
            </div>
        </div>
    );

    // ── 7. Reviews Tab ─────────────────────────────────────────
    const renderReviews = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Course Reviews</h2>
                <p style={s.tabSubtitle}>View and respond to student feedback</p>
            </div>
            <div style={{ marginBottom: '24px' }}>
                <label style={{ ...s.label, display: 'block', marginBottom: '8px' }}>Select Course:</label>
                <select style={s.select} value={selectedCourse?._id || ''} onChange={e => setSelectedCourse(courses.find(c => c._id === e.target.value))}>
                    {courses.map(c => <option key={c._id} value={c._id}>{c.courseTitle}</option>)}
                </select>
            </div>
            {reviews.length === 0 ? (
                <div style={s.emptyBox}><p style={s.emptyText}>No reviews for this course yet.</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {reviews.map(r => (
                        <div key={r._id} style={s.panelCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div>
                                    <strong style={{ color: colors.text }}>{r.studentRef?.fullName}</strong>
                                    <span style={{ color: colors.textMuted, fontSize: '12px', marginLeft: '12px' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>
                                <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
                                    {Array.from({ length: r.rating }).map((_, iconIndex) => <Star key={iconIndex} size={14} style={{ color: '#f59e0b' }} aria-hidden="true" />)}
                                </span>
                            </div>
                            <p style={{ color: '#cbd5e1', fontSize: '14px', margin: '0 0 16px', lineHeight: '1.5' }}>{r.reviewText}</p>
                            {r.instructorReply ? (
                                <div style={{ background: 'rgba(59,130,246,0.08)', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                                    <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: '700' }}>Your Reply:</span>
                                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: '4px 0 0' }}>{r.instructorReply}</p>
                                </div>
                            ) : (
                                <div>
                                    <input id={`reply-${r._id}`} style={{ ...s.input, marginBottom: '8px' }} placeholder="Write a reply..." />
                                    <button onClick={() => { const val = document.getElementById(`reply-${r._id}`).value; if (val) handleReviewReply(r._id, val); }} style={s.actionBtn}>Reply</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ── 8. Analytics Tab ───────────────────────────────────────
    const renderAnalytics = () => (
        <div>
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Analytics & Performance</h2>
                <p style={s.tabSubtitle}>Understand your reach, engagement, and revenue</p>
            </div>
            <div style={s.statsGrid}>
                <div style={{ ...s.statCard, borderTop: '3px solid #3b82f6' }}>
                    <span style={{ ...s.statValue, color: '#3b82f6' }}>{analytics.totalStudents || 0}</span>
                    <span style={s.statLabel}>Total Enrollments</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #10b981' }}>
                    <span style={{ ...s.statValue, color: '#10b981' }}>{analytics.clearedStudents || 0}</span>
                    <span style={s.statLabel}>Cleared Students</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #f59e0b' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...s.statValue, color: '#f59e0b' }}><Star size={18} aria-hidden="true" />{analytics.avgRating || 0}</span>
                    <span style={s.statLabel}>Average Rating</span>
                </div>
                <div style={{ ...s.statCard, borderTop: '3px solid #ec4899' }}>
                    <span style={{ ...s.statValue, color: '#ec4899' }}>{analytics.totalReviews || 0}</span>
                    <span style={s.statLabel}>Total Reviews</span>
                </div>
            </div>

            {/* Enrollments by Category */}
            <div style={s.panelCard}>
                <h3 style={s.panelTitle}>Enrollments by Category</h3>
                {analytics.enrollmentsByCategory && Object.keys(analytics.enrollmentsByCategory).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(analytics.enrollmentsByCategory).map(([cat, count]) => (
                            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ color: colors.textMuted, fontSize: '13px', minWidth: '160px' }}>{cat}</span>
                                <div style={{ flex: 1, background: 'rgba(30,41,59,0.5)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '8px', width: `${Math.min((count / (analytics.totalStudents || 1)) * 100, 100)}%` }} />
                                </div>
                                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '700', minWidth: '30px', textAlign: 'right' }}>{count}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={s.emptyText}>No enrollment data available yet.</p>
                )}
            </div>
        </div>
    );

    // ── 10. Settings Tab ───────────────────────────────────────
    const renderSettings = () => (
        <InstructorSettings user={user} />
    );

    // ═══════════════════════════════════════════════════════════
    // ── MAIN RENDER ───────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    const sidebarTabs = [
        { key: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={20} aria-hidden="true" /> },
        { key: 'courses', label: 'My Courses', icon: <BookOpen size={20} aria-hidden="true" /> },
        { key: 'students', label: 'Students', icon: <Users size={20} aria-hidden="true" /> },
        { key: 'assignments', label: 'Assignments', icon: <ClipboardList size={20} aria-hidden="true" /> },
        { key: 'quizzes', label: 'Quizzes', icon: <FileQuestion size={20} aria-hidden="true" /> },
        { key: 'live', label: 'Live Classes', icon: <Video size={20} aria-hidden="true" /> },
        { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} aria-hidden="true" /> },
        { key: 'messages', label: 'Messages', icon: <MessagesSquare size={20} aria-hidden="true" /> },
        { key: 'reviews', label: 'Reviews', icon: <Star size={20} aria-hidden="true" /> },
        { key: 'settings', label: 'Settings', icon: <Settings size={20} aria-hidden="true" />, path: '/instructor/settings' }
    ];

    return (
        <div style={{ ...s.page, background: colors.bg, color: colors.text }}>
            {/* ── Sidebar ─────────────────────────────────────── */}
            <Sidebar
                navItems={sidebarTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                extraBottomButtons={
                    <button onClick={() => navigate('/courses')} style={{ ...s.catalogBtn, display: 'inline-flex', alignItems: 'center', gap: '8px' }}><BookOpen size={18} aria-hidden="true" />Course Catalog</button>
                }
            />

            {/* ── Main Content ────────────────────────────────── */}
            <main style={s.main}>
                <header style={s.header}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><LayoutDashboard size={24} aria-hidden="true" /><h1 style={s.greeting}>Instructor Workspace</h1></div>
                        <p style={s.subGreeting}>Empower learners through quality content</p>
                    </div>
                    {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user?.fullName} style={{ ...s.avatar, objectFit: 'cover' }} />
                    ) : (
                        <div style={s.avatar}>{user?.fullName?.[0]?.toUpperCase()}</div>
                    )}
                </header>

                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'courses' && renderCourses()}
                {activeTab === 'students' && renderStudents()}
                {activeTab === 'assignments' && renderAssignments()}
                {activeTab === 'quizzes' && renderQuizzes()}
                {activeTab === 'live' && renderLiveClasses()}
                {activeTab === 'analytics' && renderAnalytics()}
                {activeTab === 'messages' && renderMessages()}
                {activeTab === 'reviews' && renderReviews()}
                {activeTab === 'settings' && renderSettings()}
            </main>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ── MODALS ─────────────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════ */}

            {/* Create Course Modal */}
            {isCourseModalOpen && (
                <div style={s.backdrop} onClick={() => setIsCourseModalOpen(false)}>
                    <div style={s.modal} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Create New Course</h3>
                            <button onClick={() => setIsCourseModalOpen(false)} style={s.closeBtn}><X size={18} aria-hidden="true" /></button>
                        </div>
                        <div style={s.modalBody}>
                            <form onSubmit={handleCreateCourse} style={s.formGrid}>
                                <div style={s.formGroup}><label style={s.label}>Course Title *</label><input style={s.input} required value={courseForm.courseTitle} onChange={e => setCourseForm({ ...courseForm, courseTitle: e.target.value })} /></div>
                                <div style={s.formGroup}><label style={s.label}>Subtitle</label><input style={s.input} value={courseForm.subtitle} onChange={e => setCourseForm({ ...courseForm, subtitle: e.target.value })} /></div>
                                <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}><label style={s.label}>Description *</label><textarea style={{ ...s.input, minHeight: '80px' }} required value={courseForm.descriptionText} onChange={e => setCourseForm({ ...courseForm, descriptionText: e.target.value })} /></div>
                                <div style={s.formGroup}>
                                    <label style={s.label}>Category *</label>
                                    <select style={s.select} value={courseForm.technicalCategory} onChange={e => setCourseForm({ ...courseForm, technicalCategory: e.target.value })}>
                                        {['Web Coding', 'Creative Media', 'Robotics Hardware', 'Network Engineering', 'Mobile Development', 'Data Science', 'Cybersecurity', 'Cloud Computing', 'Artificial Intelligence', 'Business & Management', 'Databases', 'DevOps & CI/CD', 'Graphic Design'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div style={s.formGroup}>
                                    <label style={s.label}>Difficulty Level</label>
                                    <select style={s.select} value={courseForm.level} onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}>
                                        {['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div style={s.formGroup}><label style={s.label}>Duration (hours) *</label><input style={s.input} type="number" min="1" required value={courseForm.estimatedDurationHours} onChange={e => setCourseForm({ ...courseForm, estimatedDurationHours: e.target.value })} /></div>
                                <div style={s.formGroup}>
                                    <label style={s.label}>Language</label>
                                    <select style={s.select} value={courseForm.language} onChange={e => setCourseForm({ ...courseForm, language: e.target.value })}>
                                        {['English', 'Amharic', 'Afaan Oromo'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div style={s.formGroup}><label style={s.label}>Price (ETB, 0 for Free)</label><input style={s.input} type="number" min="0" value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: e.target.value })} /></div>
                                <div style={s.formGroup}><label style={s.label}>Learning Objectives (one per line)</label><textarea style={{ ...s.input, minHeight: '60px' }} value={courseForm.learningObjectives} onChange={e => setCourseForm({ ...courseForm, learningObjectives: e.target.value })} placeholder="Build responsive websites&#10;Learn React hooks" /></div>
                                <div style={s.formGroup}><label style={s.label}>Prerequisites (one per line)</label><textarea style={{ ...s.input, minHeight: '60px' }} value={courseForm.requirements} onChange={e => setCourseForm({ ...courseForm, requirements: e.target.value })} placeholder="Basic HTML knowledge" /></div>
                                <div style={s.formGroup}><label style={s.label}>Tags (comma separated)</label><input style={s.input} value={courseForm.tags} onChange={e => setCourseForm({ ...courseForm, tags: e.target.value })} placeholder="react, javascript, web" /></div>
                                <div style={{ gridColumn: '1 / -1' }}><button type="submit" style={s.primaryBtn}>Save as Draft</button></div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Course Modal */}
            {isEditCourseModal && (
                <div style={s.backdrop} onClick={() => setIsEditCourseModal(false)}>
                    <div style={{ ...s.modal, maxWidth: '800px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Edit Course</h3>
                            <button onClick={() => setIsEditCourseModal(false)} style={s.closeBtn}><X size={18} aria-hidden="true" /></button>
                        </div>
                        <div style={s.modalBody}>
                            <form onSubmit={handleEditCourse} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                
                                {/* ═══ BASIC INFORMATION ═══ */}
                                <div>
                                    <h4 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Basic Information</h4>
                                    <div style={s.formGrid}>
                                        <div style={s.formGroup}>
                                            <label style={s.label}>Course Title *</label>
                                            <input style={s.input} required value={courseForm.courseTitle} onChange={e => setCourseForm({ ...courseForm, courseTitle: e.target.value })} placeholder="Enter course title" />
                                        </div>
                                        <div style={s.formGroup}>
                                            <label style={s.label}>Subtitle</label>
                                            <input style={s.input} value={courseForm.subtitle} onChange={e => setCourseForm({ ...courseForm, subtitle: e.target.value })} placeholder="Optional subtitle" />
                                        </div>
                                        <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}>
                                            <label style={s.label}>Description *</label>
                                            <textarea style={{ ...s.input, minHeight: '100px', resize: 'vertical' }} required value={courseForm.descriptionText} onChange={e => setCourseForm({ ...courseForm, descriptionText: e.target.value })} placeholder="Detailed course description" />
                                        </div>
                                        <div style={s.formGroup}>
                                            <label style={s.label}>Category *</label>
                                            <select style={s.select} value={courseForm.technicalCategory} onChange={e => setCourseForm({ ...courseForm, technicalCategory: e.target.value })}>
                                                {['Web Coding', 'Creative Media', 'Robotics Hardware', 'Network Engineering', 'Mobile Development', 'Data Science', 'Cybersecurity', 'Cloud Computing', 'Artificial Intelligence', 'Business & Management', 'Databases', 'DevOps & CI/CD', 'Graphic Design'].map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div style={s.formGroup}>
                                            <label style={s.label}>Level</label>
                                            <select style={s.select} value={courseForm.level} onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}>
                                                {['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </div>
                                        <div style={s.formGroup}>
                                            <label style={s.label}>Language</label>
                                            <select style={s.select} value={courseForm.language || 'English'} onChange={e => setCourseForm({ ...courseForm, language: e.target.value })}>
                                                {['English', 'Amharic', 'Afaan Oromo'].map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </div>
                                        <div style={s.formGroup}>
                                            <label style={s.label}>Duration (hours) *</label>
                                            <input style={s.input} type="number" min="1" required value={courseForm.estimatedDurationHours} onChange={e => setCourseForm({ ...courseForm, estimatedDurationHours: parseInt(e.target.value) || 1 })} />
                                        </div>
                                        {selectedCourse?.publicationState && (
                                            <div style={s.formGroup}>
                                                <label style={s.label}>Status</label>
                                                <div style={{ ...s.input, background: 'rgba(9,13,22,0.4)', color: '#94a3b8', padding: '11px 14px', borderRadius: '8px', fontSize: '14px' }}>
                                                    {selectedCourse.publicationState}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ═══ THUMBNAIL MANAGEMENT ═══ */}
                                <div style={{ borderTop: '1px solid rgba(30,41,59,0.4)', paddingTop: '16px' }}>
                                    <h4 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course Thumbnail</h4>
                                    
                                    {/* Current Thumbnail Preview */}
                                    {(thumbnailPreview || courseForm.thumbnailUrl) && (
                                        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                                            <div style={{ marginBottom: '12px', fontSize: '12px', color: colors.textMuted, fontWeight: '600' }}>
                                                {thumbnailPreview ? 'Preview (unsaved)' : 'Current Thumbnail'}
                                            </div>
                                            <img 
                                                src={thumbnailPreview || courseForm.thumbnailUrl} 
                                                alt="Thumbnail" 
                                                style={{ maxWidth: '100%', height: 'auto', maxHeight: '240px', borderRadius: '8px', border: '1px solid rgba(30,41,59,0.6)' }} 
                                            />
                                        </div>
                                    )}

                                    {/* Upload Error */}
                                    {thumbnailUploadError && (
                                        <div style={{ ...s.successAlert, background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171', marginBottom: '12px' }}>
                                            {thumbnailUploadError}
                                        </div>
                                    )}

                                    {/* File Input */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <label htmlFor="thumbnail-upload" style={{ ...s.label, display: 'block', marginBottom: '8px' }}>
                                            Select Image
                                        </label>
                                        <input 
                                            id="thumbnail-upload"
                                            type="file" 
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handleThumbnailFileSelect}
                                            disabled={isUploadingThumbnail}
                                            style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(9,13,22,0.6)', border: '1px solid rgba(30,41,59,0.6)', color: '#fff', cursor: 'pointer' }}
                                        />
                                        <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
                                            JPG, PNG or WebP • Max 5MB
                                        </div>
                                    </div>

                                    {/* Upload/Remove Buttons */}
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {selectedThumbnailFile && (
                                            <button 
                                                type="button"
                                                onClick={handleUploadThumbnail}
                                                disabled={isUploadingThumbnail}
                                                style={{ ...s.primaryBtn, opacity: isUploadingThumbnail ? 0.6 : 1, cursor: isUploadingThumbnail ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                {isUploadingThumbnail ? <>Uploading...</> : <><UploadCloud size={14} />Upload</>}
                                            </button>
                                        )}
                                        {courseForm.thumbnailUrl && (
                                            <button 
                                                type="button"
                                                onClick={handleRemoveThumbnail}
                                                style={{ ...s.dangerBtn }}
                                            >
                                                Remove Thumbnail
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ═══ PRICING ═══ */}
                                <div style={{ borderTop: '1px solid rgba(30,41,59,0.4)', paddingTop: '16px' }}>
                                    <h4 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pricing</h4>
                                    <div style={s.formGrid}>
                                        <div style={s.formGroup}>
                                            <label style={s.label}>Price (ETB) *</label>
                                            <input style={s.input} type="number" min="0" step="0.01" required value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div style={s.formGroup}>
                                            <label style={s.label}>Discount Price (ETB)</label>
                                            <input style={s.input} type="number" min="0" step="0.01" value={courseForm.discountPrice || ''} onChange={e => setCourseForm({ ...courseForm, discountPrice: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Optional discount" />
                                        </div>
                                        {courseForm.price > 0 && courseForm.discountPrice && (
                                            <div style={{ ...s.formGroup, gridColumn: '1 / -1', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '12px', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>Price Preview</div>
                                                <div style={{ display: 'flex', gap: '24px', marginTop: '8px', fontSize: '13px' }}>
                                                    <div>
                                                        <span style={{ color: colors.textMuted }}>Original: </span>
                                                        <span style={{ color: colors.text, fontWeight: '600' }}>{courseForm.price} ETB</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: colors.textMuted }}>Discount: </span>
                                                        <span style={{ color: '#10b981', fontWeight: '600' }}>{courseForm.discountPrice} ETB</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: colors.textMuted }}>Savings: </span>
                                                        <span style={{ color: '#10b981', fontWeight: '600' }}>
                                                            {((courseForm.price - courseForm.discountPrice) / courseForm.price * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ═══ COURSE CONTENT ═══ */}
                                <div style={{ borderTop: '1px solid rgba(30,41,59,0.4)', paddingTop: '16px' }}>
                                    <button 
                                        type="button"
                                        onClick={() => setIsContentExpanded(!isContentExpanded)}
                                        style={{ background: 'transparent', border: 'none', color: colors.text, fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                    >
                                        {isContentExpanded ? '▼' : '▶'} Course Content ({selectedCourse?.curriculumTree?.length || 0} chapters)
                                    </button>
                                    
                                    {isContentExpanded && (
                                        <div style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                                            {(!selectedCourse?.curriculumTree || selectedCourse.curriculumTree.length === 0) ? (
                                                <div style={{ padding: '16px', background: 'rgba(9,13,22,0.35)', borderRadius: '8px', border: '1px dashed rgba(51,65,85,0.4)', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>
                                                    No chapters yet. Add chapters to structure your course.
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {selectedCourse.curriculumTree.map((chapter, idx) => (
                                                        <div key={idx} style={{ background: 'rgba(9,13,22,0.4)', border: '1px solid rgba(30,41,59,0.5)', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                                                            <div style={{ color: colors.text, fontWeight: '600', marginBottom: '6px' }}>
                                                                📚 {chapter.chapterTitle || `Chapter ${idx + 1}`}
                                                            </div>
                                                            <div style={{ color: colors.textMuted, fontSize: '12px', marginLeft: '20px' }}>
                                                                {chapter.lessons?.length || 0} lesson{(chapter.lessons?.length || 0) !== 1 ? 's' : ''}
                                                                {chapter.lessons && chapter.lessons.length > 0 && (
                                                                    <div style={{ marginTop: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                                                                        {chapter.lessons.map((lesson, lessonIdx) => (
                                                                            <div key={lessonIdx} style={{ paddingLeft: '12px', color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                                                                                ▪ {lesson.lessonTitle || `Lesson ${lessonIdx + 1}`}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCourse(selectedCourse);
                                                        setIsAddChapterModalOpen(true);
                                                        setIsEditCourseModal(false);
                                                    }}
                                                    style={{ ...s.actionBtn, fontSize: '12px' }}
                                                >
                                                    + Add Chapter
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCourse(selectedCourse);
                                                        setIsAddLessonModalOpen(true);
                                                        setIsEditCourseModal(false);
                                                    }}
                                                    style={{ ...s.actionBtn, fontSize: '12px' }}
                                                >
                                                    + Add Lesson
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ═══ ACTIONS ═══ */}
                                <div style={{ borderTop: '1px solid rgba(30,41,59,0.4)', paddingTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => setIsEditCourseModal(false)} style={s.actionBtnAlt}>
                                        Cancel
                                    </button>
                                    <button type="submit" style={s.primaryBtn}>
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Chapter Modal */}
            {isAddChapterModalOpen && (
                <div style={s.backdrop} onClick={() => setIsAddChapterModalOpen(false)}>
                    <div style={s.modal} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Add Chapter — {selectedCourse?.courseTitle}</h3>
                            <button onClick={() => setIsAddChapterModalOpen(false)} style={s.closeBtn}><X size={18} aria-hidden="true" /></button>
                        </div>
                        <div style={s.modalBody}>
                            <form onSubmit={handleAddChapter} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={s.formGroup}><label style={s.label}>Chapter Title</label><input style={s.input} required value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} /></div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" style={s.primaryBtn}>Add Chapter</button>
                                    <button type="button" onClick={() => setIsAddChapterModalOpen(false)} style={s.actionBtnAlt}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Lesson Modal */}
            {isAddLessonModalOpen && (
                <div style={s.backdrop} onClick={() => setIsAddLessonModalOpen(false)}>
                    <div style={s.modal} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Add Lesson — {selectedCourse?.courseTitle}</h3>
                            <button onClick={() => setIsAddLessonModalOpen(false)} style={s.closeBtn}><X size={18} aria-hidden="true" /></button>
                        </div>
                        <div style={s.modalBody}>
                            <form onSubmit={handleAddLesson} style={{ display: 'grid', gap: 12 }}>
                                <div>
                                    <label style={s.label}>Chapter</label>
                                    <select style={s.select} value={lessonChapterIndex} onChange={e => setLessonChapterIndex(e.target.value)}>
                                        {(selectedCourse?.curriculumTree || []).map((ch, idx) => <option key={idx} value={idx}>{ch.title || `Chapter ${idx + 1}`}</option>)}
                                    </select>
                                </div>
                                <div style={s.formGroup}><label style={s.label}>Lesson Title</label><input style={s.input} required value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} /></div>
                                <div style={s.formGroup}><label style={s.label}>Lesson Content (notes)</label><textarea style={{ ...s.input, minHeight: '120px' }} value={newLessonContent} onChange={e => setNewLessonContent(e.target.value)} /></div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" style={s.primaryBtn}>Add Lesson</button>
                                    <button type="button" onClick={() => setIsAddLessonModalOpen(false)} style={s.actionBtnAlt}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Quiz Builder Modal */}
            {isQuizModalOpen && (
                <div style={s.backdrop} onClick={() => setIsQuizModalOpen(false)}>
                    <div style={{ ...s.modal, maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Create Quiz — {selectedCourse?.courseTitle}</h3>
                            <button onClick={() => setIsQuizModalOpen(false)} style={s.closeBtn}><X size={18} aria-hidden="true" /></button>
                        </div>
                        <div style={s.modalBody}>
                            <form onSubmit={handleCreateQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={s.formGroup}><label style={s.label}>Quiz Title *</label><input style={s.input} required value={quizForm.quizTitle} onChange={e => setQuizForm({ ...quizForm, quizTitle: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={s.formGroup}><label style={s.label}>Duration (min)</label><input style={s.input} type="number" min="5" max="180" value={quizForm.allottedDurationMinutes} onChange={e => setQuizForm({ ...quizForm, allottedDurationMinutes: e.target.value })} /></div>
                                    <div style={s.formGroup}><label style={s.label}>Passing Score (%)</label><input style={s.input} type="number" min="0" max="100" value={quizForm.passingScoreThreshold} onChange={e => setQuizForm({ ...quizForm, passingScoreThreshold: e.target.value })} /></div>
                                </div>

                                {/* Emare AI Tutor Enable / Disable */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${quizForm.aiTutorEnabled !== false ? '#a7f3d0' : '#fecaca'}`, background: quizForm.aiTutorEnabled !== false ? '#f0fdf4' : '#fef2f2' }}>
                                    <label style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: colors.text }}>⊡ Emare AI Tutor</label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: quizForm.aiTutorEnabled !== false ? '#059669' : '#dc2626' }}>
                                        <input type="checkbox" checked={quizForm.aiTutorEnabled !== false} onChange={e => setQuizForm({ ...quizForm, aiTutorEnabled: e.target.checked })} style={{ accentColor: quizForm.aiTutorEnabled !== false ? '#10b981' : '#ef4444', width: 16, height: 16 }} />
                                        {quizForm.aiTutorEnabled !== false ? 'Enabled' : 'Disabled'}
                                    </label>
                                </div>

                                {/* Question Builder */}
                                <div style={{ borderTop: '1px solid rgba(30,41,59,0.5)', paddingTop: '16px' }}>
                                    <h4 style={{ color: colors.text, margin: '0 0 12px', fontSize: '15px' }}>Questions</h4>
                                    {quizForm.questions.map((q, qIdx) => (
                                        <div key={qIdx} style={{ background: colors.bgCard, padding: '16px', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(30,41,59,0.5)' }}>
                                            <label style={{ ...s.label, marginBottom: '6px', display: 'block' }}>Q{qIdx + 1}: Question Text</label>
                                            <input style={{ ...s.input, marginBottom: '10px' }} value={q.questionText} onChange={e => updateQuestion(qIdx, 'questionText', e.target.value)} placeholder="Enter question..." />
                                            {q.options.map((opt, oIdx) => (
                                                <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <input type="radio" name={`correct-${qIdx}`} checked={q.correctAnswerIndex === oIdx} onChange={() => updateQuestion(qIdx, 'correctAnswerIndex', oIdx)} style={{ accentColor: '#10b981' }} />
                                                    <input style={{ ...s.input, flex: 1 }} value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    <button type="button" onClick={addQuestion} style={s.actionBtnAlt}>+ Add Question</button>
                                </div>
                                <button type="submit" style={s.primaryBtn}>Publish Quiz</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Grade Submission Modal */}
            {isGradeModalOpen && (
                <div style={s.backdrop} onClick={() => setIsGradeModalOpen(false)}>
                    <div style={{ ...s.modal, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Grade Submission</h3>
                            <button onClick={() => setIsGradeModalOpen(false)} style={s.closeBtn}><X size={18} aria-hidden="true" /></button>
                        </div>
                        <div style={s.modalBody}>
                            {selectedSubmission?.submittedRepositoryURL && (
                                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                                    <p style={{ margin: 0, fontSize: '12px', color: colors.textMuted }}>Submitted Link:</p>
                                    <a href={selectedSubmission.submittedRepositoryURL} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontSize: '13px' }}>{selectedSubmission.submittedRepositoryURL}</a>
                                </div>
                            )}
                            <form onSubmit={handleGradeSubmission} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={s.formGroup}><label style={s.label}>Score (0-100)</label><input style={s.input} type="number" min="0" max="100" required value={gradeForm.numericalScoreEarned} onChange={e => setGradeForm({ ...gradeForm, numericalScoreEarned: e.target.value })} /></div>
                                <div style={s.formGroup}><label style={s.label}>Feedback Notes</label><textarea style={{ ...s.input, minHeight: '100px' }} placeholder="Constructive feedback..." value={gradeForm.instructorReviewNotes} onChange={e => setGradeForm({ ...gradeForm, instructorReviewNotes: e.target.value })} /></div>
                                <button type="submit" style={s.primaryBtn}>Save Grade</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


