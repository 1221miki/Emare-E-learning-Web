import React, { useState, useEffect } from 'react';
import { leaderboardService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';

export default function LeaderboardPage() {
    const { colors } = useTheme();
    const { user } = useAuth();
    const [leaders, setLeaders] = useState([]);
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
        leaderboardService.getTop()
            .then(res => setLeaders(res.data.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const getRankStyle = (idx) => {
        if (idx === 0) return { background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#fff' };
        if (idx === 1) return { background: 'linear-gradient(135deg, #94a3b8, #475569)', color: '#fff' };
        if (idx === 2) return { background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fff' };
        return { background: colors.border, color: colors.text };
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg }}>
            {user && user.assignedRole === 'Student' && (
                <Sidebar navItems={navItems} activeTab="leaderboard" />
            )}
            
            <main style={{ marginLeft: user && user.assignedRole === 'Student' ? '260px' : '0', padding: '60px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ maxWidth: '800px', width: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 style={{ color: colors.text, fontSize: '40px', fontWeight: '900', margin: '0 0 10px' }}>Global Leaderboard 🏆</h1>
                        <p style={{ color: colors.textMuted, fontSize: '18px' }}>Top 50 Students by Gamification XP</p>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', color: colors.textMuted }}>Loading rankings...</div>
                    ) : (
                        <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            {leaders.map((student, idx) => (
                                <div key={student._id} style={{
                                    display: 'flex', alignItems: 'center', padding: '20px', gap: '20px',
                                    borderBottom: idx !== leaders.length - 1 ? `1px solid ${colors.border}` : 'none',
                                    background: user?.id === student._id ? (colors.bg === colors.bg ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') : 'transparent'
                                }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', ...getRankStyle(idx) }}>
                                        #{idx + 1}
                                    </div>
                                    
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: '800' }}>
                                        {student.fullName[0].toUpperCase()}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: colors.text, fontSize: '16px', fontWeight: '700' }}>
                                            {student.fullName} {user?.id === student._id && <span style={{ color: colors.primary, fontSize: '12px', marginLeft: '8px' }}>(You)</span>}
                                        </div>
                                        <div style={{ color: colors.textMuted, fontSize: '13px', marginTop: '4px' }}>
                                            {student.earnedBadges?.length || 0} Badges Earned
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: colors.text, fontSize: '24px', fontWeight: '900' }}>{student.gamificationPoints || 0}</div>
                                        <div style={{ color: colors.textMuted, fontSize: '12px', textTransform: 'uppercase', fontWeight: '700' }}>XP</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
