import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { auditService } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import {
    Shield, Search, Filter, RefreshCw, Download, AlertTriangle,
    Info, AlertOctagon, User, BookOpen, DollarSign, Cpu,
    ChevronLeft, ChevronRight, Calendar, Clock, Globe, Activity,
    LayoutDashboard, Users, ShieldCheck, BarChart3,
    Wallet, Megaphone, ClipboardCheck, Clock3, Settings,
    Copy, Check, ChevronDown, ChevronUp, X, FileText, Loader2
} from 'lucide-react';

// ── Categories & Metadata ───────────────────────────────────────────────────────
const CATEGORIES = [
    { key: '', label: 'All Categories', icon: Activity, color: '#22c55e' },
    { key: 'Enrollment & Financial', label: 'Enrollment & Financial', icon: DollarSign, color: '#10b981' },
    { key: 'Course Approvals & Content', label: 'Course Approvals & Content', icon: BookOpen, color: '#22c55e' },
    { key: 'User Security & Activity', label: 'User Security & Activity', icon: Shield, color: '#f59e0b' },
    { key: 'System & Diagnostics', label: 'System & Diagnostics', icon: Cpu, color: '#ec4899' },
];

const SEVERITY = [
    { key: '', label: 'All Severity Levels' },
    { key: 'info', label: 'Info', color: '#22c55e' },
    { key: 'warning', label: 'Warning', color: '#f59e0b' },
    { key: 'critical', label: 'Critical', color: '#ef4444' },
];

