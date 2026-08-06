import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { auditService } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import {
    Shield, Search, Filter, RefreshCw, Download, AlertTriangle,
    Info, AlertOctagon, User, BookOpen, DollarSign, Cpu,
    ChevronLeft, ChevronRight, Calendar, Clock, Globe, Activity,
    LayoutDashboard, Users, ShieldCheck, BarChart3, MessageSquare,
    ClipboardList, Wallet, Megaphone, FileBarChart, ClipboardCheck,
    Clock3, Settings
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
    { key: '', label: 'All Categories', icon: Activity, color: '#8b5cf6' },
    { key: 'Enrollment & Financial', label: 'Enrollment & Financial', icon: DollarSign, color: '#10b981' },
    { key: 'Course Approvals & Content', label: 'Course Approvals & Content', icon: BookOpen, color: '#3b82f6' },
    { key: 'User Security & Activity', label: 'User Security & Activity', icon: Shield, color: '#f59e0b' },
    { key: 'System & Diagnostics', label: 'System & Diagnostics', icon: Cpu, color: '#ec4899' },
];

const SEVERITY = [
    { key: '', label: 'All Severity' },
    { key: 'info', label: 'Info', color: '#3b82f6' },
    { key: 'warning', label: 'Warning', color: '#f59e0b' },
    { key: 'critical', label: 'Critical', color: '#ef4444' },
];

