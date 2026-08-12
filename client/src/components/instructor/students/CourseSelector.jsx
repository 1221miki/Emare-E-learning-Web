import React from 'react';
import { BookOpen, ChevronDown, Users } from 'lucide-react';

export default function CourseSelector({ courses = [], selectedCourse, onSelect, T }) {
    if (courses.length === 0) return null;

    return (
        <div
            style={{
                background: '#ffffff',
                backdropFilter: 'blur(12px)',
                border: '2px solid #e0e7ff',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                flexWrap: 'wrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
        >
            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#dbeafe', border: '2px solid #60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={18} color="#1e40af" aria-hidden="true" />
                </div>
                <div>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected Course</div>
                    <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: '700' }}>
                        {selectedCourse?.courseTitle ?? 'Choose a course'}
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: '2px', height: '36px', background: '#e0e7ff', flexShrink: 0 }} />

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
                <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4f46e5', pointerEvents: 'none' }} aria-hidden="true" />
            </div>

            {/* Course meta pills */}
            {selectedCourse && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#dbeafe', color: '#1e40af', border: '2px solid #60a5fa', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                        <Users size={12} aria-hidden="true" /> {selectedCourse.totalEnrollments ?? 0} enrolled
                    </span>
                    {selectedCourse.level && (
                        <span style={{ background: '#f3e8ff', color: '#6d28d9', border: '2px solid #d8b4fe', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600' }}>
                            {selectedCourse.level}
                        </span>
                    )}
                    {selectedCourse.averageRating > 0 && (
                        <span style={{ background: '#fef3c7', color: '#92400e', border: '2px solid #fcd34d', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600' }}>
                             {selectedCourse.averageRating.toFixed(1)}
                        </span>
                    )}
                    <span style={{
                        background: selectedCourse.publicationState === 'Active'
                            ? '#d1fae5' : '#fef3c7',
                        color: selectedCourse.publicationState === 'Active' ? '#065f46' : '#92400e',
                        border: `2px solid ${selectedCourse.publicationState === 'Active' ? '#6ee7b7' : '#fcd34d'}`,
                        borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600'
                    }}>
                        {selectedCourse.publicationState ?? 'Draft'}
                    </span>
                </div>
            )}
        </div>
    );
}
