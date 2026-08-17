import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, ChevronRight, ClipboardList, Lock, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ProfessionalCourseCard({ enrollment, course }) {
    const { colors, theme } = useTheme();
    const navigate = useNavigate();

    // Use course from enrollment if not passed directly (useful when listing active courses)
    const courseData = course || (enrollment ? enrollment.courseRef : {});
    
    if (!courseData || !courseData._id) return null;

    // Derived Data
    const title = courseData.courseTitle || 'Untitled Course';
    const category = courseData.technicalCategory || 'Development';
    const instructorName = courseData.creatorRef?.fullName || 'Emare Instructor';
    const rating = courseData.averageRating || '4.8';
    
    // Progress Data (defaults to 0 if not enrolled)
    const isEnrolled = !!enrollment;
    const progress = enrollment?.completionPercentage || 0;
    const isCompleted = progress >= 100;
    
    // Derived Counts (from curriculumTree)
    const lessonsCount = courseData.curriculumTree ? 
        courseData.curriculumTree.reduce((acc, chapter) => acc + (chapter.lessons?.length || 0), 0) : 10;
    
    // Mock Assignments count since it's requested in UI but maybe not directly on Course schema
    const assignmentsCount = Math.max(1, Math.floor(lessonsCount / 5));

    // UI Configuration
    const getCategoryColor = (cat) => {
        if (cat.includes('Web') || cat.includes('MERN')) return '#3b82f6';
        if (cat.includes('Data') || cat.includes('AI') || cat.includes('Python')) return '#10b981';
        if (cat.includes('Design') || cat.includes('UI')) return '#ec4899';
        if (cat.includes('Cyber') || cat.includes('Security')) return '#ef4444';
        return colors.primary;
    };
    
    const catColor = getCategoryColor(category);

    const s = {
        card: {
            background: colors.bgCard,
            borderRadius: '16px',
            overflow: 'hidden',
            border: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            height: '100%',
            position: 'relative'
        },
        imageContainer: {
            height: '160px',
            width: '100%',
            background: `linear-gradient(135deg, ${catColor}20, ${catColor}40)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
        },
        image: {
            width: '100%',
            height: '100%',
            objectFit: 'cover'
        },
        badge: {
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: catColor,
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
        },
        content: {
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1
        },
        title: {
            fontSize: '16px',
            fontWeight: '800',
            color: colors.text,
            margin: '0 0 8px',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
        },
        instructor: {
            fontSize: '13px',
            color: colors.textMuted,
            fontWeight: '600',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
        },
        stars: {
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#f59e0b',
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '16px'
        },
        progressWrapper: {
            marginBottom: '16px'
        },
        progressHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: '700',
            color: colors.text,
            marginBottom: '6px'
        },
        progressBarContainer: {
            height: '8px',
            background: colors.bgInput,
            borderRadius: '4px',
            overflow: 'hidden'
        },
        progressBar: {
            height: '100%',
            background: isCompleted ? colors.success : colors.primary,
            width: `${progress}%`,
            transition: 'width 0.5s ease'
        },
        metaRow: {
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '16px',
            borderTop: `1px solid ${colors.border}`,
            marginBottom: '20px'
        },
        metaItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: colors.textMuted,
            fontWeight: '600'
        },
        actionBtn: {
            marginTop: 'auto',
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: isCompleted ? `${colors.success}15` : (isEnrolled ? colors.primary : colors.bgInput),
            color: isCompleted ? colors.success : (isEnrolled ? '#fff' : colors.text),
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
        }
    };

    return (
        <div 
            style={s.card}
            onClick={() => navigate(isEnrolled ? `/student/learn/${courseData._id}` : `/courses/${courseData._id}`)}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = `0 12px 24px rgba(0,0,0,0.1)`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div style={s.imageContainer}>
                {courseData.thumbnailUrl ? (
                    <img src={courseData.thumbnailUrl} alt={title} style={s.image} />
                ) : (
                    <BookOpen size={48} color={colors.primary} aria-hidden="true" />
                )}
                <span style={s.badge}>{category}</span>
            </div>

            <div style={s.content}>
                <h3 style={s.title} title={title}>{title}</h3>
                
                <div style={s.instructor}>
                    <User size={16} aria-hidden="true" /> {instructorName}
                </div>

                <div style={s.stars}>
                    {''.repeat(Math.floor(rating))}{''.repeat(5 - Math.floor(rating))} 
                    <span style={{ color: colors.textMuted, marginLeft: '4px' }}>({rating})</span>
                </div>

                {isEnrolled && (
                    <div style={s.progressWrapper}>
                        <div style={s.progressHeader}>
                            <span>{isCompleted ? 'Completed' : 'Course Progress'}</span>
                            <span style={{ color: isCompleted ? colors.success : colors.primary }}>{progress}%</span>
                        </div>
                        <div style={s.progressBarContainer}>
                            <div style={s.progressBar} />
                        </div>
                    </div>
                )}

                <div style={s.metaRow}>
                    <div style={s.metaItem}>
                        <BookOpen size={16} aria-hidden="true" /> {lessonsCount} Lessons
                    </div>
                    <div style={s.metaItem}>
                        <ClipboardList size={16} aria-hidden="true" /> {assignmentsCount} Tasks
                    </div>
                    <div style={s.metaItem}>
                        {isCompleted ? <Award size={16} title="Certificate Earned" aria-hidden="true" /> : <Lock size={16} title="Certificate Locked" aria-hidden="true" />}
                        Cert
                    </div>
                </div>

                <button 
                    style={s.actionBtn}
                    onMouseEnter={e => { if(isEnrolled && !isCompleted) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseLeave={e => { if(isEnrolled && !isCompleted) e.currentTarget.style.filter = 'none'; }}
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(isEnrolled ? `/student/learn/${courseData._id}` : `/courses/${courseData._id}`);
                    }}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {isCompleted ? 'Review Course' : isEnrolled ? (progress === 0 ? 'Start First Lesson' : 'Continue Learning') : 'View Course'}
                        <ChevronRight size={16} aria-hidden="true" />
                    </span>
                </button>
            </div>
        </div>
    );
}
