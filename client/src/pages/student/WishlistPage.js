import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { wishlistService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function WishlistPage() {
    const { colors } = useTheme();
    const navigate = useNavigate();
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);

    const navItems = [
        { label: 'Dashboard', path: '/student/dashboard', key: 'dashboard' },
        { label: 'My Courses', path: '/student/dashboard?tab=my_courses', key: 'courses' },
        { label: 'Wishlist', path: '/student/wishlist', key: 'wishlist' },
        { label: 'Certificates', path: '/student/certificates', key: 'certificates' },
        { label: 'Profile', path: '/student/profile', key: 'profile' },
        { label: 'Leaderboard', path: '/leaderboard', key: 'leaderboard' },
        { label: 'Course Catalog', path: '/courses', key: 'catalog' }
    ];

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            const res = await wishlistService.getMyWishlist();
            setWishlist(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (courseId) => {
        try {
            await wishlistService.toggle(courseId);
            setWishlist(prev => prev.filter(w => w.courseRef._id !== courseId));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg }}>
            <Sidebar navItems={navItems} activeTab="wishlist" />
            
            <main style={{ marginLeft: '260px', padding: '40px', flex: 1 }}>
                <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: '800', marginBottom: '30px' }}>My Wishlist</h1>

                {loading ? (
                    <div style={{ color: colors.textMuted }}>Loading wishlist...</div>
                ) : wishlist.length === 0 ? (
                    <div style={{
                        padding: '40px', background: colors.bgCard, border: `1px solid ${colors.border}`,
                        borderRadius: '12px', textAlign: 'center', color: colors.textMuted
                    }}>
                        Your wishlist is empty. Explore the catalog to find courses!
                        <br /><br />
                        <button 
                            onClick={() => navigate('/courses')}
                            style={{
                                background: colors.primary, color: '#fff', border: 'none',
                                padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                            }}
                        >
                            Browse Catalog
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                        {wishlist.map(item => (
                            <div key={item._id} style={{
                                background: colors.bgCard, border: `1px solid ${colors.border}`,
                                borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                            }}>
                                <div style={{
                                    height: '160px', background: `url(${item.courseRef.thumbnailUrl || 'https://via.placeholder.com/300x160'}) center/cover`
                                }} />
                                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ color: colors.accent, fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>
                                        {item.courseRef.technicalCategory}
                                    </div>
                                    <h3 style={{ color: colors.text, fontSize: '18px', margin: '0 0 10px' }}>{item.courseRef.courseTitle}</h3>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px', color: '#fbbf24', fontSize: '14px' }}>
                                        {'★'.repeat(Math.round(item.courseRef.averageRating || 0))}
                                        {'☆'.repeat(5 - Math.round(item.courseRef.averageRating || 0))}
                                        <span style={{ color: colors.textMuted, fontSize: '12px', marginLeft: '4px' }}>
                                            ({item.courseRef.averageRating || 0})
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                                        <button 
                                            onClick={() => navigate(`/courses/${item.courseRef._id}`)}
                                            style={{
                                                flex: 1, background: colors.primary, color: '#fff', border: 'none',
                                                padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                                            }}
                                        >
                                            View Details
                                        </button>
                                        <button 
                                            onClick={() => handleRemove(item.courseRef._id)}
                                            style={{
                                                background: 'transparent', color: '#ef4444', border: '1px solid #ef4444',
                                                padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                                            }}
                                            title="Remove from Wishlist"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