const SEV_META = {
    info:     { icon: Info,          color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
    warning:  { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    critical: { icon: AlertOctagon,  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
};

const CAT_META = {
    'Enrollment & Financial':       { icon: DollarSign, color: '#10b981' },
    'Course Approvals & Content':   { icon: BookOpen,   color: '#3b82f6' },
    'User Security & Activity':     { icon: Shield,     color: '#f59e0b' },
    'System & Diagnostics':         { icon: Cpu,        color: '#ec4899' },
};

const fmtDate = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
        + ' ' + d.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

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
        { key: 'content', label: 'Content & Moderation', icon: <MessageSquare size={20} aria-hidden="true" /> },
        { key: 'assessments', label: 'Assessments & Certs', icon: <ClipboardList size={20} aria-hidden="true" /> },
        { key: 'finances', label: 'Finances & Revenue', icon: <Wallet size={20} aria-hidden="true" /> },
        { key: 'cms', label: 'CMS & Comms', icon: <Megaphone size={20} aria-hidden="true" /> },
        { key: 'reports', label: 'Reports & Exports', icon: <FileBarChart size={20} aria-hidden="true" /> },
        { key: 'audit', label: 'Audit Logs', icon: <ClipboardCheck size={20} aria-hidden="true" /> },
        { key: 'calendar', label: 'Calendar Management', icon: <Clock3 size={20} aria-hidden="true" /> },
        { key: 'system', label: 'System Settings', icon: <Settings size={20} aria-hidden="true" /> }
    ];

    const [logs,       setLogs]       = useState([]);
    const [stats,      setStats]      = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState('');
    const [search,     setSearch]     = useState('');
    const [category,   setCategory]   = useState('');
    const [severity,   setSeverity]   = useState('');
    const [dateFrom,   setDateFrom]   = useState('');
    const [dateTo,     setDateTo]     = useState('');
    const [page,       setPage]       = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [expanded,   setExpanded]   = useState(null);
    const [usingMock,  setUsingMock]  = useState(false);
    const searchTimer = useRef(null);
    const LIMIT = 20;

    // ── Fetch ──────────────────────────────────────────────────────────────
    const fetchLogs = useCallback(async (params = {}) => {
        setLoading(true);
        setError('');
        try {
            const res = await auditService.getLogs({
                category, severity, search, dateFrom, dateTo,
                page, limit: LIMIT,
                ...params
            });
            const data = res.data?.data || [];
            setLogs(data);
            setPagination(res.data?.pagination || { total: data.length, totalPages: 1 });
            setUsingMock(false);
        } catch {
            // Fallback to mock data for demo
            setLogs(MOCK_LOGS);
            setPagination({ total: MOCK_LOGS.length, totalPages: 1 });
            setUsingMock(true);
        } finally {
            setLoading(false);
        }
    }, [category, severity, search, dateFrom, dateTo, page]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await auditService.getStats();
            setStats(res.data?.data);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchLogs(); fetchStats(); }, [fetchLogs, fetchStats]);

    // ── Debounced search ───────────────────────────────────────────────────
    const handleSearchChange = (val) => {
        setSearch(val);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => { setPage(1); fetchLogs({ search: val, page: 1 }); }, 400);
    };

    const handleFilter = (key, val) => {
        if (key === 'category') setCategory(val);
        if (key === 'severity') setSeverity(val);
        if (key === 'dateFrom') setDateFrom(val);
        if (key === 'dateTo')   setDateTo(val);
        setPage(1);
    };

    const applyFilters = () => { setPage(1); fetchLogs({ page: 1 }); };
    const resetFilters = () => {
        setSearch(''); setCategory(''); setSeverity('');
        setDateFrom(''); setDateTo(''); setPage(1);
        fetchLogs({ category: '', severity: '', search: '', dateFrom: '', dateTo: '', page: 1 });
    };

    // ── Export CSV ─────────────────────────────────────────────────────────
    const exportCSV = () => {
        const rows = [
            ['Timestamp', 'Category', 'Action', 'Severity', 'Actor Name', 'Actor Email', 'Actor Role', 'Description', 'IP Address'],
            ...logs.map(l => [
                fmtDate(l.timestamp),
                l.category,
                l.action,
                l.severity || 'info',
                l.actorSnapshot?.fullName || '—',
                l.actorSnapshot?.email || '—',
                l.actorSnapshot?.role || '—',
                `"${(l.description || '').replace(/"/g, '""')}"`,
                l.ipAddress || '—'
            ])
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `emare-audit-logs-${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // ── Styles ─────────────────────────────────────────────────────────────
    const bg       = dark ? '#0f172a' : '#f1f5f9';
    const card     = dark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.95)';
    const border   = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const muted    = dark ? '#94a3b8' : '#64748b';
    const inputBg  = dark ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.8)';
    const rowHover = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    // ── Stat cards data ────────────────────────────────────────────────────
    const statCards = [
        { label: 'Total Logs',      value: pagination.total || logs.length, icon: Activity,      color: '#8b5cf6' },
        { label: 'Last 24h Events', value: stats?.last24h ?? '—',           icon: Clock,         color: '#3b82f6' },
        { label: 'Warnings',        value: stats?.warnings ?? '—',          icon: AlertTriangle, color: '#f59e0b' },
        { label: 'Critical Events', value: stats?.critical ?? '—',          icon: AlertOctagon,  color: '#ef4444' },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: bg, fontFamily: "'Outfit','Inter',sans-serif" }}>
            <Sidebar navItems={sidebarItems} activeTab="audit" onTabChange={(tab) => {
                if (tab !== 'audit') {
                    navigate('/admin/dashboard', { state: { activeTab: tab } });
                }
            }} />

            <div style={{ flex: 1, marginLeft: '260px', overflowY: 'auto', paddingBottom: '40px' }}>

                {/* ── Header ──────────────────────────────────────────────────── */}
            <div style={{
                background: dark
                    ? 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.05) 100%)',
                borderBottom: `1px solid ${border}`,
                padding: '32px 32px 28px',
                position: 'sticky', top: 0, zIndex: 20,
                backdropFilter: 'blur(20px)'
            }}>
                <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 14,
                                background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 20px rgba(139,92,246,0.35)'
                            }}>
                                <Shield size={24} color="#fff" />
                            </div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: colors.text, letterSpacing: '-0.5px' }}>
                                    Audit Log System
                                </h1>
                                <p style={{ margin: 0, fontSize: 13, color: muted }}>
                                    Immutable security trail · Read-only · {usingMock ? '️ Demo data' : 'Live data'}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => { fetchLogs(); fetchStats(); }} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '9px 16px', borderRadius: 10, border: `1px solid ${border}`,
                                background: 'transparent', color: muted, cursor: 'pointer', fontSize: 13, fontWeight: 600
                            }}>
                                <RefreshCw size={14} /> Refresh
                            </button>
                            <button onClick={exportCSV} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '9px 18px', borderRadius: 10, border: 'none',
                                background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                                color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                                boxShadow: '0 4px 12px rgba(139,92,246,0.3)'
                            }}>
                                <Download size={14} /> Export CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px' }}>

                {/* ── Stat Cards ───────────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 16, marginBottom: 28 }}>
                    {statCards.map(sc => {
                        const Icon = sc.icon;
                        return (
                            <div key={sc.label} style={{
                                background: card, border: `1px solid ${border}`,
                                borderRadius: 18, padding: '20px 22px',
                                boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.06)',
                                display: 'flex', alignItems: 'center', gap: 16
                            }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                                    background: `${sc.color}18`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon size={22} color={sc.color} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 26, fontWeight: 900, color: colors.text, lineHeight: 1 }}>{sc.value}</div>
                                    <div style={{ fontSize: 12, color: muted, fontWeight: 600, marginTop: 4 }}>{sc.label}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Filter Bar ───────────────────────────────────────────── */}
                <div style={{
                    background: card, border: `1px solid ${border}`,
                    borderRadius: 18, padding: '20px 24px', marginBottom: 20,
                    boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.15)' : '0 4px 20px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Search */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                ⌕ Search
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: muted }} />
                                <input
                                    value={search}
                                    onChange={e => handleSearchChange(e.target.value)}
                                    placeholder="Search by user, action, course, IP…"
                                    style={{
                                        width: '100%', padding: '9px 12px 9px 36px',
                                        background: inputBg, border: `1px solid ${border}`,
                                        borderRadius: 10, color: colors.text, fontSize: 13,
                                        outline: 'none', boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>▤ Category</label>
                            <select value={category} onChange={e => handleFilter('category', e.target.value)}
                                style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${border}`, borderRadius: 10, color: colors.text, fontSize: 13, cursor: 'pointer' }}>
                                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                        </div>

                        {/* Severity */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>↯ Severity</label>
                            <select value={severity} onChange={e => handleFilter('severity', e.target.value)}
                                style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${border}`, borderRadius: 10, color: colors.text, fontSize: 13, cursor: 'pointer' }}>
                                {SEVERITY.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                            </select>
                        </div>

                        {/* Date From */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>▦ From</label>
                            <input type="date" value={dateFrom} onChange={e => handleFilter('dateFrom', e.target.value)}
                                style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${border}`, borderRadius: 10, color: colors.text, fontSize: 13, boxSizing: 'border-box' }} />
                        </div>

                        {/* Date To */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>▦ To</label>
                            <input type="date" value={dateTo} onChange={e => handleFilter('dateTo', e.target.value)}
                                style={{ width: '100%', padding: '9px 12px', background: inputBg, border: `1px solid ${border}`, borderRadius: 10, color: colors.text, fontSize: 13, boxSizing: 'border-box' }} />
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: 8, paddingBottom: 0 }}>
                            <button onClick={applyFilters} style={{
                                padding: '9px 16px', borderRadius: 10, border: 'none',
                                background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                                color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap'
                            }}>Apply</button>
                            <button onClick={resetFilters} style={{
                                padding: '9px 12px', borderRadius: 10, border: `1px solid ${border}`,
                                background: 'transparent', color: muted, cursor: 'pointer', fontSize: 13, fontWeight: 600
                            }}>Reset</button>
                        </div>
                    </div>
                </div>

                {/* ── Category Pills ───────────────────────────────────────── */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    {CATEGORIES.map(c => {
                        const active = category === c.key;
                        const Icon   = c.icon;
                        return (
                            <button key={c.key} onClick={() => { handleFilter('category', c.key); applyFilters(); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '7px 14px', borderRadius: 100, cursor: 'pointer',
                                    border: `1px solid ${active ? c.color : border}`,
                                    background: active ? `${c.color}20` : 'transparent',
                                    color: active ? c.color : muted,
                                    fontWeight: active ? 700 : 500, fontSize: 13, transition: 'all 0.2s'
                                }}>
                                <Icon size={13} />
                                {c.label === 'All Categories' ? 'All' : c.label.split(' ')[0]}
                            </button>
                        );
                    })}
                </div>

                {/* ── Log Table ────────────────────────────────────────────── */}
                <div style={{
                    background: card, border: `1px solid ${border}`,
                    borderRadius: 20, overflow: 'hidden',
                    boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.2)' : '0 8px 32px rgba(0,0,0,0.07)'
                }}>
                    {/* Table header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '180px 210px 160px 1fr 110px',
                        padding: '14px 20px',
                        borderBottom: `1px solid ${border}`,
                        background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                    }}>
                        {['Timestamp', 'Actor', 'Category', 'Description', 'IP / Severity'].map(h => (
                            <div key={h} style={{ fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                        ))}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div style={{ padding: '60px 0', textAlign: 'center' }}>
                            <div style={{
                                width: 40, height: 40, border: '3px solid rgba(139,92,246,0.2)',
                                borderTop: '3px solid #8b5cf6', borderRadius: '50%',
                                animation: 'auditSpin 0.8s linear infinite', margin: '0 auto 16px'
                            }} />
                            <p style={{ color: muted, fontSize: 14 }}>Loading audit logs…</p>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && logs.length === 0 && (
                        <div style={{ padding: '60px 0', textAlign: 'center' }}>
                            <Shield size={48} color={muted} style={{ marginBottom: 16, opacity: 0.4 }} />
                            <p style={{ color: muted, fontSize: 15, fontWeight: 600 }}>No audit logs match your filters</p>
                            <p style={{ color: muted, fontSize: 13, opacity: 0.7 }}>Try adjusting your search or clearing filters</p>
                        </div>
                    )}

                    {/* Rows */}
                    {!loading && logs.map((log, idx) => {
                        const sev     = SEV_META[log.severity] || SEV_META.info;
                        const catMeta = CAT_META[log.category] || CAT_META['System & Diagnostics'];
                        const CatIcon = catMeta.icon;
                        const SevIcon = sev.icon;
                        const isOpen  = expanded === log._id;

                        return (
                            <div key={log._id || idx}>
                                <div
                                    onClick={() => setExpanded(isOpen ? null : log._id)}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '180px 210px 160px 1fr 110px',
                                        padding: '14px 20px', cursor: 'pointer',
                                        borderBottom: `1px solid ${border}`,
                                        background: isOpen ? (dark ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.03)') : 'transparent',
                                        transition: 'background 0.15s',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = rowHover; }}
                                    onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {/* Timestamp */}
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{
                                            new Date(log.timestamp).toLocaleDateString('en-ET', { month: 'short', day: 'numeric', year: 'numeric' })
                                        }</div>
                                        <div style={{ fontSize: 11, color: muted, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                            <Clock size={10} />
                                            {new Date(log.timestamp).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                    </div>

                                    {/* Actor */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 13, fontWeight: 800, color: '#fff'
                                        }}>
                                            {(log.actorSnapshot?.fullName?.[0] || 'S').toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>
                                                {log.actorSnapshot?.fullName || 'System'}
                                            </div>
                                            <div style={{ fontSize: 11, color: muted }}>{log.actorSnapshot?.email || '—'}</div>
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100,
                                                background: `${catMeta.color}18`, color: catMeta.color
                                            }}>{log.actorSnapshot?.role || '—'}</span>
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 8,
                                            background: `${catMeta.color}18`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            <CatIcon size={13} color={catMeta.color} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: catMeta.color }}>
                                                {log.category?.split(' ')[0]}
                                            </div>
                                            <div style={{ fontSize: 10, color: muted, fontFamily: 'monospace' }}>
                                                {log.action}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div style={{
                                        fontSize: 12, color: colors.text, lineHeight: 1.5,
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                                    }}>
                                        {log.description}
                                    </div>

                                    {/* IP + Severity */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 5,
                                            padding: '3px 8px', borderRadius: 100,
                                            background: sev.bg, color: sev.color,
                                            fontSize: 11, fontWeight: 700
                                        }}>
                                            <SevIcon size={10} />
                                            {(log.severity || 'info').toUpperCase()}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: muted }}>
                                            <Globe size={10} />
                                            {log.ipAddress || '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded detail panel */}
                                {isOpen && (
                                    <div style={{
                                        padding: '20px 24px 24px',
                                        background: dark ? 'rgba(139,92,246,0.04)' : 'rgba(139,92,246,0.02)',
                                        borderBottom: `1px solid ${border}`,
                                        borderLeft: `3px solid ${catMeta.color}`
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
                                            {[
                                                { label: 'Full Timestamp',  value: fmtDate(log.timestamp) },
                                                { label: 'Actor Name',      value: log.actorSnapshot?.fullName || 'System' },
                                                { label: 'Actor Email',     value: log.actorSnapshot?.email || '—' },
                                                { label: 'Actor Role',      value: log.actorSnapshot?.role || '—' },
                                                { label: 'Category',        value: log.category },
                                                { label: 'Action Code',     value: log.action },
                                                { label: 'Severity',        value: (log.severity || 'info').toUpperCase() },
                                                { label: 'Target',          value: log.targetLabel || log.targetType || '—' },
                                                { label: 'IP Address',      value: log.ipAddress || '—' },
                                            ].map(f => (
                                                <div key={f.label}>
                                                    <div style={{ fontSize: 10, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, fontFamily: f.label.includes('Code') || f.label.includes('IP') ? 'monospace' : 'inherit' }}>{f.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: 16, padding: '12px 16px', background: dark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)', borderRadius: 12 }}>
                                            <div style={{ fontSize: 10, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Full Description</div>
                                            <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>{log.description}</div>
                                        </div>
                                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: muted }}>
                                            <Shield size={12} />
                                            <span>This record is <strong>immutable</strong> — audit logs cannot be edited or deleted per compliance policy.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── Pagination ───────────────────────────────────────────── */}
                {pagination.totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 12 }}>
                        <p style={{ color: muted, fontSize: 13 }}>
                            Showing page <strong>{page}</strong> of <strong>{pagination.totalPages}</strong>
                            {' '}— <strong>{pagination.total}</strong> total events
                        </p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button onClick={() => { setPage(p => Math.max(1, p-1)); }} disabled={page <= 1}
                                style={{
                                    padding: '8px 14px', borderRadius: 10, border: `1px solid ${border}`,
                                    background: 'transparent', color: page <= 1 ? muted : colors.text,
                                    cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
                                    display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600
                                }}>
                                <ChevronLeft size={14} /> Prev
                            </button>
                            {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                                const p = i + 1;
                                return (
                                    <button key={p} onClick={() => setPage(p)}
                                        style={{
                                            width: 36, height: 36, borderRadius: 10,
                                            border: `1px solid ${page === p ? '#8b5cf6' : border}`,
                                            background: page === p ? 'linear-gradient(135deg,#8b5cf6,#3b82f6)' : 'transparent',
                                            color: page === p ? '#fff' : colors.text,
                                            cursor: 'pointer', fontSize: 13, fontWeight: 700
                                        }}>{p}
                                    </button>
                                );
                            })}
                            <button onClick={() => { setPage(p => Math.min(pagination.totalPages, p+1)); }} disabled={page >= pagination.totalPages}
                                style={{
                                    padding: '8px 14px', borderRadius: 10, border: `1px solid ${border}`,
                                    background: 'transparent', color: page >= pagination.totalPages ? muted : colors.text,
                                    cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer', opacity: page >= pagination.totalPages ? 0.4 : 1,
                                    display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600
                                }}>
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Results count bar ────────────────────────────────────── */}
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: muted }}>
                    <Shield size={12} />
                    <span>Showing <strong>{logs.length}</strong> of <strong>{pagination.total || logs.length}</strong> audit records · Logs are read-only and immutable per security compliance policy</span>
                </div>
            </div>
        </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes auditSpin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
                select option { background: ${dark ? '#1e293b' : '#fff'}; color: ${colors.text}; }
            ` }} />
        </div>
    );
}
