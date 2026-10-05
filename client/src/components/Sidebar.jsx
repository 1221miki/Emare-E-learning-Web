import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationBell from './NotificationBell';
import { 
    Sun, Moon, BookOpen, LogOut, LayoutDashboard, Award, 
    Trophy, MessageSquare, Video, User, Settings, PlusCircle, Shield, Inbox,
    ChevronLeft, ChevronRight
} from 'lucide-react';

const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 76;

export default function Sidebar({ navItems = [], activeTab, onTabChange, extraBottomButtons }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('emare-sidebar-collapsed') === 'true');
    const [hoveredItemKey, setHoveredItemKey] = useState(null);
    const [isToggleHovered, setIsToggleHovered] = useState(false);

    const SIDEBAR_WIDTH = isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

    const getProfilePath = () => {
        switch (user?.assignedRole) {
            case 'Admin': return '/admin/dashboard';
            case 'Instructor': return '/instructor/settings';
            default: return '/student/profile';
        }
    };

    const getProfileNavState = () => {
        if (user?.assignedRole === 'Admin') return { activeTab: 'profile' };
        return undefined;
    };

    // Fallback default nav items if not provided by parent
    const effectiveNavItems = (navItems && navItems.length > 0) ? navItems : (() => {
        const role = user?.assignedRole;
        if (role === 'Instructor') {
            return [
                { key: 'dashboard', label: 'Dashboard', path: '/instructor/dashboard', icon: <LayoutDashboard size={20} /> },
                { key: 'create-course', label: 'Create Course', path: '/instructor/courses/new', icon: <PlusCircle size={20} /> },
                { key: 'messages', label: 'Messages', path: '/messages', icon: <MessageSquare size={20} /> },
                { key: 'live', label: 'Live Sessions', path: '/live-sessions', icon: <Video size={20} /> },
                { key: 'settings', label: 'Settings', path: '/instructor/settings', icon: <Settings size={20} /> },
            ];
        } else if (role === 'Admin') {
            return [
                { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
                { key: 'audit-logs', label: 'Audit Logs', path: '/admin/audit-logs', icon: <Shield size={20} /> },
                { key: 'contact-messages', label: 'Contact Messages', path: '/admin/contact-messages', icon: <Inbox size={20} /> },
                { key: 'messages', label: 'Messages', path: '/messages', icon: <MessageSquare size={20} /> },
                { key: 'live', label: 'Live Sessions', path: '/live-sessions', icon: <Video size={20} /> },
                { key: 'catalog', label: 'Courses', path: '/courses', icon: <BookOpen size={20} /> },
            ];
        } else {
            // Student or Default
            return [
                { key: 'dashboard', label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={20} /> },
                { key: 'courses', label: 'Courses', path: '/courses', icon: <BookOpen size={20} /> },
                { key: 'certificates', label: 'Certificates', path: '/student/certificates', icon: <Award size={20} /> },
                { key: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={20} /> },
                { key: 'messages', label: 'Messages', path: '/messages', icon: <MessageSquare size={20} /> },
                { key: 'live', label: 'Live Sessions', path: '/live-sessions', icon: <Video size={20} /> },
                { key: 'profile', label: 'Profile', path: '/student/profile', icon: <User size={20} /> },
            ];
        }
    })();

    // Sidebar reposition (click left/right)
    const [position, setPosition] = useState(() => localStorage.getItem('emare-sidebar-position') === 'right' ? 'right' : 'left');

    useEffect(() => {
        document.body.classList.toggle('emare-sidebar-right', position === 'right');
        document.body.style.setProperty('--sidebar-width', `${SIDEBAR_WIDTH}px`);
        document.documentElement.style.setProperty('--sidebar-width', `${SIDEBAR_WIDTH}px`);
        localStorage.setItem('emare-sidebar-position', position);
        localStorage.setItem('emare-sidebar-collapsed', isCollapsed ? 'true' : 'false');
        // Notify responsive containers (charts, grids, etc.)
        window.dispatchEvent(new Event('resize'));
        return () => {
            document.body.classList.remove('emare-sidebar-right');
        };
    }, [position, isCollapsed, SIDEBAR_WIDTH]);

    // Keyboard shortcut: Ctrl + B / Cmd + B to toggle collapse/expand
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
                // Don't trigger if focus is inside an input/textarea
                const tag = document.activeElement?.tagName?.toLowerCase();
                if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
                    return;
                }
                e.preventDefault();
                setIsCollapsed(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleCollapse = () => setIsCollapsed(!isCollapsed);
    const togglePosition = () => setPosition(position === 'left' ? 'right' : 'left');

    const handlePosition = position === 'right' ? 'left' : 'right';

    // Smart chevron direction based on collapse state and sidebar position
    const renderCollapseIcon = () => {
        if (position === 'left') {
            return isCollapsed ? <ChevronRight size={15} strokeWidth={2.5} /> : <ChevronLeft size={15} strokeWidth={2.5} />;
        } else {
            return isCollapsed ? <ChevronLeft size={15} strokeWidth={2.5} /> : <ChevronRight size={15} strokeWidth={2.5} />;
        }
    };

    return (
        <aside
            style={{
                ...styles.sidebar,
                width: `${SIDEBAR_WIDTH}px`,
                padding: isCollapsed ? '20px 10px 24px' : '24px 16px 32px',
                background: colors.bgCard,
                borderRight: position === 'left' ? `1px solid ${colors.border}` : 'none',
                borderLeft: position === 'right' ? `1px solid ${colors.border}` : 'none',
                left: position === 'left' ? 0 : 'auto',
                right: position === 'right' ? 0 : 'auto',
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), left 0.25s ease, right 0.25s ease, background 0.3s, border-color 0.3s'
            }}
        >
            {/* ── SMART COLLAPSE / EXPAND BUTTON ──────────────────────────── */}
            <button
                onClick={toggleCollapse}
                onMouseEnter={() => setIsToggleHovered(true)}
                onMouseLeave={() => setIsToggleHovered(false)}
                style={{
                    position: 'absolute',
                    top: '24px',
                    [position === 'right' ? 'left' : 'right']: '-14px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isToggleHovered ? colors.primary : colors.bgCard,
                    border: `1.5px solid ${isToggleHovered ? colors.primary : colors.border}`,
                    color: isToggleHovered ? '#ffffff' : colors.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.12)',
                    zIndex: 40,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isToggleHovered ? 'scale(1.12)' : 'scale(1)',
                    outline: 'none',
                    padding: 0
                }}
                title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                {renderCollapseIcon()}
            </button>

            {/* Reposition Handle: Middle Edge of Sidebar */}
            <div
                style={{ 
                    ...styles.dragHandle, 
                    [handlePosition]: -6, 
                    cursor: 'pointer',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '60px'
                }}
                onClick={togglePosition}
                title="Click to move sidebar left/right"
                aria-label="Click to move sidebar left/right"
            >
                <span style={{ ...styles.dragGrip, background: colors.bgInput, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                    <span style={{ ...styles.dragDot, background: colors.textMuted }} />
                    <span style={{ ...styles.dragDot, background: colors.textMuted }} />
                    <span style={{ ...styles.dragDot, background: colors.textMuted }} />
                </span>
            </div>

            {/* ── HEADER: LOGO & ACTIONS ─────────────────────────────────── */}
            {!isCollapsed ? (
                <div style={styles.headerBox}>
                    <Link to="/" style={{ ...styles.logoBox, cursor: 'pointer', textDecoration: 'none' }} className="transition-opacity hover:opacity-90">
                        <img src="/images/Real Emare ICT Hub logo.png" alt="Emare ICT Hub Logo" className="h-10 w-10 bg-transparent object-contain" />
                        <span style={{ color: colors.text, fontSize: '18px', fontWeight: '700', whiteSpace: 'nowrap' }}>Emare ICT Hub</span>
                    </Link>
                    <div style={styles.actionsBox}>
                        <button onClick={toggleTheme} style={styles.iconBtn} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
                        </button>
                        <NotificationBell />
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <Link to="/" style={{ cursor: 'pointer', textDecoration: 'none' }} title="Emare ICT Hub" className="transition-opacity hover:opacity-90">
                        <img src="/images/Real Emare ICT Hub logo.png" alt="Emare ICT Hub Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button onClick={toggleTheme} style={{ ...styles.iconBtn, padding: '6px' }} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <NotificationBell />
                    </div>
                </div>
            )}

            {/* ── NAVIGATION ITEMS ────────────────────────────────────────── */}
            <nav style={styles.nav}>
                {effectiveNavItems.map((item) => {
                    const isActive = activeTab === item.key || location.pathname === item.path;
                    const itemKey = item.key || item.label;
                    const isHovered = hoveredItemKey === itemKey;

                    const itemStyles = {
                        ...styles.navItem,
                        color: isActive ? colors.primary : colors.textMuted,
                        background: isActive 
                            ? (theme === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)') 
                            : (theme === 'dark' ? 'rgba(30,41,59,0.2)' : 'rgba(241,245,249,0.5)'),
                        fontWeight: isActive ? '600' : '500',
                        borderTop: `1px solid ${colors.border}`,
                        borderRight: `1px solid ${colors.border}`,
                        borderBottom: `1px solid ${colors.border}`,
                        borderLeft: isActive ? `4px solid ${colors.primary}` : `1px solid ${colors.border}`,
                        padding: isCollapsed ? '10px 0' : '12px 14px',
                        justifyContent: isCollapsed ? 'center' : 'space-between',
                        position: 'relative'
                    };

                    const labelContent = (
                        <>
                            <span style={{ ...styles.navItemContent, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                                {item.icon && (
                                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, position: 'relative' }}>
                                        {React.cloneElement(item.icon, { size: isCollapsed ? 22 : 20 })}
                                        {/* Mini Badge indicator when collapsed */}
                                        {isCollapsed && item.badge ? (
                                            <span style={{
                                                position: 'absolute',
                                                top: '-6px',
                                                right: '-8px',
                                                background: colors.primary,
                                                color: '#fff',
                                                borderRadius: '999px',
                                                fontSize: '10px',
                                                fontWeight: '800',
                                                minWidth: '16px',
                                                height: '16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0 3px',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}>
                                                {item.badge}
                                            </span>
                                        ) : null}
                                    </span>
                                )}
                                {!isCollapsed && <span>{item.label}</span>}
                                {!isCollapsed && item.badge ? (
                                    <span style={{ ...styles.navBadge, background: colors.primary }}>{item.badge}</span>
                                ) : null}
                            </span>

                            {/* Smart floating tooltip when collapsed */}
                            {isCollapsed && isHovered && (
                                <div style={{
                                    position: 'absolute',
                                    [position === 'right' ? 'right' : 'left']: 'calc(100% + 12px)',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: theme === 'dark' ? '#1e293b' : '#0f172a',
                                    color: '#ffffff',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap',
                                    zIndex: 100,
                                    pointerEvents: 'none',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    animation: 'fadeIn 0.15s ease-out'
                                }}>
                                    <span>{item.label}</span>
                                    {item.badge ? (
                                        <span style={{ background: colors.primary, color: '#fff', borderRadius: '999px', padding: '1px 6px', fontSize: '10px', fontWeight: '800' }}>
                                            {item.badge}
                                        </span>
                                    ) : null}
                                </div>
                            )}
                        </>
                    );

                    if (item.path) {
                        return (
                            <Link
                                key={itemKey}
                                to={item.path}
                                style={itemStyles}
                                onMouseEnter={() => setHoveredItemKey(itemKey)}
                                onMouseLeave={() => setHoveredItemKey(null)}
                            >
                                {labelContent}
                            </Link>
                        );
                    }
                    return (
                        <button
                            key={itemKey}
                            onClick={() => onTabChange && onTabChange(item.key)}
                            style={itemStyles}
                            onMouseEnter={() => setHoveredItemKey(itemKey)}
                            onMouseLeave={() => setHoveredItemKey(null)}
                        >
                            {labelContent}
                        </button>
                    );
                })}

                {/* Optional extra bottom buttons */}
                {extraBottomButtons && (
                    <div style={{ marginTop: '12px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        {!isCollapsed ? (
                            extraBottomButtons
                        ) : (
                            <button
                                onClick={() => navigate('/courses')}
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent || colors.primary})`,
                                    border: 'none',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(34,197,94,0.25)'
                                }}
                                title="Course Catalog"
                                aria-label="Course Catalog"
                            >
                                <BookOpen size={18} />
                            </button>
                        )}
                    </div>
                )}
            </nav>

            {/* ── USER INFO / ACCOUNT DROPDOWN ──────────────────────────── */}
            <div style={{ position: 'relative' }}>
                <div 
                    style={{ 
                        ...styles.userInfo, 
                        borderTop: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        padding: isCollapsed ? '12px 0 0 0' : '12px 10px',
                        justifyContent: isCollapsed ? 'center' : 'flex-start'
                    }}
                    onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                    title={isCollapsed ? `${user?.fullName || 'Profile'} (Click to open menu)` : 'Click to open account menu'}
                >
                    <div style={{ position: 'relative' }}>
                        <div style={styles.userAvatar}>
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} crossOrigin="anonymous" />
                            ) : (
                                user?.fullName?.[0]?.toUpperCase() || 'U'
                            )}
                        </div>
                        {/* Active online indicator dot */}
                        <span style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '9px',
                            height: '9px',
                            borderRadius: '50%',
                            background: '#22c55e',
                            border: `2px solid ${colors.bgCard}`
                        }} />
                    </div>

                    {!isCollapsed && (
                        <>
                            <div style={styles.userMeta}>
                                <span style={{ ...styles.userName, color: colors.text }}>{user?.fullName}</span>
                                <span style={{ ...styles.userRole, color: colors.textMuted }}>{user?.assignedRole}</span>
                            </div>
                            <span style={{ marginLeft: 'auto', fontSize: '12px', transition: 'transform 0.2s', transform: accountDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        </>
                    )}
                </div>

                {/* Dropdown Menu */}
                {accountDropdownOpen && (
                    <div 
                        style={{
                            ...styles.accountDropdown,
                            background: colors.bgCard,
                            border: `1px solid ${colors.border}`,
                            boxShadow: theme === 'dark' ? '0 12px 36px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
                            [position === 'right' ? 'right' : 'left']: isCollapsed ? (position === 'right' ? 'auto' : 'calc(100% + 10px)') : '-4px',
                            [position === 'right' && isCollapsed ? 'right' : '']: isCollapsed && position === 'right' ? 'calc(100% + 10px)' : undefined,
                            bottom: isCollapsed ? '0' : 'calc(100% + 8px)',
                            minWidth: '220px'
                        }}
                    >
                        {/* Header in dropdown */}
                        <div style={{ ...styles.dropdownHeader, borderBottom: `1px solid ${colors.border}` }}>
                            <span style={{ color: colors.text, fontWeight: '700', fontSize: '13px' }}>{user?.fullName}</span>
                            <span style={{ color: colors.textMuted, fontSize: '11px' }}>{user?.assignedRole}</span>
                        </div>

                        {/* Menu Items */}
                        <button
                            onClick={() => {
                                if (onTabChange && user?.assignedRole === 'Admin') {
                                    onTabChange('profile');
                                }
                                navigate(getProfilePath(), { state: getProfileNavState() });
                                setAccountDropdownOpen(false);
                            }}
                            style={{ ...styles.dropdownItem, color: colors.text, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <Settings size={18} aria-hidden="true" /> {t('menu_profile_settings') || 'Profile Settings'}
                        </button>
                        <button 
                            onClick={() => { navigate('/courses'); setAccountDropdownOpen(false); }}
                            style={{ ...styles.dropdownItem, color: colors.text, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <BookOpen size={18} aria-hidden="true" /> {t('menu_courses') || 'Courses'}
                        </button>
                        <button 
                            onClick={async () => { 
                                await logout(); 
                                setAccountDropdownOpen(false);
                                navigate('/'); 
                            }}
                            style={{ ...styles.dropdownItem, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <LogOut size={18} aria-hidden="true" /> {t('menu_sign_out') || 'Sign Out'}
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}

const styles = {
    sidebar: {
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        zIndex: 20,
        boxSizing: 'border-box'
    },
    dragHandle: {
        position: 'absolute',
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
        height: '48px',
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
    headerBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '28px', minWidth: 'max-content' },
    logoBox: { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 },
    logo: {
        width: '40px', height: '40px', borderRadius: '10px',
        background: 'linear-gradient(135deg, #22c55e, #22c55e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '900', color: '#fff', fontSize: '18px'
    },
    logoText: { fontWeight: '700', fontSize: '16px' },
    actionsBox: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
    iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px', display: 'flex', alignItems: 'center' },
    nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' },
    navItem: {
        textDecoration: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderLeft: '4px solid transparent'
    },
    navItemContent: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%'
    },
    navBadge: {
        color: '#fff',
        borderRadius: '999px',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: '700',
        minWidth: '22px',
        textAlign: 'center',
        lineHeight: 1
    },
    userInfo: {
        display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '12px', paddingTop: '16px',
        borderRadius: '10px',
        position: 'relative'
    },
    accountDropdown: {
        position: 'absolute',
        borderRadius: '12px',
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
        background: 'linear-gradient(135deg, #22c55e, #22c55e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: '800', fontSize: '15px', flexShrink: 0
    },
    userMeta: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    userName: { fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    userRole: { fontSize: '11px' }
};
