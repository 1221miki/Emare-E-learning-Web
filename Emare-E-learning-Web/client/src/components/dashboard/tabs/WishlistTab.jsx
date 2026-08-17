import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, HeartCrack, BookOpen } from 'lucide-react';

export default function WishlistTab(dash) {
    const { colors, wishlist, navigate, handleToggleWishlist, styles } = dash;

    return (
        <div>
            <div style={{ ...styles.tabHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ ...styles.tabTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Heart size={20} color="#ef4444" aria-hidden="true" /> My Course Wishlist
                    </h2>
                    <p style={styles.tabSubtitle}>Saved courses that interest you — ready to enroll whenever you are</p>
                </div>
                <button onClick={() => navigate('/courses')} style={styles.resumeBtn} aria-label="Browse More Courses">
                    + Browse More Courses
                </button>
            </div>

            {wishlist.length === 0 ? (
                <div style={styles.emptyContent}>
                    <Heart size={48} color={colors.textMuted} style={{ marginBottom: '16px' }} aria-hidden="true" />
                    <p style={styles.emptyText}>Your wishlist is empty. Save courses you like while browsing!</p>
                    <Link to="/courses" style={styles.resumeBtn}>Explore Catalog</Link>
                </div>
            ) : (
                <div style={styles.courseGrid}>
                    {wishlist.map((item) => {
                        const course = item.courseRef || item;
                        return (
                            <div key={course._id} style={styles.courseCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={styles.courseBadge}>{course.technicalCategory || 'General'}</span>
                                    <button
                                        onClick={() => handleToggleWishlist(course._id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                        title="Remove from wishlist"
                                        aria-label="Remove from wishlist"
                                    >
                                        <HeartCrack size={18} color="#ef4444" aria-hidden="true" />
                                    </button>
                                </div>
                                <h3 style={styles.courseTitle}>{course.courseTitle}</h3>
                                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 8px', lineHeight: '1.4' }}>
                                    {course.descriptionText?.substring(0, 100)}...
                                </p>
                                <p style={{ color: colors.primary, fontWeight: '700', fontSize: '14px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <BookOpen size={14} aria-hidden="true" />
                                    {course.price === 0 ? 'Free' : `${course.price?.toLocaleString()} Birr`}
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => navigate(`/courses/${course._id}`)}
                                        style={{ ...styles.watchBtn, flex: 1 }}
                                        aria-label={`View and enroll in ${course.courseTitle}`}
                                    >
                                        View &amp; Enroll
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
