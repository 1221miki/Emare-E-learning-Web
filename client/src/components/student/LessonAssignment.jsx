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
import { assignmentService, uploadService } from '../../services/api';
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
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [success, setSuccess] = useState('');
    const [showFullInstructions, setShowFullInstructions] = useState(true);

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

    // Emare AI Tutor restriction
    useEffect(() => {
        if (assignment && assignment.aiTutorEnabled === false) {
            setAiTutorBlocked(AI_TUTOR_BLOCKED_MESSAGE);
            assignmentService.lockAiTutor(assignment._id).catch(() => {});
        }
        return () => clearAiTutorBlocked();
    }, [assignment]);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setIsUploadingFile(true);
        setSubmitError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('targetType', 'student');
            const res = await uploadService.uploadFile(formData);
            const serverUrl = res.data?.data?.url || res.data?.data?.embedUrl || res.data?.data?.directUrl || res.data?.data?.storagePath;
            if (serverUrl) {
                setFileUrl(serverUrl);
            } else {
                setFileUrl(URL.createObjectURL(file));
            }
        } catch (err) {
            console.warn('File upload fallback:', err);
            setFileUrl(URL.createObjectURL(file));
        } finally {
            setIsUploadingFile(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!assignment) return;
        if (isUploadingFile) {
            alert('File is still uploading. Please wait a moment.');
            return;
        }
        setSubmitting(true);
        setSubmitError('');
        try {
            const res = await assignmentService.submit(assignment._id, { fileUrl, fileName, studentNotes });
            setSuccess('Assignment submitted successfully.');
            setSubmission(res.data?.data || { status: 'Submitted', fileName, studentNotes, submittedAt: new Date() });
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
        padding: '20px 24px',
        marginTop: 14,
        animation: 'fadeIn 0.25s ease'
    };

    if (loading) {
        return (
            <div style={{ ...cardStyle, textAlign: 'center', color: muted, fontSize: 13, fontWeight: 600, padding: '24px 20px' }}>
                Loading assignment details…
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

    // ── Already submitted → status card
    if (success || submission) {
        const isApproved = submission?.status === 'Graded' || submission?.status === 'Approved';
        const isRevision = submission?.status === 'Returned' || submission?.status === 'Revision Requested' || submission?.status === 'Returned for Revision';
        const latestFeedback = submission?.feedback?.[submission.feedback.length - 1];

        return (
            <div style={{ ...cardStyle, borderColor: isApproved ? `${green}60` : isRevision ? `${red}60` : `${gold}60`, background: isDark ? 'rgba(15,23,42,0.85)' : '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 24 }}>{isApproved ? '✅' : isRevision ? '↻' : '⏳'}</span>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: text }}>
                                {isApproved ? 'Assignment Approved & Completed' : isRevision ? 'Revision Requested by Instructor' : 'Assignment Submitted'}
                            </div>
                            <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>
                                {isApproved
                                    ? 'Great job! You have satisfied this requirement and can proceed to the next lesson.'
                                    : isRevision
                                        ? 'Your instructor reviewed your submission and requested adjustments. See feedback below.'
                                        : 'Your submission has been received and is waiting for instructor review.'}
                            </div>
                        </div>
                    </div>
                    <span style={{
                        padding: '5px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        background: isApproved ? 'rgba(16,185,129,0.15)' : isRevision ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: isApproved ? green : isRevision ? red : gold
                    }}>
                        {submission?.status || 'Submitted'}
                    </span>
                </div>

                {submission?.grade != null && (
                    <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: green }}>Grade Earned:</span>
                        <strong style={{ fontSize: 18, color: green }}>{submission.grade} / {assignment?.maxScore ?? 100} pts</strong>
                        {assignment?.passingScore != null && (
                            <span style={{ fontSize: 12.5, color: muted }}>
                                ({submission.grade >= assignment.passingScore ? '✓ Passed requirement' : 'Below passing score'})
                            </span>
                        )}
                    </div>
                )}

                {latestFeedback?.comments && (
                    <div style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 10, background: isDark ? 'rgba(30,41,59,0.6)' : '#f0fdf4', border: `1px solid ${border}` }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: text, marginBottom: 4 }}>💬 Instructor Review Notes</div>
                        <div style={{ fontSize: 13.5, color: text, lineHeight: 1.6 }}>{latestFeedback.comments}</div>
                    </div>
                )}

                <div style={{ fontSize: 12.5, color: muted, display: 'flex', gap: 18, flexWrap: 'wrap', borderTop: `1px solid ${border}`, paddingTop: 12, marginTop: 10 }}>
                    {submission?.fileName && (
                        <span>Submitted File: <strong style={{ color: text }}>{submission.fileName}</strong></span>
                    )}
                    {submission?.submittedAt && (
                        <span>Date: <strong style={{ color: text }}>{new Date(submission.submittedAt).toLocaleDateString()}</strong></span>
                    )}
                </div>

                {isRevision && (
                    <button
                        onClick={() => { setSubmission(null); setSuccess(''); }}
                        style={{ marginTop: 16, background: accent, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                    >
                        ↻ Re-submit Assignment
                    </button>
                )}
            </div>
        );
    }

    const rawInstructions = String(assignment.instructions || '').replace(/^Instructions\s*\(Optional\)\s*/i, '').trim();
    const hasAttachments = Array.isArray(assignment.attachments) && assignment.attachments.length > 0;
    const allowedExtensions = Array.isArray(assignment.allowedFileTypes) && assignment.allowedFileTypes.length > 0
        ? assignment.allowedFileTypes
        : ['pdf', 'zip', 'doc', 'docx', 'png', 'jpg', 'sql', 'txt'];

    return (
        <div style={cardStyle}>
            {/* Header Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' }}>
                        📝 LESSON ASSIGNMENT
                    </span>
                    {lessonTitle && <span style={{ fontSize: 13, color: muted, fontWeight: 600 }}>Step 3 — after passing your Knowledge Check</span>}
                </div>
            </div>

            {/* Title & Stats */}
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: text }}>{assignment.title}</h3>
            <div style={{ display: 'flex', gap: 16, color: muted, fontSize: 13, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
                <span><strong>Points:</strong> {assignment.maxScore ?? 100}</span>
                {assignment.passingScore != null && <span><strong>Pass Mark:</strong> {assignment.passingScore}</span>}
                {assignment.dueDate && <span><strong>Due:</strong> {new Date(assignment.dueDate).toLocaleDateString()}</span>}
                {assignment.aiTutorEnabled === false ? (
                    <span style={{ color: red, fontWeight: 700 }}>🔒 AI Tutor disabled</span>
                ) : (
                    <span style={{ color: green, fontWeight: 600 }}>⊡ AI Tutor enabled</span>
                )}
            </div>

            {/* Overview Description */}
            {assignment.description && (
                <div style={{ margin: '0 0 16px', fontSize: 14, color: text, lineHeight: 1.6, background: isDark ? 'rgba(15,23,42,0.4)' : '#f8fafc', padding: '12px 16px', borderRadius: 10, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', marginBottom: 4 }}>Overview</div>
                    <div>{assignment.description}</div>
                </div>
            )}

            {/* Detailed Instructions & Tasks */}
            {rawInstructions && (
                <div style={{
                    marginBottom: 16,
                    background: isDark ? 'rgba(15,23,42,0.7)' : '#f0fdf4',
                    border: `1.5px solid ${isDark ? 'rgba(34,197,94,0.3)' : '#bbf7d0'}`,
                    borderRadius: 12,
                    padding: '16px 18px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: text, fontWeight: 800, fontSize: 14 }}>
                            <span>📋</span>
                            <span>Detailed Instructions & Tasks</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowFullInstructions(!showFullInstructions)}
                            style={{ background: 'transparent', border: 'none', color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                            {showFullInstructions ? 'Collapse ▲' : 'Expand ▼'}
                        </button>
                    </div>
                    {showFullInstructions && (
                        <div style={{
                            color: text,
                            fontSize: 13.5,
                            lineHeight: 1.7,
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'inherit',
                            borderTop: `1px solid ${isDark ? 'rgba(51,65,85,0.6)' : '#dcfce7'}`,
                            paddingTop: 10
                        }}>
                            {rawInstructions}
                        </div>
                    )}
                </div>
            )}

            {/* Starter Files & Attachments */}
            {hasAttachments && (
                <div style={{
                    marginBottom: 16,
                    background: isDark ? 'rgba(30,41,59,0.5)' : '#eff6ff',
                    border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#bfdbfe'}`,
                    borderRadius: 12,
                    padding: '14px 18px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: text, fontWeight: 700, fontSize: 13 }}>
                        <span>📎</span>
                        <span>Instructor Starter Files & Resources</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {assignment.attachments.map((att, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: isDark ? 'rgba(15,23,42,0.6)' : '#fff', padding: '8px 12px', borderRadius: 8, border: `1px solid ${border}` }}>
                                <div style={{ fontSize: 13, color: text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    📄 {att.filename || `Starter Resource ${i + 1}`}
                                </div>
                                <a
                                    href={att.url ? (att.url.includes('?') ? `${att.url}&download=1` : `${att.url}?download=1`) : '#'}
                                    download={att.filename || true}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                                >
                                    Download ⬇
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Grading Rubric */}
            {assignment.rubricItems?.length > 0 && (
                <div style={{ marginBottom: 16, background: isDark ? '#0f172a' : '#f8fafc', padding: '14px 18px', borderRadius: 10, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 8 }}>📊 Grading Rubric</div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: muted, fontSize: 13 }}>
                        {assignment.rubricItems.map((r, i) => <li key={i} style={{ marginBottom: 4 }}><strong>{r.criterion}</strong> — {r.maxPoints} pts</li>)}
                    </ul>
                </div>
            )}

            {/* Submission Form */}
            <form onSubmit={handleSubmit} style={{ borderTop: `1px solid ${border}`, paddingTop: 18, marginTop: 6 }}>
                <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <label style={{ display: 'block', color: text, fontWeight: 700, fontSize: 13.5 }}>
                            Upload submission file *
                        </label>
                        <span style={{ fontSize: 12, color: muted }}>
                            Accepted formats: {allowedExtensions.map(t => `.${t}`).join(', ')}
                        </span>
                    </div>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        required
                        accept={allowedExtensions.map(t => `.${t}`).join(',')}
                        style={{ width: '100%', padding: '10px 12px', background: isDark ? '#0f172a' : '#f8fafc', color: text, border: `1px dashed ${isUploadingFile ? gold : border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                    />
                    {isUploadingFile && (
                        <div style={{ fontSize: 12, color: gold, marginTop: 6, fontWeight: 600 }}>
                            ⏳ Uploading file to storage...
                        </div>
                    )}
                    {fileName && !isUploadingFile && (
                        <div style={{ fontSize: 12, color: green, marginTop: 6, fontWeight: 600 }}>
                            ✓ {fileName} uploaded and ready to submit
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', color: text, marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Comments / Notes for instructor (optional)</label>
                    <textarea
                        value={studentNotes}
                        onChange={e => setStudentNotes(e.target.value)}
                        rows={3}
                        placeholder="Add any context, links, or notes for your instructor…"
                        style={{ width: '100%', padding: 12, background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${border}`, color: text, borderRadius: 8, resize: 'vertical', fontSize: 13.5 }}
                    />
                </div>

                {submitError && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: red, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>⚠ {submitError}</div>
                )}

                <button type="submit" disabled={submitting || isUploadingFile} style={{
                    background: `linear-gradient(135deg, ${green}, #059669)`, color: '#fff', border: 'none',
                    borderRadius: 10, padding: '12px 28px', fontWeight: 800, fontSize: 14,
                    cursor: (submitting || isUploadingFile) ? 'not-allowed' : 'pointer', opacity: (submitting || isUploadingFile) ? 0.7 : 1
                }}>
                    {submitting ? 'Submitting…' : isUploadingFile ? 'Uploading File…' : 'Submit Assignment'}
                </button>
            </form>
        </div>
    );
}