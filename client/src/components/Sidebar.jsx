import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import { 
    Sun, Moon, BookOpen, Home, LogOut, LayoutDashboard, Award, 
    Heart, Trophy, MessageSquare, Video, User, Settings, PlusCircle, FilePlus, Shield, HelpCircle 
} from 'lucide-react';

const SIDEBAR_WIDTH = 260;

export default function Sidebar({ navItems = [], activeTab, onTabChange, extraBottomButtons }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

    // Fallback default nav items if not provided by parent
    const effectiveNavItems = (navItems && navItems.length > 0) ? navItems : (() => {
        const role = user?.assignedRole;
        if (role === 'Instructor') {
            return [
                { key: 'dashboard', label: 'Dashboard', path: '/instructor/dashboard', icon: <LayoutDashboard size={20} /> },
                { key: 'quizzes', label: 'Quiz Management', path: '/instructor/quizzes', icon: <HelpCircle size={20} /> },
                { key: 'create-course', label: 'Create Course', path: '/instructor/courses/new', icon: <PlusCircle size={20} /> },
                { key: 'create-assignment', label: 'Create Assignment', path: '/instructor/assignments/new', icon: <FilePlus size={20} /> },
                { key: 'messages', label: 'Messages', path: '/messages', icon: <MessageSquare size={20} /> },
                { key: 'live', label: 'Live Sessions', path: '/live-sessions', icon: <Video size={20} /> },
                { key: 'settings', label: 'Settings', path: '/instructor/settings', icon: <Settings size={20} /> },
            ];
        } else if (role === 'Admin') {
            return [
                { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
                { key: 'audit-logs', label: 'Audit Logs', path: '/admin/audit-logs', icon: <Shield size={20} /> },
                { key: 'messages', label: 'Messages', path: '/messages', icon: <MessageSquare size={20} /> },
                { key: 'live', label: 'Live Sessions', path: '/live-sessions', icon: <Video size={20} /> },
                { key: 'catalog', label: 'Course Catalog', path: '/courses', icon: <BookOpen size={20} /> },
            ];
        } else {
            // Student or Default
            return [
                { key: 'dashboard', label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={20} /> },
                { key: 'courses', label: 'Course Catalog', path: '/courses', icon: <BookOpen size={20} /> },
                { key: 'wishlist', label: 'Wishlist', path: '/student/wishlist', icon: <Heart size={20} /> },
                { key: 'certificates', label: 'Certificates', path: '/student/certificates', icon: <Award size={20} /> },
                { key: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={20} /> },
                { key: 'messages', label: 'Messages', path: '/messages', icon: <MessageSquare size={20} /> },
                { key: 'live', label: 'Live Sessions', path: '/live-sessions', icon: <Video size={20} /> },
                { key: 'profile', label: 'Profile', path: '/student/profile', icon: <User size={20} /> },
            ];
        }
    })();

    // Sidebar reposition (drag left/right)
    const [position, setPosition] = useState(() => localStorage.getItem('emare-sidebar-position') === 'right' ? 'right' : 'left');
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const asideRef = useRef(null);
    const dragStartX = useRef(0);
    const dragStartLeft = useRef(0);

    useEffect(() => {
        document.body.classList.toggle('emare-sidebar-right', position === 'right');
        localStorage.setItem('emare-sidebar-position', position);
        return () => document.body.classList.remove('emare-sidebar-right');
    }, [position]);

    const startDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        const rect = asideRef.current.getBoundingClientRect();
        dragStartX.current = e.clientX;
        dragStartLeft.current = rect.left;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onDrag = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX.current;
        const newLeft = Math.max(0, Math.min(window.innerWidth - SIDEBAR_WIDTH, dragStartLeft.current + dx));
        setDragOffset(newLeft);
    };

    const endDrag = () => {
        if (!isDragging) return;
        const midpoint = (window.innerWidth - SIDEBAR_WIDTH) / 2;
        setPosition(dragOffset < midpoint ? 'left' : 'right');
        setDragOffset(0);
        setIsDragging(false);
    };

    const handlePosition = position === 'right' ? 'left' : 'right';

    return (
        <aside
            ref={asideRef}
            style={{
                ...styles.sidebar,
                background: colors.bgCard,
                borderRight: position === 'left' ? `1px solid ${colors.border}` : 'none',
                borderLeft: position === 'right' ? `1px solid ${colors.border}` : 'none',
                left: isDragging ? dragOffset : (position === 'left' ? 0 : 'auto'),
                right: isDragging ? 'auto' : (position === 'right' ? 0 : 'auto'),
                transition: isDragging ? 'none' : 'left 0.25s ease, right 0.25s ease, background 0.3s, border-color 0.3s'
            }}
        >
            {/* Drag handle to reposition the sidebar */}
            <div
                style={{ ...styles.dragHandle, [handlePosition]: -6 }}
                onPointerDown={startDrag}
                onPointerMove={onDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                title="Drag to move sidebar left/right"
                aria-label="Drag to move sidebar left/right"
            >
                <span style={{ ...styles.dragGrip, background: isDragging ? colors.primary : colors.bgInput, border: `1px solid ${colors.border}` }}>
                    <span style={{ ...styles.dragDot, background: colors.textMuted }} />
                    <span style={{ ...styles.dragDot, background: colors.textMuted }} />
                    <span style={{ ...styles.dragDot, background: colors.textMuted }} />
                </span>
            </div>

            {/* Header: Logo + Notifications + Theme Toggle */}
            <div style={styles.headerBox}>
                <div style={styles.logoBox}>
                    <div style={styles.logo}>E</div>
                    <span style={{ ...styles.logoText, color: colors.text }}>Emare ELMS</span>
                </div>
                <div style={styles.actionsBox}>
                    <button onClick={toggleTheme} style={styles.iconBtn} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                        {theme === 'dark' ? <Sun size={26} /> : <Moon size={26} />}
                    </button>
                    <NotificationBell />
                </div>
            </div>

            {/* Navigation */}
            <nav style={styles.nav}>
                {effectiveNavItems.map((item) => {
                    const isActive = activeTab === item.key || location.pathname === item.path;
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
                            {item.icon && (
                                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                    {React.cloneElement(item.icon, { size: 28 })}
                                </span>
                            )}
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
                    <div style={styles.userAvatar}>
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                            user?.fullName?.[0]?.toUpperCase()
                        )}
                    </div>
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
                            onClick={() => { navigate('/courses'); setAccountDropdownOpen(false); }}
                            style={{ ...styles.dropdownItem, color: colors.text, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <BookOpen size={20} aria-hidden="true" /> Course Catalog
                        </button>
                        <button 
                            onClick={() => { navigate('/'); setAccountDropdownOpen(false); }}
                            style={{ ...styles.dropdownItem, color: colors.text, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <Home size={20} aria-hidden="true" /> Home Page
                        </button>
                        <button 
                            onClick={async () => { 
                                await logout(); 
                                setAccountDropdownOpen(false);
                                navigate('/'); 
                            }}
                            style={{ ...styles.dropdownItem, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <LogOut size={20} aria-hidden="true" /> Sign Out
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}

const styles = {
    sidebar: {
        width: `${SIDEBAR_WIDTH}px`,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px 32px',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        zIndex: 20
    },
    dragHandle: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '14px',
        cursor: 'ew-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none'
    },
    dragGrip: {
        width: '10px',
        height: '56px',
        borderRadius: '99px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        transition: 'background 0.2s',
        cursor: 'ew-resize'
    },
    dragDot: {
        width: '3px',
        height: '3px',
        borderRadius: '50%',
        flexShrink: 0
    },
    headerBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' },
    logoBox: { display: 'flex', alignItems: 'center', gap: '10px' },
    logo: {
        width: '40px', height: '40px', borderRadius: '10px',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '900', color: '#fff', fontSize: '18px'
    },
    logoText: { fontWeight: '700', fontSize: '16px' },
    actionsBox: { display: 'flex', alignItems: 'center', gap: '8px' },
    iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px', display: 'flex', alignItems: 'center' },
    nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' },
    navItem: {
        textDecoration: 'none',
        padding: '12px 14px',
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
        gap: '12px'
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
