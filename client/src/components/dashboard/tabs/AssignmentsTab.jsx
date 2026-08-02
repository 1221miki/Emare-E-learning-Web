import React from 'react';
import { assignmentService, uploadService } from '../../../services/api';

export default function AssignmentsTab(dash) {
    const { colors, notifications, assignmentsList, mySubmissions, setMySubmissions, assignmentSubmitText, setAssignmentSubmitText, assignmentFile, setAssignmentFile, submittingAssignmentId, setSubmittingAssignmentId, assignmentMsg, setAssignmentMsg, triggerAssistantPrompt, styles } = dash;
        const handleAssignmentSubmit = async (assignmentId, courseId) => {
            setAssignmentMsg('');
            if (!assignmentSubmitText && !assignmentFile) {
                setAssignmentMsg('Please add a submission text or file.');
                return;
            }
            try {
                setSubmittingAssignmentId(assignmentId);
                let fileUrl = null;
                if (assignmentFile) {
                    const fd = new FormData();
                    fd.append('file', assignmentFile);
                    const uploadRes = await uploadService.uploadFile(fd);
                    fileUrl = uploadRes.data.data.url;
                }
                await assignmentService.submit(assignmentId, {
                    submissionText: assignmentSubmitText,
                    fileUrl,
                    courseRef: courseId
                });
                setAssignmentMsg('✅ Assignment submitted successfully!');
                setAssignmentSubmitText('');
                setAssignmentFile(null);
                // Refresh submissions
                try {
                    const subRes = await assignmentService.getMySubmissions();
                    setMySubmissions(subRes.data.data || []);
                } catch { /* refresh failure is non-fatal */ }
            } catch(err) {
                setAssignmentMsg('❌ ' + (err.response?.data?.message || 'Submission failed. Please try again.'));
            } finally {
                setSubmittingAssignmentId(null);
            }
        };

        const submittedIds = mySubmissions.map(s => s.assignmentRef || s.assignment?._id);

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={styles.tabTitle}>📝 Assignments & Submissions</h2>
                    <p style={styles.tabSubtitle}>View all your assignments from enrolled courses and submit your work</p>
                </div>

                {assignmentMsg && (
                    <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', background: assignmentMsg.includes('✅') ? `${colors.success}15` : `${colors.danger}15`, color: assignmentMsg.includes('✅') ? colors.success : '#ef4444', border: `1px solid ${assignmentMsg.includes('✅') ? colors.success + '40' : '#ef444440'}` }}>
                        {assignmentMsg}
                    </div>
                )}

                {assignmentsList.length === 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start' }}>
                        <div style={{ ...styles.panelCard, padding: '32px', textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                            <h3 style={{ color: colors.text, fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>No assignments yet</h3>
                            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '24px', lineHeight: '1.6' }}>
                                Your enrolled courses do not currently have assignment tasks posted. Keep learning, and the system will notify you when new work is available.
                            </p>
                            <button type="button" onClick={() => triggerAssistantPrompt('Generate a practice assignment')} style={styles.resumeBtn}>
                                Generate a practice assignment
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ ...styles.panelCard, padding: '20px' }}>
                                <h4 style={{ ...styles.panelCardTitle, fontSize: '15px', marginBottom: '10px' }}>Recommended Practice</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {['Build a responsive landing page', 'Create a JavaScript quiz app', 'Write a component library', 'Review a Git workflow'].map((item) => (
                                        <div key={item} style={{ padding: '12px 14px', background: colors.bgInput, borderRadius: '12px', border: `1px solid ${colors.border}`, color: colors.text }}>
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ ...styles.panelCard, padding: '20px', background: `${colors.primary}08`, border: `1px solid ${colors.primary}20` }}>
                                <h4 style={{ ...styles.panelCardTitle, fontSize: '15px', marginBottom: '10px' }}>Recent Announcements</h4>
                                {(notifications.slice(0, 2).length > 0 ? notifications.slice(0, 2) : [
                                    { _id: 'demo1', title: 'Live review session coming soon', message: 'Join the live lab for React hooks next week.' },
                                    { _id: 'demo2', title: 'Certificate pathway unlocked', message: 'Complete 3 courses to earn the Professional badge.' }
                                ]).map((note) => (
                                    <div key={note._id} style={{ marginBottom: '10px' }}>
                                        <strong style={{ display: 'block', color: colors.text }}>{note.title}</strong>
                                        <span style={{ color: colors.textMuted, fontSize: '12px' }}>{note.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {assignmentsList.map((asgn) => {
                            const isSubmitted = submittedIds.includes(asgn._id);
                            const isOverdue = asgn.dueDate && new Date(asgn.dueDate) < new Date();
                            return (
                                <div key={asgn._id} style={{ ...styles.panelCard, marginBottom: 0, padding: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: '700', margin: 0 }}>{asgn.title || 'Assignment Task'}</h3>
                                                {isSubmitted && <span style={{ background: `${colors.success}15`, color: colors.success, padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>✓ SUBMITTED</span>}
                                                {!isSubmitted && isOverdue && <span style={{ background: '#ef444415', color: '#ef4444', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>⚠ OVERDUE</span>}
                                                {!isSubmitted && !isOverdue && <span style={{ background: `${colors.warning}15`, color: colors.warning, padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>⏳ PENDING</span>}
                                            </div>
                                            <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 6px', lineHeight: '1.5' }}>{asgn.description || asgn.instructions}</p>
                                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: colors.textMuted }}>
                                                {asgn.dueDate && <span>📅 Due: <strong style={{ color: isOverdue ? '#ef4444' : colors.text }}>{new Date(asgn.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>}
                                                {asgn.totalMarks && <span>🎯 Max Marks: <strong style={{ color: colors.text }}>{asgn.totalMarks}</strong></span>}
                                            </div>
                                        </div>
                                    </div>

                                    {!isSubmitted && (
                                        <div style={{ marginTop: '16px', padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                            <h4 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', margin: '0 0 12px' }}>Submit Your Work</h4>
                                            <textarea
                                                rows="4"
                                                placeholder="Describe your solution, paste GitHub links, or summarize your approach..."
                                                value={submittingAssignmentId === asgn._id ? assignmentSubmitText : ''}
                                                onChange={e => { setSubmittingAssignmentId(asgn._id); setAssignmentSubmitText(e.target.value); }}
                                                style={{ ...styles.input, width: '100%', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }}
                                            />
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <label style={{ cursor: 'pointer', background: `${colors.primary}15`, border: `1px dashed ${colors.primary}`, color: colors.primary, padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    📎 {assignmentFile?.name || 'Attach File (PDF/ZIP/DOC)'}
                                                    <input type="file" style={{ display: 'none' }} onChange={e => setAssignmentFile(e.target.files[0])} />
                                                </label>
                                                <button
                                                    onClick={() => handleAssignmentSubmit(asgn._id, asgn.courseRef)}
                                                    disabled={submittingAssignmentId === asgn._id && !assignmentSubmitText}
                                                    style={{ ...styles.resumeBtn, padding: '8px 20px', fontSize: '13px' }}
                                                >
                                                    {submittingAssignmentId === asgn._id ? 'Submitting...' : 'Submit Assignment'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {isSubmitted && (() => {
                                        const mySubmission = mySubmissions.find(s => (s.assignmentRef || s.assignment?._id) === asgn._id);
                                        return mySubmission ? (
                                            <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: `${colors.success}08`, border: `1px solid ${colors.success}30` }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <span style={{ fontSize: '13px', color: colors.success, fontWeight: '700' }}>✓ Submitted on {new Date(mySubmission.createdAt || Date.now()).toLocaleDateString()}</span>
                                                        {mySubmission.grade && <span style={{ marginLeft: '16px', fontSize: '13px', color: colors.primary, fontWeight: '700' }}>Grade: {mySubmission.grade}/100</span>}
                                                    </div>
                                                    {mySubmission.feedback && <span style={{ fontSize: '12px', color: colors.textMuted }}>Feedback: {mySubmission.feedback}</span>}
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
}
