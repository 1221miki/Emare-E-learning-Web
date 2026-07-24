import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { userService, uploadService } from '../../services/api';
import Sidebar from '../../components/Sidebar';

export default function ProfilePage() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

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
        userService.getProfile()
            .then(res => setProfile(res.data.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const uploadRes = await uploadService.uploadFile(formData);
            const newAvatarUrl = uploadRes.data.data.url;
            
            await userService.update(user.id, { avatarUrl: newAvatarUrl });
            setProfile(prev => ({ ...prev, avatarUrl: newAvatarUrl }));
            
            alert("Avatar updated successfully!");
        } catch (err) {
            alert("Failed to upload avatar: " + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
        }
    };

    if (!user) return null;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg }}>
            <Sidebar navItems={navItems} activeTab="profile" />
            
            <main style={{ marginLeft: '260px', padding: '40px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: '800' }}>Student Profile</h1>

                {/* Profile Header Card */}
                <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '32px', display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div 
                        style={{
                            width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '40px', fontWeight: '800', cursor: 'pointer', overflow: 'hidden', flexShrink: 0
                        }}
                        onClick={() => fileInputRef.current.click()}
                    >
                        {profile?.avatarUrl || user.avatarUrl ? (
                            <img src={profile?.avatarUrl || user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            user.fullName[0].toUpperCase()
                        )}
                        {uploading && <div style={{ fontSize: '10px' }}>...</div>}
                    </div>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarUpload} />
                    
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ color: colors.text, fontSize: '24px', margin: '0 0 4px' }}>{profile?.fullName || user.fullName}</h2>
                                <span style={{ color: colors.primary, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                                    @{profile?.username || user.username || user.accountEmail?.split('@')[0]}
                                </span>
                            </div>
                            <button onClick={() => window.location.href = '/student/dashboard'} style={{ background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, color: colors.primary, padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                                ⚙️ Edit Profile Settings
                            </button>
                        </div>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: '0 0 16px', lineHeight: '1.5' }}>
                            {profile?.biography || user.biography || 'No biography added yet.'}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <span style={{ background: 'rgba(59,130,246,0.15)', color: colors.primary, padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '700' }}>
                                Role: {user.assignedRole}
                            </span>
                            <span style={{ background: 'rgba(139,92,246,0.15)', color: colors.accent, padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '700' }}>
                                Joined: {new Date(user.creationTimestamp).toLocaleDateString()}
                            </span>
                            {profile?.twoFactorEnabled || user.twoFactorEnabled ? (
                                <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '700' }}>
                                    🛡️ 2FA Active
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Personal & Professional Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    
                    {/* Personal Identity Details */}
                    <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: '700', margin: '0 0 16px' }}>Personal Identity & Contact</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: colors.textMuted }}>Email Address:</span>
                                <strong style={{ color: colors.text }}>{profile?.accountEmail || user.accountEmail}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: colors.textMuted }}>Phone Number:</span>
                                <strong style={{ color: colors.text }}>{profile?.contactPhone || user.contactPhone || 'Not provided'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: colors.textMuted }}>Gender:</span>
                                <strong style={{ color: colors.text }}>{profile?.gender || user.gender || 'Not specified'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: colors.textMuted }}>Date of Birth:</span>
                                <strong style={{ color: colors.text }}>{profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not set'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: colors.textMuted }}>Location:</span>
                                <strong style={{ color: colors.text }}>{[profile?.city || user.city, profile?.country || user.country].filter(Boolean).join(', ') || 'Addis Ababa, Ethiopia'}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Professional Info & Portfolio Links */}
                    <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: '700', margin: '0 0 16px' }}>Professional & Social Links</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: colors.textMuted }}>Occupation:</span>
                                <strong style={{ color: colors.text }}>{profile?.occupation || user.occupation || 'Student Developer'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: colors.textMuted }}>Company / Institution:</span>
                                <strong style={{ color: colors.text }}>{profile?.company || user.company || 'Emare ICT Hub'}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                {(profile?.socialMediaLinks?.website || user.socialMediaLinks?.website) && (
                                    <a href={profile?.socialMediaLinks?.website || user.socialMediaLinks?.website} target="_blank" rel="noreferrer" style={{ background: `${colors.primary}15`, color: colors.primary, padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
                                        🌐 Website
                                    </a>
                                )}
                                {(profile?.socialMediaLinks?.linkedin || user.socialMediaLinks?.linkedin) && (
                                    <a href={profile?.socialMediaLinks?.linkedin || user.socialMediaLinks?.linkedin} target="_blank" rel="noreferrer" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
                                        💼 LinkedIn
                                    </a>
                                )}
                                {(profile?.githubUrl || user.githubUrl) && (
                                    <a href={profile?.githubUrl || user.githubUrl} target="_blank" rel="noreferrer" style={{ background: 'rgba(15,23,42,0.15)', color: colors.text, padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
                                        💻 GitHub
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Gamification Portfolio */}
                <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: '700', marginTop: '16px' }}>Gamification Portfolio</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                    {/* XP Card */}
                    <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
                        <div style={{ color: colors.text, fontSize: '36px', fontWeight: '900', margin: '0 0 8px' }}>{user.gamificationPoints || 1250}</div>
                        <div style={{ color: colors.textMuted, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Total XP Earned</div>
                    </div>

                    {/* Badges Card */}
                    <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '32px' }}>
                        <div style={{ color: colors.textMuted, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', marginBottom: '20px' }}>Earned Badges ({user.earnedBadges?.length || 3})</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                            {(user.earnedBadges?.length ? user.earnedBadges : ['Fast Learner', 'Quiz Master', '7-Day Streak']).map((badge, idx) => (
                                <div key={idx} style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#eab308', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🎖️</span> {badge}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
