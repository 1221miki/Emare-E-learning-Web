import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

export default function Sidebar({ navItems = [], activeTab, onTabChange, extraBottomButtons }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <aside style={{ ...styles.sidebar, background: colors.bgCard, borderRight: `1px solid ${colors.border}` }}>
            {/* Header: Logo + Notifications + Theme Toggle */}
            <div style={styles.headerBox}>
                <div style={styles.logoBox}>
                    <div style={styles.logo}>E</div>
                    <span style={{ ...styles.logoText, color: colors.text }}>Emare ELMS</span>
                </div>
                <div style={styles.actionsBox}>
                    <button onClick={toggleTheme} style={styles.iconBtn} title="Toggle Theme">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <NotificationBell />
                </div>
            </div>

            {/* Navigation */}
            <nav style={styles.nav}>
                {navItems.map((item) => {
                    const isActive = activeTab === item.key;
                    const itemStyles = {
                        ...styles.navItem,
                        color: isActive ? colors.primary : colors.textMuted,
                        background: isActive 
                            ? (theme === 'dark' ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)') 
                            : (theme === 'dark' ? 'rgba(30,41,59,0.2)' : 'rgba(241,245,249,0.5)'),
                        fontWeight: isActive ? '600' : '500',
                        border: `1px solid ${colors.border}`,
                        borderLeft: isActive ? `4px solid ${colors.primary}` : `1px solid ${colors.border}`
                    };
                    const labelContent = (
                        <span style={styles.navItemContent}>
                            <span>{item.label}</span>
                            {item.badge ? <span style={{ ...styles.navBadge, background: colors.primary }}>{item.badge}</span> : null}
                        </span>
                    );

                    if (item.path) {
                        return (
                            <Link
                                key={item.key || item.label}
                                to={item.path}
                                style={itemStyles}
                            >
                                {labelContent}
                            </Link>
                        );
                    }
                    return (
                        <button
                            key={item.key || item.label}
                            onClick={() => onTabChange && onTabChange(item.key)}
                            style={itemStyles}
                        >
                            {labelContent}
                        </button>
                    );
                })}
            </nav>

            {/* User Info */}
            <div style={{ ...styles.userInfo, borderTop: `1px solid ${colors.border}` }}>
                <div style={styles.userAvatar}>{user?.fullName?.[0]?.toUpperCase()}</div>
                <div style={styles.userMeta}>
                    <span style={{ ...styles.userName, color: colors.text }}>{user?.fullName}</span>
                    <span style={{ ...styles.userRole, color: colors.textMuted }}>{user?.assignedRole}</span>
                </div>
            </div>

            {/* Home & Logout */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingBottom: '12px' }}>
                {extraBottomButtons}
                <button onClick={() => navigate('/')} style={{ ...styles.homeBtn }}>🏠 Home Page</button>
                <button onClick={handleLogout} style={styles.logoutBtn}>↩ Sign Out</button>
            </div>
        </aside>
    );
}

const styles = {
    sidebar: {
        width: '260px',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px 32px',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        zIndex: 20,
        transition: 'background 0.3s, border-color 0.3s'
    },
    headerBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' },
    logoBox: { display: 'flex', alignItems: 'center', gap: '10px' },
    logo: {
        width: '36px', height: '36px', borderRadius: '10px',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '900', color: '#fff', fontSize: '18px'
    },
    logoText: { fontWeight: '700', fontSize: '16px' },
    actionsBox: { display: 'flex', alignItems: 'center', gap: '8px' },
    iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px' },
    nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' },
    navItem: {
        textDecoration: 'none',
        padding: '10px 14px',
        borderRadius: '10px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        borderLeft: '4px solid transparent'
    },
    navItemContent: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px'
    },
    navBadge: {
        color: '#fff',
        borderRadius: '999px',
        padding: '4px 10px',
        fontSize: '11px',
        fontWeight: '700',
        minWidth: '26px',
        textAlign: 'center',
        lineHeight: 1
    },
    userInfo: {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 0', marginBottom: '12px', paddingTop: '16px'
    },
    userAvatar: {
        width: '36px', height: '36px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: '800', fontSize: '15px', flexShrink: 0
    },
    userMeta: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    userName: { fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    userRole: { fontSize: '11px' },
    logoutBtn: {
        background: '#ffffff',
        border: '1px solid rgba(239,68,68,0.45)',
        color: '#b91c1c',
        boxShadow: '0 4px 10px rgba(239,68,68,0.15)',
        borderRadius: '10px',
        padding: '12px 14px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '700',
        transition: 'transform 0.2s, box-shadow 0.2s',
        textAlign: 'center'
    },
    homeBtn: {
        background: 'rgba(59,130,246,0.12)',
        border: '1px solid rgba(59,130,246,0.4)',
        color: '#2563eb',
        borderRadius: '10px',
        padding: '12px 14px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '700',
        transition: 'transform 0.2s, background 0.2s',
        textAlign: 'center'
    }
};
