import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, ChevronRight, GraduationCap, Lightbulb, PlayCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import ProfessionalCourseCard from './ProfessionalCourseCard';

export default function MyCoursesHub({ 
    enrollments, 
    allCourses,
    recentlyViewed,
    setActiveTab,
    togglePinCourse,
    pinnedCourses
}) {
    const { colors } = useTheme();
    const navigate = useNavigate();

    const activeCourses = enrollments.filter(e => (e.completionPercentage || 0) < 100);
    const completedCourses = enrollments.filter(e => (e.completionPercentage || 0) >= 100);
    const primaryActive = activeCourses.length > 0 ? activeCourses[0] : null;
    const resumeLabel = primaryActive?.completionPercentage === 0 ? 'Start First Lesson' : 'Continue Learning';
    const resumeButtonText = primaryActive?.completionPercentage === 0 ? 'Start Lesson' : 'Resume Course';

    // Determine recommendations
    const enrolledIds = enrollments.map(e => e.courseRef?._id || e.courseRef);
    const recommendations = allCourses.filter(c => !enrolledIds.includes(c._id)).slice(0, 4);

    const s = {
        hubContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            paddingBottom: '40px'
        },
        section: {
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            border: `1px solid ${colors.border}`
        },
        sectionHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
        },
        sectionTitle: {
            fontSize: '20px',
            fontWeight: '900',
            color: colors.text,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        viewAllBtn: {
            background: 'transparent',
            border: 'none',
            color: colors.primary,
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '8px',
            transition: 'background 0.2s'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
        },
        // Continue Learning specific styles
        resumeBanner: {
            display: 'flex',
            background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`,
            borderRadius: '16px',
            border: `1px solid ${colors.primary}30`,
            padding: '24px',
            gap: '24px',
            alignItems: 'center',
            flexWrap: 'wrap'
        },
        resumeImgBox: {
            width: '160px',
            height: '100px',
            borderRadius: '12px',
            background: colors.bgInput,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px'
        },
        resumeContent: {
            flex: 1,
            minWidth: '280px'
        },
        resumeTitle: {
            fontSize: '22px',
            fontWeight: '900',
            color: colors.text,
            margin: '0 0 12px'
        },
        resumeProgress: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
        },
        resumeBarWrapper: {
            flex: 1,
            height: '8px',
            background: colors.bgInput,
            borderRadius: '4px',
            overflow: 'hidden'
        },
        resumeBtn: {
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'transform 0.2s ease, background 0.2s ease, color 0.2s ease',
            boxShadow: `0 4px 12px ${colors.primary}40`
        }
    };

    return (
        <div style={s.hubContainer}>
            {/* 1. Continue Learning (Prominent Banner) */}
            {primaryActive && (
                <div style={s.resumeBanner}>
                    <div style={s.resumeImgBox}>
                        {primaryActive.courseRef?.thumbnailUrl ? (
                            <img src={primaryActive.courseRef.thumbnailUrl} alt="Thumbnail" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                        ) : <GraduationCap size={40} color={colors.primary} aria-hidden="true" />}
                    </div>
                    <div style={s.resumeContent}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                            {resumeLabel}
                        </span>
                        <h3 style={s.resumeTitle}>{primaryActive.courseRef?.courseTitle}</h3>
                        <div style={s.resumeProgress}>
                            <div style={s.resumeBarWrapper}>
                                <div style={{ height: '100%', width: `${primaryActive.completionPercentage || 0}%`, background: colors.primary }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: colors.primary }}>{primaryActive.completionPercentage || 0}%</span>
                        </div>
                        <button 
                            style={s.resumeBtn}
                            onClick={() => navigate(`/student/learn/${primaryActive.courseRef?._id}`)}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <PlayCircle size={18} aria-hidden="true" />
                            {resumeButtonText}
                            <ChevronRight size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Active Courses Grid */}
            {activeCourses.length > 0 && (
                <div style={s.section}>
                    <div style={s.sectionHeader}>
                        <h3 style={s.sectionTitle}><BookOpen size={20} aria-hidden="true" /> My Active Courses</h3>
                        <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: '700', background: colors.bgInput, padding: '4px 10px', borderRadius: '12px' }}>
                            {activeCourses.length} in progress
                        </span>
                    </div>
                    <div style={s.grid}>
                        {activeCourses.map(enrollment => (
                            <ProfessionalCourseCard key={enrollment._id} enrollment={enrollment} />
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Recommended Courses */}
            {recommendations.length > 0 && (
                <div style={s.section}>
                    <div style={s.sectionHeader}>
                        <h3 style={s.sectionTitle}><Lightbulb size={20} aria-hidden="true" /> Recommended for You</h3>
                    </div>
                    <div style={s.grid}>
                        {recommendations.map(course => (
                            <ProfessionalCourseCard key={course._id} course={course} />
                        ))}
                    </div>
                </div>
            )}

            {/* 4. Completed Courses */}
            {completedCourses.length > 0 && (
                <div style={s.section}>
                    <div style={s.sectionHeader}>
                        <h3 style={s.sectionTitle}><Award size={20} aria-hidden="true" /> Completed Courses</h3>
                        <button 
                            style={s.viewAllBtn}
                            onClick={() => setActiveTab('certificates')}
                            onMouseEnter={e => e.currentTarget.style.background = `${colors.primary}15`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            View Certificates →
                        </button>
                    </div>
                    <div style={s.grid}>
                        {completedCourses.map(enrollment => (
                            <ProfessionalCourseCard key={enrollment._id} enrollment={enrollment} />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {enrollments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: colors.bgCard, borderRadius: '16px', border: `1px dashed ${colors.border}` }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, margin: '0 auto 16px', borderRadius: 20, background: colors.bgInput }}>
                        <BookOpen size={64} color={colors.primary} aria-hidden="true" />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: colors.text, margin: '0 0 12px' }}>Your Learning Journey Starts Here</h2>
                    <p style={{ color: colors.textMuted, fontSize: '15px', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                        Enroll in professional courses and gain the skills needed for today's digital economy.
                    </p>
                </div>
            )}
        </div>
    );
}
