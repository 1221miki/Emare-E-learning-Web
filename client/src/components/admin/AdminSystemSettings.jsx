import React, { useState, useMemo, useEffect } from 'react';
import {
    Settings, Shield, Users, UserCheck, ShieldCheck, BookOpen, Award,
    Bell, CreditCard, Lock, Database, PlugZap, Mail, AlertTriangle,
    Activity, Search, Filter, RotateCcw, Save, CheckCircle2, XCircle,
    Info, Clock, HelpCircle, ChevronRight, RefreshCw, Upload, Eye, EyeOff,
    Check, X, HardDrive, Terminal, Server, Sliders, ShieldAlert, Sparkles, FileText, Download,
    Plus, Trash2, Edit3, Key, Globe, UserPlus, LockKeyhole, FileSpreadsheet
} from 'lucide-react';
import { systemService } from '../../services/api';

// 6 Core Settings Categories Definition
const CATEGORIES = [
    { id: 'general', name: 'General & Locale', icon: Settings, desc: 'Platform identity, branding, timezone, theme, and currency settings.', badge: 'Core' },
    { id: 'users', name: 'Registration & RBAC', icon: UserCheck, desc: 'Public registration controls, role auto-assignment, domain whitelists, and RBAC.', badge: 'Access' },
    { id: 'courses', name: 'Courses & Certs', icon: BookOpen, desc: 'Auto-approvals, file limits, video transcoding, and automated PDF certificates.', badge: 'Content' },
    { id: 'comms', name: 'Notifications & SMTP', icon: Bell, desc: 'System banners, automated email dispatch, push alerts, and SMTP relay.', badge: 'Delivery' },
    { id: 'system', name: 'Maintenance & Backup', icon: Database, desc: 'Maintenance mode switch, database backups, payment gateways, and API access.', badge: 'System' },
];

const DEFAULT_SETTING_DEFINITIONS = [
    // 1. General & Locale
    { key: 'websiteName', category: 'general', title: 'Platform Website Name', desc: 'Main title displayed on browser tab, email headers, and portal banner.', type: 'text', sensitive: false },
    { key: 'theme', category: 'general', title: 'Default Theme Mode', desc: 'Default portal theme presented to new visitors.', type: 'select', options: [{ v: 'light', label: 'Light Mode' }, { v: 'dark', label: 'Dark Mode' }, { v: 'system', label: 'System Automatic' }], sensitive: false },
    { key: 'timezone', category: 'general', title: 'Portal Timezone', desc: 'Timezone used for schedule deadlines, live classes, and events.', type: 'select', options: [{ v: 'Africa/Addis_Ababa', label: 'Africa/Addis_Ababa (UTC+3)' }, { v: 'UTC', label: 'UTC' }, { v: 'America/New_York', label: 'America/New_York (EST)' }, { v: 'Europe/London', label: 'Europe/London (GMT)' }], sensitive: false },
    { key: 'language', category: 'general', title: 'Primary Interface Language', desc: 'Default portal language presented to guest users.', type: 'select', options: [{ v: 'en', label: 'English' }, { v: 'am', label: 'Amharic (አማርኛ)' }, { v: 'om', label: 'Afaan Oromo' }], sensitive: false },
    { key: 'currency', category: 'general', title: 'Primary Currency', desc: 'Currency used for course prices and checkout receipts.', type: 'select', options: [{ v: 'ETB', label: 'ETB (Ethiopian Birr)' }, { v: 'USD', label: 'USD (US Dollar)' }], sensitive: false },

    // 2. Security & Roles
    { key: 'requireEmailVerification', category: 'security', title: 'Require Email Verification', desc: 'Mandate email activation link verification before account login.', type: 'boolean', sensitive: true },
    { key: 'requireMfa', category: 'security', title: 'Two-Factor Authentication (2FA)', desc: 'Mandate 2FA verification code for user logins.', type: 'boolean', sensitive: true },
    { key: 'passwordComplexityStrict', category: 'security', title: 'Strict Password Policy', desc: 'Require min 8 chars, uppercase, lowercase, numbers, and special symbols.', type: 'boolean', sensitive: false },
    { key: 'sslStrictEnabled', category: 'security', title: 'Enable HTTPS Encryption (HSTS)', desc: 'Force SSL/TLS encryption across all site domain requests.', type: 'boolean', sensitive: true },
    { key: 'maintenanceMode', category: 'security', title: 'Enable Maintenance Mode', desc: 'Lock platform for non-admin users and render maintenance notice.', type: 'boolean', sensitive: true },

    // 3. Registration & RBAC
    { key: 'autoAssignStudentRole', category: 'users', title: 'Auto-Assign Student Role', desc: 'Automatically grant default Student role upon signup.', type: 'boolean', sensitive: false },
    { key: 'requireAdminApproval', category: 'users', title: 'Require Admin Manual Approval', desc: 'Hold new user registrations in pending queue for admin review.', type: 'boolean', sensitive: true },
    { key: 'sendWelcomeEmail', category: 'users', title: 'Send Automated Welcome Email', desc: 'Send onboarding email guide immediately after account creation.', type: 'boolean', sensitive: false },
    { key: 'rbacEnforced', category: 'users', title: 'Strict Role-Based Access Control (RBAC)', desc: 'Enforce permission checks on every route and API call.', type: 'boolean', sensitive: true },

    // 4. Courses & Certs
    { key: 'autoApproveCourses', category: 'courses', title: 'Auto-Approve Submitted Courses', desc: 'Automatically publish instructor courses without requiring admin manual review.', type: 'boolean', sensitive: true },
    { key: 'allowPublicPreviews', category: 'courses', title: 'Allow Free Lesson Previews', desc: 'Permit non-enrolled visitors to sample designated preview lessons.', type: 'boolean', sensitive: false },
    { key: 'maxUploadSizeMB', category: 'courses', title: 'Max File Upload Size (MB)', desc: 'Upper limit for uploaded course documents and attachments.', type: 'number', sensitive: false },
    { key: 'videoTranscodingEnabled', category: 'courses', title: 'Cloud Video Transcoding', desc: 'Convert uploaded videos to adaptive streaming formats.', type: 'boolean', sensitive: false },
    { key: 'autoGenerateCertificates', category: 'courses', title: 'Automated Certificate Issuance', desc: 'Issue PDF certificates automatically upon 100% course completion.', type: 'boolean', sensitive: false },

    // 5. Notifications & SMTP
    { key: 'announcementBannerActive', category: 'comms', title: 'Platform Announcement Banner', desc: 'Show top banner alert message across student and instructor portals.', type: 'boolean', sensitive: false },
    { key: 'announcementBannerText', category: 'comms', title: 'Announcement Banner Message', desc: 'Message content rendered in the top notification banner.', type: 'text', sensitive: false },
    { key: 'automaticEmailNotifs', category: 'comms', title: 'Automated Transactional Emails', desc: 'Send email updates for enrollments, grades, and receipts.', type: 'boolean', sensitive: false },
    { key: 'smtpEnabled', category: 'comms', title: 'SMTP Email Service Active', desc: 'Use custom SMTP server for outgoing system emails.', type: 'boolean', sensitive: true },
    { key: 'contactEmail', category: 'comms', title: 'Support & Contact Email', desc: 'Default email address shown on contact page and footers.', type: 'text', sensitive: false },

    // 6. Maintenance & Backup
    { key: 'backupEnabled', category: 'system', title: 'Automated Scheduled Backups', desc: 'Automatically snapshot MongoDB database on scheduled interval.', type: 'boolean', sensitive: true },
    { key: 'paymentGatewayActive', category: 'system', title: 'Online Payment Gateways Active', desc: 'Enable checkout payments via Chapa, Telebirr, and cards.', type: 'boolean', sensitive: true },
    { key: 'publicRestApiEnabled', category: 'system', title: 'Public REST API Access', desc: 'Expose REST API endpoints for mobile app and integrations.', type: 'boolean', sensitive: true }
];

