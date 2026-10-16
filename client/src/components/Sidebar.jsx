import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationBell from './NotificationBell';
import { 
    Sun, Moon, BookOpen, LogOut, LayoutDashboard, Award, 
    MessageSquare, Video, User, Settings, PlusCircle, Shield, Inbox,
    ChevronLeft, ChevronRight, BarChart3, Users, Wallet, Megaphone,
    ClipboardCheck, Code2, Clock3, GraduationCap, CreditCard, MessagesSquare, Star
} from 'lucide-react';

const SIDEBAR_WIDTH_EXPANDED = 270;
const SIDEBAR_WIDTH_COLLAPSED = 76;

export default function Sidebar({ navItems = [], activeTab, onTabChange, extraBottomButtons, forceExpanded = false }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('emare-sidebar-collapsed') === 'true');
    const [hoveredItemKey, setHoveredItemKey] = useState(null);
    const [isToggleHovered, setIsToggleHovered] = useState(false);

    // If forceExpanded is true (e.g. on Messaging page), sidebar stays static & fully visible
    const isEffectiveCollapsed = forceExpanded ? false : isCollapsed;
    const SIDEBAR_WIDTH = isEffectiveCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

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
                { key: 'overview', label: 'Dashboard', path: '/instructor/dashboard', state: { activeTab: 'overview' }, icon: <LayoutDashboard size={20} /> },
                { key: 'courses', label: 'My Courses', path: '/instructor/dashboard', state: { activeTab: 'courses' }, icon: <BookOpen size={20} /> },
                { key: 'students', label: 'Students', path: '/instructor/dashboard', state: { activeTab: 'students' }, icon: <Users size={20} /> },
                { key: 'live', label: 'Live Classes', path: '/instructor/dashboard', state: { activeTab: 'live' }, icon: <Video size={20} /> },
                { key: 'analytics', label: 'Analytics', path: '/instructor/dashboard', state: { activeTab: 'analytics' }, icon: <BarChart3 size={20} /> },
                { key: 'messages', label: 'Messages', path: '/messages', state: { activeTab: 'messages' }, icon: <MessagesSquare size={20} /> },
                { key: 'reviews', label: 'Reviews', path: '/instructor/dashboard', state: { activeTab: 'reviews' }, icon: <Star size={20} /> },
                { key: 'settings', label: 'Settings', path: '/instructor/settings', state: { activeTab: 'settings' }, icon: <Settings size={20} /> }
            ];
        } else if (role === 'Admin') {
            return [
                { key: 'overview', label: 'Overview', path: '/admin/dashboard', state: { activeTab: 'overview' }, icon: <LayoutDashboard size={20} /> },
                { key: 'users', label: 'User Management', path: '/admin/dashboard', state: { activeTab: 'users' }, icon: <Users size={20} /> },
                { key: 'security', label: 'Security & Roles', path: '/admin/dashboard', state: { activeTab: 'security' }, icon: <Shield size={20} /> },
                { key: 'courses', label: 'Course Management', path: '/admin/dashboard', state: { activeTab: 'courses' }, icon: <BookOpen size={20} /> },
                { key: 'analytics', label: 'Analytics Dashboard', path: '/admin/dashboard', state: { activeTab: 'analytics' }, icon: <BarChart3 size={20} /> },
                { key: 'finances', label: 'Finances & Revenue', path: '/admin/dashboard', state: { activeTab: 'finances' }, icon: <Wallet size={20} /> },
                { key: 'cms', label: 'CMS & Comms', path: '/admin/dashboard', state: { activeTab: 'cms' }, icon: <Megaphone size={20} /> },
                { key: 'audit', label: 'Audit Logs', path: '/admin/audit-logs', icon: <ClipboardCheck size={20} /> },
                { key: 'contact-messages', label: 'Contact Messages', path: '/admin/contact-messages', icon: <Inbox size={20} /> },
                { key: 'messages', label: 'Direct Messages', path: '/messages', state: { activeTab: 'messages' }, icon: <MessagesSquare size={20} /> },
                { key: 'developers', label: 'Developers', path: '/admin/dashboard', state: { activeTab: 'developers' }, icon: <Code2 size={20} /> },
                { key: 'calendar', label: 'Event Management', path: '/admin/dashboard', state: { activeTab: 'calendar' }, icon: <Clock3 size={20} /> },
                { key: 'system', label: 'System Settings', path: '/admin/dashboard', state: { activeTab: 'system' }, icon: <Settings size={20} /> }
            ];
        } else {
            // Student or Default
            return [
                { key: 'overview', label: 'Overview', path: '/student/dashboard', state: { activeTab: 'overview' }, icon: <LayoutDashboard size={20} /> },
                { key: 'learning', label: 'My Learning', path: '/student/dashboard?tab=my_courses', state: { activeTab: 'learning' }, icon: <GraduationCap size={20} /> },
                { key: 'live', label: 'Live Sessions', path: '/live-sessions', state: { activeTab: 'live' }, icon: <Video size={20} /> },
                { key: 'discussions', label: 'Discussions', path: '/student/dashboard?tab=discussions', state: { activeTab: 'discussions' }, icon: <MessageSquare size={20} /> },
                { key: 'messages', label: 'Messages', path: '/messages', state: { activeTab: 'messages' }, icon: <MessagesSquare size={20} /> },
                { key: 'certificates', label: 'Certificates', path: '/student/certificates', icon: <Award size={20} /> },
                { key: 'payments', label: 'Payments', path: '/student/dashboard?tab=payments', state: { activeTab: 'payments' }, icon: <CreditCard size={20} /> },
                { key: 'settings', label: 'Settings', path: '/student/profile', icon: <Settings size={20} /> }
            ];
        }
    })();

    // Sidebar reposition (click left/right)
    const [position, setPosition] = useState(() => localStorage.getItem('emare-sidebar-position') === 'right' ? 'right' : 'left');

    useEffect(() => {
        document.body.classList.toggle('emare-sidebar-right', position === 'right');
        document.body.style.setProperty('--sidebar-width', `${SIDEBAR_WIDTH}px`);
        document.documentElement.style.setProperty('--sidebar-width', `${SIDEBAR_WIDTH}px`);
        if (!forceExpanded) {
            localStorage.setItem('emare-sidebar-collapsed', isCollapsed ? 'true' : 'false');
        }
        localStorage.setItem('emare-sidebar-position', position);
        // Notify responsive containers (charts, grids, etc.)
        window.dispatchEvent(new Event('resize'));
        return () => {
            document.body.classList.remove('emare-sidebar-right');
        };
    }, [position, isCollapsed, SIDEBAR_WIDTH, forceExpanded]);

    // Keyboard shortcut: Ctrl + B / Cmd + B to toggle collapse/expand (disabled when forceExpanded)
    useEffect(() => {
        if (forceExpanded) return;
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
    }, [forceExpanded]);

    const toggleCollapse = () => {
        if (!forceExpanded) setIsCollapsed(!isCollapsed);
    };
    const togglePosition = () => setPosition(position === 'left' ? 'right' : 'left');

    const handlePosition = position === 'right' ? 'left' : 'right';

    // Smart chevron direction based on collapse state and sidebar position
    const renderCollapseIcon = () => {
        if (position === 'left') {
            return isEffectiveCollapsed ? <ChevronRight size={15} strokeWidth={2.5} /> : <ChevronLeft size={15} strokeWidth={2.5} />;
        } else {
            return isEffectiveCollapsed ? <ChevronLeft size={15} strokeWidth={2.5} /> : <ChevronRight size={15} strokeWidth={2.5} />;
        }
    };

    return (
        <aside
            style={{
                ...styles.sidebar,
                width: `${SIDEBAR_WIDTH}px`,
                padding: isEffectiveCollapsed ? '20px 10px 24px' : '24px 16px 32px',
                background: colors.bgCard,
                borderRight: position === 'left' ? `1px solid ${colors.border}` : 'none',
                borderLeft: position === 'right' ? `1px solid ${colors.border}` : 'none',
                left: position === 'left' ? 0 : 'auto',
                right: position === 'right' ? 0 : 'auto',
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), left 0.25s ease, right 0.25s ease, background 0.3s, border-color 0.3s'
            }}
        >
            {/* ── SMART COLLAPSE / EXPAND BUTTON (Hidden when forceExpanded) ──────────────── */}
            {!forceExpanded && (
                <button
                    onClick={toggleCollapse}
                    onMouseEnter={() => setIsToggleHovered(true)}
                    onMouseLeave={() => setIsToggleHovered(false)}
                    style={{
                        position: 'absolute',
                        top: '72px',
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
                    title={isEffectiveCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
                    aria-label={isEffectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {renderCollapseIcon()}
                </button>
            )}

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
            {!isEffectiveCollapsed ? (
                <div style={styles.headerBox}>
                    <Link to="/" style={{ ...styles.logoBox, cursor: 'pointer', textDecoration: 'none' }} className="transition-opacity hover:opacity-90">
                        <img src="/images/Real Emare ICT Hub logo.png" alt="Emare ICT Hub Logo" className="h-9 w-9 bg-transparent object-contain" />
                        <span style={{ color: colors.text, fontSize: '16px', fontWeight: '700', whiteSpace: 'nowrap' }}>Emare ICT Hub</span>
                    </Link>
                    <div style={styles.actionsBox}>
                        <button onClick={toggleTheme} style={styles.iconBtn} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                            {theme === 'dark' ? <Sun size={20} color={colors.text} /> : <Moon size={20} color={colors.text} />}
                        </button>
                        <NotificationBell />
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
                    <Link to="/" style={{ cursor: 'pointer', textDecoration: 'none' }} title="Emare ICT Hub" className="transition-opacity hover:opacity-90">
                        <img src="/images/Real Emare ICT Hub logo.png" alt="Emare ICT Hub Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                    </Link>
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
                        padding: isEffectiveCollapsed ? '10px 0' : '12px 14px',
                        justifyContent: isEffectiveCollapsed ? 'center' : 'space-between',
                        position: 'relative'
                    };

                    const labelContent = (
                        <>
                            <span style={{ ...styles.navItemContent, justifyContent: isEffectiveCollapsed ? 'center' : 'flex-start' }}>
                                {item.icon && (
                                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, position: 'relative' }}>
                                        {React.cloneElement(item.icon, { size: isEffectiveCollapsed ? 22 : 20 })}
                                        {/* Mini Badge indicator when collapsed */}
                                        {isEffectiveCollapsed && item.badge ? (
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
                                {!isEffectiveCollapsed && <span>{item.label}</span>}
                                {!isEffectiveCollapsed && item.badge ? (
                                    <span style={{ ...styles.navBadge, background: colors.primary }}>{item.badge}</span>
                                ) : null}
                            </span>

                            {/* Smart floating tooltip when collapsed */}
                            {isEffectiveCollapsed && isHovered && (
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
                                state={item.state}
                                onClick={() => onTabChange && onTabChange(item.key)}
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
            </nav>

            {/* Collapsed Mode Quick Actions */}
            {isEffectiveCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: `1px solid ${colors.border}`, marginBottom: '10px' }}>
                    <NotificationBell />
                    <button onClick={toggleTheme} style={styles.iconBtn} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                        {theme === 'dark' ? <Sun size={19} color={colors.text} /> : <Moon size={19} color={colors.text} />}
                    </button>
                </div>
            )}

            {/* ── USER INFO / ACCOUNT DROPDOWN ──────────────────────────── */}
            <div style={{ position: 'relative', flexShrink: 0, marginTop: 'auto' }}>
                <div 
                    style={{ 
                        ...styles.userInfo, 
                        borderTop: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        padding: isEffectiveCollapsed ? '12px 0 0 0' : '12px 10px',
                        justifyContent: isEffectiveCollapsed ? 'center' : 'flex-start'
                    }}
                    onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                    title={isEffectiveCollapsed ? `${user?.fullName || 'Profile'} (Click to open menu)` : 'Click to open account menu'}
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

                    {!isEffectiveCollapsed && (
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
                            [position === 'right' ? 'right' : 'left']: isEffectiveCollapsed ? (position === 'right' ? 'auto' : 'calc(100% + 10px)') : '-4px',
                            [position === 'right' && isEffectiveCollapsed ? 'right' : '']: isEffectiveCollapsed && position === 'right' ? 'calc(100% + 10px)' : undefined,
                            bottom: isEffectiveCollapsed ? '0' : 'calc(100% + 8px)',
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
        maxHeight: '100vh',
        overflow: 'hidden',
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
    headerBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '24px', width: '100%', boxSizing: 'border-box', flexShrink: 0 },
    logoBox: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
    logo: {
        width: '38px', height: '38px', borderRadius: '10px',
        background: 'linear-gradient(135deg, #22c55e, #22c55e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '900', color: '#fff', fontSize: '18px'
    },
    logoText: { fontWeight: '700', fontSize: '16px' },
    actionsBox: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
    iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    nav: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin'
    },
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
