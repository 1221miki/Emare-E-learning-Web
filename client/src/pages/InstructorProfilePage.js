import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { courseService, userService } from '../services/api';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

export default function InstructorProfilePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { colors, theme } = useTheme();

    const [instructor, setInstructor] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInstructor = async () => {
            setLoading(true);
            try {
                const [instrRes, coursesRes] = await Promise.all([
                    userService.getById(id),
                    courseService.getAll()
                ]);
                const instrData = instrRes.data.data;
                setInstructor(instrData);
                // Filter courses by this instructor
                const allCourses = coursesRes.data?.data || [];
                const instrCourses = allCourses.filter(c => c.creatorRef?._id === id || c.creatorRef === id);
                setCourses(instrCourses);
            } catch (err) {
                console.error('Failed to load instructor:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchInstructor();
    }, [id]);

    const s = {
        page: { minHeight: '100vh', background: colors.bg, fontFamily: "'Outfit', 'Inter', sans-serif" },
        container: { maxWidth: '1100px', margin: '0 auto', padding: '60px 24px' },
        card: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '48px', marginBottom: '40px', display: 'flex', gap: '48px', alignItems: 'flex-start' },
        avatar: { width: '140px', height: '140px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px', fontWeight: '900', color: '#fff', flexShrink: 0 },
        name: { fontSize: '32px', fontWeight: '900', margin: '0 0 6px', color: colors.text },
        title: { color: colors.textMuted, fontSize: '16px', margin: '0 0 20px' },
        statsRow: { display: 'flex', gap: '32px', marginBottom: '24px' },
        stat: { textAlign: 'center' },
        statVal: { display: 'block', fontSize: '22px', fontWeight: '800', color: colors.text },
        statLbl: { fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase', fontWeight: '600' },
        bio: { color: colors.textMuted, fontSize: '15px', lineHeight: 1.8, margin: '0 0 20px' },
        tagRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
        tag: { background: `${colors.primary}15`, color: colors.primary, border: `1px solid ${colors.primary}30`, padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
        sectionTitle: { fontSize: '24px', fontWeight: '800', margin: '0 0 24px', color: colors.text },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
        courseCard: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' },
        courseImg: { height: '160px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' },
        courseBody: { padding: '20px' },
        courseTitle: { fontSize: '16px', fontWeight: '700', color: colors.text, margin: '0 0 6px' },
        courseMeta: { display: 'flex', gap: '10px', fontSize: '13px', color: colors.textMuted, alignItems: 'center', margin: '8px 0 12px' },
        coursePrice: { fontWeight: '800', fontSize: '18px', color: colors.text },
        badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' },
        backBtn: { display: 'inline-flex', alignItems: 'center', gap: '8px', color: colors.textMuted, textDecoration: 'none', fontSize: '14px', fontWeight: '600', marginBottom: '32px', cursor: 'pointer', background: 'none', border: 'none', padding: 0 },
        emptyState: { textAlign: 'center', padding: '60px', color: colors.textMuted, background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}` },
        infoSection: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '32px', marginBottom: '32px' },
        infoTitle: { fontSize: '18px', fontWeight: '700', color: colors.text, margin: '0 0 16px' },
        infoText: { color: colors.textMuted, fontSize: '14px', lineHeight: 1.8, margin: 0 }
    };

    if (loading) return (
        <div style={s.page}>
            <Navbar />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: colors.textMuted, fontSize: '16px' }}>
                Loading instructor profile...
            </div>
        </div>
    );

    if (!instructor) return (
        <div style={s.page}>
            <Navbar />
            <div style={{ ...s.container, textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
                <h2 style={{ color: colors.text }}>Instructor not found</h2>
                <button onClick={() => navigate('/courses')} style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', marginTop: '16px' }}>
                    Browse Courses
                </button>
            </div>
        </div>
    );

    const totalStudents = courses.reduce((acc, c) => acc + (c.totalEnrollments || 0), 0);
    const avgRating = courses.length
        ? (courses.reduce((acc, c) => acc + (c.averageRating || 4.8), 0) / courses.length).toFixed(1)
        : '4.8';

    return (
        <div style={s.page}>
            <Navbar />
            <div style={s.container}>
                {/* Back Button */}
                <button style={s.backBtn} onClick={() => navigate(-1)}>
                    ← Back
                </button>

                {/* Profile Header Card */}
                <div style={s.card}>
                    <div style={s.avatar}>
                        {instructor.profilePhotoUrl
                            ? <img src={instructor.profilePhotoUrl} alt={instructor.fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            : instructor.fullName?.[0]?.toUpperCase()
                        }
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={s.name}>{instructor.fullName}</h1>
                        <p style={s.title}>{instructor.qualifications || 'Expert Instructor at Emare ICT Hub'}</p>

                        {/* Stats */}
                        <div style={s.statsRow}>
                            {[
                                { val: courses.length, lbl: 'Courses' },
                                { val: `${totalStudents.toLocaleString()}+`, lbl: 'Students' },
                                { val: `★ ${avgRating}`, lbl: 'Rating' },
                                { val: instructor.workExperience || '5+', lbl: 'Yrs Experience' }
                            ].map((st, i) => (
                                <div key={i} style={s.stat}>
                                    <span style={s.statVal}>{st.val}</span>
                                    <span style={s.statLbl}>{st.lbl}</span>
                                </div>
                            ))}
                        </div>

                        {/* Bio */}
                        <p style={s.bio}>{instructor.biography || `${instructor.fullName} is a passionate educator at Emare ICT Hub, dedicated to delivering world-class technical education to students across Ethiopia and beyond.`}</p>

                        {/* Skill Tags */}
                        <div style={s.tagRow}>
                            {(instructor.teachingLanguages || 'English').split(',').map((lang, i) => (
                                <span key={i} style={s.tag}>🌐 {lang.trim()}</span>
                            ))}
                            {instructor.socialMediaLinks?.linkedin && (
                                <a href={instructor.socialMediaLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{ ...s.tag, textDecoration: 'none', color: '#0077b5', background: '#0077b515', borderColor: '#0077b530' }}>
                                    LinkedIn ↗
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Qualifications */}
                {instructor.qualifications && (
                    <div style={s.infoSection}>
                        <h3 style={s.infoTitle}>🎓 Qualifications</h3>
                        <p style={s.infoText}>{instructor.qualifications}</p>
                    </div>
                )}

                {/* Work Experience */}
                {instructor.workExperience && (
                    <div style={s.infoSection}>
                        <h3 style={s.infoTitle}>💼 Work Experience</h3>
                        <p style={s.infoText}>{instructor.workExperience}</p>
                    </div>
                )}

                {/* Published Courses */}
                <h2 style={s.sectionTitle}>📚 Published Courses ({courses.length})</h2>
                {courses.length === 0 ? (
                    <div style={s.emptyState}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                        <p style={{ margin: 0 }}>No published courses yet.</p>
                    </div>
                ) : (
                    <div style={s.grid}>
                        {courses.map(course => (
                            <div
                                key={course._id}
                                style={s.courseCard}
                                onClick={() => navigate(`/courses/${course._id}`)}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div style={s.courseImg}>
                                    {course.thumbnailUrl
                                        ? <img src={course.thumbnailUrl} alt={course.courseTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : '🎓'}
                                </div>
                                <div style={s.courseBody}>
                                    <span style={{ ...s.badge, background: `${colors.primary}15`, color: colors.primary }}>{course.technicalCategory || 'Tech'}</span>
                                    <h3 style={s.courseTitle}>{course.courseTitle}</h3>
                                    <div style={s.courseMeta}>
                                        <span>★ {course.averageRating || '4.8'}</span>
                                        <span>·</span>
                                        <span>{course.level || 'Beginner'}</span>
                                        <span>·</span>
                                        <span>{course.estimatedDurationHours || 5}h</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={s.coursePrice}>{course.price === 0 ? '🆓 Free' : `${course.price} ETB`}</span>
                                        <button
                                            style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                            onClick={e => { e.stopPropagation(); navigate(`/courses/${course._id}`); }}
                                        >
                                            View Course
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
