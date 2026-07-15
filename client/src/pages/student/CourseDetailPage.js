import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { courseService, reviewService, wishlistService, paymentService } from '../../services/api';
import NotificationBell from '../../components/NotificationBell';

export default function CourseDetailPage() {
    const { courseId } = useParams();
    const { isAuthenticated, isStudent } = useAuth();
    const { colors, theme } = useTheme();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [inWishlist, setInWishlist] = useState(false);
    const [loading, setLoading] = useState(true);

    // Review Form State
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');

    useEffect(() => {
        Promise.all([
            courseService.getById(courseId),
            reviewService.getCourseReviews(courseId)
        ]).then(([resCourse, resReviews]) => {
            setCourse(resCourse.data.data);
            setReviews(resReviews.data.data);
            if (isAuthenticated && isStudent) {
                wishlistService.getMyWishlist().then(res => {
                    const exists = res.data.data.some(w => w.courseRef._id === courseId);
                    setInWishlist(exists);
                });
            }
        }).catch(err => {
            console.error(err);
        }).finally(() => {
            setLoading(false);
        });
    }, [courseId, isAuthenticated, isStudent]);

    const handleEnroll = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            // Initiate Chapa Payment Flow
            const res = await paymentService.initializePayment({ courseId: course._id });
            
            // Redirect to the Chapa checkout URL (Mocked redirect for now)
            if (res.data.checkout_url) {
                alert(res.data.message || 'Redirecting to payment gateway...');
                // In a real Chapa implementation, window.location.href = res.data.checkout_url;
                navigate(res.data.checkout_url);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to initialize payment.');
        }
    };

    const handleToggleWishlist = async () => {
        if (!isAuthenticated) return navigate('/login');
        try {
            const res = await wishlistService.toggle(courseId);
            setInWishlist(res.data.added);
        } catch (err) {
            alert('Failed to update wishlist');
        }
    };

    const submitReview = async (e) => {
        e.preventDefault();
        try {
            await reviewService.create({ courseId, rating, reviewText });
            const updatedReviews = await reviewService.getCourseReviews(courseId);
            setReviews(updatedReviews.data.data);
            setShowReviewForm(false);
            setReviewText('');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit review');
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading course details...</div>;
    if (!course) return <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Course not found.</div>;

    return (
        <div style={{ minHeight: '100vh', background: colors.bg, fontFamily: "'Segoe UI', sans-serif" }}>
            {/* Nav */}
            <nav style={{ background: colors.bgCard, borderBottom: `1px solid ${colors.border}`, padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/courses')}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '18px' }}>E</div>
                    <span style={{ color: colors.text, fontWeight: '700', fontSize: '16px' }}>Catalog</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {isAuthenticated ? (
                        <>
                            <NotificationBell />
                            <button onClick={() => navigate(isStudent ? '/student/dashboard' : '/instructor/dashboard')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Dashboard</button>
                        </>
                    ) : (
                        <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Sign In</button>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '60px 40px', color: '#fff' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 600px' }}>
                        <div style={{ color: '#3b82f6', fontWeight: '800', textTransform: 'uppercase', fontSize: '13px', marginBottom: '12px', letterSpacing: '1px' }}>
                            {course.technicalCategory} &gt; {course.level || 'Beginner'}
                        </div>
                        <h1 style={{ fontSize: '40px', fontWeight: '900', margin: '0 0 16px', lineHeight: 1.2 }}>{course.courseTitle}</h1>
                        <p style={{ fontSize: '18px', color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.6 }}>{course.subtitle || course.descriptionText.substring(0, 150)}</p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#fbbf24', fontSize: '18px' }}>★</span>
                                <span style={{ fontWeight: '700', fontSize: '16px' }}>{course.averageRating || 0}</span>
                                <span style={{ color: '#64748b', fontSize: '14px' }}>({course.totalReviews || 0} reviews)</span>
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '14px' }}>👥 {course.totalEnrollments || 0} students</div>
                            <div style={{ color: '#94a3b8', fontSize: '14px' }}>🗣️ {course.language || 'English'}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {course.creatorRef?.fullName?.[0]}
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Created by</div>
                                <div style={{ fontSize: '15px', fontWeight: '600' }}>{course.creatorRef?.fullName}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Floating Pricing Card */}
                    <div style={{ width: '360px', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, padding: '24px', flexShrink: 0, alignSelf: 'flex-start', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <div style={{ height: '200px', background: course.thumbnailUrl ? `url(${course.thumbnailUrl}) center/cover` : '#334155', borderRadius: '12px', marginBottom: '24px' }}></div>
                        <div style={{ fontSize: '32px', fontWeight: '900', color: colors.text, marginBottom: '24px' }}>
                            {course.price === 0 ? 'Free' : `$${course.price}`}
                        </div>
                        <button onClick={handleEnroll} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginBottom: '12px', transition: 'transform 0.1s' }}>
                            Enroll Now
                        </button>
                        <button onClick={handleToggleWishlist} style={{ width: '100%', padding: '14px', background: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                            {inWishlist ? '❤️ In Wishlist' : '🤍 Add to Wishlist'}
                        </button>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 0', color: colors.textMuted, fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <li>⏱️ {course.estimatedDurationHours} hours of on-demand video</li>
                            <li>📄 Downloadable resources</li>
                            <li>🏆 Certificate of completion</li>
                            <li>♾️ Full lifetime access</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Main Details */}
            <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 40px', display: 'flex', gap: '40px' }}>
                <div style={{ flex: 1, paddingRight: '400px' }}> {/* Margin for floating card */}
                    
                    <section style={{ marginBottom: '48px' }}>
                        <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: '800', marginBottom: '16px' }}>About This Course</h2>
                        <p style={{ color: colors.textMuted, fontSize: '16px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {course.descriptionText}
                        </p>
                    </section>

                    {course.learningObjectives?.length > 0 && (
                        <section style={{ marginBottom: '48px', padding: '24px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '12px' }}>
                            <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>What you'll learn</h2>
                            <ul style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: 0, margin: 0, listStyle: 'none' }}>
                                {course.learningObjectives.map((obj, i) => (
                                    <li key={i} style={{ color: colors.textMuted, fontSize: '15px', display: 'flex', gap: '8px' }}>
                                        <span style={{ color: colors.primary }}>✓</span> {obj}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {course.requirements?.length > 0 && (
                        <section style={{ marginBottom: '48px' }}>
                            <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Requirements</h2>
                            <ul style={{ paddingLeft: '20px', margin: 0, color: colors.textMuted, fontSize: '15px', lineHeight: 1.6 }}>
                                {course.requirements.map((req, i) => <li key={i} style={{ marginBottom: '8px' }}>{req}</li>)}
                            </ul>
                        </section>
                    )}

                    {/* Course Content / Curriculum */}
                    <section style={{ marginBottom: '48px' }}>
                        <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: '800', marginBottom: '16px' }}>Course Content</h2>
                        <div style={{ border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                            {course.curriculumTree?.map((chapter, i) => (
                                <div key={chapter._id || i} style={{ borderBottom: i !== course.curriculumTree.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                                    <div style={{ background: colors.bgCard, padding: '16px 20px', fontWeight: '700', color: colors.text, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{chapter.chapterTitle}</span>
                                        <span style={{ color: colors.textMuted, fontSize: '13px' }}>{chapter.lessons?.length || 0} lessons</span>
                                    </div>
                                    <div style={{ padding: '8px 0' }}>
                                        {chapter.lessons?.map((lesson, j) => (
                                            <div key={lesson._id || j} style={{ padding: '12px 20px', color: colors.textMuted, fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>▶ {lesson.lessonTitle}</span>
                                                <span>{lesson.durationMinutes} min</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Reviews */}
                    <section style={{ marginBottom: '48px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: '800' }}>Student Reviews</h2>
                            {isStudent && isAuthenticated && (
                                <button onClick={() => setShowReviewForm(!showReviewForm)} style={{ background: 'transparent', border: `1px solid ${colors.primary}`, color: colors.primary, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                                    {showReviewForm ? 'Cancel' : 'Write a Review'}
                                </button>
                            )}
                        </div>

                        {showReviewForm && (
                            <form onSubmit={submitReview} style={{ background: colors.bgCard, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '24px' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Rating (1-5)</label>
                                    <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text }}>
                                        {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                                    </select>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Your Review</label>
                                    <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} required rows="4" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, resize: 'vertical' }} />
                                </div>
                                <button type="submit" style={{ background: colors.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Submit Review</button>
                            </form>
                        )}

                        {reviews.length === 0 ? (
                            <div style={{ color: colors.textMuted }}>No reviews yet.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {reviews.map(review => (
                                    <div key={review._id} style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                {review.studentRef?.fullName?.[0]}
                                            </div>
                                            <div>
                                                <div style={{ color: colors.text, fontWeight: '700', fontSize: '15px' }}>{review.studentRef?.fullName}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ color: '#fbbf24', fontSize: '13px' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                                                    <span style={{ color: colors.textMuted, fontSize: '12px' }}>{new Date(review.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p style={{ color: colors.textMuted, fontSize: '15px', lineHeight: 1.5, margin: '8px 0 0' }}>{review.reviewText}</p>
                                        
                                        {review.instructorReply && (
                                            <div style={{ marginTop: '16px', marginLeft: '24px', padding: '16px', background: colors.bgCard, borderRadius: '8px', borderLeft: `4px solid ${colors.primary}` }}>
                                                <div style={{ color: colors.text, fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>Instructor Reply</div>
                                                <div style={{ color: colors.textMuted, fontSize: '14px', lineHeight: 1.5 }}>{review.instructorReply}</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
