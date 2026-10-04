import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export default function LearningContentAccessChecklist({
    courseId,
    lessonCount = 0,
    taskCount = 0,
    hasCertificate = false,
    liveSessionsCount = null,
    onViewLessons,
    onOpenResources,
    onContinueLearning,
    onViewLiveSessions,
    onOpenDiscussions,
}) {
    const { colors } = useTheme();
    const navigate = useNavigate();

    const actions = {
        viewLessons: onViewLessons || (() => { if (courseId) navigate(`/courses/${courseId}`); }),
        openResources: onOpenResources || (() => { if (courseId) navigate(`/courses/${courseId}`); }),
        continueLearning: onContinueLearning || (() => { if (courseId) navigate(`/student/learn/${courseId}`); }),
        viewLiveSessions: onViewLiveSessions || (() => navigate('/live-sessions')),
        openDiscussions: onOpenDiscussions || (() => { if (courseId) navigate(`/student/discussions/${courseId}`); })
    };

    const tasks = [
        {
            title: 'Watch video lessons',
            description: 'Click a lesson and press play to complete each topic in sequence.',
            frequency: 'Per lesson',
            priority: 'High',
            actionLabel: 'View lessons',
            onClick: actions.viewLessons
        },
        {
            title: 'Read documents',
            description: 'Open lesson PDFs and study guides to reinforce each module.',
            frequency: 'Per module',
            priority: 'High',
            actionLabel: 'Open resources',
            onClick: actions.openResources
        },
        {
            title: 'Download resources',
            description: 'Save course files and cheat sheets to work offline when needed.',
            frequency: 'As needed',
            priority: 'Medium',
            actionLabel: 'Download resources',
            onClick: actions.openResources
        },
        {
            title: 'Access presentations',
            description: 'Open slide decks and PPT files for summary review before exams.',
            frequency: 'Per module',
            priority: 'Medium',
            actionLabel: 'View presentations',
            onClick: actions.openResources
        },
        {
            title: 'Follow lesson order',
            description: 'Complete lessons in order so you master concepts from beginner to advanced.',
            frequency: 'Always',
            priority: 'High',
            actionLabel: 'Follow curriculum',
            onClick: actions.viewLessons
        },
        {
            title: 'Resume learning',
            description: 'Click Continue Learning to return to the last watched lesson automatically.',
            frequency: 'Daily',
            priority: 'High',
            actionLabel: 'Continue learning',
            onClick: actions.continueLearning
        },
        {
            title: 'Access live sessions',
            description: 'Join scheduled webinars and interactive labs from the Live Sessions page.',
            frequency: 'Per schedule',
            priority: 'Medium',
            actionLabel: 'View live sessions',
            onClick: actions.viewLiveSessions
        },
        {
            title: 'Participate in discussions',
            description: 'Visit course discussions to ask questions, reply, and clarify concepts weekly.',
            frequency: 'Weekly',
            priority: 'Low',
            actionLabel: 'Open discussions',
            onClick: actions.openDiscussions
        }
    ];

    return (
        <section style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '24px', marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: '20px', color: colors.text, margin: 0, fontWeight: '900' }}>Learning Content Access</h2>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: '10px 0 0', lineHeight: 1.7 }}>
                        Use these learning actions to stay on track, complete every lesson, and join live class discussions.
                    </p>
                </div>
                <div style={{ display: 'grid', gap: '8px', textAlign: 'right' }}>
                    <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: '700' }}>Course stats</span>
                    <span style={{ color: colors.primary, fontSize: '20px', fontWeight: '900' }}>{lessonCount} Lessons</span>
                    <span style={{ color: colors.textMuted, fontSize: '13px' }}>{taskCount} Tasks • {hasCertificate ? 'Cert available' : 'No cert info'}</span>
                    {liveSessionsCount !== null && <span style={{ color: colors.textMuted, fontSize: '13px' }}>{liveSessionsCount} scheduled live sessions</span>}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginTop: '24px' }}>
                {tasks.map((task) => (
                    <div key={task.title} style={{ background: colors.bgInput, borderRadius: '18px', border: `1px solid ${colors.border}`, padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '170px' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h3 style={{ fontSize: '15px', color: colors.text, fontWeight: '800', margin: 0 }}>{task.title}</h3>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981' }}>{task.priority}</span>
                            </div>
                            <p style={{ color: colors.textMuted, fontSize: '13px', lineHeight: 1.65, margin: 0 }}>{task.description}</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
                            <span style={{ color: colors.textMuted, fontSize: '12px' }}>{task.frequency}</span>
                            <button
                                type="button"
                                onClick={task.onClick}
                                style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                            >
                                {task.actionLabel}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
