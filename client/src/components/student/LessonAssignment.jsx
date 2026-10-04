/**
 * LessonAssignment.jsx
 *
 * In-workspace lesson assignment — the assignment linked to the CURRENT lesson,
 * embedded in the Learning Workspace. Rendered after the lesson quiz is passed.
 * Students upload/submit here and continue to the next lesson without ever
 * leaving the workspace.
 *
 * The backend still enforces the quiz → assignment gate on submit.
 */
import React, { useEffect, useState } from 'react';
import { assignmentService } from '../../services/api';
import { setAiTutorBlocked, clearAiTutorBlocked, AI_TUTOR_BLOCKED_MESSAGE } from '../../utils/aiTutorBlock';

export default function LessonAssignment({ courseId, assignmentId, lessonTitle, isDark, onSubmitted }) {
    const bgCard = isDark ? '#1e293b' : '#ffffff';
    const border = isDark ? '#334155' : '#e2e8f0';
    const text   = isDark ? '#f1f5f9' : '#0f172a';
    const muted  = isDark ? '#94a3b8' : '#64748b';
    const green  = '#10b981';
    const gold   = '#f59e0b';
    const red    = '#ef4444';
    const accent = '#22c55e';

    const [assignment, setAssignment] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [studentNotes, setStudentNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!assignmentId) return;
        let cancelled = false;
        Promise.all([
            assignmentService.getByCourse(courseId),
            assignmentService.getMySubmissions()
        ])
            .then(([resAssignments, resSubmissions]) => {
                if (cancelled) return;
                const found = (resAssignments.data?.data || []).find(a => String(a._id) === String(assignmentId));
                setAssignment(found || null);
                setSubmission((resSubmissions.data?.data || []).find(s =>
                    s.assignmentRef?._id ? String(s.assignmentRef._id) === String(assignmentId)
                                        : String(s.assignmentRef) === String(assignmentId)
                ) || null);
            })
            .catch(err => {
                if (!cancelled) setLoadError(err.response?.data?.message || 'Could not load the assignment.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [courseId, assignmentId]);

    // Emare AI Tutor restriction — register the server-side block when a
    // restricted assignment gets opened for submission.
    useEffect(() => {
        if (assignment && assignment.aiTutorEnabled === false) {
            setAiTutorBlocked(AI_TUTOR_BLOCKED_MESSAGE);
            assignmentService.lockAiTutor(assignment._id).catch(() => {});
        }
        return () => clearAiTutorBlocked();
    }, [assignment]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setFileUrl(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!assignment) return;
        setSubmitting(true);
        setSubmitError('');
        try {
            await assignmentService.submit(assignment._id, { fileUrl, fileName, studentNotes });
            setSuccess('Assignment submitted successfully.');
            setFileUrl('');
            setFileName('');
            setStudentNotes('');
            onSubmitted?.();
        } catch (err) {
            const isLocked = err.response?.status === 403 && err.response?.data?.lessonLocked;
            setSubmitError(isLocked
                ? (err.response?.data?.lockReason || err.response?.data?.message)
                : (err.response?.data?.message || 'Submission failed. Please try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    const cardStyle = {
        background: bgCard,
        border: `1px solid ${border}`,
        borderRadius: 14,
        padding: '18px 20px 20px',
        marginTop: 14,
        animation: 'fadeIn 0.25s ease'
    };

    if (loading) {
        return (
            <div style={{ ...cardStyle, textAlign: 'center', color: muted, fontSize: 13, fontWeight: 600, padding: '24px 20px' }}>
                Loading assignment…
            </div>
        );
    }

    if (loadError || !assignment) {
        return (
            <div style={{ ...cardStyle, borderColor: isDark ? 'rgba(239,68,68,0.35)' : '#fca5a5', textAlign: 'center', color: red, fontSize: 13, fontWeight: 600, padding: '24px 20px' }}>
                ⚠ {loadError || 'This assignment could not be found. Ask your instructor.'}
            </div>
        );
    }

    // ── Already submitted (or race condition) → status card
    if (success || submission) {
        return (
            <div style={{ ...cardStyle, borderColor: `${green}50`, background: isDark ? 'rgba(16,185,129,0.06)' : '#f0fdf4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: green, fontWeight: 900, fontSize: 18 }}>✓</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: text }}>
                            {success || 'Assignment submitted successfully.'}
                        </div>
                        {!success && (
                            <div style={{ fontSize: 12.5, color: muted, marginTop: 3, lineHeight: 1.5 }}>
                                Status: <strong style={{ color: assignment?.status === 'Graded' ? green : gold }}>
                                    {submission?.status === 'Graded'
                                        ? `Approved${submission.grade != null ? ` (${submission.grade}/${assignment?.maxScore ?? '—'})` : ''}`
                                        : submission?.status || 'Submitted'}
                                </strong>
                                {submission?.status && submission.status !== 'Graded' && ' — your instructor will review it.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' }}>
                        📝 LESSON ASSIGNMENT
                    </span>
                    {lessonTitle && <span style={{ fontSize: 13, color: muted, fontWeight: 600 }}>Step 3 — after passing your Knowledge Check</span>}
                </div>
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: text }}>{assignment.title}</h3>
            <div style={{ display: 'flex', gap: 14, color: muted, fontSize: 12.5, flexWrap: 'wrap', marginBottom: 8 }}>
                <span>Points: {assignment.maxScore ?? 100}</span>
                {assignment.passingScore != null && <span>Pass: {assignment.passingScore}</span>}
                {assignment.aiTutorEnabled === false ? (
                    <span style={{ color: red, fontWeight: 700 }}>🔒 AI Tutor disabled</span>
                ) : (
                    <span style={{ color: green, fontWeight: 600 }}>⊡ AI Tutor enabled</span>
                )}
            </div>

            {assignment.description && (
                <p style={{ margin: '0 0 14px', fontSize: 14, color: muted, lineHeight: 1.6 }}>{assignment.description}</p>
            )}

            {assignment.rubricItems?.length > 0 && (
                <div style={{ marginBottom: 14, background: isDark ? '#0f172a' : '#f8fafc', padding: '12px 16px', borderRadius: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 6 }}>Grading Rubric</div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: muted, fontSize: 12.5 }}>
                        {assignment.rubricItems.map((r, i) => <li key={i}>{r.criterion} ({r.maxPoints} pts)</li>)}
                    </ul>
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ borderTop: `1px solid ${border}`, paddingTop: 16, marginTop: 4 }}>
                <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', color: text, marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Upload file</label>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        required
                        accept={(assignment.allowedFileTypes || []).map(t => `.${t}`).join(',')}
                        style={{ width: '100%', padding: 10, background: isDark ? '#0f172a' : '#f8fafc', color: text, border: `1px dashed ${border}`, borderRadius: 8, fontSize: 13 }}
                    />
                    {fileName && <div style={{ fontSize: 12, color: green, marginTop: 5, fontWeight: 600 }}>✓ {fileName} ready to submit</div>}
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', color: text, marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Comments (optional)</label>
                    <textarea
                        value={studentNotes}
                        onChange={e => setStudentNotes(e.target.value)}
                        rows={3}
                        placeholder="Add a note for your instructor…"
                        style={{ width: '100%', padding: 12, background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${border}`, color: text, borderRadius: 8, resize: 'vertical', fontSize: 13.5 }}
                    />
                </div>

                {submitError && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: red, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>⚠ {submitError}</div>
                )}

                <button type="submit" disabled={submitting} style={{
                    background: `linear-gradient(135deg, ${green}, #059669)`, color: '#fff', border: 'none',
                    borderRadius: 10, padding: '12px 28px', fontWeight: 800, fontSize: 14,
                    cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1
                }}>
                    {submitting ? 'Submitting…' : 'Submit Assignment'}
                </button>
            </form>
        </div>
    );
}