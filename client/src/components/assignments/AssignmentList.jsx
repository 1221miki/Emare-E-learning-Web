import React, { useEffect, useState } from 'react';
import { assignmentService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AssignmentList({ courseId }) {
    const { colors } = useTheme();
    const [assignments, setAssignments] = useState([]);

    useEffect(() => {
        if (!courseId) return;
        assignmentService.getByCourse(courseId).then(res => setAssignments(res.data.data)).catch(() => {});
    }, [courseId]);

    return (
        <div style={{ background: colors.bgCard, padding: 12, borderRadius: 10, border: `1px solid ${colors.border}` }}>
            <h4 style={{ margin: '0 0 8px 0', color: colors.text }}>Assignments</h4>
            {assignments.length === 0 ? (
                <div style={{ color: colors.textMuted }}>No assignments yet.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {assignments.map(a => (
                        <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderRadius: 8, background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                            <div>
                                <div style={{ fontWeight: 800, color: colors.text }}>{a.title}</div>
                                <div style={{ fontSize: 12, color: colors.textMuted }}>{a.dueDate ? new Date(a.dueDate).toLocaleString() : 'No due date'}</div>
                            </div>
                            <div>
                                <a href={`/student/assignments/${a._id}`} style={{ color: colors.primary, fontWeight: 800 }}>Open</a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
