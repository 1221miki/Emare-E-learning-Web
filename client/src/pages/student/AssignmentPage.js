import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { assignmentService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AssignmentPage() {
    const { courseId } = useParams();
    const { colors } = useTheme();
    const [assignments, setAssignments] = useState([]);
    const [mySubmissions, setMySubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [activeAssignment, setActiveAssignment] = useState(null);
    const [fileUrl, setFileUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [studentNotes, setStudentNotes] = useState('');

    const navItems = [
        { label: '← Back to Workspace', path: `/student/learn/${courseId}`, key: 'back' },
        { label: 'Q&A Discussions', path: `/student/discussions/${courseId}`, key: 'qa' },
        { label: 'Assignments', path: `/student/assignments/${courseId}`, key: 'assignments' }
    ];

    useEffect(() => {
        Promise.all([
            assignmentService.getByCourse(courseId),
            assignmentService.getMySubmissions()
        ]).then(([resAssignments, resSubmissions]) => {
            setAssignments(resAssignments.data.data);
            setMySubmissions(resSubmissions.data.data);
        }).catch(console.error).finally(() => setLoading(false));
    }, [courseId]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name);
            setFileUrl(URL.createObjectURL(file)); // Mock URL for frontend demo
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await assignmentService.submit(activeAssignment._id, { fileUrl, fileName, studentNotes });
            alert('Assignment submitted successfully!');
            setActiveAssignment(null);
            setFileUrl('');
            setFileName('');
            setStudentNotes('');
            
            // Refresh submissions
            const res = await assignmentService.getMySubmissions();
            setMySubmissions(res.data.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Submission failed');
        }
    };

    const getSubmissionStatus = (assignmentId) => {
        const sub = mySubmissions.find(s => s.assignmentRef._id === assignmentId || s.assignmentRef === assignmentId);
        return sub;
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg }}>
            <Sidebar navItems={navItems} activeTab="assignments" />
            
            <main style={{ marginLeft: '260px', padding: '40px', flex: 1, maxWidth: '900px' }}>
                <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: '800', marginBottom: '32px' }}>Course Assignments</h1>

                {loading ? (
                    <div style={{ color: colors.textMuted }}>Loading assignments...</div>
                ) : assignments.length === 0 ? (
                    <div style={{ color: colors.textMuted, padding: '40px', textAlign: 'center', border: `1px solid ${colors.border}`, borderRadius: '12px' }}>No assignments for this course.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {assignments.map(a => {
                            const sub = getSubmissionStatus(a._id);
                            const isPastDue = new Date() > new Date(a.dueDate);

                            return (
                                <div key={a._id} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                        <div>
                                            <h3 style={{ color: colors.text, fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>{a.title}</h3>
                                            <div style={{ display: 'flex', gap: '16px', color: colors.textMuted, fontSize: '13px' }}>
                                                <span>Due: {new Date(a.dueDate).toLocaleString()}</span>
                                                <span>Points: {a.maxScore}</span>
                                            </div>
                                        </div>
                                        {sub ? (
                                            <span style={{ background: sub.status === 'Graded' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', color: sub.status === 'Graded' ? '#10b981' : colors.primary, padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>
                                                {sub.status} {sub.grade !== null ? `(${sub.grade}/${a.maxScore})` : ''}
                                            </span>
                                        ) : isPastDue ? (
                                            <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>Past Due</span>
                                        ) : (
                                            <span style={{ background: colors.bgInput, color: colors.textMuted, padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>Not Submitted</span>
                                        )}
                                    </div>
                                    
                                    <p style={{ color: colors.text, fontSize: '15px', lineHeight: 1.6, marginBottom: '20px' }}>{a.description}</p>
                                    
                                    {a.rubricItems?.length > 0 && (
                                        <div style={{ marginBottom: '20px', background: colors.bgInput, padding: '16px', borderRadius: '8px' }}>
                                            <h4 style={{ color: colors.text, margin: '0 0 10px', fontSize: '14px' }}>Grading Rubric</h4>
                                            <ul style={{ margin: 0, paddingLeft: '20px', color: colors.textMuted, fontSize: '13px' }}>
                                                {a.rubricItems.map((r, i) => <li key={i}>{r.criterion} ({r.maxPoints} pts)</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {sub && sub.feedback && (
                                        <div style={{ marginBottom: '20px', background: 'rgba(16,185,129,0.1)', borderLeft: '4px solid #10b981', padding: '16px', borderRadius: '4px' }}>
                                            <h4 style={{ color: '#10b981', margin: '0 0 8px', fontSize: '14px' }}>Instructor Feedback</h4>
                                            <p style={{ margin: 0, color: colors.text, fontSize: '14px', lineHeight: 1.5 }}>{sub.feedback}</p>
                                        </div>
                                    )}

                                    {!sub && !isPastDue && activeAssignment !== a._id && (
                                        <button onClick={() => setActiveAssignment(a)} style={{ background: colors.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Submit Assignment</button>
                                    )}

                                    {activeAssignment === a._id && (
                                        <form onSubmit={handleSubmit} style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '20px', marginTop: '20px' }}>
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Upload File (Mock)</label>
                                                <input type="file" onChange={handleFileChange} required accept={a.allowedFileTypes.map(t => `.${t}`).join(',')} style={{ width: '100%', padding: '10px', background: colors.bgInput, color: colors.text, border: `1px dashed ${colors.border}`, borderRadius: '8px' }} />
                                            </div>
                                            <div style={{ marginBottom: '20px' }}>
                                                <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Comments (Optional)</label>
                                                <textarea value={studentNotes} onChange={e => setStudentNotes(e.target.value)} rows="3" style={{ width: '100%', padding: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', resize: 'vertical' }} />
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <button type="button" onClick={() => setActiveAssignment(null)} style={{ background: 'transparent', color: colors.textMuted, border: 'none', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                                <button type="submit" style={{ background: colors.primary, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Submit to Instructor</button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
