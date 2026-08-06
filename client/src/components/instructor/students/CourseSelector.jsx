import React from 'react';
import { BookOpen, ChevronDown, Users } from 'lucide-react';

export default function CourseSelector({ courses = [], selectedCourse, onSelect, T }) {
    if (courses.length === 0) return null;

    return (
        <div
            style={{
                background: 'rgba(14,23,38,0.65)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(51,65,85,0.45)',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                flexWrap: 'wrap',
            }}
        >
            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={18} color="#3b82f6" aria-hidden="true" />
                </div>
                <div>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected Course</div>
                    <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '700' }}>
                        {selectedCourse?.courseTitle ?? 'Choose a course'}
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '36px', background: 'rgba(51,65,85,0.5)', flexShrink: 0 }} />

            {/* Select */}
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
                <select
                    value={selectedCourse?._id || ''}
                    onChange={e => onSelect(courses.find(c => c._id === e.target.value))}
                    style={{ ...T.select, width: '100%', paddingRight: '36px' }}
                    aria-label="Select course"
                >
                    {courses.map(c => (
                        <option key={c._id} value={c._id}>
                            {c.courseTitle} — {c.level || 'All Levels'}
                        </option>
                    ))}
                </select>
                <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} aria-hidden="true" />
            </div>

            {/* Course meta pills */}
            {selectedCourse && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Users size={12} aria-hidden="true" /> {selectedCourse.totalEnrollments ?? 0} enrolled
                    </span>
                    {selectedCourse.level && (
                        <span style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600' }}>
                            {selectedCourse.level}
                        </span>
                    )}
                    {selectedCourse.averageRating > 0 && (
                        <span style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600' }}>
                             {selectedCourse.averageRating.toFixed(1)}
                        </span>
                    )}
                    <span style={{
                        background: selectedCourse.publicationState === 'Active'
                            ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                        color: selectedCourse.publicationState === 'Active' ? '#10b981' : '#f59e0b',
                        border: `1px solid ${selectedCourse.publicationState === 'Active' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                        borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600'
                    }}>
                        {selectedCourse.publicationState ?? 'Draft'}
                    </span>
                </div>
            )}
        </div>
    );
}
