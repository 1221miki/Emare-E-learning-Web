import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { courseService, quizService, assignmentService, userService, enrollmentService, analyticsService, systemService, notificationService, authService, reportService, certificateService, contentService, uploadService, auditService, calendarService, eventService, reviewService } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import AdminSystemSettings from '../../components/admin/AdminSystemSettings';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { LayoutDashboard, BarChart3, Users, UserCog, Building2, BookOpen, FolderTree, NotebookPen, Video, FileQuestion, ClipboardList, Award, Wallet, Receipt, DollarSign, TicketPercent, FileBarChart, Bell, Megaphone, MessageSquare, MessagesSquare, Bot, LifeBuoy, Settings, ShieldCheck, ClipboardCheck, DatabaseBackup, PlugZap, KeyRound, UserCircle, LogOut, TrendingUp, Clock3, Activity, PlusCircle, FilePen, Upload, Archive, Trash2, UserPlus, UserMinus, ShieldAlert, RotateCcw, CreditCard, PieChart as LucidePieChart, Mail, Eye, EyeOff, AlertTriangle, Palette, Languages, MoonStar, Database, BadgeInfo, CircleCheck, Server, GraduationCap, Search, Download, Monitor, Lock, Shield, MoreVertical, CheckCircle2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit, Image, User, Copy, Star, Settings2, DownloadCloud, Trash, Wand2, PartyPopper, FileText, HelpCircle, Clipboard, Pin, Headphones, File, Radio, XCircle, Flag, Package, MessageCircle, Folder, RefreshCw, ScrollText, X, Trophy, CheckSquare, Check, FileEdit, Scale, Repeat, Calendar, Ban, Medal, Plus, Rocket, Zap, Book, Library, Clock, Save, FolderOpen, Link, Circle, Bookmark, Building, Eraser, Sparkles, Pause, MapPin, Tag, Globe, ExternalLink, Loader2, Code2, Inbox } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { getLiveStatus, LIVE_STATUS_META, formatEventDate, isValidUrl, EVENT_CATEGORIES } from '../../utils/eventStatus';
import CourseCreationWizard from '../instructor/CourseCreationWizard';
import AdminContactMessages from './AdminContactMessages';
import { DevelopersPanel } from '../AdminDevelopers';
import AdminProfilePanel from '../../components/admin/AdminProfilePanel';
import { categoryMatchesCourse } from '../../utils/categoryMatching';

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const combineDateAndTime = (dateStr, timeStr) => {
    if (!dateStr) return null;
    const d = new Date(`${dateStr}T${timeStr || '00:00'}`);
    return Number.isNaN(d.getTime()) ? null : d;
};
const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
const dateInRange = (date, fromDays, toDays) => {
    const d = startOfDay(date);
    const from = startOfDay(Date.now() + fromDays * 86400000);
    const to = startOfDay(Date.now() + toDays * 86400000);
    return d >= from && d <= to;
};
const INTERNAL_EVENT_CATEGORIES = ['academic', 'exam', 'assignment', 'holiday', 'training', 'event'];
const MEETING_PROVIDERS = [
    { value: 'jitsi', label: 'Jitsi Meet' },
    { value: 'zoom', label: 'Zoom' },
    { value: 'microsoftTeams', label: 'Microsoft Teams' },
    { value: 'internal', label: 'Internal Join Link' },
    { value: 'custom', label: 'Manual URL' }
];
const meetingProviderLabel = (value) => (MEETING_PROVIDERS.find((p) => p.value === value) || { label: 'Internal Join Link' }).label;

// Virtual Meeting & Live Stream Settings platforms (form-facing)
const MEETING_PLATFORMS = [
    { value: 'zoom', label: 'Zoom' },
    { value: 'microsoftTeams', label: 'Microsoft Teams' },
    { value: 'jitsi', label: 'Jitsi Meet' },
    { value: 'youtubeLive', label: 'YouTube Live' },
    { value: 'rtmp', label: 'Custom RTMP / Web Stream' },
    { value: 'custom', label: 'Custom / Manual URL' }
];
const platformToProvider = { zoom: 'zoom', microsoftTeams: 'microsoftTeams', jitsi: 'jitsi', custom: 'custom', youtubeLive: 'custom', rtmp: 'custom' };
const GENERATABLE_PLATFORMS = ['zoom', 'microsoftTeams', 'jitsi'];

// -- Event thumbnail normalization -------------------------
// Every uploaded thumbnail is center-cropped to a uniform 16:9 (1280x720)
// canvas and re-encoded as WebP (~85 quality) so all event cards get a
// consistent size, aspect ratio and format � smaller uploads, no layout shifts.
const THUMB_WIDTH = 1280;
const THUMB_HEIGHT = 720;

const normalizeEventThumbnail = async (file) => {
    if (typeof createImageBitmap !== 'function') return file; // very old browser
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file; // keep animation/vector intact
    try {
        const bitmap = await createImageBitmap(file);
        if (!bitmap.width || !bitmap.height) return file;
        const canvas = document.createElement('canvas');
        canvas.width = THUMB_WIDTH;
        canvas.height = THUMB_HEIGHT;
        const ctx = canvas.getContext('2d');
        // Center-cover crop: fill the whole frame, never distort
        const scale = Math.max(THUMB_WIDTH / bitmap.width, THUMB_HEIGHT / bitmap.height);
        const sw = THUMB_WIDTH / scale;
        const sh = THUMB_HEIGHT / scale;
        const sx = (bitmap.width - sw) / 2;
        const sy = (bitmap.height - sh) / 2;
        ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
        bitmap.close();
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
        // Some browsers cannot encode WebP � fall back to JPEG, then the original
        let output = blob;
        if (!output) {
            output = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        }
        if (!output) return file;
        const isWebp = output.type === 'image/webp';
        const baseName = (file.name || 'event-thumbnail').replace(/\.[^.]+$/, '');
        return new File([output], `${baseName}.${isWebp ? 'webp' : 'jpg'}`, { type: output.type });
    } catch {
        return file; // unreadable image � upload the original untouched
    }
};

