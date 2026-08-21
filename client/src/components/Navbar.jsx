import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
    const { isAuthenticated, user, logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const navigate = useNavigate();

    const [currentLang, setCurrentLang] = useState('en');
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'am', name: 'አማርኛ' },
        { code: 'om', name: 'Afaan Oromoo' },
        { code: 'ti', name: 'ትግርኛ' }
    ];

    const currentLanguageName = languages.find(l => l.code === currentLang)?.name || 'Language';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsLangDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const handleProfileRedirect = () => {
        if (!user) return '/login';
        switch (user.assignedRole) {
            case 'Admin': return '/admin/dashboard';
            case 'Instructor': return '/instructor/settings';
            default: return '/student/profile';
        }
    };

    const goToSection = (id) => {
        if (window.location.pathname === '/') {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        navigate('/', { state: { scrollTo: id } });
    };

    const handleLanguageChange = (langCode) => {
        setCurrentLang(langCode);
        setIsLangDropdownOpen(false);
        
        // Trigger Google Translate dropdown
        const select = document.querySelector('.goog-te-combo');
        if (select) {
            select.value = langCode;
            select.dispatchEvent(new Event('change'));
        }
    };

    const s = {
        wrapper: {
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            width: '100%'
        },

        navbar: { 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px 5%', 
            width: '100%',
            background: theme === 'dark' ? 'rgba(9,13,22,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${colors.border}`,
            zIndex: 1001
        },
        logoBox: { display: 'flex', alignItems: 'center', gap: '12px' },
        logoMark: { width: '180px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', objectFit: 'contain' },
        logoText: { fontSize: '14px', fontWeight: '800', letterSpacing: '0.45px', color: colors.text, whiteSpace: 'nowrap' },
        navCenter: { display: 'flex', alignItems: 'center', gap: '20px' },
        navLink: { textDecoration: 'none', fontWeight: '500', fontSize: '13px', transition: 'color 0.2s', color: colors.text },
        navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
        iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        loginBtn: { textDecoration: 'none', fontWeight: '600', fontSize: '14px', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: colors.text },
        registerBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', textDecoration: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: '700', fontSize: '14px' },
        logoutBtn: { background: `${colors.danger}15`, border: `1px solid ${colors.danger}30`, color: colors.danger, borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.2s' },
        mobileMenuButton: { display: 'none', border: 'none', background: 'transparent', color: colors.text, fontSize: '24px', cursor: 'pointer', padding: '4px 8px' },
        
        langDropdownContainer: { position: 'relative' },
        langBtn: { background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', padding: '8px 14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' },
        langDropdown: { position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', overflow: 'hidden', display: isLangDropdownOpen ? 'flex' : 'none', flexDirection: 'column', width: '200px', zIndex: 105 },
        langOption: { padding: '12px 16px', fontSize: '14px', color: colors.text, cursor: 'pointer', borderBottom: `1px solid ${colors.border}`, background: 'transparent', textAlign: 'left', borderLeft: 'none', borderRight: 'none', borderTop: 'none', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' },
        langOptionLast: { borderBottom: 'none' },
        checkMark: { width: '16px', fontWeight: '800', color: colors.primary },
        avatarBtn: { width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${colors.border}`, background: colors.bgInput, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0, transition: 'border-color 0.2s' },
        avatarImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
        avatarInitial: { fontSize: '15px', fontWeight: '700', color: colors.text, userSelect: 'none' }
    };

    return (
        <div style={s.wrapper}>

            <nav style={s.navbar}>
                <div style={s.logoBox}>
                    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5cm' }}>
                        <img src="/images/image.png" alt="Emare ICT Hub" style={s.logoMark} />
                        <span style={s.logoText}>EMARE ICT HUB ELMS</span>
                    </Link>
                </div>
                
                <button className="emare-mobile-menu-button" aria-label="Open navigation" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={s.mobileMenuButton}>☰</button>

                <div className="emare-nav-center" style={s.navCenter}>
                    <Link to="/" style={s.navLink}>Home</Link>
                    <Link to="/about" style={s.navLink}>About</Link>
                    <Link to="/developers" style={s.navLink}>Emare Developers</Link>
                    <Link to="/courses" style={s.navLink}>Course Catalogs</Link>
                    <Link to="/events" style={s.navLink}>Events</Link>
                    <a href="#services" style={s.navLink} onClick={e => { e.preventDefault(); goToSection('services'); }}>Services</a>
                    <a href="#contact" style={s.navLink} onClick={e => { e.preventDefault(); goToSection('contact'); }}>Contact</a>
                </div>

                <div className="emare-nav-right" style={s.navRight}>
                    {/* Language Switcher */}
                    <div style={s.langDropdownContainer} ref={dropdownRef}>
                        <button onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)} style={s.langBtn}>
                            ◉ {currentLanguageName}
                        </button>
                        <div style={s.langDropdown}>
                            {languages.map((lang, index) => {
                                const isActive = currentLang === lang.code;
                                return (
                                    <button 
                                        key={lang.code}
                                        onClick={() => handleLanguageChange(lang.code)} 
                                        style={{...s.langOption, ...(index === languages.length - 1 ? s.langOptionLast : {}), fontWeight: isActive ? '700' : '400'}}
                                        onMouseEnter={(e) => e.currentTarget.style.background = `${colors.primary}15`}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span style={s.checkMark}>{isActive ? '' : ''}</span>
                                        {lang.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dark Mode Toggle */}
                    <button onClick={toggleTheme} style={s.iconBtn} title="Toggle Theme">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    
                    {isAuthenticated ? (
                        <button
                            onClick={() => navigate(handleProfileRedirect())}
                            style={s.avatarBtn}
                            title={user?.fullName ? `${user.fullName} — Profile Settings` : 'Profile Settings'}
                            aria-label="Go to Profile Settings"
                            onMouseEnter={e => e.currentTarget.style.borderColor = colors.primary}
                            onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
                        >
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user?.fullName} style={s.avatarImg} />
                            ) : (
                                <span style={s.avatarInitial}>{user?.fullName?.[0]?.toUpperCase() || 'U'}</span>
                            )}
                        </button>
                    ) : (
                        <>
                            <Link to="/login" style={s.loginBtn}>Login</Link>
                            <Link to="/register" style={s.registerBtn}>Register</Link>
                        </>
                    )}
                </div>
            </nav>

            {isMobileMenuOpen && (
                <div className="emare-mobile-drawer">
                    <Link to="/" style={s.navLink} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                    <Link to="/about" style={s.navLink} onClick={() => setIsMobileMenuOpen(false)}>About</Link>
                    <Link to="/developers" style={s.navLink} onClick={() => setIsMobileMenuOpen(false)}>Emare Developers</Link>
                    <Link to="/courses" style={s.navLink} onClick={() => setIsMobileMenuOpen(false)}>Course Catalogs</Link>
                    <Link to="/events" style={s.navLink} onClick={() => setIsMobileMenuOpen(false)}>Events</Link>
                    <a href="#services" style={s.navLink} onClick={e => { e.preventDefault(); setIsMobileMenuOpen(false); goToSection('services'); }}>Services</a>
                    <a href="#contact" style={s.navLink} onClick={e => { e.preventDefault(); setIsMobileMenuOpen(false); goToSection('contact'); }}>Contact</a>
                    {!isAuthenticated && (
                        <>
                            <Link to="/login" style={s.loginBtn} onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                            <Link to="/register" style={s.registerBtn} onClick={() => setIsMobileMenuOpen(false)}>Register</Link>
                        </>
                    )}
                    {isAuthenticated && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
                                <div style={{ ...s.avatarBtn, width: '36px', height: '36px' }}>
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user?.fullName} style={s.avatarImg} />
                                    ) : (
                                        <span style={s.avatarInitial}>{user?.fullName?.[0]?.toUpperCase() || 'U'}</span>
                                    )}
                                </div>
                                <span style={{ fontWeight: '600', color: colors.text, fontSize: '14px' }}>{user?.fullName}</span>
                            </div>
                            <Link to={handleProfileRedirect()} style={s.loginBtn} onClick={() => setIsMobileMenuOpen(false)}>Profile Settings</Link>
                            <Link to={handleDashboardRedirect()} style={s.loginBtn} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                            <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} style={s.logoutBtn}>Sign Out</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
