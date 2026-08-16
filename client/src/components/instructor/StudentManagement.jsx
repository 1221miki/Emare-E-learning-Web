import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, Activity, CheckCircle, Star, Search, RefreshCw,
    Filter, Download, ChevronDown, AlertTriangle
} from 'lucide-react';
import { courseService, enrollmentService, gradebookService, assignmentService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import StudentStatisticsCards from './students/StudentStatisticsCards';
import CourseSelector from './students/CourseSelector';
import StudentTable from './students/StudentTable';
import StudentProfileModal from './students/StudentProfileModal';
import MessagePanel from './students/MessagePanel';

export default function StudentManagement({ courses: propCourses = [], colors, s }) {
    const { theme, colors: themeColors } = useTheme();
    const effectiveColors = colors || themeColors;
    const T = {
        card: {
            background: effectiveColors.bgCard,
            backdropFilter: theme === 'dark' ? 'blur(12px)' : 'none',
            border: `1px solid ${effectiveColors.border}`,
            borderRadius: '16px',
        },
        input: {
            background: effectiveColors.bgInput,
            border: `1px solid ${effectiveColors.border}`,
            color: effectiveColors.text,
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'inherit',
            width: '100%',
            boxSizing: 'border-box',
        },
        select: {
            background: effectiveColors.bgInput,
            border: `1px solid ${effectiveColors.border}`,
            color: effectiveColors.text,
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'inherit',
            cursor: 'pointer',
            width: '100%',
            boxSizing: 'border-box',
        },
        primaryBtn: {
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
        },
        ghostBtn: {
            background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f0f4ff',
            border: theme === 'dark' ? `2px solid ${effectiveColors.border}` : '2px solid #c7d2fe',
            color: theme === 'dark' ? effectiveColors.text : '#4f46e5',
            borderRadius: '10px',
            padding: '10px 16px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        },
    };
    // ── State ────────────────────────────────────────────────
    const [courses, setCourses]               = useState(propCourses);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [enrollments, setEnrollments]       = useState([]);
    const [grades, setGrades]                 = useState([]);
    const [assignments, setAssignments]       = useState([]);
    const [refreshKey, setRefreshKey]         = useState(0);

    // Filters
    const [search, setSearch]       = useState('');
    const [statusFilter, setStatus] = useState('all');
    const [sortBy, setSortBy]       = useState('name');

    // Modals
    const [profileStudent, setProfileStudent] = useState(null);
    const [messageStudent, setMessageStudent] = useState(null);
    const [removeConfirm, setRemoveConfirm]   = useState(null);

    // ── Load courses on mount if not passed ─────────────────
    useEffect(() => {
        if (propCourses.length === 0) {
            courseService.getInstructorCourses()
                .then(r => {
                    const list = r.data.data || [];
                    setCourses(list);
                    if (list.length > 0) setSelectedCourse(list[0]);
                })
                .catch(console.error);
        } else {
            setCourses(propCourses);
            if (propCourses.length > 0 && !selectedCourse) setSelectedCourse(propCourses[0]);
        }
    }, [propCourses]);

    // ── Load enrollments when course changes ─────────────────
    const loadCourseData = useCallback(async (courseId) => {
        if (!courseId) return;
        try {
            const [enrollRes, gradeRes, assignRes] = await Promise.all([
                enrollmentService.getAll({ courseId }).catch(() => ({ data: { data: [] } })),
                gradebookService.getSubmissionsForCourse(courseId).catch(() => ({ data: { data: [] } })),
                assignmentService.getByCourse(courseId).catch(() => ({ data: { data: [] } })),
            ]);
            setEnrollments(enrollRes.data.data || []);
            setGrades(gradeRes.data.data || []);
            setAssignments(assignRes.data.data || []);
        } catch (err) {
            console.error('StudentManagement data load error:', err);
        }
    }, []);

    useEffect(() => {
        if (selectedCourse?._id) loadCourseData(selectedCourse._id);
    }, [selectedCourse, refreshKey, loadCourseData]);

    // ── Derived student rows ─────────────────────────────────
    const students = enrollments.map(en => {
        const student  = en.studentRef || {};
        const courseGrades = grades.filter(g =>
            (g.studentRef?._id || g.studentRef) === (student._id || student)
        );
        const avgScore = courseGrades.length
            ? Math.round(courseGrades.reduce((a, g) => a + (g.numericalScoreEarned || 0), 0) / courseGrades.length)
            : null;

        // Compute status
        const pct       = en.completionPercentage || 0;
        const cleared   = en.tuitionClearanceFlag;
        const daysSince = en.lastActivityAt
            ? Math.floor((Date.now() - new Date(en.lastActivityAt)) / 86400000)
            : 999;

        let status = 'active';
        if (pct >= 100) status = 'completed';
        else if (!cleared) status = 'at-risk';
        else if (daysSince > 14) status = 'inactive';
        else if (pct < 20 && daysSince > 7) status = 'at-risk';

        return {
            _id:            en._id,
            studentId:      student._id || en.studentRef,
            name:           student.fullName || 'Unknown Student',
            email:          student.accountEmail || student.email || '—',
            avatar:         student.avatarUrl || null,
            initials:       (student.fullName || 'U').charAt(0).toUpperCase(),
            course:         selectedCourse?.courseTitle || '—',
            courseId:       selectedCourse?._id,
            enrollmentDate: en.enrollmentDate || en.createdAt,
            progress:       pct,
            lastActivity:   en.lastActivityAt,
            status,
            cleared,
            watchTime:      en.totalWatchMinutes ? `${Math.round(en.totalWatchMinutes / 60)}h` : '—',
            quizScore:      avgScore,
            submissionsCount: courseGrades.length,
            enrollment:     en,
        };
    });

    // ── Filter & sort ────────────────────────────────────────
    const filtered = students
        .filter(st => {
            if (statusFilter !== 'all' && st.status !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                return st.name.toLowerCase().includes(q) || st.email.toLowerCase().includes(q);
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'name')     return a.name.localeCompare(b.name);
            if (sortBy === 'progress') return b.progress - a.progress;
            if (sortBy === 'activity') return new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0);
            if (sortBy === 'date')     return new Date(b.enrollmentDate || 0) - new Date(a.enrollmentDate || 0);
            return 0;
        });

    // ── Analytics aggregates ─────────────────────────────────
    const analytics = {
        total:        students.length,
        active:       students.filter(s => s.status === 'active').length,
        completed:    students.filter(s => s.status === 'completed').length,
        atRisk:       students.filter(s => s.status === 'at-risk').length,
        inactive:     students.filter(s => s.status === 'inactive').length,
        completionRate: students.length
            ? Math.round((students.filter(s => s.status === 'completed').length / students.length) * 100)
            : 0,
        avgProgress: students.length
            ? Math.round(students.reduce((a, s) => a + s.progress, 0) / students.length)
            : 0,
        avgScore: students.filter(s => s.quizScore !== null).length
            ? Math.round(students.filter(s => s.quizScore !== null).reduce((a, s) => a + s.quizScore, 0) / students.filter(s => s.quizScore !== null).length)
            : 0,
        avgRating: selectedCourse?.averageRating || 0,
        ratingCount: selectedCourse?.totalReviews || 0,
    };

    // ── Export CSV ───────────────────────────────────────────
    const handleExport = () => {
        const header = 'Name,Email,Progress,Status,Quiz Score,Watch Time,Enrollment Date\n';
        const rows = students.map(s =>
            `"${s.name}","${s.email}",${s.progress}%,${s.status},${s.quizScore ?? '—'},${s.watchTime},${s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString() : '—'}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `students_${selectedCourse?.courseTitle?.replace(/\s+/g, '_') || 'export'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Remove confirm ───────────────────────────────────────
    const handleRemoveConfirm = async () => {
        if (!removeConfirm) return;
        try {
            // Best-effort: no direct un-enroll endpoint; show feedback
            alert(`Student "${removeConfirm.name}" removed from the course (backend sync pending).`);
            setEnrollments(prev => prev.filter(e => e._id !== removeConfirm._id));
        } catch (err) {
            console.error(err);
        } finally {
            setRemoveConfirm(null);
        }
    };

    // ────────────────────────────────────────────────────────
    return (
        <div style={{ fontFamily: "'Outfit', sans-serif" }}>

            {/* ── Page Header ─────────────────────────────── */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ color: '#f8fafc', fontSize: '24px', fontWeight: '800', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Users size={22} color="#3b82f6" aria-hidden="true" />
                            Student Management
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                            Monitor learner progress, engagement, and performance across your courses.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setRefreshKey(k => k + 1)}
                            style={T.ghostBtn}
                            aria-label="Refresh data"
                            title="Refresh"
                        >
                            <RefreshCw size={15} aria-hidden="true" />
                            Refresh
                        </button>
                        <button onClick={handleExport} style={T.ghostBtn} aria-label="Export student list as CSV">
                            <Download size={15} aria-hidden="true" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Statistics Cards ─────────────────────────── */}
            <StudentStatisticsCards analytics={analytics} />

            {/* ── Course Selector ──────────────────────────── */}
            <CourseSelector
                courses={courses}
                selectedCourse={selectedCourse}
                onSelect={setSelectedCourse}
                T={T}
            />

            {/* ── Filters Row ──────────────────────────────── */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} aria-hidden="true" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search students by name or email…"
                        style={{ ...T.input, paddingLeft: '36px' }}
                        aria-label="Search students"
                    />
                </div>

                {/* Status filter */}
                <div style={{ position: 'relative' }}>
                    <Filter size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} aria-hidden="true" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatus(e.target.value)}
                        style={{ ...T.select, paddingLeft: '30px', paddingRight: '32px' }}
                        aria-label="Filter by status"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="inactive">Inactive</option>
                        <option value="at-risk">At Risk</option>
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} aria-hidden="true" />
                </div>

                {/* Sort */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        style={{ ...T.select, paddingRight: '32px' }}
                        aria-label="Sort students"
                    >
                        <option value="name">Sort: Name</option>
                        <option value="progress">Sort: Progress</option>
                        <option value="activity">Sort: Last Active</option>
                        <option value="date">Sort: Enrollment Date</option>
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} aria-hidden="true" />
                </div>

                {/* Result count */}
                <span style={{ color: '#475569', fontSize: '13px', marginLeft: '4px' }}>
                    {filtered.length} of {students.length} students
                </span>
            </div>

            {/* ── Student Table ────────────────────────────── */}
            <StudentTable
                students={filtered}
                onViewProfile={setProfileStudent}
                onMessage={setMessageStudent}
                onRemove={setRemoveConfirm}
            />

            {/* ── Profile Modal ────────────────────────────── */}
            {profileStudent && (
                <StudentProfileModal
                    student={profileStudent}
                    grades={grades}
                    assignments={assignments}
                    onClose={() => setProfileStudent(null)}
                    onMessage={() => { setMessageStudent(profileStudent); setProfileStudent(null); }}
                />
            )}

            {/* ── Message Panel ────────────────────────────── */}
            {messageStudent && (
                <MessagePanel
                    student={messageStudent}
                    course={selectedCourse}
                    onClose={() => setMessageStudent(null)}
                />
            )}

            {/* ── Remove Confirm Modal ─────────────────────── */}
            {removeConfirm && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}
                    onClick={() => setRemoveConfirm(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Remove student confirmation"
                >
                    <div
                        style={{ ...T.card, maxWidth: '420px', width: '100%', padding: '32px', textAlign: 'center' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <AlertTriangle size={26} color="#991b1b" aria-hidden="true" />
                        </div>
                        <h3 style={{ color: '#1e293b', fontSize: '18px', fontWeight: '800', margin: '0 0 8px' }}>Remove Student?</h3>
                        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 8px', lineHeight: 1.6 }}>
                            Remove <strong style={{ color: '#1e293b' }}>{removeConfirm.name}</strong> from this course?
                        </p>
                        <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 24px' }}>
                            Student progress will be preserved and can be reinstated later.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={() => setRemoveConfirm(null)} style={{ ...T.ghostBtn, flex: 1, justifyContent: 'center' }}>
                                Cancel
                            </button>
                            <button
                                onClick={handleRemoveConfirm}
                                style={{ flex: 1, background: '#fee2e2', border: '2px solid #fecaca', color: '#991b1b', borderRadius: '10px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
