import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

export default function Sidebar({ navItems = [], activeTab, onTabChange, extraBottomButtons }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const navigate = useNavigate();
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

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

            {/* User Info - Account Dropdown */}
            <div style={{ position: 'relative' }}>
                <div 
                    style={{ 
                        ...styles.userInfo, 
                        borderTop: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                    title="Click to open account menu"
                >
                    <div style={styles.userAvatar}>{user?.fullName?.[0]?.toUpperCase()}</div>
                    <div style={styles.userMeta}>
                        <span style={{ ...styles.userName, color: colors.text }}>{user?.fullName}</span>
                        <span style={{ ...styles.userRole, color: colors.textMuted }}>{user?.assignedRole}</span>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', transition: 'transform 0.2s', transform: accountDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>

                {/* Dropdown Menu */}
                {accountDropdownOpen && (
                    <div 
                        style={{
                            ...styles.accountDropdown,
                            background: colors.bgCard,
                            border: `1px solid ${colors.border}`,
                            boxShadow: theme === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)'
                        }}
                    >
                        {/* Header in dropdown */}
                        <div style={{ ...styles.dropdownHeader, borderBottom: `1px solid ${colors.border}` }}>
                            <span style={{ color: colors.text, fontWeight: '600', fontSize: '13px' }}>{user?.fullName}</span>
                            <span style={{ color: colors.textMuted, fontSize: '11px' }}>{user?.assignedRole}</span>
                        </div>

                        {/* Menu Items */}
                        <button 
                            onClick={() => { navigate('/catalog'); setAccountDropdownOpen(false); }}
                            style={{ ...styles.dropdownItem, color: colors.text, borderBottom: `1px solid ${colors.border}` }}
                        >
                            📚 Course Catalog
                        </button>
                        <button 
                            onClick={() => { navigate('/'); setAccountDropdownOpen(false); }}
                            style={{ ...styles.dropdownItem, color: colors.text, borderBottom: `1px solid ${colors.border}` }}
                        >
                            🏠 Home Page
                        </button>
                        <button 
                            onClick={async () => { 
                                await logout(); 
                                setAccountDropdownOpen(false);
                                navigate('/'); 
                            }}
                            style={{ ...styles.dropdownItem, color: '#dc2626' }}
                        >
                            ↩ Sign Out
                        </button>
                    </div>
                )}
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
        padding: '12px 10px', marginBottom: '12px', paddingTop: '16px',
        borderRadius: '10px',
        position: 'relative'
    },
    accountDropdown: {
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: '-4px',
        right: '-4px',
        borderRadius: '10px',
        overflow: 'hidden',
        zIndex: 1000,
        minWidth: '220px',
        animation: 'slideUp 0.2s ease-out'
    },
    dropdownHeader: {
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    dropdownItem: {
        background: 'transparent',
        border: 'none',
        padding: '12px 14px',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s',
        width: '100%'
    },
    userAvatar: {
        width: '36px', height: '36px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: '800', fontSize: '15px', flexShrink: 0
    },
    userMeta: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    userName: { fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    userRole: { fontSize: '11px' }
};
