import React, { useState, useEffect, useCallback } from 'react';
import {
    ClipboardList, Plus, BarChart3, AlertTriangle, RefreshCw,
    CheckCircle, Clock, FileText, TrendingUp, Users
} from 'lucide-react';
import { assignmentService, courseService } from '../../../services/api';
import { card, primaryBtn, ghostBtn, C } from './assignmentStyles';
import AssignmentList     from './AssignmentList';
import CreateAssignment   from './CreateAssignment';
import SubmissionReviewer from './SubmissionReviewer';
import GradingWorkspace   from './GradingWorkspace';
import LateSubmissions    from './LateSubmissions';
import AssignmentAnalytics from './AssignmentAnalytics';

// ── Stat card ────────────────────────────────────────────────
function StatCard({ icon, color, label, value, sub }) {
    return (
        <div
            style={{ ...card, padding: '20px 22px', borderTop: `3px solid ${color}`, cursor: 'default', transition: 'transform 0.18s, box-shadow 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.28)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {React.cloneElement(icon, { size: 19, color, 'aria-hidden': true })}
                </div>
            </div>
            <div style={{ color: '#1e293b', fontSize: '28px', fontWeight: '800', lineHeight: 1, marginBottom: '5px' }}>{value}</div>
            <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>{label}</div>
            {sub && <div style={{ color: '#64748b', fontSize: '11px' }}>{sub}</div>}
        </div>
    );
}

const VIEWS = ['overview', 'create', 'submissions', 'grading', 'late', 'analytics'];

export default function AssignmentManagement({ courses: propCourses = [] }) {
    const [view, setView]                 = useState('overview');
    const [courses, setCourses]           = useState(propCourses);
    const [selectedCourse, setCourse]     = useState(null);
    const [assignments, setAssignments]   = useState([]);
    const [allSubmissions, setAllSubs]    = useState([]);  // flat across all assignments
    const [refreshKey, setRefresh]        = useState(0);

    // Selected items passed down to sub-views
    const [activeAssignment, setActiveAssignment]   = useState(null);  // for submissions/grading
    const [gradingSubmission, setGradingSubmission] = useState(null);  // for grading workspace

    // ── Load courses ─────────────────────────────────────────
    useEffect(() => {
        if (propCourses.length > 0) {
            setCourses(propCourses);
            if (!selectedCourse) setCourse(propCourses[0]);
        } else {
            courseService.getInstructorCourses()
                .then(r => {
                    const list = r.data.data || [];
                    setCourses(list);
                    if (list.length > 0) setCourse(list[0]);
                })
                .catch(console.error);
        }
    }, [propCourses]);

    // ── Load assignments when course changes ─────────────────
    const loadAssignments = useCallback(async (courseId) => {
        if (!courseId) return;
        try {
            const res = await assignmentService.getByCourse(courseId);
            const list = res.data.data || [];
            setAssignments(list);

            // Load submissions for all assignments in parallel (best-effort)
            const subsArrays = await Promise.all(
                list.map(a => assignmentService.getSubmissions(a._id).then(r => r.data.data || []).catch(() => []))
            );
            setAllSubs(subsArrays.flat());
        } catch (err) {
            console.error('Assignment load error:', err);
        }
    }, []);

    useEffect(() => {
        if (selectedCourse?._id) loadAssignments(selectedCourse._id);
    }, [selectedCourse, refreshKey, loadAssignments]);

    // ── Derived stats ─────────────────────────────────────────
    const total       = assignments.length;
    const published   = assignments.filter(a => a.published).length;
    const drafts      = assignments.filter(a => !a.published).length;
    const pending     = allSubmissions.filter(s => s.status === 'Submitted').length;
    const graded      = allSubmissions.filter(s => s.status === 'Graded').length;
    const now         = Date.now();
    const late        = allSubmissions.filter(s => {
        const asgn = assignments.find(a => a._id === (s.assignmentRef?._id || s.assignmentRef));
        return asgn?.dueDate && new Date(s.createdAt) > new Date(asgn.dueDate);
    }).length;
    const avgScore = graded > 0
        ? Math.round(allSubmissions.filter(s => s.grade != null).reduce((a, s) => a + (s.grade || 0), 0) / Math.max(graded, 1))
        : null;

    const stats = [
        { icon: <ClipboardList />, color: C.blue,   label: 'Total Assignments',    value: total,                       sub: `${published} published · ${drafts} drafts` },
        { icon: <CheckCircle />,   color: C.green,  label: 'Published',            value: published,                   sub: 'Active & visible to students' },
        { icon: <Clock />,         color: C.orange, label: 'Pending Submissions',  value: pending,                     sub: 'Awaiting instructor grading' },
        { icon: <FileText />,      color: C.purple, label: 'Graded',               value: graded,                      sub: `${allSubmissions.length} total submissions` },
        { icon: <AlertTriangle />, color: C.red,    label: 'Late Submissions',     value: late,                        sub: 'After deadline' },
        { icon: <TrendingUp />,    color: C.cyan,   label: 'Avg Score',            value: avgScore !== null ? `${avgScore}%` : '—', sub: 'Across graded work' },
    ];

    // ── Navigation helpers ────────────────────────────────────
    const openSubmissions = (assignment) => {
        setActiveAssignment(assignment);
        setView('submissions');
    };
    const openGrading = (submission) => {
        setGradingSubmission(submission);
        setView('grading');
    };
    const onCreated = (newAssignment) => {
        setAssignments(prev => [newAssignment, ...prev]);
        setView('overview');
    };
    const onUpdated = (updated) => {
        setAssignments(prev => prev.map(a => a._id === updated._id ? updated : a));
    };
    const onDeleted = (id) => {
        setAssignments(prev => prev.filter(a => a._id !== id));
    };
    const onGraded = (updatedSub) => {
        setAllSubs(prev => prev.map(s => s._id === updatedSub._id ? updatedSub : s));
        setView('submissions');
    };

    // ── Tab nav items ─────────────────────────────────────────
    const navItems = [
        { key: 'overview',   label: 'Overview',    icon: <BarChart3 size={14} aria-hidden="true" /> },
        { key: 'submissions',label: 'Submissions',  icon: <Users size={14} aria-hidden="true" /> },
        { key: 'late',       label: 'Late',         icon: <AlertTriangle size={14} aria-hidden="true" /> },
        { key: 'analytics',  label: 'Analytics',   icon: <TrendingUp size={14} aria-hidden="true" /> },
    ];

    return (
        <div style={{ fontFamily: "'Outfit', sans-serif" }}>

            {/* ── Page header ──────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '26px' }}>
                <div>
                    <h2 style={{ color: '#1e293b', fontSize: '22px', fontWeight: '800', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ClipboardList size={21} color={C.blue} aria-hidden="true" />
                        Assignment Management
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Create, review, grade, and analyze student assignments across your courses.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => setRefresh(k => k + 1)} style={ghostBtn} aria-label="Refresh">
                        <RefreshCw size={14} aria-hidden="true" /> Refresh
                    </button>
                    <button onClick={() => setView('create')} style={primaryBtn} aria-label="Create new assignment">
                        <Plus size={15} aria-hidden="true" /> New Assignment
                    </button>
                </div>
            </div>

            {/* ── Stat cards ───────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {stats.map((s, i) => <StatCard key={i} {...s} />)}
            </div>

            {/* ── Sub-nav tabs (not shown on create/grading) ── */}
            {view !== 'create' && view !== 'grading' && (
                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e0e7ff', paddingBottom: '0' }}>
                    {navItems.map(n => (
                        <button
                            key={n.key}
                            onClick={() => setView(n.key)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: view === n.key ? `2px solid ${C.blue}` : '2px solid transparent',
                                color: view === n.key ? C.blue : '#64748b',
                                padding: '10px 16px',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '-1px',
                                transition: 'color 0.15s',
                            }}
                        >
                            {n.icon} {n.label}
                        </button>
                    ))}
                    {/* Course selector in nav row */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
                        <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>Course:</span>
                        <select
                            value={selectedCourse?._id || ''}
                            onChange={e => setCourse(courses.find(c => c._id === e.target.value))}
                            style={{ background: '#f8fafc', border: '2px solid #e0e7ff', color: '#1e293b', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', outline: 'none', cursor: 'pointer', maxWidth: '220px' }}
                            aria-label="Select course"
                        >
                            {courses.map(c => <option key={c._id} value={c._id}>{c.courseTitle}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {/* ── Views ────────────────────────────────────── */}
            {view === 'overview' && (
                <AssignmentList
                    assignments={assignments}
                    allSubmissions={allSubmissions}
                    courses={courses}
                    selectedCourse={selectedCourse}
                    onViewSubmissions={openSubmissions}
                    onUpdated={onUpdated}
                    onDeleted={onDeleted}
                    onCreateNew={() => setView('create')}
                />
            )}

            {view === 'create' && (
                <CreateAssignment
                    courses={courses}
                    defaultCourse={selectedCourse}
                    onCreated={onCreated}
                    onCancel={() => setView('overview')}
                />
            )}

            {view === 'submissions' && (
                <SubmissionReviewer
                    assignment={activeAssignment}
                    allSubmissions={allSubmissions}
                    onGrade={openGrading}
                    onBack={() => setView('overview')}
                    onUpdated={(s) => setAllSubs(prev => prev.map(x => x._id === s._id ? s : x))}
                />
            )}

            {view === 'grading' && gradingSubmission && (
                <GradingWorkspace
                    submission={gradingSubmission}
                    assignment={activeAssignment}
                    onGraded={onGraded}
                    onBack={() => setView('submissions')}
                />
            )}

            {view === 'late' && (
                <LateSubmissions
                    assignments={assignments}
                    allSubmissions={allSubmissions}
                    onGrade={openGrading}
                    onAssignmentSelect={setActiveAssignment}
                />
            )}

            {view === 'analytics' && (
                <AssignmentAnalytics
                    assignments={assignments}
                    allSubmissions={allSubmissions}
                />
            )}
        </div>
    );
}
