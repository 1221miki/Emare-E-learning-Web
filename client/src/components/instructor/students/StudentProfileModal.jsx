import React, { useState } from 'react';
import {
    X, Mail, Calendar, BookOpen, TrendingUp, Clock,
    CheckCircle, FileText, Star, MessageSquare, Award,
    BarChart3, PlayCircle, ClipboardList
} from 'lucide-react';

// ── Mini progress bar ────────────────────────────────────────
function Bar({ value, color = '#3b82f6', height = 6 }) {
    return (
        <div style={{ height, borderRadius: '99px', background: 'rgba(51,65,85,0.4)', overflow: 'hidden', flex: 1 }}>
            <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: '99px', transition: 'width 0.7s ease' }} />
        </div>
    );
}

// ── Section header ───────────────────────────────────────────
function SectionTitle({ icon, label }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(51,65,85,0.35)' }}>
            <span style={{ color: '#3b82f6' }}>{React.cloneElement(icon, { size: 17, 'aria-hidden': true })}</span>
            <h4 style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '700', margin: 0 }}>{label}</h4>
        </div>
    );
}

// ── Stat chip ────────────────────────────────────────────────
function Chip({ icon, label, value, color = '#3b82f6' }) {
    return (
        <div style={{ background: `${color}0d`, border: `1px solid ${color}22`, borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                {React.cloneElement(icon, { size: 13, 'aria-hidden': true })}
                <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            </div>
            <div style={{ color, fontSize: '20px', fontWeight: '800' }}>{value}</div>
        </div>
    );
}

// ── Activity timeline entry ──────────────────────────────────
function TimelineItem({ icon, text, time, color = '#3b82f6' }) {
    return (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                {React.cloneElement(icon, { size: 14, color, 'aria-hidden': true })}
            </div>
            <div>
                <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>{text}</div>
                <div style={{ color: '#475569', fontSize: '11px', marginTop: '2px' }}>{time}</div>
            </div>
        </div>
    );
}

export default function StudentProfileModal({ student, grades = [], assignments = [], onClose, onMessage }) {
    const [activeSection, setActiveSection] = useState('overview');

    if (!student) return null;

    // Derived analytics
    const quizGrades  = grades.filter(g =>
        (g.studentRef?._id || g.studentRef) === student.studentId
    );
    const avgScore    = quizGrades.length
        ? Math.round(quizGrades.reduce((a, g) => a + (g.numericalScoreEarned || 0), 0) / quizGrades.length)
        : null;
    const bestScore   = quizGrades.length ? Math.max(...quizGrades.map(g => g.numericalScoreEarned || 0)) : null;
    const failedAttempts = quizGrades.filter(g => (g.numericalScoreEarned || 0) < (g.passingScore || 60)).length;

    const SECTIONS = ['overview', 'analytics', 'activity'];

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '20px' }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Profile: ${student.name}`}
        >
            <div
                style={{ background: 'rgba(13,20,35,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ──────────────────────────────── */}
                <div style={{ padding: '24px 28px 0', position: 'sticky', top: 0, background: 'rgba(13,20,35,0.97)', backdropFilter: 'blur(20px)', zIndex: 2, borderBottom: '1px solid rgba(51,65,85,0.3)', paddingBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        {/* Avatar + name */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            {student.avatar
                                ? <img src={student.avatar} alt={student.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(59,130,246,0.4)' }} />
                                : <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', border: '2px solid rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontWeight: '800', fontSize: '24px' }}>
                                    {student.initials}
                                  </div>
                            }
                            <div>
                                <h3 style={{ color: '#f8fafc', fontSize: '18px', fontWeight: '800', margin: '0 0 4px' }}>{student.name}</h3>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Mail size={12} aria-hidden="true" /> {student.email}
                                    </span>
                                    {student.enrollmentDate && (
                                        <span style={{ color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Calendar size={12} aria-hidden="true" /> Enrolled {new Date(student.enrollmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Close */}
                        <button
                            onClick={onClose}
                            style={{ background: 'rgba(51,65,85,0.4)', border: '1px solid rgba(51,65,85,0.5)', color: '#94a3b8', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            aria-label="Close profile"
                        >
                            <X size={17} aria-hidden="true" />
                        </button>
                    </div>

                    {/* Section tabs */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {SECTIONS.map(sec => (
                            <button
                                key={sec}
                                onClick={() => setActiveSection(sec)}
                                style={{
                                    background: activeSection === sec ? 'rgba(59,130,246,0.18)' : 'transparent',
                                    border: `1px solid ${activeSection === sec ? 'rgba(59,130,246,0.4)' : 'transparent'}`,
                                    color: activeSection === sec ? '#60a5fa' : '#64748b',
                                    borderRadius: '8px',
                                    padding: '7px 16px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {sec}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Body ────────────────────────────────── */}
                <div style={{ padding: '24px 28px 28px' }}>

                    {/* ── OVERVIEW ── */}
                    {activeSection === 'overview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Quick stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                                <Chip icon={<TrendingUp />}     label="Progress"    value={`${student.progress}%`}        color="#3b82f6" />
                                <Chip icon={<Clock />}          label="Watch Time"  value={student.watchTime || '—'}       color="#10b981" />
                                <Chip icon={<Star />}           label="Avg Score"   value={avgScore ? `${avgScore}%` : '—'} color="#f59e0b" />
                                <Chip icon={<ClipboardList />}  label="Submissions" value={student.submissionsCount ?? 0}  color="#8b5cf6" />
                            </div>

                            {/* Progress section */}
                            <div>
                                <SectionTitle icon={<BookOpen />} label="Learning Progress" />
                                <div style={{ background: 'rgba(9,13,22,0.5)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(51,65,85,0.3)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>{student.course}</span>
                                        <span style={{ color: student.progress >= 80 ? '#10b981' : '#f59e0b', fontSize: '13px', fontWeight: '800' }}>{student.progress}% Completed</span>
                                    </div>
                                    <Bar value={student.progress} color={student.progress >= 80 ? '#10b981' : student.progress >= 40 ? '#3b82f6' : '#f59e0b'} height={8} />
                                    <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
                                        {[
                                            { label: 'Completed', value: `${Math.round(student.progress / 10)} lessons` },
                                            { label: 'Remaining', value: `${10 - Math.round(student.progress / 10)} lessons` },
                                            { label: 'Watch Time', value: student.watchTime || '—' },
                                            { label: 'Quiz Score', value: avgScore ? `${avgScore}%` : '—' },
                                        ].map((item, i) => (
                                            <div key={i}>
                                                <div style={{ color: '#475569', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                                                <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '700', marginTop: '2px' }}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Clearance status */}
                            <div style={{ background: student.cleared ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${student.cleared ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <CheckCircle size={20} color={student.cleared ? '#10b981' : '#ef4444'} aria-hidden="true" />
                                <div>
                                    <div style={{ color: student.cleared ? '#10b981' : '#f87171', fontSize: '14px', fontWeight: '700' }}>
                                        Tuition {student.cleared ? 'Cleared' : 'Pending'}
                                    </div>
                                    <div style={{ color: '#475569', fontSize: '12px' }}>
                                        {student.cleared ? 'Full access granted to all course materials.' : 'Payment clearance required to unlock full access.'}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <button
                                onClick={onMessage}
                                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', width: '100%' }}
                                aria-label={`Send message to ${student.name}`}
                            >
                                <MessageSquare size={17} aria-hidden="true" />
                                Send Message to {student.name.split(' ')[0]}
                            </button>
                        </div>
                    )}

                    {/* ── ANALYTICS ── */}
                    {activeSection === 'analytics' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Quiz Performance */}
                            <div>
                                <SectionTitle icon={<BarChart3 />} label="Quiz Performance" />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                                    <Chip icon={<Star />}           label="Avg Score"     value={avgScore ? `${avgScore}%` : '—'}   color="#f59e0b" />
                                    <Chip icon={<TrendingUp />}     label="Best Score"    value={bestScore ? `${bestScore}%` : '—'} color="#10b981" />
                                    <Chip icon={<ClipboardList />}  label="Attempts"      value={quizGrades.length}                  color="#3b82f6" />
                                    <Chip icon={<X />}              label="Failed"        value={failedAttempts}                     color="#ef4444" />
                                </div>
                                {avgScore !== null && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ color: '#64748b', fontSize: '12px' }}>Average Score</span>
                                            <span style={{ color: avgScore >= 80 ? '#10b981' : '#f59e0b', fontSize: '12px', fontWeight: '700' }}>{avgScore}%</span>
                                        </div>
                                        <Bar value={avgScore} color={avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ef4444'} height={8} />
                                    </div>
                                )}
                            </div>

                            {/* Assignment Performance */}
                            <div>
                                <SectionTitle icon={<FileText />} label="Assignment Performance" />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                                    <Chip icon={<CheckCircle />}    label="Completed"  value={quizGrades.filter(g => g.numericalScoreEarned >= 60).length}  color="#10b981" />
                                    <Chip icon={<Clock />}          label="Pending"    value={assignments.length - quizGrades.length > 0 ? assignments.length - quizGrades.length : 0}  color="#f59e0b" />
                                    <Chip icon={<Award />}          label="Avg Grade"  value={avgScore ? `${avgScore}%` : '—'} color="#8b5cf6" />
                                </div>
                            </div>

                            {/* Progress visual */}
                            <div>
                                <SectionTitle icon={<TrendingUp />} label="Course Progress Breakdown" />
                                {[
                                    { label: 'Video Lessons Watched',  value: student.progress, color: '#3b82f6' },
                                    { label: 'Assignments Completed',  value: quizGrades.length > 0 ? Math.round((quizGrades.filter(g => g.numericalScoreEarned >= 60).length / quizGrades.length) * 100) : 0, color: '#10b981' },
                                    { label: 'Quizzes Passed',         value: quizGrades.length > 0 ? Math.round(((quizGrades.length - failedAttempts) / quizGrades.length) * 100) : 0, color: '#8b5cf6' },
                                ].map((item, i) => (
                                    <div key={i} style={{ marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>{item.label}</span>
                                            <span style={{ color: item.color, fontSize: '13px', fontWeight: '700' }}>{item.value}%</span>
                                        </div>
                                        <Bar value={item.value} color={item.color} height={6} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── ACTIVITY ── */}
                    {activeSection === 'activity' && (
                        <div>
                            <SectionTitle icon={<Clock />} label="Learning Activity Timeline" />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {quizGrades.slice(0, 5).map((g, i) => (
                                    <TimelineItem
                                        key={i}
                                        icon={<CheckCircle />}
                                        text={`Submitted ${g.assessmentRef?.quizTitle || 'an assessment'} — Score: ${g.numericalScoreEarned ?? '—'}%`}
                                        time={g.gradedAt ? new Date(g.gradedAt).toLocaleString() : 'Recently'}
                                        color="#10b981"
                                    />
                                ))}
                                {student.lastActivity && (
                                    <TimelineItem
                                        icon={<PlayCircle />}
                                        text="Last seen in course"
                                        time={new Date(student.lastActivity).toLocaleString()}
                                        color="#3b82f6"
                                    />
                                )}
                                {student.enrollmentDate && (
                                    <TimelineItem
                                        icon={<BookOpen />}
                                        text={`Enrolled in ${student.course}`}
                                        time={new Date(student.enrollmentDate).toLocaleString()}
                                        color="#8b5cf6"
                                    />
                                )}
                                {quizGrades.length === 0 && !student.lastActivity && (
                                    <p style={{ color: '#334155', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
                                        No recorded activity yet.
                                    </p>
                                )}
                            </div>

                            {/* Engagement summary */}
                            <div style={{ marginTop: '24px', borderTop: '1px solid rgba(51,65,85,0.3)', paddingTop: '20px' }}>
                                <SectionTitle icon={<Activity aria-hidden="true" />} label="Engagement Summary" />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ background: 'rgba(9,13,22,0.5)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(51,65,85,0.3)' }}>
                                        <div style={{ color: '#475569', fontSize: '12px', marginBottom: '6px' }}>Total Watch Time</div>
                                        <div style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: '800' }}>{student.watchTime || '—'}</div>
                                    </div>
                                    <div style={{ background: 'rgba(9,13,22,0.5)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(51,65,85,0.3)' }}>
                                        <div style={{ color: '#475569', fontSize: '12px', marginBottom: '6px' }}>Overall Progress</div>
                                        <div style={{ color: '#3b82f6', fontSize: '20px', fontWeight: '800' }}>{student.progress}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
