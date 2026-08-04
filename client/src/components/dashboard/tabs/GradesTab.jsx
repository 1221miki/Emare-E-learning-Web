import React from 'react';
import { BarChart3, FileText } from 'lucide-react';

export default function GradesTab(dash) {
    const { colors, grades, completedCoursesCount, styles } = dash;
        const avgScore = grades.filter(g => g.isGraded).length > 0
            ? Math.round(grades.filter(g => g.isGraded).reduce((acc, g) => acc + (g.numericalScoreEarned || 0), 0) / grades.filter(g => g.isGraded).length)
            : 0;
        const gradedCount = grades.filter(g => g.isGraded).length;
        const pendingCount = grades.filter(g => !g.isGraded).length;

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={{ ...styles.tabTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={20} aria-hidden="true" /> Grades &amp; Academic Performance
                    </h2>
                    <p style={styles.tabSubtitle}>Track your academic standing and assessment history</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.primary}`, padding: '16px' }}>
                        <span style={{ ...styles.statValue, color: colors.primary, fontSize: '28px' }}>{avgScore}%</span>
                        <span style={styles.statLabel}>Average Score</span>
                    </div>
                    <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.success}`, padding: '16px' }}>
                        <span style={{ ...styles.statValue, color: colors.success, fontSize: '28px' }}>{gradedCount}</span>
                        <span style={styles.statLabel}>Graded Items</span>
                    </div>
                    <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.warning}`, padding: '16px' }}>
                        <span style={{ ...styles.statValue, color: colors.warning, fontSize: '28px' }}>{pendingCount}</span>
                        <span style={styles.statLabel}>Awaiting Grade</span>
                    </div>
                    <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.accent}`, padding: '16px' }}>
                        <span style={{ ...styles.statValue, color: colors.accent, fontSize: '28px' }}>{completedCoursesCount}</span>
                        <span style={styles.statLabel}>Courses Completed</span>
                    </div>
                </div>

                {grades.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <FileText size={48} color={colors.textMuted} style={{ marginBottom: '16px' }} aria-hidden="true" />
                        <p style={styles.emptyText}>No graded submissions yet. Submit assignments and take quizzes to see your grades here.</p>
                    </div>
                ) : (
                    <div style={styles.tableCard}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.thRow}>
                                    <th style={styles.th}>Assessment</th>
                                    <th style={styles.th}>Type</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Score</th>
                                    <th style={styles.th}>Grade</th>
                                    <th style={styles.th}>Instructor Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grades.map((grade) => {
                                    const score = grade.numericalScoreEarned || 0;
                                    const letterGrade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
                                    const gradeColor = score >= 70 ? colors.success : score >= 60 ? colors.warning : '#ef4444';
                                    return (
                                        <tr key={grade._id} style={styles.tr}>
                                            <td style={styles.td}><strong>{grade.assessmentRef?.quizTitle || grade.assessmentRef?.title || 'Assessment Task'}</strong></td>
                                            <td style={styles.td}><span style={{ ...styles.courseBadge, margin: 0 }}>{grade.assessmentType || 'Quiz'}</span></td>
                                            <td style={styles.td}>
                                                <span style={{ background: grade.isGraded ? `${colors.success}15` : `${colors.warning}15`, color: grade.isGraded ? colors.success : colors.warning, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                                                    {grade.isGraded ? 'Graded' : 'Awaiting'}
                                                </span>
                                            </td>
                                            <td style={styles.tdScore}>{grade.isGraded ? `${score}/100` : '—'}</td>
                                            <td style={{ ...styles.td, fontWeight: '800', color: gradeColor, fontSize: '16px' }}>{grade.isGraded ? letterGrade : '—'}</td>
                                            <td style={{ ...styles.td, color: colors.textMuted, fontSize: '12px' }}>{grade.instructorReviewNotes || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
}
