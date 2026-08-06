import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { courseService, enrollmentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Navbar from '../../components/Navbar';

export default function CourseDetails() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isStudent, isSuspended } = useAuth();
    const { colors } = useTheme();

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await courseService.getById(courseId);
                setCourse(res.data.data);
                if (isAuthenticated && isStudent) {
                    const statusRes = await enrollmentService.getMyStatus();
                    const enrollments = statusRes.data.data || [];
                    const enrolled = enrollments.some(e => {
                        const eId = e.courseRef?._id || e.courseRef;
                        return eId === courseId && (e.paymentStatus === 'Cleared' || e.tuitionClearanceFlag);
                    });
                    setIsEnrolled(enrolled);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [courseId, isAuthenticated, isStudent]);

    const handleEnroll = () => {
        if (isSuspended) {
            alert('Your account is suspended. Enrollment is disabled.');
            return;
        }
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        if (isEnrolled) {
            navigate(`/student/learn/${courseId}`);
            return;
        }
        navigate(`/checkout/${courseId}`);
    };

    if (loading) return <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading course details...</div>;
    if (!course) return <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Course not found.</div>;

    return (
        <div style={{ background: colors.bg, color: colors.text, minHeight: '100vh' }}>
            <Navbar />
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
                    <div style={{ flex: '1 1 650px' }}>
                        <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '12px' }}>{course.courseTitle || course.title}</h1>
                        <p style={{ color: colors.textMuted, fontSize: '16px', marginBottom: '20px' }}>{course.subtitle || course.descriptionText?.slice(0, 180)}</p>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
                            <span style={{ padding: '8px 14px', borderRadius: '999px', background: '#eef2ff', color: '#4338ca', fontWeight: '700' }}>{course.technicalCategory}</span>
                            <span style={{ padding: '8px 14px', borderRadius: '999px', background: '#d1fae5', color: '#15803d', fontWeight: '700' }}>{course.level}</span>
                            <span style={{ padding: '8px 14px', borderRadius: '999px', background: '#fef3c7', color: '#92400e', fontWeight: '700' }}>{course.language || 'English'}</span>
                        </div>
                        <div style={{ display: 'grid', gap: '20px', marginBottom: '32px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '22px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '10px' }}>Course Price</h3>
                                    <p style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>{course.price === 0 ? 'Free' : `${course.price} ETB`}</p>
                                </div>
                                <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '22px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '10px' }}>Lessons</h3>
                                    <p style={{ fontSize: '20px', margin: 0 }}>{course.curriculumTree?.reduce((sum, chapter) => sum + (chapter.lessons?.length || 0), 0) || 0}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleEnroll}
                                style={{
                                    width: '100%',
                                    maxWidth: '360px',
                                    padding: '18px',
                                    borderRadius: '16px',
                                    border: 'none',
                                    background: isEnrolled ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #4338ca, #6d28d9)',
                                    color: '#fff',
                                    fontWeight: '800',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}>
                                {isEnrolled ? 'Already Enrolled - Start Learning' : course.price === 0 ? 'Enroll for Free' : 'Enroll Now'}
                            </button>
                        </div>
                    </div>
                    <div style={{ width: '360px', background: colors.bgCard, borderRadius: '24px', border: `1px solid ${colors.border}`, padding: '28px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '18px' }}>What you get</h3>
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, color: colors.textMuted, display: 'grid', gap: '12px' }}>
                            <li> Full course access after payment</li>
                            <li> Video lessons, quizzes and PDF downloads</li>
                            <li> Progress tracking and completion certificate</li>
                            <li> Secure checkout via Chapa</li>
                        </ul>
                        <Link to="/courses" style={{ display: 'inline-block', marginTop: '24px', color: '#4338ca', fontWeight: '700', textDecoration: 'none' }}>Browse more courses</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
