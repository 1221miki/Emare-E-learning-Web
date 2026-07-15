import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

export default function Sidebar({ navItems = [], activeTab, onTabChange }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
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
                    if (item.path) {
                        return (
                            <Link
                                key={item.key || item.label}
                                to={item.path}
                                style={{
                                    ...styles.navItem,
                                    color: isActive ? colors.primary : colors.textMuted,
                                    background: isActive ? (theme === 'dark' ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)') : 'transparent',
                                    fontWeight: isActive ? '600' : '500'
                                }}
                            >
                                {item.label}
                            </Link>
                        );
                    }
                    return (
                        <span
                            key={item.key || item.label}
                            onClick={() => onTabChange && onTabChange(item.key)}
                            style={{
                                ...styles.navItem,
                                color: isActive ? colors.primary : colors.textMuted,
                                background: isActive ? (theme === 'dark' ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)') : 'transparent',
                                fontWeight: isActive ? '600' : '500'
                            }}
                        >
                            {item.label}
                        </span>
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

            {/* Logout */}
            <button onClick={handleLogout} style={styles.logoutBtn}>↩ Sign Out</button>
        </aside>
    );
}

const styles = {
    sidebar: {
        width: '260px',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        position: 'fixed',
        height: '100vh',
        zIndex: 50,
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
        textDecoration: 'none', padding: '10px 14px',
        borderRadius: '10px', fontSize: '14px',
        cursor: 'pointer', transition: 'all 0.2s', display: 'block'
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
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
        color: '#ef4444', borderRadius: '10px', padding: '10px',
        cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.2s'
    }
};
