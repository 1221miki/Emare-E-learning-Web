import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { certificateService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function CertificatesPage() {
    const { colors } = useTheme();
    const [certificates, setCertificates] = useState([]);
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
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        try {
            const res = await certificateService.getMine();
            setCertificates(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg }}>
            <Sidebar navItems={navItems} activeTab="certificates" />
            
            <main style={{ marginLeft: '260px', padding: '40px', flex: 1 }}>
                <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: '800', marginBottom: '30px' }}>My Certificates</h1>

                {loading ? (
                    <div style={{ color: colors.textMuted }}>Loading certificates...</div>
                ) : certificates.length === 0 ? (
                    <div style={{
                        padding: '40px', background: colors.bgCard, border: `1px solid ${colors.border}`,
                        borderRadius: '12px', textAlign: 'center', color: colors.textMuted
                    }}>
                        You haven't earned any certificates yet. Complete a course 100% to generate one!
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                        {certificates.map(cert => (
                            <div key={cert._id} style={{
                                background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '2px solid #eab308',
                                borderRadius: '16px', padding: '30px', position: 'relative', overflow: 'hidden',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                            }}>
                                <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '100px', opacity: 0.1 }}>🏆</div>
                                
                                <div style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
                                    Certificate of Completion
                                </div>
                                <h3 style={{ color: '#fff', fontSize: '22px', margin: '0 0 8px', lineHeight: 1.3 }}>{cert.courseRef.courseTitle}</h3>
                                <div style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '24px' }}>
                                    Issued: {new Date(cert.completionDate).toLocaleDateString()}
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
                                    <span style={{ color: colors.textMuted, fontSize: '11px', textTransform: 'uppercase' }}>Certificate ID</span>
                                    <span style={{ color: '#e2e8f0', fontSize: '14px', fontFamily: 'monospace' }}>{cert.certificateNumber}</span>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button style={{
                                        flex: 1, background: '#eab308', color: '#000', border: 'none',
                                        padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700'
                                    }}>
                                        Download PDF
                                    </button>
                                    <button style={{
                                        background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                                        padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                                    }}>
                                        Copy Link
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