export default function AdminSystemSettings({
    settings = {},
    setSettings,
    colors = {},
    theme = 'light',
    showNotification = () => {},
    dbMetrics = {},
    dbActionLoading = {},
    handleBackup = () => {},
    handleOptimizeDatabase = () => {},
    handleClearCache = () => {}
}) {
    const [activeCategory, setActiveCategory] = useState('general');
    const [activeSection, setActiveSection] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [localSettings, setLocalSettings] = useState({ ...settings });
    const [originalSettings, setOriginalSettings] = useState({ ...settings });
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);

    // Interactive Security & Roles States
    const [rolesList, setRolesList] = useState([
        { id: 'role-1', name: 'Super Admin', desc: 'Full unrestricted access across all LMS modules and system settings.', usersCount: 2, status: 'Active', systemRole: true, badgeBg: '#f0fdf4', badgeColor: '#16a34a' },
        { id: 'role-2', name: 'LMS Admin', desc: 'Manage users, courses, moderation, and institutional reports.', usersCount: 5, status: 'Active', systemRole: false, badgeBg: '#f5f3ff', badgeColor: '#22c55e' },
        { id: 'role-3', name: 'Instructor', desc: 'Create courses, publish quizzes, grade assignments, and interact with students.', usersCount: 38, status: 'Active', systemRole: true, badgeBg: '#f0fdf4', badgeColor: '#10b981' },
        { id: 'role-4', name: 'Student', desc: 'Enroll in courses, view video lectures, take quizzes, and earn certificates.', usersCount: 1420, status: 'Active', systemRole: true, badgeBg: '#fffbeb', badgeColor: '#f59e0b' },
        { id: 'role-5', name: 'Guest / Visitor', desc: 'Public course catalog browsing and platform exploration preview.', usersCount: 0, status: 'Inactive', systemRole: false, badgeBg: '#f8fafc', badgeColor: '#64748b' }
    ]);

    const [permissionMatrix, setPermissionMatrix] = useState({
        'Super Admin': { 'User Management': { moduleAccess: true, view: true, create: true, edit: true, delete: true }, 'Course Builder': { moduleAccess: true, view: true, create: true, edit: true, delete: true }, 'Quizzes & Exams': { moduleAccess: true, view: true, create: true, edit: true, delete: true }, 'Reports & Export': { moduleAccess: true, view: true, create: true, edit: true, delete: true }, 'Settings & Security': { moduleAccess: true, view: true, create: true, edit: true, delete: true } },
        'LMS Admin': { 'User Management': { moduleAccess: true, view: true, create: true, edit: true, delete: false }, 'Course Builder': { moduleAccess: true, view: true, create: true, edit: true, delete: false }, 'Quizzes & Exams': { moduleAccess: true, view: true, create: true, edit: true, delete: false }, 'Reports & Export': { moduleAccess: true, view: true, create: true, edit: true, delete: false }, 'Settings & Security': { moduleAccess: false, view: false, create: false, edit: false, delete: false } },
        'Instructor': { 'User Management': { moduleAccess: false, view: false, create: false, edit: false, delete: false }, 'Course Builder': { moduleAccess: true, view: true, create: true, edit: true, delete: false }, 'Quizzes & Exams': { moduleAccess: true, view: true, create: true, edit: true, delete: false }, 'Reports & Export': { moduleAccess: true, view: true, create: false, edit: false, delete: false }, 'Settings & Security': { moduleAccess: false, view: false, create: false, edit: false, delete: false } },
        'Student': { 'User Management': { moduleAccess: false, view: false, create: false, edit: false, delete: false }, 'Course Builder': { moduleAccess: true, view: true, create: false, edit: false, delete: false }, 'Quizzes & Exams': { moduleAccess: true, view: true, create: false, edit: false, delete: false }, 'Reports & Export': { moduleAccess: false, view: false, create: false, edit: false, delete: false }, 'Settings & Security': { moduleAccess: false, view: false, create: false, edit: false, delete: false } }
    });

    const [ipWhitelist, setIpWhitelist] = useState(['192.168.1.1', '10.0.0.45', '172.16.0.100']);
    const [newIpInput, setNewIpInput] = useState('');
    const [logSearchQuery, setLogSearchQuery] = useState('');

    const [securityAuditLogs] = useState([
        { id: 'LOG-001', user: 'Admin User', role: 'Super Admin', action: 'Role Updated', item: 'Modified LMS Admin permissions', ip: '192.168.1.1', time: '2026-08-06 22:15', status: 'Success' },
        { id: 'LOG-002', user: 'Admin User', role: 'Super Admin', action: '2FA Enabled', item: 'Enforced 2FA for Admin Accounts', ip: '192.168.1.1', time: '2026-08-06 21:40', status: 'Success' },
        { id: 'LOG-003', user: 'Selam M.', role: 'Instructor', action: 'Failed Login', item: 'Incorrect password attempt', ip: '197.156.89.12', time: '2026-08-06 20:55', status: 'Blocked' },
        { id: 'LOG-004', user: 'Admin User', role: 'Super Admin', action: 'IP Whitelisted', item: 'Added 172.16.0.100 to whitelist', ip: '192.168.1.1', time: '2026-08-06 19:30', status: 'Success' },
        { id: 'LOG-005', user: 'Dawit Y.', role: 'Student', action: 'Password Reset', item: 'User reset password via email link', ip: '197.156.88.4', time: '2026-08-06 18:10', status: 'Success' }
    ]);

    // Modal States
    const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
    const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);
    const [newRoleForm, setNewRoleForm] = useState({ name: '', desc: '' });
    const [assignForm, setAssignForm] = useState({ userEmail: '', targetRole: 'Instructor' });

    const [confirmModal, setConfirmModal] = useState({ open: false, key: '', title: '', action: null, targetValue: null });

    useEffect(() => {
        if (settings && Object.keys(settings).length > 0) {
            setLocalSettings(prev => ({ ...settings, ...prev }));
            setOriginalSettings({ ...settings });
        }
    }, [settings]);

    const modifiedKeys = useMemo(() => {
        const keys = [];
        DEFAULT_SETTING_DEFINITIONS.forEach(def => {
            const valCurrent = localSettings[def.key];
            const valOrig = originalSettings[def.key];
            if (valCurrent !== undefined && valOrig !== undefined && valCurrent !== valOrig) {
                keys.push(def.key);
            }
        });
        return keys;
    }, [localSettings, originalSettings]);

    const hasChanges = modifiedKeys.length > 0;

    const filteredSettings = useMemo(() => {
        return DEFAULT_SETTING_DEFINITIONS.filter(def => {
            if (activeCategory !== 'all' && def.category !== activeCategory) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = def.title.toLowerCase().includes(q);
                const matchDesc = def.desc.toLowerCase().includes(q);
                const matchKey = def.key.toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchKey) return false;
            }
            const val = localSettings[def.key];
            if (statusFilter === 'enabled' && (def.type !== 'boolean' || !val)) return false;
            if (statusFilter === 'disabled' && (def.type !== 'boolean' || val)) return false;
            if (statusFilter === 'critical' && !def.sensitive) return false;
            if (statusFilter === 'modified' && !modifiedKeys.includes(def.key)) return false;
            return true;
        });
    }, [activeCategory, searchQuery, statusFilter, localSettings, modifiedKeys]);

    const handleToggleChange = (def, newValue) => {
        if (def.sensitive) {
            setConfirmModal({
                open: true,
                key: def.key,
                title: def.title,
                targetValue: newValue,
                action: () => {
                    setLocalSettings(prev => ({ ...prev, [def.key]: newValue }));
                    setConfirmModal({ open: false, key: '', title: '', action: null, targetValue: null });
                    showNotification(`Updated setting: ${def.title}`);
                }
            });
        } else {
            setLocalSettings(prev => ({ ...prev, [def.key]: newValue }));
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await systemService.updateSettings(localSettings);
            if (res.data?.success) {
                const updated = res.data.data;
                setSettings(updated);
                setLocalSettings({ ...updated });
                setOriginalSettings({ ...updated });
                showNotification('System settings saved and applied successfully!');
            }
        } catch (err) {
            showNotification('Settings updated locally.');
            setOriginalSettings({ ...localSettings });
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = () => {
        setLocalSettings({ ...originalSettings });
        showNotification('Unsaved changes discarded.');
    };

    // Role Management Handlers
    const handleCreateRole = () => {
        if (!newRoleForm.name.trim()) {
            alert('Please enter a role name.');
            return;
        }
        const newRole = {
            id: `role-${Date.now()}`,
            name: newRoleForm.name.trim(),
            desc: newRoleForm.desc.trim() || 'Custom system role.',
            usersCount: 0,
            status: 'Active',
            systemRole: false,
            badgeBg: '#f5f3ff',
            badgeColor: '#22c55e'
        };
        setRolesList(prev => [...prev, newRole]);
        setPermissionMatrix(prev => ({
            ...prev,
            [newRole.name]: {
                'User Management': { moduleAccess: false, view: true, create: false, edit: false, delete: false },
                'Course Builder': { moduleAccess: true, view: true, create: false, edit: false, delete: false },
                'Quizzes & Exams': { moduleAccess: true, view: true, create: false, edit: false, delete: false },
                'Reports & Export': { moduleAccess: false, view: false, create: false, edit: false, delete: false },
                'Settings & Security': { moduleAccess: false, view: false, create: false, edit: false, delete: false }
            }
        }));
        setIsCreateRoleOpen(false);
        setNewRoleForm({ name: '', desc: '' });
        showNotification(`Role '${newRole.name}' created successfully!`);
    };

    const handleToggleRoleStatus = (roleId) => {
        setRolesList(prev => prev.map(r => {
            if (r.id === roleId) {
                if (r.systemRole) {
                    alert('System roles cannot be deactivated.');
                    return r;
                }
                const nextStatus = r.status === 'Active' ? 'Inactive' : 'Active';
                showNotification(`Role '${r.name}' is now ${nextStatus}.`);
                return { ...r, status: nextStatus };
            }
            return r;
        }));
    };

    const handleDeleteRole = (roleId, roleName) => {
        if (window.confirm(`Delete role '${roleName}'?`)) {
            setRolesList(prev => prev.filter(r => r.id !== roleId));
            showNotification(`Role '${roleName}' removed.`);
        }
    };

    const handleAssignRoleSubmit = () => {
        if (!assignForm.userEmail.trim()) {
            alert('Please enter a user email address.');
            return;
        }
        showNotification(`Assigned role '${assignForm.targetRole}' to user: ${assignForm.userEmail}`);
        setIsAssignRoleOpen(false);
        setAssignForm({ userEmail: '', targetRole: 'Instructor' });
    };

    const handleToggleMatrixPerm = (roleName, moduleName, permKey) => {
        setPermissionMatrix(prev => {
            const rolePerms = prev[roleName] || {};
            const modPerms = rolePerms[moduleName] || { moduleAccess: false, view: false, create: false, edit: false, delete: false };
            const updatedMod = { ...modPerms, [permKey]: !modPerms[permKey] };
            if (permKey === 'moduleAccess' && !updatedMod.moduleAccess) {
                updatedMod.view = false; updatedMod.create = false; updatedMod.edit = false; updatedMod.delete = false;
            }
            if ((permKey === 'view' || permKey === 'create' || permKey === 'edit' || permKey === 'delete') && updatedMod[permKey]) {
                updatedMod.moduleAccess = true;
            }
            return { ...prev, [roleName]: { ...rolePerms, [moduleName]: updatedMod } };
        });
        showNotification(`Updated ${permKey} permission for ${roleName} on ${moduleName}.`);
    };

    const handleExportPermissionMatrix = () => {
        const csv = [
            'Role,Module,Module Access (ON/OFF),View Permission,Create Permission,Edit Permission,Delete Permission',
            ...Object.entries(permissionMatrix).flatMap(([role, mods]) =>
                Object.entries(mods).map(([mod, perms]) =>
                    `"${role}","${mod}",${perms.moduleAccess ? 'ON' : 'OFF'},${perms.view ? 'Enabled' : 'Disabled'},${perms.create ? 'Enabled' : 'Disabled'},${perms.edit ? 'Enabled' : 'Disabled'},${perms.delete ? 'Enabled' : 'Disabled'}`
                )
            )
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'lms_permission_matrix.csv';
        link.click();
        showNotification('Permission Matrix CSV downloaded!');
    };

    const handleExportAuditLogs = () => {
        const csv = [
            'Log ID,Timestamp,User,Role,Action,Item/Target,IP Address,Status',
            ...securityAuditLogs.map(l => `"${l.id}","${l.time}","${l.user}","${l.role}","${l.action}","${l.item}","${l.ip}","${l.status}"`)
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'security_audit_logs.csv';
        link.click();
        showNotification('Security Audit Logs CSV downloaded!');
    };

    const handleAddIp = () => {
        if (!newIpInput.trim()) return;
        setIpWhitelist(prev => [...prev, newIpInput.trim()]);
        showNotification(`Added ${newIpInput.trim()} to IP Whitelist.`);
        setNewIpInput('');
    };

    const handleRemoveIp = (ip) => {
        setIpWhitelist(prev => prev.filter(i => i !== ip));
        showNotification(`Removed ${ip} from IP Whitelist.`);
    };

    const isDark = theme === 'dark';
    const bgBase = colors.bgCard || (isDark ? '#1e293b' : '#ffffff');
    const bgInput = colors.bgInput || (isDark ? '#0f172a' : '#f8fafc');
    const borderCol = colors.border || (isDark ? '#334155' : '#e2e8f0');
    const textCol = colors.text || (isDark ? '#f8fafc' : '#0f172a');
    const textMuted = colors.textMuted || (isDark ? '#94a3b8' : '#64748b');
    const primaryCol = colors.primary || '#16a34a';
    const primaryBg = `${primaryCol}12`;
    const accentCol = colors.accent || '#22c55e';
    const successCol = colors.success || '#10b981';
    const dangerCol = colors.danger || '#ef4444';
    const warningCol = '#f59e0b';

    const activeCatObj = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
    const ActiveCatIcon = activeCatObj.icon;

    const filteredLogs = securityAuditLogs.filter(log => {
        if (!logSearchQuery.trim()) return true;
        const q = logSearchQuery.toLowerCase();
        return log.user.toLowerCase().includes(q) || log.action.toLowerCase().includes(q) || log.item.toLowerCase().includes(q) || log.ip.includes(q);
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', minHeight: '80vh', color: textCol }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `linear-gradient(135deg, ${primaryCol}, ${accentCol})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 4px 12px ${primaryCol}33` }}>
                        <Sliders size={22} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>Admin System Settings</h2>
                        <p style={{ fontSize: '13px', color: textMuted, margin: '2px 0 0' }}>Enterprise permission controls, feature toggles, security enforcement, and server configurations.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={handleSave} disabled={!hasChanges || saving} style={{ background: hasChanges ? `linear-gradient(135deg, ${primaryCol}, ${accentCol})` : (isDark ? '#334155' : '#cbd5e1'), color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '700', cursor: hasChanges ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Save size={15} /> {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ background: bgBase, border: `1px solid ${borderCol}`, borderRadius: '16px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {CATEGORIES.map(cat => {
                        const CatIcon = cat.icon;
                        const isSelected = activeCategory === cat.id;
                        return (
                            <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: isSelected ? `1px solid ${primaryCol}` : `1px solid ${borderCol}`, background: isSelected ? primaryBg : bgInput, color: isSelected ? primaryCol : textCol, fontWeight: isSelected ? '700' : '600', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                                <CatIcon size={16} style={{ color: isSelected ? primaryCol : textMuted }} />
                                <span>{cat.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* DEDICATED SECURITY & ROLES MODULE */}
            {activeCategory === 'security' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Sub-Section Filter Pills */}
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {[
                            { id: 'all', label: 'All 6 Security Sections' },
                            { id: 'role_mgmt', label: '1. Role Management' },
                            { id: 'perm_mgmt', label: '2. Permission Management' },
                            { id: 'auth_login', label: '3. Authentication & Login' },
                            { id: 'access_ctrl', label: '4. Access Control' },
                            { id: 'audit_logs', label: '5. Audit Logs' },
                            { id: 'security_settings', label: '6. Security Settings' }
                        ].map(sec => (
                            <button key={sec.id} type="button" onClick={() => setActiveSection(sec.id)} style={{ padding: '8px 16px', borderRadius: '10px', border: activeSection === sec.id ? `1px solid ${primaryCol}` : `1px solid ${borderCol}`, background: activeSection === sec.id ? primaryBg : bgInput, color: activeSection === sec.id ? primaryCol : textCol, fontWeight: activeSection === sec.id ? '700' : '600', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {sec.label}
                            </button>
                        ))}
                    </div>

                    {/* 1. ROLE MANAGEMENT SECTION */}
                    {(activeSection === 'all' || activeSection === 'role_mgmt') && (
                        <div style={{ background: bgBase, border: `1px solid ${borderCol}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Users size={18} style={{ color: primaryCol }} />
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>1. Role Management</h3>
                                    </div>
                                    <span style={{ fontSize: '12px', color: textMuted, marginTop: '2px', display: 'block' }}><strong>Purpose:</strong> Manage system roles.</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" onClick={() => setIsCreateRoleOpen(true)} style={{ background: primaryCol, color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <Plus size={14} /> Create Role
                                    </button>
                                    <button type="button" onClick={() => setIsAssignRoleOpen(true)} style={{ background: primaryBg, color: primaryCol, border: `1px solid ${primaryCol}30`, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <UserPlus size={14} /> Assign Users to Roles
                                    </button>
                                </div>
                            </div>

                            {/* Roles List Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                                {rolesList.map(r => (
                                    <div key={r.id} style={{ background: bgInput, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <span style={{ background: r.badgeBg, color: r.badgeColor, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>{r.name}</span>
                                                <span style={{ fontSize: '11px', color: r.status === 'Active' ? successCol : textMuted, fontWeight: '700' }}>● {r.status}</span>
                                            </div>
                                            <p style={{ fontSize: '12px', color: textMuted, margin: '4px 0 0', lineHeight: 1.4 }}>{r.desc}</p>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderCol}`, paddingTop: '10px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: textCol }}>{r.usersCount} users assigned</span>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button type="button" onClick={() => handleToggleRoleStatus(r.id)} style={{ background: 'none', border: `1px solid ${borderCol}`, color: textCol, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                                                    {r.status === 'Active' ? 'Deactivate' : 'Activate'}
                                                </button>
                                                {!r.systemRole && (
                                                    <button type="button" onClick={() => handleDeleteRole(r.id, r.name)} style={{ background: `${dangerCol}15`, border: 'none', color: dangerCol, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. PERMISSION MANAGEMENT SECTION */}
                    {(activeSection === 'all' || activeSection === 'perm_mgmt') && (
                        <div style={{ background: bgBase, border: `1px solid ${borderCol}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ShieldCheck size={18} style={{ color: primaryCol }} />
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>2. Permission Management</h3>
                                    </div>
                                    <span style={{ fontSize: '12px', color: textMuted, marginTop: '2px', display: 'block' }}><strong>Purpose:</strong> Control what each role can access (View, Create, Edit, Delete).</span>
                                </div>
                                <button type="button" onClick={handleExportPermissionMatrix} style={{ background: primaryBg, color: primaryCol, border: `1px solid ${primaryCol}30`, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <Download size={14} /> Export Permission Matrix CSV
                                </button>
                            </div>

                            {/* Permission Matrix Table */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: bgInput, borderBottom: `1px solid ${borderCol}` }}>
                                            <th style={{ padding: '10px 14px', textAlign: 'left', color: textMuted }}>Role</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'left', color: textMuted }}>Module</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'center', color: textMuted }}>Module Access (ON/OFF)</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'center', color: textMuted }}>View</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'center', color: textMuted }}>Create</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'center', color: textMuted }}>Edit</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'center', color: textMuted }}>Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(permissionMatrix).flatMap(([role, mods]) =>
                                            Object.entries(mods).map(([modName, perms], idx) => (
                                                <tr key={`${role}-${modName}`} style={{ borderBottom: `1px solid ${borderCol}` }}>
                                                    {idx === 0 && <td rowSpan={Object.keys(mods).length} style={{ padding: '12px 14px', fontWeight: '700', verticalAlign: 'top', borderRight: `1px solid ${borderCol}`, color: primaryCol }}>{role}</td>}
                                                    <td style={{ padding: '10px 14px', fontWeight: '600' }}>{modName}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                        <button type="button" onClick={() => handleToggleMatrixPerm(role, modName, 'moduleAccess')} style={{ background: perms.moduleAccess ? `${successCol}18` : bgInput, color: perms.moduleAccess ? successCol : textMuted, border: `1px solid ${perms.moduleAccess ? successCol : borderCol}`, borderRadius: '20px', padding: '3px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                                                            {perms.moduleAccess ? 'ON' : 'OFF'}
                                                        </button>
                                                    </td>
                                                    {['view', 'create', 'edit', 'delete'].map(pk => (
                                                        <td key={pk} style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                            <input type="checkbox" checked={Boolean(perms[pk])} onChange={() => handleToggleMatrixPerm(role, modName, pk)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: primaryCol }} />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 3. AUTHENTICATION & LOGIN SECTION */}
                    {(activeSection === 'all' || activeSection === 'auth_login') && (
                        <div style={{ background: bgBase, border: `1px solid ${borderCol}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LockKeyhole size={18} style={{ color: primaryCol }} />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>3. Authentication & Login</h3>
                                    <span style={{ fontSize: '12px', color: textMuted }}><strong>Purpose:</strong> Secure user accounts with 2FA, password rules, and session controls.</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { key: 'requireMfa', title: 'Two-Factor Authentication (2FA)', desc: 'Mandate 2FA verification code for user logins.', type: 'boolean' },
                                    { key: 'passwordComplexityStrict', title: 'Password Policy', desc: 'Enforce strict password complexity (min 8 chars, numbers, symbols).', type: 'boolean' },
                                    { key: 'accountLockoutEnabled', title: 'Account Lockout After Failed Logins', desc: 'Lock account automatically after 5 consecutive failed login attempts.', type: 'boolean' },
                                    { key: 'forcePasswordReset', title: 'Force Password Reset', desc: 'Require users to reset password on next login attempt.', type: 'boolean' }
                                ].map(item => (
                                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: bgInput, borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                                        <div>
                                            <span style={{ fontSize: '13px', fontWeight: '700' }}>{item.title}</span>
                                            <p style={{ fontSize: '12px', color: textMuted, margin: '2px 0 0' }}>{item.desc}</p>
                                        </div>
                                        <button type="button" onClick={() => setLocalSettings(p => ({ ...p, [item.key]: !p[item.key] }))} style={{ background: localSettings[item.key] ? `${successCol}18` : bgBase, color: localSettings[item.key] ? successCol : textMuted, border: `1px solid ${localSettings[item.key] ? successCol : borderCol}`, borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                                            {localSettings[item.key] ? 'ENABLED' : 'DISABLED'}
                                        </button>
                                    </div>
                                ))}

                                {/* Session Timeout Select */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: bgInput, borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                                    <div>
                                        <span style={{ fontSize: '13px', fontWeight: '700' }}>Session Timeout Duration</span>
                                        <p style={{ fontSize: '12px', color: textMuted, margin: '2px 0 0' }}>Inactivity limit before automatic session expiration.</p>
                                    </div>
                                    <select value={localSettings.sessionTimeoutMinutes || '60'} onChange={e => setLocalSettings(p => ({ ...p, sessionTimeoutMinutes: e.target.value }))} style={{ padding: '6px 12px', borderRadius: '8px', background: bgBase, border: `1px solid ${borderCol}`, color: textCol, fontSize: '12px', fontWeight: '600' }}>
                                        <option value="15" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>15 Minutes</option>
                                        <option value="30" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>30 Minutes</option>
                                        <option value="60" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>60 Minutes (1 Hour)</option>
                                        <option value="120" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>120 Minutes (2 Hours)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. ACCESS CONTROL SECTION */}
                    {(activeSection === 'all' || activeSection === 'access_ctrl') && (
                        <div style={{ background: bgBase, border: `1px solid ${borderCol}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Globe size={18} style={{ color: primaryCol }} />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>4. Access Control</h3>
                                    <span style={{ fontSize: '12px', color: textMuted }}><strong>Purpose:</strong> Restrict system access via IP whitelisting and admin access rules.</span>
                                </div>
                            </div>

                            {/* IP Whitelist Manager */}
                            <div style={{ background: bgInput, borderRadius: '12px', padding: '16px', border: `1px solid ${borderCol}` }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>IP Whitelist / Blacklist Manager</div>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                    <input type="text" value={newIpInput} onChange={e => setNewIpInput(e.target.value)} placeholder="e.g. 192.168.1.100" style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: bgBase, color: textCol, fontSize: '12px' }} />
                                    <button type="button" onClick={handleAddIp} style={{ background: primaryCol, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Add IP</button>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {ipWhitelist.map(ip => (
                                        <span key={ip} style={{ background: bgBase, border: `1px solid ${borderCol}`, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            {ip} <X size={12} style={{ cursor: 'pointer', color: dangerCol }} onClick={() => handleRemoveIp(ip)} />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. AUDIT LOGS SECTION */}
                    {(activeSection === 'all' || activeSection === 'audit_logs') && (
                        <div style={{ background: bgBase, border: `1px solid ${borderCol}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Activity size={18} style={{ color: primaryCol }} />
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>5. Audit Logs</h3>
                                    </div>
                                    <span style={{ fontSize: '12px', color: textMuted, marginTop: '2px', display: 'block' }}><strong>Purpose:</strong> Track administrator and login activities.</span>
                                </div>
                                <button type="button" onClick={handleExportAuditLogs} style={{ background: primaryBg, color: primaryCol, border: `1px solid ${primaryCol}30`, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <Download size={14} /> Export Audit Logs CSV
                                </button>
                            </div>

                            {/* Search */}
                            <input type="text" value={logSearchQuery} onChange={e => setLogSearchQuery(e.target.value)} placeholder="Search audit logs by user, action, IP..." style={{ width: '100%', padding: '9px 14px', borderRadius: '10px', border: `1px solid ${borderCol}`, background: bgInput, color: textCol, fontSize: '12px', boxSizing: 'border-box' }} />

                            {/* Table */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: bgInput, borderBottom: `1px solid ${borderCol}` }}>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: textMuted }}>User</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: textMuted }}>Action</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: textMuted }}>Target / Details</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: textMuted }}>IP Address</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: textMuted }}>Timestamp</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', color: textMuted }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.map(l => (
                                            <tr key={l.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                                                <td style={{ padding: '10px 12px', fontWeight: '700' }}>{l.user} <span style={{ fontSize: '10px', color: textMuted }}>({l.role})</span></td>
                                                <td style={{ padding: '10px 12px', fontWeight: '600', color: primaryCol }}>{l.action}</td>
                                                <td style={{ padding: '10px 12px', color: textCol }}>{l.item}</td>
                                                <td style={{ padding: '10px 12px', color: textMuted }}>{l.ip}</td>
                                                <td style={{ padding: '10px 12px', color: textMuted }}>{l.time}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <span style={{ background: l.status === 'Success' ? `${successCol}18` : `${dangerCol}18`, color: l.status === 'Success' ? successCol : dangerCol, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>{l.status}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 6. SECURITY SETTINGS SECTION */}
                    {(activeSection === 'all' || activeSection === 'security_settings') && (
                        <div style={{ background: bgBase, border: `1px solid ${borderCol}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldAlert size={18} style={{ color: primaryCol }} />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>6. Security Settings</h3>
                                    <span style={{ fontSize: '12px', color: textMuted }}><strong>Purpose:</strong> Configure global system security options.</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { key: 'maintenanceMode', title: 'Enable Maintenance Mode', desc: 'Lock portal for non-admin users and render maintenance notice.' },
                                    { key: 'captchaEnabled', title: 'Enable CAPTCHA', desc: 'Require bot protection CAPTCHA challenge on login/signup.' },
                                    { key: 'sslStrictEnabled', title: 'Enable HTTPS (HSTS)', desc: 'Force SSL/TLS encryption across all endpoints.' },
                                    { key: 'requireEmailVerification', title: 'Enable Email Verification', desc: 'Require email activation link verification before account login.' }
                                ].map(item => (
                                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: bgInput, borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                                        <div>
                                            <span style={{ fontSize: '13px', fontWeight: '700' }}>{item.title}</span>
                                            <p style={{ fontSize: '12px', color: textMuted, margin: '2px 0 0' }}>{item.desc}</p>
                                        </div>
                                        <button type="button" onClick={() => setLocalSettings(p => ({ ...p, [item.key]: !p[item.key] }))} style={{ background: localSettings[item.key] ? `${successCol}18` : bgBase, color: localSettings[item.key] ? successCol : textMuted, border: `1px solid ${localSettings[item.key] ? successCol : borderCol}`, borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                                            {localSettings[item.key] ? 'ENABLED' : 'DISABLED'}
                                        </button>
                                    </div>
                                ))}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: bgInput, borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                                    <div>
                                        <span style={{ fontSize: '13px', fontWeight: '700' }}>Configure File Upload Limits (MB)</span>
                                        <p style={{ fontSize: '12px', color: textMuted, margin: '2px 0 0' }}>Maximum allowable attachment upload size per request.</p>
                                    </div>
                                    <input type="number" value={localSettings.maxUploadSizeMB || 25} onChange={e => setLocalSettings(p => ({ ...p, maxUploadSizeMB: Number(e.target.value) }))} style={{ width: '90px', padding: '6px 12px', borderRadius: '8px', background: bgBase, border: `1px solid ${borderCol}`, color: textCol, fontSize: '13px', textAlign: 'center', fontWeight: '700' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* DEFAULT SETTINGS PANEL FOR OTHER CATEGORIES */
                <div style={{ background: bgBase, border: `1px solid ${borderCol}`, borderRadius: '14px', overflow: 'hidden' }}>
                    {filteredSettings.map((def, idx) => (
                        <div key={def.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', padding: '16px 24px', borderBottom: idx === filteredSettings.length - 1 ? 'none' : `1px solid ${borderCol}` }}>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: textCol }}>{def.title}</span>
                                <p style={{ fontSize: '12px', color: textMuted, margin: '3px 0 0' }}>{def.desc}</p>
                            </div>
                            <div>
                                {def.type === 'boolean' && (
                                    <button type="button" onClick={() => handleToggleChange(def, !localSettings[def.key])} style={{ background: localSettings[def.key] ? `${successCol}18` : bgInput, color: localSettings[def.key] ? successCol : textMuted, border: `1px solid ${localSettings[def.key] ? successCol : borderCol}`, borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                                        {localSettings[def.key] ? 'ENABLED' : 'DISABLED'}
                                    </button>
                                )}
                                {def.type === 'text' && (
                                    <input type="text" value={localSettings[def.key] || ''} onChange={e => setLocalSettings(p => ({ ...p, [def.key]: e.target.value }))} style={{ padding: '7px 12px', borderRadius: '8px', background: bgInput, border: `1px solid ${borderCol}`, color: textCol, fontSize: '13px' }} />
                                )}
                                {def.type === 'select' && (
                                    <select value={localSettings[def.key] || ''} onChange={e => setLocalSettings(p => ({ ...p, [def.key]: e.target.value }))} style={{ padding: '7px 12px', borderRadius: '8px', background: bgInput, border: `1px solid ${borderCol}`, color: textCol, fontSize: '13px', fontWeight: '600' }}>
                                        {def.options?.map(opt => <option key={opt.v} value={opt.v} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{opt.label}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CREATE ROLE MODAL */}
            {isCreateRoleOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: bgBase, border: `1px solid ${borderCol}`, borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Create System Role</h3>
                            <button type="button" onClick={() => setIsCreateRoleOpen(false)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Role Name *</label>
                            <input type="text" value={newRoleForm.name} onChange={e => setNewRoleForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Course Examiner" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: bgInput, color: textCol, fontSize: '13px', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Description</label>
                            <textarea value={newRoleForm.desc} onChange={e => setNewRoleForm(p => ({ ...p, desc: e.target.value }))} placeholder="Purpose and permissions scope of this role..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: bgInput, color: textCol, fontSize: '13px', minHeight: '70px', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={() => setIsCreateRoleOpen(false)} style={{ background: bgInput, border: `1px solid ${borderCol}`, color: textCol, padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={handleCreateRole} style={{ background: primaryCol, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Create Role</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSIGN USERS TO ROLE MODAL */}
            {isAssignRoleOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: bgBase, border: `1px solid ${borderCol}`, borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Assign Users to Role</h3>
                            <button type="button" onClick={() => setIsAssignRoleOpen(false)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>User Email Address *</label>
                            <input type="email" value={assignForm.userEmail} onChange={e => setAssignForm(p => ({ ...p, userEmail: e.target.value }))} placeholder="user@emare.edu" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: bgInput, color: textCol, fontSize: '13px', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Target Role</label>
                            <select value={assignForm.targetRole} onChange={e => setAssignForm(p => ({ ...p, targetRole: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: bgInput, color: textCol, fontSize: '13px', fontWeight: '600' }}>
                                {rolesList.map(r => <option key={r.id} value={r.name} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{r.name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={() => setIsAssignRoleOpen(false)} style={{ background: bgInput, border: `1px solid ${borderCol}`, color: textCol, padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={handleAssignRoleSubmit} style={{ background: primaryCol, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Assign Role</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
