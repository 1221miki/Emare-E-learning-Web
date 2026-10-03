import React, { useEffect, useState } from 'react';
import { projectService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function ProjectList({ courseId }) {
    const { colors } = useTheme();
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        if (!courseId) return;
        projectService.getByCourse(courseId).then(res => setProjects(res.data.data)).catch(() => {});
    }, [courseId]);

    return (
        <div style={{ background: colors.bgCard, padding: 12, borderRadius: 10, border: `1px solid ${colors.border}` }}>
            <h4 style={{ margin: '0 0 8px 0', color: colors.text }}>Projects</h4>
            {projects.length === 0 ? <div style={{ color: colors.textMuted }}>No projects assigned.</div> : (
                projects.map(p => (
                    <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderRadius: 8, background: colors.bgInput, border: `1px solid ${colors.border}`, marginBottom: 8 }}>
                        <div>
                            <div style={{ fontWeight: 800, color: colors.text }}>{p.title}</div>
                            <div style={{ fontSize: 12, color: colors.textMuted }}>{p.difficulty} • {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'No due date'}</div>
                        </div>
                        <div><a href={`/student/projects/${p._id}`} style={{ color: colors.primary, fontWeight: 800 }}>Open</a></div>
                    </div>
                ))
            )}
        </div>
    );
}
