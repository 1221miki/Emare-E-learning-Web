import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
    const { isAuthenticated, user, logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const navigate = useNavigate();

    const [showAnnouncement, setShowAnnouncement] = useState(true);
    const [language, setLanguage] = useState('EN');
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleDashboardRedirect = () => {
        if (!user) return '/login';
        switch (user.assignedRole) {
            case 'Admin': return '/admin/dashboard';
            case 'Instructor': return '/instructor/dashboard';
            default: return '/student/dashboard';
        }
    };

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        setIsLangDropdownOpen(false);
    };

    const s = {
        wrapper: {
            position: 'sticky',
            top: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column'
        },
        announcementBar: {
            display: showAnnouncement ? 'flex' : 'none',
            justifyContent: 'center',
            alignItems: 'center',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            color: '#fff',
            padding: '8px 24px',
            fontSize: '13px',
            fontWeight: '600',
            position: 'relative',
            zIndex: 101
        },
        closeAnnouncement: {
            position: 'absolute',
            right: '24px',
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '700'
        },
        navbar: { 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px 5%', 
            background: theme === 'dark' ? 'rgba(9,13,22,0.85)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)', 
            borderBottom: `1px solid ${colors.border}`
        },
        logoBox: { display: 'flex', alignItems: 'center', gap: '12px' },
        logoMark: { width: '40px', height: '40px', borderRadius: '12px', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '20px' },
        logoText: { fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' },
        navCenter: { display: 'flex', alignItems: 'center', gap: '20px' },
        navLink: { textDecoration: 'none', fontWeight: '500', fontSize: '13px', transition: 'color 0.2s', color: colors.text },
        navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
        iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        loginBtn: { textDecoration: 'none', fontWeight: '600', fontSize: '14px', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: colors.text },
        registerBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', textDecoration: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: '700', fontSize: '14px' },
        logoutBtn: { background: `${colors.danger}15`, border: `1px solid ${colors.danger}30`, color: colors.danger, borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.2s' },
        
        langDropdownContainer: { position: 'relative' },
        langBtn: { background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
        langDropdown: { position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', display: isLangDropdownOpen ? 'block' : 'none' },
        langOption: { padding: '10px 20px', fontSize: '13px', color: colors.text, cursor: 'pointer', borderBottom: `1px solid ${colors.border}`, background: 'transparent', width: '100%', textAlign: 'left', borderLeft: 'none', borderRight: 'none', borderTop: 'none' }
    };

    return (
        <div style={s.wrapper}>
            {/* 1. Top Announcement Bar */}
            <div style={s.announcementBar}>
                <span>🎉 <strong>New Promotion:</strong> Get 50% off all Advanced AI Courses until August! <Link to="/courses" style={{color: '#fff', textDecoration: 'underline', marginLeft: '8px'}}>Claim Offer</Link></span>
                <button onClick={() => setShowAnnouncement(false)} style={s.closeAnnouncement}>✕</button>
            </div>

            {/* 2. Main Navigation Bar */}
            <nav style={s.navbar}>
                <div style={s.logoBox}>
                    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={s.logoMark}>E</div>
                        <span style={{ ...s.logoText, color: colors.text }}>Emare ICT Hub</span>
                    </Link>
                </div>
                
                <div style={s.navCenter}>
                    <Link to="/" style={{ ...s.navLink }}>Home</Link>
                    <Link to="/courses" style={{ ...s.navLink }}>Courses</Link>
                    <Link to="/categories" style={{ ...s.navLink }}>Categories</Link>
                    <Link to="/search" style={{ ...s.navLink }}>Search</Link>
                    <Link to="/live" style={{ ...s.navLink }}>Live Classes</Link>
                    <Link to="/community" style={{ ...s.navLink }}>Community</Link>
                </div>

                <div style={s.navRight}>
                    {/* Language Switcher */}
                    <div style={s.langDropdownContainer}>
                        <button onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)} style={s.langBtn}>
                            🌐 {language} ▼
                        </button>
                        <div style={s.langDropdown}>
                            <button onClick={() => handleLanguageChange('EN')} style={s.langOption}>English</button>
                            <button onClick={() => handleLanguageChange('AM')} style={s.langOption}>Amharic</button>
                            <button onClick={() => handleLanguageChange('OR')} style={s.langOption}>Oromo</button>
                        </div>
                    </div>

                    {/* Dark Mode Toggle */}
                    <button onClick={toggleTheme} style={s.iconBtn} title="Toggle Theme">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    
                    {isAuthenticated ? (
                        <>
                            <Link to={handleDashboardRedirect()} style={s.loginBtn}>Dashboard</Link>
                            <button onClick={handleLogout} style={s.logoutBtn}>Sign Out</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" style={s.loginBtn}>Login</Link>
                            <Link to="/register" style={s.registerBtn}>Register</Link>
                        </>
                    )}
                </div>
            </nav>
        </div>
    );
}