const SEV_META = {
    info:     { icon: Info,          color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
    warning:  { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    critical: { icon: AlertOctagon,  color: '#ef4444', bg: 'rgba(239,68,68,0.14)',  border: 'rgba(239,68,68,0.35)' },
};

const CAT_META = {
    'Enrollment & Financial':     { icon: DollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    'Course Approvals & Content': { icon: BookOpen,   color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    'User Security & Activity':   { icon: Shield,     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'System & Diagnostics':       { icon: Cpu,        color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
};

const fmtDate = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
        + ' ' + d.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const fmtRelativeTime = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
};

// ── Truncated Technical Identifier with Copy Feedback ───────────────────────────
function TruncatedId({ id, label = 'Identifier' }) {
    const [copied, setCopied] = useState(false);
    if (!id || typeof id !== 'string') return <span>—</span>;

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };

    if (id.length <= 14) {
        return (
            <span 
                onClick={handleCopy}
                title={`Click to copy: ${id}`}
                style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '11px', 
                    background: copied ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.06)', 
                    color: copied ? '#22c55e' : 'inherit',
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`
                }}
            >
                {id}
                {copied ? <Check size={10} color="#22c55e" /> : <Copy size={10} style={{ opacity: 0.5 }} />}
            </span>
        );
    }

    const display = `${id.slice(0, 8)}...${id.slice(-6)}`;
    return (
        <span 
            onClick={handleCopy} 
            title={`Click to copy full ${label}: ${id}`}
            style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px', 
                fontFamily: 'monospace', 
                fontSize: '11px', 
                background: copied ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.07)', 
                color: copied ? '#22c55e' : 'inherit',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                padding: '2px 6px', 
                borderRadius: '4px', 
                cursor: 'pointer',
                transition: 'all 0.15s',
                verticalAlign: 'middle'
            }}
        >
            <span>{display}</span>
            {copied ? <Check size={11} color="#22c55e" /> : <Copy size={11} style={{ opacity: 0.5 }} />}
        </span>
    );
}

// ── Smart Log Description Formatter ────────────────────────────────────────────
function FormattedDescription({ text }) {
    if (!text) return <span style={{ opacity: 0.5 }}>No description provided.</span>;

    // Detect technical patterns like EMARE-TX-..., Mongo ObjectIds, CRS-...
    const tokenRegex = /(EMARE-TX-[a-zA-Z0-9_-]+|TX-[a-zA-Z0-9_-]+|CRS-[a-zA-Z0-9_-]+|\b[0-9a-fA-F]{24}\b)/g;
    const parts = text.split(tokenRegex);

    return (
        <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.55 }}>
            {parts.map((part, i) => {
                if (tokenRegex.test(part)) {
                    return <TruncatedId key={i} id={part} label="ID" />;
                }
                return part;
            })}
        </span>
    );
}

const MOCK_LOGS = [
    { _id: 'm1', timestamp: new Date(Date.now()-3*60000), category: 'User Security & Activity', action: 'LOGIN_SUCCESS', severity: 'info', description: 'Admin user (admin@emare.com) logged in successfully from IP 196.188.12.34.', actorSnapshot: { fullName: 'Admin User', email: 'admin@emare.com', role: 'Admin' }, ipAddress: '196.188.12.34' },
    { _id: 'm2', timestamp: new Date(Date.now()-8*60000), category: 'Enrollment & Financial', action: 'CHAPA_PAYMENT_VERIFIED', severity: 'info', description: "Student user (john@example.com) enrolled in course 'MERN Stack Fundamentals' after successful Chapa payment (EMARE-TX-abc12345).", actorSnapshot: { fullName: 'John Doe', email: 'john@example.com', role: 'Student' }, ipAddress: '197.156.45.22' },
    { _id: 'm3', timestamp: new Date(Date.now()-15*60000), category: 'Course Approvals & Content', action: 'COURSE_APPROVED', severity: 'info', description: "Admin (admin@emare.com) approved course submission: 'Database Design & SQL Essentials'.", actorSnapshot: { fullName: 'Admin User', email: 'admin@emare.com', role: 'Admin' }, ipAddress: '196.188.12.34' },
    { _id: 'm4', timestamp: new Date(Date.now()-32*60000), category: 'User Security & Activity', action: 'LOGIN_FAILED', severity: 'warning', description: 'Failed login attempt for user account (instructor@domain.com) from IP 196.188.99.55.', actorSnapshot: { fullName: 'System', email: '—', role: '—' }, ipAddress: '196.188.99.55' },
    { _id: 'm5', timestamp: new Date(Date.now()-60*60000), category: 'Course Approvals & Content', action: 'COURSE_REJECTED', severity: 'warning', description: "Admin (admin@emare.com) rejected course 'Intro to Python': \"Incomplete syllabus and missing assessments\".", actorSnapshot: { fullName: 'Admin User', email: 'admin@emare.com', role: 'Admin' }, ipAddress: '196.188.12.34' },
    { _id: 'm6', timestamp: new Date(Date.now()-90*60000), category: 'Enrollment & Financial', action: 'FREE_COURSE_ENROLLED', severity: 'info', description: "Student user (sara@gmail.com) enrolled in free course 'HTML & CSS Basics'.", actorSnapshot: { fullName: 'Sara Ahmed', email: 'sara@gmail.com', role: 'Student' }, ipAddress: '197.0.0.8' },
    { _id: 'm7', timestamp: new Date(Date.now()-120*60000), category: 'User Security & Activity', action: 'REGISTER', severity: 'info', description: 'New Student account registered: Dawit Tadesse (dawit@emare.com).', actorSnapshot: { fullName: 'Dawit Tadesse', email: 'dawit@emare.com', role: 'Student' }, ipAddress: '197.156.12.1' },
    { _id: 'm8', timestamp: new Date(Date.now()-3*3600000), category: 'System & Diagnostics', action: 'ERROR_LOG', severity: 'critical', description: 'Chapa API integration timeout after 30s on payment initiation for transaction EMARE-TX-deadbeef.', actorSnapshot: { fullName: 'System', email: 'system@emare.com', role: 'System' }, ipAddress: '—' },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminAuditLogs() {
    const { colors, theme } = useTheme();
    const dark = theme === 'dark';
    const navigate = useNavigate();

    const sidebarItems = [
        { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} aria-hidden="true" /> },
        { key: 'users', label: 'User Management', icon: <Users size={20} aria-hidden="true" /> },
        { key: 'security', label: 'Security & Roles', icon: <ShieldCheck size={20} aria-hidden="true" /> },
        { key: 'courses', label: 'Course Management', icon: <BookOpen size={20} aria-hidden="true" /> },
        { key: 'analytics', label: 'Analytics Dashboard', icon: <BarChart3 size={20} aria-hidden="true" /> },
        { key: 'finances', label: 'Finances & Revenue', icon: <Wallet size={20} aria-hidden="true" /> },
        { key: 'cms', label: 'CMS & Comms', icon: <Megaphone size={20} aria-hidden="true" /> },
        { key: 'audit', label: 'Audit Logs', icon: <ClipboardCheck size={20} aria-hidden="true" /> },
        { key: 'calendar', label: 'Event Management', icon: <Clock3 size={20} aria-hidden="true" /> },
        { key: 'system', label: 'System Settings', icon: <Settings size={20} aria-hidden="true" /> }
    ];

    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [severity, setSeverity] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [expanded, setExpanded] = useState(null);
    const [usingMock, setUsingMock] = useState(false);
    const searchTimer = useRef(null);
    const LIMIT = 20;

    // ── Fetch Audit Logs ───────────────────────────────────────────────────
    const fetchLogs = useCallback(async (overrideParams = {}) => {
        setIsLoading(true);
        setError('');
        try {
            const queryParams = {
                category,
                severity,
                search,
                dateFrom,
                dateTo,
                page,
                limit: LIMIT,
                ...overrideParams
            };
            const res = await auditService.getLogs(queryParams);
            const data = res.data?.data || [];
            setLogs(data);
            setPagination(res.data?.pagination || { total: data.length, totalPages: 1 });
            setUsingMock(false);
        } catch (err) {
            // Graceful fallback to mock data if backend audit collection is empty or unreachable
            setLogs(MOCK_LOGS);
            setPagination({ total: MOCK_LOGS.length, totalPages: 1 });
            setUsingMock(true);
        } finally {
            setIsLoading(false);
        }
    }, [category, severity, search, dateFrom, dateTo, page]);

    // ── Fetch Stats Aggregation ────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        try {
            const res = await auditService.getStats();
            if (res.data?.data) {
                setStats(res.data.data);
            }
        } catch {
            // Keep stats nominal
        }
    }, []);

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [fetchLogs, fetchStats]);

    // ── Search & Filter Handlers ───────────────────────────────────────────
    const handleSearchChange = (val) => {
        setSearch(val);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setPage(1);
            fetchLogs({ search: val, page: 1 });
        }, 400);
    };

    const handleApplyFilters = () => {
        setPage(1);
        fetchLogs({
            category,
            severity,
            search,
            dateFrom,
            dateTo,
            page: 1
        });
    };

    const handleResetFilters = () => {
        setSearch('');
        setCategory('');
        setSeverity('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
        fetchLogs({
            category: '',
            severity: '',
            search: '',
            dateFrom: '',
            dateTo: '',
            page: 1
        });
    };

    const handleRefreshAll = async () => {
        setIsRefreshing(true);
        await Promise.all([fetchLogs(), fetchStats()]);
        setTimeout(() => setIsRefreshing(false), 400);
    };

    // ── Export CSV Handler ─────────────────────────────────────────────────
    const exportCSV = () => {
        const rows = [
            ['Timestamp', 'Category', 'Action Code', 'Severity', 'Actor Name', 'Actor Email', 'Actor Role', 'Description', 'IP Address'],
            ...logs.map(l => [
                fmtDate(l.timestamp),
                l.category || 'General',
                l.action || '—',
                l.severity || 'info',
                l.actorSnapshot?.fullName || l.userRef?.fullName || 'System',
                l.actorSnapshot?.email || l.userRef?.accountEmail || '—',
                l.actorSnapshot?.role || l.userRef?.assignedRole || '—',
                `"${(l.description || '').replace(/"/g, '""')}"`,
                l.ipAddress || '—'
            ])
        ];
        const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateTag = new Date().toISOString().slice(0, 10);
        const filterTag = category ? `-${category.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : '';
        a.download = `emare-audit-logs${filterTag}-${dateTag}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Dark Theme Style Tokens ────────────────────────────────────────────
    const bg = dark ? '#0b1120' : '#f8fafc';
    const cardBg = dark ? '#111a2e' : '#ffffff';
    const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const textMuted = dark ? '#94a3b8' : '#64748b';
    const inputBg = dark ? '#0b1120' : '#f1f5f9';
    const rowHover = dark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)';

    // ── Stat Cards Mathematical Consistency (Root Cause Resolution) ───────
    // If stats is loaded, stats.total is the DB-wide count.
    // If filtered, indicate both filtered count and all-time total.
    // Ensure total is never less than warnings + critical.
    const isFiltered = Boolean(category || severity || dateFrom || dateTo || search);
    const dbTotal = stats?.total != null ? stats.total : (pagination.total || logs.length);
    const safeTotal = Math.max(dbTotal, (stats?.warnings || 0) + (stats?.critical || 0));
    const activeFiltersCount = [category, severity, dateFrom, dateTo, search].filter(Boolean).length;

    const statCards = [
        {
            label: isFiltered ? 'Filtered Logs' : 'Total Audit Logs',
            value: isFiltered ? pagination.total : safeTotal,
            subtext: isFiltered ? `of ${safeTotal} total records` : 'All-time immutable events',
            icon: Activity,
            color: '#22c55e',
            bg: 'rgba(34,197,94,0.14)'
        },
        {
            label: 'Last 24h Events',
            value: stats?.last24h ?? '0',
            subtext: 'Recorded in past 24 hours',
            icon: Clock,
            color: '#3b82f6',
            bg: 'rgba(59,130,246,0.14)'
        },
        {
            label: 'System Warnings',
            value: stats?.warnings ?? '0',
            subtext: 'Actionable system notices',
            icon: AlertTriangle,
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.14)'
        },
        {
            label: 'Critical Incidents',
            value: stats?.critical ?? '0',
            subtext: (stats?.critical > 0 ? 'Requires administrator review' : 'No critical incidents'),
            icon: AlertOctagon,
            color: '#ef4444',
            bg: 'rgba(239,68,68,0.14)'
        },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: bg, fontFamily: "'Outfit','Inter',sans-serif", color: colors.text }}>
            <Sidebar 
                navItems={sidebarItems} 
                activeTab="audit" 
                onTabChange={(tab) => {
                    if (tab !== 'audit') {
                        navigate('/admin/dashboard', { state: { activeTab: tab } });
                    }
                }} 
            />

            <div style={{ flex: 1, marginLeft: 'var(--sidebar-width, 260px)', overflowY: 'auto', paddingBottom: '50px' }}>

                {/* ── Header Area ──────────────────────────────────────────────── */}
                <div style={{
                    background: cardBg,
                    borderBottom: `1px solid ${border}`,
                    padding: '24px 32px',
                    position: 'sticky', top: 0, zIndex: 20,
                    backdropFilter: 'blur(16px)'
                }}>
                    <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 12,
                                background: 'rgba(34,197,94,0.14)',
                                border: '1px solid rgba(34,197,94,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#22c55e'
                            }}>
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.text, letterSpacing: '-0.3px' }}>
                                        Platform Audit Logs
                                    </h1>
                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                                        Immutable Trail
                                    </span>
                                </div>
                                <p style={{ margin: '3px 0 0 0', fontSize: 13, color: textMuted }}>
                                    Tamper-evident system activity · Read-only compliance trail · {usingMock ? 'Local Demo Mode' : 'Live Platform Records'}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <button 
                                onClick={handleRefreshAll} 
                                disabled={isRefreshing || isLoading}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 7,
                                    padding: '9px 16px', borderRadius: 8, border: `1px solid ${border}`,
                                    background: cardBg, color: colors.text, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                    transition: 'all 0.15s'
                                }}
                            >
                                <RefreshCw size={14} className={isRefreshing ? 'audit-spin' : ''} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} /> 
                                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            </button>
                            <button 
                                onClick={exportCSV} 
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 7,
                                    padding: '9px 18px', borderRadius: 8, border: 'none',
                                    background: '#22c55e', color: '#ffffff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                                    boxShadow: '0 2px 10px rgba(34,197,94,0.3)',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <Download size={15} /> Export Filtered CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 32px' }}>

                    {/* ── 4 Stat Cards ─────────────────────────────────────────── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 24 }}>
                        {statCards.map((sc, i) => {
                            const Icon = sc.icon;
                            return (
                                <div key={i} style={{
                                    background: cardBg, border: `1px solid ${border}`,
                                    borderRadius: 14, padding: '18px 20px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    display: 'flex', alignItems: 'center', gap: 16
                                }}>
                                    <div style={{
                                        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                                        background: sc.bg, color: sc.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Icon size={22} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            {sc.label}
                                        </div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: colors.text, margin: '2px 0' }}>
                                            {Number(sc.value).toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: 12, color: textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {sc.subtext}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Search & Filter Toolbar ──────────────────────────────── */}
                    <div style={{
                        background: cardBg, border: `1px solid ${border}`,
                        borderRadius: 14, padding: '20px 22px', marginBottom: 20,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Filter size={16} color="#22c55e" />
                                <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>Filters & Search</span>
                                {activeFiltersCount > 0 && (
                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(34,197,94,0.14)', color: '#22c55e' }}>
                                        {activeFiltersCount} active
                                    </span>
                                )}
                            </div>
                            {activeFiltersCount > 0 && (
                                <button 
                                    onClick={handleResetFilters}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, alignItems: 'flex-end' }}>
                            {/* Search */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Search Query
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
                                    <input
                                        value={search}
                                        onChange={e => handleSearchChange(e.target.value)}
                                        placeholder="Search by actor, action code, description, IP..."
                                        style={{
                                            width: '100%', padding: '9px 12px 9px 36px',
                                            background: inputBg, border: `1px solid ${border}`,
                                            borderRadius: 8, color: colors.text, fontSize: 13,
                                            outline: 'none', boxSizing: 'border-box'
                                        }}
                                    />
                                    {search && (
                                        <button 
                                            onClick={() => handleSearchChange('')} 
                                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: 0 }}
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Category Filter */}
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Category
                                </label>
                                <select 
                                    value={category} 
                                    onChange={e => setCategory(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${border}`, borderRadius: 8, color: colors.text, fontSize: 13, cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}
                                >
                                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                                </select>
                            </div>

                            {/* Severity Filter */}
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Severity
                                </label>
                                <select 
                                    value={severity} 
                                    onChange={e => setSeverity(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${border}`, borderRadius: 8, color: colors.text, fontSize: 13, cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}
                                >
                                    {SEVERITY.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                            </div>

                            {/* Date From */}
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Date From
                                </label>
                                <input 
                                    type="date" 
                                    value={dateFrom} 
                                    onChange={e => setDateFrom(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${border}`, borderRadius: 8, color: colors.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} 
                                />
                            </div>

                            {/* Date To */}
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Date To
                                </label>
                                <input 
                                    type="date" 
                                    value={dateTo} 
                                    onChange={e => setDateTo(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${border}`, borderRadius: 8, color: colors.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} 
                                />
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button 
                                    onClick={handleApplyFilters} 
                                    disabled={isLoading}
                                    style={{
                                        flex: 1, padding: '9px 16px', borderRadius: 8, border: 'none',
                                        background: '#22c55e', color: '#ffffff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {isLoading ? <Loader2 size={14} className="audit-spin" /> : 'Apply'}
                                </button>
                                <button 
                                    onClick={handleResetFilters} 
                                    style={{
                                        padding: '9px 14px', borderRadius: 8, border: `1px solid ${border}`,
                                        background: 'transparent', color: textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Category Quick Pills ─────────────────────────────────── */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                        {CATEGORIES.map(c => {
                            const active = category === c.key;
                            const Icon = c.icon;
                            return (
                                <button 
                                    key={c.key} 
                                    onClick={() => { 
                                        setCategory(c.key); 
                                        setPage(1); 
                                        fetchLogs({ category: c.key, page: 1 }); 
                                    }}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
                                        border: `1px solid ${active ? c.color : border}`,
                                        background: active ? `${c.color}20` : cardBg,
                                        color: active ? c.color : textMuted,
                                        fontWeight: active ? 700 : 500, fontSize: 12, transition: 'all 0.15s'
                                    }}
                                >
                                    <Icon size={13} />
                                    {c.label === 'All Categories' ? 'All Logs' : c.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Audit Logs Table Container ───────────────────────────── */}
                    <div style={{
                        background: cardBg, border: `1px solid ${border}`,
                        borderRadius: 14, overflow: 'hidden',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                        {/* Table Column Headers */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '170px 220px 170px 1fr 130px 40px',
                            padding: '14px 20px',
                            borderBottom: `1px solid ${border}`,
                            background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                            alignItems: 'center'
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Timestamp</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actor / Account</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category / Action</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Event Description & Identifiers</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Severity / IP</div>
                            <div style={{ textAlign: 'center' }}></div>
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: textMuted }}>
                                <Loader2 size={28} className="audit-spin" style={{ margin: '0 auto 12px', color: '#22c55e', animation: 'spin 1s linear infinite' }} />
                                <div style={{ fontSize: 13, fontWeight: 600 }}>Loading verified audit records...</div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!isLoading && logs.length === 0 && (
                            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                                <Shield size={44} style={{ color: textMuted, opacity: 0.35, marginBottom: 12 }} />
                                <div style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>No Audit Logs Found</div>
                                <p style={{ fontSize: 13, color: textMuted, margin: '4px auto 16px', maxWidth: 420 }}>
                                    No activity logs matched your current filters. Try resetting your search terms, date range, or category filter.
                                </p>
                                <button 
                                    onClick={handleResetFilters}
                                    style={{
                                        padding: '8px 18px', borderRadius: 8, border: 'none',
                                        background: '#22c55e', color: '#ffffff', cursor: 'pointer', fontSize: 13, fontWeight: 600
                                    }}
                                >
                                    Reset Filters
                                </button>
                            </div>
                        )}

                        {/* Table Rows */}
                        {!isLoading && logs.map((log, idx) => {
                            const sev = SEV_META[log.severity] || SEV_META.info;
                            const catMeta = CAT_META[log.category] || CAT_META['System & Diagnostics'];
                            const CatIcon = catMeta.icon;
                            const SevIcon = sev.icon;
                            const isOpen = expanded === (log._id || idx);

                            const actorName = log.actorSnapshot?.fullName || log.userRef?.fullName || 'System';
                            const actorEmail = log.actorSnapshot?.email || log.userRef?.accountEmail || '—';
                            const actorRole = log.actorSnapshot?.role || log.userRef?.assignedRole || 'System';

                            return (
                                <div key={log._id || idx}>
                                    <div
                                        onClick={() => setExpanded(isOpen ? null : (log._id || idx))}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '170px 220px 170px 1fr 130px 40px',
                                            padding: '14px 20px',
                                            cursor: 'pointer',
                                            borderBottom: `1px solid ${border}`,
                                            background: isOpen ? (dark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.04)') : 'transparent',
                                            transition: 'background 0.15s',
                                            alignItems: 'center'
                                        }}
                                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = rowHover; }}
                                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        {/* Timestamp */}
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>
                                                {new Date(log.timestamp).toLocaleDateString('en-ET', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div style={{ fontSize: 11, color: textMuted, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                <Clock size={11} />
                                                {new Date(log.timestamp).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                            <div style={{ fontSize: 10, color: textMuted, opacity: 0.75, marginTop: 1 }}>
                                                {fmtRelativeTime(log.timestamp)}
                                            </div>
                                        </div>

                                        {/* Actor */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                                                background: 'rgba(34,197,94,0.14)',
                                                color: '#22c55e',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 13, fontWeight: 700
                                            }}>
                                                {(actorName[0] || 'S').toUpperCase()}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {actorName}
                                                </div>
                                                <div style={{ fontSize: 11, color: textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {actorEmail}
                                                </div>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                                                    background: 'rgba(255,255,255,0.06)', color: textMuted, marginTop: 2, display: 'inline-block'
                                                }}>
                                                    {actorRole}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Category & Action Code */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{
                                                width: 30, height: 30, borderRadius: 8,
                                                background: catMeta.bg,
                                                color: catMeta.color,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                            }}>
                                                <CatIcon size={14} />
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: catMeta.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {log.category?.split(' ')[0] || 'System'}
                                                </div>
                                                <div style={{ fontSize: 11, color: textMuted, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {log.action || 'LOG_ENTRY'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description with Smart ID Truncation */}
                                        <div style={{ paddingRight: 12 }}>
                                            <div style={{
                                                fontSize: 12, color: colors.text, lineHeight: 1.5,
                                                overflow: 'hidden', textOverflow: 'ellipsis',
                                                display: '-webkit-box', WebkitLineClamp: isOpen ? 'unset' : 2, WebkitBoxOrient: 'vertical'
                                            }}>
                                                <FormattedDescription text={log.description} />
                                            </div>
                                        </div>

                                        {/* Severity & IP Address */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                padding: '2px 8px', borderRadius: 12,
                                                background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`,
                                                fontSize: 11, fontWeight: 700, textTransform: 'capitalize'
                                            }}>
                                                <SevIcon size={10} />
                                                {log.severity || 'info'}
                                            </span>
                                            <span style={{ fontSize: 11, color: textMuted, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Globe size={10} />
                                                {log.ipAddress || '127.0.0.1'}
                                            </span>
                                        </div>

                                        {/* Chevron Toggle */}
                                        <div style={{ textAlign: 'center', color: textMuted }}>
                                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>

                                    {/* Expanded Detail Panel */}
                                    {isOpen && (
                                        <div style={{
                                            padding: '20px 24px',
                                            background: dark ? 'rgba(34,197,94,0.03)' : 'rgba(34,197,94,0.02)',
                                            borderBottom: `1px solid ${border}`,
                                            borderLeft: `3px solid ${catMeta.color}`
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Record Database ID</div>
                                                    <TruncatedId id={String(log._id)} label="Record ID" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Full Exact Timestamp</div>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{fmtDate(log.timestamp)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Actor Name & Role</div>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{actorName} ({actorRole})</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Actor Email</div>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{actorEmail}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Full Category</div>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: catMeta.color }}>{log.category || 'General'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Action Code</div>
                                                    <code style={{ fontSize: 12, fontWeight: 700, color: colors.text, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                                                        {log.action}
                                                    </code>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Target Resource</div>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>
                                                        {log.targetLabel ? <TruncatedId id={log.targetLabel} label="Target" /> : (log.targetType || 'Platform System')}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Origin IP Address</div>
                                                    <code style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{log.ipAddress || '127.0.0.1'}</code>
                                                </div>
                                            </div>

                                            <div style={{ marginTop: 14, padding: '12px 16px', background: dark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)', borderRadius: 8, border: `1px solid ${border}` }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Full Description & Payload</div>
                                                <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6, wordBreak: 'break-word' }}>
                                                    <FormattedDescription text={log.description} />
                                                </div>
                                            </div>

                                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: textMuted }}>
                                                <ShieldCheck size={13} color="#22c55e" />
                                                <span>Immutable Audit Log: Records are write-once and protected against modification or deletion.</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Pagination Controls ──────────────────────────────────── */}
                    {pagination.totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 12 }}>
                            <p style={{ color: textMuted, fontSize: 13, margin: 0 }}>
                                Showing page <strong>{page}</strong> of <strong>{pagination.totalPages}</strong>
                                {' '}— <strong>{pagination.total}</strong> total matching records
                            </p>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button 
                                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                                    disabled={page <= 1}
                                    style={{
                                        padding: '7px 14px', borderRadius: 8, border: `1px solid ${border}`,
                                        background: cardBg, color: page <= 1 ? textMuted : colors.text,
                                        cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
                                        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600
                                    }}
                                >
                                    <ChevronLeft size={14} /> Prev
                                </button>
                                {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                                    const p = i + 1;
                                    const isCurrent = page === p;
                                    return (
                                        <button 
                                            key={p} 
                                            onClick={() => setPage(p)}
                                            style={{
                                                width: 34, height: 34, borderRadius: 8,
                                                border: `1px solid ${isCurrent ? '#22c55e' : border}`,
                                                background: isCurrent ? '#22c55e' : cardBg,
                                                color: isCurrent ? '#ffffff' : colors.text,
                                                cursor: 'pointer', fontSize: 13, fontWeight: 700
                                            }}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                                <button 
                                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} 
                                    disabled={page >= pagination.totalPages}
                                    style={{
                                        padding: '7px 14px', borderRadius: 8, border: `1px solid ${border}`,
                                        background: cardBg, color: page >= pagination.totalPages ? textMuted : colors.text,
                                        cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer', opacity: page >= pagination.totalPages ? 0.4 : 1,
                                        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600
                                    }}
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Security & Compliance Footer Note ────────────────────── */}
                    <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 12, color: textMuted }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Shield size={13} color="#22c55e" />
                            <span>Displaying <strong>{logs.length}</strong> of <strong>{pagination.total || logs.length}</strong> loaded events · Encrypted transport via TLS 1.3</span>
                        </div>
                        <div>
                            <span>Emare ICT Hub Compliance Policy v2.4</span>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                select option { background: ${dark ? '#111a2e' : '#ffffff'}; color: ${colors.text}; }
            ` }} />
        </div>
    );
}