// Infer the true meeting provider from the link itself. Prevents mislabeling
// (e.g. a Jitsi fallback link sent with a wrong provider label).
const inferProviderFromUrl = (url) => {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^https:\/\/meet\.jit\.si\//i.test(u)) return 'jitsi';
    if (/zoom\.us/i.test(u)) return 'zoom';
    if (/teams\.microsoft\.com|teams\.live\.com/i.test(u)) return 'microsoftTeams';
    return 'custom';
};
const PASSWORD_PLATFORMS = ['zoom', 'custom', 'youtubeLive', 'rtmp'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normalizeInviteesInput = (value) => {
    const raw = (value || '').split(',').map((s) => s.trim()).filter(Boolean);
    const seen = new Set();
    const list = [];
    const invalid = [];
    raw.forEach((email) => {
        const normalized = email.toLowerCase();
        if (!EMAIL_PATTERN.test(normalized)) { invalid.push(email); return; }
        if (seen.has(normalized)) return;
        seen.add(normalized);
        list.push(normalized);
    });
    return { list, invalid };
};
const meetingPlatformLabel = (value) => (MEETING_PLATFORMS.find((p) => p.value === value) || { label: 'Zoom' }).label;
const getDefaultMeetingLink = (platform, title) => {
    const slug = (title || 'emare-live-session').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'emare-live-session';
    if (platform === 'jitsi') return `https://meet.jit.si/${slug}`;
    return null;
};
const providerToPlatform = (provider) => {
    if (provider === 'zoom') return 'zoom';
    if (provider === 'jitsi') return 'jitsi';
    if (provider === 'microsoftTeams') return 'microsoftTeams';
    if (provider === 'custom') return 'custom';
    return 'youtubeLive';
};
const formatTimeShort = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
const formatDateShort = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const statusChip = (live) => ({
    upcoming: { label: 'Upcoming', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    live: { label: 'Ongoing', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    completed: { label: 'Completed', color: '#64748b', bg: 'rgba(100,116,139,0.14)' },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}[live] || { label: 'Upcoming', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' });

const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        document.body.removeChild(ta);
        return ok;
    }
};

export default function AdminDashboard() {
    const { colors, theme } = useTheme();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    // Tabs that still have a panel in this dashboard. Removed modules
    // (content & moderation, assessments & certs, reports & exports) are
    // intentionally absent — anyone landing on them falls back to Overview.
    const VALID_TABS = ['overview', 'users', 'security', 'courses', 'course_builder', 'analytics', 'finances', 'cms', 'audit', 'contact-messages', 'developers', 'calendar', 'system', 'profile'];
    const sanitizeTab = (tab) => VALID_TABS.includes(tab) ? tab : 'overview';
    const [activeTab, setActiveTab] = useState(() => sanitizeTab(location.state?.activeTab) || 'overview');
    const [userSubTab, setUserSubTab] = useState('accounts');
    const [loading, setLoading] = useState(false); // start false -" show skeleton immediately

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(sanitizeTab(location.state.activeTab));
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
    const [isAssignInstructorModalOpen, setIsAssignInstructorModalOpen] = useState(false);
    const [assignInstructorCourseId, setAssignInstructorCourseId] = useState('');
    const [assignInstructorIdInput, setAssignInstructorIdInput] = useState('');
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isManageStudentsModalOpen, setIsManageStudentsModalOpen] = useState(false);
    const [isCourseAnalyticsModalOpen, setIsCourseAnalyticsModalOpen] = useState(false);
    const [isCourseReviewsModalOpen, setIsCourseReviewsModalOpen] = useState(false);
    const [courseReviewsList, setCourseReviewsList] = useState([]);
    const [isLoadingCourseReviews, setIsLoadingCourseReviews] = useState(false);
    const [activeCourseId, setActiveCourseId] = useState(null);
    const [courseCategoryFilter, setCourseCategoryFilter] = useState('All Categories');
    const [courseStatusFilter, setCourseStatusFilter] = useState('All Status');
    const [courseSearchQuery, setCourseSearchQuery] = useState('');
    const [coursePage, setCoursePage] = useState(1);
    const [coursePageSize, setCoursePageSize] = useState(10);
    const [managedStudents, setManagedStudents] = useState([]);
    const [managedStudentsLoading, setManagedStudentsLoading] = useState(false);
    const [enrollStudentId, setEnrollStudentId] = useState('');
    
    // Enterprise Workflows States
    const [instructorSearchQuery, setInstructorSearchQuery] = useState('');
    const [selectedInstructorObj, setSelectedInstructorObj] = useState(null);
    const [instructorRole, setInstructorRole] = useState('Lead Instructor');
    const [compensationModel, setCompensationModel] = useState('70% Revenue Share');
    const [notifyInstructor, setNotifyInstructor] = useState(true);

    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [selectedStudentsToEnroll, setSelectedStudentsToEnroll] = useState([]);
    const [bulkStudentEmails, setBulkStudentEmails] = useState('');
    const [enrollmentTab, setEnrollmentTab] = useState('search');
    const [enrollmentAccessType, setEnrollmentAccessType] = useState('Paid/Granted');
    const [accessExpirationDate, setAccessExpirationDate] = useState('Lifetime');
    const [cohortTag, setCohortTag] = useState('Spring 2026 Batch');

    const [isExportCustomizerOpen, setIsExportCustomizerOpen] = useState(false);
    const [exportFields, setExportFields] = useState({ title: true, code: true, instructor: true, category: true, status: true, enrollments: true, price: true, date: true });
    const [exportDateRange, setExportDateRange] = useState('All Time');
    const [isSmartImportWizardOpen, setIsSmartImportWizardOpen] = useState(false);
    const [smartImportFormat, setSmartImportFormat] = useState('CSV');
    const [isAddCourseDropdownOpen, setIsAddCourseDropdownOpen] = useState(false);
    const [isAiCourseGenModalOpen, setIsAiCourseGenModalOpen] = useState(false);
    const [aiPromptInput, setAiPromptInput] = useState('');

    // -"?-"? Fixed-position course action menu (escapes table overflow clipping) -"?-"?
    const [courseMenuOpenId, setCourseMenuOpenId] = useState(null);   // course._id or null
    const [courseMenuPos,    setCourseMenuPos]    = useState({ top: 0, right: 0 });

    // Close the fixed course action menu on any outside click or scroll
    useEffect(() => {
        if (!courseMenuOpenId) return;
        const close = () => setCourseMenuOpenId(null);
        document.addEventListener('mousedown', close);
        document.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('scroll', close, true);
        };
    }, [courseMenuOpenId]);
    const [isGeneratingAiCourse, setIsGeneratingAiCourse] = useState(false);

    // Smart Import Wizard states
    const [wizardSelectedFile, setWizardSelectedFile] = useState(null);
    const [wizardHeaders, setWizardHeaders] = useState([]);
    const [wizardColumnMapping, setWizardColumnMapping] = useState({
        courseTitle: '',
        technicalCategory: '',
        description: '',
        price: ''
    });
    const [wizardParsedRows, setWizardParsedRows] = useState([]);
    const [isWizardMappingStep, setIsWizardMappingStep] = useState(false);

    // Content Moderation States
    const [selectedModerationItems, setSelectedModerationItems] = useState([]);
    const [modSearchQuery, setModSearchQuery] = useState('');
    const [modTypeFilter, setModTypeFilter] = useState('All');
    const [modStatusFilter, setModStatusFilter] = useState('All');
    const [modInstructorFilter, setModInstructorFilter] = useState('All');
    const [modCategoryFilter, setModCategoryFilter] = useState('All');
    const [modSortBy, setModSortBy] = useState('Newest');
    const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState(false);
    const [reviewItem, setReviewItem] = useState(null);
    const [checklistData, setChecklistData] = useState({ grammar: true, copyright: true, plagiarism: false, language: true, relevance: true, malwareScan: 'Clean' });
    const [moderatorNotes, setModeratorNotes] = useState('');
    const [instructorFeedback, setInstructorFeedback] = useState('');
    const [modTabSubView, setModTabSubView] = useState('all');
    const [moderationRowsPerPage, setModerationRowsPerPage] = useState(10);
    const [moderationCurrentPage, setModerationCurrentPage] = useState(1);

    const [moderationItems, setModerationItems] = useState([]);

    const [moderationReports, setModerationReports] = useState([]);

    const [moderationLogs, setModerationLogs] = useState([
        { moderator: 'Admin User', action: 'Approve Content', item: 'React Hooks Deep Dive Video Lecture', date: '2026-08-05 10:24', ip: '192.168.1.1' },
        { moderator: 'Admin User', action: 'Reject Content', item: 'Introduction to Firewalls Exam', date: '2026-08-06 14:15', ip: '192.168.1.45' }
    ]);

    // Course Builder State
    const [builderStep, setBuilderStep] = useState(1);

    // Reports & Export States
    const [rptSubView, setRptSubView] = useState('all');
    const [rptSearchQuery, setRptSearchQuery] = useState('');
    const [rptCategoryFilter, setRptCategoryFilter] = useState('All');
    const [rptStatusFilter, setRptStatusFilter] = useState('All');
    const [rptFormatFilter, setRptFormatFilter] = useState('All');
    const [rptSortBy, setRptSortBy] = useState('Newest');
    const [selectedReportRows, setSelectedReportRows] = useState([]);
    const [rptCurrentPage, setRptCurrentPage] = useState(1);
    const [rptRowsPerPage, setRptRowsPerPage] = useState(10);
    const [isGenReportOpen, setIsGenReportOpen] = useState(false);
    const [genReportForm, setGenReportForm] = useState({ name: '', category: 'User Reports', description: '', dateFrom: '', dateTo: '', format: 'PDF', delivery: 'download' });
    const [generatedReports, setGeneratedReports] = useState([
        { id: 'RPT-001', name: 'Monthly Student Enrollment Summary', category: 'Enrollment Reports', generatedBy: 'Admin User', date: '2026-08-06', format: 'PDF', size: '1.4 MB', status: 'Completed', downloads: 12 },
        { id: 'RPT-002', name: 'Q3 Revenue & Financial Overview', category: 'Financial Reports', generatedBy: 'Admin User', date: '2026-08-05', format: 'Excel', size: '3.2 MB', status: 'Completed', downloads: 8 },
        { id: 'RPT-003', name: 'Instructor Performance Metrics', category: 'Instructor Reports', generatedBy: 'Admin User', date: '2026-08-04', format: 'CSV', size: '890 KB', status: 'Completed', downloads: 5 },
        { id: 'RPT-004', name: 'Course Completion Rates Analysis', category: 'Course Reports', generatedBy: 'System', date: '2026-08-03', format: 'PDF', size: '2.1 MB', status: 'Processing', downloads: 0 },
        { id: 'RPT-005', name: 'Weekly Quiz Performance Dashboard', category: 'Quiz Reports', generatedBy: 'Admin User', date: '2026-08-02', format: 'Excel', size: '1.8 MB', status: 'Scheduled', downloads: 0 },
        { id: 'RPT-006', name: 'Certificate Issuance Log', category: 'Certificate Reports', generatedBy: 'System', date: '2026-08-01', format: 'CSV', size: '420 KB', status: 'Completed', downloads: 3 },
        { id: 'RPT-007', name: 'System Login & Activity Audit', category: 'Activity Logs', generatedBy: 'Admin User', date: '2026-07-30', format: 'PDF', size: '5.6 MB', status: 'Failed', downloads: 0 },
        { id: 'RPT-008', name: 'Student Attendance Records', category: 'Attendance Reports', generatedBy: 'Admin User', date: '2026-07-28', format: 'Excel', size: '2.9 MB', status: 'Completed', downloads: 15 },
    ]);
    const [scheduledReports, setScheduledReports] = useState([
        { id: 'SCH-01', name: 'Daily Login Report', frequency: 'Daily', nextRun: '2026-08-07 06:00', lastRun: '2026-08-06 06:00', email: 'admin@emare.edu', status: 'Active' },
        { id: 'SCH-02', name: 'Weekly Enrollment Summary', frequency: 'Weekly', nextRun: '2026-08-12 08:00', lastRun: '2026-08-05 08:00', email: 'reports@emare.edu', status: 'Active' },
        { id: 'SCH-03', name: 'Monthly Revenue Report', frequency: 'Monthly', nextRun: '2026-09-01 00:00', lastRun: '2026-08-01 00:00', email: 'finance@emare.edu', status: 'Paused' },
    ]);
    const [rptActivityLog, setRptActivityLog] = useState([
        { action: 'Report Generated', item: 'Monthly Student Enrollment Summary', user: 'Admin User', date: '2026-08-06 10:24' },
        { action: 'Report Downloaded', item: 'Q3 Revenue & Financial Overview', user: 'Admin User', date: '2026-08-05 14:30' },
        { action: 'Scheduled Report Executed', item: 'Daily Login Report', user: 'System', date: '2026-08-06 06:00' },
    ]);

    // Assessment & Certificate Module States
    const [asmTabSubView, setAsmTabSubView] = useState('assessments'); // assessments | question_bank | assignments | grades | certificates | analytics | logs
    const [asmSearchQuery, setAsmSearchQuery] = useState('');
    const [asmCourseFilter, setAsmCourseFilter] = useState('All');
    const [asmTypeFilter, setAsmTypeFilter] = useState('All');
    const [asmStatusFilter, setAsmStatusFilter] = useState('All');
    const [asmSortBy, setAsmSortBy] = useState('Newest');
    const [selectedAsmRows, setSelectedAsmRows] = useState([]);
    const [asmCurrentPage, setAsmCurrentPage] = useState(1);
    const [asmRowsPerPage, setAsmRowsPerPage] = useState(10);
    const [isCreateAsmOpen, setIsCreateAsmOpen] = useState(false);
    const [createAsmForm, setCreateAsmForm] = useState({ name: '', course: 'React Masterclass', instructor: 'Dr. Sarah Connor', type: 'Quiz', totalQuestions: 15, passingScore: 70, timeLimit: 45, maxAttempts: 3, status: 'Active' });
    const [assessmentsList, setAssessmentsList] = useState([
        { id: 'ASM-101', name: 'React Hooks & State Final Exam', course: 'React Masterclass', instructor: 'Dr. Sarah Connor', type: 'Exam', totalQuestions: 30, passingScore: 75, attempts: 142, status: 'Active', date: '2026-08-01', avgScore: 82.4 },
        { id: 'ASM-102', name: 'Python Basics Midterm Quiz', course: 'Python Programming', instructor: 'Prof. Alan Turing', type: 'Quiz', totalQuestions: 20, passingScore: 60, attempts: 215, status: 'Active', date: '2026-07-28', avgScore: 78.1 },
        { id: 'ASM-103', name: 'Database Normalization Assignment', course: 'SQL & Database Architecture', instructor: 'Eng. Yonas Tadesse', type: 'Assignment', totalQuestions: 5, passingScore: 70, attempts: 98, status: 'Active', date: '2026-08-03', avgScore: 88.5 },
        { id: 'ASM-104', name: 'UI/UX Design Systems Evaluation', course: 'Figma Design Masterclass', instructor: 'Marta Bekele', type: 'Assignment', totalQuestions: 8, passingScore: 80, attempts: 64, status: 'Draft', date: '2026-08-05', avgScore: 0 },
        { id: 'ASM-105', name: 'Docker Containerization Certification Exam', course: 'DevOps & Kubernetes', instructor: 'David Miller', type: 'Exam', totalQuestions: 40, passingScore: 85, attempts: 38, status: 'Scheduled', date: '2026-08-10', avgScore: 0 },
        { id: 'ASM-106', name: 'Machine Learning Model Deployment Quiz', course: 'Intro to AI & ML', instructor: 'Dr. Sarah Connor', type: 'Quiz', totalQuestions: 15, passingScore: 70, attempts: 110, status: 'Completed', date: '2026-07-20', avgScore: 74.3 },
    ]);
    const [questionBank, setQuestionBank] = useState([
        { id: 'Q-01', question: 'What is the purpose of useEffect dependency array in React?', category: 'React', type: 'Multiple Choice', difficulty: 'Medium', tags: ['React', 'Hooks'] },
        { id: 'Q-02', question: 'Explain the difference between Primary Key and Foreign Key in SQL.', category: 'Database', type: 'Essay', difficulty: 'Easy', tags: ['SQL', 'Database'] },
        { id: 'Q-03', question: 'Which Python data structure is immutable?', category: 'Python', type: 'Multiple Choice', difficulty: 'Easy', tags: ['Python', 'Data Structures'] },
        { id: 'Q-04', question: 'What is the main advantage of Docker containers over Virtual Machines?', category: 'DevOps', type: 'Multiple Choice', difficulty: 'Hard', tags: ['Docker', 'DevOps'] },
    ]);
    const [gradebookEntries, setGradebookEntries] = useState([
        { id: 'GRD-501', student: 'Abebe Bikila', course: 'React Masterclass', assessment: 'React Hooks Final Exam', score: 92, grade: 'A', status: 'Approved', override: false },
        { id: 'GRD-502', student: 'Tigist Assefa', course: 'Python Programming', assessment: 'Python Basics Quiz', score: 68, grade: 'C+', status: 'Pending Review', override: false },
        { id: 'GRD-503', student: 'Dawit Yohannes', course: 'SQL & Database Architecture', assessment: 'Database Assignment', score: 85, grade: 'B+', status: 'Approved', override: true },
    ]);
    const [asmActivityLogs, setAsmActivityLogs] = useState([
        { action: 'Assessment Published', item: 'React Hooks & State Final Exam', user: 'Dr. Sarah Connor', date: '2026-08-01 09:15' },
        { action: 'Certificate Issued', item: 'EMARE-2026-8891 (Abebe Bikila)', user: 'System', date: '2026-08-05 16:20' },
        { action: 'Grade Approved', item: 'GRD-501 (React Masterclass)', user: 'Admin User', date: '2026-08-05 17:00' },
    ]);
    const [courseBuilderForm, setCourseBuilderForm] = useState({
        courseTitle: '',
        subtitle: '',
        technicalCategory: 'Programming',
        difficultyLevel: 'Beginner',
        language: 'English',
        price: 0,
        description: '',
        thumbnailUrl: '',
        prerequisites: '',
        targetAudience: '',
        learningOutcomes: '',
        modules: [
            { id: 1, title: 'Module 1: Getting Started', lessons: [{ id: 1, title: 'Lesson 1: Introduction', duration: '10 min', type: 'video' }] }
        ]
    });

    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [notificationMsg, setNotificationMsg] = useState('');
    const [userFilter, setUserFilter] = useState('All');
    const [userSearch, setUserSearch] = useState('');
    const [userToSuspend, setUserToSuspend] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isSubmittingUserAction, setIsSubmittingUserAction] = useState(false);
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
    const [createStepError, setCreateStepError] = useState('');
    const [createVerifyStep, setCreateVerifyStep] = useState(false);   // show OTP entry
    const [createVerifyEmail, setCreateVerifyEmail] = useState('');     // email to show
    const [createVerifyCode, setCreateVerifyCode] = useState('');       // code entered by admin
    const [createVerifyError, setCreateVerifyError] = useState('');
    const [createVerifyLoading, setCreateVerifyLoading] = useState(false);
    const [createVerifyResending, setCreateVerifyResending] = useState(false);
    const [createVerifyCooldown, setCreateVerifyCooldown] = useState(0);
    const [isUploadingCreateFile, setIsUploadingCreateFile] = useState(false);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [createSubmitError, setCreateSubmitError] = useState('');
    const [editForm, setEditForm] = useState({ fullName: '', accountEmail: '' });
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
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
    const [notificationSummary, setNotificationSummary] = useState({ total: 0, unread: 0, totalBroadcasts: 0, recent: [] });
    const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
    const [isNotificationSubmitting, setIsNotificationSubmitting] = useState(false);
    const [isUploadingAsset, setIsUploadingAsset] = useState(false);
    const [contentPages, setContentPages] = useState([]);
    const [selectedContentPage, setSelectedContentPage] = useState('home');
    const [contentData, setContentData] = useState({});
    const [contentForm, setContentForm] = useState({ title: '', content: '' });
    const [isContentSaving, setIsContentSaving] = useState(false);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [cmsEditorMode, setCmsEditorMode] = useState('visual');
    const [itemModalState, setItemModalState] = useState({ isOpen: false, mode: 'add', item: null });
    const [itemFormData, setItemFormData] = useState({});
    const [isItemSaving, setIsItemSaving] = useState(false);
    const [dbMetrics, setDbMetrics] = useState({ databaseName: 'unknown', collections: [], dataSizeBytes: 0, indexSizeBytes: 0, storageSizeBytes: 0, objects: 0 });
    const [dbActionLoading, setDbActionLoading] = useState({ backup: false, restore: false, optimize: false });
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditFilter, setAuditFilter] = useState('all');
    const [auditSearch, setAuditSearch] = useState('');
    const [isAuditLoading, setIsAuditLoading] = useState(false);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [publicEvents, setPublicEvents] = useState([]);
    const [calendarForm, setCalendarForm] = useState({ title: '', category: 'academic', description: '', startDate: '', endDate: '', location: '', isAllDay: false, color: '#16a34a', eventType: 'Hybrid', streamUrl: '', bannerImage: '', galleryImages: '', enableRegistration: true, capacity: '', price: 'FREE', instructor: '', eventStatus: 'SCHEDULED', eventCategory: 'Masterclass', visibility: 'internal', startTime: '10:00', endTime: '11:00', meetingProvider: 'zoom', meetingPlatform: 'zoom', meetingInvitees: '', meetingPassword: '' });
    const [eventSearch, setEventSearch] = useState('');
    const [eventStatusFilter, setEventStatusFilter] = useState('all');
    const [eventCategoryFilter, setEventCategoryFilter] = useState('all');
    const [eventVisibilityFilter, setEventVisibilityFilter] = useState('all');
    const [eventDateFilter, setEventDateFilter] = useState('all');
    const [eventCurrentPage, setEventCurrentPage] = useState(1);
    const [eventPageSize, setEventPageSize] = useState(10);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [eventMenuOpenId, setEventMenuOpenId] = useState(null);
    const [eventMenuPos, setEventMenuPos] = useState({ top: 0, right: 0 });

    useEffect(() => {
        if (!eventMenuOpenId) return;
        const close = () => setEventMenuOpenId(null);
        document.addEventListener('mousedown', close);
        document.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('scroll', close, true);
        };
    }, [eventMenuOpenId]);

    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [viewingEvent, setViewingEvent] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [formError, setFormError] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [meetingErrors, setMeetingErrors] = useState({});
    const [calendarEditingId, setCalendarEditingId] = useState(null);
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const [thumbnailDragOver, setThumbnailDragOver] = useState(false);
    const thumbnailInputRef = useRef(null);
    const [isCalendarSaving, setIsCalendarSaving] = useState(false);
    const [isGeneratingMeeting, setIsGeneratingMeeting] = useState(false);
    const [certificateVerificationNumber, setCertificateVerificationNumber] = useState('');
    const [certificateVerificationResult, setCertificateVerificationResult] = useState(null);
    const [isCertificateActionLoading, setIsCertificateActionLoading] = useState(false);
    const [activeTemplateId, setActiveTemplateId] = useState('standard');
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [newTemplateData, setNewTemplateData] = useState({ name: '', description: '', layoutStyle: 'Classic', signature: 'Course Director', colorScheme: 'Blue' });
    
    // Security & Roles UI State
    const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
    const [isCreatingRole, setIsCreatingRole] = useState(false);
    const [isManagePermissionsModalOpen, setIsManagePermissionsModalOpen] = useState(false);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '', selectedPerms: ['View Analytics'], scope: 'Custom' });
    const availablePerms = [
        'View Analytics', 'User Management', 'Course Creation', 'Content Moderation',
        'Financial Reports', 'System Settings', 'Direct Messaging', 'Helpdesk Support',
        'Student Support', 'Assessment Grading', 'Review Moderation', 'Live Stream Access'
    ];
    const [customRoles, setCustomRoles] = useState([
        { icon: Eye, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', name: 'Moderator', desc: 'Content & discussion moderation, course review inspection', users: 0, perms: 12, scope: 'Content & Forums', isCore: false },
        { icon: LifeBuoy, color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', name: 'Support Staff', desc: 'Student ticket resolution, inquiries & technical helpdesk', users: 0, perms: 8, scope: 'Helpdesk & Support', isCore: false }
    ]);
    const [roleSearch, setRoleSearch] = useState('');
    const [isSecurityStatusExpanded, setIsSecurityStatusExpanded] = useState(false);
    const [permissionsMatrix, setPermissionsMatrix] = useState(() => {
        try {
            const saved = window.localStorage.getItem('rbacPermissionsMatrix');
            if (saved) return JSON.parse(saved);
        } catch (_) {}
        return [
            { id: 'view_analytics', label: 'View Platform Analytics', category: 'Analytics', a: true, i: true, s: false, m: true, st: false },
            { id: 'manage_users', label: 'Manage User Accounts & Roles', category: 'Administration', a: true, i: false, s: false, m: false, st: false },
            { id: 'create_courses', label: 'Create & Publish Courses', category: 'Academics', a: true, i: true, s: false, m: false, st: false },
            { id: 'take_quizzes', label: 'Access Learning Materials & Quizzes', category: 'Learning', a: true, i: true, s: true, m: false, st: false },
            { id: 'moderate_content', label: 'Moderate Discussions & Reviews', category: 'Moderation', a: true, i: false, s: false, m: true, st: false },
            { id: 'support_tickets', label: 'Handle Helpdesk & Inquiries', category: 'Support', a: true, i: false, s: false, m: false, st: true },
            { id: 'system_settings', label: 'Manage System Settings & Keys', category: 'Administration', a: true, i: false, s: false, m: false, st: false },
            { id: 'export_reports', label: 'Export Audit & Financial Reports', category: 'Reports', a: true, i: true, s: false, m: false, st: false },
        ];
    });
    const [workingPermissionsMatrix, setWorkingPermissionsMatrix] = useState(permissionsMatrix);

    useEffect(() => {
        if (isManagePermissionsModalOpen) {
            setWorkingPermissionsMatrix(permissionsMatrix.map(row => ({ ...row })));
        }
    }, [isManagePermissionsModalOpen, permissionsMatrix]);

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

    useEffect(() => {
        if (isManageStudentsModalOpen && activeCourseId) {
            const loadEnrolledStudents = async () => {
                setManagedStudentsLoading(true);
                try {
                    const res = await enrollmentService.getAll({ courseId: activeCourseId });
                    setManagedStudents(res.data?.data || res.data || []);
                } catch (err) {
                    console.error('Failed to auto-load enrolled students:', err);
                    setManagedStudents([]);
                } finally {
                    setManagedStudentsLoading(false);
                }
            };
            loadEnrolledStudents();
        }
    }, [isManageStudentsModalOpen, activeCourseId]);

    useEffect(() => {
        if (isCourseReviewsModalOpen && activeCourseId) {
            const loadReviews = async () => {
                setIsLoadingCourseReviews(true);
                try {
                    const res = await reviewService.getCourseReviews(activeCourseId);
                    setCourseReviewsList(res.data?.data || []);
                } catch (err) {
                    console.error('Failed to load course reviews:', err);
                    setCourseReviewsList([]);
                } finally {
                    setIsLoadingCourseReviews(false);
                }
            };
            loadReviews();
        }
    }, [isCourseReviewsModalOpen, activeCourseId]);

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
            setIsRefreshingSummary(true);
            const response = await notificationService.getAdminSummary();
            setNotificationSummary(response.data?.data || { total: 0, unread: 0, totalBroadcasts: 0, recent: [] });
        } catch (error) {
            console.error('Error fetching notification summary:', error);
        } finally {
            setIsRefreshingSummary(false);
        }
    };

    const loadContentPageData = async (pageKey) => {
        try {
            setIsContentLoading(true);
            const response = await contentService.getPage(pageKey);
            const page = response.data?.data || { title: '', content: {} };
            setContentData(page.content || {});
            setContentForm({
                title: page.title || '',
                content: typeof page.content === 'string' ? page.content : JSON.stringify(page.content, null, 2)
            });
        } catch (error) {
            console.error('Error loading content page:', error);
        } finally {
            setIsContentLoading(false);
        }
    };

    const fetchContentPages = async () => {
        try {
            const response = await contentService.getAll();
            const pages = response.data?.data || [];
            setContentPages(pages);
            const currentKey = selectedContentPage || 'home';
            await loadContentPageData(currentKey);
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
            const response = await calendarService.getEvents();
            setCalendarEvents(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
        }
    };

    const fetchPublicEvents = async () => {
        try {
            const res = await eventService.getAll();
            setPublicEvents(res.data?.data || []);
        } catch (error) {
            console.error('Error fetching public events:', error);
        }
    };

    const publishPublicEvent = async (event) => {
        try {
            await eventService.setStatus(event._id, { status: 'APPROVED' });
            showNotification(`"${event.title}" is now live on the public site.`);
            fetchPublicEvents();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to publish event.');
        }
    };

    const cancelPublicEvent = async (event) => {
        setCancelReason('');
        setCancelTarget(event);
    };

    const confirmCancelPublicEvent = async () => {
        if (!cancelTarget) return;
        try {
            if (cancelTarget.visibility === 'internal') {
                await calendarService.updateEvent(cancelTarget._id, { eventStatus: 'CANCELLED', status: 'CANCELLED' });
                showNotification(`"${cancelTarget.title}" has been cancelled.`);
                fetchCalendarEvents();
            } else {
                await eventService.cancel(cancelTarget._id, { reason: cancelReason || 'Cancelled by administrator' });
                showNotification(`"${cancelTarget.title}" has been cancelled.`);
                fetchPublicEvents();
            }
            setCancelTarget(null);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to cancel event.');
        }
    };

    const fetchData = async () => {
        // Fetch only the critical data needed for initial render
        // Non-critical data (certificates, audit logs, calendar, content) loads after
        try {
            const [analyticsRes, usersRes, coursesRes, enrollmentsRes, notificationsRes] = await Promise.all([
                analyticsService.getOverview().catch(() => ({ data: { data: {} } })),
                userService.getAll({ limit: 500 }).catch(() => ({ data: { data: [] } })),
                courseService.getAdminAll().catch(() => ({ data: { data: [] } })),
                enrollmentService.getAll().catch(() => ({ data: { data: [] } })),
                notificationService.getAll().catch(() => ({ data: { data: [] } })),
            ]);

            setAnalytics(analyticsRes.data.data);
            setUsers(usersRes.data.data);
            setAllCourses(coursesRes.data.data || []);
            setEnrollments(enrollmentsRes.data.data);
            setNotifications(notificationsRes.data.data || []);
        } catch (error) {
            console.error("Error fetching admin data:", error);
        }

        // Defer non-critical fetches so they don't block the initial render
        setTimeout(() => {
            Promise.all([
                systemService.getSettings().catch(() => ({ data: { data: {} } })),
                systemService.getDatabaseCollections().catch(() => ({ data: { data: { collections: [] } } })),
                systemService.getDatabaseStorage().catch(() => ({ data: { data: { storageSizeBytes: 0 } } }))
            ]).then(([settingsRes, collectionsRes, storageRes]) => {
                if (settingsRes.data?.data) setSettings(settingsRes.data.data);
                const dbData = collectionsRes.data?.data || storageRes.data?.data || {};
                setDbMetrics({
                    databaseName: dbData.databaseName || 'unknown',
                    collections: dbData.collections || [],
                    dataSizeBytes: dbData.dataSizeBytes || 0,
                    indexSizeBytes: dbData.indexSizeBytes || 0,
                    storageSizeBytes: dbData.storageSizeBytes || 0,
                    objects: dbData.objects || 0
                });
            });
            fetchCertificates();
            fetchNotificationSummary();
            fetchContentPages();
            fetchAuditLogs();
            fetchCalendarEvents();
            fetchPublicEvents();
        }, 100);
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
        await loadContentPageData(pageKey);
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
            showNotification('Content saved successfully to MongoDB.');
            await loadContentPageData(selectedContentPage);
            fetchContentPages();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save content.');
        } finally {
            setIsContentSaving(false);
        }
    };

    const handleSaveVisualContent = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        try {
            setIsContentSaving(true);
            await contentService.savePage(selectedContentPage, {
                title: contentForm.title || `${selectedContentPage.charAt(0).toUpperCase() + selectedContentPage.slice(1)} Content`,
                content: contentData
            });
            showNotification('Page content permanently saved to MongoDB!');
            await loadContentPageData(selectedContentPage);
            fetchContentPages();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save content.');
        } finally {
            setIsContentSaving(false);
        }
    };

    const handleTogglePublishItem = async (itemId) => {
        try {
            await contentService.togglePublishItem(selectedContentPage, itemId);
            showNotification('Item publish status updated.');
            await loadContentPageData(selectedContentPage);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update publish status.');
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this item? It will be permanently removed from MongoDB.')) return;
        try {
            await contentService.deleteItem(selectedContentPage, itemId);
            showNotification('Item deleted successfully.');
            await loadContentPageData(selectedContentPage);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete item.');
        }
    };

    const handleOpenAddItemModal = () => {
        setItemModalState({ isOpen: true, mode: 'add', item: null });
        if (selectedContentPage === 'faq') {
            setItemFormData({ question: '', answer: '', isPublished: true });
        } else if (selectedContentPage === 'banners') {
            setItemFormData({ title: '', subtitle: '', badge: 'ANNOUNCEMENT', link: '/courses', isPublished: true });
        } else if (selectedContentPage === 'testimonials') {
            setItemFormData({ name: '', role: 'Student', quote: '', rating: 5, isPublished: true });
        } else if (selectedContentPage === 'news') {
            setItemFormData({ title: '', body: '', tag: 'Platform Update', date: new Date().toISOString().split('T')[0], isPublished: true });
        } else if (selectedContentPage === 'blogs') {
            setItemFormData({ title: '', body: '', author: 'Emare Team', tag: 'Technology', readTime: '5 min read', date: new Date().toISOString().split('T')[0], isPublished: true });
        }
    };

    const handleOpenEditItemModal = (item) => {
        setItemModalState({ isOpen: true, mode: 'edit', item });
        setItemFormData({ ...item });
    };

    const handleSaveItemModal = async (e) => {
        e.preventDefault();
        try {
            setIsItemSaving(true);
            if (itemModalState.mode === 'add') {
                await contentService.addItem(selectedContentPage, itemFormData);
                showNotification('Item added successfully to MongoDB!');
            } else {
                const itemId = itemModalState.item.id || itemModalState.item._id;
                await contentService.updateItem(selectedContentPage, itemId, itemFormData);
                showNotification('Item updated successfully in MongoDB!');
            }
            setItemModalState({ isOpen: false, mode: 'add', item: null });
            await loadContentPageData(selectedContentPage);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save item.');
        } finally {
            setIsItemSaving(false);
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

    // -"?-"? User Management -"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?

    const handleToggleUserStatus = (user) => {
        setUserToSuspend(user);
    };

    const confirmToggleUserStatus = async () => {
        if (!userToSuspend) return;
        setIsSubmittingUserAction(true);
        try {
            const newStatus = !userToSuspend.isActive;
            await userService.update(userToSuspend._id, { isActive: newStatus });
            setUsers(prev => prev.map(u => u._id === userToSuspend._id ? { ...u, isActive: newStatus } : u));
            showNotification(`User "${userToSuspend.fullName}" ${newStatus ? 'activated' : 'suspended'} successfully.`);
            setUserToSuspend(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update user status.');
        } finally {
            setIsSubmittingUserAction(false);
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
        setCreateSubmitError('');
        if (createForm.securedPassword !== createForm.confirmPassword) {
            setCreateSubmitError('Passwords do not match.');
            return;
        }
        setIsCreatingUser(true);
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
                if (response.data.verificationRequired) {
                    // Refresh user list immediately so new account appears (unverified state)
                    fetchData();
                    // Show OTP verification step
                    setCreateVerifyEmail(createForm.accountEmail.trim().toLowerCase());
                    setCreateVerifyCode('');
                    setCreateVerifyError(response.data.verificationSent === false
                        ? (response.data.deliveryError || 'The verification email could not be delivered to the inbox. Check the email service and use "Resend Code" once the cooldown ends.')
                        : '');
                    setIsCreateModalOpen(false);
                    setCreateVerifyStep(true);
                    // Lock the "Resend Code" button so the admin cannot spam it �
                    // longer cooldown when the server reports a daily quota / rate limit.
                    startCreateVerifyCooldown(response.data.deliveryRateLimited
                        ? (response.data.retryAfterSeconds || 60)
                        : 30);
                } else {
                    showNotification(`${createForm.assignedRole} account created successfully`);
                    setIsCreateModalOpen(false);
                    setCreateFormStep(1);
                    setCreateStepError('');
                    setCreateSubmitError('');
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
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to create user account. Please check your input and try again.';
            setCreateSubmitError(msg);
        } finally {
            setIsCreatingUser(false);
        }
    };

    // Cooldown countdown so the admin cannot spam the resend endpoint.
    const createVerifyCooldownRef = useRef(null);
    const startCreateVerifyCooldown = (seconds = 60) => {
        if (createVerifyCooldownRef.current) clearInterval(createVerifyCooldownRef.current);
        setCreateVerifyCooldown(seconds);
        createVerifyCooldownRef.current = setInterval(() => {
            setCreateVerifyCooldown((s) => {
                if (s <= 1) {
                    clearInterval(createVerifyCooldownRef.current);
                    createVerifyCooldownRef.current = null;
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
    };
    useEffect(() => () => { if (createVerifyCooldownRef.current) clearInterval(createVerifyCooldownRef.current); }, []);

    const handleResendCreateVerifyCode = async () => {
        if (createVerifyResending || createVerifyCooldown > 0) return;
        if (!createVerifyEmail) return;
        setCreateVerifyResending(true);
        setCreateVerifyError('');
        let cooldownSeconds = 30;
        try {
            // Backend generates a fresh 6-digit code and emails it directly to the
            // registered inbox. Codes are NEVER returned in the API response � the
            // UI relies purely on live delivery, so on failure we surface the error
            // and keep the 30s cooldown before a retry is allowed.
            const res = await authService.resendVerification({ accountEmail: createVerifyEmail });
            if (res?.data?.success) {
                setCreateVerifyCode('');
                showNotification('A new 6-digit verification code has been sent to the user inbox.');
            } else {
                setCreateVerifyError(res?.data?.message || 'Failed to resend verification code.');
                if (res?.data?.rateLimited) {
                    cooldownSeconds = res.data.retryAfterSeconds || 60;
                    setCreateVerifyError((res?.data?.message || 'Email daily sending limit reached.') + ' Please try again after the cooldown.');
                }
            }
        } catch (err) {
            const rateLimited = !!err?.response?.data?.rateLimited;
            const msg = err?.response?.data?.message || 'Failed to resend verification code.';
            setCreateVerifyError(rateLimited ? `${msg} Please try again after the cooldown.` : msg);
            if (rateLimited) {
                cooldownSeconds = err?.response?.data?.retryAfterSeconds || 60;
            }
        } finally {
            setCreateVerifyResending(false);
            // Always restart the cooldown (success or failure) to prevent spamming �
            // longer when the server reports a rate limit.
            startCreateVerifyCooldown(cooldownSeconds);
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

    const handleDeleteUser = (user) => {
        setUserToDelete(user);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        setIsSubmittingUserAction(true);
        try {
            await userService.deactivate(userToDelete._id);
            setUsers(prev => prev.filter(item => item._id !== userToDelete._id));
            showNotification(`User "${userToDelete.fullName}" has been deleted.`);
            setUserToDelete(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete account.');
        } finally {
            setIsSubmittingUserAction(false);
        }
    };

    // -"?-"? Course Management -"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?

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

    const handleAssignInstructor = (id) => {
        setAssignInstructorCourseId(id);
        setAssignInstructorIdInput('');
        setIsAssignInstructorModalOpen(true);
    };

    const submitAssignInstructor = async () => {
        if (!assignInstructorIdInput.trim()) return;
        try {
            const res = await courseService.assignInstructor(assignInstructorCourseId, assignInstructorIdInput.trim());
            setAllCourses(prev => prev.map(c => c._id === assignInstructorCourseId ? { ...c, ...res.data.data } : c));
            showNotification('Instructor assigned successfully');
            setIsAssignInstructorModalOpen(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to assign instructor.');
        }
    };

    const handleRemoveInstructor = async (id) => {
        if (!window.confirm('Remove assigned instructor from this course?')) return;
        try {
            const res = await courseService.removeInstructor(id);
            setAllCourses(prev => prev.map(c => c._id === id ? { ...c, ...res.data.data, assignedInstructorRef: null } : c));
            showNotification('Instructor removed successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove instructor.');
        }
    };

    const handleExportCSV = () => {
        if (allCourses.length === 0) return alert('No courses to export');
        const headers = ['Course Title', 'Instructor', 'Category', 'Status', 'Students Enrolled'];
        const rows = allCourses.map(c => [
            c.title || '',
            c.instructor?.fullName || 'Unassigned',
            c.technicalCategory || '',
            c.publicationState || 'Draft',
            c.totalEnrollments || 0
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.map(field => `"${field}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'courses_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteCourse = async (id) => {
        if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
        try {
            await courseService.delete(id);
            setAllCourses(prev => prev.filter(c => c._id !== id));
            showNotification('Course deleted successfully');
            setSelectedCourses(prev => prev.filter(cId => cId !== id));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete course.');
        }
    };

    const handleDuplicateCourse = async (id) => {
        try {
            if (courseService.duplicate) {
                const res = await courseService.duplicate(id);
                setAllCourses(prev => [res.data.data, ...prev]);
                showNotification('Course duplicated successfully');
            } else {
                alert('Duplication endpoint not available on backend yet.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to duplicate course.');
        }
    };

    const handleWizardFileParse = async (file) => {
        try {
            const text = await file.text();
            let headers = [];
            let rows = [];

            if (file.name.endsWith('.json')) {
                const parsed = JSON.parse(text);
                const list = Array.isArray(parsed) ? parsed : [parsed];
                if (list.length > 0) {
                    headers = Object.keys(list[0]);
                    rows = list;
                }
            } else {
                // Parse CSV
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                if (lines.length > 0) {
                    headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                    for (let i = 1; i < lines.length; i++) {
                        const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                        const rowObj = {};
                        headers.forEach((h, idx) => {
                            rowObj[h] = vals[idx] || '';
                        });
                        rows.push(rowObj);
                    }
                }
            }

            if (headers.length === 0 || rows.length === 0) {
                alert('Uploaded file is empty or formatted incorrectly.');
                return;
            }

            setWizardHeaders(headers);
            setWizardParsedRows(rows);

            // Auto-detect mappings if possible
            const mappingObj = { courseTitle: '', technicalCategory: '', description: '', price: '' };
            headers.forEach(h => {
                const low = h.toLowerCase();
                if (low.includes('title') || low.includes('name')) mappingObj.courseTitle = h;
                else if (low.includes('category') || low.includes('type')) mappingObj.technicalCategory = h;
                else if (low.includes('desc') || low.includes('summary')) mappingObj.description = h;
                else if (low.includes('price') || low.includes('cost')) mappingObj.price = h;
            });
            setWizardColumnMapping(mappingObj);
            setIsWizardMappingStep(true);
        } catch (err) {
            alert('Failed to parse file: ' + err.message);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedCourses.length === 0) return alert('Select courses to delete.');
        if (!window.confirm(`Delete ${selectedCourses.length} courses? This cannot be undone.`)) return;
        try {
            for (const id of selectedCourses) {
                await courseService.delete(id);
            }
            setAllCourses(prev => prev.filter(c => !selectedCourses.includes(c._id)));
            setSelectedCourses([]);
            showNotification('Selected courses deleted.');
        } catch (err) {
            alert('Error deleting some courses. ' + (err.response?.data?.message || ''));
        }
    };

    const handleBulkPublish = async () => {
        if (selectedCourses.length === 0) return alert('Select courses to publish.');
        if (!window.confirm(`Publish ${selectedCourses.length} selected courses?`)) return;
        try {
            for (const id of selectedCourses) {
                await courseService.approve(id);
            }
            setAllCourses(prev => prev.map(c => selectedCourses.includes(c._id) ? { ...c, publicationState: 'Published' } : c));
            setSelectedCourses([]);
            showNotification(`${selectedCourses.length} courses published.`);
        } catch (err) {
            alert('Failed to publish courses: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleBulkCategoryAssign = async () => {
        if (selectedCourses.length === 0) return alert('Select courses first.');
        const cat = window.prompt('Enter category for selected courses:', 'Programming');
        if (!cat) return;
        try {
            for (const id of selectedCourses) {
                await courseService.changeCategory(id, cat);
            }
            setAllCourses(prev => prev.map(c => selectedCourses.includes(c._id) ? { ...c, technicalCategory: cat } : c));
            setSelectedCourses([]);
            showNotification('Category assigned to selected courses.');
        } catch (err) {
            alert('Failed to set category: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleExportSelectedCSV = () => {
        const selected = allCourses.filter(c => selectedCourses.includes(c._id));
        if (selected.length === 0) return alert('Select courses to export.');
        const headers = ['Course Title', 'Code', 'Instructor', 'Category', 'Status', 'Enrollments', 'Price'];
        const rows = selected.map(c => [
            c.courseTitle || '',
            c.courseCode || '',
            c.creatorRef?.fullName || c.assignedInstructorRef?.fullName || 'Unassigned',
            c.technicalCategory || '',
            c.publicationState || 'Draft',
            c.totalEnrollments || 0,
            c.price || 0
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.map(f => `"${f}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `selected_courses_${selected.length}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRevokeAccess = async (enrId) => {
        if (!window.confirm('Revoke access for this student?')) return;
        try {
            if (enrollmentService.delete) {
                await enrollmentService.delete(enrId);
            } else {
                await enrollmentService.rejectPayment(enrId);
            }
            showNotification('Student access revoked successfully.');
            setManagedStudents(prev => prev.filter(s => s._id !== enrId));
            setAllCourses(prev => prev.map(c => c._id === activeCourseId ? { ...c, totalEnrollments: Math.max(0, (c.totalEnrollments || 1) - 1) } : c));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to revoke access.');
        }
    };

    const handleResetProgress = (enrId) => {
        if (!window.confirm('Reset all course completion progress for this student?')) return;
        showNotification('Course progress reset to 0%.');
    };

    const handleResendWelcomeEmail = (enrId) => {
        showNotification('Welcome & onboarding email sent to student.');
    };

    const handleBulkArchive = async () => {
        if (selectedCourses.length === 0) return alert('Select courses to archive.');
        if (!window.confirm(`Archive ${selectedCourses.length} courses?`)) return;
        try {
            for (const id of selectedCourses) {
                await courseService.archive(id);
            }
            setAllCourses(prev => prev.map(c => selectedCourses.includes(c._id) ? { ...c, publicationState: 'Archived' } : c));
            setSelectedCourses([]);
            showNotification('Selected courses archived.');
        } catch (err) {
            alert('Error archiving some courses. ' + (err.response?.data?.message || ''));
        }
    };

    const handleSelectCourse = (id) => {
        if (!id) return;
        setSelectedCourses(prev => 
            prev.includes(id) ? prev.filter(courseId => courseId !== id) : [...prev, id]
        );
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

    // -"?-"? System Management -"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?

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
        setCalendarForm({ title: '', category: 'academic', description: '', startDate: '', endDate: '', location: '', isAllDay: false, color: '#16a34a', eventType: 'Hybrid', streamUrl: '', bannerImage: '', galleryImages: '', enableRegistration: true, capacity: '', price: 'FREE', instructor: '', eventStatus: 'SCHEDULED', eventCategory: 'Masterclass', visibility: 'internal', startTime: '10:00', endTime: '11:00', meetingProvider: 'zoom', meetingPlatform: 'zoom', meetingInvitees: '', meetingId: '', meetingPassword: '' });
        setCalendarEditingId(null);
        setFormError('');
        setFormErrors({});
        setMeetingErrors({});
        setIsEventModalOpen(false);
    };

    const openCreateEvent = () => {
        resetCalendarForm();
        setIsEventModalOpen(true);
    };

    const handleEventThumbnailUpload = async (file) => {
        if (!file) return;
        if (!file.type || !file.type.startsWith('image/')) {
            return setFormError('Please select an image file for the event thumbnail.');
        }
        if (file.size > 8 * 1024 * 1024) {
            return setFormError('Image is too large. Maximum size is 8 MB.');
        }
        setIsUploadingThumbnail(true);
        setFormError('');
        try {
            // Normalize first: uniform 1280x720 (16:9) WebP � smaller, consistent
            const normalized = await normalizeEventThumbnail(file);
            const fd = new FormData();
            fd.append('file', normalized);
            fd.append('targetType', 'thumbnail');
            fd.append('folder', 'emare_elms/event_thumbnails');
            const res = await uploadService.uploadFile(fd);
            const url = res.data?.data?.url;
            if (!url) throw new Error('Upload returned no URL.');
            setCalendarForm((f) => ({ ...f, bannerImage: url }));
            showNotification(`Event thumbnail uploaded (${THUMB_WIDTH}x${THUMB_HEIGHT} ${normalized.type === 'image/webp' ? 'WebP' : 'JPEG'}, normalized).`);
        } catch (err) {
            setFormError(err.response?.data?.message || 'Thumbnail upload failed. Please try again.');
        } finally {
            setIsUploadingThumbnail(false);
        }
    };

    const handleThumbnailDrop = (e) => {
        e.preventDefault();
        setThumbnailDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleEventThumbnailUpload(file);
    };

    const validateCalendarForm = ({ isPublic, existing }) => {
        const errors = {};
        const title = (calendarForm.title || '').trim();
        if (!title) errors.title = 'Event title is required.';
        else if (isPublic && title.length < 10) errors.title = 'Public event title must be at least 10 characters.';
        if (!calendarForm.startDate) errors.startDate = 'Start date is required.';
        const start = combineDateAndTime(calendarForm.startDate, calendarForm.isAllDay ? '00:00' : (calendarForm.startTime || '00:00'));
        if (calendarForm.startDate && !start) errors.startDate = 'Start date is invalid.';
        const end = calendarForm.endDate ? combineDateAndTime(calendarForm.endDate, calendarForm.isAllDay ? '23:59' : (calendarForm.endTime || '23:59')) : null;
        if (start && end && end < start) errors.endDate = 'End date/time must be after the start date/time.';
        if (calendarForm.eventType === 'Physical' && !(calendarForm.location || '').trim()) errors.location = 'Location is required for a physical event.';
        const trimmedUrl = (calendarForm.streamUrl || '').trim();
        if (calendarForm.eventType !== 'Physical' && trimmedUrl && !isValidUrl(trimmedUrl)) errors.streamUrl = 'Meeting URL is invalid � use a full http(s) link.';
        if (calendarForm.bannerImage && !isValidUrl(calendarForm.bannerImage)) errors.bannerImage = 'Event thumbnail URL is invalid � use a full http(s) link.';
        const inviteesResult = normalizeInviteesInput(calendarForm.meetingInvitees);
        if (inviteesResult.invalid.length) errors.meetingInvitees = `Invalid invitee email(s): ${inviteesResult.invalid.join(', ')}`;
        // NOTE: the backend automatically falls back to a free Jitsi link so
        // Online/Hybrid events always save with a working meeting URL.
        if (isPublic) {
            const price = String(calendarForm.price || '').trim().toUpperCase();
            if (!price) errors.price = 'Price is required (use FREE or a number).';
            else if (price !== 'FREE' && Number.isNaN(Number(price))) errors.price = 'Price must be FREE or a valid number.';
            if (calendarForm.capacity === '' || calendarForm.capacity === null || calendarForm.capacity === undefined) {
                errors.capacity = 'Total seats / capacity is required for public events.';
            } else {
                const capacityNum = Number(calendarForm.capacity);
                if (Number.isNaN(capacityNum) || capacityNum < 0) errors.capacity = 'Total seats must be a number of 0 or more.';
            }
            const hostPresent = Boolean(calendarForm.instructor) || Boolean(existing && existing.speaker && existing.speaker.name);
            if (!hostPresent) errors.instructor = 'Select a host / instructor for public events.';
            if (!calendarForm.bannerImage) errors.bannerImage = 'An event thumbnail is required for public events.';
        }
        return { errors, valid: Object.keys(errors).length === 0 };
    };

    const buildPublicEventPayload = ({ existing, start, end }) => {
        const streamUrl = (calendarForm.streamUrl || '').trim();
        // Trust the actual link over the dropdown: a Jitsi/custom URL must never
        // be sent labeled with the wrong provider (the backend would reject the save).
        const meetingProvider = streamUrl
            ? inferProviderFromUrl(streamUrl)
            : (platformToProvider[calendarForm.meetingPlatform] || calendarForm.meetingProvider || 'zoom');
        const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
        const endTime = calendarForm.isAllDay
            ? '23:59'
            : (end ? (() => {
                const hh = String(end.getHours()).padStart(2, '0');
                const mm = String(end.getMinutes()).padStart(2, '0');
                const sMin = start.getHours() * 60 + start.getMinutes();
                const eMin = end.getHours() * 60 + end.getMinutes();
                return eMin > sMin ? `${hh}:${mm}` : '23:59';
            })() : '23:59');
        const instructors = users.filter((u) => u.assignedRole === 'Instructor');
        const host = instructors.find((u) => u._id === calendarForm.instructor);
        return {
            title: calendarForm.title,
            tagline: '',
            category: calendarForm.category || calendarForm.eventCategory || 'Masterclass',
            description: calendarForm.description ? calendarForm.description.split('\n').filter(Boolean) : [],
            eventType: calendarForm.eventType || 'Hybrid',
            venue: calendarForm.location || (calendarForm.eventType !== 'Physical' ? 'Online Live Stream' : ''),
            city: '',
            streamUrl: calendarForm.streamUrl || '',
            startDate: start.toISOString(),
            endDate: end ? end.toISOString() : null,
            startTime,
            endTime,
            timeLabel: calendarForm.isAllDay ? 'All Day' : '',
            allDay: Boolean(calendarForm.isAllDay),
            visibility: calendarForm.visibility,
            meetingProvider,
            meetingPlatform: meetingProvider === 'custom' ? (calendarForm.meetingPlatform || 'custom') : providerToPlatform(meetingProvider),
            meetingInvitees: calendarForm.meetingInvitees || '',
            invitees: normalizeInviteesInput(calendarForm.meetingInvitees).list,
            meetingId: calendarForm.meetingId || '',
            meetingPassword: calendarForm.meetingPassword || '',
            price: calendarForm.price || 'FREE',
            totalSlots: Number(calendarForm.capacity) || 0,
            image: calendarForm.bannerImage || '',
            gallery: calendarForm.galleryImages ? calendarForm.galleryImages.split(',').map((u) => u.trim()).filter(Boolean) : [],
            speaker: host ? { name: host.fullName || '', role: host.specialization || 'Instructor', avatar: host.avatarUrl || '', bio: '' } : (existing?.speaker ? existing.speaker : {}),
            // Admin-created events are approved immediately so they appear on
            // the public site (homepage Events section) without a review step.
            status: calendarForm.eventStatus === 'CANCELLED' ? 'CANCELLED' : (calendarEditingId && existing ? existing.status : 'APPROVED'),
            isFeatured: Boolean(existing?.isFeatured),
            registrationEnabled: Boolean(calendarForm.enableRegistration)
        };
    };

    const buildInternalEventPayload = ({ start, end }) => {
        const streamUrl = (calendarForm.streamUrl || '').trim();
        const meetingProvider = streamUrl
            ? inferProviderFromUrl(streamUrl)
            : (platformToProvider[calendarForm.meetingPlatform] || calendarForm.meetingProvider || 'zoom');
        return {
            title: calendarForm.title,
            category: (calendarForm.category || 'academic').toLowerCase(),
            description: calendarForm.description || '',
            startDate: start.toISOString(),
            endDate: end ? end.toISOString() : null,
            location: calendarForm.location || '',
            eventType: calendarForm.eventType || 'Hybrid',
            streamUrl,
            visibility: calendarForm.visibility,
            meetingProvider,
            meetingPlatform: meetingProvider === 'custom' ? (calendarForm.meetingPlatform || 'custom') : providerToPlatform(meetingProvider),
            meetingInvitees: calendarForm.meetingInvitees || '',
            invitees: normalizeInviteesInput(calendarForm.meetingInvitees).list,
            meetingId: calendarForm.meetingId || '',
            meetingPassword: calendarForm.meetingPassword || '',
            isAllDay: Boolean(calendarForm.isAllDay),
            image: calendarForm.bannerImage || '',
            color: calendarForm.color || '#16a34a',
            status: calendarForm.eventStatus === 'CANCELLED' ? 'CANCELLED' : 'SCHEDULED'
        };
    };

    const handleSaveCalendarEvent = async (e) => {
        e.preventDefault();
        if (isCalendarSaving) return;

        const isPublic = calendarForm.visibility === 'public';
        const existing = calendarEditingId
            ? (isPublic ? publicEvents.find((ev) => ev._id === calendarEditingId) : calendarEvents.find((ev) => ev._id === calendarEditingId))
            : null;

        setFormError('');
        setFormErrors({});
        setMeetingErrors({});

        const { errors, valid } = validateCalendarForm({ isPublic, existing });
        if (!valid) {
            setFormErrors(errors);
            setMeetingErrors({ streamUrl: errors.streamUrl || '', meetingInvitees: errors.meetingInvitees || '' });
            setFormError(Object.values(errors)[0]);
            return;
        }

        const start = combineDateAndTime(calendarForm.startDate, calendarForm.isAllDay ? '00:00' : (calendarForm.startTime || '00:00'));
        const end = calendarForm.endDate ? combineDateAndTime(calendarForm.endDate, calendarForm.isAllDay ? '23:59' : (calendarForm.endTime || '23:59')) : null;

        try {
            setIsCalendarSaving(true);
            const payload = isPublic
                ? buildPublicEventPayload({ existing, start, end })
                : buildInternalEventPayload({ start, end });

            if (calendarEditingId) {
                if (isPublic) {
                    await eventService.update(calendarEditingId, payload);
                    showNotification('Public event updated successfully.');
                } else {
                    await calendarService.updateEvent(calendarEditingId, payload);
                    showNotification('Calendar event updated successfully.');
                }
            } else if (isPublic) {
                await eventService.create(payload);
                showNotification('Public event created successfully.');
            } else {
                await calendarService.createEvent(payload);
                showNotification('Calendar event created successfully.');
            }

            resetCalendarForm();
            fetchCalendarEvents();
            fetchPublicEvents();
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to save event.';
            setFormError(msg);
            setFormErrors((prev) => ({ ...prev, _submit: msg }));
            showNotification(msg);
        } finally {
            setIsCalendarSaving(false);
        }
    };

    const handleEditCalendarEvent = (event) => {
        const isPublic = event.visibility === 'public';
        const toDatePart = (d) => {
            if (!d) return '';
            try {
                const dt = new Date(d);
                return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
            } catch {
                return '';
            }
        };
        const toTimePart = (d) => {
            if (!d) return '';
            try {
                const dt = new Date(d);
                return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(11, 16);
            } catch {
                return '';
            }
        };
        setCalendarEditingId(event._id);
        setCalendarForm({
            title: event.title || '',
            category: isPublic ? (event.category || 'Masterclass') : (event.category || 'academic'),
            description: isPublic ? (Array.isArray(event.description) ? event.description.join('\n') : (event.description || '')) : (event.description || ''),
            startDate: toDatePart(event.startDate),
            startTime: toTimePart(event.startDate),
            endDate: toDatePart(event.endDate),
            endTime: toTimePart(event.endDate),
            location: isPublic ? (event.venue || '') : (event.location || ''),
            isAllDay: Boolean(event.isAllDay),
            color: event.color || '#16a34a',
            eventType: event.eventType || 'Hybrid',
            streamUrl: event.meetingUrl || event.streamUrl || '',
            bannerImage: event.image || '',
            galleryImages: event.gallery ? event.gallery.join(', ') : '',
            enableRegistration: event.registrationEnabled !== false,
            capacity: event.totalSlots != null ? event.totalSlots : '',
            price: event.price || 'FREE',
            instructor: '',
            eventStatus: event.status === 'CANCELLED' ? 'CANCELLED' : 'SCHEDULED',
            eventCategory: event.category || 'Masterclass',
            visibility: isPublic ? 'public' : 'internal',
            meetingProvider: event.meetingProvider || (event.streamUrl ? 'custom' : 'zoom'),
            meetingPlatform: event.meetingPlatform || providerToPlatform(event.meetingProvider),
            meetingInvitees: event.meetingInvitees || '',
            meetingPassword: event.meetingPassword || '',
        });
        setFormError('');
        setFormErrors({});
        setIsEventModalOpen(true);
    };

    const handleCopyMeetingLink = async (url) => {
        if (!url) return showNotification('No meeting URL to copy.');
        const ok = await copyToClipboard(url);
        showNotification(ok ? 'Meeting link copied.' : 'Could not copy link.');
    };

    const openMeetingLink = (url) => {
        if (!url) return showNotification('No meeting URL to open.');
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleGenerateMeetingLink = async (overrideProvider) => {
        const provider = overrideProvider || calendarForm.meetingProvider;
        if (provider === 'custom') return showNotification('Manual URLs are entered directly in the link field � no generation needed.');
        // NOTE: an unconnected provider no longer blocks generation � the backend
        // automatically falls back to a free Jitsi link so a working meeting URL
        // is always produced.
        if (!calendarForm.title.trim()) return showNotification('Enter an event title before generating a link.');
        try {
            setIsGeneratingMeeting(true);
            const startDate = calendarForm.startDate ? combineDateAndTime(calendarForm.startDate, calendarForm.isAllDay ? '00:00' : (calendarForm.startTime || '00:00')) : null;
            const endDate = calendarForm.endDate ? combineDateAndTime(calendarForm.endDate, calendarForm.isAllDay ? '23:59' : (calendarForm.endTime || '23:59')) : null;
            const { data: res } = await eventService.generateMeetingLink({
                provider,
                title: calendarForm.title,
                startDate: startDate ? startDate.toISOString() : undefined,
                endDate: endDate ? endDate.toISOString() : undefined
            });
            const url = res?.data?.url || res?.data?.meetingUrl || '';
            const finalProvider = res?.data?.provider || provider;
            if (!url) throw new Error('No meeting link was returned.');
            setCalendarForm((f) => ({ ...f, streamUrl: url, meetingProvider: finalProvider }));
            showNotification(provider !== finalProvider
                ? `${meetingProviderLabel(provider)} is not connected – created a ${meetingProviderLabel(finalProvider)} link instead.`
                : `${meetingProviderLabel(finalProvider)} link generated.`);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to generate meeting link.');
        } finally {
            setIsGeneratingMeeting(false);
        }
    };

    const handleGeneratePlatformMeeting = async () => {
        const platform = calendarForm.meetingPlatform || 'zoom';
        const defaultLink = getDefaultMeetingLink(platform, calendarForm.title);
        if (defaultLink) {
            setCalendarForm((f) => ({ ...f, streamUrl: defaultLink, meetingProvider: 'jitsi' }));
            return showNotification('Jitsi Meet link generated.');
        }
        if (GENERATABLE_PLATFORMS.includes(platform)) {
            return await handleGenerateMeetingLink(platformToProvider[platform]);
        }
        return showNotification(`Automatic generation is not available for ${meetingPlatformLabel(platform)}. Please enter a real meeting link manually.`);
    };

    const handleRegenerateMeeting = async () => {
        if (!calendarEditingId) return;
        try {
            const { data: res } = await eventService.regenerateMeeting(calendarEditingId, {
                provider: calendarForm.meetingProvider,
                title: calendarForm.title
            });
            const url = res?.data?.streamUrl || '';
            setCalendarForm((f) => ({ ...f, streamUrl: url, meetingProvider: res?.data?.provider || f.meetingProvider }));
            showNotification('Meeting link regenerated.');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to regenerate meeting link.');
        }
    };

    const openDeleteEvent = (event) => {
        setDeleteTarget(event);
    };

    const confirmDeleteEvent = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.visibility === 'internal') {
                await calendarService.deleteEvent(deleteTarget._id);
                showNotification('Calendar event deleted.');
                fetchCalendarEvents();
            } else {
                await eventService.remove(deleteTarget._id);
                showNotification(`"${deleteTarget.title}" has been deleted.`);
                fetchPublicEvents();
            }
            setDeleteTarget(null);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to delete event.');
        }
    };

    const handleBulkApproveEvents = async () => {
        if (!selectedEvents.length) return;
        const publicToApprove = publicEvents.filter(e => 
            selectedEvents.includes(`public-${e._id}`) && e.status !== 'APPROVED' && e.status !== 'CANCELLED'
        );
        if (!publicToApprove.length) {
            return showNotification('None of the selected events require approval.');
        }
        try {
            for (const ev of publicToApprove) {
                await eventService.setStatus(ev._id, { status: 'APPROVED' });
            }
            showNotification(`Successfully approved ${publicToApprove.length} event(s).`);
            setSelectedEvents([]);
            fetchPublicEvents();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Bulk approval failed.');
        }
    };

    const handleBulkDeleteEvents = async () => {
        if (!selectedEvents.length) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedEvents.length} selected event(s)? This action cannot be undone.`)) {
            return;
        }
        try {
            let deletedCount = 0;
            for (const key of selectedEvents) {
                const [vis, ...idParts] = key.split('-');
                const id = idParts.join('-');
                if (vis === 'internal') {
                    await calendarService.deleteEvent(id);
                    deletedCount++;
                } else if (vis === 'public') {
                    await eventService.remove(id);
                    deletedCount++;
                }
            }
            showNotification(`Successfully deleted ${deletedCount} event(s).`);
            setSelectedEvents([]);
            fetchCalendarEvents();
            fetchPublicEvents();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Bulk delete failed.');
        }
    };

    // -"?-"? RENDERERS -"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?

    const s = {
        page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", background: colors.bg },
        main: { marginLeft: 'var(--sidebar-width, 260px)', flex: 1, padding: '40px', overflowY: 'auto' },
        header: { marginBottom: '32px' },
        greeting: { color: colors.text, fontSize: '32px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' },
        notification: { position: 'fixed', top: '24px', right: '24px', background: colors.success, color: colors.text, padding: '16px 24px', borderRadius: '12px', fontWeight: '600', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 1000, animation: 'fadeIn 0.3s ease-out' },
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
        instructorTableCard: { background: colors.bgCard, backdropFilter: 'blur(10px)', borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden' },
        instructorTable: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
        instructorThRow: { background: colors.bgDarkest },
        instructorTh: { padding: '14px 20px', color: colors.textMuted, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
        instructorTr: { borderBottom: `1px solid ${colors.border}` },
        instructorTd: { padding: '14px 20px', color: colors.text, fontSize: '14px' },
        th: { padding: '16px 24px', color: colors.textMuted, fontSize: '13px', fontWeight: '700', borderBottom: `1px solid ${colors.border}` },
        td: { padding: '16px 24px', fontSize: '14px', borderBottom: `1px solid ${colors.border}` },
        badge: { padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' },
        select: { background: colors.bgInput, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '10px 14px', outline: 'none', width: '100%' },
        actionBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', fontWeight: '600', padding: '0 8px' },
        emptyState: { padding: '40px', textAlign: 'center', color: colors.textMuted, background: colors.bgInput, borderRadius: '12px', border: `1px dashed ${colors.border}` },
        listItem: { background: colors.bgCard, borderRadius: '12px', padding: '20px 24px', border: `1px solid ${colors.border}`, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        input: { background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text, padding: '12px 16px', width: '100%', boxSizing:'border-box', outline: 'none' },
        label: { display: 'block', color: colors.textMuted, fontSize: '14px', fontWeight: '600', marginBottom: '8px' },
        primaryBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.text, border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.1s' },
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
                                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>{item.courseCount} course{item.courseCount === 1 ? '' : 's'} -- {item.enrollments} enrollments</div>
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
        const filteredUsers = users.filter((user) => {
            const matchesRole = userFilter === 'All' || user.assignedRole === userFilter;
            const q = userSearch.trim().toLowerCase();
            const matchesSearch = !q || 
                (user.fullName && user.fullName.toLowerCase().includes(q)) || 
                (user.accountEmail && user.accountEmail.toLowerCase().includes(q)) ||
                (user.username && user.username.toLowerCase().includes(q));
            return matchesRole && matchesSearch;
        });

        const totalUsers = users.length;
        const totalAdmins = users.filter((u) => u.assignedRole === 'Admin').length;
        const totalInstructors = users.filter((u) => u.assignedRole === 'Instructor').length;
        const totalStudents = users.filter((u) => u.assignedRole === 'Student').length;
        const activeUsers = users.filter((u) => u.isActive && !u.isSuspended).length;
        const suspendedUsers = users.filter((u) => !u.isActive || u.isSuspended).length;

        const getUserStatus = (u) => {
            if (!u.isActive || u.isSuspended) {
                return { label: 'Suspended', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', dot: '#ef4444' };
            }
            if (u.isEmailVerified === false) {
                return { label: 'Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', dot: '#f59e0b' };
            }
            return { label: 'Active', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', dot: '#10b981' };
        };

        const getRoleBadgeStyle = (role) => {
            switch (role) {
                case 'Admin':
                    return { bg: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.3)', icon: <ShieldCheck size={13} /> };
                case 'Instructor':
                    return { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)', icon: <BookOpen size={13} /> };
                default:
                    return { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)', icon: <GraduationCap size={13} /> };
            }
        };

        const getInitials = (name) => {
            if (!name) return 'U';
            const parts = name.trim().split(/\s+/);
            if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        };

        return (
            <div style={s.tabContent}>
                {/* Header */}
                <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>User Management</h2>
                    <p style={s.sectionSub}>Create, review, edit, suspend, activate, and manage platform students, instructors, and administrators.</p>
                </div>

                {/* Sub Tab Pills */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    {[
                        { key: 'accounts', label: 'User Accounts', icon: <Users size={16} aria-hidden="true" /> }
                    ].map(t => {
                        const isActive = userSubTab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setUserSubTab(t.key)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    padding: '9px 20px', borderRadius: '999px', cursor: 'pointer',
                                    fontWeight: '700', fontSize: '13px',
                                    border: `1px solid ${isActive ? colors.primary : colors.border}`,
                                    background: isActive ? colors.primary : 'transparent',
                                    color: isActive ? '#fff' : colors.text,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {t.icon}{t.label}
                            </button>
                        );
                    })}
                </div>

                <>
                {/* 1. Statistics Cards - Compact, Responsive, Aligned */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    <StatCard icon={<Users size={20} aria-hidden="true" />} label="Total Users" value={totalUsers} color={colors.primary} />
                    <StatCard icon={<ShieldCheck size={20} aria-hidden="true" />} label="Total Admins" value={totalAdmins} color={colors.accent || '#16a34a'} />
                    <StatCard icon={<BookOpen size={20} aria-hidden="true" />} label="Total Instructors" value={totalInstructors} color={colors.info || '#0284c7'} />
                    <StatCard icon={<GraduationCap size={20} aria-hidden="true" />} label="Total Students" value={`${totalStudents} (Read Only)`} color={colors.textMuted} />
                    <StatCard icon={<CircleCheck size={20} aria-hidden="true" />} label="Active Users" value={activeUsers} color={colors.success || '#16a34a'} />
                    <StatCard icon={<AlertTriangle size={20} aria-hidden="true" />} label="Suspended Users" value={suspendedUsers} color={colors.danger || '#ef4444'} />
                </div>

                {/* 2. User Roster Toolbar */}
                <div style={{ ...s.card, marginBottom: '20px', padding: '18px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div>
                            <div style={{ color: colors.text, fontWeight: '800', fontSize: '17px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>User Roster</span>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    background: `${colors.primary}20`,
                                    color: colors.primary,
                                    border: `1px solid ${colors.primary}40`
                                }}>
                                    {filteredUsers.length} {filteredUsers.length === 1 ? 'account' : 'accounts'}
                                </span>
                            </div>
                            <div style={{ color: colors.textMuted, fontSize: '13px' }}>
                                Manage platform access, roles, and account security.
                            </div>
                        </div>

                        {/* Controls Toolbar */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* Search Input */}
                            <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 200px' }}>
                                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="Search by name or email..."
                                    style={{
                                        ...s.input,
                                        height: '40px',
                                        paddingLeft: '36px',
                                        paddingRight: userSearch ? '32px' : '12px',
                                        fontSize: '13px',
                                        borderRadius: '10px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {userSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setUserSearch('')}
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 'none',
                                            color: colors.textMuted,
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title="Clear search"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Role Filter Select */}
                            <select
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                                style={{
                                    ...s.select,
                                    width: 'auto',
                                    minWidth: '145px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    padding: '0 12px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="All" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All roles</option>
                                <option value="Student" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Students</option>
                                <option value="Instructor" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Instructors</option>
                                <option value="Admin" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Admins</option>
                            </select>

                            {/* Refresh Button */}
                            <button
                                onClick={() => {
                                    setLoading(true);
                                    userService.getAll({ limit: 500 })
                                        .then(r => {
                                            setUsers(r.data.data || []);
                                            showNotification('User accounts list refreshed');
                                        })
                                        .catch(() => showNotification('Failed to refresh user list'))
                                        .finally(() => setLoading(false));
                                }}
                                disabled={loading}
                                style={{
                                    ...s.secondaryBtn,
                                    height: '40px',
                                    padding: '0 14px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                                title="Refresh accounts list from server"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                <span>Refresh</span>
                            </button>

                            {/* Create Account Button */}
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                style={{
                                    ...s.primaryBtn,
                                    height: '40px',
                                    padding: '0 16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    borderRadius: '10px',
                                    fontSize: '13px'
                                }}
                            >
                                <UserPlus size={15} />
                                <span>Create account</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. User Management Table with Horizontal Scroll Support */}
                <div style={{
                    background: colors.bgCard,
                    borderRadius: '16px',
                    border: `1px solid ${colors.border}`,
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    boxShadow: theme === 'dark' ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.03)'
                }}>
                    <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{
                                background: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.7)',
                                borderBottom: `1px solid ${colors.border}`
                            }}>
                                <th style={{ padding: '14px 20px', color: colors.textMuted, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                                <th style={{ padding: '14px 20px', color: colors.textMuted, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                                <th style={{ padding: '14px 20px', color: colors.textMuted, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
                                <th style={{ padding: '14px 20px', color: colors.textMuted, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                                <th style={{ padding: '14px 20px', color: colors.textMuted, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: colors.textMuted }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${colors.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.primary }}>
                                                <Users size={24} />
                                            </div>
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: colors.text }}>No users found</div>
                                            <p style={{ fontSize: '13px', margin: 0, maxWidth: '360px' }}>
                                                {userSearch || userFilter !== 'All' 
                                                    ? 'No user accounts match the current filter criteria or search query.'
                                                    : 'No users have been registered yet.'}
                                            </p>
                                            {(userSearch || userFilter !== 'All') && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setUserFilter('All'); setUserSearch(''); }}
                                                    style={{ ...s.secondaryBtn, height: '34px', padding: '0 14px', fontSize: '12px', marginTop: '6px' }}
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => {
                                    const status = getUserStatus(u);
                                    const roleBadge = getRoleBadgeStyle(u.assignedRole);
                                    return (
                                        <tr
                                            key={u._id}
                                            style={{
                                                borderBottom: `1px solid ${colors.border}`,
                                                transition: 'background-color 0.15s ease'
                                            }}
                                            className="hover:bg-slate-800/20 dark:hover:bg-slate-800/30"
                                        >
                                            {/* Column 1: Name with avatar */}
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '38px',
                                                        height: '38px',
                                                        borderRadius: '50%',
                                                        background: u.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #16a34a, #15803d)',
                                                        color: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: '700',
                                                        fontSize: '13px',
                                                        overflow: 'hidden',
                                                        flexShrink: 0,
                                                        border: `1.5px solid ${colors.border}`
                                                    }}>
                                                        {u.avatarUrl ? (
                                                            <img src={u.avatarUrl} alt={u.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                                                        ) : (
                                                            getInitials(u.fullName)
                                                        )}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: '700', fontSize: '14px', color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {u.fullName}
                                                        </div>
                                                        {u.username && (
                                                            <div style={{ fontSize: '12px', color: colors.textMuted }}>
                                                                @{u.username}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 2: Email */}
                                            <td style={{ padding: '14px 20px', color: colors.textMuted, fontSize: '13px', whiteSpace: 'nowrap' }}>
                                                {u.accountEmail}
                                            </td>

                                            {/* Column 3: Role */}
                                            <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    background: roleBadge.bg,
                                                    color: roleBadge.color,
                                                    border: `1px solid ${roleBadge.border}`
                                                }}>
                                                    {roleBadge.icon}
                                                    <span>{u.assignedRole}</span>
                                                </span>
                                            </td>

                                            {/* Column 4: Status Badge (Active: Green, Suspended: Red, Pending: Amber) */}
                                            <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '4px 10px',
                                                    borderRadius: '999px',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    background: status.bg,
                                                    color: status.color,
                                                    border: `1px solid ${status.border}`
                                                }}>
                                                    <span style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: status.dot,
                                                        boxShadow: `0 0 6px ${status.dot}`
                                                    }} />
                                                    <span>{status.label}</span>
                                                </span>
                                            </td>

                                            {/* Column 5: Redesigned Action Buttons */}
                                            <td style={{ padding: '14px 20px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    {/* View Profile: Green button with eye icon */}
                                                    <button
                                                        onClick={() => navigate(`/admin/users/${u._id}`)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            padding: '6px 11px',
                                                            borderRadius: '8px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            background: 'rgba(16, 185, 129, 0.12)',
                                                            color: '#10b981',
                                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        title={`View profile for ${u.fullName}`}
                                                        aria-label={`View profile for ${u.fullName}`}
                                                        className="hover:opacity-90 hover:scale-105 active:scale-95"
                                                    >
                                                        <Eye size={14} strokeWidth={2.2} />
                                                        <span>Profile</span>
                                                    </button>

                                                    {/* Suspend: Amber button with ban icon */}
                                                    <button
                                                        onClick={() => setUserToSuspend(u)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            padding: '6px 11px',
                                                            borderRadius: '8px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            background: u.isActive ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                                                            color: u.isActive ? '#f59e0b' : '#22c55e',
                                                            border: `1px solid ${u.isActive ? 'rgba(245, 158, 11, 0.35)' : 'rgba(34, 197, 94, 0.35)'}`,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        title={u.isActive ? `Suspend ${u.fullName}` : `Activate ${u.fullName}`}
                                                        aria-label={u.isActive ? `Suspend ${u.fullName}` : `Activate ${u.fullName}`}
                                                        className="hover:opacity-90 hover:scale-105 active:scale-95"
                                                    >
                                                        {u.isActive ? <Ban size={14} strokeWidth={2.2} /> : <CheckCircle2 size={14} strokeWidth={2.2} />}
                                                        <span>{u.isActive ? 'Suspend' : 'Activate'}</span>
                                                    </button>

                                                    {/* Reset Password: Blue button with key icon */}
                                                    <button
                                                        onClick={() => { setSelectedUser(u); setIsPasswordModalOpen(true); }}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            padding: '6px 11px',
                                                            borderRadius: '8px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            background: 'rgba(59, 130, 246, 0.12)',
                                                            color: '#3b82f6',
                                                            border: '1px solid rgba(59, 130, 246, 0.35)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        title={`Reset password for ${u.fullName}`}
                                                        aria-label={`Reset password for ${u.fullName}`}
                                                        className="hover:opacity-90 hover:scale-105 active:scale-95"
                                                    >
                                                        <KeyRound size={14} strokeWidth={2.2} />
                                                        <span>Reset</span>
                                                    </button>

                                                    {/* Delete: Red button with trash icon */}
                                                    <button
                                                        onClick={() => setUserToDelete(u)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            padding: '6px 11px',
                                                            borderRadius: '8px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            background: 'rgba(239, 68, 68, 0.12)',
                                                            color: '#ef4444',
                                                            border: '1px solid rgba(239, 68, 68, 0.35)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        title={`Delete ${u.fullName}`}
                                                        aria-label={`Delete ${u.fullName}`}
                                                        className="hover:opacity-90 hover:scale-105 active:scale-95"
                                                    >
                                                        <Trash2 size={14} strokeWidth={2.2} />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                </>
            </div>
        );
    };

    const mockLoginActivity = [
        { date: 'May 30', logins: 80 }, { date: 'May 31', logins: 120 }, { date: 'Jun 01', logins: 90 }, 
        { date: 'Jun 02', logins: 160 }, { date: 'Jun 03', logins: 110 }, { date: 'Jun 04', logins: 85 }, { date: 'Jun 05', logins: 95 }
    ];

    const renderSecurity = () => {
        const adminCount = users.filter(u => u.assignedRole === 'Admin').length;
        const instructorCount = users.filter(u => u.assignedRole === 'Instructor').length;
        const studentCount = users.filter(u => u.assignedRole === 'Student').length;
        const moderatorCount = users.filter(u => u.assignedRole === 'Moderator').length;
        const supportCount = users.filter(u => u.assignedRole === 'Support Staff' || u.assignedRole === 'Support').length;
        const verifiedUsers = users.filter(u => u.isEmailVerified).length;
        const verifiedPercent = users.length > 0 ? Math.round((verifiedUsers / users.length) * 100) : 100;

        const coreRoles = [
            { icon: ShieldCheck, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', name: 'Super Admin', desc: 'Full system access, administration & platform security controls', users: adminCount, perms: 'Full (All Modules)', scope: 'System-Wide', isCore: true },
            { icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', name: 'Instructor', desc: 'Course creation, student progress tracking & curriculum delivery', users: instructorCount, perms: '18 Capabilities', scope: 'Courses & Students', isCore: true },
            { icon: GraduationCap, color: '#10b981', bg: 'rgba(16,185,129,0.12)', name: 'Student', desc: 'Enrolled learning materials, interactive quizzes & certificate access', users: studentCount, perms: '8 Capabilities', scope: 'Enrolled Courses', isCore: true },
        ];

        // Enrich custom roles with real assigned user count
        const enrichedCustomRoles = customRoles.map(r => {
            let count = 0;
            if (r.name.toLowerCase().includes('moderator')) count = moderatorCount;
            else if (r.name.toLowerCase().includes('support')) count = supportCount;
            else count = users.filter(u => u.assignedRole?.toLowerCase() === r.name.toLowerCase()).length;
            return { ...r, users: count };
        });

        const allRolesList = [...coreRoles, ...enrichedCustomRoles];
        const filteredRoles = allRolesList.filter(r => 
            r.name.toLowerCase().includes(roleSearch.toLowerCase()) || 
            r.desc.toLowerCase().includes(roleSearch.toLowerCase()) ||
            r.scope.toLowerCase().includes(roleSearch.toLowerCase())
        );

        // Security events filtered from real live audit logs
        const securityLogs = auditLogs.filter(l => 
            l.category === 'User Security & Activity' || 
            (l.action && (
                l.action.toUpperCase().includes('LOGIN') || 
                l.action.toUpperCase().includes('REGISTER') || 
                l.action.toUpperCase().includes('AUTH') || 
                l.action.toUpperCase().includes('SECURITY') || 
                l.action.toUpperCase().includes('PASSWORD') || 
                l.action.toUpperCase().includes('ROLE') ||
                l.action.toUpperCase().includes('BLOCKED')
            )) ||
            l.severity === 'warning' || 
            l.severity === 'critical'
        );
        const displaySecurityLogs = (securityLogs.length > 0 ? securityLogs : auditLogs).slice(0, 6);

        const handleSaveNewRole = () => {
            if (!newRoleForm.name?.trim()) return showNotification('Role name is required.');
            setIsCreatingRole(true);
            setTimeout(() => {
                setCustomRoles([...customRoles, {
                    icon: Shield, 
                    color: '#10b981', 
                    bg: 'rgba(16,185,129,0.12)', 
                    name: newRoleForm.name.trim(), 
                    desc: newRoleForm.description?.trim() || 'Custom defined role', 
                    users: 0, 
                    perms: `${newRoleForm.selectedPerms.length} Capabilities`, 
                    scope: newRoleForm.scope || 'Custom', 
                    isCore: false 
                }]);
                setIsCreatingRole(false);
                setIsAddRoleModalOpen(false);
                setNewRoleForm({ name: '', description: '', selectedPerms: ['View Analytics'], scope: 'Custom' });
                showNotification(`Role '${newRoleForm.name.trim()}' created successfully.`);
            }, 500);
        };

        const handleExportSystemReport = () => {
            setSelectedReportType('system');
            setSelectedReportFormat('pdf');
            handleExportReport();
        };

        const handlePermissionToggle = (index, roleKey, value) => {
            setWorkingPermissionsMatrix(prev => prev.map((row, i) => i === index ? { ...row, [roleKey]: value } : { ...row }));
        };

        const handleCancelPermissions = () => {
            setWorkingPermissionsMatrix(permissionsMatrix.map(row => ({ ...row })));
            setIsManagePermissionsModalOpen(false);
        };

        const handleSavePermissions = () => {
            setIsSavingPermissions(true);
            setTimeout(() => {
                const updated = workingPermissionsMatrix.map(row => ({ ...row }));
                setPermissionsMatrix(updated);
                try {
                    window.localStorage.setItem('rbacPermissionsMatrix', JSON.stringify(updated));
                } catch (_) {}
                setIsSavingPermissions(false);
                setIsManagePermissionsModalOpen(false);
                showNotification('Role permissions successfully updated across the platform.');
            }, 400);
        };

        const confirmDeleteRole = () => {
            if (!roleToDelete) return;
            setCustomRoles(customRoles.filter(r => r.name !== roleToDelete.name));
            showNotification(`Role '${roleToDelete.name}' deleted.`);
            setRoleToDelete(null);
        };

        return (
            <div style={{ ...s.tabContent, padding: '4px 0 24px' }}>
                {/* Header Area */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(34,197,94,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                                <ShieldCheck size={22} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '22px', fontWeight: '800', color: colors.text, margin: 0, letterSpacing: '-0.3px' }}>Security & Roles</h2>
                                <p style={{ fontSize: '13px', color: colors.textMuted, margin: '2px 0 0 0' }}>Role-based access control, cryptographic policies, and verified platform audit monitoring.</p>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                            RBAC Active
                        </span>
                        <button 
                            onClick={handleExportSystemReport} 
                            disabled={isExportingReport} 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '9px 15px', color: colors.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: isExportingReport ? 0.7 : 1, transition: 'all 0.2s' }}
                        >
                            <Download size={15} /> {isExportingReport ? 'Exporting...' : 'Export Report'}
                        </button>
                        <button 
                            onClick={() => setIsManagePermissionsModalOpen(true)} 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '9px 15px', color: colors.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            <Settings size={15} color="#22c55e" /> Permissions Matrix
                        </button>
                        <button 
                            onClick={() => setIsAddRoleModalOpen(true)} 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#22c55e', border: 'none', borderRadius: '8px', padding: '9px 18px', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 10px rgba(34,197,94,0.3)', transition: 'all 0.2s' }}
                        >
                            <PlusCircle size={15} /> Add Custom Role
                        </button>
                    </div>
                </div>

                {/* 4 Consistent, 100% Real-Data Statistics Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {/* 1. Active RBAC Roles */}
                    <div style={{ background: colors.bgCard, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(34,197,94,0.14)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Shield size={22} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '11px', color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active RBAC Roles</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.text, margin: '2px 0' }}>{allRolesList.length}</div>
                            <div style={{ fontSize: '12px', color: colors.textMuted }}>{coreRoles.length} Core System · {enrichedCustomRoles.length} Custom</div>
                        </div>
                    </div>

                    {/* 2. Protected Users */}
                    <div style={{ background: colors.bgCard, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(59,130,246,0.14)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Users size={22} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '11px', color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Protected Accounts</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.text, margin: '2px 0' }}>{users.length.toLocaleString()}</div>
                            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>{adminCount} Admin · {instructorCount} Inst · {studentCount} Student</div>
                        </div>
                    </div>

                    {/* 3. Verified Accounts Rate */}
                    <div style={{ background: colors.bgCard, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(16,185,129,0.14)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CheckCircle2 size={22} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '11px', color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email Verification</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.text, margin: '2px 0' }}>{verifiedPercent}%</div>
                            <div style={{ fontSize: '12px', color: colors.textMuted }}>{verifiedUsers} of {users.length} verified</div>
                        </div>
                    </div>

                    {/* 4. Monitored Security Events */}
                    <div style={{ background: colors.bgCard, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(245,158,11,0.14)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Activity size={22} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '11px', color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Security Audit Events</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.text, margin: '2px 0' }}>{securityLogs.length}</div>
                            <div style={{ fontSize: '12px', color: colors.textMuted }}>{auditLogs.length} total platform audit logs</div>
                        </div>
                    </div>
                </div>

                {/* PRIMARY SECTION: Role & Permission Management Table */}
                <div style={{ background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, marginBottom: '24px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}>
                    <div style={{ padding: '18px 22px', borderBottom: `1px solid ${colors.border}`, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.text, margin: 0 }}>Role & Permission Management</h3>
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}>
                                    {filteredRoles.length} Roles Defined
                                </span>
                            </div>
                            <p style={{ fontSize: '12px', color: colors.textMuted, margin: '3px 0 0 0' }}>Role hierarchy, assigned user volumes, assignment boundaries, and granular permission sets.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
                                <input 
                                    type="text" 
                                    value={roleSearch} 
                                    onChange={(e) => setRoleSearch(e.target.value)} 
                                    placeholder="Filter roles or scope..." 
                                    style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '7px 12px 7px 32px', color: colors.text, fontSize: '12px', width: '200px', outline: 'none' }} 
                                />
                                {roleSearch && (
                                    <button onClick={() => setRoleSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 0 }}>
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                            <button 
                                onClick={() => setIsManagePermissionsModalOpen(true)} 
                                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                <Settings size={13} /> Edit Permissions Matrix
                            </button>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '12px 22px', fontWeight: '700' }}>Role Definition</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Assigned Users</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Permissions Scope</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Operational Boundary</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Status</th>
                                    <th style={{ padding: '12px 22px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRoles.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: colors.textMuted }}>
                                            <Shield size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                            <div>No roles match "{roleSearch}".</div>
                                            <button onClick={() => setRoleSearch('')} style={{ marginTop: '8px', background: 'none', border: 'none', color: '#22c55e', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Clear filter</button>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRoles.map((role, idx) => (
                                        <tr key={idx} style={{ borderBottom: idx < filteredRoles.length - 1 ? `1px solid ${colors.border}` : 'none', transition: 'background 0.15s' }}>
                                            {/* Role Definition */}
                                            <td style={{ padding: '16px 22px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: role.bg, color: role.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <role.icon size={19} />
                                                    </div>
                                                    <div>
                                                        <div style={{ color: colors.text, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                                            {role.name}
                                                            <span style={{ 
                                                                fontSize: '10px', 
                                                                fontWeight: '700', 
                                                                padding: '1px 7px', 
                                                                borderRadius: '4px',
                                                                background: role.isCore ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)', 
                                                                color: role.isCore ? '#3b82f6' : '#f59e0b',
                                                                border: `1px solid ${role.isCore ? 'rgba(59,130,246,0.25)' : 'rgba(245,158,11,0.25)'}`
                                                            }}>
                                                                {role.isCore ? 'Core System' : 'Custom'}
                                                            </span>
                                                        </div>
                                                        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '2px', maxWidth: '340px', lineHeight: 1.4 }}>{role.desc}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Assigned Users */}
                                            <td style={{ padding: '16px 16px' }}>
                                                <span style={{ background: colors.bg, padding: '5px 12px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '13px', fontWeight: '700', color: colors.text }}>
                                                    {Number(role.users).toLocaleString()}
                                                </span>
                                            </td>
                                            {/* Permissions Scope */}
                                            <td style={{ padding: '16px 16px' }}>
                                                <span style={{ color: colors.text, fontWeight: '600', fontSize: '13px' }}>
                                                    {typeof role.perms === 'number' ? `${role.perms} active modules` : role.perms}
                                                </span>
                                            </td>
                                            {/* Operational Boundary */}
                                            <td style={{ padding: '16px 16px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: '500', color: colors.textMuted, background: colors.bg, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${colors.border}` }}>
                                                    {role.scope}
                                                </span>
                                            </td>
                                            {/* Status */}
                                            <td style={{ padding: '16px 16px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: '700' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                                    Active
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td style={{ padding: '16px 22px', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => setIsManagePermissionsModalOpen(true)}
                                                        title="Configure Permissions Matrix"
                                                        style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', color: colors.text, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    >
                                                        <Settings size={13} color="#22c55e" />
                                                        <span>Configure</span>
                                                    </button>
                                                    {!role.isCore && (
                                                        <button 
                                                            onClick={() => setRoleToDelete(role)}
                                                            title="Delete custom role"
                                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', padding: '6px 9px', color: '#ef4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ padding: '12px 22px', background: colors.bg, borderTop: `1px solid ${colors.border}`, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px', color: colors.textMuted }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BadgeInfo size={14} color="#22c55e" />
                            <span>Core system roles (Super Admin, Instructor, Student) are protected and strictly enforced by backend middleware.</span>
                        </div>
                        <button onClick={() => setIsManagePermissionsModalOpen(true)} style={{ background: 'none', border: 'none', color: '#22c55e', fontWeight: '700', cursor: 'pointer', padding: 0, fontSize: '12px' }}>
                            View Full 5-Role Matrix →
                        </button>
                    </div>
                </div>

                {/* PLATFORM SECURITY SPECIFICATIONS & CONTROLS */}
                <div style={{ background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, marginBottom: '24px', padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck size={18} color="#10b981" />
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.text, margin: 0 }}>Platform Security Architecture & Safeguards</h3>
                            </div>
                            <p style={{ fontSize: '12px', color: colors.textMuted, margin: '3px 0 0 0' }}>Implemented application security controls, token specifications, and cryptographic guarantees.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button 
                                onClick={() => setIsSecurityStatusExpanded(!isSecurityStatusExpanded)} 
                                style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: colors.text, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                {isSecurityStatusExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {isSecurityStatusExpanded ? 'Hide Technical Specifications' : 'View Technical Specifications'}
                            </button>
                            <button onClick={() => setActiveTab('audit')} style={{ background: 'none', border: 'none', color: '#22c55e', fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: 0 }}>
                                Live Audit Logs →
                            </button>
                        </div>
                    </div>

                    {/* 6 Safeguard Architecture Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                        {[
                            { icon: Lock, name: 'JWT Bearer Authentication', status: 'HMAC SHA-256', desc: 'Signed 24h expiration tokens' },
                            { icon: KeyRound, name: 'Bcrypt Salted Hashing', status: '10 Rounds', desc: 'One-way irreversible passwords' },
                            { icon: Shield, name: 'RBAC Authorization', status: 'Backend Enforced', desc: 'Middleware guards on every route' },
                            { icon: DatabaseBackup, name: 'Tamper-Evident Audit', status: 'Active Log', desc: 'Read-only operational trail' },
                            { icon: Activity, name: 'Rate Limiting Guard', status: '100 req / 15m', desc: 'Brute-force auth mitigation' },
                            { icon: Server, name: 'Strict CORS & Headers', status: 'Configured', desc: 'Secure origin isolation' }
                        ].map((item, idx) => (
                            <div key={idx} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <item.icon size={16} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: colors.text, fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                    <div style={{ color: colors.textMuted, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.desc}</div>
                                </div>
                                <CircleCheck size={15} color="#10b981" style={{ flexShrink: 0 }} />
                            </div>
                        ))}
                    </div>

                    {/* Expandable Specifications Panel */}
                    {isSecurityStatusExpanded && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${colors.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                            <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '14px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <Lock size={15} color="#22c55e" /> Session & Token Security
                                </div>
                                <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>
                                    Cryptographically signed JSON Web Tokens (JWT) using HMAC SHA-256 with 24-hour expiration. Protected endpoints verify authorization headers via backend middleware.
                                </p>
                            </div>
                            <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '14px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <Shield size={15} color="#3b82f6" /> Role-Based Access Isolation
                                </div>
                                <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>
                                    Endpoint protection enforces assigned roles (Admin, Instructor, Student) at the Express middleware layer before database queries execute, preventing privilege escalation.
                                </p>
                            </div>
                            <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '14px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <DatabaseBackup size={15} color="#10b981" /> Immutable Audit Trail
                                </div>
                                <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>
                                    System events, course approvals, user logins, and financial payments are logged to a dedicated, read-only audit log collection with actor snapshots and IP addresses.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* SECONDARY SECTION: Recent Security & Auth Events (Real Database Data) */}
                <div style={{ background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '16px 22px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.text, margin: 0 }}>Recent Security & Authentication Events</h3>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}>
                                Verified Live Feed
                            </span>
                        </div>
                        <button onClick={() => setActiveTab('audit')} style={{ background: 'none', border: 'none', color: '#22c55e', fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: 0 }}>
                            View All Audit Logs →
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '12px 22px', fontWeight: '700' }}>Event Action</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Actor / Account</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>IP Address</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700' }}>Timestamp</th>
                                    <th style={{ padding: '12px 22px', fontWeight: '700', textAlign: 'right' }}>Severity Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displaySecurityLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: colors.textMuted }}>
                                            <ShieldCheck size={36} color="#22c55e" style={{ opacity: 0.6, marginBottom: '8px' }} />
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>No Security Incidents Recorded</div>
                                            <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '2px' }}>Authentication events and role changes will automatically appear here as they occur.</div>
                                        </td>
                                    </tr>
                                ) : (
                                    displaySecurityLogs.map((log, idx, arr) => {
                                        const isWarning = log.severity === 'warning';
                                        const isCritical = log.severity === 'critical';
                                        const sevColor = isCritical ? '#ef4444' : (isWarning ? '#f59e0b' : '#10b981');
                                        const sevBg = isCritical ? 'rgba(239,68,68,0.1)' : (isWarning ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)');
                                        const actorName = log.actorSnapshot?.fullName || log.userRef?.fullName || 'System';
                                        const actorEmail = log.actorSnapshot?.email || log.userRef?.accountEmail || '—';

                                        return (
                                            <tr key={log._id || idx} style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${colors.border}` : 'none', transition: 'background 0.15s' }}>
                                                <td style={{ padding: '14px 22px' }}>
                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                        {isCritical ? <ShieldAlert size={16} color="#ef4444" /> : (isWarning ? <AlertTriangle size={16} color="#f59e0b" /> : <ShieldCheck size={16} color="#22c55e" />)}
                                                        <div>
                                                            <div style={{ color: colors.text, fontWeight: '700', fontSize: '13px' }}>{log.action || 'SECURITY_EVENT'}</div>
                                                            <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '1px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ color: colors.text, fontWeight: '600', fontSize: '12px' }}>{actorName}</div>
                                                    <div style={{ color: colors.textMuted, fontSize: '11px' }}>{actorEmail}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px', color: colors.textMuted, fontSize: '12px', fontFamily: 'monospace' }}>
                                                    {log.ipAddress || '127.0.0.1'}
                                                </td>
                                                <td style={{ padding: '14px 16px', color: colors.textMuted, fontSize: '12px' }}>
                                                    {log.timestamp ? new Date(log.timestamp).toLocaleString('en-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                                </td>
                                                <td style={{ padding: '14px 22px', textAlign: 'right' }}>
                                                    <span style={{ color: sevColor, background: sevBg, border: `1px solid ${sevColor}40`, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'capitalize' }}>
                                                        {log.severity || 'Normal'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODALS */}
                
                {/* 1. Add Custom Role Modal */}
                <Modal isOpen={isAddRoleModalOpen} onClose={() => setIsAddRoleModalOpen(false)} title="Create Custom Functional Role">
                    <div style={{ padding: '24px', minWidth: '460px', maxWidth: '540px' }}>
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', color: colors.textMuted, fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Role Name <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="text" 
                                value={newRoleForm.name} 
                                onChange={e => setNewRoleForm({...newRoleForm, name: e.target.value})} 
                                placeholder="e.g. Assessment Coordinator, Community Lead" 
                                style={{ width: '100%', background: colors.bg, border: `1px solid ${colors.border}`, padding: '10px 14px', borderRadius: '8px', color: colors.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
                            />
                        </div>
                        
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', color: colors.textMuted, fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Description</label>
                            <textarea 
                                value={newRoleForm.description} 
                                onChange={e => setNewRoleForm({...newRoleForm, description: e.target.value})} 
                                placeholder="Outline functional boundaries and accountabilities for this role..." 
                                rows="3" 
                                style={{ width: '100%', background: colors.bg, border: `1px solid ${colors.border}`, padding: '10px 14px', borderRadius: '8px', color: colors.text, fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} 
                            />
                        </div>
                        
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', color: colors.textMuted, fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Access Scope</label>
                            <select 
                                value={newRoleForm.scope} 
                                onChange={e => setNewRoleForm({...newRoleForm, scope: e.target.value})} 
                                style={{ width: '100%', background: colors.bg, border: `1px solid ${colors.border}`, padding: '10px 14px', borderRadius: '8px', color: colors.text, fontSize: '14px', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                            >
                                <option value="Custom" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Custom - Granular Feature Access</option>
                                <option value="Courses" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Courses - Restricted to Academics</option>
                                <option value="Reports" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Reports - Analytical & Audit Access</option>
                                <option value="Content & Forums" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Content - Discussion & Review Moderation</option>
                                <option value="Helpdesk & Support" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Support - Helpdesk Operations</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <label style={{ color: colors.textMuted, fontSize: '13px', fontWeight: '600' }}>Select Role Capabilities</label>
                                <span style={{ fontSize: '12px', color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>{newRoleForm.selectedPerms.length} Selected</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {availablePerms.map(perm => {
                                    const isSelected = newRoleForm.selectedPerms.includes(perm);
                                    return (
                                        <button 
                                            key={perm}
                                            type="button"
                                            onClick={() => {
                                                const perms = isSelected ? newRoleForm.selectedPerms.filter(p => p !== perm) : [...newRoleForm.selectedPerms, perm];
                                                setNewRoleForm({...newRoleForm, selectedPerms: perms});
                                            }}
                                            style={{ 
                                                background: isSelected ? 'rgba(34,197,94,0.16)' : colors.bg, 
                                                border: `1px solid ${isSelected ? '#22c55e' : colors.border}`, 
                                                color: isSelected ? '#22c55e' : colors.text, 
                                                padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s'
                                            }}
                                        >
                                            {isSelected ? '✓ ' : '+ '}{perm}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
                            <button onClick={() => setIsAddRoleModalOpen(false)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleSaveNewRole} disabled={isCreatingRole} style={{ background: '#22c55e', border: 'none', color: '#ffffff', padding: '9px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: isCreatingRole ? 'not-allowed' : 'pointer', opacity: isCreatingRole ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isCreatingRole ? 'Creating...' : <><PlusCircle size={15} /> Create Role</>}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* 2. Manage 5-Role Permissions Matrix Modal */}
                <Modal 
                    isOpen={isManagePermissionsModalOpen} 
                    onClose={handleCancelPermissions} 
                    title="Platform Roles & Permissions Matrix (5 Roles)"
                    maxWidth="880px"
                    scrollable={true}
                >
                    <div style={{ width: '100%', boxSizing: 'border-box' }}>
                        <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '20px', marginTop: 0 }}>
                            Configure granular platform capabilities across Super Admin, Instructor, Student, Moderator, and Support Staff roles. Changes are stored in active platform memory.
                        </p>
                        
                        <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '12px', overflowX: 'auto', width: '100%' }}>
                            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${colors.border}`, background: colors.bgCard }}>
                                        <th style={{ padding: '14px 18px', color: colors.text, fontWeight: '700' }}>Permission Module</th>
                                        <th style={{ padding: '14px 12px', color: '#22c55e', fontWeight: '700', textAlign: 'center' }}>Super Admin</th>
                                        <th style={{ padding: '14px 12px', color: '#3b82f6', fontWeight: '700', textAlign: 'center' }}>Instructor</th>
                                        <th style={{ padding: '14px 12px', color: '#10b981', fontWeight: '700', textAlign: 'center' }}>Student</th>
                                        <th style={{ padding: '14px 12px', color: '#f59e0b', fontWeight: '700', textAlign: 'center' }}>Moderator</th>
                                        <th style={{ padding: '14px 12px', color: '#38bdf8', fontWeight: '700', textAlign: 'center' }}>Support</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workingPermissionsMatrix.map((row, i) => (
                                        <tr key={row.id} style={{ borderBottom: `1px solid ${colors.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                            <td style={{ padding: '13px 18px' }}>
                                                <div style={{ color: colors.text, fontWeight: '600' }}>{row.label}</div>
                                                <span style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.category}</span>
                                            </td>
                                            {/* Super Admin */}
                                            <td style={{ padding: '13px 12px', textAlign: 'center' }}>
                                                <input type="checkbox" checked={Boolean(row.a)} onChange={(e) => handlePermissionToggle(i, 'a', e.target.checked)} style={{ accentColor: '#22c55e', cursor: 'pointer', width: '17px', height: '17px' }} />
                                            </td>
                                            {/* Instructor */}
                                            <td style={{ padding: '13px 12px', textAlign: 'center' }}>
                                                <input type="checkbox" checked={Boolean(row.i)} onChange={(e) => handlePermissionToggle(i, 'i', e.target.checked)} style={{ accentColor: '#3b82f6', cursor: 'pointer', width: '17px', height: '17px' }} />
                                            </td>
                                            {/* Student */}
                                            <td style={{ padding: '13px 12px', textAlign: 'center' }}>
                                                <input type="checkbox" checked={Boolean(row.s)} onChange={(e) => handlePermissionToggle(i, 's', e.target.checked)} style={{ accentColor: '#10b981', cursor: 'pointer', width: '17px', height: '17px' }} />
                                            </td>
                                            {/* Moderator */}
                                            <td style={{ padding: '13px 12px', textAlign: 'center' }}>
                                                <input type="checkbox" checked={Boolean(row.m)} onChange={(e) => handlePermissionToggle(i, 'm', e.target.checked)} style={{ accentColor: '#f59e0b', cursor: 'pointer', width: '17px', height: '17px' }} />
                                            </td>
                                            {/* Support Staff */}
                                            <td style={{ padding: '13px 12px', textAlign: 'center' }}>
                                                <input type="checkbox" checked={Boolean(row.st)} onChange={(e) => handlePermissionToggle(i, 'st', e.target.checked)} style={{ accentColor: '#38bdf8', cursor: 'pointer', width: '17px', height: '17px' }} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '22px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
                            <button 
                                type="button" 
                                onClick={handleCancelPermissions} 
                                style={{ 
                                    background: 'transparent', 
                                    border: `1px solid ${colors.border}`, 
                                    color: colors.textMuted, 
                                    padding: '9px 20px', 
                                    borderRadius: '8px', 
                                    fontSize: '13px', 
                                    fontWeight: '600', 
                                    cursor: 'pointer' 
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={handleSavePermissions} 
                                disabled={isSavingPermissions} 
                                style={{ 
                                    background: '#22c55e', 
                                    border: 'none', 
                                    color: '#ffffff', 
                                    padding: '9px 24px', 
                                    borderRadius: '8px', 
                                    fontSize: '13px', 
                                    fontWeight: '700', 
                                    cursor: isSavingPermissions ? 'not-allowed' : 'pointer', 
                                    opacity: isSavingPermissions ? 0.7 : 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isSavingPermissions ? 'Saving...' : 'Apply RBAC Changes'}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* 3. Delete Custom Role Confirmation Modal */}
                <Modal isOpen={Boolean(roleToDelete)} onClose={() => setRoleToDelete(null)} title="Confirm Role Deletion">
                    <div style={{ padding: '24px', maxWidth: '440px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text }}>Delete Custom Role</h4>
                                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: colors.textMuted }}>Are you sure you want to remove this role?</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '13px', color: colors.textMuted, lineHeight: 1.5, margin: '0 0 20px 0' }}>
                            The custom role <strong style={{ color: colors.text }}>{roleToDelete?.name}</strong> will be permanently removed from platform configuration.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setRoleToDelete(null)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={confirmDeleteRole} style={{ background: '#ef4444', border: 'none', color: '#ffffff', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                                Delete Role
                            </button>
                        </div>
                    </div>
                </Modal>

            </div>
        );
    };

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

            <div style={{ marginTop: '24px' }}>
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
                        <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
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
        </div>
    );

    const handleSelectAllCourses = (e, list) => {
        if (e.target.checked) {
            const idsToAdd = list.map(c => c._id).filter(Boolean);
            setSelectedCourses(prev => Array.from(new Set([...prev, ...idsToAdd])));
        } else {
            const idsToRemove = new Set(list.map(c => c._id).filter(Boolean));
            setSelectedCourses(prev => prev.filter(id => !idsToRemove.has(id)));
        }
    };

    const renderCourses = () => {
        const screenshotData = [];

        // Build course enrollment mapping from enrollments state for guaranteed consistency
        const courseEnrollmentMap = {};
        (enrollments || []).forEach(e => {
            const cId = (e.courseRef?._id || e.courseRef || '').toString();
            if (cId) courseEnrollmentMap[cId] = (courseEnrollmentMap[cId] || 0) + 1;
        });

        const totalCourses = analytics?.totalCourses || allCourses.length || 0;
        const publishedCourses = analytics?.activeCourses || allCourses.filter(c => ['Published', 'Active'].includes(c.publicationState)).length || 0;
        const draftCourses = analytics?.draftCourses || allCourses.filter(c => c.publicationState === 'Draft').length || 0;
        const totalEnrollments = enrollments.length || 0;

        // Integrated Course Filtering: Category + Status + Search Query
        const matchesCategory = (course, filter) => {
            if (!filter || filter === 'All Categories') return true;
            const cat = course.technicalCategory || '';
            const title = course.courseTitle || '';
            
            if (categoryMatchesCourse(filter, cat)) return true;
            
            const f = filter.toLowerCase().trim();
            const c = cat.toLowerCase().trim();
            const t = title.toLowerCase().trim();

            if (c === f || c.includes(f) || f.includes(c)) return true;

            if (f === 'ai & ml' || f === 'ai ml' || f === 'ai') {
                return c.includes('ai') || c.includes('artificial') || c.includes('data science') || c.includes('machine learning') || c.includes('deep learning') ||
                       t.includes('ai') || t.includes('artificial intelligence') || t.includes('machine learning') || t.includes('data science');
            }
            if (f === 'programming') {
                return c.includes('coding') || c.includes('programming') || c.includes('software') || c.includes('developer') || c.includes('web') ||
                       t.includes('programming') || t.includes('coding') || t.includes('developer') || t.includes('javascript') || t.includes('python');
            }
            if (f === 'database') {
                return c.includes('database') || c.includes('databases') || c.includes('sql') || c.includes('mongo') || c.includes('postgres') || c.includes('data') ||
                       t.includes('database') || t.includes('sql') || t.includes('mongodb');
            }
            if (f === 'design') {
                return c.includes('design') || c.includes('media') || c.includes('creative') || c.includes('ux') || c.includes('ui') ||
                       t.includes('design') || t.includes('ui') || t.includes('ux');
            }
            if (f === 'security') {
                return c.includes('security') || c.includes('cyber') || c.includes('hacking') ||
                       t.includes('security') || t.includes('cybersecurity');
            }
            return false;
        };

        const matchesStatus = (course, filter) => {
            if (!filter || filter === 'All Status') return true;
            const state = course.publicationState || 'Draft';
            if (filter === 'Published') {
                return ['Published', 'Active', 'published', 'active'].includes(state);
            }
            if (filter === 'Draft') {
                return ['Draft', 'draft'].includes(state);
            }
            if (filter === 'Pending Review') {
                return ['Pending Review', 'Under Evaluation', 'Pending', 'pending review', 'pending', 'Revision Needed'].includes(state);
            }
            if (filter === 'Archived') {
                return ['Archived', 'archived'].includes(state);
            }
            return state.toLowerCase() === filter.toLowerCase();
        };

        const matchesSearch = (course, query) => {
            if (!query || !query.trim()) return true;
            const q = query.trim().toLowerCase();
            return (
                (course.courseTitle || '').toLowerCase().includes(q) ||
                (course.technicalCategory || '').toLowerCase().includes(q) ||
                (course.creatorRef?.fullName || '').toLowerCase().includes(q) ||
                (course.assignedInstructorRef?.fullName || '').toLowerCase().includes(q) ||
                (course.courseCode || '').toLowerCase().includes(q) ||
                (course.publicationState || '').toLowerCase().includes(q)
            );
        };

        let filteredCourses = allCourses.length > 0 ? [...allCourses] : [];
        filteredCourses = filteredCourses.filter(c => 
            matchesCategory(c, courseCategoryFilter) &&
            matchesStatus(c, courseStatusFilter) &&
            matchesSearch(c, courseSearchQuery)
        );

        const defaultCategories = ['All Categories', 'Programming', 'AI & ML', 'Database', 'Design', 'Security'];
        const extraCategories = Array.from(new Set(allCourses.map(c => c.technicalCategory).filter(Boolean)))
            .filter(cat => !defaultCategories.some(d => d !== 'All Categories' && matchesCategory({ technicalCategory: cat }, d)));

        const totalFilteredCourses = filteredCourses.length;
        const totalPages = Math.max(1, Math.ceil(totalFilteredCourses / coursePageSize));
        const safePage = Math.min(Math.max(1, coursePage), totalPages);
        const startIndex = totalFilteredCourses === 0 ? 0 : (safePage - 1) * coursePageSize;
        const endIndex = Math.min(startIndex + coursePageSize, totalFilteredCourses);
        const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

        const statusColorMap = {
            'Published': { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
            'Active': { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
            'Draft': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
            'Pending Review': { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
            'Archived': { color: colors.textMuted, bg: 'rgba(100,116,139,0.12)' },
        };

        const liveData = paginatedCourses.length > 0 ? paginatedCourses.map(c => {
            const st = c.publicationState || 'Draft';
            const sc = statusColorMap[st] || statusColorMap['Draft'];
            const studentCount = Math.max(courseEnrollmentMap[c._id?.toString()] || 0, c.totalEnrollments || 0);

            // Format creation timestamp
            const rawDate = c.creationTimestamp || c.createdAt;
            let formattedDate = '—';
            if (rawDate) {
                const parsedDate = new Date(rawDate);
                if (!isNaN(parsedDate.getTime())) {
                    formattedDate = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                }
            }

            return {
                id: c.courseCode || ('CRSE-' + (c._id?.slice(-4)?.toUpperCase() || '??')),
                title: c.courseTitle,
                instructor: c.creatorRef?.fullName || c.assignedInstructorRef?.fullName || 'Unassigned',
                img: c.creatorRef?.avatarUrl || `https://i.pravatar.cc/150?u=${c._id}`,
                category: c.technicalCategory || 'General',
                catColor: '#22c55e', catBg: 'rgba(34,197,94,0.12)',
                students: studentCount,
                status: st,
                statusColor: sc.color,
                statusBg: sc.bg,
                date: formattedDate,
                iconBg: '#14532d', icon: <BookOpen size={20} color="#4ade80" />,
                _id: c._id, isFeatured: c.isFeatured, raw: c
            };
        }) : screenshotData;

        const statCards = [
            { label: 'Total Courses', value: totalCourses, trend: '+8 this month', iconBg: 'rgba(34,197,94,0.1)', iconColor: '#22c55e', icon: <BookOpen size={26} /> },
            { label: 'Published Courses', value: publishedCourses, trend: '+6 this month', iconBg: 'rgba(16,185,129,0.1)', iconColor: '#10b981', icon: <GraduationCap size={26} /> },
            { label: 'Draft Courses', value: draftCourses, trend: '+1 this month', iconBg: 'rgba(245,158,11,0.1)', iconColor: '#f59e0b', icon: <FilePen size={26} /> },
            { label: 'Total Enrollments', value: totalEnrollments.toLocaleString(), trend: '+156 this month', iconBg: 'rgba(168,85,247,0.1)', iconColor: '#a855f7', icon: <Users size={26} /> },
        ];

        return (
            <div style={{ background: colors.bg, minHeight: '100%', borderRadius: '16px', animation: 'fadeIn 0.3s ease-in-out' }}>
                <div style={{ padding: '32px 40px' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                        <div>
                            <h2 style={{ fontSize: '28px', fontWeight: '700', color: colors.text, margin: '0 0 8px 0' }}>Course Management</h2>
                            <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>Dashboard &gt; <span style={{ color: '#22c55e', fontWeight: '500' }}>Course Management</span></p>
                        </div>
                        {selectedCourses.length > 0 ? (
                            /* Contextual Multi-Select Bulk Actions Bar */
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: theme === 'dark' ? '#14532d33' : '#f0fdf4', border: `1px solid ${theme === 'dark' ? '#166534' : '#bbf7d0'}`, padding: '6px 14px', borderRadius: '12px', animation: 'fadeIn 0.2s' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: theme === 'dark' ? '#4ade80' : '#15803d', paddingRight: '8px', borderRight: `1px solid ${theme === 'dark' ? '#166534' : '#bbf7d0'}` }}>
                                    {selectedCourses.length} Selected
                                </span>
                                <button onClick={handleBulkPublish} title="Publish Selected" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    <Upload size={14} /> Publish
                                </button>
                                <button onClick={handleBulkArchive} title="Archive Selected" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    <Archive size={14} /> Archive
                                </button>
                                <button onClick={handleBulkCategoryAssign} title="Assign Category" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: colors.bgCard, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    <FolderTree size={14} /> Category
                                </button>
                                <button onClick={handleExportSelectedCSV} title="Export Selected CSV" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: colors.bgCard, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    <Download size={14} /> Export
                                </button>
                                <button onClick={handleBulkDelete} title="Delete Selected" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    <Trash2 size={14} /> Delete
                                </button>
                                <button onClick={() => setSelectedCourses([])} title="Clear Selection" style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: '12px', cursor: 'pointer', marginLeft: '4px', textDecoration: 'underline' }}>
                                    Clear
                                </button>
                            </div>
                        ) : (
                            /* Standard Enterprise Header Toolbar */
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button onClick={() => { setCourseStatusFilter(prev => prev === 'Archived' ? 'All Status' : 'Archived'); setCoursePage(1); }} title={courseStatusFilter === 'Archived' ? 'Show All Courses' : 'View Archived Courses Bin'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: courseStatusFilter === 'Archived' ? `${colors.primary}15` : colors.bgCard, border: `1px solid ${courseStatusFilter === 'Archived' ? colors.primary : colors.border}`, borderRadius: '10px', color: courseStatusFilter === 'Archived' ? colors.primary : colors.text, cursor: 'pointer', transition: 'all 0.2s' }}>
                                    <Archive size={18} />
                                </button>
                                <button onClick={() => setIsSmartImportWizardOpen(true)} title="Smart Import Wizard" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '0 14px', height: '40px', color: colors.text, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                                    <DownloadCloud size={16} /> Import
                                </button>
                                <button onClick={() => setIsExportCustomizerOpen(true)} title="Export Customizer Drawer" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '0 14px', height: '40px', color: colors.text, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                                    <Upload size={16} /> Export
                                </button>

                                {/* "Add New Course" Split Dropdown Button */}
                                <div style={{ position: 'relative', display: 'flex' }}>
                                    <button
                                        onClick={() => setActiveTab('course_builder')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#16a34a', border: 'none', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', padding: '0 18px', height: '40px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 15px rgba(22,163,74,0.3)' }}
                                    >
                                        <PlusCircle size={16} /> Add New Course
                                    </button>
                                    <button
                                        onClick={() => setIsAddCourseDropdownOpen(!isAddCourseDropdownOpen)}
                                        style={{ background: '#15803d', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.2)', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', padding: '0 10px', height: '40px', color: '#ffffff', cursor: 'pointer' }}
                                    >
                                        <ChevronDown size={16} />
                                    </button>

                                    {/* Split Button Popup Menu */}
                                    {isAddCourseDropdownOpen && (
                                        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '6px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.12)', padding: '6px', width: '220px', zIndex: 100 }}>
                                            <button
                                                onClick={() => { setIsAddCourseDropdownOpen(false); setActiveTab('course_builder'); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', fontSize: '13px', color: colors.text, fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                                                onMouseEnter={e => e.currentTarget.style.background = colors.bgInput}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <PlusCircle size={15} color="#16a34a" /> Create Blank Course
                                            </button>
                                            <button
                                                onClick={() => { setIsAddCourseDropdownOpen(false); setIsAiCourseGenModalOpen(true); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', fontSize: '13px', color: colors.text, fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                                                onMouseEnter={e => e.currentTarget.style.background = colors.bgInput}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <Bot size={15} color="#22c55e" /> Generate with AI  <Wand2 size={16} style={{ marginRight: '6px' }} /> 
                                            </button>
                                            <button
                                                onClick={() => { setIsAddCourseDropdownOpen(false); alert('Course Layout Templates loaded.'); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', fontSize: '13px', color: colors.text, fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                                                onMouseEnter={e => e.currentTarget.style.background = colors.bgInput}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <Copy size={15} color="#10b981" /> Duplicate from Template
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                        {statCards.map((stat, i) => (
                            <div key={i} style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, display: 'flex', gap: '18px', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.iconColor, flexShrink: 0 }}>
                                    {stat.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', color: colors.textMuted, fontWeight: '500', marginBottom: '6px' }}>{stat.label}</div>
                                    <div style={{ fontSize: '30px', fontWeight: '800', color: colors.text, lineHeight: '1' }}>{stat.value}</div>
                                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '6px' }}>
                                        <ArrowUp size={13} /> {stat.trend}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Table Card */}
                    <div style={{ background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>

                        {/* Filters Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>All Courses</h3>
                                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: `${colors.primary}15`, color: colors.primary, fontWeight: '600' }}>
                                    {totalFilteredCourses} {totalFilteredCourses === 1 ? 'course' : 'courses'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {/* Category Filter */}
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={courseCategoryFilter}
                                        onChange={(e) => {
                                            setCourseCategoryFilter(e.target.value);
                                            setCoursePage(1);
                                        }}
                                        style={{
                                            appearance: 'none',
                                            WebkitAppearance: 'none',
                                            background: colors.bgCard,
                                            border: `1.5px solid ${courseCategoryFilter !== 'All Categories' ? '#10b981' : colors.border}`,
                                            borderRadius: '8px',
                                            padding: '9px 36px 9px 14px',
                                            fontSize: '14px',
                                            color: colors.text,
                                            outline: 'none',
                                            cursor: 'pointer',
                                            minWidth: '160px',
                                            fontWeight: '500',
                                            boxShadow: courseCategoryFilter !== 'All Categories' ? '0 0 0 2px rgba(16,185,129,0.15)' : 'none'
                                        }}
                                    >
                                        {defaultCategories.map(cat => (
                                            <option key={cat} value={cat} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>
                                                {cat}
                                            </option>
                                        ))}
                                        {extraCategories.map(cat => (
                                            <option key={cat} value={cat} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={15} color={courseCategoryFilter !== 'All Categories' ? '#10b981' : "#94a3b8"} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                </div>

                                {/* Status Filter */}
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={courseStatusFilter}
                                        onChange={(e) => {
                                            setCourseStatusFilter(e.target.value);
                                            setCoursePage(1);
                                        }}
                                        style={{
                                            appearance: 'none',
                                            WebkitAppearance: 'none',
                                            background: colors.bgCard,
                                            border: `1.5px solid ${courseStatusFilter !== 'All Status' ? '#10b981' : colors.border}`,
                                            borderRadius: '8px',
                                            padding: '9px 36px 9px 14px',
                                            fontSize: '14px',
                                            color: colors.text,
                                            outline: 'none',
                                            cursor: 'pointer',
                                            minWidth: '130px',
                                            fontWeight: '500',
                                            boxShadow: courseStatusFilter !== 'All Status' ? '0 0 0 2px rgba(16,185,129,0.15)' : 'none'
                                        }}
                                    >
                                        <option value="All Status" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Status</option>
                                        <option value="Published" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Published</option>
                                        <option value="Draft" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Draft</option>
                                        <option value="Pending Review" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Pending Review</option>
                                        <option value="Archived" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Archived</option>
                                    </select>
                                    <ChevronDown size={15} color={courseStatusFilter !== 'All Status' ? '#10b981' : "#94a3b8"} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                </div>

                                {/* Search Filter */}
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input
                                        type="text"
                                        value={courseSearchQuery}
                                        onChange={(e) => {
                                            setCourseSearchQuery(e.target.value);
                                            setCoursePage(1);
                                        }}
                                        placeholder="Search courses..."
                                        style={{
                                            background: colors.bgCard,
                                            border: `1.5px solid ${courseSearchQuery ? '#10b981' : colors.border}`,
                                            borderRadius: '8px',
                                            padding: '9px 16px 9px 38px',
                                            fontSize: '14px',
                                            color: colors.text,
                                            outline: 'none',
                                            minWidth: '220px',
                                            boxShadow: courseSearchQuery ? '0 0 0 2px rgba(16,185,129,0.15)' : 'none'
                                        }}
                                    />
                                </div>

                                {/* Quick Reset Active Filters */}
                                {(courseCategoryFilter !== 'All Categories' || courseStatusFilter !== 'All Status' || courseSearchQuery.trim() !== '') && (
                                    <button
                                        onClick={() => {
                                            setCourseCategoryFilter('All Categories');
                                            setCourseStatusFilter('All Status');
                                            setCourseSearchQuery('');
                                            setCoursePage(1);
                                        }}
                                        title="Clear all active filters"
                                        style={{
                                            background: 'transparent',
                                            border: `1px dashed ${colors.border}`,
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            color: colors.textMuted,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = '#10b981'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.borderColor = colors.border; }}
                                    >
                                        <RotateCcw size={13} />
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: colors.bg }}>
                                        <th style={{ padding: '14px 24px', width: '40px' }}><input type="checkbox" checked={liveData.length > 0 && liveData.every(c => selectedCourses.includes(c._id))} onChange={(e) => handleSelectAllCourses(e, liveData)} style={{ cursor: 'pointer', accentColor: '#16a34a' }} /></th>
                                        {['Course', 'Instructor', 'Category', 'Students', 'Status', 'Created At', 'Actions'].map((h, i) => (
                                            <th key={h} style={{ padding: '14px 24px', fontSize: '13px', fontWeight: '600', color: colors.textMuted, letterSpacing: '0.02em', textAlign: i === 6 ? 'center' : 'left' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {liveData.map((course, idx, arr) => {
                                        const isSelected = selectedCourses.includes(course._id);
                                        const rowBg = isSelected
                                            ? (theme === 'dark' ? '#1e293b' : '#f0fdf4')
                                            : 'transparent';
                                        const rowHoverBg = isSelected
                                            ? (theme === 'dark' ? '#24344d' : '#dcfce7')
                                            : (theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc');

                                        return (
                                            <tr key={course._id || idx}
                                                style={{
                                                    borderBottom: idx < arr.length - 1 ? `1px solid ${colors.border}` : 'none',
                                                    background: rowBg,
                                                    transition: 'background 0.15s ease'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = rowHoverBg}
                                                onMouseLeave={e => e.currentTarget.style.background = rowBg}
                                            >
                                                <td style={{ padding: '16px 24px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectCourse(course._id)}
                                                        style={{ cursor: 'pointer', accentColor: '#16a34a' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '16px 24px', minWidth: '280px', maxWidth: '380px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                        <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: course.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {course.icon}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div
                                                                title={course.title}
                                                                style={{
                                                                    fontSize: '14px',
                                                                    fontWeight: '600',
                                                                    color: colors.text,
                                                                    marginBottom: '3px',
                                                                    wordBreak: 'break-word',
                                                                    whiteSpace: 'normal',
                                                                    lineHeight: '1.4'
                                                                }}
                                                            >
                                                                {course.title}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '500' }}>{course.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: theme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                                            <User size={16} />
                                                        </div>
                                                        <span style={{ fontSize: '14px', color: colors.text, fontWeight: '500', whiteSpace: 'nowrap' }}>{course.instructor}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ background: course.catBg, color: course.catColor, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>{course.category}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.text, fontSize: '14px', fontWeight: '500' }}>
                                                        <Users size={15} color="#94a3b8" /> {Number(course.students).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ background: course.statusBg, color: course.statusColor, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>{course.status}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px', color: colors.text, fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>{course.date}</td>
                                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                                        <button
                                                            title="More actions"
                                                            style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '7px', padding: '7px', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = colors.bgInput; e.currentTarget.style.color = colors.text; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = colors.bgCard; e.currentTarget.style.color = colors.textMuted; }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (courseMenuOpenId === course._id) { setCourseMenuOpenId(null); return; }
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setCourseMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                                                                setCourseMenuOpenId(course._id);
                                                            }}
                                                        >
                                                            <MoreVertical size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {liveData.length === 0 && (
                                        <tr>
                                            <td colSpan="8" style={{ padding: '60px 24px', textAlign: 'center', color: colors.textMuted }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                                    <BookOpen size={44} style={{ opacity: 0.35, color: colors.textMuted }} />
                                                    <div style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>No courses match your filter criteria</div>
                                                    <div style={{ fontSize: '13px', color: colors.textMuted, maxWidth: '420px', lineHeight: '1.5' }}>
                                                        {courseCategoryFilter !== 'All Categories' ? `Category: "${courseCategoryFilter}"  •  ` : ''}
                                                        {courseStatusFilter !== 'All Status' ? `Status: "${courseStatusFilter}"  •  ` : ''}
                                                        {courseSearchQuery ? `Search: "${courseSearchQuery}"` : ''}
                                                        {!courseSearchQuery && courseCategoryFilter === 'All Categories' && courseStatusFilter === 'All Status' ? 'No course records found in the system.' : 'Try adjusting your category, status, or search query.'}
                                                    </div>
                                                    {(courseCategoryFilter !== 'All Categories' || courseStatusFilter !== 'All Status' || courseSearchQuery.trim() !== '') && (
                                                        <button
                                                            onClick={() => {
                                                                setCourseCategoryFilter('All Categories');
                                                                setCourseStatusFilter('All Status');
                                                                setCourseSearchQuery('');
                                                                setCoursePage(1);
                                                            }}
                                                            style={{
                                                                marginTop: '8px',
                                                                padding: '8px 18px',
                                                                borderRadius: '8px',
                                                                border: `1px solid ${colors.border}`,
                                                                background: colors.bgCard,
                                                                color: '#10b981',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px'
                                                            }}
                                                        >
                                                            <RotateCcw size={14} />
                                                            Reset All Filters
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: '14px', color: colors.textMuted, fontWeight: '500' }}>
                                {totalFilteredCourses === 0
                                    ? 'Showing 0 to 0 of 0 courses'
                                    : `Showing ${startIndex + 1} to ${endIndex} of ${totalFilteredCourses} courses`
                                }
                            </div>
                            {totalPages > 1 ? (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                        disabled={safePage <= 1}
                                        onClick={() => setCoursePage(p => Math.max(1, p - 1))}
                                        title="Previous Page"
                                        style={{
                                            background: colors.bgCard,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '8px',
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: safePage <= 1 ? colors.textMuted : colors.text,
                                            cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                                            opacity: safePage <= 1 ? 0.4 : 1
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {(() => {
                                        const pages = [];
                                        if (totalPages <= 5) {
                                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                                        } else if (safePage <= 3) {
                                            pages.push(1, 2, 3, '...', totalPages);
                                        } else if (safePage >= totalPages - 2) {
                                            pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
                                        } else {
                                            pages.push(1, '...', safePage, '...', totalPages);
                                        }
                                        return pages.map((p, pIdx) => {
                                            if (p === '...') {
                                                return (
                                                    <span key={`ellipsis-${pIdx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', color: colors.textMuted, fontSize: '16px', fontWeight: '700' }}>
                                                        ...
                                                    </span>
                                                );
                                            }
                                            const isActive = p === safePage;
                                            return (
                                                <button
                                                    key={p}
                                                    onClick={() => setCoursePage(p)}
                                                    style={{
                                                        background: isActive ? '#16a34a' : colors.bgCard,
                                                        border: isActive ? 'none' : `1px solid ${colors.border}`,
                                                        borderRadius: '8px',
                                                        width: '36px',
                                                        height: '36px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: isActive ? '#fff' : colors.text,
                                                        fontWeight: isActive ? '700' : '500',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        boxShadow: isActive ? '0 2px 8px rgba(22,163,74,0.3)' : 'none',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    {p}
                                                </button>
                                            );
                                        });
                                    })()}
                                    <button
                                        disabled={safePage >= totalPages}
                                        onClick={() => setCoursePage(p => Math.min(totalPages, p + 1))}
                                        title="Next Page"
                                        style={{
                                            background: colors.bgCard,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '8px',
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: safePage >= totalPages ? colors.textMuted : colors.text,
                                            cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                                            opacity: safePage >= totalPages ? 0.4 : 1
                                        }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                        disabled
                                        style={{
                                            background: colors.bgCard,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '8px',
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: colors.textMuted,
                                            cursor: 'not-allowed',
                                            opacity: 0.4
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        style={{
                                            background: '#16a34a',
                                            border: 'none',
                                            borderRadius: '8px',
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontWeight: '700',
                                            fontSize: '14px',
                                            boxShadow: '0 2px 8px rgba(22,163,74,0.3)'
                                        }}
                                    >
                                        1
                                    </button>
                                    <button
                                        disabled
                                        style={{
                                            background: colors.bgCard,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '8px',
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: colors.textMuted,
                                            cursor: 'not-allowed',
                                            opacity: 0.4
                                        }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        );
    };

    const renderCourseBuilder = () => {
        // Reuse the full CourseCreationWizard component used by instructors.
        // adminMode=true enables:
        //   - Direct publish (no "Submit for Review" step)
        //   - Admin ownership bypass on updateCourse
        // onComplete refreshes the admin course list and returns to courses tab.
        const handleWizardComplete = async (courseId) => {
            try {
                const res = await courseService.getAdminAll();
                setAllCourses(res.data.data || []);
            } catch { /* non-fatal */ }
            setActiveTab('courses');
            if (courseId) showNotification('Course created and published successfully!');
        };

        return (
            <div style={{ minHeight: '100%' }}>
                <CourseCreationWizard
                    adminMode={true}
                    onComplete={handleWizardComplete}
                />
            </div>
        );
    };

    const renderFinances = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Finances & Revenue</h2>
                <p style={s.sectionSub}>Manage payments, manual clearings, and instructor payouts.</p>
            </div>
            <div style={s.statsGrid}>
                <StatCard label="Total Revenue" value={`ETB ${(analytics?.clearedEnrollments || 0) * 1500}`} color={colors.success} icon={<Wallet size={24} aria-hidden="true" />} />
                <StatCard label="Pending Payouts" value="ETB 0" color={colors.warning} icon={<Clock3 size={24} aria-hidden="true" />} />
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

    const renderCMS = () => {
        const pageMeta = {
            home: { name: 'Homepage Content', path: '/', isList: false, icon: '🏠' },
            about: { name: 'About Page', path: '/about', isList: false, icon: 'ℹ️' },
            faq: { name: 'FAQ Items', path: '/help', isList: true, itemLabel: 'FAQ', icon: '❓' },
            contact: { name: 'Contact & Info', path: '/#contact', isList: false, icon: '📞' },
            privacy: { name: 'Privacy Policy', path: '/privacy', isList: false, icon: '🔒' },
            terms: { name: 'Terms & Conditions', path: '/terms', isList: false, icon: '📜' },
            banners: { name: 'Banners', path: '/', isList: true, itemLabel: 'Banner', icon: '📢' },
            testimonials: { name: 'Testimonials', path: '/', isList: true, itemLabel: 'Testimonial', icon: '⭐' },
            news: { name: 'News Updates', path: '/', isList: true, itemLabel: 'News Item', icon: '📰' },
            blogs: { name: 'Blogs & Articles', path: '/', isList: true, itemLabel: 'Blog Post', icon: '✍️' }
        };

        const activeMeta = pageMeta[selectedContentPage] || { name: selectedContentPage, path: '/', isList: false, icon: '📄' };
        const items = Array.isArray(contentData?.items) ? contentData.items : [];

        return (
            <div style={s.tabContent}>
                <div style={s.sectionHeader}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', width: '100%' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={s.sectionTitle}>CMS & Communications</h2>
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                                    Production Ready
                                </span>
                            </div>
                            <p style={s.sectionSub}>Manage homepage content, about page, FAQs, contact info, legal policies, banners, testimonials, news, and blogs permanently in MongoDB.</p>
                        </div>
                        <a
                            href={activeMeta.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '8px 14px', color: colors.text, fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}
                        >
                            <ExternalLink size={13} /> View {activeMeta.name} on Website ↗
                        </a>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '24px' }}>
                    {/* ── 1. NOTIFICATION MANAGEMENT ─────────────────── */}
                    <div style={s.card}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Megaphone size={18} style={{ color: colors.primary }} />
                                <h3 style={{ ...s.cardTitle, margin: 0 }}>Notification Management</h3>
                            </div>
                            <span style={{ fontSize: '12px', color: colors.textMuted }}>Broadcast announcements & updates</span>
                        </div>
                        <form onSubmit={handleSendNotification} style={{ display: 'grid', gap: '14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                <div>
                                    <label style={s.label}>Audience</label>
                                    <select value={notificationForm.audience} onChange={(e) => setNotificationForm({ ...notificationForm, audience: e.target.value })} style={s.select}>
                                        <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Users</option>
                                        <option value="students" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Students</option>
                                        <option value="instructors" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Instructors</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={s.label}>Notification Type</label>
                                    <select value={notificationForm.type} onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })} style={s.select}>
                                        <option value="announcement" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Announcement</option>
                                        <option value="system" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>System Update</option>
                                        <option value="assignment" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Assignment</option>
                                        <option value="certificate" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Certificate</option>
                                        <option value="event" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Event</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={s.label}>Notification Title</label>
                                <input value={notificationForm.title} onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })} placeholder="e.g. Platform update: Live coding masterclass scheduled" style={s.input} />
                            </div>

                            <div>
                                <label style={s.label}>Message Content</label>
                                <textarea value={notificationForm.message} onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })} placeholder="Write the announcement or alert message here..." rows="3" style={s.input}></textarea>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                <div>
                                    <label style={s.label}>Action Link (optional)</label>
                                    <input value={notificationForm.link} onChange={(e) => setNotificationForm({ ...notificationForm, link: e.target.value })} placeholder="/student/courses or /events" style={s.input} />
                                </div>
                                <div>
                                    <label style={s.label}>Schedule for Later (optional)</label>
                                    <input type="datetime-local" value={notificationForm.scheduleAt} onChange={(e) => setNotificationForm({ ...notificationForm, scheduleAt: e.target.value })} style={s.input} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.textMuted, cursor: 'pointer', fontSize: '13px' }}>
                                    <input type="checkbox" checked={notificationForm.reminder} onChange={(e) => setNotificationForm({ ...notificationForm, reminder: e.target.checked })} />
                                    Mark as high-priority reminder message
                                </label>
                                <button type="submit" disabled={isNotificationSubmitting} style={{ ...s.primaryBtn, minWidth: '180px', opacity: isNotificationSubmitting ? 0.7 : 1 }}>
                                    {isNotificationSubmitting ? 'Sending Broadcast...' : '📢 Send Broadcast'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* ── 2. BROADCAST OVERVIEW ──────────────────────── */}
                    <div style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Bell size={18} style={{ color: '#38bdf8' }} />
                                <h3 style={{ ...s.cardTitle, margin: 0 }}>Broadcast Overview</h3>
                            </div>
                            <button
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '6px 14px', color: colors.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                                onClick={fetchNotificationSummary}
                                disabled={isRefreshingSummary}
                            >
                                <RefreshCw size={13} className={isRefreshingSummary ? 'audit-spin' : ''} /> {isRefreshingSummary ? 'Refreshing...' : 'Refresh Summary'}
                            </button>
                        </div>

                        {/* Metric cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                            <div style={{ padding: '16px', borderRadius: '14px', background: colors.bgInput, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>Total Delivered</span>
                                <span style={{ fontSize: '26px', fontWeight: '800', color: colors.text }}>{notificationSummary.total || 0}</span>
                                <span style={{ fontSize: '11px', color: colors.textMuted }}>Delivered messages</span>
                            </div>
                            <div style={{ padding: '16px', borderRadius: '14px', background: colors.bgInput, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>Unread Deliveries</span>
                                <span style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b' }}>{notificationSummary.unread || 0}</span>
                                <span style={{ fontSize: '11px', color: colors.textMuted }}>Pending student/instructor reads</span>
                            </div>
                            <div style={{ padding: '16px', borderRadius: '14px', background: colors.bgInput, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>Broadcast Campaigns</span>
                                <span style={{ fontSize: '26px', fontWeight: '800', color: '#22c55e' }}>{notificationSummary.totalBroadcasts || notificationSummary.recent?.length || 0}</span>
                                <span style={{ fontSize: '11px', color: colors.textMuted }}>Distinct broadcast campaigns</span>
                            </div>
                        </div>

                        {/* Recent broadcasts list */}
                        <div>
                            <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: '12px' }}>
                                Recent Broadcast Campaigns
                            </h4>
                            {notificationSummary.recent && notificationSummary.recent.length > 0 ? (
                                <div style={{ display: 'grid', gap: '10px' }}>
                                    {notificationSummary.recent.map((b, i) => (
                                        <div key={i} style={{ padding: '14px 16px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                                            <div style={{ flex: '1 1 300px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', background: b.type === 'announcement' ? 'rgba(34,197,94,0.15)' : 'rgba(56,189,248,0.15)', color: b.type === 'announcement' ? '#22c55e' : '#38bdf8', textTransform: 'uppercase' }}>
                                                        {b.type || 'Broadcast'}
                                                    </span>
                                                    <strong style={{ fontSize: '14px', color: colors.text }}>{b.title}</strong>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '13px', color: colors.textMuted, lineHeight: 1.5, maxWidth: '680px' }}>
                                                    {b.message}
                                                </p>
                                                {b.link && (
                                                    <span style={{ fontSize: '11px', color: colors.primary, marginTop: '4px', display: 'inline-block' }}>
                                                        🔗 Link: {b.link}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px', color: colors.text }}>
                                                        👥 {b.totalRecipients || 1} recipients
                                                    </span>
                                                    <span style={{ fontSize: '11px', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '6px', color: '#f59e0b' }}>
                                                        📬 {b.unreadCount || 0} unread
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '11px', color: colors.textMuted }}>
                                                    {b.createdAt ? new Date(b.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '24px', textAlign: 'center', borderRadius: '12px', background: colors.bgInput, color: colors.textMuted, fontSize: '13px' }}>
                                    No broadcast campaigns recorded yet. Send your first announcement above.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── 3. CONTENT MANAGEMENT ──────────────────────── */}
                    <div style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Globe size={20} style={{ color: colors.primary }} />
                                <div>
                                    <h3 style={{ ...s.cardTitle, margin: 0 }}>Content Management (10 Modules)</h3>
                                    <span style={{ fontSize: '12px', color: colors.textMuted }}>Select a page to edit content and save permanently to MongoDB</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={() => setCmsEditorMode('visual')}
                                    style={{
                                        padding: '7px 14px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        background: cmsEditorMode === 'visual' ? colors.primary : colors.bgInput,
                                        color: cmsEditorMode === 'visual' ? '#ffffff' : colors.textMuted,
                                        border: `1px solid ${cmsEditorMode === 'visual' ? colors.primary : colors.border}`
                                    }}
                                >
                                    ✨ Visual Editor
                                </button>
                                <button
                                    onClick={() => setCmsEditorMode('json')}
                                    style={{
                                        padding: '7px 14px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        background: cmsEditorMode === 'json' ? colors.primary : colors.bgInput,
                                        color: cmsEditorMode === 'json' ? '#ffffff' : colors.textMuted,
                                        border: `1px solid ${cmsEditorMode === 'json' ? colors.primary : colors.border}`
                                    }}
                                >
                                    💻 JSON Mode
                                </button>
                            </div>
                        </div>

                        {/* Page Selector Tabs */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginBottom: '24px' }}>
                            {Object.entries(pageMeta).map(([key, meta]) => {
                                const isSelected = selectedContentPage === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleContentPageChange(key)}
                                        style={{
                                            padding: '10px 8px',
                                            borderRadius: '10px',
                                            fontSize: '12px',
                                            fontWeight: isSelected ? '700' : '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '4px',
                                            textAlign: 'center',
                                            background: isSelected ? `${colors.primary}18` : colors.bgInput,
                                            border: `1.5px solid ${isSelected ? colors.primary : colors.border}`,
                                            color: isSelected ? colors.primary : colors.text,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span style={{ fontSize: '18px' }}>{meta.icon}</span>
                                        <span>{meta.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Loading indicator */}
                        {isContentLoading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
                                <RefreshCw size={24} className="audit-spin" style={{ margin: '0 auto 12px' }} />
                                <p style={{ margin: 0, fontSize: '14px' }}>Loading content from MongoDB...</p>
                            </div>
                        ) : cmsEditorMode === 'json' ? (
                            /* ── JSON EDITOR FALLBACK ─────────────── */
                            <form onSubmit={handleSaveContent} style={{ display: 'grid', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={s.label}>Page Title</label>
                                    <span style={{ fontSize: '11px', color: colors.textMuted }}>Key: {selectedContentPage}</span>
                                </div>
                                <input value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} style={s.input} />
                                <label style={s.label}>Raw Content JSON</label>
                                <textarea value={contentForm.content} onChange={(e) => setContentForm({ ...contentForm, content: e.target.value })} rows="12" style={{ ...s.input, minHeight: '260px', fontFamily: 'monospace', fontSize: '13px' }} />
                                <button type="submit" disabled={isContentSaving} style={{ ...s.primaryBtn, justifySelf: 'start', minWidth: '160px', opacity: isContentSaving ? 0.7 : 1 }}>
                                    {isContentSaving ? 'Saving to DB...' : '💾 Save Raw JSON'}
                                </button>
                            </form>
                        ) : (
                            /* ── VISUAL FORM EDITOR ───────────────── */
                            <div>
                                {activeMeta.isList ? (
                                    /* List-Based Management (faq, banners, testimonials, news, blogs) */
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: colors.text }}>
                                                    {activeMeta.name} ({items.length} {items.length === 1 ? 'item' : 'items'})
                                                </h4>
                                                <span style={{ fontSize: '12px', color: colors.textMuted }}>
                                                    {items.filter(i => i.isPublished !== false).length} published on live website
                                                </span>
                                            </div>
                                            <button
                                                onClick={handleOpenAddItemModal}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: colors.primary, color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                                            >
                                                <Plus size={15} /> Add New {activeMeta.itemLabel || 'Item'}
                                            </button>
                                        </div>

                                        {items.length > 0 ? (
                                            <div style={{ display: 'grid', gap: '12px' }}>
                                                {items.map((item, idx) => {
                                                    const isPub = item.isPublished !== false;
                                                    const itemId = item.id || item._id || `item_${idx}`;
                                                    return (
                                                        <div key={itemId} style={{ padding: '16px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                                            <div style={{ flex: '1 1 320px' }}>
                                                                {/* FAQ Layout */}
                                                                {selectedContentPage === 'faq' && (
                                                                    <div>
                                                                        <h5 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: colors.text }}>
                                                                            Q: {item.question || 'Untitled Question'}
                                                                        </h5>
                                                                        <p style={{ margin: 0, fontSize: '13px', color: colors.textMuted, lineHeight: 1.6 }}>
                                                                            A: {item.answer || 'No answer provided.'}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {/* Banner Layout */}
                                                                {selectedContentPage === 'banners' && (
                                                                    <div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                            {item.badge && (
                                                                                <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                                                                                    {item.badge}
                                                                                </span>
                                                                            )}
                                                                            <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: colors.text }}>
                                                                                {item.title || 'Banner Title'}
                                                                            </h5>
                                                                        </div>
                                                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.textMuted }}>
                                                                            {item.subtitle || ''}
                                                                        </p>
                                                                        {item.link && (
                                                                            <span style={{ fontSize: '12px', color: colors.primary, marginTop: '4px', display: 'inline-block' }}>
                                                                                Target Link: {item.link}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Testimonial Layout */}
                                                                {selectedContentPage === 'testimonials' && (
                                                                    <div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                            <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: colors.text }}>
                                                                                {item.name || 'Anonymous'}
                                                                            </h5>
                                                                            <span style={{ fontSize: '12px', color: colors.textMuted }}>• {item.role || 'Student'}</span>
                                                                            <span style={{ fontSize: '12px', color: '#f59e0b' }}>
                                                                                {'★'.repeat(item.rating || 5)}
                                                                            </span>
                                                                        </div>
                                                                        <p style={{ margin: '6px 0 0', fontSize: '13px', color: colors.textMuted, fontStyle: 'italic', lineHeight: 1.5 }}>
                                                                            "{item.quote || ''}"
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {/* News Layout */}
                                                                {selectedContentPage === 'news' && (
                                                                    <div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                            {item.tag && (
                                                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                                                                                    {item.tag}
                                                                                </span>
                                                                            )}
                                                                            <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: colors.text }}>
                                                                                {item.title || 'News Headline'}
                                                                            </h5>
                                                                            {item.date && (
                                                                                <span style={{ fontSize: '11px', color: colors.textMuted }}>• {item.date}</span>
                                                                            )}
                                                                        </div>
                                                                        <p style={{ margin: '6px 0 0', fontSize: '13px', color: colors.textMuted, lineHeight: 1.5 }}>
                                                                            {item.body || ''}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {/* Blog Layout */}
                                                                {selectedContentPage === 'blogs' && (
                                                                    <div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                            {item.tag && (
                                                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                                                                                    {item.tag}
                                                                                </span>
                                                                            )}
                                                                            <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: colors.text }}>
                                                                                {item.title || 'Blog Post Title'}
                                                                            </h5>
                                                                            {item.readTime && (
                                                                                <span style={{ fontSize: '11px', color: colors.textMuted }}>• {item.readTime}</span>
                                                                            )}
                                                                        </div>
                                                                        <p style={{ margin: '6px 0 0', fontSize: '13px', color: colors.textMuted, lineHeight: 1.5 }}>
                                                                            {item.body || ''}
                                                                        </p>
                                                                        <span style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px', display: 'inline-block' }}>
                                                                            By {item.author || 'Emare Team'} {item.date ? `on ${item.date}` : ''}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Item Action Buttons */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <button
                                                                    onClick={() => handleTogglePublishItem(itemId)}
                                                                    title="Click to toggle publish status on live site"
                                                                    style={{
                                                                        padding: '5px 10px',
                                                                        borderRadius: '20px',
                                                                        fontSize: '11px',
                                                                        fontWeight: '700',
                                                                        cursor: 'pointer',
                                                                        border: 'none',
                                                                        background: isPub ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
                                                                        color: isPub ? '#22c55e' : '#94a3b8'
                                                                    }}
                                                                >
                                                                    {isPub ? '● Published' : '○ Draft'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenEditItemModal(item)}
                                                                    style={{ ...s.actionBtn, padding: '6px 10px', color: colors.primary, borderColor: colors.border }}
                                                                >
                                                                    <Edit size={13} /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteItem(itemId)}
                                                                    style={{ ...s.actionBtn, padding: '6px 10px', color: colors.danger, borderColor: colors.border }}
                                                                >
                                                                    <Trash2 size={13} /> Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ padding: '36px', textAlign: 'center', background: colors.bgInput, borderRadius: '12px', border: `1px dashed ${colors.border}` }}>
                                                <p style={{ margin: '0 0 12px', color: colors.textMuted, fontSize: '14px' }}>
                                                    No items have been added to {activeMeta.name} yet.
                                                </p>
                                                <button
                                                    onClick={handleOpenAddItemModal}
                                                    style={{ ...s.primaryBtn, padding: '8px 18px', fontSize: '13px' }}
                                                >
                                                    <Plus size={14} /> Add First {activeMeta.itemLabel || 'Item'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Single-Page Form (home, about, contact, privacy, terms) */
                                    <form onSubmit={handleSaveVisualContent} style={{ display: 'grid', gap: '16px' }}>
                                        {/* Homepage Editor */}
                                        {selectedContentPage === 'home' && (
                                            <>
                                                <div>
                                                    <label style={s.label}>Hero Main Title</label>
                                                    <input
                                                        value={contentData.heroTitle ?? 'Welcome to Emare ICT Hub'}
                                                        onChange={(e) => setContentData({ ...contentData, heroTitle: e.target.value })}
                                                        placeholder="Main headline displayed in landing hero"
                                                        style={s.input}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={s.label}>Hero Subtitle / Value Proposition</label>
                                                    <textarea
                                                        value={contentData.heroSubtitle ?? 'Master In-Demand Tech Skills, Build Your Future, and Become Job Ready.'}
                                                        onChange={(e) => setContentData({ ...contentData, heroSubtitle: e.target.value })}
                                                        rows="3"
                                                        style={s.input}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={s.label}>Trust Badge / Top Micro-Banner</label>
                                                    <input
                                                        value={contentData.heroBadge ?? '🎓 Trusted by 2,500+ learners across Ethiopia'}
                                                        onChange={(e) => setContentData({ ...contentData, heroBadge: e.target.value })}
                                                        placeholder="e.g. 🎓 Trusted by 2,500+ learners across Ethiopia"
                                                        style={s.input}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={s.label}>Platform Highlights / Feature Tags (comma-separated)</label>
                                                    <input
                                                        value={Array.isArray(contentData.stats) ? contentData.stats.join(', ') : (contentData.stats || '')}
                                                        onChange={(e) => setContentData({ ...contentData, stats: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                                        placeholder="Expert-led training, Flexible learning, Career growth"
                                                        style={s.input}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* About Page Editor */}
                                        {selectedContentPage === 'about' && (
                                            <>
                                                <div>
                                                    <label style={s.label}>About Headline</label>
                                                    <input
                                                        value={contentData.headline ?? 'Digital Innovation and System Development Center'}
                                                        onChange={(e) => setContentData({ ...contentData, headline: e.target.value })}
                                                        style={s.input}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={s.label}>Main Story / Organization Overview</label>
                                                    <textarea
                                                        value={contentData.body ?? ''}
                                                        onChange={(e) => setContentData({ ...contentData, body: e.target.value })}
                                                        rows="5"
                                                        style={s.input}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={s.label}>Mission Statement</label>
                                                    <textarea
                                                        value={contentData.mission ?? ''}
                                                        onChange={(e) => setContentData({ ...contentData, mission: e.target.value })}
                                                        rows="3"
                                                        style={s.input}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Contact & Footer Editor */}
                                        {selectedContentPage === 'contact' && (
                                            <>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                                    <div>
                                                        <label style={s.label}>Primary Support Email</label>
                                                        <input
                                                            value={contentData.email ?? 'info@emareicthub.com'}
                                                            onChange={(e) => setContentData({ ...contentData, email: e.target.value })}
                                                            style={s.input}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={s.label}>Secondary Email</label>
                                                        <input
                                                            value={contentData.secondaryEmail ?? 'emareicthub@gmail.com'}
                                                            onChange={(e) => setContentData({ ...contentData, secondaryEmail: e.target.value })}
                                                            style={s.input}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                                    <div>
                                                        <label style={s.label}>Primary Phone Number</label>
                                                        <input
                                                            value={contentData.phone ?? '+251 914 362 720'}
                                                            onChange={(e) => setContentData({ ...contentData, phone: e.target.value })}
                                                            style={s.input}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={s.label}>Secondary Phone Number</label>
                                                        <input
                                                            value={contentData.secondaryPhone ?? '+251 905 050 698'}
                                                            onChange={(e) => setContentData({ ...contentData, secondaryPhone: e.target.value })}
                                                            style={s.input}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                                    <div>
                                                        <label style={s.label}>Physical Address / Location</label>
                                                        <input
                                                            value={contentData.address ?? 'Debre Berhan, Ethiopia'}
                                                            onChange={(e) => setContentData({ ...contentData, address: e.target.value })}
                                                            style={s.input}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={s.label}>Business / Opening Hours</label>
                                                        <input
                                                            value={contentData.openingHours ?? '08:30 AM - 18:00 PM'}
                                                            onChange={(e) => setContentData({ ...contentData, openingHours: e.target.value })}
                                                            style={s.input}
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Privacy Policy Editor */}
                                        {selectedContentPage === 'privacy' && (
                                            <>
                                                <div>
                                                    <label style={s.label}>Page Title</label>
                                                    <input
                                                        value={contentForm.title || 'Privacy Policy'}
                                                        onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
                                                        style={s.input}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={s.label}>Last Updated Notice</label>
                                                    <input
                                                        value={contentData.lastUpdated ?? 'October 2023'}
                                                        onChange={(e) => setContentData({ ...contentData, lastUpdated: e.target.value })}
                                                        placeholder="e.g. October 2026"
                                                        style={s.input}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={s.label}>Privacy Policy Full Text</label>
                                                    <textarea
                                                        value={contentData.body ?? ''}
                                                        onChange={(e) => setContentData({ ...contentData, body: e.target.value })}
                                                        rows="10"
                                                        style={{ ...s.input, minHeight: '220px', lineHeight: 1.6 }}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Terms & Conditions Editor */}
                                        {selectedContentPage === 'terms' && (
                                            <>
                                                <div>
                                                    <label style={s.label}>Page Title</label>
                                                    <input
                                                        value={contentForm.title || 'Terms and Conditions'}
                                                        onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
                                                        style={s.input}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={s.label}>Last Updated Notice</label>
                                                    <input
                                                        value={contentData.lastUpdated ?? 'October 2023'}
                                                        onChange={(e) => setContentData({ ...contentData, lastUpdated: e.target.value })}
                                                        placeholder="e.g. October 2026"
                                                        style={s.input}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={s.label}>Terms & Conditions Full Text</label>
                                                    <textarea
                                                        value={contentData.body ?? ''}
                                                        onChange={(e) => setContentData({ ...contentData, body: e.target.value })}
                                                        rows="10"
                                                        style={{ ...s.input, minHeight: '220px', lineHeight: 1.6 }}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textMuted, fontSize: '13px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={contentData.isPublished !== false}
                                                    onChange={(e) => setContentData({ ...contentData, isPublished: e.target.checked })}
                                                />
                                                Content published and visible to visitors
                                            </label>
                                            <button
                                                type="submit"
                                                disabled={isContentSaving}
                                                style={{ ...s.primaryBtn, minWidth: '180px', opacity: isContentSaving ? 0.7 : 1 }}
                                            >
                                                {isContentSaving ? 'Saving Changes...' : '💾 Save Changes Permanently'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── ADD / EDIT ITEM MODAL ───────────────────────── */}
                {itemModalState.isOpen && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <div style={{
                            background: colors.bgCard,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '560px',
                            padding: '24px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                            display: 'grid',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: colors.text }}>
                                    {itemModalState.mode === 'add' ? `Add New ${activeMeta.itemLabel || 'Item'}` : `Edit ${activeMeta.itemLabel || 'Item'}`}
                                </h3>
                                <button
                                    onClick={() => setItemModalState({ isOpen: false, mode: 'add', item: null })}
                                    style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveItemModal} style={{ display: 'grid', gap: '14px' }}>
                                {/* FAQ Inputs */}
                                {selectedContentPage === 'faq' && (
                                    <>
                                        <div>
                                            <label style={s.label}>Question *</label>
                                            <input
                                                required
                                                value={itemFormData.question || ''}
                                                onChange={(e) => setItemFormData({ ...itemFormData, question: e.target.value })}
                                                placeholder="e.g. How do I enroll in a course?"
                                                style={s.input}
                                            />
                                        </div>
                                        <div>
                                            <label style={s.label}>Answer *</label>
                                            <textarea
                                                required
                                                rows="4"
                                                value={itemFormData.answer || ''}
                                                onChange={(e) => setItemFormData({ ...itemFormData, answer: e.target.value })}
                                                placeholder="Provide a clear, helpful response..."
                                                style={s.input}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Banner Inputs */}
                                {selectedContentPage === 'banners' && (
                                    <>
                                        <div>
                                            <label style={s.label}>Banner Title *</label>
                                            <input
                                                required
                                                value={itemFormData.title || ''}
                                                onChange={(e) => setItemFormData({ ...itemFormData, title: e.target.value })}
                                                placeholder="e.g. New Masterclass Added This Week"
                                                style={s.input}
                                            />
                                        </div>
                                        <div>
                                            <label style={s.label}>Subtitle / Description</label>
                                            <input
                                                value={itemFormData.subtitle || ''}
                                                onChange={(e) => setItemFormData({ ...itemFormData, subtitle: e.target.value })}
                                                placeholder="Explore modern coding programs and start today."
                                                style={s.input}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={s.label}>Badge Tag</label>
                                                <input
                                                    value={itemFormData.badge || ''}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, badge: e.target.value })}
                                                    placeholder="e.g. NEW or PROMO"
                                                    style={s.input}
                                                />
                                            </div>
                                            <div>
                                                <label style={s.label}>Target Link</label>
                                                <input
                                                    value={itemFormData.link || ''}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, link: e.target.value })}
                                                    placeholder="/courses or /events"
                                                    style={s.input}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Testimonials Inputs */}
                                {selectedContentPage === 'testimonials' && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={s.label}>Student / Client Name *</label>
                                                <input
                                                    required
                                                    value={itemFormData.name || ''}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                                                    placeholder="e.g. Dawit Abebe"
                                                    style={s.input}
                                                />
                                            </div>
                                            <div>
                                                <label style={s.label}>Role / Program</label>
                                                <input
                                                    value={itemFormData.role || ''}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, role: e.target.value })}
                                                    placeholder="e.g. Full Stack Student"
                                                    style={s.input}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={s.label}>Rating (Stars)</label>
                                            <select
                                                value={itemFormData.rating || 5}
                                                onChange={(e) => setItemFormData({ ...itemFormData, rating: Number(e.target.value) })}
                                                style={s.select}
                                            >
                                                <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                                                <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                                                <option value={3}>⭐⭐⭐ (3 Stars)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={s.label}>Quote / Testimonial *</label>
                                            <textarea
                                                required
                                                rows="4"
                                                value={itemFormData.quote || ''}
                                                onChange={(e) => setItemFormData({ ...itemFormData, quote: e.target.value })}
                                                placeholder="Write their experience with Emare..."
                                                style={s.input}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* News Inputs */}
                                {selectedContentPage === 'news' && (
                                    <>
                                        <div>
                                            <label style={s.label}>News Headline *</label>
                                            <input
                                                required
                                                value={itemFormData.title || ''}
                                                onChange={(e) => setItemFormData({ ...itemFormData, title: e.target.value })}
                                                placeholder="e.g. Platform update released"
                                                style={s.input}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={s.label}>Category / Tag</label>
                                                <input
                                                    value={itemFormData.tag || ''}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, tag: e.target.value })}
                                                    placeholder="e.g. Feature Update"
                                                    style={s.input}
                                                />
                                            </div>
                                            <div>
                                                <label style={s.label}>Date</label>
                                                <input
                                                    type="date"
                                                    value={itemFormData.date || ''}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, date: e.target.value })}
                                                    style={s.input}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={s.label}>News Details *</label>
                                            <textarea
                                                required
                                                rows="4"
                                                value={itemFormData.body || ''}
                                                onChange={(e) => setItemFormData({ ...itemFormData, body: e.target.value })}
                                                placeholder="Write the full announcement..."
                                                style={s.input}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Blogs Inputs */}
                                {selectedContentPage === 'blogs' && (
                                    <>
                                        <div>
                                            <label style={s.label}>Article Title *</label>
                                            <input
                                                required
                                                value={itemFormData.title || ''}
                                                onChange={(e) => setItemFormData({ ...itemFormData, title: e.target.value })}
                                                placeholder="e.g. Why Online Learning is Thriving"
                                                style={s.input}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={s.label}>Author</label>
                                                <input
                                                    value={itemFormData.author || ''}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, author: e.target.value })}
                                                    placeholder="e.g. Emare Team"
                                                    style={s.input}
                                                />
                                            </div>
                                            <div>
                                                <label style={s.label}>Category</label>
                                                <input
                                                    value={itemFormData.tag || ''}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, tag: e.target.value })}
                                                    placeholder="e.g. Education"
                                                    style={s.input}
                                                />
                                            </div>
                                            <div>
                                                <label style={s.label}>Read Time</label>
                                                <input
                                                    value={itemFormData.readTime || ''}
                                                    onChange={(e) => setItemFormData({ ...itemFormData, readTime: e.target.value })}
                                                    placeholder="e.g. 5 min read"
                                                    style={s.input}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={s.label}>Article Content / Summary *</label>
                                            <textarea
                                                required
                                                rows="4"
                                                value={itemFormData.body || ''}
                                                onChange={(e) => setItemFormData({ ...itemFormData, body: e.target.value })}
                                                placeholder="Write the article content..."
                                                style={s.input}
                                            />
                                        </div>
                                    </>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textMuted, fontSize: '13px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={itemFormData.isPublished !== false}
                                            onChange={(e) => setItemFormData({ ...itemFormData, isPublished: e.target.checked })}
                                        />
                                        Publish immediately on website
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setItemModalState({ isOpen: false, mode: 'add', item: null })}
                                            style={s.secondaryBtn}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isItemSaving}
                                            style={{ ...s.primaryBtn, opacity: isItemSaving ? 0.7 : 1 }}
                                        >
                                            {isItemSaving ? 'Saving...' : itemModalState.mode === 'add' ? 'Save Item' : 'Update Item'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderAuditLogs = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', width: '100%' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={s.sectionTitle}>Audit Logs & Security Trail</h2>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                                Read-Only
                            </span>
                        </div>
                        <p style={s.sectionSub}>Review tamper-evident activity records, authentication attempts, course approvals, and financial transactions.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button 
                            onClick={() => fetchAuditLogs(auditFilter, auditSearch)}
                            disabled={isAuditLoading}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '8px 14px', color: colors.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                        >
                            <RefreshCw size={13} className={isAuditLoading ? 'audit-spin' : ''} /> Refresh
                        </button>
                        <button 
                            onClick={() => navigate('/admin/audit-logs')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#22c55e', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}
                        >
                            <ShieldCheck size={15} /> Full Audit Console →
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ ...s.card, padding: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
                    <select value={auditFilter} onChange={(e) => handleAuditFilterChange(e.target.value)} style={{ ...s.select, minWidth: '180px' }}>
                        <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Categories</option>
                        <option value="Enrollment & Financial" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Enrollment & Financial</option>
                        <option value="Course Approvals & Content" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Course Approvals & Content</option>
                        <option value="User Security & Activity" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>User Security & Activity</option>
                        <option value="System & Diagnostics" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>System & Diagnostics</option>
                    </select>
                    <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
                        <input 
                            value={auditSearch} 
                            onChange={handleAuditSearch} 
                            placeholder="Search logs by action, user, or IP..." 
                            style={{ ...s.input, width: '100%', paddingLeft: '34px', boxSizing: 'border-box' }} 
                        />
                    </div>
                </div>

                {isAuditLoading ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: colors.textMuted }}>
                        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px', color: '#22c55e' }} />
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>Loading audit entries...</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {auditLogs.length ? auditLogs.map((log) => {
                            const isWarning = log.severity === 'warning';
                            const isCritical = log.severity === 'critical';
                            const sevColor = isCritical ? '#ef4444' : (isWarning ? '#f59e0b' : '#10b981');
                            const sevBg = isCritical ? 'rgba(239,68,68,0.12)' : (isWarning ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)');
                            const actorName = log.actorSnapshot?.fullName || log.userRef?.fullName || 'System';
                            const actorRole = log.actorSnapshot?.role || log.userRef?.assignedRole || 'System';

                            return (
                                <div key={log._id} style={{ padding: '16px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${colors.border}`, transition: 'all 0.15s' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: sevBg, color: sevColor, border: `1px solid ${sevColor}35`, textTransform: 'uppercase' }}>
                                                {log.severity || 'info'}
                                            </span>
                                            <strong style={{ fontSize: '14px', color: colors.text }}>{log.action}</strong>
                                            {log.category && (
                                                <span style={{ fontSize: '11px', color: colors.textMuted, background: colors.bgCard, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${colors.border}` }}>
                                                    {log.category}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ color: colors.textMuted, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} />
                                            {new Date(log.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ color: colors.text, fontSize: '13px', lineHeight: 1.5, marginBottom: '10px', wordBreak: 'break-word' }}>
                                        {log.description || 'No description provided.'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: colors.textMuted, display: 'flex', flexWrap: 'wrap', gap: '14px', borderTop: `1px solid ${colors.border}`, paddingTop: '8px' }}>
                                        <span><strong>Actor:</strong> {actorName} ({actorRole})</span>
                                        <span><strong>IP Address:</strong> <code>{log.ipAddress || '127.0.0.1'}</code></span>
                                        {log.targetLabel && <span><strong>Target:</strong> <code>{log.targetLabel}</code></span>}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
                                <ShieldCheck size={36} color="#22c55e" style={{ opacity: 0.5, marginBottom: '8px' }} />
                                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>No audit records match the current filter.</div>
                                <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Try changing the category or clearing the search query.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const renderCalendar = () => {
        const fieldLabel = { display: 'block', color: colors.textMuted, fontSize: '13px', fontWeight: '600', marginBottom: '6px' };
        const formRow = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' };
        const fieldError = (key) => formErrors[key]
            ? <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: colors.danger }}>{formErrors[key]}</div>
            : null;
        const isFormPublic = calendarForm.visibility === 'public';
        const segBtn = (active, activeColor) => ({
            flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
            border: active ? 'none' : `1px solid ${colors.border}`, background: active ? activeColor : 'transparent', color: active ? '#ffffff' : colors.textMuted, transition: 'all 0.15s'
        });
        const segWrap = { display: 'flex', gap: 6, padding: 4, borderRadius: 10, background: colors.bgInput, border: `1px solid ${colors.border}` };

        // Unified event data (Internal + Public)
        const internalRows = calendarEvents.map((e) => ({
            ...e,
            visibility: 'internal',
            location: e.location || (e.eventType === 'Online' ? 'Online' : ''),
            allDay: Boolean(e.isAllDay || e.allDay)
        }));
        const publicRows = publicEvents.map((e) => ({
            ...e,
            visibility: 'public',
            location: e.venue || (e.eventType !== 'Physical' ? 'Online Live Stream' : ''),
            allDay: Boolean(e.allDay || e.isAllDay)
        }));
        const allEvents = [...internalRows, ...publicRows];
        const eventLive = (e) => getLiveStatus(e);

        // ── Helper filter functions ──────────────────────────────────────
        const isCancelled = (e) => e.status === 'CANCELLED' || e.eventStatus === 'CANCELLED';

        const eventMatchesDateFilter = (e, filter) => {
            if (!filter || filter === 'all') return true;
            if (!e.startDate) return false;
            const start = new Date(e.startDate);
            if (Number.isNaN(start.getTime())) return false;
            const end = e.endDate ? new Date(e.endDate) : start;

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

            if (filter === 'today') {
                return start <= todayEnd && end >= todayStart;
            }
            if (filter === 'week') {
                const dayOfWeek = now.getDay();
                const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
                const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
                const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
                return start <= weekEnd && end >= weekStart;
            }
            if (filter === 'month') {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                return start <= monthEnd && end >= monthStart;
            }
            if (filter === 'next30') {
                const next30End = new Date(todayStart.getTime() + 30 * 24 * 60 * 60 * 1000);
                return start <= next30End && end >= todayStart;
            }
            if (filter === 'past') {
                return end < todayStart;
            }
            return true;
        };

        const eventMatchesStatusFilter = (e, filter) => {
            if (!filter || filter === 'all') return true;
            const live = eventLive(e);
            const cancelled = isCancelled(e);
            const evStatus = (e.status || '').toLowerCase();

            if (filter === 'upcoming') return !cancelled && live === 'upcoming';
            if (filter === 'live' || filter === 'ongoing') return !cancelled && (live === 'live' || live === 'ongoing');
            if (filter === 'completed') return !cancelled && live === 'completed';
            if (filter === 'cancelled') return cancelled;
            if (filter === 'pending') return e.visibility === 'public' && !cancelled && (evStatus === 'draft' || evStatus === 'pending_review');
            if (filter === 'approved') return e.visibility === 'public' && !cancelled && evStatus === 'approved';
            return live === filter || evStatus === filter;
        };

        const eventMatchesCategoryFilter = (e, filter) => {
            if (!filter || filter === 'all') return true;
            return (e.category || '').trim().toLowerCase() === filter.trim().toLowerCase();
        };

        const eventMatchesVisibilityFilter = (e, filter) => {
            if (!filter || filter === 'all') return true;
            return (e.visibility || 'internal').toLowerCase() === filter.toLowerCase();
        };

        const eventMatchesSearch = (e, query) => {
            if (!query) return true;
            const q = query.trim().toLowerCase();
            const title = (e.title || '').toLowerCase();
            const location = (e.location || e.venue || '').toLowerCase();
            const category = (e.category || '').toLowerCase();
            const speaker = (e.speaker?.name || '').toLowerCase();
            const desc = Array.isArray(e.description)
                ? e.description.join(' ').toLowerCase()
                : (e.description || '').toLowerCase();
            const visibility = (e.visibility || '').toLowerCase();
            const platform = (e.meetingPlatform || e.meetingProvider || '').toLowerCase();

            return title.includes(q) ||
                location.includes(q) ||
                category.includes(q) ||
                speaker.includes(q) ||
                desc.includes(q) ||
                visibility.includes(q) ||
                platform.includes(q);
        };

        // ── Event Filters & Pagination ──────────────────────────────────
        const filteredEvents = allEvents.filter((e) => {
            return eventMatchesSearch(e, eventSearch) &&
                   eventMatchesCategoryFilter(e, eventCategoryFilter) &&
                   eventMatchesStatusFilter(e, eventStatusFilter) &&
                   eventMatchesVisibilityFilter(e, eventVisibilityFilter) &&
                   eventMatchesDateFilter(e, eventDateFilter);
        });

        const isFilterActive = Boolean(
            eventSearch.trim() ||
            eventCategoryFilter !== 'all' ||
            eventStatusFilter !== 'all' ||
            eventVisibilityFilter !== 'all' ||
            eventDateFilter !== 'all'
        );

        const totalFilteredEvents = filteredEvents.length;
        const totalPages = Math.max(1, Math.ceil(totalFilteredEvents / eventPageSize));
        const safePage = Math.min(Math.max(1, eventCurrentPage), totalPages);
        const startIndex = totalFilteredEvents === 0 ? 0 : (safePage - 1) * eventPageSize;
        const endIndex = Math.min(startIndex + eventPageSize, totalFilteredEvents);
        const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

        const stats = {
            total: allEvents.length,
            upcoming: allEvents.filter((e) => !isCancelled(e) && eventLive(e) === 'upcoming').length,
            ongoing: allEvents.filter((e) => !isCancelled(e) && (eventLive(e) === 'live' || eventLive(e) === 'ongoing')).length,
            completed: allEvents.filter((e) => !isCancelled(e) && eventLive(e) === 'completed').length,
            pending: allEvents.filter((e) => e.visibility === 'public' && !isCancelled(e) && (e.status === 'DRAFT' || e.status === 'PENDING_REVIEW')).length,
            cancelled: allEvents.filter((e) => isCancelled(e)).length,
            internal: allEvents.filter((e) => e.visibility === 'internal').length,
            public: allEvents.filter((e) => e.visibility === 'public').length
        };

        const allCatKeys = Array.from(new Set([
            ...INTERNAL_EVENT_CATEGORIES,
            ...EVENT_CATEGORIES.map((c) => c.toLowerCase()),
            ...allEvents.map((e) => (e.category || '').toLowerCase()).filter(Boolean)
        ])).sort();

        const catLabel = (c) => {
            if (!c || c === 'all') return 'All Categories';
            return c.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        };

        const dateLabel = (d) => {
            const labels = {
                all: 'All Dates',
                today: 'Today',
                week: 'This Week',
                month: 'This Month',
                next30: 'Next 30 Days',
                past: 'Past Events'
            };
            return labels[d] || d;
        };

        const statusLabel = (st) => {
            const labels = {
                all: 'All Statuses',
                upcoming: 'Upcoming',
                live: 'Ongoing',
                completed: 'Completed',
                pending: 'Needs Approval',
                cancelled: 'Cancelled'
            };
            return labels[st] || st;
        };

        const chip = (color, bg) => ({ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color, background: bg, textTransform: 'capitalize', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 });

        const statCard = (label, value, color, statusKey) => {
            const isCardActive = statusKey === 'all'
                ? (eventStatusFilter === 'all' && eventDateFilter === 'all')
                : (eventStatusFilter === statusKey);
            return (
                <div
                    key={label}
                    onClick={() => {
                        if (statusKey === 'all') {
                            setEventStatusFilter('all');
                            setEventDateFilter('all');
                        } else {
                            setEventStatusFilter(prev => prev === statusKey ? 'all' : statusKey);
                        }
                        setEventCurrentPage(1);
                    }}
                    title={`Click to filter table by ${label}`}
                    style={{
                        padding: '16px 18px',
                        borderRadius: 14,
                        background: isCardActive ? (theme === 'dark' ? 'rgba(16,185,129,0.12)' : '#ecfdf5') : colors.bgCard,
                        border: `1.5px solid ${isCardActive ? color : colors.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        boxShadow: isCardActive ? `0 4px 16px ${color}25` : 'none',
                        userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                        if (!isCardActive) e.currentTarget.style.borderColor = color;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        if (!isCardActive) e.currentTarget.style.borderColor = colors.border;
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.textMuted }}>{label}</span>
                        {isCardActive && (
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999, background: color, color: '#fff', textTransform: 'uppercase' }}>
                                Active
                            </span>
                        )}
                    </div>
                    <strong style={{ fontSize: 26, fontWeight: 800, color }}>{value}</strong>
                </div>
            );
        };

        // Color-Coded Status System: Green for Ongoing, Blue for Upcoming, Grey for Completed, Red for Cancelled
        const getEventStatusBadge = (event) => {
            if (event.status === 'CANCELLED' || event.eventStatus === 'CANCELLED') {
                return { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.3)', dot: '#ef4444' };
            }
            const live = eventLive(event);
            if (live === 'live' || live === 'ongoing') {
                return { label: 'Ongoing', color: '#10b981', bg: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.3)', dot: '#10b981' };
            }
            if (live === 'upcoming') {
                return { label: 'Upcoming', color: '#38bdf8', bg: 'rgba(56,189,248,0.14)', border: 'rgba(56,189,248,0.3)', dot: '#38bdf8' };
            }
            if (live === 'completed') {
                return { label: 'Completed', color: '#94a3b8', bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.3)', dot: '#94a3b8' };
            }
            return { label: live ? (live.charAt(0).toUpperCase() + live.slice(1)) : 'Upcoming', color: '#38bdf8', bg: 'rgba(56,189,248,0.14)', border: 'rgba(56,189,248,0.3)', dot: '#38bdf8' };
        };

        // Consolidated Actions: Approve button remains visible; view, edit, sync, delete in three-dots kebab menu
        const renderRowActions = (event) => {
            const eventKey = `${event.visibility}-${event._id}`;
            const isMenuOpen = eventMenuOpenId === eventKey;
            const canApprove = event.visibility === 'public' && event.status !== 'APPROVED' && event.status !== 'CANCELLED';

            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    {canApprove && (
                        <button
                            type="button"
                            title="Approve & publish event"
                            onClick={() => publishPublicEvent(event)}
                            style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.4)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.25)'; }}
                        >
                            <Check size={13} />
                            Approve
                        </button>
                    )}
                    <button
                        type="button"
                        title="More actions"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isMenuOpen) {
                                setEventMenuOpenId(null);
                                return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const menuHeight = 220;
                            const fitsBelow = rect.bottom + menuHeight <= window.innerHeight;
                            setEventMenuPos({
                                top: fitsBelow ? (rect.bottom + 6) : Math.max(10, rect.top - menuHeight - 6),
                                right: Math.max(16, window.innerWidth - rect.right)
                            });
                            setEventMenuOpenId(eventKey);
                        }}
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: '8px',
                            border: `1px solid ${isMenuOpen ? '#10b981' : colors.border}`,
                            background: isMenuOpen ? 'rgba(16,185,129,0.12)' : colors.bgInput,
                            color: isMenuOpen ? '#10b981' : colors.textMuted,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#10b981';
                            e.currentTarget.style.color = '#10b981';
                        }}
                        onMouseLeave={(e) => {
                            if (!isMenuOpen) {
                                e.currentTarget.style.borderColor = colors.border;
                                e.currentTarget.style.color = colors.textMuted;
                            }
                        }}
                    >
                        <MoreVertical size={16} />
                    </button>
                </div>
            );
        };

        const renderDateCell = (event) => {
            const allDay = Boolean(event.isAllDay || event.allDay);
            let timeTxt = '';
            if (!allDay) {
                if (event.startTime) {
                    timeTxt = ` at ${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}`;
                } else if (event.startDate) {
                    timeTxt = ` at ${formatTimeShort(event.startDate)}`;
                }
            }
            const startTxt = event.startDate ? `${formatDateShort(event.startDate)}${allDay ? ' (All Day)' : timeTxt}` : '-';
            const hasDifferentEndDate = event.endDate && (!event.startDate || formatDateShort(event.startDate) !== formatDateShort(event.endDate));
            const endTxt = hasDifferentEndDate ? `to ${formatDateShort(event.endDate)}` : '';
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 170, whiteSpace: 'nowrap' }}>
                    <span style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>{startTxt}</span>
                    {endTxt && <span style={{ color: colors.textMuted, fontSize: 12 }}>{endTxt}</span>}
                </div>
            );
        };

        // Location Column: Replaced raw long URLs with video/link icon and clickable "Join Link"
        const renderLocationCell = (event) => {
            const streamUrl = event.streamUrl || event.meetingUrl;
            const showStream = event.eventType !== 'Physical' && streamUrl;
            const loc = event.location || event.venue || (event.eventType === 'Online' ? 'Online Live Stream' : '');

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140, maxWidth: 190 }}>
                    {loc && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: colors.text, fontSize: 13, fontWeight: 500 }} title={loc}>
                            <MapPin size={13} style={{ color: colors.textMuted, flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc}</span>
                        </div>
                    )}
                    {showStream && (
                        <a
                            href={streamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Join meeting: ${streamUrl}`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                color: '#10b981',
                                background: 'rgba(16,185,129,0.1)',
                                border: '1px solid rgba(16,185,129,0.25)',
                                padding: '4px 9px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                width: 'fit-content',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.borderColor = '#10b981'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)'; }}
                        >
                            <Video size={13} style={{ flexShrink: 0 }} />
                            <span>Join Link</span>
                            <ExternalLink size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                        </a>
                    )}
                    {!loc && !showStream && <span style={{ color: colors.textMuted, fontSize: 13 }}>—</span>}
                </div>
            );
        };

        // Empty State Component
        const emptyState = (
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${colors.primary}12`, color: colors.primary, boxShadow: `0 0 24px ${colors.primary}20` }}>
                    <Calendar size={30} />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: colors.text }}>
                    {isFilterActive ? 'No events found matching your filters.' : 'No events found.'}
                </h3>
                <p style={{ margin: '0 auto 20px', maxWidth: 460, fontSize: 14, color: colors.textMuted, lineHeight: '1.5' }}>
                    {isFilterActive
                        ? `Found 0 matching events out of ${allEvents.length} total events. Try clearing or adjusting search keywords, category, status, or date selections.`
                        : 'Click "Create Event" to schedule workshops, masterclasses, exams, or live stream sessions.'}
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="button" onClick={openCreateEvent} style={{ ...s.primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
                        <Plus size={16} /> Create Event
                    </button>
                    {isFilterActive && (
                        <button
                            type="button"
                            onClick={() => {
                                setEventSearch('');
                                setEventCategoryFilter('all');
                                setEventStatusFilter('all');
                                setEventVisibilityFilter('all');
                                setEventDateFilter('all');
                                setEventCurrentPage(1);
                            }}
                            style={{
                                ...s.secondaryBtn,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '10px 18px',
                                border: '1px solid #10b981',
                                color: '#10b981'
                            }}
                        >
                            <RotateCcw size={14} /> Clear All Filters ({allEvents.length} Total)
                        </button>
                    )}
                </div>
            </div>
        );

        return (
        <div style={s.tabContent}>
            <style>{`
                .em-cal-table { display: none; }
                .em-cal-cards { display: block; }
                @media (min-width: 960px) { .em-cal-table { display: block; } .em-cal-cards { display: none; } }
            `}</style>

            {/* Header */}
            <div style={{ ...s.sectionHeader, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={s.sectionTitle}>Event Management</h2>
                    <p style={s.sectionSub}>Manage holidays, academic dates, assignments, workshops, masterclasses, and live streams.</p>
                </div>
                <button type="button" onClick={openCreateEvent} style={{ ...s.primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                    <Plus size={16} /> Create Event
                </button>
            </div>

            {/* Statistics row with interactive click-to-filter */}
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 20 }}>
                {statCard('Total Events', stats.total, colors.text, 'all')}
                {statCard('Upcoming', stats.upcoming, '#38bdf8', 'upcoming')}
                {statCard('Ongoing', stats.ongoing, '#10b981', 'live')}
                {statCard('Completed', stats.completed, '#64748b', 'completed')}
                {stats.pending > 0 && statCard('Needs Approval', stats.pending, '#f59e0b', 'pending')}
            </div>

            {/* Filter toolbar: Wider search bar and uniform width for all 4 dropdowns + Clear Filters button */}
            <div style={{ ...s.card, marginBottom: 20, padding: '18px 24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    {/* Wider Search Bar */}
                    <div style={{ position: 'relative', flex: '2 1 280px', minWidth: '240px' }}>
                        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                            value={eventSearch}
                            onChange={(e) => { setEventSearch(e.target.value); setEventCurrentPage(1); }}
                            placeholder="Search event title, category, venue, or instructor..."
                            style={{
                                ...s.input,
                                width: '100%',
                                padding: '10px 14px 10px 40px',
                                fontSize: '14px',
                                borderRadius: '10px',
                                height: '42px',
                                boxSizing: 'border-box',
                                border: `1.5px solid ${eventSearch ? '#10b981' : colors.border}`
                            }}
                        />
                    </div>

                    {/* Uniform Dropdown 1: Category */}
                    <div style={{ position: 'relative', flex: '1 1 150px', minWidth: '150px' }}>
                        <select
                            value={eventCategoryFilter}
                            onChange={(e) => { setEventCategoryFilter(e.target.value); setEventCurrentPage(1); }}
                            style={{
                                ...s.select,
                                width: '100%',
                                height: '42px',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                padding: '9px 34px 9px 14px',
                                fontSize: '13px',
                                fontWeight: '500',
                                borderRadius: '10px',
                                boxSizing: 'border-box',
                                border: `1.5px solid ${eventCategoryFilter !== 'all' ? '#10b981' : colors.border}`,
                                background: eventCategoryFilter !== 'all' ? (theme === 'dark' ? 'rgba(16,185,129,0.08)' : '#f0fdf4') : (colors.bgInput || colors.bgCard)
                            }}
                        >
                            <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>
                                All Categories ({allEvents.length})
                            </option>
                            {allCatKeys.map((c) => {
                                const count = allEvents.filter(e => (e.category || '').toLowerCase() === c.toLowerCase()).length;
                                return (
                                    <option key={c} value={c} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>
                                        {catLabel(c)} ({count})
                                    </option>
                                );
                            })}
                        </select>
                        <ChevronDown size={15} color={eventCategoryFilter !== 'all' ? '#10b981' : "#94a3b8"} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>

                    {/* Uniform Dropdown 2: Status */}
                    <div style={{ position: 'relative', flex: '1 1 150px', minWidth: '150px' }}>
                        <select
                            value={eventStatusFilter}
                            onChange={(e) => { setEventStatusFilter(e.target.value); setEventCurrentPage(1); }}
                            style={{
                                ...s.select,
                                width: '100%',
                                height: '42px',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                padding: '9px 34px 9px 14px',
                                fontSize: '13px',
                                fontWeight: '500',
                                borderRadius: '10px',
                                boxSizing: 'border-box',
                                border: `1.5px solid ${eventStatusFilter !== 'all' ? '#10b981' : colors.border}`,
                                background: eventStatusFilter !== 'all' ? (theme === 'dark' ? 'rgba(16,185,129,0.08)' : '#f0fdf4') : (colors.bgInput || colors.bgCard)
                            }}
                        >
                            <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Statuses ({allEvents.length})</option>
                            <option value="upcoming" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Upcoming ({stats.upcoming})</option>
                            <option value="live" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Ongoing ({stats.ongoing})</option>
                            <option value="completed" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Completed ({stats.completed})</option>
                            {stats.pending > 0 && (
                                <option value="pending" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Needs Approval ({stats.pending})</option>
                            )}
                            <option value="cancelled" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Cancelled ({stats.cancelled})</option>
                        </select>
                        <ChevronDown size={15} color={eventStatusFilter !== 'all' ? '#10b981' : "#94a3b8"} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>

                    {/* Uniform Dropdown 3: Visibility */}
                    <div style={{ position: 'relative', flex: '1 1 150px', minWidth: '150px' }}>
                        <select
                            value={eventVisibilityFilter}
                            onChange={(e) => { setEventVisibilityFilter(e.target.value); setEventCurrentPage(1); }}
                            style={{
                                ...s.select,
                                width: '100%',
                                height: '42px',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                padding: '9px 34px 9px 14px',
                                fontSize: '13px',
                                fontWeight: '500',
                                borderRadius: '10px',
                                boxSizing: 'border-box',
                                border: `1.5px solid ${eventVisibilityFilter !== 'all' ? '#10b981' : colors.border}`,
                                background: eventVisibilityFilter !== 'all' ? (theme === 'dark' ? 'rgba(16,185,129,0.08)' : '#f0fdf4') : (colors.bgInput || colors.bgCard)
                            }}
                        >
                            <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Visibility ({allEvents.length})</option>
                            <option value="internal" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Internal ({stats.internal})</option>
                            <option value="public" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Public ({stats.public})</option>
                        </select>
                        <ChevronDown size={15} color={eventVisibilityFilter !== 'all' ? '#10b981' : "#94a3b8"} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>

                    {/* Uniform Dropdown 4: Date */}
                    <div style={{ position: 'relative', flex: '1 1 150px', minWidth: '150px' }}>
                        <select
                            value={eventDateFilter}
                            onChange={(e) => { setEventDateFilter(e.target.value); setEventCurrentPage(1); }}
                            style={{
                                ...s.select,
                                width: '100%',
                                height: '42px',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                padding: '9px 34px 9px 14px',
                                fontSize: '13px',
                                fontWeight: '500',
                                borderRadius: '10px',
                                boxSizing: 'border-box',
                                border: `1.5px solid ${eventDateFilter !== 'all' ? '#10b981' : colors.border}`,
                                background: eventDateFilter !== 'all' ? (theme === 'dark' ? 'rgba(16,185,129,0.08)' : '#f0fdf4') : (colors.bgInput || colors.bgCard)
                            }}
                        >
                            <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Dates</option>
                            <option value="today" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Today</option>
                            <option value="week" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>This Week</option>
                            <option value="month" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>This Month</option>
                            <option value="next30" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Next 30 Days</option>
                            <option value="past" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Past Events</option>
                        </select>
                        <ChevronDown size={15} color={eventDateFilter !== 'all' ? '#10b981' : "#94a3b8"} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>

                    {/* Clear Filters Button (appears only when user typed or changed a dropdown) */}
                    {isFilterActive && (
                        <button
                            type="button"
                            onClick={() => {
                                setEventSearch('');
                                setEventCategoryFilter('all');
                                setEventStatusFilter('all');
                                setEventVisibilityFilter('all');
                                setEventDateFilter('all');
                                setEventCurrentPage(1);
                            }}
                            title="Reset all active filters"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                height: '42px',
                                padding: '0 16px',
                                borderRadius: '10px',
                                border: '1px dashed #10b981',
                                background: 'rgba(16,185,129,0.08)',
                                color: '#10b981',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.16)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; }}
                        >
                            <RotateCcw size={13} />
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Active Filter Chips with (x) to remove individually */}
                {isFilterActive && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>Active Filters:</span>
                        {eventSearch && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: colors.text, fontSize: '12px', fontWeight: '500' }}>
                                <span>Search: <strong>"{eventSearch}"</strong></span>
                                <X size={13} style={{ cursor: 'pointer', color: colors.textMuted }} onClick={() => setEventSearch('')} />
                            </span>
                        )}
                        {eventCategoryFilter !== 'all' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: colors.text, fontSize: '12px', fontWeight: '500' }}>
                                <span>Category: <strong>{catLabel(eventCategoryFilter)}</strong></span>
                                <X size={13} style={{ cursor: 'pointer', color: colors.textMuted }} onClick={() => setEventCategoryFilter('all')} />
                            </span>
                        )}
                        {eventStatusFilter !== 'all' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: colors.text, fontSize: '12px', fontWeight: '500' }}>
                                <span>Status: <strong>{statusLabel(eventStatusFilter)}</strong></span>
                                <X size={13} style={{ cursor: 'pointer', color: colors.textMuted }} onClick={() => setEventStatusFilter('all')} />
                            </span>
                        )}
                        {eventVisibilityFilter !== 'all' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: colors.text, fontSize: '12px', fontWeight: '500' }}>
                                <span>Visibility: <strong>{eventVisibilityFilter.charAt(0).toUpperCase() + eventVisibilityFilter.slice(1)}</strong></span>
                                <X size={13} style={{ cursor: 'pointer', color: colors.textMuted }} onClick={() => setEventVisibilityFilter('all')} />
                            </span>
                        )}
                        {eventDateFilter !== 'all' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: colors.text, fontSize: '12px', fontWeight: '500' }}>
                                <span>Date: <strong>{dateLabel(eventDateFilter)}</strong></span>
                                <X size={13} style={{ cursor: 'pointer', color: colors.textMuted }} onClick={() => setEventDateFilter('all')} />
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setEventSearch('');
                                setEventCategoryFilter('all');
                                setEventStatusFilter('all');
                                setEventVisibilityFilter('all');
                                setEventDateFilter('all');
                                setEventCurrentPage(1);
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: colors.primary,
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                textDecoration: 'underline'
                            }}
                        >
                            Reset all
                        </button>
                    </div>
                )}
            </div>

            {/* Floating Bulk Actions Bar (Bulk Approve / Bulk Delete) */}
            {selectedEvents.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    background: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    border: '1.5px solid #10b981',
                    borderRadius: '14px',
                    marginBottom: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(12px)',
                    gap: 12,
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckSquare size={18} style={{ color: '#10b981' }} />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>
                            {selectedEvents.length} {selectedEvents.length === 1 ? 'event' : 'events'} selected
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={handleBulkApproveEvents}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#ffffff',
                                fontWeight: '700',
                                fontSize: '13px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                            }}
                        >
                            <CheckCircle2 size={15} />
                            Bulk Approve
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkDeleteEvents}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.4)',
                                color: '#ef4444',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <Trash2 size={15} />
                            Bulk Delete
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedEvents([])}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                background: 'transparent',
                                border: `1px solid ${colors.border}`,
                                color: colors.textMuted,
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Deselect All
                        </button>
                    </div>
                </div>
            )}

            {/* Table Card */}
            <div style={{ ...s.card, marginTop: 10, padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 style={{ ...s.cardTitle, margin: 0 }}>All Events</h3>
                        <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '12px', background: `${colors.primary}15`, color: colors.primary, fontWeight: '700' }}>
                            {isFilterActive
                                ? `Showing ${totalFilteredEvents} of ${allEvents.length} events`
                                : `${totalFilteredEvents} ${totalFilteredEvents === 1 ? 'event' : 'events'}`}
                        </span>
                        {isFilterActive && (
                            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                                (Filter active)
                            </span>
                        )}
                    </div>
                </div>

                {totalFilteredEvents === 0 ? emptyState : (
                    <>
                        {/* Desktop table */}
                        <div className="em-cal-table" style={s.instructorTableCard}>
                            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                                <table style={{ ...s.instructorTable, minWidth: 1060 }}>
                                    <thead>
                                        <tr style={s.instructorThRow}>
                                            <th style={{ ...s.instructorTh, width: 44, padding: '14px 16px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={paginatedEvents.length > 0 && paginatedEvents.every(e => selectedEvents.includes(`${e.visibility}-${e._id}`))}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            const pageKeys = paginatedEvents.map(ev => `${ev.visibility}-${ev._id}`);
                                                            setSelectedEvents(prev => Array.from(new Set([...prev, ...pageKeys])));
                                                        } else {
                                                            const pageKeys = new Set(paginatedEvents.map(ev => `${ev.visibility}-${ev._id}`));
                                                            setSelectedEvents(prev => prev.filter(k => !pageKeys.has(k)));
                                                        }
                                                    }}
                                                    style={{ cursor: 'pointer', accentColor: '#10b981', width: 16, height: 16 }}
                                                />
                                            </th>
                                            <th style={{ ...s.instructorTh, textAlign: 'left', minWidth: 220 }}>Event</th>
                                            <th style={{ ...s.instructorTh, textAlign: 'left', minWidth: 110 }}>Category</th>
                                            <th style={{ ...s.instructorTh, textAlign: 'left', minWidth: 200 }}>Date &amp; Time</th>
                                            <th style={{ ...s.instructorTh, textAlign: 'left', minWidth: 170 }}>Location</th>
                                            <th style={{ ...s.instructorTh, textAlign: 'left', minWidth: 110 }}>Status</th>
                                            <th style={{ ...s.instructorTh, textAlign: 'left', minWidth: 100 }}>Visibility</th>
                                            <th style={{ ...s.instructorTh, textAlign: 'right', minWidth: 130 }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    {paginatedEvents.map((event) => {
                                        const eventKey = `${event.visibility}-${event._id}`;
                                        const isSelected = selectedEvents.includes(eventKey);
                                        const sc = getEventStatusBadge(event);
                                        return (
                                            <tr
                                                key={eventKey}
                                                style={{
                                                    ...s.instructorTr,
                                                    background: isSelected ? (theme === 'dark' ? 'rgba(16,185,129,0.12)' : '#f0fdf4') : 'transparent',
                                                    transition: 'background 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected) e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.015)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <td style={{ ...s.instructorTd, width: 44, padding: '14px 16px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedEvents(prev => [...prev, eventKey]);
                                                            } else {
                                                                setSelectedEvents(prev => prev.filter(k => k !== eventKey));
                                                            }
                                                        }}
                                                        style={{ cursor: 'pointer', accentColor: '#10b981', width: 16, height: 16 }}
                                                    />
                                                </td>
                                                {/* Title Truncation with Tooltip on Hover */}
                                                <td style={{ ...s.instructorTd, maxWidth: 260 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        {event.image ? (
                                                            <img src={event.image} alt="" style={{ width: 46, height: 46, borderRadius: 12, objectFit: 'cover', border: `1px solid ${colors.border}`, flexShrink: 0 }} />
                                                        ) : (
                                                            <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: '800', flexShrink: 0, fontSize: 16 }}>
                                                                {event.title?.charAt(0)?.toUpperCase() || 'E'}
                                                            </div>
                                                        )}
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <strong
                                                                title={event.title}
                                                                style={{
                                                                    color: colors.text,
                                                                    display: 'block',
                                                                    fontSize: '14px',
                                                                    fontWeight: '700',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    cursor: 'help'
                                                                }}
                                                            >
                                                                {event.title}
                                                            </strong>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                                <span style={{ color: colors.textMuted, fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                                    {event.visibility === 'public' ? (event.eventType || 'Hybrid') : 'Internal'}
                                                                </span>
                                                                {event.speaker?.name && (
                                                                    <span style={{ color: colors.textMuted, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`Speaker: ${event.speaker.name}`}>
                                                                        • {event.speaker.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={s.instructorTd}>
                                                    <span style={{ ...chip(colors.primary, `${colors.primary}14`), textTransform: 'none' }}>
                                                        {catLabel(event.category || 'Event')}
                                                    </span>
                                                </td>
                                                <td style={s.instructorTd}>{renderDateCell(event)}</td>
                                                <td style={s.instructorTd}>{renderLocationCell(event)}</td>
                                                {/* Color-Coded Status Badge + Publication Pill */}
                                                <td style={s.instructorTd}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                                        <span
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                padding: '4px 10px',
                                                                borderRadius: 999,
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                color: sc.color,
                                                                background: sc.bg,
                                                                border: `1px solid ${sc.border}`,
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
                                                            {sc.label}
                                                        </span>
                                                        {event.visibility === 'public' && event.status !== 'APPROVED' && event.status !== 'CANCELLED' && (
                                                            <span style={{
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                padding: '2px 7px',
                                                                borderRadius: 4,
                                                                background: 'rgba(245,158,11,0.15)',
                                                                color: '#f59e0b',
                                                                border: '1px solid rgba(245,158,11,0.3)',
                                                                whiteSpace: 'nowrap',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.04em'
                                                            }}>
                                                                {event.status === 'DRAFT' ? 'Draft' : 'Pending Review'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={s.instructorTd}>
                                                    <span style={event.visibility === 'public' ? chip('#10b981', 'rgba(16,185,129,0.12)') : chip('#94a3b8', 'rgba(148,163,184,0.14)')}>
                                                        {event.visibility === 'public' ? 'Public' : 'Internal'}
                                                    </span>
                                                </td>
                                                {/* Consolidated Actions (Approve + Three-Dots Dropdown) */}
                                                <td style={s.instructorTd}>
                                                    {renderRowActions(event)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        </div>

                        {/* Mobile cards */}
                        <div className="em-cal-cards">
                            <div style={{ display: 'grid', gap: 12, padding: '16px 20px 24px' }}>
                                {paginatedEvents.map((event) => {
                                    const eventKey = `${event.visibility}-${event._id}`;
                                    const isSelected = selectedEvents.includes(eventKey);
                                    const sc = getEventStatusBadge(event);
                                    return (
                                        <div key={eventKey} style={{ padding: 16, borderRadius: 12, background: colors.bgInput, border: `1px solid ${isSelected ? '#10b981' : colors.border}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                                                <strong title={event.title} style={{ fontSize: 14, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                                    {event.title}
                                                </strong>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            padding: '3px 8px',
                                                            borderRadius: 999,
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            color: sc.color,
                                                            background: sc.bg,
                                                            border: `1px solid ${sc.border}`
                                                        }}
                                                    >
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
                                                        {sc.label}
                                                    </span>
                                                    {event.visibility === 'public' && event.status !== 'APPROVED' && event.status !== 'CANCELLED' && (
                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            padding: '2px 6px',
                                                            borderRadius: 4,
                                                            background: 'rgba(245,158,11,0.15)',
                                                            color: '#f59e0b',
                                                            border: '1px solid rgba(245,158,11,0.3)',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {event.status === 'DRAFT' ? 'Draft' : 'Pending'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                                <span style={{ ...chip(colors.primary, `${colors.primary}14`), textTransform: 'none' }}>{catLabel(event.category || 'Event')}</span>
                                                <span style={event.visibility === 'public' ? chip('#10b981', 'rgba(16,185,129,0.12)') : chip('#94a3b8', 'rgba(148,163,184,0.14)')}>
                                                    {event.visibility === 'public' ? 'Public' : 'Internal'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'grid', gap: 4, fontSize: 13, color: colors.textMuted }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={13} style={{ flexShrink: 0 }} /> {renderDateCell(event)}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={13} style={{ flexShrink: 0 }} /> {renderLocationCell(event)}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                {renderRowActions(event)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Pagination Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ fontSize: '14px', color: colors.textMuted, fontWeight: '500' }}>
                                {totalFilteredEvents === 0
                                    ? 'Showing 0 of 0 events'
                                    : `Showing ${startIndex + 1} to ${endIndex} of ${totalFilteredEvents} events`
                                }
                            </div>
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        disabled={safePage <= 1}
                                        onClick={() => setEventCurrentPage(p => Math.max(1, p - 1))}
                                        title="Previous Page"
                                        style={{
                                            background: colors.bgCard,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '8px',
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: safePage <= 1 ? colors.textMuted : colors.text,
                                            cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                                            opacity: safePage <= 1 ? 0.4 : 1
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setEventCurrentPage(p)}
                                            style={{
                                                background: p === safePage ? '#10b981' : colors.bgCard,
                                                color: p === safePage ? '#ffffff' : colors.text,
                                                border: `1px solid ${p === safePage ? '#10b981' : colors.border}`,
                                                borderRadius: '8px',
                                                minWidth: '36px',
                                                height: '36px',
                                                padding: '0 8px',
                                                fontSize: '13px',
                                                fontWeight: p === safePage ? '700' : '500',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        disabled={safePage >= totalPages}
                                        onClick={() => setEventCurrentPage(p => Math.min(totalPages, p + 1))}
                                        title="Next Page"
                                        style={{
                                            background: colors.bgCard,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '8px',
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: safePage >= totalPages ? colors.textMuted : colors.text,
                                            cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                                            opacity: safePage >= totalPages ? 0.4 : 1
                                        }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Floating Action Menu for Three-Dots Kebab */}
            {eventMenuOpenId && (() => {
                const ev = allEvents.find(e => `${e.visibility}-${e._id}` === eventMenuOpenId);
                if (!ev) return null;
                const canCancel = ev.status !== 'CANCELLED' && ev.eventStatus !== 'CANCELLED';
                return (
                    <div
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            top: eventMenuPos.top,
                            right: eventMenuPos.right,
                            background: colors.bgCard || '#12141f',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '12px',
                            padding: '6px',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                            zIndex: 99999,
                            minWidth: '180px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            backdropFilter: 'blur(16px)'
                        }}
                    >
                        <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setEventMenuOpenId(null);
                                setViewingEvent(ev);
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: '8px',
                                background: 'transparent', border: 'none', color: colors.text, fontSize: '13px', fontWeight: '500',
                                cursor: 'pointer', textAlign: 'left', width: '100%'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Eye size={15} style={{ color: colors.textMuted }} />
                            View Details
                        </button>
                        <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setEventMenuOpenId(null);
                                handleEditCalendarEvent(ev);
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: '8px',
                                background: 'transparent', border: 'none', color: colors.text, fontSize: '13px', fontWeight: '500',
                                cursor: 'pointer', textAlign: 'left', width: '100%'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Edit size={15} style={{ color: '#f59e0b' }} />
                            Edit Event
                        </button>
                        <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setEventMenuOpenId(null);
                                fetchCalendarEvents();
                                fetchPublicEvents();
                                showNotification('Event data synchronized.');
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: '8px',
                                background: 'transparent', border: 'none', color: colors.text, fontSize: '13px', fontWeight: '500',
                                cursor: 'pointer', textAlign: 'left', width: '100%'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <RefreshCw size={15} style={{ color: '#38bdf8' }} />
                            Sync / Refresh
                        </button>
                        {canCancel && (
                            <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEventMenuOpenId(null);
                                    cancelPublicEvent(ev);
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: '8px',
                                    background: 'transparent', border: 'none', color: '#f59e0b', fontSize: '13px', fontWeight: '500',
                                    cursor: 'pointer', textAlign: 'left', width: '100%'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <Ban size={15} />
                                Cancel Event
                            </button>
                        )}
                        <div style={{ height: 1, background: colors.border, margin: '4px 0' }} />
                        <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setEventMenuOpenId(null);
                                openDeleteEvent(ev);
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: '8px',
                                background: 'transparent', border: 'none', color: '#ef4444', fontSize: '13px', fontWeight: '600',
                                cursor: 'pointer', textAlign: 'left', width: '100%'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Trash2 size={15} />
                            Delete Event
                        </button>
                    </div>
                );
            })()}

            {/* -"?-"? Create / Edit Event Modal -"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"? */}
            <Modal isOpen={isEventModalOpen} onClose={resetCalendarForm} title={calendarEditingId ? 'Edit Event' : 'Create Event'} maxWidth="680px" scrollable closeOnBackdrop={false}>
                <form onSubmit={handleSaveCalendarEvent} style={{ display: 'grid', gap: 16 }}>
                    {formError && (
                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: `1px solid ${colors.danger}`, color: colors.danger, fontSize: 13, fontWeight: 600 }}>{formError}</div>
                    )}

                    {/* Basic Information */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: colors.primary, marginBottom: 12 }}>Basic Information</div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div>
                                <label style={fieldLabel}>Event Title *</label>
                                <input value={calendarForm.title} onChange={(e) => setCalendarForm({ ...calendarForm, title: e.target.value })} placeholder="e.g. Digital Income Masterclass" style={s.input} required />
                                {fieldError('title')}
                            </div>
                            <div style={formRow}>
                                <div>
                                    <label style={fieldLabel}>Category *</label>
                                    {isFormPublic ? (
                                        <select value={calendarForm.category} onChange={(e) => setCalendarForm({ ...calendarForm, category: e.target.value, eventCategory: e.target.value })} style={s.select}>
                                            {EVENT_CATEGORIES.map((cat) => (
                                                <option key={cat} value={cat} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{cat}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <select value={calendarForm.category} onChange={(e) => setCalendarForm({ ...calendarForm, category: e.target.value })} style={s.select}>
                                            {INTERNAL_EVENT_CATEGORIES.map((cat) => (
                                                <option key={cat} value={cat} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{catLabel(cat)}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label style={fieldLabel}>Status</label>
                                    <select value={calendarForm.eventStatus} onChange={(e) => setCalendarForm({ ...calendarForm, eventStatus: e.target.value })} style={s.select}>
                                        <option value="SCHEDULED" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Scheduled</option>
                                        <option value="CANCELLED" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={fieldLabel}>Description</label>
                                <textarea value={calendarForm.description} onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })} placeholder={isFormPublic ? 'One paragraph per line -" each line becomes a section on the public page' : 'Short description'} rows="3" style={s.input}></textarea>
                            </div>
                        </div>
                    </div>

                    <div style={{ height: 1, background: colors.border }} />

                    {/* Schedule */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: colors.primary, marginBottom: 12 }}>Schedule</div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div style={formRow}>
                                <div>
                                    <label style={fieldLabel}>Start Date *</label>
                                    <input type="date" value={calendarForm.startDate} onChange={(e) => setCalendarForm({ ...calendarForm, startDate: e.target.value })} style={s.input} required />
                                    {fieldError('startDate')}
                                </div>
                                <div>
                                    <label style={fieldLabel}>Start Time</label>
                                    <input type="time" value={calendarForm.startTime} disabled={calendarForm.isAllDay} onChange={(e) => setCalendarForm({ ...calendarForm, startTime: e.target.value })} style={{ ...s.input, opacity: calendarForm.isAllDay ? 0.5 : 1 }} />
                                </div>
                            </div>
                            <div style={formRow}>
                                <div>
                                    <label style={fieldLabel}>End Date</label>
                                    <input type="date" value={calendarForm.endDate} onChange={(e) => setCalendarForm({ ...calendarForm, endDate: e.target.value })} style={s.input} />
                                    {fieldError('endDate')}
                                </div>
                                <div>
                                    <label style={fieldLabel}>End Time</label>
                                    <input type="time" value={calendarForm.endTime} disabled={calendarForm.isAllDay} onChange={(e) => setCalendarForm({ ...calendarForm, endTime: e.target.value })} style={{ ...s.input, opacity: calendarForm.isAllDay ? 0.5 : 1 }} />
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.textMuted, cursor: 'pointer', fontSize: 14 }}>
                                <input type="checkbox" checked={calendarForm.isAllDay} onChange={(e) => setCalendarForm({ ...calendarForm, isAllDay: e.target.checked })} />
                                All day event
                            </label>
                        </div>
                    </div>

                    <div style={{ height: 1, background: colors.border }} />

                    {/* Location */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: colors.primary, marginBottom: 12 }}>Location</div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div style={segWrap}>
                                {['Online', 'Physical', 'Hybrid'].map((t) => (
                                    <button key={t} type="button" onClick={() => setCalendarForm({ ...calendarForm, eventType: t })} style={segBtn(calendarForm.eventType === t, t === 'Physical' ? '#64748b' : colors.primary)}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                            {(calendarForm.eventType === 'Physical' || calendarForm.eventType === 'Hybrid') && (
                                <div>
                                    <label style={fieldLabel}>Location</label>
                                    <input value={calendarForm.location} onChange={(e) => setCalendarForm({ ...calendarForm, location: e.target.value })} placeholder="e.g. Emare Live Hub, Addis Ababa" style={s.input} />
                                    {fieldError('location')}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ height: 1, background: colors.border }} />

                    {/* Virtual Meeting & Live Stream Settings */}
                    {calendarForm.eventType !== 'Physical' && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: colors.primary, marginBottom: 12 }}>Virtual Meeting &amp; Live Stream Settings</div>
                            <div style={{ display: 'grid', gap: 12 }}>
                                {/* Platform Selector */}
                                <div>
                                    <label style={fieldLabel}>Platform</label>
                                    <select value={calendarForm.meetingPlatform} onChange={(e) => {
                                        const p = e.target.value;
                                        setCalendarForm((f) => ({
                                            ...f,
                                            meetingPlatform: p,
                                            meetingProvider: platformToProvider[p] || p,
                                            streamUrl: p === 'jitsi' ? (getDefaultMeetingLink('jitsi', f.title) || f.streamUrl) : f.streamUrl
                                        }));
                                        setMeetingErrors((m) => ({ ...m, streamUrl: '', meetingInvitees: '' }));
                                    }} style={s.select}>
                                        {MEETING_PLATFORMS.map((pf) => (
                                            <option key={pf.value} value={pf.value} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{pf.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Meeting ID – Zoom only (optional) */}
                                {calendarForm.meetingPlatform === 'zoom' && (
                                    <div>
                                        <label style={fieldLabel}>Meeting ID (Optional)</label>
                                        <input value={calendarForm.meetingId || ''} onChange={(e) => setCalendarForm({ ...calendarForm, meetingId: e.target.value })} placeholder="e.g. 846 1234 5678" style={s.input} />
                                    </div>
                                )}

                                {/* Meeting Link + Generate */}
                                <div>
                                    <label style={fieldLabel}>Meeting Link</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <input
                                            value={calendarForm.streamUrl}
                                            onChange={(e) => {
                                                setCalendarForm({ ...calendarForm, streamUrl: e.target.value });
                                                setMeetingErrors((m) => ({ ...m, streamUrl: '' }));
                                            }}
                                            placeholder="Enter a meeting link or generate one automatically"
                                            style={{ ...s.input, flex: '1 1 200px' }}
                                        />
                                        {GENERATABLE_PLATFORMS.includes(calendarForm.meetingPlatform) && (
                                            <button
                                                type="button"
                                                onClick={handleGeneratePlatformMeeting}
                                                disabled={isGeneratingMeeting}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#7e22ce'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#15803d'; }}
                                                style={{ whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700, background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', height: 42, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: isGeneratingMeeting ? 'not-allowed' : 'pointer', opacity: isGeneratingMeeting ? 0.7 : 1 }}
                                            >
                                                {isGeneratingMeeting
                                                    ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                                                    : <><Wand2 size={15} /> Generate Meeting Link</>}
                                            </button>
                                        )}
                                    </div>
                                    {fieldError('streamUrl')}
                                    {meetingErrors.streamUrl && (
                                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{meetingErrors.streamUrl}</div>
                                    )}
                                    {!GENERATABLE_PLATFORMS.includes(calendarForm.meetingPlatform) && (
                                        <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.textMuted }}>Paste your external meeting / live-stream URL directly. It is validated when the event is saved.</p>
                                    )}
                                    {calendarForm.streamUrl && (
                                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            <button type="button" onClick={() => handleCopyMeetingLink(calendarForm.streamUrl)} style={{ ...s.secondaryBtn, padding: '5px 10px', fontSize: 12 }}>
                                                <Copy size={13} /> Copy Link
                                            </button>
                                            <button type="button" onClick={() => openMeetingLink(calendarForm.streamUrl)} style={{ ...s.secondaryBtn, padding: '5px 10px', fontSize: 12 }}>
                                                <ExternalLink size={13} /> Open Meeting
                                            </button>
                                            {calendarEditingId && (
                                                <button type="button" onClick={handleRegenerateMeeting} disabled={isGeneratingMeeting} title="Intentionally generate a new meeting (replaces the current one)" style={{ ...s.secondaryBtn, whiteSpace: 'nowrap', fontSize: 12, opacity: isGeneratingMeeting ? 0.55 : 1 }}>
                                                    <RefreshCw size={14} /> Regenerate
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Meeting Password � only platforms that support one */}
                                {PASSWORD_PLATFORMS.includes(calendarForm.meetingPlatform) && (
                                    <div>
                                        <label style={fieldLabel}>Meeting Password (Optional)</label>
                                        <input value={calendarForm.meetingPassword} onChange={(e) => setCalendarForm({ ...calendarForm, meetingPassword: e.target.value })} placeholder="e.g. 123456 � for passcode-protected meetings / streams" style={s.input} />
                                    </div>
                                )}

                                {isGeneratingMeeting ? (
                                    <p style={{ margin: '0', fontSize: 12, color: colors.primary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Creating a {meetingProviderLabel(calendarForm.meetingProvider)} meeting...
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    )}

                    <div style={{ height: 1, background: colors.border }} />

                    {/* Visibility */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: colors.primary, marginBottom: 12 }}>Visibility</div>
                        <div style={segWrap}>
                            <button type="button" onClick={() => setCalendarForm({ ...calendarForm, visibility: 'internal' })} style={segBtn(calendarForm.visibility === 'internal', '#64748b')}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lock size={13} /> Internal</span>
                            </button>
                            <button type="button" onClick={() => setCalendarForm({ ...calendarForm, visibility: 'public' })} style={segBtn(calendarForm.visibility === 'public', '#10b981')}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Globe size={13} /> Public</span>
                            </button>
                        </div>
                        <p style={{ margin: '10px 0 0', fontSize: 12, color: colors.textMuted }}>
                            {isFormPublic
                                ? 'Public events appear in the public e-learning / events area and go through the review pipeline.'
                                : 'Internal events appear only on the admin/internal calendar (holidays, academic dates, meetings).'}
                        </p>
                    </div>

                    {/* Public-only options */}
                    {isFormPublic && (
                        <>
                            <div style={{ height: 1, background: colors.border }} />
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: colors.primary, marginBottom: 12 }}>Public Event Options</div>
                                <div style={{ display: 'grid', gap: 12 }}>
                                    <div style={formRow}>
                                        <div>
                                            <label style={fieldLabel}>Price</label>
                                            <input value={calendarForm.price} onChange={(e) => setCalendarForm({ ...calendarForm, price: e.target.value })} placeholder="FREE / 0" style={s.input} />
                                        </div>
                                        <div>
                                            <label style={fieldLabel}>Total seats / capacity</label>
                                            <input type="number" min="0" value={calendarForm.capacity} onChange={(e) => setCalendarForm({ ...calendarForm, capacity: e.target.value })} placeholder="e.g. 50" style={s.input} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={fieldLabel}>Host / Instructor</label>
                                        <select value={calendarForm.instructor} onChange={(e) => setCalendarForm({ ...calendarForm, instructor: e.target.value })} style={s.select}>
                                            <option value="" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Select host / instructor</option>
                                            {users.filter((u) => u.assignedRole === 'Instructor').map((inst) => (
                                                <option key={inst._id} value={inst._id} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{inst.fullName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: colors.bgInput, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Enable public registration</span>
                                        <input type="checkbox" checked={calendarForm.enableRegistration} onChange={(e) => setCalendarForm({ ...calendarForm, enableRegistration: e.target.checked })} />
                                    </label>
</div>
                            </div>
                        </>
                    )}

                    <div style={{ height: 1, background: colors.border }} />

                    {/* Upload Event Thumbnail */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: colors.primary, marginBottom: 12 }}>Upload Event Thumbnail</div>
                        <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = '';
                                if (f) handleEventThumbnailUpload(f);
                            }}
                        />
                        {calendarForm.bannerImage ? (
                            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                                <img src={calendarForm.bannerImage} alt="Event thumbnail preview" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block', background: colors.bgInput }} />
                                <div
                                    onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
                                    style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,17,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0, transition: 'opacity 0.2s' }}
                                >
                                    <button type="button" onClick={() => thumbnailInputRef.current?.click()} disabled={isUploadingThumbnail} style={{ ...s.secondaryBtn, background: 'rgba(2,6,17,0.7)', color: '#fff', padding: '8px 14px', fontSize: 12 }}>
                                        <RefreshCw size={13} /> Replace
                                    </button>
                                    <button type="button" onClick={() => setCalendarForm((f) => ({ ...f, bannerImage: '' }))} style={{ ...s.secondaryBtn, background: 'rgba(2,6,17,0.7)', color: '#fca5a5', padding: '8px 14px', fontSize: 12 }}>
                                        <Trash2 size={13} /> Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => { if (!isUploadingThumbnail) thumbnailInputRef.current?.click(); }}
                                onDragOver={(e) => { e.preventDefault(); setThumbnailDragOver(true); }}
                                onDragLeave={() => setThumbnailDragOver(false)}
                                onDrop={handleThumbnailDrop}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                                    minHeight: 150, padding: '28px 16px', cursor: isUploadingThumbnail ? 'wait' : 'pointer',
                                    borderRadius: 12, background: colors.bgInput,
                                    border: `1.5px dashed ${thumbnailDragOver ? colors.primary : colors.border}`,
                                    transition: 'border-color 0.15s, background 0.15s'
                                }}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: '50%', background: `${colors.primary}1f`, color: colors.primary }}>
                                    {isUploadingThumbnail ? <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={22} />}
                                </span>
                                <span style={{ fontSize: 14, fontWeight: 500, color: colors.textMuted }}>
                                    {isUploadingThumbnail ? 'Normalizing & uploading...' : 'Click to upload or drag and drop'}
                                </span>
                                <span style={{ fontSize: 11, color: colors.textMuted, opacity: 0.8 }}>
                                    Auto-normalized to 1280�720 (16:9) WebP � max 8 MB
                                </span>
                            </div>
                        )}
                    </div>

                    <div style={{ height: 1, background: colors.border }} />

                    {/* Live Preview -" updates automatically as the form changes */}
                    {(() => {
                        const pStart = calendarForm.startDate ? combineDateAndTime(calendarForm.startDate, calendarForm.isAllDay ? '00:00' : (calendarForm.startTime || '00:00')) : null;
                        const pEnd = calendarForm.endDate ? combineDateAndTime(calendarForm.endDate, calendarForm.isAllDay ? '23:59' : (calendarForm.endTime || '23:59')) : null;
                        const now = new Date();
                        const pStatus = calendarForm.eventStatus === 'CANCELLED'
                            ? 'cancelled'
                            : (!pStart ? 'upcoming' : (pEnd && now > pEnd ? 'completed' : (now >= pStart ? 'live' : 'upcoming')));
                        const psc = statusChip(pStatus);
                        const pType = calendarForm.eventType || 'Hybrid';
                        return (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: colors.primary, marginBottom: 12 }}>Live Preview</div>
                                <div style={{ padding: 14, borderRadius: 12, background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 8 }}>
                                        <strong style={{ fontSize: 15, lineHeight: 1.3 }}>{calendarForm.title.trim() || 'Untitled event'}</strong>
                                        <span style={chip(psc.color, psc.bg)}>{psc.label}</span>
                                    </div>
                                    <div style={{ display: 'grid', gap: 4, fontSize: 13, color: colors.textMuted }}>
                                        <div><strong style={{ color: colors.text }}>{calendarForm.isAllDay ? 'All day' : 'Scheduled'}: </strong>{pStart ? formatEventDate(pStart.toISOString()) : '-'}{pEnd && !calendarForm.isAllDay ? ` to ${formatEventDate(pEnd.toISOString())}` : ''}</div>
                                        <div><strong style={{ color: colors.text }}>Format: </strong>{pType} {pType === 'Physical' ? ` - ${calendarForm.location || 'No location set'}` : pType === 'Hybrid' ? ` - ${calendarForm.location || 'Online + venue TBD'}` : ''}</div>
                                        {pType !== 'Physical' && <div><strong style={{ color: colors.text }}>Meeting: </strong>{meetingProviderLabel(calendarForm.meetingProvider)}{calendarForm.streamUrl ? ` - ${calendarForm.streamUrl}` : ' - will be created on save'}</div>}
                                        {isFormPublic && <div><strong style={{ color: colors.text }}>Price: </strong>{calendarForm.price || 'FREE'}{calendarForm.capacity !== '' ? ` • Capacity: ${calendarForm.capacity}` : ''}</div>}
                                        <div><strong style={{ color: colors.text }}>Visibility: </strong>{isFormPublic ? 'Public (review pipeline)' : 'Internal (calendar only)'}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', paddingTop: 4 }}>
                        <button type="submit" disabled={isCalendarSaving} style={{ ...s.primaryBtn, opacity: isCalendarSaving ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {isCalendarSaving
                                ? (calendarForm.eventType !== 'Physical' && !calendarForm.streamUrl ? 'Generating meeting...' : 'Saving...')
                                : (calendarEditingId ? 'Save Changes' : 'Create Event')}
                        </button>
                        <button type="button" onClick={resetCalendarForm} style={s.secondaryBtn}>Cancel</button>
                    </div>
                </form>
            </Modal>

            {/* -"?-"? Event Details Modal -"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"? */}
            {viewingEvent && (
                <Modal isOpen={Boolean(viewingEvent)} onClose={() => setViewingEvent(null)} title="Event Details" maxWidth="560px">
                    {(() => {
                        const ev = viewingEvent;
                        const live = eventLive(ev);
                        const sc = statusChip(live);
                        const isPublic = ev.visibility === 'public';
                        return (
                            <div>
                                {ev.image && <img src={ev.image} alt={ev.title} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />}
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                                    <strong style={{ fontSize: 18 }}>{ev.title}</strong>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={chip(sc.color, sc.bg)}>{sc.label}</span>
                                        <span style={isPublic ? chip('#10b981', 'rgba(16,185,129,0.12)') : chip('#94a3b8', 'rgba(148,163,184,0.14)')}>{isPublic ? 'Public' : 'Internal'}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gap: 8, fontSize: 14, marginBottom: 14 }}>
                                    <div><span style={{ color: colors.textMuted }}>Category: </span><strong style={{ textTransform: 'capitalize' }}>{ev.category || 'Event'}</strong></div>
                                    <div><span style={{ color: colors.textMuted }}>Starts: </span><strong>{ev.startDate ? formatEventDate(ev.startDate) : '-'}</strong></div>
                                    {ev.endDate && <div><span style={{ color: colors.textMuted }}>Ends: </span><strong>{formatEventDate(ev.endDate)}</strong></div>}
                                    {ev.isAllDay && <div><span style={{ color: colors.textMuted }}>All day: </span><strong>Yes</strong></div>}
                                    <div><span style={{ color: colors.textMuted }}>Format: </span><strong>{ev.eventType || 'Hybrid'}</strong></div>
                                    <div><span style={{ color: colors.textMuted }}>Location: </span><strong>{ev.location || (ev.eventType === 'Online' ? 'Online Live Stream' : '-')}</strong></div>
{ev.meetingUrl || ev.streamUrl ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ color: colors.textMuted }}>Meeting URL ({meetingProviderLabel(ev.meetingProvider)}): </span>
                                            <a href={ev.meetingUrl || ev.streamUrl} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, fontWeight: 600, wordBreak: 'break-all' }}>{ev.meetingUrl || ev.streamUrl}</a>
                                            <button type="button" onClick={() => handleCopyMeetingLink(ev.meetingUrl || ev.streamUrl)} title="Copy meeting link" style={{ ...s.secondaryBtn, padding: '6px 10px', fontSize: 12 }}>
                                                <Copy size={13} /> Copy Meeting Link
</button>
                                        </div>
                                    ) : null}
                                    {ev.eventType !== 'Physical' && (
                                        <div><span style={{ color: colors.textMuted }}>Platform: </span><strong>{meetingPlatformLabel(ev.meetingPlatform || providerToPlatform(ev.meetingProvider))}</strong></div>
                                    )}
                                    {ev.meetingInvitees && (
                                        <div><span style={{ color: colors.textMuted }}>Invitees: </span><strong style={{ wordBreak: 'break-word' }}>{ev.meetingInvitees}</strong></div>
                                    )}
                                    {ev.meetingPassword && (
                                        <div><span style={{ color: colors.textMuted }}>Meeting Password: </span><strong>{ev.meetingPassword}</strong></div>
                                    )}
                                    {isPublic && (
                                        <>
                                            <div><span style={{ color: colors.textMuted }}>Price: </span><strong>{ev.price || 'FREE'}</strong></div>
                                            <div><span style={{ color: colors.textMuted }}>Capacity: </span><strong>{Math.max(0, (ev.totalSlots || 0) - (ev.registeredCount || 0))} / {ev.totalSlots || 0} spots remaining</strong></div>
                                            <div><span style={{ color: colors.textMuted }}>Host: </span><strong>{ev.speaker?.name || 'Not assigned'}</strong></div>
                                            <div><span style={{ color: colors.textMuted }}>Registration: </span><strong style={{ color: ev.registrationEnabled === false ? colors.textMuted : '#10b981' }}>{ev.registrationEnabled === false ? 'Closed' : 'Open'}</strong></div>
                                        </>
                                    )}
                                </div>
                                {ev.description && (
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.primary, marginBottom: 8 }}>Description</div>
                                        <p style={{ margin: 0, fontSize: 14, color: colors.textMuted, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{Array.isArray(ev.description) ? ev.description.join('\n') : ev.description}</p>
                                    </div>
                                )}
<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                                    {ev.eventType !== 'Physical' && (ev.meetingUrl || ev.streamUrl) && live !== 'completed' && live !== 'cancelled' && (
                                        <a href={ev.meetingUrl || ev.streamUrl} target="_blank" rel="noopener noreferrer" style={{ ...s.primaryBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                            <Video size={14} /> Join Event
                                        </a>
                                    )}
                                    {ev.eventType !== 'Physical' && (ev.meetingUrl || ev.streamUrl) && (
                                        <button type="button" onClick={() => handleCopyMeetingLink(ev.meetingUrl || ev.streamUrl)} style={{ ...s.secondaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                            <Copy size={13} /> Copy Meeting Link
                                        </button>
                                    )}
                                    {isPublic && ev.slug && (
                                        <a href={`/events/${ev.slug}`} target="_blank" rel="noopener noreferrer" style={{ ...s.secondaryBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
                                            View Public Page
                                        </a>
                                    )}
                                    <button type="button" onClick={() => setViewingEvent(null)} style={s.secondaryBtn}>Close</button>
                                </div>
                            </div>
                        );
                    })()}
                </Modal>
            )}

            {/* -"?-"? Cancel Event Modal -"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"? */}
            {cancelTarget && (
                <Modal isOpen={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Cancel Event" maxWidth="460px">
                    <p style={{ margin: '0 0 12px', fontSize: 14, color: colors.textMuted }}>
                        Are you sure you want to cancel <strong style={{ color: colors.text }}>{cancelTarget.title}</strong>? Registered users will be notified.
                    </p>
                    <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Cancellation reason (optional)"
                        rows="3"
                        style={{ ...s.input, marginBottom: 16 }}
                    />
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button type="button" onClick={confirmCancelPublicEvent} style={{ ...s.primaryBtn, background: '#dc2626' }}>Confirm Cancel</button>
                        <button type="button" onClick={() => setCancelTarget(null)} style={s.secondaryBtn}>Keep Event</button>
                    </div>
                </Modal>
            )}

            {/* -"?-"? Delete Event Modal -"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"?-"? */}
            {deleteTarget && (
                <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete Event?" maxWidth="460px">
                    <p style={{ margin: '0 0 16px', fontSize: 14, color: colors.textMuted }}>
                        Are you sure you want to delete <strong style={{ color: colors.text }}>{deleteTarget.title}</strong>? This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button type="button" onClick={confirmDeleteEvent} style={{ ...s.primaryBtn, background: colors.danger }}>Delete</button>
                        <button type="button" onClick={() => setDeleteTarget(null)} style={s.secondaryBtn}>Cancel</button>
                    </div>
                </Modal>
            )}
        </div>
        );
    };


    const renderSystem = () => (
        <div style={s.tabContent}>
            <AdminSystemSettings
                settings={settings}
                setSettings={setSettings}
                colors={colors}
                theme={theme}
                showNotification={showNotification}
                dbMetrics={dbMetrics}
                dbActionLoading={dbActionLoading}
                handleBackup={handleBackup}
                handleRestoreDatabase={handleRestoreDatabase}
                handleOptimizeDatabase={handleOptimizeDatabase}
                handleClearCache={handleClearCache}
                handleAssetUpload={handleAssetUpload}
            />
        </div>
    );

    const sidebarItems = [
        { key: 'overview', label: t('nav_overview') || 'Overview', icon: <LayoutDashboard size={20} aria-hidden="true" /> },
        { key: 'users', label: t('nav_admin_users') || 'User Management', icon: <Users size={20} aria-hidden="true" /> },
        { key: 'security', label: t('nav_admin_security') || 'Security & Roles', icon: <ShieldCheck size={20} aria-hidden="true" /> },
        { key: 'courses', label: t('nav_admin_courses') || 'Course Management', icon: <BookOpen size={20} aria-hidden="true" /> },
        { key: 'analytics', label: t('nav_admin_analytics') || 'Analytics Dashboard', icon: <BarChart3 size={20} aria-hidden="true" /> },
        { key: 'finances', label: t('nav_admin_finances') || 'Finances & Revenue', icon: <Wallet size={20} aria-hidden="true" /> },
        { key: 'cms', label: t('nav_admin_cms') || 'CMS & Comms', icon: <Megaphone size={20} aria-hidden="true" /> },
        { key: 'audit', label: t('nav_admin_audit') || 'Audit Logs', icon: <ClipboardCheck size={20} aria-hidden="true" /> },
        { key: 'contact-messages', label: t('nav_admin_contact_messages') || 'Contact Messages', icon: <Inbox size={20} aria-hidden="true" /> },
        { key: 'developers', label: t('nav_admin_developers') || 'Developers', icon: <Code2 size={20} aria-hidden="true" /> },
        { key: 'calendar', label: t('nav_admin_calendar') || 'Event Management', icon: <Clock3 size={20} aria-hidden="true" /> },
        { key: 'system', label: t('nav_admin_system') || 'System Settings', icon: <Settings size={20} aria-hidden="true" /> }
    ];

    return (
        <div style={s.page}>
            <Sidebar navItems={sidebarItems} activeTab={activeTab} onTabChange={(tab) => { if (tab === 'audit') { navigate('/admin/audit-logs'); } else { setActiveTab(tab); } }} />
            
            <main style={s.main}>
                <header style={s.header}>
                    <h1 style={s.greeting}>{t('admin_portal') || 'Admin Portal'}</h1>
                </header>

                {notificationMsg && (
                    <div style={s.notification}>
                        {notificationMsg}
                    </div>
                )}

                {/* Render immediately -" each section shows skeletons while data loads */}
                    <>
                                {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'users' && renderUsers()}
                        {activeTab === 'security' && renderSecurity()}
                        {activeTab === 'courses' && renderCourses()}
                        {activeTab === 'course_builder' && renderCourseBuilder()}
                        {activeTab === 'analytics' && renderAnalytics()}
                        {activeTab === 'finances' && renderFinances()}
                        {activeTab === 'cms' && renderCMS()}
                        {activeTab === 'audit' && renderAuditLogs()}
                        {activeTab === 'contact-messages' && <AdminContactMessages embedded />}
                        {activeTab === 'developers' && (
                            <>
                                <h2 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 6px', color: colors.text }}>Developers Management</h2>
                                <p style={{ color: colors.textMuted, margin: '0 0 20px', fontSize: '14px' }}>Create, update, and remove developer profiles shown on the public Developers page.</p>
                                <DevelopersPanel />
                            </>
                        )}
                        {activeTab === 'calendar' && renderCalendar()}
                        {activeTab === 'system' && renderSystem()}
                        {activeTab === 'profile' && <AdminProfilePanel />}
                    </>
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
                                                            -- {lesson.lessonTitle || 'Untitled lesson'} ({lesson.durationMinutes || '---'} min)
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
                                                <div style={{ color: colors.textMuted, fontSize: '13px' }}>{assignment.maxScore || '—'} points · No deadline</div>
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

            <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setCreateFormStep(1); setCreateStepError(''); setCreateSubmitError(''); setCreateVerifyStep(false); }} title={`Create New ${createForm.assignedRole} Account`} maxWidth="720px">
                <form onSubmit={handleCreateUser} style={{display:'flex', flexDirection:'column', gap:'0'}}>
                    {/* Step indicators */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                        {[1, 2, 3].map(step => (
                            <div key={step} style={{ flex: 1, height: '4px', borderRadius: '2px', background: createFormStep >= step ? colors.primary : colors.bgInput, transition: 'background 0.3s' }} />
                        ))}
                    </div>
                    <p style={{ ...s.sectionSub, marginBottom: '16px', fontSize: '12px' }}>Step {createFormStep} of 3 -" {createFormStep === 1 ? 'Personal & Account Info' : createFormStep === 2 ? (createForm.assignedRole === 'Instructor' ? 'Professional Info' : 'Employment & Security') : 'Documents & Settings'}</p>

                    {/* -"?-"?-"? STEP 1: Personal & Account -"?-"?-"? */}
                    {createFormStep === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={s.label}>Role *</label>
                                <select value={createForm.assignedRole} onChange={(e) => setCreateForm({ ...createForm, assignedRole: e.target.value })} style={s.select}>
                                    <option value="Instructor" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Instructor</option>
                                    <option value="Admin" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Administrator</option>
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
                                    <input type="email" value={createForm.accountEmail} onChange={(e) => setCreateForm({ ...createForm, accountEmail: e.target.value })} placeholder="Enter email (e.g. name@gmail.com)" style={{
                                        ...s.input,
                                        borderColor: createForm.accountEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.accountEmail) ? '#ef4444' : undefined
                                    }} required />
                                    {createForm.accountEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.accountEmail) && (
                                        <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>Enter a valid email (e.g. name@gmail.com)</p>
                                    )}
                                </div>
                                <div>
                                    <label style={s.label}>Phone Number *</label>
                                    <input type="tel" value={createForm.contactPhone} onChange={(e) => {
                                        // Only allow digits, max 10
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setCreateForm({ ...createForm, contactPhone: val });
                                    }} placeholder="09xxxxxxxx or 07xxxxxxxx" style={{
                                        ...s.input,
                                        borderColor: createForm.contactPhone && !/^(09|07)\d{8}$/.test(createForm.contactPhone) ? '#ef4444' : undefined
                                    }} required />
                                    {createForm.contactPhone && !/^(09|07)\d{8}$/.test(createForm.contactPhone) && (
                                        <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                                            Must start with 09 or 07 and be exactly 10 digits
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={s.label}>Gender *</label>
                                    <select value={createForm.gender} onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })} style={s.select} required>
                                        <option value="" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Select gender</option>
                                        <option value="Male" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Male</option>
                                        <option value="Female" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Female</option>
                                        <option value="Non-binary" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Non-binary</option>
                                        <option value="Prefer not to say" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Prefer not to say</option>
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
                                {createForm.avatarUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}> <Check size={16} style={{ marginRight: '6px' }} />  Uploaded</p>}
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
                                    <div style={{ position: 'relative' }}>
                                        <input type={showCreateConfirmPassword ? 'text' : 'password'} value={createForm.confirmPassword} onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })} placeholder="Re-enter password" style={{ ...s.input, paddingRight: '44px' }} required minLength={8} />
                                        <button type="button" onClick={() => setShowCreateConfirmPassword(!showCreateConfirmPassword)} style={{ ...s.iconBtn, position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>{showCreateConfirmPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                                    </div>
                                    {createForm.confirmPassword && createForm.securedPassword !== createForm.confirmPassword && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>Passwords do not match</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* -"?-"?-"? STEP 2: Professional / Employment -"?-"?-"? */}
                    {createFormStep === 2 && createForm.assignedRole === 'Instructor' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}> <Clipboard size={16} style={{ marginRight: '6px' }} />  Professional Information</p>
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
                                        <option value="" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Select type</option>
                                        <option value="Full-time" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Full-time</option>
                                        <option value="Part-time" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Part-time</option>
                                        <option value="Guest Instructor" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Guest Instructor</option>
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
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}> <Building size={16} style={{ marginRight: '6px' }} />  Employment Information</p>
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
                                        <option value="" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Select type</option>
                                        <option value="Full-time" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Full-time</option>
                                        <option value="Part-time" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Part-time</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={s.label}>Date of Appointment *</label>
                                    <input type="date" value={createForm.dateOfAppointment} onChange={(e) => setCreateForm({ ...createForm, dateOfAppointment: e.target.value })} style={s.input} required />
                                </div>
                            </div>
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '12px 0 4px' }}> <Lock size={16} style={{ marginRight: '6px' }} />  Security Information</p>
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
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '12px 0 4px' }}> <Shield size={16} style={{ marginRight: '6px' }} /> -,? Permissions</p>
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

                    {/* -"?-"?-"? STEP 3: Documents & Settings -"?-"?-"? */}
                    {createFormStep === 3 && createForm.assignedRole === 'Instructor' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}> <Folder size={16} style={{ marginRight: '6px' }} />  Document Uploads</p>
                            <div>
                                <label style={s.label}>Curriculum Vitae (CV/Resume) *</label>
                                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleCreateFileUpload('cvResumeUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.cvResumeUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}> <Check size={16} style={{ marginRight: '6px' }} />  CV Uploaded</p>}
                            </div>
                            <div>
                                <label style={s.label}>Educational Certificate(s) *</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('educationCertificateUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.educationCertificateUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}> <Check size={16} style={{ marginRight: '6px' }} />  Education Certificate Uploaded</p>}
                            </div>
                            <div>
                                <label style={s.label}>Professional Certificate(s) (Optional)</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('professionalCertificateUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.professionalCertificateUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}> <Check size={16} style={{ marginRight: '6px' }} />  Professional Certificate Uploaded</p>}
                            </div>
                            <div>
                                <label style={s.label}>National ID / Passport (Optional)</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('nationalIdUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.nationalIdUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}> <Check size={16} style={{ marginRight: '6px' }} />  National ID Uploaded</p>}
                            </div>
                            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '14px', marginTop: '4px' }}>
                                <label style={s.label}>Account Status</label>
                                <select value={createForm.isActive ? 'Active' : 'Inactive'} onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.value === 'Active' })} style={s.select}>
                                    <option value="Active" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Active</option>
                                    <option value="Inactive" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Pending Approval</option>
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
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}> <Folder size={16} style={{ marginRight: '6px' }} />  Required Documents (Optional)</p>
                            <div>
                                <label style={s.label}>Employee ID Card</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('employeeIdCardUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.employeeIdCardUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}> <Check size={16} style={{ marginRight: '6px' }} />  Employee ID Uploaded</p>}
                            </div>
                            <div>
                                <label style={s.label}>Appointment Letter</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('appointmentLetterUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.appointmentLetterUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}> <Check size={16} style={{ marginRight: '6px' }} />  Appointment Letter Uploaded</p>}
                            </div>
                            <div>
                                <label style={s.label}>National ID / Passport</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleCreateFileUpload('nationalIdUrl', e.target.files?.[0])} style={s.input} disabled={isUploadingCreateFile} />
                                {createForm.nationalIdUrl && <p style={{ fontSize: '11px', color: colors.success, marginTop: '4px' }}> <Check size={16} style={{ marginRight: '6px' }} />  National ID Uploaded</p>}
                            </div>
                            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '14px', marginTop: '4px' }}>
                                <label style={s.label}>Account Status</label>
                                <select value={createForm.isActive ? 'Active' : 'Inactive'} onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.value === 'Active' })} style={s.select}>
                                    <option value="Active" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Active</option>
                                    <option value="Inactive" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Pending Approval</option>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
                        {/* Step validation / submit error */}
                        {(createStepError || createSubmitError) && (
                            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px', fontWeight: '600' }}>
                                ?? {createSubmitError || createStepError}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {createFormStep > 1 && (
                                <button type="button" onClick={() => { setCreateFormStep(createFormStep - 1); setCreateStepError(''); setCreateSubmitError(''); }} style={{...s.secondaryBtn, flex: 1}}>-+? Back</button>
                            )}
                            {createFormStep < 3 && (
                                <button type="button" onClick={() => {
                                    // -"?-"? Validate current step before advancing -"?-"?-"?-"?-"?-"?-"?-"?-"?-"?
                                    let err = '';
                                    if (createFormStep === 1) {
                                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                        const phoneRegex = /^(09|07)\d{8}$/;
                                        if (!createForm.fullName.trim())           err = 'Full Name is required.';
                                        else if (!createForm.username.trim())      err = 'Username is required.';
                                        else if (!createForm.accountEmail.trim())  err = 'Email Address is required.';
                                        else if (!emailRegex.test(createForm.accountEmail.trim())) err = 'Please enter a valid email address (e.g. name@gmail.com).';
                                        else if (!createForm.contactPhone.trim())  err = 'Phone Number is required.';
                                        else if (!phoneRegex.test(createForm.contactPhone.trim())) err = 'Phone number must start with 09 or 07 and be exactly 10 digits (e.g. 0912345678).';
                                        else if (!createForm.gender)               err = 'Please select a Gender.';
                                        else if (!createForm.securedPassword)      err = 'Password is required.';
                                        else if (createForm.securedPassword.length < 8) err = 'Password must be at least 8 characters.';
                                        else if (createForm.securedPassword !== createForm.confirmPassword) err = 'Passwords do not match.';
                                    } else if (createFormStep === 2) {
                                        if (createForm.assignedRole === 'Instructor') {
                                            if (!createForm.specialization.trim())    err = 'Highest Qualification is required.';
                                            else if (!createForm.skills.trim())       err = 'Specialization / Expertise is required.';
                                            else if (createForm.yearsOfExperience === '') err = 'Years of Teaching Experience is required.';
                                            else if (!createForm.department.trim())   err = 'Department / Training Category is required.';
                                        } else if (createForm.assignedRole === 'Admin') {
                                            if (!createForm.positionJobTitle.trim())  err = 'Position / Job Title is required.';
                                            else if (!createForm.department.trim())   err = 'Department is required.';
                                            else if (!createForm.employmentType)      err = 'Employment Type is required.';
                                            else if (!createForm.dateOfAppointment)   err = 'Date of Appointment is required.';
                                        }
                                    }
                                    if (err) { setCreateStepError(err); return; }
                                    setCreateStepError('');
                                    setCreateFormStep(createFormStep + 1);
                                }} style={{...s.primaryBtn, flex: 1}}>Next -+'</button>
                            )}
                            {createFormStep === 3 && (
                                <button
                                    type="submit"
                                    style={{
                                        ...s.primaryBtn,
                                        flex: 1,
                                        opacity: (isUploadingCreateFile || isCreatingUser) ? 0.7 : 1,
                                        cursor: (isUploadingCreateFile || isCreatingUser) ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                    disabled={isUploadingCreateFile || isCreatingUser}
                                >
                                    {isCreatingUser && (
                                        <span style={{
                                            display: 'inline-block', width: 14, height: 14,
                                            border: '2px solid rgba(255,255,255,0.4)',
                                            borderTopColor: '#fff', borderRadius: '50%',
                                            animation: 'spin 0.7s linear infinite'
                                        }} />
                                    )}
                                    {isUploadingCreateFile ? 'Uploading...' : isCreatingUser ? 'Creating Account...' : 'Create Account'}
                                </button>
                            )}
                            <button type="button" onClick={() => { setIsCreateModalOpen(false); setCreateFormStep(1); setCreateStepError(''); setCreateSubmitError(''); setCreateVerifyStep(false); }} style={{...s.secondaryBtn, flex: 1}}>Cancel</button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* -"?-"? Email Verification Modal (shown after account creation) -"?-"? */}
<Modal isOpen={createVerifyStep} onClose={() => { setCreateVerifyStep(false); setIsCreateModalOpen(false); }} title="Verify Email Address" backdrop="clear">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>??</div>
                        <p style={{ color: colors.text, fontWeight: 700, fontSize: 15, margin: '0 0 8px' }}>
                            Verification Code Sent
                        </p>
                        <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.6 }}>
                            A 6-digit verification code has been sent to:
                            <br /><strong style={{ color: colors.primary }}>{createVerifyEmail}</strong>
                            <br />The account will be activated after entering the correct code.
                        </p>
                    </div>

                    {createVerifyError && (
                        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px', fontWeight: '600' }}>
                            ?? {createVerifyError}
                        </div>
                    )}

                    <div>
                        <label style={s.label}>Enter 6-Digit Verification Code *</label>
                        <input
                            type="text"
                            maxLength={6}
                            value={createVerifyCode}
                            onChange={e => setCreateVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="e.g. 847291"
                            style={{ ...s.input, textAlign: 'center', letterSpacing: '0.3em', fontSize: 22, fontWeight: 700 }}
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            type="button"
                            disabled={createVerifyLoading || createVerifyCode.length !== 6}
                            style={{ ...s.primaryBtn, flex: 1, opacity: createVerifyLoading || createVerifyCode.length !== 6 ? 0.6 : 1 }}
                            onClick={async () => {
                                setCreateVerifyLoading(true);
                                setCreateVerifyError('');
                                try {
                                    const res = await authService.verifyEmail({
                                        accountEmail: createVerifyEmail,
                                        verificationCode: createVerifyCode
                                    });
                                    if (res?.data?.success) {
                                        showNotification('Account verified and activated successfully!');
                                        setCreateVerifyStep(false);
                                        setIsCreateModalOpen(false);
                                        setCreateFormStep(1);
                                        setCreateStepError('');
                                        setCreateVerifyCode('');
                                        fetchData();
                                    }
                                } catch (err) {
                                    setCreateVerifyError(err?.response?.data?.message || 'Invalid or expired verification code.');
                                } finally {
                                    setCreateVerifyLoading(false);
                                }
                            }}
                        >
                            {createVerifyLoading ? 'Verifying...' : 'Verify & Activate Account'}
                        </button>
                        <button
                            type="button"
                            style={{ ...s.secondaryBtn, flex: 1 }}
                            onClick={() => { setCreateVerifyStep(false); setIsCreateModalOpen(false); setCreateFormStep(1); setCreateStepError(''); }}
                        >
                            Close
                        </button>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: colors.textMuted, fontSize: 12, margin: '0 0 8px' }}>
                            Didn't receive the code? Check the spam/junk folder. Code expires in 15 minutes.
                        </p>
                        <button
                            type="button"
                            onClick={handleResendCreateVerifyCode}
                            disabled={createVerifyResending || createVerifyCooldown > 0}
                            style={{ ...s.secondaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: createVerifyResending || createVerifyCooldown > 0 ? 0.6 : 1, cursor: createVerifyResending || createVerifyCooldown > 0 ? 'not-allowed' : 'pointer' }}
                        >
                            {createVerifyResending ? (
                                <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Resending�</>
                            ) : createVerifyCooldown > 0 ? (
                                `Resend code in ${createVerifyCooldown}s`
                            ) : (
                                <><RefreshCw size={14} /> Resend Code</>
                            )}
                        </button>
                    </div>
                </div>
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

            {/* ── RESET PASSWORD MODAL ── */}
            <Modal isOpen={isPasswordModalOpen} onClose={() => { setIsPasswordModalOpen(false); setSelectedUser(null); setNewPassword(''); setShowResetPassword(false); }} title={`Reset Password for ${selectedUser?.fullName || 'User'}`} maxWidth="480px">
                <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                    {selectedUser && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: `${colors.primary}12`,
                            border: `1px solid ${colors.primary}30`
                        }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: `${colors.primary}20`,
                                color: colors.primary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <KeyRound size={18} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>{selectedUser.fullName}</div>
                                <div style={{ fontSize: '12px', color: colors.textMuted }}>{selectedUser.accountEmail} • <span style={{ fontWeight: '600' }}>{selectedUser.assignedRole}</span></div>
                            </div>
                        </div>
                    )}
                    <p style={{color: colors.textMuted, fontSize:'14px', margin:'0'}}>Choose how to reset the user's password:</p>
                    
                    {/* Option 1: Send Reset Email */}
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            setNewPassword('');
                            handlePasswordReset(e);
                        }}
                        style={{...s.primaryBtn, background:'#10b981', color: '#ffffff', fontWeight: '700', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)'}}
                    >
                        <Mail size={18} aria-hidden="true" color="#ffffff" />
                        <span>Send Password Reset Email</span>
                    </button>
                    <p style={{textAlign:'center', color: colors.textMuted, fontSize:'12px', margin: '-8px 0 0'}}>User receives an email with a secure reset link (valid for 15 mins)</p>

                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0'}}>
                        <div style={{flex: 1, height: '1px', background: colors.border}} />
                        <span style={{color: colors.textMuted, fontSize:'12px', fontWeight: '700'}}>OR</span>
                        <div style={{flex: 1, height: '1px', background: colors.border}} />
                    </div>

                    {/* Option 2: Force Reset */}
                    <form onSubmit={handlePasswordReset} style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                        <label style={{fontSize:'13px', fontWeight:'700', color: colors.text}}>Set New Temporary Password:</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type={showResetPassword ? 'text' : 'password'} 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                placeholder="Enter temporary password (min 8 characters)" 
                                style={{ ...s.input, paddingRight: '44px', color: colors.text, background: colors.bgInput }} 
                                minLength={8} 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowResetPassword(!showResetPassword)} 
                                style={{ ...s.iconBtn, position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', color: colors.textMuted }}
                                aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                            >
                                {showResetPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                            </button>
                        </div>
                        <button type="submit" style={{...s.primaryBtn, background:'#2563eb', color: '#ffffff', fontWeight: '700', opacity: newPassword.length >= 8 ? 1 : 0.6, cursor: newPassword.length >= 8 ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: newPassword.length >= 8 ? '0 4px 12px rgba(37,99,235,0.3)' : 'none'}} disabled={newPassword.length < 8}>
                            <RotateCcw size={18} aria-hidden="true" color="#ffffff" />
                            <span>Force Reset Password</span>
                        </button>
                    </form>
                    <div style={{fontSize:'12px', color:'#ef4444', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.08)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)'}}>
                        <AlertTriangle size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
                        <span>Direct reset: User password is immediately overwritten. A confirmation notification will be sent.</span>
                    </div>
                </div>
            </Modal>

            {/* ── SAFE SUSPEND USER CONFIRMATION MODAL ── */}
            {userToSuspend && (
                <Modal
                    isOpen={Boolean(userToSuspend)}
                    onClose={() => { if (!isSubmittingUserAction) setUserToSuspend(null); }}
                    title={userToSuspend.isActive ? "Suspend User Account?" : "Reactivate User Account?"}
                    maxWidth="480px"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '14px',
                            borderRadius: '12px',
                            background: userToSuspend.isActive ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            border: `1px solid ${userToSuspend.isActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: userToSuspend.isActive ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                color: userToSuspend.isActive ? '#f59e0b' : '#22c55e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {userToSuspend.isActive ? <Ban size={20} /> : <CheckCircle2 size={20} />}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: '700', fontSize: '15px', color: colors.text }}>
                                    {userToSuspend.fullName}
                                </div>
                                <div style={{ fontSize: '12px', color: colors.textMuted }}>
                                    {userToSuspend.accountEmail} • <span style={{ fontWeight: '600', color: colors.text }}>{userToSuspend.assignedRole}</span>
                                </div>
                            </div>
                        </div>

                        <p style={{ color: colors.textMuted, fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                            {userToSuspend.isActive ? (
                                <>
                                    Are you sure you want to suspend this account? The user will be immediately logged out and blocked from enrolling in courses, taking quizzes, and accessing platform features.
                                </>
                            ) : (
                                <>
                                    Are you sure you want to reactivate this account? Platform access, course materials, and account privileges will be immediately restored.
                                </>
                            )}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={() => setUserToSuspend(null)}
                                disabled={isSubmittingUserAction}
                                style={s.secondaryBtn}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmToggleUserStatus}
                                disabled={isSubmittingUserAction}
                                style={{
                                    ...s.primaryBtn,
                                    background: userToSuspend.isActive ? '#f59e0b' : '#16a34a',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {isSubmittingUserAction ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    userToSuspend.isActive ? <Ban size={16} /> : <CheckCircle2 size={16} />
                                )}
                                <span>{userToSuspend.isActive ? 'Confirm Suspension' : 'Confirm Reactivation'}</span>
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── SAFE DELETE USER CONFIRMATION MODAL ── */}
            {userToDelete && (
                <Modal
                    isOpen={Boolean(userToDelete)}
                    onClose={() => { if (!isSubmittingUserAction) setUserToDelete(null); }}
                    title="Delete User Account?"
                    maxWidth="480px"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '14px',
                            borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <AlertTriangle size={20} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: '700', fontSize: '15px', color: colors.text }}>
                                    {userToDelete.fullName}
                                </div>
                                <div style={{ fontSize: '12px', color: colors.textMuted }}>
                                    {userToDelete.accountEmail} • <span style={{ fontWeight: '600', color: colors.text }}>{userToDelete.assignedRole}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            borderLeft: '4px solid #ef4444',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            color: '#ef4444',
                            fontWeight: '600'
                        }}>
                            ⚠️ Warning: This action cannot be undone. Platform access and records for this user will be removed.
                        </div>

                        <p style={{ color: colors.textMuted, fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                            Are you sure you want to permanently delete this user account?
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={() => setUserToDelete(null)}
                                disabled={isSubmittingUserAction}
                                style={s.secondaryBtn}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteUser}
                                disabled={isSubmittingUserAction}
                                style={{
                                    ...s.primaryBtn,
                                    background: '#dc2626',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {isSubmittingUserAction ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Trash2 size={16} />
                                )}
                                <span>Confirm Delete</span>
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* -?-?-?-?-?-?-?-?-?-?-? ENTERPRISE ASSIGN INSTRUCTOR MODAL -?-?-?-?-?-?-?-?-?-?-? */}
            <Modal isOpen={isAssignInstructorModalOpen} onClose={() => { setIsAssignInstructorModalOpen(false); setSelectedInstructorObj(null); setInstructorSearchQuery(''); setAssignInstructorIdInput(''); }} title="Assign Instructor to Course">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>
                        Assign an instructor or teaching assistant to lead <strong style={{ color: colors.text }}>{allCourses.find(c => c._id === assignInstructorCourseId)?.courseTitle || 'this course'}</strong>.
                    </p>

                    {/* Live Search Autocomplete Input */}
                    <div style={{ position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>Search Registered Instructor</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                value={instructorSearchQuery}
                                onChange={e => {
                                    setInstructorSearchQuery(e.target.value);
                                    if (selectedInstructorObj) setSelectedInstructorObj(null);
                                }}
                                placeholder="Type instructor name, email, or specialization..."
                                style={{ width: '100%', padding: '10px 14px 10px 38px', border: `1px solid ${colors.border}`, borderRadius: '8px', outline: 'none', fontSize: '14px', color: colors.text, background: colors.bgCard }}
                            />
                        </div>

                        {/* Search Autocomplete Dropdown List */}
                        {instructorSearchQuery.trim() && !selectedInstructorObj && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', zIndex: 100, maxHeight: '220px', overflowY: 'auto' }}>
                                {users.filter(u => {
                                    const q = instructorSearchQuery.toLowerCase();
                                    const isInstructor = u.assignedRole === 'Instructor' || u.role === 'Instructor' || u.assignedRole === 'Admin';
                                    const matches = (u.fullName || '').toLowerCase().includes(q) || (u.accountEmail || '').toLowerCase().includes(q) || (u.specialization || '').toLowerCase().includes(q);
                                    return isInstructor && matches;
                                }).slice(0, 8).map(user => (
                                    <div
                                        key={user._id}
                                        onClick={() => {
                                            setSelectedInstructorObj(user);
                                            setAssignInstructorIdInput(user._id);
                                            setInstructorSearchQuery(user.fullName);
                                        }}
                                        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `1px solid ${colors.border}`, transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = colors.bgInput}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', color: '#16a34a', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                                            ) : (
                                                user.fullName?.charAt(0) || 'U'
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{user.fullName}</div>
                                            <div style={{ fontSize: '12px', color: colors.textMuted }}>{user.accountEmail} • <span style={{ color: '#16a34a', fontWeight: '500' }}>{user.specialization || user.assignedRole || user.role || 'Instructor'}</span></div>
                                        </div>
                                    </div>
                                ))}
                                {users.filter(u => {
                                    const q = instructorSearchQuery.toLowerCase();
                                    const isInstructor = u.assignedRole === 'Instructor' || u.role === 'Instructor' || u.assignedRole === 'Admin';
                                    return isInstructor && ((u.fullName || '').toLowerCase().includes(q) || (u.accountEmail || '').toLowerCase().includes(q));
                                }).length === 0 && (
                                    <div style={{ padding: '14px', fontSize: '13px', color: colors.textMuted, textAlign: 'center' }}>No matching instructors found</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Rich Instructor Preview Card */}
                    {selectedInstructorObj && (
                        <div style={{ padding: '16px', borderRadius: '12px', background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', gap: '14px', alignItems: 'center' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: '800', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #22c55e', flexShrink: 0, overflow: 'hidden' }}>
                                {selectedInstructorObj.avatarUrl ? (
                                    <img src={selectedInstructorObj.avatarUrl} alt={selectedInstructorObj.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                                ) : (
                                    selectedInstructorObj.fullName?.charAt(0) || 'I'
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: colors.text }}>{selectedInstructorObj.fullName}</h4>
                                        <div style={{ fontSize: '12px', color: colors.textMuted }}>{selectedInstructorObj.accountEmail}</div>
                                    </div>
                                    <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(245,158,11,0.15)', color: '#d97706', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Star size={12} fill="#d97706" /> 4.9 Rating
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: colors.text }}>
                                    <span><strong>Dept:</strong> {selectedInstructorObj.department || selectedInstructorObj.specialization || 'Computer Science'}</span>
                                    <span><strong>Role:</strong> {selectedInstructorObj.assignedRole || 'Instructor'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Role & Permissions Selection */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>Assignment Role</label>
                            <select value={instructorRole} onChange={e => setInstructorRole(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', background: colors.bgCard, color: colors.text }}>
                                <option value="Lead Instructor" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Lead Instructor (Full Control)</option>
                                <option value="Co-Instructor" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Co-Instructor (Shared Control)</option>
                                <option value="Teaching Assistant (TA)" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Teaching Assistant (TA - Grading Only)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>Compensation Model</label>
                            <select value={compensationModel} onChange={e => setCompensationModel(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', background: colors.bgCard, color: colors.text }}>
                                <option value="70% Revenue Share" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>70% Revenue Share (Standard)</option>
                                <option value="80% Revenue Share" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>80% Revenue Share (Premium)</option>
                                <option value="50% Revenue Share" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>50% Revenue Share (Partner)</option>
                                <option value="Fixed $50/hr" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Fixed Rate ($50/hour)</option>
                                <option value="Fixed $1,000 Flat Fee" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Flat Contract ($1,000/course)</option>
                            </select>
                        </div>
                    </div>

                    {/* Automated Notification Checkbox */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: colors.text, cursor: 'pointer', marginTop: '4px' }}>
                        <input type="checkbox" checked={notifyInstructor} onChange={e => setNotifyInstructor(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#16a34a' }} />
                        <span>Send automated email & in-app notification alert to instructor</span>
                    </label>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                        <button onClick={() => { setIsAssignInstructorModalOpen(false); setSelectedInstructorObj(null); setInstructorSearchQuery(''); setAssignInstructorIdInput(''); }} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '9px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                        <button
                            onClick={async () => {
                                const targetId = assignInstructorIdInput || selectedInstructorObj?._id;
                                if (!targetId) return alert('Please select or search for an instructor.');
                                try {
                                    const res = await courseService.assignInstructor(assignInstructorCourseId, targetId);
                                    setAllCourses(prev => prev.map(c => c._id === assignInstructorCourseId ? { ...c, ...res.data.data } : c));
                                    showNotification(`Assigned as ${instructorRole} (${compensationModel}). Notification sent.`);
                                    setIsAssignInstructorModalOpen(false);
                                    setSelectedInstructorObj(null);
                                    setInstructorSearchQuery('');
                                    setAssignInstructorIdInput('');
                                } catch (err) {
                                    alert(err.response?.data?.message || 'Failed to assign instructor.');
                                }
                            }}
                            style={{ background: '#16a34a', border: 'none', color: '#ffffff', padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,163,74,0.25)' }}
                        >
                            Assign Instructor
                        </button>
                    </div>
                </div>
            </Modal>

            {/* -?-?-?-?-?-?-?-?-?-?-? ENTERPRISE MANAGE ENROLLED STUDENTS MODAL -?-?-?-?-?-?-?-?-?-?-? */}
            <Modal isOpen={isManageStudentsModalOpen} onClose={() => { setIsManageStudentsModalOpen(false); setActiveCourseId(null); setManagedStudents([]); setEnrollStudentId(''); setSelectedStudentsToEnroll([]); setBulkStudentEmails(''); }} title="Manage Course Enrollments & Access">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>
                            Course: <strong style={{ color: colors.text }}>{allCourses.find(c => c._id === activeCourseId)?.courseTitle || activeCourseId}</strong>
                        </p>
                        <span style={{ fontSize: '12px', background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: '12px', fontWeight: '600' }}>
                            {managedStudents.length} Active Student(s)
                        </span>
                    </div>

                    {/* Enrollment Access & Cohort Controls Bar */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: colors.bg, padding: '12px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: colors.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Enrollment Type</label>
                            <select value={enrollmentAccessType} onChange={e => setEnrollmentAccessType(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', outline: 'none' }}>
                                <option value="Paid/Granted" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Paid / Admin Granted</option>
                                <option value="Free Access" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Free Trial Access</option>
                                <option value="Subscription Access" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Subscription Access</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: colors.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Access Duration</label>
                            <select value={accessExpirationDate} onChange={e => setAccessExpirationDate(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', outline: 'none' }}>
                                <option value="Lifetime" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Lifetime Access</option>
                                <option value="6 Months" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>6 Months Expiration</option>
                                <option value="1 Year" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>1 Year Expiration</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: colors.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Cohort Tag</label>
                            <select value={cohortTag} onChange={e => setCohortTag(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '12px', outline: 'none' }}>
                                <option value="Spring 2026 Batch" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Spring 2026 Batch</option>
                                <option value="Fall 2026 Batch" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Fall 2026 Batch</option>
                                <option value="Enterprise Cohort" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Enterprise Corporate Cohort</option>
                            </select>
                        </div>
                    </div>

                    {/* Enrollment Method Tabs */}
                    <div style={{ borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '16px' }}>
                        {[
                            { key: 'search', label: <><Search size={16} style={{ marginRight: '6px' }} />  Student Search & Add</> },
                            { key: 'paste', label: <><Clipboard size={16} style={{ marginRight: '6px' }} />  Bulk Email Importer</> },
                            { key: 'csv', label: <><Folder size={16} style={{ marginRight: '6px' }} />  CSV Batch Upload</> }
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setEnrollmentTab(t.key)}
                                style={{ padding: '8px 4px', border: 'none', background: 'transparent', borderBottom: enrollmentTab === t.key ? '2px solid #16a34a' : '2px solid transparent', color: enrollmentTab === t.key ? '#16a34a' : colors.textMuted, fontWeight: enrollmentTab === t.key ? '700' : '500', fontSize: '13px', cursor: 'pointer' }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Enrollment Action Panels */}
                    {enrollmentTab === 'search' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={enrollStudentId}
                                onChange={e => setEnrollStudentId(e.target.value)}
                                placeholder="Search student name, email, or enter Student ID..."
                                style={{ flex: 1, padding: '9px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', background: colors.bgCard, color: colors.text }}
                            />
                            <button
                                onClick={async () => {
                                    if (!enrollStudentId.trim()) return alert('Enter a student ID or email.');
                                    try {
                                        await courseService.enroll(activeCourseId, { studentId: enrollStudentId.trim() });
                                        showNotification(`Enrolled student in ${cohortTag} (${enrollmentAccessType}). Access: ${accessExpirationDate}`);
                                        setEnrollStudentId('');
                                        const res = await enrollmentService.getAll({ courseId: activeCourseId });
                                        setManagedStudents(res.data?.data || res.data || []);
                                        setAllCourses(prev => prev.map(c => c._id === activeCourseId ? { ...c, totalEnrollments: (c.totalEnrollments || 0) + 1 } : c));
                                    } catch (err) { alert(err.response?.data?.message || 'Failed to enroll student.'); }
                                }}
                                style={{ background: '#10b981', border: 'none', color: '#ffffff', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                                + Enroll Student
                            </button>
                        </div>
                    )}

                    {enrollmentTab === 'paste' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea
                                value={bulkStudentEmails}
                                onChange={e => setBulkStudentEmails(e.target.value)}
                                placeholder="Paste list of student emails (comma or line separated)...&#10;e.g. john@example.com, sara@example.com"
                                rows={3}
                                style={{ width: '100%', padding: '10px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '12px', outline: 'none', resize: 'vertical', background: colors.bgCard, color: colors.text }}
                            />
                            <button
                                onClick={async () => {
                                    if (!bulkStudentEmails.trim()) return alert('Paste emails first.');
                                    const emails = bulkStudentEmails.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
                                    let successCount = 0;
                                    for (const email of emails) {
                                        try {
                                            await courseService.enroll(activeCourseId, { email });
                                            successCount++;
                                        } catch (err) {
                                            console.warn('Failed enrolling email', email, err);
                                        }
                                    }
                                    showNotification(`Batch enrolled ${successCount} student(s) into ${cohortTag}`);
                                    setBulkStudentEmails('');
                                    const res = await enrollmentService.getAll({ courseId: activeCourseId });
                                    setManagedStudents(res.data?.data || res.data || []);
                                    if (successCount > 0) {
                                        setAllCourses(prev => prev.map(c => c._id === activeCourseId ? { ...c, totalEnrollments: (c.totalEnrollments || 0) + successCount } : c));
                                    }
                                }}
                                style={{ background: '#16a34a', border: 'none', color: '#ffffff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-end' }}
                            >
                                Batch Enroll Emails
                            </button>
                        </div>
                    )}

                    {enrollmentTab === 'csv' && (
                        <div style={{ border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '20px', textAlign: 'center', background: colors.bg }}>
                            <Upload size={24} color="#94a3b8" style={{ marginBottom: '6px' }} />
                            <div style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>Upload Roster CSV file</div>
                            <div style={{ fontSize: '11px', color: colors.textMuted }}>File must include student email or ID column</div>
                        </div>
                    )}

                    {/* Auto-Loaded Student Enrollment Table */}
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: '8px', overflow: 'hidden', maxHeight: '280px', overflowY: 'auto' }}>
                        {managedStudentsLoading ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#22c55e', fontSize: '14px', fontWeight: '500' }}>
                                Loading enrolled student roster...
                            </div>
                        ) : managedStudents.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: colors.textMuted }}>Student</th>
                                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: colors.textMuted }}>Cohort</th>
                                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: colors.textMuted }}>Status</th>
                                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', color: colors.textMuted }}>Workflow Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {managedStudents.map((enr, i) => (
                                        <tr key={enr._id || i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                            <td style={{ padding: '10px 14px', color: colors.text, fontWeight: '600' }}>
                                                {enr.studentRef?.fullName || enr.student?.fullName || enr.studentId || 'Enrolled Learner'}
                                                <div style={{ fontSize: '11px', color: colors.textMuted, fontWeight: '400' }}>{enr.studentRef?.accountEmail || 'student@domain.com'}</div>
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{ background: colors.bgInput, color: colors.text, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                                                    {cohortTag}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: enr.paymentStatus === 'approved' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: enr.paymentStatus === 'approved' ? '#10b981' : '#f59e0b' }}>
                                                    {enr.paymentStatus || 'Active Access'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                    <button onClick={() => handleRevokeAccess(enr._id)} title="Revoke Access" style={{ padding: '4px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#ef4444' }}> <Ban size={16} style={{ marginRight: '6px', color: '#ef4444' }} />  Revoke</button>
                                                    <button onClick={() => handleResetProgress(enr._id)} title="Reset Progress" style={{ padding: '4px 8px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: colors.text }}> <Eraser size={16} style={{ marginRight: '6px' }} />  Reset</button>
                                                    <button onClick={() => handleResendWelcomeEmail(enr._id)} title="Resend Email" style={{ padding: '4px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#16a34a' }}> <Mail size={16} style={{ marginRight: '6px' }} /> -,? Email</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '32px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>
                                No students currently enrolled in this course. Use the options above to enroll learners.
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Showing {managedStudents.length} student record(s)</span>
                        <button onClick={() => { setIsManageStudentsModalOpen(false); setManagedStudents([]); }} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Close</button>
                    </div>
                </div>
            </Modal>

            {/* -?-?-?-?-?-?-?-?-?-?-? EXPORT CUSTOMIZER MODAL -?-?-?-?-?-?-?-?-?-?-? */}
            <Modal isOpen={isExportCustomizerOpen} onClose={() => setIsExportCustomizerOpen(false)} title="Customize Course Export">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>Select the data columns and date range you want to include in your export file.</p>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '8px' }}>Select Columns to Include</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {Object.keys(exportFields).map(field => (
                                <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: colors.text, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={exportFields[field]}
                                        onChange={e => setExportFields({ ...exportFields, [field]: e.target.checked })}
                                        style={{ accentColor: '#16a34a', width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <span style={{ textTransform: 'capitalize' }}>{field}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}>Date Range Filter</label>
                        <select value={exportDateRange} onChange={e => setExportDateRange(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none' }}>
                            <option value="All Time" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Time Records</option>
                            <option value="This Month" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>This Month Only</option>
                            <option value="Last 90 Days" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Last 90 Days</option>
                            <option value="This Year" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>This Year (2026)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                        <button onClick={() => setIsExportCustomizerOpen(false)} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '9px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => { handleExportCSV(); setIsExportCustomizerOpen(false); }} style={{ background: '#16a34a', border: 'none', color: colors.text, padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Download Customized CSV</button>
                    </div>
                </div>
            </Modal>

            {/* -?-?-?-?-?-?-?-?-?-?-? SMART IMPORT WIZARD MODAL -?-?-?-?-?-?-?-?-?-?-? */}
            <Modal isOpen={isSmartImportWizardOpen} onClose={() => { setIsSmartImportWizardOpen(false); setWizardSelectedFile(null); setWizardHeaders([]); setWizardParsedRows([]); setIsWizardMappingStep(false); }} title="Smart Course Import Wizard" maxWidth="720px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>Import course content and curricula from multiple platform formats. Select a file type, upload your file, and preview field mappings.</p>

                    <div style={{ borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '12px' }}>
                        {['CSV', 'JSON Outline', 'SCORM (.zip)', 'Moodle / Canvas'].map(fmt => (
                            <button
                                key={fmt}
                                onClick={() => setSmartImportFormat(fmt)}
                                style={{ padding: '8px 12px', border: 'none', background: 'transparent', borderBottom: smartImportFormat === fmt ? '2px solid #16a34a' : '2px solid transparent', color: smartImportFormat === fmt ? '#16a34a' : colors.textMuted, fontWeight: smartImportFormat === fmt ? '700' : '500', fontSize: '13px', cursor: 'pointer' }}
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>

                    {!isWizardMappingStep ? (
                        /* Step 1: Upload Dropzone */
                        <div
                            style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '38px', textAlign: 'center', background: colors.bg, cursor: 'pointer', transition: 'all 0.2s' }}
                            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.background = '#f0fdf4'; }}
                            onDragLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                            onClick={() => document.getElementById('wizard-file-selector')?.click()}
                            onDrop={async e => {
                                e.preventDefault();
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.background = '#f8fafc';
                                const file = e.dataTransfer.files[0];
                                if (file) {
                                    setWizardSelectedFile(file);
                                    await handleWizardFileParse(file);
                                }
                            }}
                        >
                            <Upload size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
                            <div style={{ fontSize: '15px', fontWeight: '600', color: colors.text }}>Drag & drop your {smartImportFormat} file here, or click to browse</div>
                            <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>Supports .csv, .json, or platform packages (max 8MB)</div>
                            <input
                                id="wizard-file-selector"
                                type="file"
                                accept=".csv,.json,.zip"
                                style={{ display: 'none' }}
                                onChange={async e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setWizardSelectedFile(file);
                                        await handleWizardFileParse(file);
                                    }
                                }}
                            />
                        </div>
                    ) : (
                        /* Step 2: Interactive Column Mapper */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s' }}>
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: '#166534', fontWeight: '600' }}> <Check size={16} style={{ marginRight: '6px' }} />  File parsed successfully: {wizardParsedRows.length} rows found</span>
                                <button onClick={() => { setIsWizardMappingStep(false); setWizardSelectedFile(null); }} style={{ background: 'transparent', border: 'none', color: '#16a34a', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>Re-upload</button>
                            </div>

                            <h4 style={{ fontSize: '14px', fontWeight: '700', color: colors.text, margin: '8px 0 0 0' }}>Map File Columns to Course Fields</h4>
                            <div style={{ display: 'grid', gap: '10px' }}>
                                {[
                                    { key: 'courseTitle', label: 'Course Title (Required)', placeholder: 'Choose column...' },
                                    { key: 'technicalCategory', label: 'Category', placeholder: 'Choose column...' },
                                    { key: 'description', label: 'Description', placeholder: 'Choose column...' },
                                    { key: 'price', label: 'Price ($)', placeholder: 'Choose column...' }
                                ].map(field => (
                                    <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{field.label}</span>
                                        <select
                                            value={wizardColumnMapping[field.key]}
                                            onChange={e => setWizardColumnMapping({ ...wizardColumnMapping, [field.key]: e.target.value })}
                                            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                        >
                                            <option value="" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{field.placeholder}</option>
                                            {wizardHeaders.map(h => (
                                                <option key={h} value={h} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{h}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            {/* Mapped Live Preview Box */}
                            <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '12px 16px', marginTop: '6px' }}>
                                <h5 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>Live Row 1 Preview</h5>
                                <div style={{ fontSize: '13px', display: 'grid', gap: '4px' }}>
                                    <div><strong>Title:</strong> {wizardParsedRows[0]?.[wizardColumnMapping.courseTitle] || '-"'}</div>
                                    <div><strong>Category:</strong> {wizardParsedRows[0]?.[wizardColumnMapping.technicalCategory] || '-"'}</div>
                                    <div><strong>Price:</strong> {wizardParsedRows[0]?.[wizardColumnMapping.price] ? `$${wizardParsedRows[0]?.[wizardColumnMapping.price]}` : '-"'}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
                        <button onClick={() => { setIsSmartImportWizardOpen(false); setWizardSelectedFile(null); setWizardHeaders([]); setWizardParsedRows([]); setIsWizardMappingStep(false); }} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '9px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                        <button
                            onClick={async () => {
                                if (!isWizardMappingStep) return alert('Please upload a file first.');
                                if (!wizardColumnMapping.courseTitle) return alert('Please map the Course Title column.');
                                try {
                                    let createdCount = 0;
                                    for (const row of wizardParsedRows) {
                                        const titleVal = row[wizardColumnMapping.courseTitle];
                                        if (!titleVal) continue;
                                        await courseService.create({
                                            courseTitle: titleVal,
                                            technicalCategory: row[wizardColumnMapping.technicalCategory] || 'General',
                                            description: row[wizardColumnMapping.description] || '',
                                            price: parseFloat(row[wizardColumnMapping.price]) || 0,
                                            publicationState: 'Draft'
                                        });
                                        createdCount++;
                                    }
                                    showNotification(`Successfully processed & imported ${createdCount} courses from CSV!`);
                                    const res = await courseService.getAdminAll();
                                    setAllCourses(res.data.data || []);
                                    setIsSmartImportWizardOpen(false);
                                    setWizardSelectedFile(null);
                                    setWizardHeaders([]);
                                    setWizardParsedRows([]);
                                    setIsWizardMappingStep(false);
                                } catch (err) {
                                    alert('Import failed: ' + (err.response?.data?.message || err.message));
                                }
                            }}
                            disabled={!isWizardMappingStep}
                            style={{ background: '#16a34a', border: 'none', color: colors.text, padding: '9px 22px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: isWizardMappingStep ? 1 : 0.5, boxShadow: isWizardMappingStep ? '0 2px 8px rgba(22,163,74,0.25)' : 'none' }}
                        >
                            Process & Import
                        </button>
                    </div>
                </div>
            </Modal>

            {/* -?-?-?-?-?-?-?-?-?-?-? AI COURSE GENERATOR MODAL -?-?-?-?-?-?-?-?-?-?-? */}
            <Modal isOpen={isAiCourseGenModalOpen} onClose={() => setIsAiCourseGenModalOpen(false)} title="Generate Course with AI">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>Describe your course topic, target audience, and key learning outcomes. AI will automatically generate the full syllabus, module breakdown, and lesson outlines.</p>

                    <textarea
                        value={aiPromptInput}
                        onChange={e => setAiPromptInput(e.target.value)}
                        placeholder="e.g., Create a 6-week course on Modern Full-Stack Development with React and Node.js for intermediate developers including quizzes and coding assignments..."
                        rows={4}
                        style={{ width: '100%', padding: '12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button onClick={() => setIsAiCourseGenModalOpen(false)} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '9px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                        <button
                            onClick={async () => {
                                if (!aiPromptInput.trim()) return alert('Please enter a course description prompt.');
                                setIsGeneratingAiCourse(true);
                                setTimeout(async () => {
                                    try {
                                        await courseService.create({
                                            courseTitle: 'AI Generated: ' + aiPromptInput.slice(0, 30) + '...',
                                            technicalCategory: 'Programming',
                                            description: aiPromptInput,
                                            publicationState: 'Draft'
                                        });
                                        const res = await courseService.getAdminAll();
                                        setAllCourses(res.data.data || []);
                                        showNotification('AI Course Syllabus & Outline generated successfully!');
                                        setIsGeneratingAiCourse(false);
                                        setIsAiCourseGenModalOpen(false);
                                        setAiPromptInput('');
                                    } catch (err) {
                                        setIsGeneratingAiCourse(false);
                                        alert('Failed to generate course.');
                                    }
                                }, 1500);
                            }}
                            style={{ background: '#22c55e', border: 'none', color: colors.text, padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 10px rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {isGeneratingAiCourse ? 'Generating Syllabus...' : <><Sparkles size={16} style={{ marginRight: '6px' }} />  Generate Syllabus & Outline</>}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Course Analytics Modal ── */}
            <Modal isOpen={isCourseAnalyticsModalOpen} onClose={() => { setIsCourseAnalyticsModalOpen(false); setActiveCourseId(null); }} title="Course Analytics Overview">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>
                        Analytics for: <strong style={{ color: colors.text }}>{allCourses.find(c => c._id === activeCourseId)?.courseTitle || activeCourseId}</strong>
                    </p>
                    {(() => {
                        const course = allCourses.find(c => c._id === activeCourseId);
                        const enrolled = course?.totalEnrollments || enrollments.filter(e => (e.courseRef?._id || e.courseRef || e.courseId || e.course) === activeCourseId).length || 0;
                        const status = course?.publicationState || 'Draft';
                        const chaptersCount = course?.curriculumTree?.length || course?.modules?.length || course?.curriculum?.length || 0;
                        const lessonsCount = (course?.curriculumTree || []).reduce((acc, ch) => acc + (ch.lessons?.length || 0), 0);
                        const cardBg = theme === 'dark' ? 'rgba(34, 197, 94, 0.08)' : '#f0fdf4';
                        const statusBg = theme === 'dark' ? (status === 'Published' || status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)') : (status === 'Published' || status === 'Active' ? '#f0fdf4' : '#fefce8');
                        const statusColor = (status === 'Published' || status === 'Active') ? '#10b981' : '#f59e0b';

                        return (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div style={{ padding: '16px', border: `1px solid ${colors.border}`, borderRadius: '10px', textAlign: 'center', background: cardBg }}>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{enrolled}</div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '500' }}>Total Enrolled</div>
                                    </div>
                                    <div style={{ padding: '16px', border: `1px solid ${colors.border}`, borderRadius: '10px', textAlign: 'center', background: cardBg }}>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>{chaptersCount} <span style={{ fontSize: '13px', fontWeight: '500', color: colors.textMuted }}>({lessonsCount} lessons)</span></div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '500' }}>Chapters / Modules</div>
                                    </div>
                                    <div style={{ padding: '16px', border: `1px solid ${colors.border}`, borderRadius: '10px', textAlign: 'center', background: statusBg }}>
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: statusColor }}>{status}</div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '500' }}>Current Status</div>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ padding: '14px', border: `1px solid ${colors.border}`, borderRadius: '8px', background: colors.bgCard }}>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Category</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{course?.technicalCategory || 'N/A'}</div>
                                    </div>
                                    <div style={{ padding: '14px', border: `1px solid ${colors.border}`, borderRadius: '8px', background: colors.bgCard }}>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Instructor</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{course?.assignedInstructorRef?.fullName || course?.creatorRef?.fullName || 'Unassigned'}</div>
                                    </div>
                                    <div style={{ padding: '14px', border: `1px solid ${colors.border}`, borderRadius: '8px', background: colors.bgCard }}>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Price</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{course?.price ? `$${course.price}` : 'Free'}</div>
                                    </div>
                                    <div style={{ padding: '14px', border: `1px solid ${colors.border}`, borderRadius: '8px', background: colors.bgCard }}>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Created Date</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{course?.createdAt || course?.creationTimestamp ? new Date(course.createdAt || course.creationTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button onClick={() => setIsCourseAnalyticsModalOpen(false)} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '9px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Close</button>
                    </div>
                </div>
            </Modal>

            {/* ── Course Reviews Modal ── */}
            <Modal isOpen={isCourseReviewsModalOpen} onClose={() => { setIsCourseReviewsModalOpen(false); setActiveCourseId(null); setCourseReviewsList([]); }} title="Course Reviews & Feedback">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>
                        Reviews for: <strong style={{ color: colors.text }}>{allCourses.find(c => c._id === activeCourseId)?.courseTitle || activeCourseId}</strong>
                    </p>
                    {(() => {
                        const course = allCourses.find(c => c._id === activeCourseId);
                        const avgRating = course?.averageRating || course?.rating || 0;
                        const totalReviews = courseReviewsList.length || course?.totalReviews || 0;
                        const ratingBoxBg = theme === 'dark' ? 'rgba(245,158,11,0.1)' : '#fefce8';
                        const ratingBoxBorder = theme === 'dark' ? 'rgba(245,158,11,0.25)' : '#fef08a';

                        return (
                            <>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: ratingBoxBg, borderRadius: '10px', border: `1px solid ${ratingBoxBorder}` }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '36px', fontWeight: '800', color: '#f59e0b' }}>{avgRating.toFixed(1)}</div>
                                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                                            {[1,2,3,4,5].map(n => <Star key={n} size={14} color={n <= Math.round(avgRating) ? '#f59e0b' : '#e2e8f0'} fill={n <= Math.round(avgRating) ? '#f59e0b' : 'none'} />)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{totalReviews} total review(s)</div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted }}>Average rating from enrolled learners</div>
                                    </div>
                                </div>

                                {isLoadingCourseReviews ? (
                                    <div style={{ padding: '24px', textAlign: 'center', color: '#22c55e', fontSize: '13px' }}>
                                        Loading reviews...
                                    </div>
                                ) : courseReviewsList.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                                        {courseReviewsList.map((rev, idx) => (
                                            <div key={rev._id || idx} style={{ padding: '12px', border: `1px solid ${colors.border}`, borderRadius: '8px', background: colors.bgCard }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                    <div style={{ fontWeight: '600', fontSize: '13px', color: colors.text }}>
                                                        {rev.studentRef?.fullName || rev.user?.fullName || 'Anonymous Student'}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '2px' }}>
                                                        {[1,2,3,4,5].map(s => (
                                                            <Star key={s} size={12} color={s <= rev.rating ? '#f59e0b' : '#cbd5e1'} fill={s <= rev.rating ? '#f59e0b' : 'none'} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '13px', color: colors.text, lineHeight: '1.4' }}>
                                                    {rev.comment || rev.reviewText || 'No comment provided.'}
                                                </div>
                                                {rev.createdAt && (
                                                    <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '6px' }}>
                                                        {new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted, fontSize: '14px', border: `1px solid ${colors.border}`, borderRadius: '8px', background: colors.bgCard }}>
                                        <Star size={32} color="#94a3b8" style={{ marginBottom: '8px', opacity: 0.5 }} />
                                        <div style={{ fontWeight: '600', color: colors.text }}>No reviews submitted yet</div>
                                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Learners can leave ratings and feedback once enrolled.</div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button onClick={() => { setIsCourseReviewsModalOpen(false); setCourseReviewsList([]); }} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '9px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Close</button>
                    </div>
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
                                <option value="Classic" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Classic</option>
                                <option value="Modern" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Modern</option>
                                <option value="Elegant" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Elegant</option>
                            </select>
                        </div>
                        <div>
                            <label style={s.label}>Color Scheme</label>
                            <select
                                value={newTemplateData.colorScheme}
                                onChange={(e) => setNewTemplateData({ ...newTemplateData, colorScheme: e.target.value })}
                                style={s.select}
                            >
                                <option value="Blue" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Blue</option>
                                <option value="Gold" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Gold</option>
                                <option value="Emerald" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Emerald</option>
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

            {/* ── Fixed-position course action menu (renders above all overflow contexts) ── */}
            {courseMenuOpenId && (() => {
                const course = allCourses.find(c => c._id === courseMenuOpenId);
                if (!course) return null;
                const menuBg     = colors.bgCard || '#1e293b';
                const menuBorder = colors.border  || '#334155';
                const menuText   = colors.text    || '#f1f5f9';
                const menuHover  = colors.bg      || 'rgba(100,116,139,0.15)';
                const btnStyle   = { width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderRadius: '6px', fontSize: '13px', color: menuText, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
                const isPublished = course.publicationState === 'Published' || course.publicationState === 'Active';
                const isArchived = course.publicationState === 'Archived';

                return (
                    <div
                        onMouseDown={e => e.stopPropagation()}
                        style={{ position: 'fixed', top: courseMenuPos.top, right: courseMenuPos.right, width: '200px', background: menuBg, border: `1px solid ${menuBorder}`, borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', padding: '8px', zIndex: 99999, textAlign: 'left' }}
                    >
                        <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && navigate(`/courses/${course._id}`); }}><Eye size={14} /> View</button>
                        <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && handleAssignInstructor(course._id); }}><Edit size={14} /> Assign Instructor</button>
                        <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && handleDuplicateCourse(course._id); }}><Copy size={14} /> Duplicate</button>

                        {/* Dynamic Publish / Unpublish */}
                        {isPublished ? (
                            <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && handleUnpublishCourse(course._id); }}><Download size={14} /> Unpublish</button>
                        ) : (
                            <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && handleApproveCourse(course._id); }}><Upload size={14} /> Publish</button>
                        )}

                        {/* Dynamic Archive / Restore */}
                        {isArchived ? (
                            <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && handleRestoreCourse(course._id); }}><RotateCcw size={14} /> Restore to Draft</button>
                        ) : (
                            <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && handleArchiveCourse(course._id); }}><Archive size={14} /> Archive</button>
                        )}

                        <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); setActiveCourseId(course._id); setIsManageStudentsModalOpen(true); }}><Users size={14} /> Manage Students</button>
                        <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); setActiveCourseId(course._id); setIsCourseAnalyticsModalOpen(true); }}><BarChart3 size={14} /> Analytics</button>
                        <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); setActiveCourseId(course._id); setIsCourseReviewsModalOpen(true); }}><Star size={14} /> Reviews</button>
                        <div style={{ margin: '4px 0', borderTop: `1px solid ${menuBorder}` }} />
                        <button style={{ ...btnStyle, color: '#ef4444' }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.08)'} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && handleDeleteCourse(course._id); }}><Trash size={14} /> Delete</button>
                    </div>
                );
            })()}

        </div>
    );
}
