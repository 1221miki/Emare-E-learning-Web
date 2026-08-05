import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { courseService, quizService, assignmentService, userService, enrollmentService, analyticsService, systemService, notificationService, authService, reportService, certificateService, contentService, uploadService, auditService, calendarService } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { LayoutDashboard, BarChart3, Users, UserCog, Building2, BookOpen, FolderTree, NotebookPen, Video, FileQuestion, ClipboardList, Award, Wallet, Receipt, DollarSign, TicketPercent, FileBarChart, Bell, Megaphone, MessageSquare, MessagesSquare, Bot, LifeBuoy, Settings, ShieldCheck, ClipboardCheck, DatabaseBackup, PlugZap, KeyRound, UserCircle, LogOut, TrendingUp, Clock3, Activity, PlusCircle, FilePen, Upload, Archive, Trash2, UserPlus, UserMinus, ShieldAlert, RotateCcw, CreditCard, PieChart as LucidePieChart, Mail, Eye, EyeOff, AlertTriangle, Palette, Languages, MoonStar, Database, BadgeInfo, CircleCheck, Server, GraduationCap } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AdminDashboard() {
    const { colors, theme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(() => location.state?.activeTab || 'overview');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);
    
    // Data states
    const [analytics, setAnalytics] = useState(null);
    const [users, setUsers] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [settings, setSettings] = useState({
        websiteName: 'Emare E-Learning', siteLogo: '', favicon: '', theme: 'light', timezone: 'Africa/Addis_Ababa', language: 'en',
        maintenanceMode: false, allowRegistration: true, currency: 'ETB', contactEmail: '', emailFromName: 'Emare E-Learning', emailFromAddress: 'support@emareicthub.com',
        smtpHost: '', smtpPort: 587, smtpUsername: '', smtpPassword: '', smtpSecure: true,
        maxUploadSizeMB: 25, allowedUploadTypes: 'jpg,jpeg,png,pdf,doc,docx,ppt,pptx,zip', maxVideoSizeMB: 500, videoFormat: 'mp4', videoTranscodingEnabled: true,
        storageProvider: 'cloudinary', storageBucket: '', backupEnabled: true, backupFrequency: 'daily', backupRetentionDays: 30, backupLocation: 'local',
        paymentGatewayActive: true, cloudinaryActive: true, requireEmailVerification: false
    });

    // Modal & action states
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [notificationMsg, setNotificationMsg] = useState('');
    const [userFilter, setUserFilter] = useState('All');
    const [createForm, setCreateForm] = useState({
        fullName: '', accountEmail: '', securedPassword: '', confirmPassword: '', assignedRole: 'Instructor', contactPhone: '', isActive: true, requirePasswordChange: true, sendWelcomeEmail: true,
        username: '', gender: '', dateOfBirth: '', avatarUrl: '',
        // Instructor fields
        specialization: '', yearsOfExperience: '', skills: '', biography: '', department: '', employmentType: '', joiningDate: '',
        cvResumeUrl: '', educationCertificateUrl: '', professionalCertificateUrl: '', nationalIdUrl: '',
        // Admin fields
        positionJobTitle: '', dateOfAppointment: '', recoveryEmail: '', securityQuestion: '', securityAnswer: '',
        employeeIdCardUrl: '', appointmentLetterUrl: '',
        permissions: { userManagement: false, courseManagement: false, instructorManagement: false, studentManagement: false, reportsAnalytics: false, systemSettings: false, rolePermissionManagement: false, contentApproval: false, announcementManagement: false }
    });
    const [createFormStep, setCreateFormStep] = useState(1);
    const [isUploadingCreateFile, setIsUploadingCreateFile] = useState(false);
    const [editForm, setEditForm] = useState({ fullName: '', accountEmail: '' });
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [selectedCourseForReview, setSelectedCourseForReview] = useState(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewFeedback, setReviewFeedback] = useState('');
    const [reviewQuizzes, setReviewQuizzes] = useState([]);
    const [reviewAssignments, setReviewAssignments] = useState([]);
    const [isLoadingReviewDetails, setIsLoadingReviewDetails] = useState(false);
    const [certificateTemplates, setCertificateTemplates] = useState([]);
    const [selectedReportType, setSelectedReportType] = useState('student');
    const [selectedReportFormat, setSelectedReportFormat] = useState('pdf');
    const [isExportingReport, setIsExportingReport] = useState(false);
    const [certificateRecords, setCertificateRecords] = useState([]);
    const [certificateForm, setCertificateForm] = useState({ studentId: '', courseId: '', templateId: 'standard' });
    const [notificationForm, setNotificationForm] = useState({ audience: 'all', title: '', message: '', type: 'announcement', link: '', scheduleAt: '', reminder: false });
    const [notificationSummary, setNotificationSummary] = useState({ total: 0, unread: 0, recent: [] });
    const [isNotificationSubmitting, setIsNotificationSubmitting] = useState(false);
    const [isUploadingAsset, setIsUploadingAsset] = useState(false);
    const [contentPages, setContentPages] = useState([]);
    const [selectedContentPage, setSelectedContentPage] = useState('home');
    const [contentForm, setContentForm] = useState({ title: '', content: '' });
    const [isContentSaving, setIsContentSaving] = useState(false);
    const [dbMetrics, setDbMetrics] = useState({ databaseName: 'unknown', collections: [], dataSizeBytes: 0, indexSizeBytes: 0, storageSizeBytes: 0, objects: 0 });
    const [dbActionLoading, setDbActionLoading] = useState({ backup: false, restore: false, optimize: false });
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditFilter, setAuditFilter] = useState('all');
    const [auditSearch, setAuditSearch] = useState('');
    const [isAuditLoading, setIsAuditLoading] = useState(false);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [calendarForm, setCalendarForm] = useState({ title: '', category: 'academic', description: '', startDate: '', endDate: '', location: '', isAllDay: false, color: '#2563eb' });
    const [calendarEditingId, setCalendarEditingId] = useState(null);
    const [isCalendarSaving, setIsCalendarSaving] = useState(false);
    const [certificateVerificationNumber, setCertificateVerificationNumber] = useState('');
    const [certificateVerificationResult, setCertificateVerificationResult] = useState(null);
    const [isCertificateActionLoading, setIsCertificateActionLoading] = useState(false);
    const [activeTemplateId, setActiveTemplateId] = useState('standard');
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [newTemplateData, setNewTemplateData] = useState({ name: '', description: '', layoutStyle: 'Classic', signature: 'Course Director', colorScheme: 'Blue' });

    useEffect(() => {
        const savedTemplates = window.localStorage.getItem('certificateTemplates');
        if (savedTemplates) {
            const parsed = JSON.parse(savedTemplates);
            setCertificateTemplates(parsed);
            setActiveTemplateId(parsed[0]?.id || 'standard');
        } else {
            setCertificateTemplates([
                {
                    id: 'standard',
                    name: 'Standard Template',
                    description: 'Classic certificate layout with institutional branding and formal finish.',
                    layoutStyle: 'Classic',
                    colorScheme: 'Blue',
                    signature: 'Registrar'
                }
            ]);
        }
    }, []);

    useEffect(() => {
        if (certificateTemplates.length) {
            window.localStorage.setItem('certificateTemplates', JSON.stringify(certificateTemplates));
        }
    }, [certificateTemplates]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchCertificates = async () => {
        try {
            const response = await certificateService.getAllAdmin();
            setCertificateRecords(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching certificates:', error);
        }
    };

    const fetchNotificationSummary = async () => {
        try {
            const response = await notificationService.getAdminSummary();
            setNotificationSummary(response.data?.data || { total: 0, unread: 0, recent: [] });
        } catch (error) {
            console.error('Error fetching notification summary:', error);
        }
    };

    const fetchContentPages = async () => {
        try {
            const response = await contentService.getAll();
            const pages = response.data?.data || [];
            setContentPages(pages);
            if (!pages.find((page) => page.pageKey === selectedContentPage)) {
                setSelectedContentPage('home');
            }
        } catch (error) {
            console.error('Error fetching content pages:', error);
        }
    };

    const fetchAuditLogs = async (category = 'all', search = '') => {
        try {
            setIsAuditLoading(true);
            const response = await auditService.getLogs({ category: category === 'all' ? '' : category, search });
            setAuditLogs(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setIsAuditLoading(false);
        }
    };

    const fetchCalendarEvents = async () => {
        try {
            const response = await calendarService.getEvents({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() });
            setCalendarEvents(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [analyticsRes, usersRes, coursesRes, enrollmentsRes, settingsRes, notificationsRes, collectionsRes, storageRes] = await Promise.all([
                analyticsService.getOverview().catch(() => ({ data: { data: {} } })),
                userService.getAll({ limit: 100 }).catch(() => ({ data: { data: [] } })),
                courseService.getAdminAll().catch(() => ({ data: { data: [] } })),
                enrollmentService.getAll().catch(() => ({ data: { data: [] } })),
                systemService.getSettings().catch(() => ({ data: { data: {} } })),
                notificationService.getAll().catch(() => ({ data: { data: [] } })),
                systemService.getDatabaseCollections().catch(() => ({ data: { data: { collections: [] } } })),
                systemService.getDatabaseStorage().catch(() => ({ data: { data: { storageSizeBytes: 0 } } }))
            ]);

            setAnalytics(analyticsRes.data.data);
            setUsers(usersRes.data.data);
            setAllCourses(coursesRes.data.data || []);
            setEnrollments(enrollmentsRes.data.data);
            setNotifications(notificationsRes.data.data || []);
            if(settingsRes.data?.data) setSettings(settingsRes.data.data);
            const dbData = collectionsRes.data?.data || storageRes.data?.data || {};
            setDbMetrics({
                databaseName: dbData.databaseName || 'unknown',
                collections: dbData.collections || [],
                dataSizeBytes: dbData.dataSizeBytes || 0,
                indexSizeBytes: dbData.indexSizeBytes || 0,
                storageSizeBytes: dbData.storageSizeBytes || 0,
                objects: dbData.objects || 0
            });
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
            fetchCertificates();
            fetchNotificationSummary();
            fetchContentPages();
            fetchAuditLogs();
            fetchCalendarEvents();
        }
    };

    const showNotification = (msg) => {
        setNotificationMsg(msg);
        setTimeout(() => setNotificationMsg(''), 3000);
    };

    const formatBytes = (bytes = 0) => {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unit = 0;
        while (size >= 1024 && unit < units.length - 1) {
            size /= 1024;
            unit += 1;
        }
        return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
    };

    const reportOptions = [
        { value: 'student', label: 'Student Report' },
        { value: 'instructor', label: 'Instructor Report' },
        { value: 'course', label: 'Course Report' },
        { value: 'quiz', label: 'Quiz Report' },
        { value: 'assignment', label: 'Assignment Report' },
        { value: 'enrollment', label: 'Enrollment Report' },
        { value: 'completion', label: 'Completion Report' },
        { value: 'performance', label: 'Performance Report' },
        { value: 'attendance', label: 'Attendance Report' },
        { value: 'system', label: 'System Report' }
    ];

    const formatOptions = [
        { value: 'pdf', label: 'PDF' },
        { value: 'xlsx', label: 'Excel' },
        { value: 'csv', label: 'CSV' }
    ];

    const handleExportReport = async () => {
        try {
            setIsExportingReport(true);
            const response = await reportService.export({ reportType: selectedReportType, format: selectedReportFormat });
            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${selectedReportType}-report.${selectedReportFormat === 'xlsx' ? 'xlsx' : selectedReportFormat}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            const reportLabel = reportOptions.find((option) => option.value === selectedReportType)?.label || 'Report';
            const formatLabel = formatOptions.find((option) => option.value === selectedReportFormat)?.label || selectedReportFormat;
            showNotification(`${reportLabel} exported as ${formatLabel}.`);
        } catch (error) {
            console.error('Error exporting report:', error);
            alert(error.response?.data?.message || 'Failed to export report.');
        } finally {
            setIsExportingReport(false);
        }
    };

    const handleGenerateCertificate = async (e) => {
        e.preventDefault();
        if (!certificateForm.studentId || !certificateForm.courseId) {
            alert('Please select a student and course.');
            return;
        }

        try {
            setIsCertificateActionLoading(true);
            const response = await certificateService.generateForAdmin(certificateForm);
            showNotification(response.data?.message || 'Certificate generated successfully.');
            setCertificateForm({ studentId: '', courseId: '', templateId: 'standard' });
            fetchCertificates();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to generate certificate.');
        } finally {
            setIsCertificateActionLoading(false);
        }
    };

    const handleVerifyCertificate = async (e) => {
        e.preventDefault();
        if (!certificateVerificationNumber.trim()) {
            alert('Enter a certificate number.');
            return;
        }

        try {
            setIsCertificateActionLoading(true);
            const response = await certificateService.verify(certificateVerificationNumber.trim());
            setCertificateVerificationResult(response.data?.data || null);
            showNotification('Certificate verified successfully.');
        } catch (error) {
            setCertificateVerificationResult(null);
            alert(error.response?.data?.message || 'Certificate could not be verified.');
        } finally {
            setIsCertificateActionLoading(false);
        }
    };

    const handleReissueCertificate = async (id) => {
        try {
            setIsCertificateActionLoading(true);
            const response = await certificateService.reissue(id, { templateId: 'standard' });
            showNotification(response.data?.message || 'Certificate reissued.');
            fetchCertificates();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to reissue certificate.');
        } finally {
            setIsCertificateActionLoading(false);
        }
    };

    const handleRevokeCertificate = async (id) => {
        const reason = window.prompt('Enter revocation reason:');
        if (reason === null) return;

        try {
            setIsCertificateActionLoading(true);
            const response = await certificateService.revoke(id, reason || 'Revoked by administrator');
            showNotification(response.data?.message || 'Certificate revoked.');
            fetchCertificates();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to revoke certificate.');
        } finally {
            setIsCertificateActionLoading(false);
        }
    };

    const handleDownloadCertificate = async (id) => {
        try {
            setIsCertificateActionLoading(true);
            const response = await certificateService.download(id);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `certificate-${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showNotification('Certificate downloaded.');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to download certificate.');
        } finally {
            setIsCertificateActionLoading(false);
        }
    };

    const handleSendNotification = async (e) => {
        e.preventDefault();
        if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
            alert('Please provide a title and message.');
            return;
        }

        try {
            setIsNotificationSubmitting(true);
            const response = await notificationService.sendAdmin(notificationForm);
            showNotification(response.data?.message || 'Notification sent successfully.');
            setNotificationForm({ audience: 'all', title: '', message: '', type: 'announcement', link: '', scheduleAt: '', reminder: false });
            fetchNotificationSummary();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to send notification.');
        } finally {
            setIsNotificationSubmitting(false);
        }
    };

    const handleContentPageChange = async (pageKey) => {
        setSelectedContentPage(pageKey);
        try {
            const response = await contentService.getPage(pageKey);
            const page = response.data?.data || { title: '', content: {} };
            setContentForm({
                title: page.title || '',
                content: typeof page.content === 'string' ? page.content : JSON.stringify(page.content, null, 2)
            });
        } catch (error) {
            console.error('Error loading content page:', error);
        }
    };

    const handleSaveContent = async (e) => {
        e.preventDefault();
        try {
            setIsContentSaving(true);
            const parsedContent = (() => {
                try {
                    return JSON.parse(contentForm.content);
                } catch {
                    return contentForm.content;
                }
            })();

            await contentService.savePage(selectedContentPage, {
                title: contentForm.title,
                content: parsedContent
            });
            showNotification('Content saved successfully.');
            fetchContentPages();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save content.');
        } finally {
            setIsContentSaving(false);
        }
    };

    const handleOpenTemplateModal = () => {
        setNewTemplateData({ name: '', description: '', layoutStyle: 'Classic', signature: 'Course Director', colorScheme: 'Blue' });
        setIsTemplateModalOpen(true);
    };

    const handleCreateTemplate = (e) => {
        e.preventDefault();
        if (!newTemplateData.name.trim()) {
            alert('Template name is required.');
            return;
        }

        const newTemplate = {
            id: `template-${Date.now()}`,
            name: newTemplateData.name.trim(),
            description: newTemplateData.description.trim() || 'Custom certificate template created by admin.',
            layoutStyle: newTemplateData.layoutStyle || 'Classic',
            signature: newTemplateData.signature.trim() || 'Course Director',
            colorScheme: newTemplateData.colorScheme || 'Blue'
        };

        setCertificateTemplates(prev => [...prev, newTemplate]);
        setActiveTemplateId(newTemplate.id);
        setIsTemplateModalOpen(false);
        showNotification('Certificate template created successfully.');
    };

    const handleSelectTemplate = (templateId) => {
        setActiveTemplateId(templateId);
    };

    const handleDeleteTemplate = (templateId) => {
        if (templateId === 'standard') {
            alert('Standard template cannot be deleted.');
            return;
        }

        const remaining = certificateTemplates.filter(t => t.id !== templateId);
        setCertificateTemplates(remaining);
        if (activeTemplateId === templateId) {
            setActiveTemplateId(remaining[0]?.id || 'standard');
        }
        showNotification('Certificate template removed.');
    };

    // ── User Management ────────────────────────────────────────

    const handleToggleUserStatus = async (user) => {
        try {
            const newStatus = !user.isActive;
            await userService.update(user._id, { isActive: newStatus });
            setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: newStatus } : u));
            showNotification(`User ${newStatus ? 'activated' : 'deactivated'}`);
        } catch (err) {
            alert('Failed to update user status.');
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;
        try {
            // If password is provided, directly set it. Otherwise, send reset email
            const response = await userService.resetPassword(selectedUser._id, newPassword || null);
            showNotification(response.data?.message || `Password reset sent to ${selectedUser.fullName}`);
            setIsPasswordModalOpen(false);
            setNewPassword('');
            setSelectedUser(null);
            setShowResetPassword(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reset password.');
        }
    };

    const handleCreateFileUpload = async (fieldName, file) => {
        if (!file) return;
        setIsUploadingCreateFile(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await uploadService.uploadFile(formData);
            if (res?.data?.success) {
                setCreateForm(prev => ({ ...prev, [fieldName]: res.data.data.url }));
                showNotification('File uploaded successfully');
            }
        } catch (err) {
            alert('File upload failed. Please try again.');
        } finally {
            setIsUploadingCreateFile(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (createForm.securedPassword !== createForm.confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
        try {
            const payload = {
                fullName: createForm.fullName.trim(),
                accountEmail: createForm.accountEmail.trim().toLowerCase(),
                securedPassword: createForm.securedPassword,
                assignedRole: createForm.assignedRole,
                contactPhone: createForm.contactPhone,
                isActive: createForm.isActive,
                requirePasswordChange: createForm.requirePasswordChange,
                sendWelcomeEmail: createForm.sendWelcomeEmail,
                username: createForm.username,
                gender: createForm.gender,
                dateOfBirth: createForm.dateOfBirth || undefined,
                avatarUrl: createForm.avatarUrl
            };
            if (createForm.assignedRole === 'Instructor') {
                Object.assign(payload, {
                    specialization: createForm.specialization, yearsOfExperience: createForm.yearsOfExperience,
                    skills: createForm.skills, biography: createForm.biography, department: createForm.department,
                    employmentType: createForm.employmentType, joiningDate: createForm.joiningDate || undefined,
                    cvResumeUrl: createForm.cvResumeUrl, educationCertificateUrl: createForm.educationCertificateUrl,
                    professionalCertificateUrl: createForm.professionalCertificateUrl, nationalIdUrl: createForm.nationalIdUrl
                });
            }
            if (createForm.assignedRole === 'Admin') {
                Object.assign(payload, {
                    positionJobTitle: createForm.positionJobTitle, department: createForm.department,
                    employmentType: createForm.employmentType, dateOfAppointment: createForm.dateOfAppointment || undefined,
                    recoveryEmail: createForm.recoveryEmail, securityQuestion: createForm.securityQuestion,
                    securityAnswer: createForm.securityAnswer, employeeIdCardUrl: createForm.employeeIdCardUrl,
                    appointmentLetterUrl: createForm.appointmentLetterUrl, permissions: createForm.permissions
                });
            }
            const response = await userService.createUser(payload);
            if (response?.data?.success) {
                showNotification(`${createForm.assignedRole} account created successfully`);
                setIsCreateModalOpen(false);
                setCreateFormStep(1);
                setCreateForm({
                    fullName: '', accountEmail: '', securedPassword: '', confirmPassword: '', assignedRole: 'Instructor', contactPhone: '', isActive: true, requirePasswordChange: true, sendWelcomeEmail: true,
                    username: '', gender: '', dateOfBirth: '', avatarUrl: '',
                    specialization: '', yearsOfExperience: '', skills: '', biography: '', department: '', employmentType: '', joiningDate: '',
                    cvResumeUrl: '', educationCertificateUrl: '', professionalCertificateUrl: '', nationalIdUrl: '',
                    positionJobTitle: '', dateOfAppointment: '', recoveryEmail: '', securityQuestion: '', securityAnswer: '',
                    employeeIdCardUrl: '', appointmentLetterUrl: '',
                    permissions: { userManagement: false, courseManagement: false, instructorManagement: false, studentManagement: false, reportsAnalytics: false, systemSettings: false, rolePermissionManagement: false, contentApproval: false, announcementManagement: false }
                });
                setShowCreatePassword(false);
                fetchData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create user account.');
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;
        try {
            const response = await userService.update(selectedUser._id, {
                fullName: editForm.fullName.trim(),
                accountEmail: editForm.accountEmail.trim().toLowerCase()
            });
            if (response?.data?.success) {
                setUsers(prev => prev.map(user => user._id === selectedUser._id ? { ...user, fullName: editForm.fullName.trim(), accountEmail: editForm.accountEmail.trim().toLowerCase() } : user));
                showNotification('Account updated successfully');
                setIsEditModalOpen(false);
                setSelectedUser(null);
                setEditForm({ fullName: '', accountEmail: '' });
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update account.');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Delete ${user.fullName}? This action cannot be undone.`)) {
            return;
        }
        try {
            await userService.deactivate(user._id);
            setUsers(prev => prev.filter(item => item._id !== user._id));
            showNotification(`${user.fullName} has been deleted.`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete account.');
        }
    };

    // ── Course Management ──────────────────────────────────────

    const handleApproveCourse = async (id) => {
        try {
            await courseService.approve(id);
            setAllCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Published' } : c));
            showNotification('Course approved and published');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to approve course.');
        }
    };

    const handleRequestRevision = async (id, message = '') => {
        try {
            const res = await courseService.requestRevision(id, message);
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Course sent back for revisions');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to request revision.');
        }
    };

    const handleRejectCourse = async (id, message = '') => {
        try {
            const res = await courseService.reject(id, message);
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Course rejected and reverted to Draft');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reject course.');
        }
    };

    const handleSendCourseFeedback = async (id, message) => {
        if (!message || !message.trim()) {
            alert('Feedback message is required.');
            return;
        }
        try {
            const res = await courseService.sendFeedback(id, message.trim());
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            setReviewFeedback('');
            showNotification('Feedback sent to instructor');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send feedback.');
        }
    };

    const handleOpenCourseReview = async (course) => {
        setSelectedCourseForReview(course);
        setIsReviewModalOpen(true);
        setReviewFeedback('');
        setReviewQuizzes([]);
        setReviewAssignments([]);
        setIsLoadingReviewDetails(true);

        try {
            const [courseRes, quizRes, assignmentRes] = await Promise.all([
                courseService.getById(course._id).catch(() => ({ data: { data: course } })),
                quizService.getByCourse(course._id).catch(() => ({ data: { data: [] } })),
                assignmentService.getByCourse(course._id).catch(() => ({ data: { data: [] } }))
            ]);

            setSelectedCourseForReview(courseRes.data.data);
            setReviewQuizzes(quizRes.data.data || []);
            setReviewAssignments(assignmentRes.data.data || []);
        } catch (err) {
            console.error('Failed to load review details', err);
        } finally {
            setIsLoadingReviewDetails(false);
        }
    };

    const handleCloseReviewModal = () => {
        setIsReviewModalOpen(false);
        setSelectedCourseForReview(null);
        setReviewQuizzes([]);
        setReviewAssignments([]);
        setReviewFeedback('');
    };

    const handleRequestRevisionWithPrompt = async (id) => {
        const message = window.prompt('Enter revision instructions for the instructor:');
        if (!message) return;
        await handleRequestRevision(id, message);
    };

    const handleRejectCourseWithPrompt = async (id) => {
        const message = window.prompt('Enter rejection notes for the instructor:');
        if (!message) return;
        await handleRejectCourse(id, message);
    };

    const handleArchiveCourse = async (id) => {
        try {
            const res = await courseService.archive(id);
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Course archived successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to archive course.');
        }
    };

    const handleUnpublishCourse = async (id) => {
        try {
            const res = await courseService.unpublish(id);
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Course unpublished and moved to Draft');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to unpublish course.');
        }
    };

    const handleRestoreCourse = async (id) => {
        try {
            await courseService.restore(id);
            setAllCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Draft' } : c));
            showNotification('Course restored to Draft');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to restore course.');
        }
    };

    const handleToggleFeatured = async (id, currentValue) => {
        try {
            const res = await courseService.feature(id, { isFeatured: !currentValue });
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification(res.data.message || `Course ${!currentValue ? 'featured' : 'unfeatured'}`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update featured state.');
        }
    };

    const handleAssignInstructor = async (id) => {
        const instructorId = window.prompt('Enter the instructor ID to assign to this course:');
        if (!instructorId) return;
        try {
            const res = await courseService.assignInstructor(id, instructorId.trim());
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Instructor assigned successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to assign instructor.');
        }
    };

    const handleRemoveInstructor = async (id) => {
        if (!window.confirm('Remove assigned instructor from this course?')) return;
        try {
            const res = await courseService.removeInstructor(id);
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Instructor removed successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove instructor.');
        }
    };

    const handleChangeCategory = async (id) => {
        const technicalCategory = window.prompt('Enter the new category for this course:');
        if (!technicalCategory) return;
        try {
            const res = await courseService.changeCategory(id, technicalCategory.trim());
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
            showNotification('Course category updated successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update category.');
        }
    };

    const handleApprovePayment = async (enrollmentId) => {
        try {
            const response = await enrollmentService.approvePayment(enrollmentId);
            setEnrollments(prev => prev.map(e => e._id === enrollmentId ? { ...e, paymentStatus: response.data.data.paymentStatus, tuitionClearanceFlag: response.data.data.tuitionClearanceFlag } : e));
            showNotification('Payment approved and tuition cleared.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to approve payment.');
        }
    };

    const handleRejectPayment = async (enrollmentId) => {
        try {
            const response = await enrollmentService.rejectPayment(enrollmentId);
            setEnrollments(prev => prev.map(e => e._id === enrollmentId ? { ...e, paymentStatus: response.data.data.paymentStatus, tuitionClearanceFlag: response.data.data.tuitionClearanceFlag } : e));
            showNotification('Payment rejected and student notified.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reject payment.');
        }
    };

    // ── System Management ──────────────────────────────────────

    const handleAssetUpload = async (fieldName, file) => {
        if (!file) return;
        try {
            setIsUploadingAsset(true);
            const formData = new FormData();
            formData.append('file', file);
            const response = await uploadService.uploadFile(formData);
            const uploadedUrl = response.data?.data?.url;
            if (!uploadedUrl) throw new Error('Upload failed');
            setSettings(prev => ({ ...prev, [fieldName]: uploadedUrl }));
            showNotification(`${fieldName === 'siteLogo' ? 'Logo' : 'Favicon'} uploaded successfully.`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to upload asset.');
        } finally {
            setIsUploadingAsset(false);
        }
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        try {
            await systemService.updateSettings(settings);
            showNotification('System settings updated successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update settings');
        }
    };

    const handleBackup = async () => {
        try {
            setDbActionLoading(prev => ({ ...prev, backup: true }));
            const res = await systemService.createBackup();
            showNotification(res.data.message);
            setDbMetrics(prev => ({ ...prev, ...(res.data?.data || {}) }));
        } catch (err) {
            alert(err.response?.data?.message || 'Backup failed');
        } finally {
            setDbActionLoading(prev => ({ ...prev, backup: false }));
        }
    };

    const handleRestoreDatabase = async () => {
        try {
            setDbActionLoading(prev => ({ ...prev, restore: true }));
            const res = await systemService.restoreDatabase({ restoreFromLatest: true });
            showNotification(res.data.message);
        } catch (err) {
            alert(err.response?.data?.message || 'Restore failed');
        } finally {
            setDbActionLoading(prev => ({ ...prev, restore: false }));
        }
    };

    const handleOptimizeDatabase = async () => {
        try {
            setDbActionLoading(prev => ({ ...prev, optimize: true }));
            const res = await systemService.optimizeDatabase();
            showNotification(res.data.message);
            setDbMetrics(prev => ({ ...prev, ...(res.data?.data?.metrics || {}) }));
        } catch (err) {
            alert(err.response?.data?.message || 'Optimization failed');
        } finally {
            setDbActionLoading(prev => ({ ...prev, optimize: false }));
        }
    };

    const handleClearCache = async () => {
        try {
            const res = await systemService.clearCache();
            showNotification(res.data.message);
        } catch (err) {
            alert('Cache clear failed');
        }
    };

    const handleAuditFilterChange = (category) => {
        setAuditFilter(category);
        fetchAuditLogs(category, auditSearch);
    };

    const handleAuditSearch = (e) => {
        const value = e.target.value;
        setAuditSearch(value);
        fetchAuditLogs(auditFilter, value);
    };

    const resetCalendarForm = () => {
        setCalendarForm({ title: '', category: 'academic', description: '', startDate: '', endDate: '', location: '', isAllDay: false, color: '#2563eb' });
        setCalendarEditingId(null);
    };

    const handleSaveCalendarEvent = async (e) => {
        e.preventDefault();
        try {
            setIsCalendarSaving(true);
            const payload = {
                ...calendarForm,
                startDate: new Date(calendarForm.startDate).toISOString(),
                endDate: calendarForm.endDate ? new Date(calendarForm.endDate).toISOString() : null,
                isAllDay: Boolean(calendarForm.isAllDay)
            };
            if (calendarEditingId) {
                await calendarService.updateEvent(calendarEditingId, payload);
                showNotification('Calendar event updated.');
            } else {
                await calendarService.createEvent(payload);
                showNotification('Calendar event created.');
            }
            resetCalendarForm();
            fetchCalendarEvents();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save calendar event.');
        } finally {
            setIsCalendarSaving(false);
        }
    };

    const handleEditCalendarEvent = (event) => {
        setCalendarEditingId(event._id);
        setCalendarForm({
            title: event.title || '',
            category: event.category || 'academic',
            description: event.description || '',
            startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
            endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
            location: event.location || '',
            isAllDay: Boolean(event.isAllDay),
            color: event.color || '#2563eb'
        });
    };

    const handleDeleteCalendarEvent = async (id) => {
        if (!window.confirm('Delete this calendar event?')) return;
        try {
            await calendarService.deleteEvent(id);
            showNotification('Calendar event deleted.');
            fetchCalendarEvents();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete calendar event.');
        }
    };

    // ── RENDERERS ──────────────────────────────────────────────

    const s = {
        page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", background: colors.bg },
        main: { marginLeft: '260px', flex: 1, padding: '40px', overflowY: 'auto' },
        header: { marginBottom: '32px' },
        greeting: { color: colors.text, fontSize: '32px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' },
        notification: { position: 'fixed', top: '24px', right: '24px', background: colors.success, color: '#fff', padding: '16px 24px', borderRadius: '12px', fontWeight: '600', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 1000, animation: 'fadeIn 0.3s ease-out' },
        tabContent: { animation: 'fadeIn 0.3s ease-in-out' },
        sectionHeader: { marginBottom: '32px' },
        sectionTitle: { color: colors.text, fontSize: '24px', fontWeight: '800', margin: '0 0 8px' },
        sectionSub: { color: colors.textMuted, fontSize: '15px', margin: 0 },
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' },
        cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', alignItems: 'start' },
        card: { background: colors.bgCard, backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '28px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
        cardTitle: { color: colors.text, fontSize: '18px', fontWeight:'700', margin:'0 0 20px' },
        tableContainer: { background: colors.bgCard, backdropFilter: 'blur(10px)', borderRadius: '16px', border: `1px solid ${colors.border}`, overflowX: 'auto', padding: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
        table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: colors.text },
        th: { padding: '16px 24px', color: colors.textMuted, fontSize: '13px', fontWeight: '700', borderBottom: `1px solid ${colors.border}` },
        td: { padding: '16px 24px', fontSize: '14px', borderBottom: `1px solid ${colors.border}` },
        badge: { padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' },
        select: { background: colors.bgInput, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '10px 14px', outline: 'none', width: '100%' },
        actionBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', fontWeight: '600', padding: '0 8px' },
        emptyState: { padding: '40px', textAlign: 'center', color: colors.textMuted, background: colors.bgInput, borderRadius: '12px', border: `1px dashed ${colors.border}` },
        listItem: { background: colors.bgCard, borderRadius: '12px', padding: '20px 24px', border: `1px solid ${colors.border}`, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        input: { background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text, padding: '12px 16px', width: '100%', boxSizing:'border-box', outline: 'none' },
        label: { display: 'block', color: colors.textMuted, fontSize: '14px', fontWeight: '600', marginBottom: '8px' },
        primaryBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.1s' },
        secondaryBtn: { background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '12px 24px', fontWeight: '600', cursor: 'pointer' },
        iconBtn: { background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' },
        reportBtn: { background: colors.bgInput, color: colors.text, border: `1px solid ${colors.border}`, padding: '16px 24px', borderRadius: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }
    };

    const renderOverview = () => {
        const revenueData = [
            { name: 'Jan', revenue: 4000 }, { name: 'Feb', revenue: 5200 }, { name: 'Mar', revenue: 6100 },
            { name: 'Apr', revenue: 8400 }, { name: 'May', revenue: 9200 }, { name: 'Jun', revenue: (analytics?.revenueEstimate || 0) }
        ];

        const roleData = [
            { name: 'Students', value: analytics?.totalStudents || 0 },
            { name: 'Instructors', value: analytics?.totalInstructors || 0 },
            { name: 'Admins', value: analytics?.totalAdmins || 0 }
        ];

        const recentUsers = [...users]
            .sort((a, b) => new Date(b.creationTimestamp || 0) - new Date(a.creationTimestamp || 0))
            .slice(0, 5);

        const recentNotifications = [...notifications]
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 4);

        const instructorPerformance = [...users.filter((u) => u.assignedRole === 'Instructor')]
            .map((instructor) => {
                const authoredCourses = allCourses.filter((course) => course.creatorRef?._id === instructor._id || course.creatorRef === instructor._id);
                return {
                    name: instructor.fullName,
                    courseCount: authoredCourses.length,
                    enrollments: authoredCourses.reduce((sum, course) => sum + (course.totalEnrollments || 0), 0),
                    rating: authoredCourses.length ? (authoredCourses.reduce((sum, course) => sum + (course.averageRating || 0), 0) / authoredCourses.length).toFixed(1) : '0.0'
                };
            })
            .sort((a, b) => b.enrollments - a.enrollments)
            .slice(0, 4);

        const activityHighlights = [
            { label: 'Published courses', value: analytics?.activeCourses || 0, color: colors.success },
            { label: 'Pending reviews', value: analytics?.pendingCourses || 0, color: colors.warning },
            { label: 'Monthly enrollments', value: analytics?.monthlyEnrollments || 0, color: colors.primary },
            { label: 'Certificates issued', value: analytics?.certificatesIssued || 0, color: colors.accent }
        ];

        return (
            <div style={s.tabContent}>
                <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>System Overview</h2>
                    <p style={s.sectionSub}>Monitor platform performance, growth, and admin priorities in one place.</p>
                </div>

                <div style={s.statsGrid}>
                    <StatCard label="Total students" value={analytics?.totalStudents || 0} color={colors.primary} icon={<Users size={24} aria-hidden="true" />} />
                    <StatCard label="Total instructors" value={analytics?.totalInstructors || 0} color={colors.accent} icon={<UserCog size={24} aria-hidden="true" />} />
                    <StatCard label="Total visitors" value={analytics?.totalVisitors || 0} color={colors.success} icon={<Users size={24} aria-hidden="true" />} />
                    <StatCard label="Total courses" value={analytics?.totalCourses || allCourses.length} color={colors.warning} icon={<BookOpen size={24} aria-hidden="true" />} />
                    <StatCard label="Published courses" value={analytics?.activeCourses || 0} color={colors.success} icon={<Upload size={24} aria-hidden="true" />} />
                    <StatCard label="Pending courses" value={analytics?.pendingCourses || 0} color={colors.warning} icon={<Clock3 size={24} aria-hidden="true" />} />
                    <StatCard label="Draft courses" value={analytics?.draftCourses || 0} color={colors.primary} icon={<FilePen size={24} aria-hidden="true" />} />
                    <StatCard label="Archived courses" value={analytics?.archivedCourses || 0} color={colors.danger} icon={<Archive size={24} aria-hidden="true" />} />
                    <StatCard label="Active enrollments" value={analytics?.clearedEnrollments || 0} color={colors.success} icon={<GraduationCap size={24} aria-hidden="true" />} />
                    <StatCard label="Completed courses" value={analytics?.completedCourses || 0} color={colors.accent} icon={<Award size={24} aria-hidden="true" />} />
                    <StatCard label="Certificates issued" value={analytics?.certificatesIssued || 0} color={colors.primary} icon={<Award size={24} aria-hidden="true" />} />
                    <StatCard label="Revenue (ETB)" value={analytics?.revenueEstimate || 0} color={colors.warning} icon={<Wallet size={24} aria-hidden="true" />} />
                </div>

                <div style={s.cardGrid}>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Growth and participation</h3>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={colors.success} stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor={colors.success} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                                    <XAxis dataKey="name" stroke={colors.textMuted} axisLine={false} tickLine={false} />
                                    <YAxis stroke={colors.textMuted} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
                                    <Tooltip contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text }} />
                                    <Area type="monotone" dataKey="revenue" stroke={colors.success} strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Platform demographics</h3>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={roleData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                                        <Cell fill={colors.primary} />
                                        <Cell fill={colors.accent} />
                                        <Cell fill={colors.success} />
                                    </Pie>
                                    <Tooltip contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text }} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: colors.text }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div style={{ ...s.cardGrid, marginTop: '24px' }}>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Platform activity</h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {activityHighlights.map((item) => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '12px', background: colors.bgInput }}>
                                    <span style={{ color: colors.textMuted, fontSize: '14px' }}>{item.label}</span>
                                    <span style={{ color: item.color, fontWeight: '800', fontSize: '16px' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '16px', color: colors.textMuted, fontSize: '14px' }}>
                            Student completion rate: <strong style={{ color: colors.text }}>{analytics?.studentCompletionRate || analytics?.completionRate || 0}%</strong>
                        </div>
                    </div>

                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Recent registrations</h3>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {recentUsers.length === 0 ? (
                                <div style={s.emptyState}>No recent registrations yet.</div>
                            ) : recentUsers.map((user) => (
                                <div key={user._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
                                    <div>
                                        <div style={{ color: colors.text, fontWeight: '700' }}>{user.fullName}</div>
                                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>{user.accountEmail}</div>
                                    </div>
                                    <span style={{ ...s.badge, background: `${colors.primary}15`, color: colors.primary }}>{user.assignedRole}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ ...s.cardGrid, marginTop: '24px' }}>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Instructor performance</h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {instructorPerformance.length === 0 ? (
                                <div style={s.emptyState}>No instructor activity recorded yet.</div>
                            ) : instructorPerformance.map((item) => (
                                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '12px', background: colors.bgInput }}>
                                    <div>
                                        <div style={{ color: colors.text, fontWeight: '700' }}>{item.name}</div>
                                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>{item.courseCount} course{item.courseCount === 1 ? '' : 's'} • {item.enrollments} enrollments</div>
                                    </div>
                                    <span style={{ color: colors.accent, fontWeight: '800' }}>{item.rating}/5</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Notifications & quick actions</h3>
                        <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                            {recentNotifications.length === 0 ? (
                                <div style={s.emptyState}>No recent notifications.</div>
                            ) : recentNotifications.map((item) => (
                                <div key={item._id} style={{ padding: '10px 12px', borderRadius: '10px', background: colors.bgInput }}>
                                    <div style={{ color: colors.text, fontWeight: '700', marginBottom: '4px' }}>{item.title}</div>
                                    <div style={{ color: colors.textMuted, fontSize: '13px' }}>{item.message}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            <button onClick={() => setActiveTab('users')} style={{ ...s.primaryBtn, padding: '10px 16px' }}>Manage users</button>
                            <button onClick={() => setActiveTab('courses')} style={{ ...s.secondaryBtn, padding: '10px 16px' }}>Review courses</button>
                            <button onClick={() => setActiveTab('finances')} style={{ ...s.secondaryBtn, padding: '10px 16px' }}>View payments</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderUsers = () => {
        const filteredUsers = users.filter((user) => userFilter === 'All' || user.assignedRole === userFilter);
        const totalUsers = users.length;
        const totalAdmins = users.filter((u) => u.assignedRole === 'Admin').length;
        const totalInstructors = users.filter((u) => u.assignedRole === 'Instructor').length;
        const totalStudents = users.filter((u) => u.assignedRole === 'Student').length;
        const activeUsers = users.filter((u) => u.isActive && !u.isSuspended).length;
        const suspendedUsers = users.filter((u) => !u.isActive || u.isSuspended).length;

        return (
            <div style={s.tabContent}>
                <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>User Management</h2>
                    <p style={s.sectionSub}>Create, review, edit, suspend, activate, and manage students, instructors, and administrators.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <StatCard icon={<Users size={24} aria-hidden="true" />} label="Total Users" value={totalUsers} color={colors.primary} />
                    <StatCard icon={<ShieldCheck size={24} aria-hidden="true" />} label="Total Admins" value={totalAdmins} color={colors.accent} />
                    <StatCard icon={<BookOpen size={24} aria-hidden="true" />} label="Total Instructors" value={totalInstructors} color={colors.info} />
                    <StatCard icon={<GraduationCap size={24} aria-hidden="true" />} label="Total Students" value={`${totalStudents} (Read Only)`} color={colors.textMuted} />
                    <StatCard icon={<CircleCheck size={24} aria-hidden="true" />} label="Active Users" value={activeUsers} color={colors.success} />
                    <StatCard icon={<AlertTriangle size={24} aria-hidden="true" />} label="Suspended Users" value={suspendedUsers} color={colors.danger} />
                </div>

                <div style={{ ...s.card, marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div>
                            <div style={{ color: colors.text, fontWeight: '800', marginBottom: '6px' }}>User Roster</div>
                            <div style={{ color: colors.textMuted, fontSize: '14px' }}>Manage platform access and permissions.</div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={s.select}>
                                <option value="All">All accounts</option>
                                <option value="Student">Students</option>
                                <option value="Instructor">Instructors</option>
                                <option value="Admin">Admins</option>
                            </select>
                            <button onClick={() => setIsCreateModalOpen(true)} style={s.primaryBtn}>Create account</button>
                        </div>
                    </div>
                </div>

                <div style={s.tableContainer}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                <th style={s.th}>Name</th>
                                <th style={s.th}>Email</th>
                                <th style={s.th}>Role</th>
                                <th style={s.th}>Status</th>
                                <th style={s.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((u) => (
                                <tr key={u._id}>
                                    <td style={s.td}>{u.fullName}</td>
                                    <td style={{ ...s.td, color: colors.textMuted }}>{u.accountEmail}</td>
                                    <td style={s.td}>
                                        <span style={{ color: colors.text, fontWeight: '700' }}>{u.assignedRole}</span>
                                    </td>
                                    <td style={s.td}>
                                        <span style={{...s.badge, background: u.isActive ? `${colors.success}15` : `${colors.danger}15`, color: u.isActive ? colors.success : colors.danger}}>
                                            {u.isActive ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td style={s.td}>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => navigate(`/admin/users/${u._id}`)} style={{...s.actionBtn, color: colors.accent}}>
                                                View Profile
                                            </button>
                                            <button onClick={() => handleToggleUserStatus(u)} style={{...s.actionBtn, color: u.isActive ? colors.danger : colors.success}}>
                                                {u.isActive ? 'Suspend' : 'Activate'}
                                            </button>
                                            <button onClick={() => { setSelectedUser(u); setIsPasswordModalOpen(true); }} style={{...s.actionBtn, color: colors.primary}}>
                                                Reset password
                                            </button>
                                            <button onClick={() => handleDeleteUser(u)} style={{...s.actionBtn, color: colors.danger}}>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderSecurity = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Security & Roles</h2>
                <p style={s.sectionSub}>Manage RBAC permissions, audit logs, and system security policies.</p>
            </div>
            <div style={s.cardGrid}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>RBAC Enforcement</h3>
                    <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '16px' }}>
                        All protected API endpoints are guarded by role-based middleware. Only Administrators can manage users, system settings, and platform-wide policies.
                    </p>
                    <ul style={{ paddingLeft: '18px', color: colors.textMuted, fontSize: '14px', lineHeight: 1.7 }}>
                        <li>Create / update / delete user roles</li>
                        <li>Assign permissions to accounts</li>
                        <li>Enforce module, page and action access</li>
                    </ul>
                </div>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Login Restrictions</h3>
                    <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '16px' }}>
                        Suspended or deactivated users cannot perform protected actions. The login flow is secured by JWT tokens stored in HTTP-only cookies.
                    </p>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ ...s.badge, background: `${colors.warning}15`, color: colors.warning }}>Account suspension</div>
                        <div style={{ ...s.badge, background: `${colors.danger}15`, color: colors.danger }}>Deactivated login blocked</div>
                        <div style={{ ...s.badge, background: `${colors.primary}15`, color: colors.primary }}>Session invalidation support</div>
                    </div>
                </div>
            </div>
            <div style={{ ...s.card, marginTop: '24px' }}>
                <h3 style={s.cardTitle}>Permission Matrix</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: colors.text }}>
                    <thead>
                        <tr>
                            <th style={{ ...s.th, textAlign: 'left' }}>Scope</th>
                            <th style={{ ...s.th, textAlign: 'left' }}>Student</th>
                            <th style={{ ...s.th, textAlign: 'left' }}>Instructor</th>
                            <th style={{ ...s.th, textAlign: 'left' }}>Admin</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={s.td}>Page access</td>
                            <td style={s.td}>Student dashboard</td>
                            <td style={s.td}>Instructor dashboard</td>
                            <td style={s.td}>Admin dashboard</td>
                        </tr>
                        <tr>
                            <td style={s.td}>Module access</td>
                            <td style={s.td}>Courses, quizzes</td>
                            <td style={s.td}>Course authoring</td>
                            <td style={s.td}>User & system control</td>
                        </tr>
                        <tr>
                            <td style={s.td}>Action permissions</td>
                            <td style={s.td}>Enroll / review</td>
                            <td style={s.td}>Publish / grade</td>
                            <td style={s.td}>Manage users / settings</td>
                        </tr>
                        <tr>
                            <td style={s.td}>API permissions</td>
                            <td style={s.td}>Student-only endpoints</td>
                            <td style={s.td}>Instructor-only endpoints</td>
                            <td style={s.td}>Admin-only endpoints</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style={{...s.card, marginTop: '24px'}}>
                <h3 style={s.cardTitle}>Audit Logs</h3>
                <div style={{ color: colors.textMuted, fontSize: '14px', lineHeight: 1.8 }}>
                    <div>[2026-07-15 09:12:00] Admin (you) updated system settings.</div>
                    <div>[2026-07-15 08:45:22] Instructor "Abeba" published course "React Basics".</div>
                    <div>[2026-07-15 08:30:11] User "Dawit" failed login attempt (IP: 192.168.1.5).</div>
                </div>
            </div>
        </div>
    );

    const renderAnalytics = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Institutional Analytics Dashboard</h2>
                <p style={s.sectionSub}>Interactive charts and reports for student, instructor, and course performance.</p>
            </div>

            <div style={s.statsGrid}>
                    <StatCard label="Total students" value={analytics?.totalStudents || 0} color={colors.primary} icon={<Users size={24} aria-hidden="true" />} />
                    <StatCard label="Total instructors" value={analytics?.totalInstructors || 0} color={colors.accent} icon={<UserCog size={24} aria-hidden="true" />} />
                    <StatCard label="Total courses" value={analytics?.totalCourses || 0} color={colors.warning} icon={<BookOpen size={24} aria-hidden="true" />} />
                    <StatCard label="Completion rate" value={`${analytics?.completionRate || 0}%`} color={colors.success} icon={<TrendingUp size={24} aria-hidden="true" />} />
                    <StatCard label="Monthly enrollments" value={analytics?.monthlyEnrollments || 0} color={colors.primary} icon={<GraduationCap size={24} aria-hidden="true" />} />
                    <StatCard label="Certificates" value={analytics?.certificatesIssued || 0} color={colors.success} icon={<Award size={24} aria-hidden="true" />} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Enrollment Trends</h3>
                    {analytics?.enrollmentTrend?.length ? (
                        <div style={{ width: '100%', height: '260px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics.enrollmentTrend} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                                    <XAxis dataKey="date" stroke={colors.textMuted} tick={{ fill: colors.textMuted }} />
                                    <YAxis stroke={colors.textMuted} tick={{ fill: colors.textMuted }} />
                                    <Tooltip contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text }} />
                                    <Legend wrapperStyle={{ color: colors.text }} />
                                    <Line type="monotone" dataKey="enrollments" stroke={colors.primary} strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={s.emptyState}>No enrollment trend data available.</div>
                    )}
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Course Popularity</h3>
                    {analytics?.coursePopularity?.length ? (
                        <div style={{ width: '100%', height: '260px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.coursePopularity} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                                    <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                                    <XAxis dataKey="courseTitle" stroke={colors.textMuted} tick={{ fill: colors.textMuted, fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={70} />
                                    <YAxis stroke={colors.textMuted} tick={{ fill: colors.textMuted }} />
                                    <Tooltip contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text }} />
                                    <Bar dataKey="enrollments" fill={colors.accent} radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={s.emptyState}>No course popularity data available.</div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Daily Activity</h3>
                    {analytics?.dailyActivity?.length ? (
                        <div style={{ width: '100%', height: '260px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.dailyActivity} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="dailyActivityGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={colors.accent} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={colors.accent} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                                    <XAxis dataKey="date" stroke={colors.textMuted} tick={{ fill: colors.textMuted }} />
                                    <YAxis stroke={colors.textMuted} tick={{ fill: colors.textMuted }} />
                                    <Tooltip contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text }} />
                                    <Area type="monotone" dataKey="enrollments" stroke={colors.accent} fillOpacity={1} fill="url(#dailyActivityGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={s.emptyState}>No daily activity data available.</div>
                    )}
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Monthly & Yearly Reports</h3>
                    {analytics?.monthlyReports?.length ? (
                        <div style={{ width: '100%', height: '260px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics.monthlyReports} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                                    <XAxis dataKey="month" stroke={colors.textMuted} tick={{ fill: colors.textMuted }} />
                                    <YAxis stroke={colors.textMuted} tick={{ fill: colors.textMuted }} />
                                    <Tooltip contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text }} />
                                    <Legend wrapperStyle={{ color: colors.text }} />
                                    <Line type="monotone" dataKey="enrollments" stroke={colors.primary} strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={s.emptyState}>No monthly report data available.</div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Grade Distribution</h3>
                    {analytics?.gradeDistribution?.length ? (
                        <div style={{ width: '100%', height: '260px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={analytics.gradeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} fill={colors.primary} label={{ fill: colors.text, fontSize: 11 }}>
                                        {analytics.gradeDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={[colors.primary, colors.accent, colors.success, colors.warning, colors.danger][index % 5]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text }} />
                                    <Legend wrapperStyle={{ color: colors.text }} layout="vertical" verticalAlign="middle" align="right" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={s.emptyState}>No grade distribution data available.</div>
                    )}
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Instructor Statistics</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textMuted }}>Active instructors</span>
                            <strong style={{ color: colors.text }}>{analytics?.activeInstructors || 0}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textMuted }}>Published courses</span>
                            <strong style={{ color: colors.text }}>{analytics?.activeCourses || 0}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textMuted }}>Instructor course leaders</span>
                            <strong style={{ color: colors.text }}>{analytics?.instructorCourseCounts?.length || 0}</strong>
                        </div>
                    </div>
                    {analytics?.instructorCourseCounts?.length ? (
                        <div style={{ marginTop: '18px', display: 'grid', gap: '10px' }}>
                            {analytics.instructorCourseCounts.map((inst, idx) => (
                                <div key={idx} style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                    <div style={{ color: colors.text, fontWeight: '700' }}>{inst.instructorName}</div>
                                    <div style={{ color: colors.textMuted, fontSize: '13px' }}>{inst.courseCount} published course(s)</div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>

            <div style={{ display: 'grid', gap: '18px', marginTop: '24px' }}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Top Performers</h3>
                    {analytics?.topPerformers?.length ? (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {analytics.topPerformers.map((student, index) => (
                                <div key={index} style={{ padding: '14px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                    <div style={{ color: colors.text, fontWeight: '700' }}>{student.studentName}</div>
                                    <div style={{ color: colors.textMuted, fontSize: '13px' }}>{student.avgScore}% avg score • {student.totalAttempts} attempts</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={s.emptyState}>No top performer data available.</div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderCourses = () => {
        const drafts = allCourses.filter(c => c.publicationState === 'Draft');
        const pending = allCourses.filter(c => c.publicationState === 'Pending Review');
        const revisionNeeded = allCourses.filter(c => c.publicationState === 'Revision Needed');
        const published = allCourses.filter(c => ['Published', 'Active'].includes(c.publicationState));
        const archived = allCourses.filter(c => c.publicationState === 'Archived');

        return (
            <div style={s.tabContent}>
                <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>Course Management</h2>
                    <p style={s.sectionSub}>Approve pending courses, manage categories, assign instructors, and oversee the full lifecycle.</p>
                </div>

                <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Draft</h3>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>{drafts.length} course(s) still in draft and awaiting author completion.</p>
                    </div>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Pending Review</h3>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>{pending.length} course(s) awaiting admin approval.</p>
                    </div>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Revision Needed</h3>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>{revisionNeeded.length} course(s) requiring instructor updates.</p>
                    </div>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Published</h3>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>{published.length} active courses visible to learners.</p>
                    </div>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Archived</h3>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>{archived.length} archived courses.</p>
                    </div>
                </div>

                {drafts.length > 0 && (
                    <>
                        <h3 style={{ color: colors.text, fontSize: '18px', margin: '0 0 16px' }}>Draft Courses ({drafts.length})</h3>
                        {drafts.map(course => (
                            <div key={course._id} style={s.listItem}>
                                <div style={{ flex: 1 }}>
                                    <span style={{...s.badge, background: `${colors.warning}15`, color: colors.warning, marginBottom: '8px', display: 'inline-block'}}>DRAFT</span>
                                    <h4 style={{ color: colors.text, margin: '0 0 8px', fontSize: '18px' }}>{course.courseTitle}</h4>
                                    <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>Instructor: {course.creatorRef?.fullName} | Category: {course.technicalCategory}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button onClick={() => handleAssignInstructor(course._id)} style={{...s.secondaryBtn, color: colors.primary, borderColor: colors.primary}}>Assign Instructor</button>
                                    <button onClick={() => handleChangeCategory(course._id)} style={{...s.secondaryBtn, color: colors.accent, borderColor: colors.accent}}>Change Category</button>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                <h3 style={{ color: colors.text, fontSize: '18px', marginBottom: '16px' }}>Review Queue ({pending.length})</h3>
                {pending.length === 0 ? (
                    <div style={s.emptyState}>No courses pending review.</div>
                ) : pending.map(course => (
                    <div key={course._id} style={s.listItem}>
                        <div style={{ flex: 1 }}>
                            <span style={{...s.badge, background: `${colors.warning}15`, color: colors.warning, marginBottom: '8px', display: 'inline-block'}}>PENDING REVIEW</span>
                            <h4 style={{ color: colors.text, margin: '0 0 8px', fontSize: '18px' }}>{course.courseTitle}</h4>
                            <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>Instructor: {course.creatorRef?.fullName} | Category: {course.technicalCategory}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleOpenCourseReview(course)} style={{...s.secondaryBtn, color: colors.primary, borderColor: colors.primary}}>Review</button>
                            <button onClick={() => handleApproveCourse(course._id)} style={{...s.primaryBtn, background: colors.success}}>Approve</button>
                            <button onClick={() => handleRequestRevisionWithPrompt(course._id)} style={{...s.secondaryBtn, color: colors.warning, borderColor: colors.warning}}>Request Revision</button>
                            <button onClick={() => handleRejectCourseWithPrompt(course._id)} style={{...s.secondaryBtn, color: colors.danger, borderColor: colors.danger}}>Reject</button>
                        </div>
                    </div>
                ))}

                {revisionNeeded.length > 0 && (
                    <>
                        <h3 style={{ color: colors.text, fontSize: '18px', margin: '40px 0 16px' }}>Revision Needed ({revisionNeeded.length})</h3>
                        {revisionNeeded.map(course => (
                            <div key={course._id} style={s.listItem}>
                                <div style={{ flex: 1 }}>
                                    <span style={{...s.badge, background: `${colors.danger}15`, color: colors.danger, marginBottom: '8px', display: 'inline-block'}}>REVISION NEEDED</span>
                                    <h4 style={{ color: colors.text, margin: '0 0 8px', fontSize: '18px' }}>{course.courseTitle}</h4>
                                    <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>Instructor: {course.creatorRef?.fullName} | Category: {course.technicalCategory}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button onClick={() => handleApproveCourse(course._id)} style={{...s.primaryBtn, background: colors.success}}>Publish</button>
                                    <button onClick={() => handleRejectCourse(course._id)} style={{...s.secondaryBtn, color: colors.danger, borderColor: colors.danger}}>Revert to Draft</button>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                <h3 style={{ color: colors.text, fontSize: '18px', margin: '40px 0 16px' }}>Published Courses ({published.length})</h3>
                <div style={s.tableContainer}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                <th style={s.th}>Title</th>
                                <th style={s.th}>Status</th>
                                <th style={s.th}>Category</th>
                                <th style={s.th}>Instructor</th>
                                <th style={s.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {published.map(c => (
                                <tr key={c._id}>
                                    <td style={s.td}>{c.courseTitle}</td>
                                    <td style={s.td}><span style={{ ...s.badge, background: `${colors.success}15`, color: colors.success }}>{c.publicationState}</span></td>
                                    <td style={s.td}>{c.technicalCategory}</td>
                                    <td style={s.td}>{c.assignedInstructorRef?.fullName || c.creatorRef?.fullName || 'Unassigned'}</td>
                                    <td style={s.td}>
                                        <button onClick={() => handleUnpublishCourse(c._id)} style={{...s.actionBtn, color: colors.warning}}>Unpublish</button>
                                        <button onClick={() => handleArchiveCourse(c._id)} style={{...s.actionBtn, color: colors.danger}}>Archive</button>
                                        <button onClick={() => handleToggleFeatured(c._id, c.isFeatured)} style={{...s.actionBtn, color: colors.primary}}>{c.isFeatured ? 'Unfeature' : 'Feature'}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {archived.length > 0 && (
                    <>
                        <h3 style={{ color: colors.text, fontSize: '18px', margin: '40px 0 16px' }}>Archived Courses ({archived.length})</h3>
                        {archived.map(course => (
                            <div key={course._id} style={s.listItem}>
                                <div style={{ flex: 1 }}>
                                    <span style={{...s.badge, background: `${colors.danger}15`, color: colors.danger, marginBottom: '8px', display: 'inline-block'}}>ARCHIVED</span>
                                    <h4 style={{ color: colors.text, margin: '0 0 8px', fontSize: '18px' }}>{course.courseTitle}</h4>
                                    <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>Category: {course.technicalCategory} | Instructor: {course.assignedInstructorRef?.fullName || course.creatorRef?.fullName}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button onClick={() => handleRestoreCourse(course._id)} style={{...s.primaryBtn, background: colors.success}}>Restore</button>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        );
    };

    const renderContent = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Content & Moderation</h2>
                <p style={s.sectionSub}>Manage videos, files, and moderate user-generated content (reviews, discussions).</p>
            </div>
            <div style={s.cardGrid}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Reported Reviews</h3>
                    <div style={s.emptyState}>No reviews have been flagged for moderation.</div>
                </div>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Discussion Moderation</h3>
                    <div style={s.emptyState}>No spam detected in discussion forums.</div>
                </div>
            </div>
        </div>
    );

    const renderAssessments = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Assessments & Certificates</h2>
                <p style={s.sectionSub}>Oversee quizzes, assignments, and manage certificate templates.</p>
            </div>

            <div style={{ display: 'grid', gap: '24px' }}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Certificate Management</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                        <form onSubmit={handleGenerateCertificate} style={{ display: 'grid', gap: '12px' }}>
                            <label style={s.label}>Student</label>
                            <select value={certificateForm.studentId} onChange={(e) => setCertificateForm({ ...certificateForm, studentId: e.target.value })} style={s.select}>
                                <option value="">Select student</option>
                                {users.filter((u) => u.assignedRole === 'Student').map((user) => (
                                    <option key={user._id} value={user._id}>{user.fullName}</option>
                                ))}
                            </select>
                            <label style={s.label}>Course</label>
                            <select value={certificateForm.courseId} onChange={(e) => setCertificateForm({ ...certificateForm, courseId: e.target.value })} style={s.select}>
                                <option value="">Select course</option>
                                {allCourses.map((course) => (
                                    <option key={course._id} value={course._id}>{course.courseTitle}</option>
                                ))}
                            </select>
                            <label style={s.label}>Template</label>
                            <select value={certificateForm.templateId} onChange={(e) => setCertificateForm({ ...certificateForm, templateId: e.target.value })} style={s.select}>
                                {certificateTemplates.map((template) => (
                                    <option key={template.id} value={template.id}>{template.name}</option>
                                ))}
                            </select>
                            <button type="submit" disabled={isCertificateActionLoading} style={{ ...s.primaryBtn, opacity: isCertificateActionLoading ? 0.7 : 1 }}>
                                {isCertificateActionLoading ? 'Processing…' : 'Generate Certificate'}
                            </button>
                        </form>

                        <form onSubmit={handleVerifyCertificate} style={{ display: 'grid', gap: '12px' }}>
                            <label style={s.label}>Verify Certificate Number</label>
                            <input value={certificateVerificationNumber} onChange={(e) => setCertificateVerificationNumber(e.target.value)} placeholder="EMARE-..." style={s.input} />
                            <button type="submit" disabled={isCertificateActionLoading} style={{ ...s.primaryBtn, opacity: isCertificateActionLoading ? 0.7 : 1 }}>
                                {isCertificateActionLoading ? 'Checking…' : 'Verify Certificate'}
                            </button>
                            {certificateVerificationResult && (
                                <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput, color: colors.text }}>
                                    <div><strong>Student:</strong> {certificateVerificationResult.studentRef?.fullName || 'Unknown'}</div>
                                    <div><strong>Course:</strong> {certificateVerificationResult.courseRef?.courseTitle || 'Unknown'}</div>
                                    <div><strong>Status:</strong> {certificateVerificationResult.status || 'Issued'}</div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                <div style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={s.cardTitle}>Issued Certificates</h3>
                        <span style={{ ...s.badge, background: `${colors.primary}15`, color: colors.primary }}>{certificateRecords.length}</span>
                    </div>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {certificateRecords.map((certificate) => (
                            <div key={certificate._id} style={{ border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '14px', background: colors.bgInput }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ fontWeight: '700', color: colors.text }}>{certificate.studentRef?.fullName || 'Student'}</div>
                                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>{certificate.courseRef?.courseTitle || 'Course'}</div>
                                        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>{certificate.certificateNumber}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ ...s.badge, background: certificate.status === 'Revoked' ? `${colors.danger}15` : certificate.status === 'Reissued' ? `${colors.warning}15` : `${colors.success}15`, color: certificate.status === 'Revoked' ? colors.danger : certificate.status === 'Reissued' ? colors.warning : colors.success }}>{certificate.status || 'Issued'}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                                    <button onClick={() => handleDownloadCertificate(certificate._id)} style={{ ...s.actionBtn, color: colors.primary, borderColor: colors.primary }}>Download</button>
                                    <button onClick={() => handleReissueCertificate(certificate._id)} style={{ ...s.actionBtn, color: colors.warning, borderColor: colors.warning }}>Reissue</button>
                                    <button onClick={() => handleRevokeCertificate(certificate._id)} style={{ ...s.actionBtn, color: colors.danger, borderColor: colors.danger }}>Revoke</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Certificate Templates</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                            {certificateTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() => handleSelectTemplate(template.id)}
                                    style={{
                                        minHeight: '160px',
                                        padding: '20px',
                                        background: activeTemplateId === template.id ? colors.bgCard : colors.bgInput,
                                        border: `2px solid ${activeTemplateId === template.id ? colors.primary : colors.border}`,
                                        borderRadius: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        boxShadow: activeTemplateId === template.id ? '0 14px 30px rgba(56, 189, 248, 0.12)' : 'none'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: '800', fontSize: '16px', color: colors.text }}>{template.name}</div>
                                        <div style={{ marginTop: '10px', color: colors.textMuted, fontSize: '13px', lineHeight: 1.7 }}>{template.description}</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: colors.textMuted, fontSize: '12px' }}>{template.layoutStyle}</span>
                                        {template.id !== 'standard' && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: colors.danger,
                                                    cursor: 'pointer',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div
                                onClick={handleOpenTemplateModal}
                                style={{
                                    minHeight: '160px',
                                    padding: '20px',
                                    background: colors.bgInput,
                                    border: `2px dashed ${colors.border}`,
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: colors.textMuted,
                                    cursor: 'pointer',
                                    fontWeight: '700'
                                }}
                            >
                                + New Template
                            </div>
                        </div>

                        <div style={{ padding: '24px', borderRadius: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                            <div style={{ display: 'grid', gap: '16px' }}>
                                <h4 style={{ margin: 0, fontSize: '18px', color: colors.text }}>Template Preview</h4>
                                <div style={{ width: '100%', minHeight: '280px', borderRadius: '24px', overflow: 'hidden', background: '#f8fbff', boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)' }}>
                                    {(() => {
                                        const selectedTemplate = certificateTemplates.find((t) => t.id === activeTemplateId) || certificateTemplates[0] || { name: 'Standard Template', layoutStyle: 'Classic', signature: 'Registrar', colorScheme: 'Blue' };
                                        const bgColor = selectedTemplate.colorScheme === 'Gold'
                                            ? 'linear-gradient(180deg, #fff7ed 0%, #fffbf0 100%)'
                                            : selectedTemplate.colorScheme === 'Emerald'
                                                ? 'linear-gradient(180deg, #ecfdf5 0%, #f7fdf7 100%)'
                                                : 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)';

                                        return (
                                            <div style={{ padding: '22px', height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr auto', background: bgColor }}>
                                                <div>
                                                    <div style={{ color: '#2563eb', fontWeight: '800', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Emare Learning Institute</div>
                                                    <div style={{ marginTop: '12px', color: '#0f172a', fontSize: '24px', fontWeight: '800' }}>Certificate of Completion</div>
                                                </div>
                                                <div style={{ display: 'grid', gap: '10px', alignContent: 'center' }}>
                                                    <div style={{ color: '#475569', fontSize: '14px', lineHeight: 1.8 }}>This is to certify that</div>
                                                    <div style={{ color: '#0f172a', fontSize: '26px', fontWeight: '900' }}>{selectedTemplate.name}</div>
                                                    <div style={{ color: '#475569', fontSize: '14px', lineHeight: 1.8 }}>has successfully completed the training program and demonstrated competency in the required curriculum.</div>
                                                    <div style={{ marginTop: '18px', padding: '18px', borderRadius: '18px', background: '#ffffff', border: '1px dashed rgba(15, 23, 42, 0.08)' }}>
                                                        <div style={{ color: '#8b95a1', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Certificate Style</div>
                                                        <div style={{ marginTop: '8px', color: '#0f172a', fontWeight: '700' }}>{selectedTemplate.layoutStyle}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ color: '#94a3b8', fontSize: '12px' }}>Issued on</div>
                                                        <div style={{ marginTop: '6px', color: '#0f172a', fontWeight: '700', fontSize: '13px' }}>{new Date().toLocaleDateString()}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>Signature</div>
                                                        <div style={{ borderTop: '1px solid rgba(15, 23, 42, 0.15)', paddingTop: '10px', color: '#0f172a', fontWeight: '700', fontSize: '15px' }}>{selectedTemplate.signature}</div>
                                                        <div style={{ color: '#475569', fontSize: '12px', marginTop: '6px' }}>{selectedTemplate.colorScheme} Scheme</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '18px', color: colors.textMuted, fontSize: '14px' }}>
                        {certificateTemplates.find((t) => t.id === activeTemplateId)?.name ? `Selected template: ${certificateTemplates.find((t) => t.id === activeTemplateId).name}` : 'No template selected.'}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderFinances = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Finances & Revenue</h2>
                <p style={s.sectionSub}>Manage payments, manual clearings, instructor payouts, and refunds.</p>
            </div>
            <div style={s.statsGrid}>
                <StatCard label="Total Revenue" value={`ETB ${(analytics?.clearedEnrollments || 0) * 1500}`} color={colors.success} icon={<Wallet size={24} aria-hidden="true" />} />
                <StatCard label="Pending Payouts" value="ETB 0" color={colors.warning} icon={<Clock3 size={24} aria-hidden="true" />} />
                <StatCard label="Refunds Processed" value="0" color={colors.danger} icon={<RotateCcw size={24} aria-hidden="true" />} />
            </div>
            <div style={s.card}>
                <h3 style={s.cardTitle}>Recent Transactions</h3>
                <div style={s.tableContainer}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                <th style={s.th}>Student</th>
                                <th style={s.th}>Course</th>
                                <th style={s.th}>Amount</th>
                                <th style={s.th}>Status</th>
                                <th style={s.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrollments.slice(0,5).map(e => (
                                <tr key={e._id}>
                                    <td style={s.td}>{e.studentRef?.fullName}</td>
                                    <td style={s.td}>{e.courseRef?.courseTitle}</td>
                                    <td style={s.td}>ETB {e.courseRef?.price}</td>
                                    <td style={s.td}>
                                        <span style={{...s.badge, background: e.paymentStatus === 'Cleared' ? `${colors.success}15` : e.paymentStatus === 'Pending Verification' ? `${colors.warning}15` : `${colors.danger}15`, color: e.paymentStatus === 'Cleared' ? colors.success : e.paymentStatus === 'Pending Verification' ? colors.warning : colors.danger}}>
                                            {e.paymentStatus}
                                        </span>
                                    </td>
                                    <td style={s.td}>
                                        {e.paymentStatus === 'Pending Verification' ? (
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <button onClick={() => handleApprovePayment(e._id)} style={{ ...s.actionBtn, color: colors.success, borderColor: colors.success }}>
                                                    Approve
                                                </button>
                                                <button onClick={() => handleRejectPayment(e._id)} style={{ ...s.actionBtn, color: colors.danger, borderColor: colors.danger }}>
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ color: colors.textMuted, fontSize: '13px' }}>No action</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderCMS = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>CMS & Communications</h2>
                <p style={s.sectionSub}>Manage homepage content, about page, FAQ, contact info, policies, banners, testimonials, news, and blogs.</p>
            </div>
            <div style={{ display: 'grid', gap: '24px' }}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Notification Management</h3>
                    <form onSubmit={handleSendNotification} style={{ display: 'grid', gap: '12px' }}>
                        <label style={s.label}>Audience</label>
                        <select value={notificationForm.audience} onChange={(e) => setNotificationForm({ ...notificationForm, audience: e.target.value })} style={s.select}>
                            <option value="all">All Users</option>
                            <option value="students">Students</option>
                            <option value="instructors">Instructors</option>
                        </select>
                        <label style={s.label}>Title</label>
                        <input value={notificationForm.title} onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })} placeholder="Enter a notification title" style={s.input} />
                        <label style={s.label}>Message</label>
                        <textarea value={notificationForm.message} onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })} placeholder="Write the announcement or reminder" rows="4" style={s.input}></textarea>
                        <label style={s.label}>Type</label>
                        <select value={notificationForm.type} onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })} style={s.select}>
                            <option value="announcement">Announcement</option>
                            <option value="system">System</option>
                            <option value="assignment">Assignment</option>
                            <option value="certificate">Certificate</option>
                        </select>
                        <label style={s.label}>Link (optional)</label>
                        <input value={notificationForm.link} onChange={(e) => setNotificationForm({ ...notificationForm, link: e.target.value })} placeholder="/student/courses" style={s.input} />
                        <label style={s.label}>Schedule for later</label>
                        <input type="datetime-local" value={notificationForm.scheduleAt} onChange={(e) => setNotificationForm({ ...notificationForm, scheduleAt: e.target.value })} style={s.input} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.textMuted, cursor: 'pointer' }}>
                            <input type="checkbox" checked={notificationForm.reminder} onChange={(e) => setNotificationForm({ ...notificationForm, reminder: e.target.checked })} />
                            Mark as reminder message
                        </label>
                        <button type="submit" disabled={isNotificationSubmitting} style={{ ...s.primaryBtn, opacity: isNotificationSubmitting ? 0.7 : 1 }}>
                            {isNotificationSubmitting ? 'Sending…' : 'Send Notification'}
                        </button>
                    </form>
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Broadcast Overview</h3>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput }}>
                            <strong>Total Notifications:</strong> {notificationSummary.total}
                        </div>
                        <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput }}>
                            <strong>Unread:</strong> {notificationSummary.unread}
                        </div>
                        <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput }}>
                            <strong>Recent:</strong> {notificationSummary.recent?.length ? notificationSummary.recent.map((item) => item.title).join(', ') : 'No recent broadcasts.'}
                        </div>
                    </div>
                    <button style={{...s.secondaryBtn, marginTop: '12px'}} onClick={fetchNotificationSummary}>Refresh Summary</button>
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Content Management</h3>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <select value={selectedContentPage} onChange={(e) => handleContentPageChange(e.target.value)} style={s.select}>
                            <option value="home">Homepage Content</option>
                            <option value="about">About Page</option>
                            <option value="faq">FAQ</option>
                            <option value="contact">Contact Page</option>
                            <option value="privacy">Privacy Policy</option>
                            <option value="terms">Terms and Conditions</option>
                            <option value="banners">Banner Management</option>
                            <option value="testimonials">Testimonials</option>
                            <option value="news">News</option>
                            <option value="blogs">Blogs</option>
                        </select>
                        <form onSubmit={handleSaveContent} style={{ display: 'grid', gap: '12px' }}>
                            <label style={s.label}>Page Title</label>
                            <input value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} style={s.input} />
                            <label style={s.label}>Content JSON / Text</label>
                            <textarea value={contentForm.content} onChange={(e) => setContentForm({ ...contentForm, content: e.target.value })} rows="10" style={{ ...s.input, minHeight: '220px', fontFamily: 'monospace' }} />
                            <button type="submit" disabled={isContentSaving} style={{ ...s.primaryBtn, opacity: isContentSaving ? 0.7 : 1 }}>
                                {isContentSaving ? 'Saving…' : 'Save Content'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderReports = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Reports & Exports</h2>
                <p style={s.sectionSub}>Generate and export institutional performance reports for students, instructors, courses, quizzes, assignments, enrollments, completions, performance, attendance, and system metrics in PDF, Excel, or CSV format.</p>
            </div>
            <div style={{ display: 'grid', gap: '16px', maxWidth: '760px' }}>
                <div style={{ ...s.card, padding: '20px' }}>
                    <h3 style={s.cardTitle}>Institutional Report Export</h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select value={selectedReportType} onChange={(e) => setSelectedReportType(e.target.value)} style={s.select}>
                            {reportOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <select value={selectedReportFormat} onChange={(e) => setSelectedReportFormat(e.target.value)} style={s.select}>
                            {formatOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <button onClick={handleExportReport} disabled={isExportingReport} style={{ ...s.primaryBtn, opacity: isExportingReport ? 0.7 : 1 }}>
                            {isExportingReport ? 'Exporting…' : 'Export Report'}
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {reportOptions.map((option) => (
                        <span key={option.value} style={{ ...s.badge, background: selectedReportType === option.value ? `${colors.primary}20` : `${colors.textMuted}10`, color: selectedReportType === option.value ? colors.primary : colors.textMuted, border: `1px solid ${selectedReportType === option.value ? colors.primary : colors.border}` }}>
                            {option.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderAuditLogs = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Audit Logs</h2>
                <p style={s.sectionSub}>Review user activity, login events, course approvals, enrollment actions, system events, errors, and admin operations.</p>
            </div>

            <div style={s.card}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <select value={auditFilter} onChange={(e) => handleAuditFilterChange(e.target.value)} style={s.select}>
                        <option value="all">All Logs</option>
                        <option value="login">Login Logs</option>
                        <option value="user">User Activity</option>
                        <option value="course">Course Approval Logs</option>
                        <option value="enrollment">Enrollment Logs</option>
                        <option value="system">System Logs</option>
                        <option value="error">Error Logs</option>
                        <option value="admin">Admin Action Logs</option>
                    </select>
                    <input value={auditSearch} onChange={handleAuditSearch} placeholder="Search audit logs" style={s.input} />
                </div>

                {isAuditLoading ? (
                    <div style={{ color: colors.textMuted }}>Loading audit entries...</div>
                ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {auditLogs.length ? auditLogs.map((log) => (
                            <div key={log._id} style={{ padding: '14px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                    <strong>{log.action}</strong>
                                    <span style={{ color: colors.textMuted, fontSize: '13px' }}>{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                                <div style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '6px' }}>{log.description || 'No description provided.'}</div>
                                <div style={{ fontSize: '13px', color: colors.textMuted }}>
                                    User: {log.userRef?.fullName || 'System'} · Role: {log.userRef?.assignedRole || 'N/A'} · IP: {log.ipAddress || 'N/A'}
                                </div>
                            </div>
                        )) : <div style={{ color: colors.textMuted }}>No audit logs found for the selected filter.</div>}
                    </div>
                )}
            </div>
        </div>
    );

    const renderCalendar = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Calendar Management</h2>
                <p style={s.sectionSub}>Plan academic dates, exams, assignments, holidays, training sessions, and events from one administrative calendar.</p>
            </div>

            <div style={{ display: 'grid', gap: '24px' }}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>{calendarEditingId ? 'Edit Event' : 'Create Event'}</h3>
                    <form onSubmit={handleSaveCalendarEvent} style={{ display: 'grid', gap: '12px' }}>
                        <input value={calendarForm.title} onChange={(e) => setCalendarForm({ ...calendarForm, title: e.target.value })} placeholder="Event title" style={s.input} required />
                        <select value={calendarForm.category} onChange={(e) => setCalendarForm({ ...calendarForm, category: e.target.value })} style={s.select}>
                            <option value="academic">Academic</option>
                            <option value="exam">Exam</option>
                            <option value="assignment">Assignment</option>
                            <option value="holiday">Holiday</option>
                            <option value="training">Training</option>
                            <option value="event">Event</option>
                        </select>
                        <textarea value={calendarForm.description} onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })} placeholder="Description" rows="3" style={s.input}></textarea>
                        <input type="datetime-local" value={calendarForm.startDate} onChange={(e) => setCalendarForm({ ...calendarForm, startDate: e.target.value })} style={s.input} required />
                        <input type="datetime-local" value={calendarForm.endDate} onChange={(e) => setCalendarForm({ ...calendarForm, endDate: e.target.value })} style={s.input} />
                        <input value={calendarForm.location} onChange={(e) => setCalendarForm({ ...calendarForm, location: e.target.value })} placeholder="Location" style={s.input} />
                        <input type="color" value={calendarForm.color} onChange={(e) => setCalendarForm({ ...calendarForm, color: e.target.value })} style={{ width: '100%', height: '44px', border: 'none', background: 'transparent', cursor: 'pointer' }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.textMuted, cursor: 'pointer' }}>
                            <input type="checkbox" checked={calendarForm.isAllDay} onChange={(e) => setCalendarForm({ ...calendarForm, isAllDay: e.target.checked })} />
                            All day event
                        </label>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <button type="submit" disabled={isCalendarSaving} style={{ ...s.primaryBtn, opacity: isCalendarSaving ? 0.7 : 1 }}>
                                {isCalendarSaving ? 'Saving...' : calendarEditingId ? 'Update Event' : 'Create Event'}
                            </button>
                            <button type="button" onClick={resetCalendarForm} style={s.secondaryBtn}>Clear</button>
                        </div>
                    </form>
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Upcoming Events</h3>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {calendarEvents.length ? calendarEvents.map((event) => (
                            <div key={event._id} style={{ padding: '14px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                    <strong>{event.title}</strong>
                                    <span style={{ color: colors.primary, fontSize: '13px', textTransform: 'capitalize' }}>{event.category}</span>
                                </div>
                                <div style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '6px' }}>{event.description || 'No description provided.'}</div>
                                <div style={{ fontSize: '13px', color: colors.textMuted }}>
                                    {new Date(event.startDate).toLocaleString()} {event.endDate ? `→ ${new Date(event.endDate).toLocaleString()}` : ''}
                                    {event.location ? ` · ${event.location}` : ''}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <button type="button" onClick={() => handleEditCalendarEvent(event)} style={s.secondaryBtn}>Edit</button>
                                    <button type="button" onClick={() => handleDeleteCalendarEvent(event._id)} style={{ ...s.secondaryBtn, borderColor: colors.danger, color: colors.danger }}>Delete</button>
                                </div>
                            </div>
                        )) : <div style={{ color: colors.textMuted }}>No calendar events created yet.</div>}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSystem = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>System Settings</h2>
                <p style={s.sectionSub}>Manage branding, localization, email delivery, upload limits, video settings, storage, and backups.</p>
            </div>

            <form onSubmit={handleUpdateSettings} style={s.cardGrid}>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Branding & Localization</h3>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Site Name</label>
                        <input type="text" value={settings.websiteName || ''} onChange={e => setSettings({ ...settings, websiteName: e.target.value })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Theme</label>
                        <select value={settings.theme || 'light'} onChange={e => setSettings({ ...settings, theme: e.target.value })} style={s.select}>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System Default</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Time Zone</label>
                        <select value={settings.timezone || 'Africa/Addis_Ababa'} onChange={e => setSettings({ ...settings, timezone: e.target.value })} style={s.select}>
                            <option value="Africa/Addis_Ababa">Africa/Addis_Ababa</option>
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">America/New_York</option>
                            <option value="Europe/London">Europe/London</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Language</label>
                        <select value={settings.language || 'en'} onChange={e => setSettings({ ...settings, language: e.target.value })} style={s.select}>
                            <option value="en">English</option>
                            <option value="am">Amharic</option>
                            <option value="om">Oromo</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Site Logo</label>
                        <input type="file" accept="image/*" onChange={(e) => handleAssetUpload('siteLogo', e.target.files?.[0])} style={s.input} />
                        {settings.siteLogo ? <img src={settings.siteLogo} alt="site logo" style={{ width: '96px', marginTop: '8px', borderRadius: '10px', objectFit: 'contain' }} /> : null}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Favicon</label>
                        <input type="file" accept="image/*" onChange={(e) => handleAssetUpload('favicon', e.target.files?.[0])} style={s.input} />
                        {settings.favicon ? <img src={settings.favicon} alt="favicon" style={{ width: '48px', marginTop: '8px', borderRadius: '8px', objectFit: 'contain' }} /> : null}
                    </div>
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Email & Contact</h3>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Contact Email</label>
                        <input type="email" value={settings.contactEmail || ''} onChange={e => setSettings({ ...settings, contactEmail: e.target.value })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Email From Name</label>
                        <input type="text" value={settings.emailFromName || ''} onChange={e => setSettings({ ...settings, emailFromName: e.target.value })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Email From Address</label>
                        <input type="email" value={settings.emailFromAddress || ''} onChange={e => setSettings({ ...settings, emailFromAddress: e.target.value })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>SMTP Host</label>
                        <input type="text" value={settings.smtpHost || ''} onChange={e => setSettings({ ...settings, smtpHost: e.target.value })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>SMTP Port</label>
                        <input type="number" value={settings.smtpPort || 587} onChange={e => setSettings({ ...settings, smtpPort: Number(e.target.value) })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>SMTP Username</label>
                        <input type="text" value={settings.smtpUsername || ''} onChange={e => setSettings({ ...settings, smtpUsername: e.target.value })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>SMTP Password</label>
                        <input type="password" value={settings.smtpPassword || ''} onChange={e => setSettings({ ...settings, smtpPassword: e.target.value })} style={s.input} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.textMuted, cursor: 'pointer' }}>
                        <input type="checkbox" checked={Boolean(settings.smtpSecure)} onChange={e => setSettings({ ...settings, smtpSecure: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                        Use Secure SMTP
                    </label>
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Upload & Video Limits</h3>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Max File Upload Size (MB)</label>
                        <input type="number" value={settings.maxUploadSizeMB || 25} onChange={e => setSettings({ ...settings, maxUploadSizeMB: Number(e.target.value) })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Allowed Upload Types</label>
                        <input type="text" value={settings.allowedUploadTypes || ''} onChange={e => setSettings({ ...settings, allowedUploadTypes: e.target.value })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Max Video Size (MB)</label>
                        <input type="number" value={settings.maxVideoSizeMB || 500} onChange={e => setSettings({ ...settings, maxVideoSizeMB: Number(e.target.value) })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Video Format</label>
                        <select value={settings.videoFormat || 'mp4'} onChange={e => setSettings({ ...settings, videoFormat: e.target.value })} style={s.select}>
                            <option value="mp4">MP4</option>
                            <option value="webm">WebM</option>
                            <option value="mov">MOV</option>
                        </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.textMuted, cursor: 'pointer' }}>
                        <input type="checkbox" checked={Boolean(settings.videoTranscodingEnabled)} onChange={e => setSettings({ ...settings, videoTranscodingEnabled: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                        Enable Video Transcoding
                    </label>
                </div>

                <div style={s.card}>
                    <h3 style={s.cardTitle}>Storage & Backup</h3>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Storage Provider</label>
                        <select value={settings.storageProvider || 'cloudinary'} onChange={e => setSettings({ ...settings, storageProvider: e.target.value })} style={s.select}>
                            <option value="cloudinary">Cloudinary</option>
                            <option value="local">Local Disk</option>
                            <option value="s3">S3 Compatible</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Storage Bucket / Folder</label>
                        <input type="text" value={settings.storageBucket || ''} onChange={e => setSettings({ ...settings, storageBucket: e.target.value })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Currency</label>
                        <select value={settings.currency || 'ETB'} onChange={e => setSettings({ ...settings, currency: e.target.value })} style={s.select}>
                            <option value="ETB">ETB (Ethiopian Birr)</option>
                            <option value="USD">USD (US Dollar)</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Backup Frequency</label>
                        <select value={settings.backupFrequency || 'daily'} onChange={e => setSettings({ ...settings, backupFrequency: e.target.value })} style={s.select}>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Backup Retention (Days)</label>
                        <input type="number" value={settings.backupRetentionDays || 30} onChange={e => setSettings({ ...settings, backupRetentionDays: Number(e.target.value) })} style={s.input} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={s.label}>Backup Location</label>
                        <input type="text" value={settings.backupLocation || ''} onChange={e => setSettings({ ...settings, backupLocation: e.target.value })} style={s.input} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: colors.textMuted, cursor: 'pointer' }}>
                        <input type="checkbox" checked={Boolean(settings.backupEnabled)} onChange={e => setSettings({ ...settings, backupEnabled: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                        Enable Automatic Backups
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: colors.textMuted, cursor: 'pointer' }}>
                        <input type="checkbox" checked={Boolean(settings.maintenanceMode)} onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                        Enable Maintenance Mode
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: colors.textMuted, cursor: 'pointer' }}>
                        <input type="checkbox" checked={Boolean(settings.allowRegistration)} onChange={e => setSettings({ ...settings, allowRegistration: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                        Allow New User Registration
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.textMuted, cursor: 'pointer' }}>
                        <input type="checkbox" checked={Boolean(settings.requireEmailVerification)} onChange={e => setSettings({ ...settings, requireEmailVerification: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                        Require Email Verification
                    </label>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'grid', gap: '16px' }}>
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Database Management</h3>
                        <p style={{ ...s.sectionSub, marginBottom: '16px' }}>Back up, restore, optimize, and monitor your MongoDB collections and storage usage.</p>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                            <button type="button" onClick={handleBackup} disabled={dbActionLoading.backup} style={{ ...s.secondaryBtn, borderColor: colors.success, color: colors.success, opacity: dbActionLoading.backup ? 0.7 : 1 }}>
                                {dbActionLoading.backup ? 'Backing Up...' : 'Backup Database'}
                            </button>
                            <button type="button" onClick={handleRestoreDatabase} disabled={dbActionLoading.restore} style={{ ...s.secondaryBtn, borderColor: colors.primary, color: colors.primary, opacity: dbActionLoading.restore ? 0.7 : 1 }}>
                                {dbActionLoading.restore ? 'Restoring...' : 'Restore Database'}
                            </button>
                            <button type="button" onClick={handleOptimizeDatabase} disabled={dbActionLoading.optimize} style={{ ...s.secondaryBtn, borderColor: colors.warning, color: colors.warning, opacity: dbActionLoading.optimize ? 0.7 : 1 }}>
                                {dbActionLoading.optimize ? 'Optimizing...' : 'Optimize Database'}
                            </button>
                        </div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput }}>
                                <strong>Database:</strong> {dbMetrics.databaseName}
                            </div>
                            <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput }}>
                                <strong>Storage:</strong> {formatBytes(dbMetrics.storageSizeBytes)} · <strong>Objects:</strong> {dbMetrics.objects}
                            </div>
                            <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput }}>
                                <strong>Collections:</strong>
                                <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                                    {dbMetrics.collections.slice(0, 8).map((collection) => (
                                        <div key={collection.name} style={{ color: colors.textMuted, fontSize: '14px' }}>
                                            • {collection.name} — {collection.documentCount} docs · {formatBytes(collection.storageSizeBytes)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <button type="submit" style={s.primaryBtn}>{isUploadingAsset ? 'Uploading...' : 'Save Configuration'}</button>
                        <button type="button" onClick={handleClearCache} style={{...s.secondaryBtn, borderColor: colors.danger, color: colors.danger}}>Clear System Cache</button>
                    </div>
                </div>
            </form>
        </div>
    );

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

    return (
        <div style={s.page}>
            <Sidebar navItems={sidebarItems} activeTab={activeTab} onTabChange={(tab) => { if (tab === 'audit') { navigate('/admin/audit-logs'); } else { setActiveTab(tab); } }} />
            
            <main style={s.main}>
                <header style={s.header}>
                    <h1 style={s.greeting}>Admin Portal</h1>
                </header>

                {notificationMsg && (
                    <div style={s.notification}>
                        {notificationMsg}
                    </div>
                )}

                {loading ? (
                    <div style={{padding:'40px', color:colors.textMuted}}>Loading system data...</div>
                ) : (
                    <>
                                {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'users' && renderUsers()}
                        {activeTab === 'security' && renderSecurity()}
                        {activeTab === 'courses' && renderCourses()}
                        {activeTab === 'analytics' && renderAnalytics()}
                        {activeTab === 'content' && renderContent()}
                        {activeTab === 'assessments' && renderAssessments()}
                        {activeTab === 'finances' && renderFinances()}
                        {activeTab === 'cms' && renderCMS()}
                        {activeTab === 'reports' && renderReports()}
                        {activeTab === 'audit' && renderAuditLogs()}
                        {activeTab === 'calendar' && renderCalendar()}
                        {activeTab === 'system' && renderSystem()}
                    </>
                )}
            </main>

            <Modal isOpen={isReviewModalOpen} onClose={handleCloseReviewModal} title="Review Course">
                {isLoadingReviewDetails ? (
                    <div style={{ padding: '24px', color: colors.textMuted }}>Loading course review details...</div>
                ) : selectedCourseForReview ? (
                    <div style={{ display: 'grid', gap: '18px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 8px', color: colors.text }}>{selectedCourseForReview.courseTitle}</h3>
                            <p style={{ color: colors.textMuted, margin: 0 }}>{selectedCourseForReview.courseShortDescription || selectedCourseForReview.courseDescription}</p>
                            <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ ...s.badge, background: `${colors.warning}15`, color: colors.warning }}>{selectedCourseForReview.publicationState}</span>
                                <span style={{ ...s.badge, background: `${colors.primary}15`, color: colors.primary }}>{selectedCourseForReview.technicalCategory}</span>
                                <span style={{ ...s.badge, background: `${colors.accent}15`, color: colors.accent }}>{selectedCourseForReview.creatorRef?.fullName || selectedCourseForReview.assignedInstructorRef?.fullName || 'Unknown Instructor'}</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            {selectedCourseForReview.previewVideoUrl ? (
                                <div>
                                    <div style={{ marginBottom: '8px', color: colors.text, fontWeight: '700' }}>Preview video</div>
                                    <video src={selectedCourseForReview.previewVideoUrl} controls style={{ width: '100%', borderRadius: '12px', background: '#000' }} />
                                </div>
                            ) : (
                                <div style={s.emptyState}>No preview video provided for this course.</div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 8px', color: colors.text }}>Course description</h4>
                                <p style={{ color: colors.textMuted, lineHeight: 1.7 }}>{selectedCourseForReview.courseDescription || 'No description available.'}</p>
                            </div>

                            <div>
                                <h4 style={{ margin: '0 0 8px', color: colors.text }}>Curriculum overview</h4>
                                {selectedCourseForReview.curriculumTree?.length ? (
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        {selectedCourseForReview.curriculumTree.map((section, idx) => (
                                            <div key={idx} style={{ padding: '14px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                                <div style={{ fontWeight: '700', color: colors.text, marginBottom: '8px' }}>{section.sectionTitle || `Section ${idx + 1}`}</div>
                                                <div style={{ color: colors.textMuted, fontSize: '14px' }}>
                                                    {section.lessons?.map((lesson, lessonIdx) => (
                                                        <div key={lessonIdx} style={{ marginBottom: '6px' }}>
                                                            • {lesson.lessonTitle || 'Untitled lesson'} ({lesson.durationMinutes || '---'} min)
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={s.emptyState}>No curriculum details published.</div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gap: '10px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 8px', color: colors.text }}>Quizzes</h4>
                                    {reviewQuizzes.length ? (
                                        reviewQuizzes.map((quiz) => (
                                            <div key={quiz._id} style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, marginBottom: '8px' }}>
                                                <strong style={{ color: colors.text }}>{quiz.title}</strong>
                                                <div style={{ color: colors.textMuted, fontSize: '13px' }}>{quiz.questionCount || quiz.questions?.length || 'Unknown'} questions</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={s.emptyState}>No quizzes attached to this course.</div>
                                    )}
                                </div>

                                <div>
                                    <h4 style={{ margin: '0 0 8px', color: colors.text }}>Assignments</h4>
                                    {reviewAssignments.length ? (
                                        reviewAssignments.map((assignment) => (
                                            <div key={assignment._id} style={{ padding: '12px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, marginBottom: '8px' }}>
                                                <strong style={{ color: colors.text }}>{assignment.title}</strong>
                                                <div style={{ color: colors.textMuted, fontSize: '13px' }}>Due in {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={s.emptyState}>No assignments attached to this course.</div>
                                    )}
                                </div>

                                <div>
                                    <h4 style={{ margin: '0 0 8px', color: colors.text }}>Resources</h4>
                                    {selectedCourseForReview.resources?.length ? (
                                        <ul style={{ margin: 0, paddingLeft: '18px', color: colors.textMuted }}>
                                            {selectedCourseForReview.resources.map((resource, idx) => (
                                                <li key={idx}>{resource.name || resource.title || 'Resource item'}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div style={s.emptyState}>No course resources listed.</div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Send feedback / request changes</label>
                                    <textarea value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} placeholder="Enter guidance or revision instructions" style={{ ...s.input, minHeight: '100px' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={() => handleSendCourseFeedback(selectedCourseForReview._id, reviewFeedback)} style={{ ...s.primaryBtn }}>Send Feedback</button>
                                    <button type="button" onClick={() => handleRequestRevision(selectedCourseForReview._id, reviewFeedback || 'Please revise the course content.')} style={{ ...s.secondaryBtn, borderColor: colors.warning, color: colors.warning }}>Request Revision</button>
                                    <button type="button" onClick={() => handleApproveCourse(selectedCourseForReview._id)} style={{ ...s.secondaryBtn, borderColor: colors.success, color: colors.success }}>Approve</button>
                                    <button type="button" onClick={() => handleRejectCourse(selectedCourseForReview._id, reviewFeedback || 'Course does not meet quality standards.')} style={{ ...s.secondaryBtn, borderColor: colors.danger, color: colors.danger }}>Reject</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '24px', color: colors.textMuted }}>No course selected for review.</div>
                )}
            </Modal>

            <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setCreateFormStep(1); }} title={`Create New ${createForm.assignedRole} Account`} maxWidth="720px">
                <form onSubmit={handleCreateUser} style={{display:'flex', flexDirection:'column', gap:'0'}}>
                    {/* Step indicators */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                        {[1, 2, 3].map(step => (
                            <div key={step} style={{ flex: 1, height: '4px', borderRadius: '2px', background: createFormStep >= step ? colors.primary : colors.bgInput, transition: 'background 0.3s' }} />
                        ))}
                    </div>
                    <p style={{ ...s.sectionSub, marginBottom: '16px', fontSize: '12px' }}>Step {createFormStep} of 3 — {createFormStep === 1 ? 'Personal & Account Info' : createFormStep === 2 ? (createForm.assignedRole === 'Instructor' ? 'Professional Info' : 'Employment & Security') : 'Documents & Settings'}</p>

                    {/* ─── STEP 1: Personal & Account ─── */}
                    {createFormStep === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={s.label}>Role *</label>
                                <select value={createForm.assignedRole} onChange={(e) => setCreateForm({ ...createForm, assignedRole: e.target.value })} style={s.select}>
                                    <option value="Instructor">Instructor</option>
                                    <option value="Admin">Administrator</option>
                                </select>
                                <p style={{...s.sectionSub, marginTop: '4px', fontSize: '11px'}}>Students can only be created via public Sign Up.</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Full Name *</label>
                                    <input type="text" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} placeholder="Enter full name" style={s.input} required />
                                </div>
                                <div>
                                    <label style={s.label}>Username *</label>
                                    <input type="text" value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} placeholder="Enter username" style={s.input} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Email Address *</label>
                                    <input type="email" value={createForm.accountEmail} onChange={(e) => setCreateForm({ ...createForm, accountEmail: e.target.value })} placeholder="Enter email" style={s.input} required />
                                </div>
                                <div>
                                    <label style={s.label}>Phone Number *</label>
                                    <input type="tel" value={createForm.contactPhone} onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })} placeholder="Enter phone number" style={s.input} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Gender *</label>
                                    <select value={createForm.gender} onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })} style={s.select} required>
                                        <option value="">Select gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Non-binary">Non-binary</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={s.label}>Date of Birth {createForm.assignedRole === 'Instructor' ? '(Optional)' : ''}</label>
                                    <input type="date" value={createForm.dateOfBirth} onChange={(e) => setCreateForm({ ...createForm, dateOfBirth: e.target.value })} style={s.input} />
                                </div>
                            </div>
                            <div>
                                <label style={s.label}>Profile Picture (Optional)</label>
                                <input type="file" accept="image/*" onChange={(e) => handleCreateFileUpload('avatarUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.avatarUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}>✓ Uploaded</p>}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Password *</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showCreatePassword ? 'text' : 'password'} value={createForm.securedPassword} onChange={(e) => setCreateForm({ ...createForm, securedPassword: e.target.value })} placeholder="Min 8 characters" style={{ ...s.input, paddingRight: '44px' }} required minLength={8} />
                                        <button type="button" onClick={() => setShowCreatePassword(!showCreatePassword)} style={{ ...s.iconBtn, position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>{showCreatePassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                                    </div>
                                </div>
                                <div>
                                    <label style={s.label}>Confirm Password *</label>
                                    <input type="password" value={createForm.confirmPassword} onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })} placeholder="Re-enter password" style={s.input} required minLength={8} />
                                    {createForm.confirmPassword && createForm.securedPassword !== createForm.confirmPassword && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>Passwords do not match</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── STEP 2: Professional / Employment ─── */}
                    {createFormStep === 2 && createForm.assignedRole === 'Instructor' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}>📋 Professional Information</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Highest Qualification *</label>
                                    <input type="text" value={createForm.specialization} onChange={(e) => setCreateForm({ ...createForm, specialization: e.target.value })} placeholder="e.g. MSc Computer Science" style={s.input} required />
                                </div>
                                <div>
                                    <label style={s.label}>Specialization / Expertise *</label>
                                    <input type="text" value={createForm.skills} onChange={(e) => setCreateForm({ ...createForm, skills: e.target.value })} placeholder="e.g. Web Development, AI" style={s.input} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Years of Teaching Experience *</label>
                                    <input type="number" min="0" value={createForm.yearsOfExperience} onChange={(e) => setCreateForm({ ...createForm, yearsOfExperience: e.target.value })} placeholder="0" style={s.input} required />
                                </div>
                                <div>
                                    <label style={s.label}>Department / Training Category *</label>
                                    <input type="text" value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} placeholder="e.g. Software Engineering" style={s.input} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Employment Type</label>
                                    <select value={createForm.employmentType} onChange={(e) => setCreateForm({ ...createForm, employmentType: e.target.value })} style={s.select}>
                                        <option value="">Select type</option>
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Guest Instructor">Guest Instructor</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={s.label}>Joining Date</label>
                                    <input type="date" value={createForm.joiningDate} onChange={(e) => setCreateForm({ ...createForm, joiningDate: e.target.value })} style={s.input} />
                                </div>
                            </div>
                            <div>
                                <label style={s.label}>Short Biography (Optional)</label>
                                <textarea value={createForm.biography} onChange={(e) => setCreateForm({ ...createForm, biography: e.target.value })} placeholder="Brief biography about the instructor..." rows="3" style={{ ...s.input, resize: 'vertical' }} />
                            </div>
                        </div>
                    )}

                    {createFormStep === 2 && createForm.assignedRole === 'Admin' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}>🏢 Employment Information</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Position / Job Title *</label>
                                    <input type="text" value={createForm.positionJobTitle} onChange={(e) => setCreateForm({ ...createForm, positionJobTitle: e.target.value })} placeholder="e.g. System Administrator" style={s.input} required />
                                </div>
                                <div>
                                    <label style={s.label}>Department *</label>
                                    <input type="text" value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} placeholder="e.g. IT Department" style={s.input} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Employment Type *</label>
                                    <select value={createForm.employmentType} onChange={(e) => setCreateForm({ ...createForm, employmentType: e.target.value })} style={s.select} required>
                                        <option value="">Select type</option>
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={s.label}>Date of Appointment *</label>
                                    <input type="date" value={createForm.dateOfAppointment} onChange={(e) => setCreateForm({ ...createForm, dateOfAppointment: e.target.value })} style={s.input} required />
                                </div>
                            </div>
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '12px 0 4px' }}>🔐 Security Information</p>
                            <div>
                                <label style={s.label}>Recovery Email (Optional)</label>
                                <input type="email" value={createForm.recoveryEmail} onChange={(e) => setCreateForm({ ...createForm, recoveryEmail: e.target.value })} placeholder="Recovery email address" style={s.input} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Security Question (Optional)</label>
                                    <input type="text" value={createForm.securityQuestion} onChange={(e) => setCreateForm({ ...createForm, securityQuestion: e.target.value })} placeholder="e.g. Your first school?" style={s.input} />
                                </div>
                                <div>
                                    <label style={s.label}>Security Answer (Optional)</label>
                                    <input type="text" value={createForm.securityAnswer} onChange={(e) => setCreateForm({ ...createForm, securityAnswer: e.target.value })} placeholder="Answer" style={s.input} />
                                </div>
                            </div>
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '12px 0 4px' }}>🛡️ Permissions</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {Object.entries(createForm.permissions).map(([key, val]) => (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="checkbox" id={`perm-${key}`} checked={val} onChange={(e) => setCreateForm({ ...createForm, permissions: { ...createForm.permissions, [key]: e.target.checked } })} />
                                        <label htmlFor={`perm-${key}`} style={{ ...s.label, margin: 0, cursor: 'pointer', fontSize: '13px' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── STEP 3: Documents & Settings ─── */}
                    {createFormStep === 3 && createForm.assignedRole === 'Instructor' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}>📁 Document Uploads</p>
                            <div>
                                <label style={s.label}>Curriculum Vitae (CV/Resume) *</label>
                                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleCreateFileUpload('cvResumeUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.cvResumeUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}>✓ CV Uploaded</p>}
                            </div>
                            <div>
                                <label style={s.label}>Educational Certificate(s) *</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('educationCertificateUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.educationCertificateUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}>✓ Education Certificate Uploaded</p>}
                            </div>
                            <div>
                                <label style={s.label}>Professional Certificate(s) (Optional)</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('professionalCertificateUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.professionalCertificateUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}>✓ Professional Certificate Uploaded</p>}
                            </div>
                            <div>
                                <label style={s.label}>National ID / Passport (Optional)</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('nationalIdUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.nationalIdUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}>✓ National ID Uploaded</p>}
                            </div>
                            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '14px', marginTop: '4px' }}>
                                <label style={s.label}>Account Status</label>
                                <select value={createForm.isActive ? 'Active' : 'Inactive'} onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.value === 'Active' })} style={s.select}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Pending Approval</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="checkbox" id="requirePasswordChangeI" checked={createForm.requirePasswordChange} onChange={(e) => setCreateForm({ ...createForm, requirePasswordChange: e.target.checked })} />
                                <label htmlFor="requirePasswordChangeI" style={{...s.label, margin: 0, cursor: 'pointer'}}>Require Password Change on First Login</label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="checkbox" id="sendWelcomeEmailI" checked={createForm.sendWelcomeEmail} onChange={(e) => setCreateForm({ ...createForm, sendWelcomeEmail: e.target.checked })} />
                                <label htmlFor="sendWelcomeEmailI" style={{...s.label, margin: 0, cursor: 'pointer'}}>Send Welcome Email</label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="checkbox" id="termsI" required />
                                <label htmlFor="termsI" style={{...s.label, margin: 0, cursor: 'pointer'}}>Accept Terms and Conditions *</label>
                            </div>
                        </div>
                    )}

                    {createFormStep === 3 && createForm.assignedRole === 'Admin' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}>📁 Required Documents (Optional)</p>
                            <div>
                                <label style={s.label}>Employee ID Card</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('employeeIdCardUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.employeeIdCardUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}>✓ Employee ID Uploaded</p>}
                            </div>
                            <div>
                                <label style={s.label}>Appointment Letter</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('appointmentLetterUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.appointmentLetterUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}>✓ Appointment Letter Uploaded</p>}
                            </div>
                            <div>
                                <label style={s.label}>National ID / Passport</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('nationalIdUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.nationalIdUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}>✓ National ID Uploaded</p>}
                            </div>
                            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '14px', marginTop: '4px' }}>
                                <label style={s.label}>Account Status</label>
                                <select value={createForm.isActive ? 'Active' : 'Inactive'} onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.value === 'Active' })} style={s.select}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Pending Approval</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="checkbox" id="requirePasswordChangeA" checked={createForm.requirePasswordChange} onChange={(e) => setCreateForm({ ...createForm, requirePasswordChange: e.target.checked })} />
                                <label htmlFor="requirePasswordChangeA" style={{...s.label, margin: 0, cursor: 'pointer'}}>Require Password Change on First Login</label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="checkbox" id="sendWelcomeEmailA" checked={createForm.sendWelcomeEmail} onChange={(e) => setCreateForm({ ...createForm, sendWelcomeEmail: e.target.checked })} />
                                <label htmlFor="sendWelcomeEmailA" style={{...s.label, margin: 0, cursor: 'pointer'}}>Send Welcome Email</label>
                            </div>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
                        {createFormStep > 1 && (
                            <button type="button" onClick={() => setCreateFormStep(createFormStep - 1)} style={{...s.secondaryBtn, flex: 1}}>← Back</button>
                        )}
                        {createFormStep < 3 && (
                            <button type="button" onClick={() => setCreateFormStep(createFormStep + 1)} style={{...s.primaryBtn, flex: 1}}>Next →</button>
                        )}
                        {createFormStep === 3 && (
                            <button type="submit" style={{...s.primaryBtn, flex: 1}} disabled={isUploadingCreateFile}>{isUploadingCreateFile ? 'Uploading...' : 'Create Account'}</button>
                        )}
                        <button type="button" onClick={() => { setIsCreateModalOpen(false); setCreateFormStep(1); }} style={{...s.secondaryBtn, flex: 1}}>Cancel</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); setEditForm({ fullName: '', accountEmail: '' }); }} title={`Edit Account - ${selectedUser?.fullName || ''}`}>
                <form onSubmit={handleEditUser} style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                    <div>
                        <label style={s.label}>Full name</label>
                        <input type="text" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} style={s.input} required />
                    </div>
                    <div>
                        <label style={s.label}>Email address</label>
                        <input type="email" value={editForm.accountEmail} onChange={(e) => setEditForm({ ...editForm, accountEmail: e.target.value })} style={s.input} required />
                    </div>
                    <button type="submit" style={s.primaryBtn}>Save Changes</button>
                </form>
            </Modal>

            <Modal isOpen={isPasswordModalOpen} onClose={() => { setIsPasswordModalOpen(false); setSelectedUser(null); setNewPassword(''); setShowResetPassword(false); }} title={`Reset Password for ${selectedUser?.fullName}`}>
                <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                    <p style={{color:'#666', fontSize:'14px', margin:'0 0 12px'}}>Choose how to reset the password:</p>
                    
                    {/* Option 1: Send Reset Email */}
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            setNewPassword('');
                            handlePasswordReset(e);
                        }}
                        style={{...s.primaryBtn, background:'#10b981', marginBottom:'12px', display: 'inline-flex', alignItems: 'center', gap: '8px'}}
                    >
                        <Mail size={18} aria-hidden="true" />
                        Send Password Reset Email
                    </button>
                    <p style={{textAlign:'center', color:'#999', fontSize:'12px'}}>User receives email with reset link (expires in 15 mins)</p>

                    <div style={{borderTop:'1px solid #eee', padding:'12px 0', textAlign:'center', color:'#999', fontSize:'12px'}}>
                        OR
                    </div>

                    {/* Option 2: Force Reset */}
                    <form onSubmit={handlePasswordReset} style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                        <label style={{fontSize:'13px', fontWeight:'500', color:'#333'}}>Force Reset with New Password:</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type={showResetPassword ? 'text' : 'password'} 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                placeholder="Enter new temporary password (min 8 chars)" 
                                style={{ ...s.input, paddingRight: '44px' }} 
                                minLength={8} 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowResetPassword(!showResetPassword)} 
                                style={{ ...s.iconBtn, position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                                aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                            >
                                {showResetPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                            </button>
                        </div>
                        <button type="submit" style={{...s.primaryBtn, background:'#f59e0b', opacity: newPassword.length >= 8 ? 1 : 0.5}} disabled={newPassword.length < 8}>
                            <RotateCcw size={18} aria-hidden="true" />
                            Force Reset Password
                        </button>
                    </form>
                    <p style={{fontSize:'12px', color:'#d32f2f', marginTop:'8px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <AlertTriangle size={16} aria-hidden="true" />
                        Direct reset: User account is immediately changed. A confirmation email will be sent.
                    </p>
                </div>
            </Modal>
            <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Create Certificate Template">
                <form onSubmit={handleCreateTemplate} style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                    <div>
                        <label style={s.label}>Template Name</label>
                        <input
                            type="text"
                            value={newTemplateData.name}
                            onChange={(e) => setNewTemplateData({ ...newTemplateData, name: e.target.value })}
                            placeholder="Enter template name"
                            style={s.input}
                            required
                        />
                    </div>
                    <div>
                        <label style={s.label}>Description</label>
                        <textarea
                            value={newTemplateData.description}
                            onChange={(e) => setNewTemplateData({ ...newTemplateData, description: e.target.value })}
                            placeholder="Brief description of this certificate look"
                            rows={3}
                            style={{ ...s.input, resize: 'vertical' }}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={s.label}>Layout Style</label>
                            <select
                                value={newTemplateData.layoutStyle}
                                onChange={(e) => setNewTemplateData({ ...newTemplateData, layoutStyle: e.target.value })}
                                style={s.select}
                            >
                                <option value="Classic">Classic</option>
                                <option value="Modern">Modern</option>
                                <option value="Elegant">Elegant</option>
                            </select>
                        </div>
                        <div>
                            <label style={s.label}>Color Scheme</label>
                            <select
                                value={newTemplateData.colorScheme}
                                onChange={(e) => setNewTemplateData({ ...newTemplateData, colorScheme: e.target.value })}
                                style={s.select}
                            >
                                <option value="Blue">Blue</option>
                                <option value="Gold">Gold</option>
                                <option value="Emerald">Emerald</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={s.label}>Signature</label>
                        <input
                            type="text"
                            value={newTemplateData.signature}
                            onChange={(e) => setNewTemplateData({ ...newTemplateData, signature: e.target.value })}
                            placeholder="E.g. Course Director"
                            style={s.input}
                        />
                    </div>
                    <button type="submit" style={s.primaryBtn}>Save Template</button>
                </form>
            </Modal>
        </div>
    );
}
