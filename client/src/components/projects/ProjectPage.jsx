import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ProjectSubmissionUploader from './ProjectSubmissionUploader';

export default function ProjectPage() {
    const { id } = useParams();
    const { colors } = useTheme();
    const [project, setProject] = useState(null);

    useEffect(() => {
        if (!id) return;
        projectService.getById(id).then(res => setProject(res.data.data)).catch(() => {});
    }, [id]);

    return (
        <div style={{ padding: 12 }}>
            {!project ? <div>Loading...</div> : (
                <div style={{ maxWidth: 900 }}>
                    <h2 style={{ margin: 0, color: colors.text }}>{project.title}</h2>
                    <div style={{ color: colors.textMuted, marginTop: 8 }}>{project.description}</div>
                    <div style={{ marginTop: 12 }}>
                        <h4>Objectives</h4>
                        <ul>{(project.objectives||[]).map((o,i)=>(<li key={i}>{o}</li>))}</ul>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <h4>Requirements & Submission</h4>
                        <div dangerouslySetInnerHTML={{ __html: project.requirements }} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <ProjectSubmissionUploader projectId={project._id} />
                    </div>
                </div>
            )}
        </div>
    );
}
