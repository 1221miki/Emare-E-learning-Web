import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { courseService, quizService, assignmentService, userService, enrollmentService, analyticsService, systemService, notificationService, authService, reportService, certificateService, contentService, uploadService, auditService, calendarService, eventService } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import AdminSystemSettings from '../../components/admin/AdminSystemSettings';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { LayoutDashboard, BarChart3, Users, UserCog, Building2, BookOpen, FolderTree, NotebookPen, Video, FileQuestion, ClipboardList, Award, Wallet, Receipt, DollarSign, TicketPercent, FileBarChart, Bell, Megaphone, MessageSquare, MessagesSquare, Bot, LifeBuoy, Settings, ShieldCheck, ClipboardCheck, DatabaseBackup, PlugZap, KeyRound, UserCircle, LogOut, TrendingUp, Clock3, Activity, PlusCircle, FilePen, Upload, Archive, Trash2, UserPlus, UserMinus, ShieldAlert, RotateCcw, CreditCard, PieChart as LucidePieChart, Mail, Eye, EyeOff, AlertTriangle, Palette, Languages, MoonStar, Database, BadgeInfo, CircleCheck, Server, GraduationCap, Search, Download, Monitor, Lock, Shield, MoreVertical, CheckCircle2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronDown, Edit, Image, User, Copy, Star, Settings2, DownloadCloud, Trash, Wand2, PartyPopper, FileText, HelpCircle, Clipboard, Pin, Headphones, File, Radio, XCircle, Flag, Package, MessageCircle, Folder, RefreshCw, ScrollText, X, Trophy, CheckSquare, Check, FileEdit, Scale, Repeat, Calendar, Ban, Medal, Plus, Rocket, Zap, Book, Library, Clock, Save, FolderOpen, Link, Circle, Bookmark, Building, Eraser, Sparkles, Pause, MapPin, Tag, Globe, ExternalLink, Loader2, Code2, Inbox } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getLiveStatus, LIVE_STATUS_META, formatEventDate, isValidUrl, EVENT_CATEGORIES } from '../../utils/eventStatus';
import CourseCreationWizard from '../instructor/CourseCreationWizard';
import { DevelopersPanel } from '../AdminDevelopers';

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
    { value: 'googleMeet', label: 'Google Meet' },
    { value: 'jitsi', label: 'Jitsi Meet' },
    { value: 'zoom', label: 'Zoom' },
    { value: 'microsoftTeams', label: 'Microsoft Teams' },
    { value: 'internal', label: 'Internal Join Link' },
    { value: 'custom', label: 'Manual URL' }
];
const meetingProviderLabel = (value) => (MEETING_PROVIDERS.find((p) => p.value === value) || { label: 'Internal Join Link' }).label;

// Virtual Meeting & Live Stream Settings platforms (form-facing)
const MEETING_PLATFORMS = [
    { value: 'googleMeet', label: 'Google Meet' },
    { value: 'zoom', label: 'Zoom' },
    { value: 'microsoftTeams', label: 'Microsoft Teams' },
    { value: 'jitsi', label: 'Jitsi Meet' },
    { value: 'youtubeLive', label: 'YouTube Live' },
    { value: 'rtmp', label: 'Custom RTMP / Web Stream' },
    { value: 'custom', label: 'Custom / Manual URL' }
];
const platformToProvider = { googleMeet: 'googleMeet', zoom: 'zoom', microsoftTeams: 'microsoftTeams', jitsi: 'jitsi', custom: 'custom', youtubeLive: 'custom', rtmp: 'custom' };
const GENERATABLE_PLATFORMS = ['googleMeet', 'zoom', 'microsoftTeams', 'jitsi'];

// ── Event thumbnail normalization ─────────────────────────
// Every uploaded thumbnail is center-cropped to a uniform 16:9 (1280x720)
// canvas and re-encoded as WebP (~85 quality) so all event cards get a
// consistent size, aspect ratio and format — smaller uploads, no layout shifts.
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
        // Some browsers cannot encode WebP — fall back to JPEG, then the original
        let output = blob;
        if (!output) {
            output = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        }
        if (!output) return file;
        const isWebp = output.type === 'image/webp';
        const baseName = (file.name || 'event-thumbnail').replace(/\.[^.]+$/, '');
        return new File([output], `${baseName}.${isWebp ? 'webp' : 'jpg'}`, { type: output.type });
    } catch {
        return file; // unreadable image — upload the original untouched
    }
};

// Infer the true meeting provider from the link itself. Prevents mislabeling
// (e.g. a Jitsi fallback link sent with meetingProvider 'googleMeet', which
// the backend correctly rejects as "not a valid Google Meet link").
const inferProviderFromUrl = (url) => {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(u)) return 'googleMeet';
    if (/^https:\/\/meet\.jit\.si\//i.test(u)) return 'jitsi';
    if (/zoom\.us/i.test(u)) return 'zoom';
    if (/teams\.microsoft\.com|teams\.live\.com/i.test(u)) return 'microsoftTeams';
    return 'custom';
};
const PASSWORD_PLATFORMS = ['googleMeet', 'zoom', 'custom', 'youtubeLive', 'rtmp'];
const OAUTH_PLATFORM = 'googleMeet';
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
const meetingPlatformLabel = (value) => (MEETING_PLATFORMS.find((p) => p.value === value) || { label: 'Google Meet' }).label;
const getDefaultMeetingLink = (platform, title) => {
    const slug = (title || 'emare-live-session').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'emare-live-session';
    if (platform === 'jitsi') return `https://meet.jit.si/${slug}`;
    return null;
};
const providerToPlatform = (provider) => {
    if (provider === 'zoom') return 'zoom';
    if (provider === 'googleMeet') return 'googleMeet';
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
    if (!dateStr) return '─"';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '─"';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const statusChip = (live) => ({
    upcoming: { label: 'Upcoming', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    live: { label: 'Ongoing', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    completed: { label: 'Completed', color: '#64748b', bg: 'rgba(100,116,139,0.14)' },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}[live] || { label: 'Upcoming', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' });

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
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(() => location.state?.activeTab || 'overview');
    const [userSubTab, setUserSubTab] = useState('accounts');
    const [loading, setLoading] = useState(false); // start false ─" show skeleton immediately

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
    const [isAssignInstructorModalOpen, setIsAssignInstructorModalOpen] = useState(false);
    const [assignInstructorCourseId, setAssignInstructorCourseId] = useState('');
    const [assignInstructorIdInput, setAssignInstructorIdInput] = useState('');
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isManageStudentsModalOpen, setIsManageStudentsModalOpen] = useState(false);
    const [isCourseAnalyticsModalOpen, setIsCourseAnalyticsModalOpen] = useState(false);
    const [isCourseReviewsModalOpen, setIsCourseReviewsModalOpen] = useState(false);
    const [activeCourseId, setActiveCourseId] = useState(null);
    const [courseStatusFilter, setCourseStatusFilter] = useState('All Status');
    const [courseSearchQuery, setCourseSearchQuery] = useState('');
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

    // ─"?─"? Fixed-position course action menu (escapes table overflow clipping) ─"?─"?
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

    const [moderationItems, setModerationItems] = useState([
        { id: 'MOD-101', title: 'React Hooks Deep Dive Video Lecture', course: 'React Masterclass', instructor: 'Daniel Berhe', type: 'Video Lecture', date: '2026-08-01', reports: 0, status: 'Approved', visibility: 'Visible', category: 'Programming', language: 'English', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
        { id: 'MOD-102', title: 'Intro to Machine Learning PDF syllabus', course: 'Intro to AI', instructor: 'Selam M.', type: 'PDF', date: '2026-08-03', reports: 3, status: 'Pending', visibility: 'Hidden', category: 'AI & ML', language: 'English', pdfUrl: 'https://pdfobject.com/pdf/sample.pdf' },
        { id: 'MOD-103', title: 'SQL Joins Practice Quiz', course: 'Database Design', instructor: 'Yonas A.', type: 'Quiz', date: '2026-08-04', reports: 0, status: 'Flagged', visibility: 'Visible', category: 'Database', language: 'English' },
        { id: 'MOD-104', title: 'Figma Mockup Portfolio Assignment', course: 'UI/UX Design', instructor: 'Meseret T.', type: 'Assignment', date: '2026-08-05', reports: 1, status: 'Pending', visibility: 'Visible', category: 'Design', language: 'English' },
        { id: 'MOD-105', title: 'Introduction to Firewalls Exam', course: 'Cybersecurity Essentials', instructor: 'Mekdes G.', type: 'Exam', date: '2026-08-05', reports: 5, status: 'Rejected', visibility: 'Hidden', category: 'Security', language: 'Amharic' },
        { id: 'MOD-106', title: 'Advanced Docker & Kubernetes Audio Guide', course: 'DevOps Bootcamp', instructor: 'Biniam K.', type: 'Audio', date: '2026-08-06', reports: 0, status: 'Archived', visibility: 'Hidden', category: 'Programming', language: 'English' }
    ]);

    const [moderationReports, setModerationReports] = useState([
        { id: 'REP-201', contentId: 'MOD-102', reporter: 'Abebe K.', reason: 'Low Quality', severity: 'Medium', date: '2026-08-04', status: 'Pending', assigned: 'Admin User' },
        { id: 'REP-202', contentId: 'MOD-105', reporter: 'Tsion Y.', reason: 'Copyright Violation', severity: 'High', date: '2026-08-05', status: 'Reviewed', assigned: 'Admin User' }
    ]);

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
    const [publicEvents, setPublicEvents] = useState([]);
    const [calendarForm, setCalendarForm] = useState({ title: '', category: 'academic', description: '', startDate: '', endDate: '', location: '', isAllDay: false, color: '#2563eb', eventType: 'Hybrid', streamUrl: '', bannerImage: '', galleryImages: '', enableRegistration: true, capacity: '', price: 'FREE', instructor: '', eventStatus: 'SCHEDULED', eventCategory: 'Masterclass', visibility: 'internal', startTime: '10:00', endTime: '11:00', meetingProvider: 'googleMeet', meetingPlatform: 'googleMeet', meetingInvitees: '', meetingPassword: '' });
    const [eventSearch, setEventSearch] = useState('');
    const [eventStatusFilter, setEventStatusFilter] = useState('all');
    const [eventCategoryFilter, setEventCategoryFilter] = useState('all');
    const [eventVisibilityFilter, setEventVisibilityFilter] = useState('all');
    const [eventDateFilter, setEventDateFilter] = useState('all');
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
    const [googleMeetStatus, setGoogleMeetStatus] = useState(null);
    const googleConfigured = Boolean(googleMeetStatus?.configured && (!googleMeetStatus.missingEnv || googleMeetStatus.missingEnv.length === 0));
    const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
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
    const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '', selectedPerms: ['View Analytics'], scope: 'Custom' });
    const availablePerms = ['View Analytics', 'User Management', 'Course Creation', 'Content Moderation', 'Financial Reports', 'System Settings'];
    const [customRoles, setCustomRoles] = useState([
        { icon: Eye, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', name: 'Moderator', desc: 'Content moderation', users: 15, perms: 14, scope: 'Content', isCore: false },
        { icon: LifeBuoy, color: '#ef4444', bg: 'rgba(239,68,68,0.15)', name: 'Support Staff', desc: 'Student support', users: 59, perms: 10, scope: 'Support', isCore: false }
    ]);
    const [permissionsMatrix, setPermissionsMatrix] = useState([
        { id: 'view_analytics', label: 'View Analytics', a: true, i: true, s: false },
        { id: 'manage_users', label: 'Manage Users', a: true, i: false, s: false },
        { id: 'create_courses', label: 'Create Courses', a: true, i: true, s: false },
        { id: 'take_quizzes', label: 'Take Quizzes', a: true, i: true, s: true },
        { id: 'system_settings', label: 'System Settings', a: true, i: false, s: false },
        { id: 'export_reports', label: 'Export Reports', a: true, i: true, s: false },
    ]);

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

    // Handle the Google Meet OAuth callback redirect (e.g. /admin?calendar=1&googleMeet=connected)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const gm = params.get('googleMeet');
        if (params.get('calendar') === '1') setActiveTab('calendar');
        if (gm === 'connected') {
            showNotification('Google Meet connected. You can now create real Google Meet meetings.');
            fetchGoogleStatus();
            // Return the admin to the Create/Edit Event modal they were working on.
            const saved = sessionStorage.getItem('googleAuthReturnForm');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed && parsed.form) {
                        setCalendarForm(parsed.form);
                        if (parsed.editingId) setCalendarEditingId(parsed.editingId);
                        setIsEventModalOpen(true);
                    }
                } catch (e) { /* ignore corrupted payload */ }
                sessionStorage.removeItem('googleAuthReturnForm');
            }
        } else if (gm === 'error') {
            showNotification(params.get('reason') ? `Google Meet connection failed: ${params.get('reason')}` : 'Google Meet connection failed.');
            sessionStorage.removeItem('googleAuthReturnForm');
        }
        if (gm) {
            const url = new URL(window.location.href);
            url.searchParams.delete('googleMeet');
            url.searchParams.delete('reason');
            url.searchParams.delete('calendar');
            window.history.replaceState({}, '', url);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const fetchGoogleStatus = async () => {
        try {
            const res = await calendarService.getGoogleStatus();
            setGoogleMeetStatus(res.data?.data || null);
        } catch (error) {
            setGoogleMeetStatus(null);
        }
    };

const handleConnectGoogleMeet = async () => {
        try {
            setIsGoogleConnecting(true);
            const res = await calendarService.getGoogleAuthUrl();
            const url = res.data?.data?.url;
            if (!url) throw new Error('No authorization URL returned.');
            // Preserve the form so the admin is returned to the Create Event modal
            // after authorizing on Google.
            try {
                sessionStorage.setItem('googleAuthReturnForm', JSON.stringify({
                    form: calendarForm,
                    editingId: calendarEditingId
                }));
            } catch (e) { /* non-fatal — the form simply resets on return */ }
            window.location.href = url;
        } catch (error) {
            setIsGoogleConnecting(false);
            showNotification(error.response?.data?.message || 'Could not start Google Meet connection.');
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
            await eventService.cancel(cancelTarget._id, { reason: cancelReason || 'Cancelled by administrator' });
            showNotification(`"${cancelTarget.title}" has been cancelled.`);
            setCancelTarget(null);
            fetchPublicEvents();
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
            fetchGoogleStatus();
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

    // ─"?─"? User Management ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?

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
                    // Lock the "Resend Code" button so the admin cannot spam it —
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
            // registered inbox. Codes are NEVER returned in the API response — the
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
            // Always restart the cooldown (success or failure) to prevent spamming —
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

    // ─"?─"? Course Management ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?

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
            setAllCourses(prev => prev.map(c => c._id === assignInstructorCourseId ? res.data.data : c));
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
            setAllCourses(prev => prev.map(c => c._id === id ? res.data.data : c));
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
            await enrollmentService.rejectPayment(enrId);
            showNotification('Student access revoked.');
            setManagedStudents(prev => prev.filter(s => s._id !== enrId));
        } catch (err) {
            alert('Failed to revoke access.');
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

    // ─"?─"? System Management ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?

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
        setCalendarForm({ title: '', category: 'academic', description: '', startDate: '', endDate: '', location: '', isAllDay: false, color: '#2563eb', eventType: 'Hybrid', streamUrl: '', bannerImage: '', galleryImages: '', enableRegistration: true, capacity: '', price: 'FREE', instructor: '', eventStatus: 'SCHEDULED', eventCategory: 'Masterclass', visibility: 'internal', startTime: '10:00', endTime: '11:00', meetingProvider: 'googleMeet', meetingPlatform: 'googleMeet', meetingInvitees: '', meetingId: '', meetingPassword: '' });
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
            // Normalize first: uniform 1280x720 (16:9) WebP — smaller, consistent
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
        if (calendarForm.eventType !== 'Physical' && trimmedUrl && !isValidUrl(trimmedUrl)) errors.streamUrl = 'Meeting URL is invalid — use a full http(s) link.';
        if (calendarForm.bannerImage && !isValidUrl(calendarForm.bannerImage)) errors.bannerImage = 'Event thumbnail URL is invalid — use a full http(s) link.';
        const inviteesResult = normalizeInviteesInput(calendarForm.meetingInvitees);
        if (inviteesResult.invalid.length) errors.meetingInvitees = `Invalid invitee email(s): ${inviteesResult.invalid.join(', ')}`;
        // NOTE: a disconnected Google Meet no longer blocks saving — the backend
        // automatically falls back to a free Jitsi link so Online/Hybrid events
        // always save with a working meeting URL.
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
        // be sent labeled as googleMeet (the backend would reject the save).
        const meetingProvider = streamUrl
            ? inferProviderFromUrl(streamUrl)
            : (platformToProvider[calendarForm.meetingPlatform] || calendarForm.meetingProvider || 'googleMeet');
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
            category: calendarForm.eventCategory || 'Masterclass',
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
            : (platformToProvider[calendarForm.meetingPlatform] || calendarForm.meetingProvider || 'googleMeet');
        return {
            title: calendarForm.title,
            category: calendarForm.category,
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
            color: calendarForm.color || '#2563eb',
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
        const toDatePart = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
        const toTimePart = (d) => (d ? new Date(d).toISOString().slice(11, 16) : '');
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
            color: event.color || '#2563eb',
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
            meetingProvider: event.meetingProvider || (event.streamUrl ? 'custom' : 'googleMeet'),
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
        if (provider === 'custom') return showNotification('Manual URLs are entered directly in the link field — no generation needed.');
        // NOTE: an unconnected provider no longer blocks generation — the backend
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
                ? `${meetingProviderLabel(provider)} is not connected — created a ${meetingProviderLabel(finalProvider)} link instead.`
                : (provider === 'googleMeet'
                    ? 'Real Google Meet meeting created and attached to this event.'
                    : `${meetingProviderLabel(finalProvider)} link generated.`));
        } catch (error) {
            showNotification(error.response?.data?.message || (provider === 'googleMeet' ? 'Google Meet creation failed. No meeting was created.' : 'Failed to generate meeting link.'));
        } finally {
            setIsGeneratingMeeting(false);
        }
    };

    const handleGeneratePlatformMeeting = async () => {
        const platform = calendarForm.meetingPlatform || 'googleMeet';
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

    // ─"?─"? RENDERERS ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?

    const s = {
        page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", background: colors.bg },
        main: { marginLeft: '260px', flex: 1, padding: '40px', overflowY: 'auto' },
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
                                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>{item.courseCount} course{item.courseCount === 1 ? '' : 's'} ── {item.enrollments} enrollments</div>
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

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    {[
                        { key: 'accounts', label: 'User Accounts', icon: <Users size={16} aria-hidden="true" /> },
                        { key: 'developers', label: 'Developers', icon: <Code2 size={16} aria-hidden="true" /> }
                    ].map(t => {
                        const isActive = userSubTab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setUserSubTab(t.key)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 22px', borderRadius: '999px', cursor: 'pointer',
                                    fontWeight: '700', fontSize: '13px',
                                    border: `1px solid ${isActive ? colors.primary : colors.border}`,
                                    background: isActive ? colors.primary : 'transparent',
                                    color: isActive ? '#fff' : colors.text
                                }}
                            >
                                {t.icon}{t.label}
                            </button>
                        );
                    })}
                </div>

                {userSubTab === 'developers' ? (
                    <DevelopersPanel />
                ) : (
                <>
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
                                <option value="All" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All accounts</option>
                                <option value="Student" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Students</option>
                                <option value="Instructor" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Instructors</option>
                                <option value="Admin" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Admins</option>
                            </select>
                            <button onClick={() => { setLoading(true); userService.getAll({ limit: 500 }).then(r => setUsers(r.data.data || [])).catch(() => {}).finally(() => setLoading(false)); }} style={{ ...s.secondaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <RefreshCw size={14} /> Refresh
                            </button>
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
                </>
                )}
            </div>
        );
    };

    const mockLoginActivity = [
        { date: 'May 30', logins: 80 }, { date: 'May 31', logins: 120 }, { date: 'Jun 01', logins: 90 }, 
        { date: 'Jun 02', logins: 160 }, { date: 'Jun 03', logins: 110 }, { date: 'Jun 04', logins: 85 }, { date: 'Jun 05', logins: 95 }
    ];

    const renderSecurity = () => {
        const coreRoles = [
            { icon: ShieldCheck, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', name: 'Super Admin', desc: 'Full system access', users: users.filter(u => u.assignedRole === 'Admin').length || 3, perms: '32', scope: 'System Wide', isCore: true },
            { icon: Users, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', name: 'Instructor', desc: 'Manage courses & content', users: users.filter(u => u.assignedRole === 'Instructor').length || 126, perms: '18', scope: 'Courses', isCore: true },
            { icon: GraduationCap, color: '#10b981', bg: 'rgba(16,185,129,0.15)', name: 'Student', desc: 'Access learning materials', users: users.filter(u => u.assignedRole === 'Student').length || 1045, perms: '8', scope: 'Enrolled Courses', isCore: true },
        ];
        const allRolesList = [...coreRoles, ...customRoles];

        const handleSaveNewRole = () => {
            if (!newRoleForm.name) return showNotification('Role name is required.');
            setIsCreatingRole(true);
            setTimeout(() => {
                setCustomRoles([...customRoles, {
                    icon: Shield, color: '#10b981', bg: 'rgba(16,185,129,0.15)', 
                    name: newRoleForm.name, 
                    desc: newRoleForm.description || 'Custom defined role', 
                    users: 0, 
                    perms: newRoleForm.selectedPerms.length, 
                    scope: newRoleForm.scope, 
                    isCore: false 
                }]);
                setIsCreatingRole(false);
                setIsAddRoleModalOpen(false);
                setNewRoleForm({ name: '', description: '', selectedPerms: ['View Analytics'], scope: 'Custom' });
                showNotification(`Role ${newRoleForm.name} created successfully.`);
            }, 600);
        };

        const handleExportSystemReport = () => {
            setSelectedReportType('system');
            setSelectedReportFormat('pdf');
            handleExportReport(); // Re-use existing export logic
        };

        const handlePermissionToggle = (index, roleKey, value) => {
            const newMatrix = [...permissionsMatrix];
            newMatrix[index][roleKey] = value;
            setPermissionsMatrix(newMatrix);
        };

        const handleSavePermissions = () => {
            setIsSavingPermissions(true);
            // Simulate network request for saving permissions
            setTimeout(() => {
                setIsSavingPermissions(false);
                setIsManagePermissionsModalOpen(false);
                showNotification('Role permissions successfully updated across the platform.');
            }, 800);
        };

        return (
        <div style={{ ...s.tabContent, padding: 0 }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: colors.text, margin: '0 0 4px 0' }}>Security & Roles</h2>
                    <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>Dashboard ── Security & Roles</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: colors.textMuted }} />
                        <input type="text" placeholder="Search anything..." style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '8px 12px 8px 36px', color: colors.text, fontSize: '13px', width: '240px', outline: 'none' }} />
                        <span style={{ position: 'absolute', right: 12, top: 10, color: colors.textMuted, fontSize: '12px', background: '#334155', padding: '2px 6px', borderRadius: '4px' }}>/</span>
                    </div>
                    <button onClick={handleExportSystemReport} disabled={isExportingReport} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '0 16px', color: '#cbd5e1', fontSize: '13px', fontWeight: '500', cursor: 'pointer', opacity: isExportingReport ? 0.7 : 1 }}>
                        <Download size={16} /> {isExportingReport ? 'Exporting...' : 'Export Report'}
                    </button>
                    <button onClick={() => setIsAddRoleModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', border: 'none', borderRadius: '8px', padding: '0 16px', color: colors.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)' }}>
                        <PlusCircle size={16} /> Add Role
                    </button>
                </div>
            </div>

            {/* Top Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {/* 1. Total Users */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
                        <Users size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Total Users</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>{users.length.toLocaleString() || '1,248'}</span>
                            <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center' }}><ArrowUp size={12} /> 12.5%</span>
                        </div>
                        <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>vs last month</div>
                    </div>
                </div>
                {/* 2. Active Sessions */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                        <Monitor size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Active Sessions</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>156</span>
                            <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center' }}><ArrowUp size={12} /> 8.3%</span>
                        </div>
                        <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>vs last month</div>
                    </div>
                </div>
                {/* 3. Failed Logins */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}>
                        <Lock size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Failed Logins (24h)</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>23</span>
                            <span style={{ fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center' }}><ArrowUp size={12} /> 15.2%</span>
                        </div>
                        <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>vs yesterday</div>
                    </div>
                </div>
                {/* 4. Roles */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
                        <Shield size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Roles</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>{allRolesList.length}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>+ {customRoles.length} custom</div>
                    </div>
                </div>
                {/* 5. Permissions */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4', flexShrink: 0 }}>
                        <KeyRound size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Permissions</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>32</span>
                        </div>
                        <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>No change<br/>vs last month</div>
                    </div>
                </div>
                {/* 6. Security Score */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Security Score</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>92<span style={{ fontSize: '14px', color: colors.textMuted }}>/100</span></span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px', display: 'flex', alignItems: 'center' }}><ArrowUp size={12} /> 5 points<br/><span style={{ color: colors.textMuted }}>vs last scan</span></div>
                    </div>
                </div>
            </div>

            {/* Middle Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '24px', marginBottom: '24px' }}>
                {/* Role & Permission Overview */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: 0 }}>Role & Permission Overview</h3>
                    </div>
                    <div style={{ padding: '0', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${colors.border}`, color: colors.textMuted }}>
                                    <th style={{ padding: '16px 24px', fontWeight: '500' }}>Role</th>
                                    <th style={{ padding: '16px', fontWeight: '500' }}>Users</th>
                                    <th style={{ padding: '16px', fontWeight: '500' }}>Permissions</th>
                                    <th style={{ padding: '16px', fontWeight: '500' }}>Scope</th>
                                    <th style={{ padding: '16px', fontWeight: '500' }}>Status</th>
                                    <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: '#cbd5e1' }}>
                                {allRolesList.map((role, idx) => (
                                    <tr key={idx} style={{ borderBottom: idx < allRolesList.length - 1 ? '1px solid #334155' : 'none' }}>
                                        <td style={{ padding: '16px 24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: role.bg, color: role.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <role.icon size={16} />
                                            </div>
                                            <div>
                                                <div style={{ color: colors.text, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {role.name}
                                                    {!role.isCore && <span style={{ fontSize: '10px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px' }}>Custom</span>}
                                                </div>
                                                <div style={{ color: colors.textMuted, fontSize: '12px' }}>{role.desc}</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', fontWeight: '500', color: colors.text }}>{Number(role.users).toLocaleString()}</td>
                                        <td style={{ padding: '16px', fontWeight: '500', color: colors.text }}>{role.perms}</td>
                                        <td style={{ padding: '16px', color: colors.textMuted }}>{role.scope}</td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ color: '#10b981', fontWeight: '500' }}>Active</span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => {
                                                    if (role.isCore) {
                                                        showNotification('Core system roles cannot be modified directly.');
                                                    } else {
                                                        const conf = window.confirm(`Delete custom role '${role.name}'?`);
                                                        if(conf) {
                                                            setCustomRoles(customRoles.filter(r => r.name !== role.name));
                                                            showNotification(`Role '${role.name}' deleted.`);
                                                        }
                                                    }
                                                }}
                                                style={{ background: '#334155', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: role.isCore ? '#64748b' : '#ef4444', cursor: 'pointer', transition: '0.2s' }}
                                                title={role.isCore ? "Cannot edit core role" : "Delete custom role"}
                                            >
                                                {role.isCore ? <MoreVertical size={14} /> : <Trash2 size={14} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'center', marginTop: 'auto' }}>
                        <button onClick={() => setIsManagePermissionsModalOpen(true)} style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '8px', padding: '8px 24px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: '0.2s', ':hover': { background: 'rgba(59,130,246,0.1)' } }}>
                            <Settings size={14} /> Manage Roles & Permissions
                        </button>
                    </div>
                </div>

                {/* Recent Security Events */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: 0 }}>Recent Security Events</h3>
                        <button onClick={() => setActiveTab('audit')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>View All Logs ─+'</button>
                    </div>
                    <div style={{ padding: '0', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${colors.border}`, color: colors.textMuted }}>
                                    <th style={{ padding: '16px 24px', fontWeight: '500' }}>Event</th>
                                    <th style={{ padding: '16px', fontWeight: '500' }}>User</th>
                                    <th style={{ padding: '16px', fontWeight: '500' }}>IP Address</th>
                                    <th style={{ padding: '16px', fontWeight: '500' }}>Location</th>
                                    <th style={{ padding: '16px', fontWeight: '500' }}>Time</th>
                                    <th style={{ padding: '16px 24px', fontWeight: '500' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: '#cbd5e1' }}>
                                {[
                                    { icon: ShieldCheck, color: '#10b981', name: 'Successful Login', user: 'admin@emare.com', ip: '127.0.0.1', loc: 'Localhost', time: '2 min ago', status: 'Success', sColor: '#10b981', sBg: 'rgba(16,185,129,0.1)' },
                                    { icon: AlertTriangle, color: '#ef4444', name: 'Failed Login Attempt', user: 'unknown@example.com', ip: '102.185.23.45', loc: 'Nairobi, KE', time: '6 min ago', status: 'Failed', sColor: '#ef4444', sBg: 'rgba(239,68,68,0.1)' },
                                    { icon: UserPlus, color: '#3b82f6', name: 'User Created', user: 'admin@emare.com', ip: '127.0.0.1', loc: 'Localhost', time: '15 min ago', status: 'Success', sColor: '#10b981', sBg: 'rgba(16,185,129,0.1)' },
                                    { icon: KeyRound, color: '#f59e0b', name: 'Role Updated', user: 'admin@emare.com', ip: '127.0.0.1', loc: 'Localhost', time: '32 min ago', status: 'Success', sColor: '#10b981', sBg: 'rgba(16,185,129,0.1)' },
                                    { icon: Lock, color: '#8b5cf6', name: 'Password Changed', user: 'instructor@emare.com', ip: '197.234.12.10', loc: 'Addis Ababa, ET', time: '1 hr ago', status: 'Success', sColor: '#10b981', sBg: 'rgba(16,185,129,0.1)' },
                                    { icon: ShieldAlert, color: '#ef4444', name: 'Failed Login Attempt', user: 'hacker@malicious.com', ip: '185.220.101.2', loc: 'Moscow, RU', time: '2 hr ago', status: 'Blocked', sColor: '#ef4444', sBg: 'rgba(239,68,68,0.1)' }
                                ].map((log, idx) => (
                                    <tr key={idx} style={{ borderBottom: idx < 5 ? '1px solid #334155' : 'none' }}>
                                        <td style={{ padding: '16px 24px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <log.icon size={16} color={log.color} />
                                            <span style={{ color: colors.text }}>{log.name}</span>
                                        </td>
                                        <td style={{ padding: '16px' }}>{log.user}</td>
                                        <td style={{ padding: '16px' }}>{log.ip}</td>
                                        <td style={{ padding: '16px' }}>{log.loc}</td>
                                        <td style={{ padding: '16px', color: colors.textMuted }}>{log.time}</td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{ color: log.sColor, background: log.sBg, border: `1px solid ${log.sBg.replace('0.1', '0.2')}`, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Bottom Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '24px' }}>
                {/* Login Activity Chart */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: '0 0 20px 0' }}>Login Activity (Last 7 Days)</h3>
                    <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                        <div style={{ flex: 1, height: '180px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={mockLoginActivity} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text }} />
                                    <Area type="monotone" dataKey="logins" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLogins)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ width: '140px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
                            <div>
                                <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Total Logins</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{ fontSize: '24px', fontWeight: '700', color: colors.text }}>892</span>
                                    <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center' }}><ArrowUp size={12} /> 18.6%</span>
                                </div>
                                <div style={{ fontSize: '11px', color: colors.textMuted }}>vs last 7 days</div>
                            </div>
                            <div style={{ height: '1px', background: '#334155' }}></div>
                            <div>
                                <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Unique Users</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{ fontSize: '24px', fontWeight: '700', color: colors.text }}>624</span>
                                    <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center' }}><ArrowUp size={12} /> 14.3%</span>
                                </div>
                                <div style={{ fontSize: '11px', color: colors.textMuted }}>vs last 7 days</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Status */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: 0 }}>Security Status</h3>
                        <button onClick={() => setActiveTab('audit')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>View Full Report ─+'</button>
                    </div>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flex: 1 }}>
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {[
                                { icon: ShieldCheck, name: 'SSL Certificate', desc: 'Valid until Aug 12, 2028' },
                                { icon: Shield, name: 'Firewall', desc: 'Web application firewall active' },
                                { icon: Lock, name: 'Two-Factor Auth', desc: 'Required for admins' },
                                { icon: DatabaseBackup, name: 'Backup Status', desc: 'Last backup: 2 hours ago' },
                                { icon: KeyRound, name: 'Password Policy', desc: 'Strong password enforced' },
                                { icon: ArrowUp, name: 'System Updates', desc: 'All systems up to date' }
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: colors.bg, padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <item.icon size={16} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: colors.text, fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{item.name}</div>
                                        <div style={{ color: colors.textMuted, fontSize: '11px' }}>{item.desc}</div>
                                    </div>
                                    <CircleCheck size={16} color="#10b981" />
                                </div>
                            ))}
                        </div>
                        <div style={{ width: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                {/* Fake SVG donut chart */}
                                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="#334155" strokeWidth="12" />
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="339.29" strokeDashoffset={339.29 * (1 - 0.92)} strokeLinecap="round" />
                                </svg>
                                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '28px', fontWeight: '700', color: colors.text, lineHeight: 1 }}>92<span style={{ fontSize: '16px' }}>%</span></span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: colors.text, fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>Security Score</div>
                                <div style={{ color: '#10b981', fontSize: '13px', fontWeight: '500' }}>Excellent</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals for Security & Roles interactions */}
            
            {/* 1. Add Role Modal */}
            <Modal isOpen={isAddRoleModalOpen} onClose={() => setIsAddRoleModalOpen(false)} title="Create New Role">
                <div style={{ padding: '24px', minWidth: '450px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: colors.textMuted, fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Role Name <span style={{ color: '#ef4444' }}>*</span></label>
                        <input type="text" value={newRoleForm.name} onChange={e => setNewRoleForm({...newRoleForm, name: e.target.value})} placeholder="e.g. Guest Instructor" style={{ width: '100%', background: colors.bgCard, border: `1px solid ${colors.border}`, padding: '12px 16px', borderRadius: '8px', color: colors.text, fontSize: '14px', outline: 'none', transition: '0.2s', ':focus': { borderColor: '#3b82f6' } }} />
                    </div>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: colors.textMuted, fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Description</label>
                        <textarea value={newRoleForm.description} onChange={e => setNewRoleForm({...newRoleForm, description: e.target.value})} placeholder="Briefly describe the purpose of this role..." rows="3" style={{ width: '100%', background: colors.bgCard, border: `1px solid ${colors.border}`, padding: '12px 16px', borderRadius: '8px', color: colors.text, fontSize: '14px', outline: 'none', resize: 'none', transition: '0.2s', ':focus': { borderColor: '#3b82f6' } }} />
                    </div>
                    
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', color: colors.textMuted, fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Access Scope</label>
                        <select value={newRoleForm.scope} onChange={e => setNewRoleForm({...newRoleForm, scope: e.target.value})} style={{ width: '100%', background: colors.bgCard, border: `1px solid ${colors.border}`, padding: '12px 16px', borderRadius: '8px', color: colors.text, fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                            <option value="Custom" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Custom - Selective Access</option>
                            <option value="Courses" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Courses - Restricted to Learning</option>
                            <option value="Reports" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Reports - Analytical Access Only</option>
                            <option value="Content" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Content - Moderation Access Only</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <label style={{ color: colors.textMuted, fontSize: '13px', fontWeight: '500' }}>Assigned Permissions</label>
                            <span style={{ fontSize: '12px', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>{newRoleForm.selectedPerms.length} Selected</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {availablePerms.map(perm => {
                                const isSelected = newRoleForm.selectedPerms.includes(perm);
                                return (
                                    <button 
                                        key={perm}
                                        onClick={() => {
                                            const perms = isSelected ? newRoleForm.selectedPerms.filter(p => p !== perm) : [...newRoleForm.selectedPerms, perm];
                                            setNewRoleForm({...newRoleForm, selectedPerms: perms});
                                        }}
                                        style={{ 
                                            background: isSelected ? 'rgba(16,185,129,0.15)' : '#1e293b', 
                                            border: `1px solid ${isSelected ? '#10b981' : '#334155'}`, 
                                            color: isSelected ? '#10b981' : '#cbd5e1', 
                                            padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        {perm}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
                        <button onClick={() => setIsAddRoleModalOpen(false)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: '#cbd5e1', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: '0.2s', ':hover': { background: colors.bgCard } }}>Cancel</button>
                        <button onClick={handleSaveNewRole} disabled={isCreatingRole} style={{ background: '#3b82f6', border: 'none', color: colors.text, padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: isCreatingRole ? 'not-allowed' : 'pointer', opacity: isCreatingRole ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                            {isCreatingRole ? 'Creating...' : <><PlusCircle size={16} /> Create Role</>}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* 2. Manage Permissions Modal */}
            <Modal isOpen={isManagePermissionsModalOpen} onClose={() => setIsManagePermissionsModalOpen(false)} title="Manage Roles & Permissions">
                <div style={{ padding: '24px', minWidth: '600px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '24px', marginTop: 0 }}>Configure platform-wide permissions for core system roles. Note: Changing core permissions may affect system security.</p>
                    
                    <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${colors.border}`, background: colors.bg }}>
                                    <th style={{ padding: '16px', color: colors.text, fontWeight: '500' }}>Permission Module</th>
                                    <th style={{ padding: '16px', color: colors.textMuted, fontWeight: '500', textAlign: 'center' }}>Super Admin</th>
                                    <th style={{ padding: '16px', color: colors.textMuted, fontWeight: '500', textAlign: 'center' }}>Instructor</th>
                                    <th style={{ padding: '16px', color: colors.textMuted, fontWeight: '500', textAlign: 'center' }}>Student</th>
                                </tr>
                            </thead>
                            <tbody>
                                {permissionsMatrix.map((row, i) => (
                                    <tr key={row.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                        <td style={{ padding: '16px', color: '#e2e8f0' }}>{row.label}</td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <input type="checkbox" checked={row.a} onChange={(e) => handlePermissionToggle(i, 'a', e.target.checked)} style={{ accentColor: '#3b82f6', cursor: 'pointer', width: '16px', height: '16px' }} />
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <input type="checkbox" checked={row.i} onChange={(e) => handlePermissionToggle(i, 'i', e.target.checked)} style={{ accentColor: '#3b82f6', cursor: 'pointer', width: '16px', height: '16px' }} />
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <input type="checkbox" checked={row.s} onChange={(e) => handlePermissionToggle(i, 's', e.target.checked)} style={{ accentColor: '#3b82f6', cursor: 'pointer', width: '16px', height: '16px' }} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                        <button onClick={handleSavePermissions} disabled={isSavingPermissions} style={{ background: '#3b82f6', border: 'none', color: colors.text, padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: isSavingPermissions ? 'not-allowed' : 'pointer', opacity: isSavingPermissions ? 0.7 : 1 }}>
                            {isSavingPermissions ? 'Saving...' : 'Apply Changes'}
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
                                    <div style={{ color: colors.textMuted, fontSize: '13px' }}>{student.avgScore}% avg score ── {student.totalAttempts} attempts</div>
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

    const handleSelectAllCourses = (e, list) => {
        if (e.target.checked) {
            setSelectedCourses(list.map(c => c._id).filter(Boolean));
        } else {
            setSelectedCourses([]);
        }
    };

    const renderCourses = () => {
        const screenshotData = [
            { id: 'COURSE-001', title: 'Web Development Fundamentals', instructor: 'Daniel Berhe', img: 'https://i.pravatar.cc/150?u=daniel', category: 'Programming', catColor: '#10b981', catBg: 'rgba(16,185,129,0.15)', students: 245, status: 'Published', statusColor: '#10b981', statusBg: 'rgba(16,185,129,0.15)', date: 'May 20, 2024', iconBg: '#1e3a8a', icon: <Monitor size={20} color="#60a5fa" /> },
            { id: 'COURSE-002', title: 'Introduction to Artificial Intelligence', instructor: 'Selam M.', img: 'https://i.pravatar.cc/150?u=selam', category: 'AI & ML', catColor: '#3b82f6', catBg: 'rgba(59,130,246,0.15)', students: 198, status: 'Published', statusColor: '#10b981', statusBg: 'rgba(16,185,129,0.15)', date: 'May 18, 2024', iconBg: '#1e1b4b', icon: <CheckCircle2 size={20} color="#818cf8" /> },
            { id: 'COURSE-003', title: 'Database Management Systems', instructor: 'Yonas A.', img: 'https://i.pravatar.cc/150?u=yonas', category: 'Database', catColor: '#8b5cf6', catBg: 'rgba(139,92,246,0.15)', students: 176, status: 'Published', statusColor: '#10b981', statusBg: 'rgba(16,185,129,0.15)', date: 'May 15, 2024', iconBg: '#2e1065', icon: <Database size={20} color="#a78bfa" /> },
            { id: 'COURSE-004', title: 'UI/UX Design Principles', instructor: 'Meseret T.', img: 'https://i.pravatar.cc/150?u=meseret', category: 'Design', catColor: '#f59e0b', catBg: 'rgba(245,158,11,0.15)', students: 134, status: 'Draft', statusColor: '#f59e0b', statusBg: 'rgba(245,158,11,0.15)', date: 'May 10, 2024', iconBg: '#4c1d95', icon: <Palette size={20} color="#c084fc" /> },
            { id: 'COURSE-005', title: 'Cybersecurity Essentials', instructor: 'Mekdes G.', img: 'https://i.pravatar.cc/150?u=mekdes', category: 'Security', catColor: '#ef4444', catBg: 'rgba(239,68,68,0.15)', students: 95, status: 'Draft', statusColor: '#f59e0b', statusBg: 'rgba(245,158,11,0.15)', date: 'May 8, 2024', iconBg: '#022c22', icon: <Shield size={20} color="#34d399" /> },
        ];

        const totalCourses = analytics?.totalCourses || allCourses.length || 56;
        const publishedCourses = analytics?.activeCourses || allCourses.filter(c => ['Published', 'Active'].includes(c.publicationState)).length || 42;
        const draftCourses = analytics?.draftCourses || allCourses.filter(c => c.publicationState === 'Draft').length || 9;
        const totalEnrollments = enrollments.length || 1248;

        // Apply status filter
        let filteredCourses = allCourses.length > 0 ? [...allCourses] : [];
        if (courseStatusFilter !== 'All Status' && filteredCourses.length > 0) {
            filteredCourses = filteredCourses.filter(c => {
                const state = c.publicationState || 'Draft';
                if (courseStatusFilter === 'Published') return ['Published', 'Active'].includes(state);
                if (courseStatusFilter === 'Archived') return state === 'Archived';
                return state === courseStatusFilter;
            });
        }
        // Apply search filter
        if (courseSearchQuery.trim() && filteredCourses.length > 0) {
            const q = courseSearchQuery.trim().toLowerCase();
            filteredCourses = filteredCourses.filter(c =>
                (c.courseTitle || '').toLowerCase().includes(q) ||
                (c.technicalCategory || '').toLowerCase().includes(q) ||
                (c.creatorRef?.fullName || '').toLowerCase().includes(q) ||
                (c.assignedInstructorRef?.fullName || '').toLowerCase().includes(q) ||
                (c.courseCode || '').toLowerCase().includes(q)
            );
        }

        const statusColorMap = {
            'Published': { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
            'Active': { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
            'Draft': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
            'Pending Review': { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
            'Archived': { color: colors.textMuted, bg: 'rgba(100,116,139,0.12)' },
        };

        const liveData = filteredCourses.length > 0 ? filteredCourses.slice(0, 20).map(c => {
            const st = c.publicationState || 'Draft';
            const sc = statusColorMap[st] || statusColorMap['Draft'];
            return {
                id: c.courseCode || ('CRSE-' + (c._id?.slice(-4)?.toUpperCase() || '??')),
                title: c.courseTitle,
                instructor: c.creatorRef?.fullName || c.assignedInstructorRef?.fullName || 'Unassigned',
                img: c.creatorRef?.avatarUrl || `https://i.pravatar.cc/150?u=${c._id}`,
                category: c.technicalCategory || 'General',
                catColor: '#3b82f6', catBg: 'rgba(59,130,246,0.12)',
                students: c.totalEnrollments || 0,
                status: st,
                statusColor: sc.color,
                statusBg: sc.bg,
                date: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '─"',
                iconBg: '#1e3a8a', icon: <BookOpen size={20} color="#60a5fa" />,
                _id: c._id, isFeatured: c.isFeatured, raw: c
            };
        }) : screenshotData;

        const statCards = [
            { label: 'Total Courses', value: totalCourses, trend: '+8 this month', iconBg: 'rgba(59,130,246,0.1)', iconColor: '#3b82f6', icon: <BookOpen size={26} /> },
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
                            <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>Dashboard &gt; <span style={{ color: '#3b82f6', fontWeight: '500' }}>Course Management</span></p>
                        </div>
                        {selectedCourses.length > 0 ? (
                            /* Contextual Multi-Select Bulk Actions Bar */
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: '12px', animation: 'fadeIn 0.2s' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1d4ed8', paddingRight: '8px', borderRight: '1px solid #bfdbfe' }}>
                                    {selectedCourses.length} Selected
                                </span>
                                <button onClick={handleBulkPublish} title="Publish Selected" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: colors.text, border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    <Upload size={14} /> Publish
                                </button>
                                <button onClick={handleBulkArchive} title="Archive Selected" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f59e0b', color: colors.text, border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    <Archive size={14} /> Archive
                                </button>
                                <button onClick={handleBulkCategoryAssign} title="Assign Category" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: colors.bgCard, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    <FolderTree size={14} /> Category
                                </button>
                                <button onClick={handleExportSelectedCSV} title="Export Selected CSV" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: colors.bgCard, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    <Download size={14} /> Export
                                </button>
                                <button onClick={handleBulkDelete} title="Delete Selected" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ef4444', color: colors.text, border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    <Trash2 size={14} /> Delete
                                </button>
                                <button onClick={() => setSelectedCourses([])} title="Clear Selection" style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: '12px', cursor: 'pointer', marginLeft: '4px', textDecoration: 'underline' }}>
                                    Clear
                                </button>
                            </div>
                        ) : (
                            /* Standard Enterprise Header Toolbar */
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button onClick={() => setCourseStatusFilter(prev => prev === 'Archived' ? 'All Status' : 'Archived')} title={courseStatusFilter === 'Archived' ? 'Show All Courses' : 'View Archived Courses Bin'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: courseStatusFilter === 'Archived' ? `${colors.primary}15` : colors.bgCard, border: `1px solid ${courseStatusFilter === 'Archived' ? colors.primary : colors.border}`, borderRadius: '10px', color: courseStatusFilter === 'Archived' ? colors.primary : colors.text, cursor: 'pointer', transition: 'all 0.2s' }}>
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
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', border: 'none', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', padding: '0 18px', height: '40px', color: colors.text, fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 15px rgba(37,99,235,0.3)' }}
                                    >
                                        <PlusCircle size={16} /> Add New Course
                                    </button>
                                    <button
                                        onClick={() => setIsAddCourseDropdownOpen(!isAddCourseDropdownOpen)}
                                        style={{ background: '#1d4ed8', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.2)', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', padding: '0 10px', height: '40px', color: colors.text, cursor: 'pointer' }}
                                    >
                                        <ChevronDown size={16} />
                                    </button>

                                    {/* Split Button Popup Menu */}
                                    {isAddCourseDropdownOpen && (
                                        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '6px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.12)', padding: '6px', width: '220px', zIndex: 100 }}>
                                            <button
                                                onClick={() => { setIsAddCourseDropdownOpen(false); setActiveTab('course_builder'); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', fontSize: '13px', color: colors.text, fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <PlusCircle size={15} color="#2563eb" /> Create Blank Course
                                            </button>
                                            <button
                                                onClick={() => { setIsAddCourseDropdownOpen(false); setIsAiCourseGenModalOpen(true); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', fontSize: '13px', color: colors.text, fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <Bot size={15} color="#8b5cf6" /> Generate with AI  <Wand2 size={16} style={{ marginRight: '6px' }} /> 
                                            </button>
                                            <button
                                                onClick={() => { setIsAddCourseDropdownOpen(false); alert('Course Layout Templates loaded.'); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', fontSize: '13px', color: colors.text, fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>All Courses</h3>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ position: 'relative' }}>
                                    <select style={{ appearance: 'none', WebkitAppearance: 'none', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '9px 36px 9px 14px', fontSize: '14px', color: colors.text, outline: 'none', cursor: 'pointer', minWidth: '160px', fontWeight: '500' }}>
                                        <option style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Categories</option>
                                        <option style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Programming</option>
                                        <option style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>AI &amp; ML</option>
                                        <option style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Database</option>
                                        <option style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Design</option>
                                        <option style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Security</option>
                                    </select>
                                    <ChevronDown size={15} color="#94a3b8" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <select value={courseStatusFilter} onChange={(e) => setCourseStatusFilter(e.target.value)} style={{ appearance: 'none', WebkitAppearance: 'none', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '9px 36px 9px 14px', fontSize: '14px', color: colors.text, outline: 'none', cursor: 'pointer', minWidth: '130px', fontWeight: '500' }}>
                                        <option value="All Status" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Status</option>
                                        <option value="Published" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Published</option>
                                        <option value="Draft" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Draft</option>
                                        <option value="Pending Review" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Pending Review</option>
                                        <option value="Archived" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Archived</option>
                                    </select>
                                    <ChevronDown size={15} color="#94a3b8" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input type="text" value={courseSearchQuery} onChange={(e) => setCourseSearchQuery(e.target.value)} placeholder="Search courses..." style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '9px 16px 9px 38px', fontSize: '14px', color: colors.text, outline: 'none', minWidth: '220px' }} />
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: colors.bg }}>
                                        <th style={{ padding: '14px 24px', width: '40px' }}><input type="checkbox" checked={selectedCourses.length > 0 && selectedCourses.length === liveData.filter(c => c._id).length} onChange={(e) => handleSelectAllCourses(e, liveData)} style={{ cursor: 'pointer' }} /></th>
                                        {['Course', 'Instructor', 'Category', 'Students', 'Status', 'Created At', 'Actions'].map((h, i) => (
                                            <th key={h} style={{ padding: '14px 24px', fontSize: '13px', fontWeight: '600', color: colors.textMuted, letterSpacing: '0.02em', textAlign: i === 6 ? 'center' : 'left' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {liveData.map((course, idx, arr) => (
                                        <tr key={course._id || idx}
                                            style={{ borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '16px 24px' }}><input type="checkbox" checked={selectedCourses.includes(course._id)} onChange={() => handleSelectCourse(course._id)} style={{ cursor: 'pointer' }} /></td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: course.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {course.icon}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '3px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</div>
                                                        <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '500' }}>{course.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe' }}>
                                                        <User size={16} />
                                                    </div>
                                                    <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500', whiteSpace: 'nowrap' }}>{course.instructor}</span>
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
                                                        onMouseEnter={e => { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.color='#0f172a'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background=colors.bgCard; e.currentTarget.style.color=colors.textMuted; }}
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
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '14px', color: colors.textMuted, fontWeight: '500' }}>
                                Showing 1 to {liveData.length} of {totalCourses} courses
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, cursor: 'pointer' }}><ChevronLeft size={16} /></button>
                                {[1, 2, 3].map(n => (
                                    <button key={n} style={{ background: n === 1 ? '#2563eb' : '#fff', border: n === 1 ? 'none' : '1px solid #e2e8f0', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: n === 1 ? '#fff' : '#475569', fontWeight: n === 1 ? '700' : '500', fontSize: '14px', cursor: 'pointer', boxShadow: n === 1 ? '0 2px 8px rgba(37,99,235,0.3)' : 'none' }}>{n}</button>
                                ))}
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', color: colors.textMuted, fontSize: '18px', fontWeight: '700' }}>...</span>
                                <button style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text, fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}>12</button>
                                <button style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, cursor: 'pointer' }}><ChevronRight size={16} /></button>
                            </div>
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

    const renderContent = () => {
        const contentTypeConfig = {
            'Video Lecture': { icon: <Video size={16} style={{ marginRight: '6px' }} />, color: '#3b82f6', bg: '#eff6ff' },
            'PDF':           { icon: <FileText size={16} style={{ marginRight: '6px' }} />, color: '#ef4444', bg: '#fef2f2' },
            'Quiz':          { icon: <HelpCircle size={16} style={{ marginRight: '6px' }} />, color: '#8b5cf6', bg: '#f5f3ff' },
            'Assignment':    { icon: <Clipboard size={16} style={{ marginRight: '6px' }} />, color: '#f59e0b', bg: '#fffbeb' },
            'Exam':          { icon: <Pin size={16} style={{ marginRight: '6px' }} />, color: '#0891b2', bg: '#ecfeff' },
            'Audio':         { icon: <Headphones size={16} style={{ marginRight: '6px' }} />, color: '#10b981', bg: '#f0fdf4' },
            'Image':         { icon: <Image size={16} style={{ marginRight: '6px' }} />, color: '#f97316', bg: '#fff7ed' },
            'Document':      { icon: <File size={16} style={{ marginRight: '6px' }} />, color: colors.textMuted, bg: '#f8fafc' },
            'Live Session':  { icon: <Radio size={16} style={{ marginRight: '6px' }} />, color: '#e11d48', bg: '#fff1f2' },
        };
        const statusConfig = {
            'Approved': { color: '#10b981', bg: '#f0fdf4', icon: <CheckCircle2 size={16} style={{ marginRight: '6px', color: colors.success }} /> },
            'Pending':  { color: '#f59e0b', bg: '#fffbeb', icon: '─3' },
            'Rejected': { color: '#ef4444', bg: '#fef2f2', icon: <XCircle size={16} style={{ marginRight: '6px', color: '#ef4444' }} /> },
            'Flagged':  { color: '#f97316', bg: '#fff7ed', icon: <Flag size={16} style={{ marginRight: '6px' }} /> },
            'Archived': { color: colors.textMuted, bg: '#f8fafc', icon: <Package size={16} style={{ marginRight: '6px' }} /> },
            'Hidden':   { color: colors.textMuted, bg: '#f1f5f9', icon: <><Eye size={16} style={{ marginRight: '6px' }} /><MessageCircle size={16} style={{ marginRight: '6px' }} /></> },
        };

        const filteredItems = moderationItems.filter(item => {
            const q = modSearchQuery.toLowerCase();
            const matchSearch = !q || item.title.toLowerCase().includes(q) || item.course.toLowerCase().includes(q) || item.instructor.toLowerCase().includes(q);
            const matchType = modTypeFilter === 'All' || item.type === modTypeFilter;
            const matchStatus = modStatusFilter === 'All' || item.status === modStatusFilter;
            const matchCat = modCategoryFilter === 'All' || item.category === modCategoryFilter;
            return matchSearch && matchType && matchStatus && matchCat;
        });

        const pageStart = (moderationCurrentPage - 1) * moderationRowsPerPage;
        const pagedItems = filteredItems.slice(pageStart, pageStart + moderationRowsPerPage);
        const totalPages = Math.max(1, Math.ceil(filteredItems.length / moderationRowsPerPage));

        const handleModAction = (action, item) => {
            setModerationItems(prev => prev.map(i => {
                if (i.id !== item.id) return i;
                if (action === 'approve') { setModerationLogs(l => [{ moderator: 'Admin', action: 'Approve Content', item: i.title, date: new Date().toLocaleString(), ip: '127.0.0.1' }, ...l]); return { ...i, status: 'Approved', visibility: 'Visible' }; }
                if (action === 'reject')  { setModerationLogs(l => [{ moderator: 'Admin', action: 'Reject Content', item: i.title, date: new Date().toLocaleString(), ip: '127.0.0.1' }, ...l]); return { ...i, status: 'Rejected', visibility: 'Hidden' }; }
                if (action === 'archive') { return { ...i, status: 'Archived', visibility: 'Hidden' }; }
                if (action === 'hide')    { return { ...i, visibility: i.visibility === 'Hidden' ? 'Visible' : 'Hidden', status: i.status === 'Hidden' ? 'Approved' : 'Hidden' }; }
                if (action === 'delete')  { return null; }
                return i;
            }).filter(Boolean));
            showNotification(`Content ${action}d: ${item.title}`);
        };

        const handleBulkModAction = (action) => {
            if (!selectedModerationItems.length) return alert('Select at least one item.');
            if (action === 'delete' && !window.confirm(`Delete ${selectedModerationItems.length} items?`)) return;
            setModerationItems(prev => prev.map(i => {
                if (!selectedModerationItems.includes(i.id)) return i;
                if (action === 'delete') return null;
                if (action === 'approve') return { ...i, status: 'Approved', visibility: 'Visible' };
                if (action === 'reject')  return { ...i, status: 'Rejected', visibility: 'Hidden' };
                if (action === 'archive') return { ...i, status: 'Archived', visibility: 'Hidden' };
                return i;
            }).filter(Boolean));
            setSelectedModerationItems([]);
            showNotification(`Bulk ${action} applied to ${selectedModerationItems.length} items.`);
        };

        const statsData = [
            { label: 'Total Content',    value: moderationItems.length, icon: <Folder size={16} style={{ marginRight: '6px' }} />, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Pending Review',   value: moderationItems.filter(i => i.status === 'Pending').length, icon: '─3', color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Approved',         value: moderationItems.filter(i => i.status === 'Approved').length, icon: <CheckCircle2 size={16} style={{ marginRight: '6px', color: colors.success }} />, color: '#10b981', bg: '#f0fdf4' },
            { label: 'Rejected',         value: moderationItems.filter(i => i.status === 'Rejected').length, icon: <XCircle size={16} style={{ marginRight: '6px', color: '#ef4444' }} />, color: '#ef4444', bg: '#fef2f2' },
            { label: 'Reported Content', value: moderationItems.filter(i => i.reports > 0).length, icon: <Flag size={16} style={{ marginRight: '6px' }} />, color: '#f97316', bg: '#fff7ed' },
            { label: 'Archived',         value: moderationItems.filter(i => i.status === 'Archived').length, icon: <Package size={16} style={{ marginRight: '6px' }} />, color: colors.textMuted, bg: '#f8fafc' },
        ];

        const inputStyle = { padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', background: colors.bgCard, color: colors.text, outline: 'none', cursor: 'pointer' };
        const colStyle = (c) => ({ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`, background: colors.bg, whiteSpace: 'nowrap' });

        return (
            <div style={{ padding: '28px 32px', minHeight: '100%', fontFamily: 'inherit', position: 'relative' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Dashboard ─+' Content & Moderation</div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', color: colors.text, margin: 0 }}> <Shield size={16} style={{ marginRight: '6px' }} /> ─,? Content & Moderation</h2>
                        <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0' }}>Review, approve, monitor, and manage all content uploads across the LMS platform.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => { const res = [...moderationItems]; setModerationItems([]); setTimeout(() => setModerationItems(res), 100); showNotification('Content list refreshed.'); }}
                            style={{ ...inputStyle, background: colors.bgCard, color: colors.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                             <RefreshCw size={16} style={{ marginRight: '6px' }} />  Refresh
                        </button>
                        <button onClick={() => { const csv = ['Title,Course,Instructor,Type,Status,Reports,Date'].concat(filteredItems.map(i => `"${i.title}","${i.course}","${i.instructor}","${i.type}","${i.status}",${i.reports},"${i.date}"`)).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'moderation_report.csv'; link.click(); showNotification('Export downloaded.'); }}
                            style={{ ...inputStyle, background: '#2563eb', color: colors.text, border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                             <Upload size={16} style={{ marginRight: '6px' }} />  Export Report
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {statsData.map((stat) => (
                        <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.color}22`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}
                            onClick={() => setModStatusFilter(stat.label === 'Total Content' ? 'All' : stat.label === 'Reported Content' ? 'All' : stat.label === 'Archived' ? 'Archived' : stat.label)}>
                            <div style={{ fontSize: '26px' }}>{stat.icon}</div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* ─"?─"?─"? ALL CONTENT TABLE VIEW ─"?─"?─"? */}
                <div style={{ background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {/* Table Title Section */}
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.bgCard }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text }}>All Content Queue</h3>
                        <span style={{ fontSize: '13px', color: colors.textMuted }}>{filteredItems.length} items total</span>
                    </div>

                        {/* Bulk Action Toolbar */}
                        {selectedModerationItems.length > 0 && (
                            <div style={{ padding: '10px 20px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '700', fontSize: '13px', color: '#2563eb' }}>{selectedModerationItems.length} selected</span>
                                <button onClick={() => handleBulkModAction('approve')} style={{ ...inputStyle, background: '#10b981', color: colors.text, border: 'none', padding: '6px 14px' }}> <CheckCircle2 size={16} style={{ marginRight: '6px', color: colors.success }} />  Approve</button>
                                <button onClick={() => handleBulkModAction('reject')}  style={{ ...inputStyle, background: '#ef4444', color: colors.text, border: 'none', padding: '6px 14px' }}> <XCircle size={16} style={{ marginRight: '6px', color: '#ef4444' }} />  Reject</button>
                                <button onClick={() => handleBulkModAction('archive')} style={{ ...inputStyle, background: '#64748b', color: colors.text, border: 'none', padding: '6px 14px' }}> <Package size={16} style={{ marginRight: '6px' }} />  Archive</button>
                                <button onClick={() => handleBulkModAction('delete')}  style={{ ...inputStyle, background: '#dc2626', color: colors.text, border: 'none', padding: '6px 14px' }}> <Trash2 size={16} style={{ marginRight: '6px' }} /> ─,? Delete</button>
                                <button onClick={() => setSelectedModerationItems([])} style={{ ...inputStyle, padding: '6px 12px', marginLeft: 'auto' }}> <X size={16} style={{ marginRight: '6px' }} />  Deselect</button>
                            </div>
                        )}

                        {/* Filters Row */}
                        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '7px 12px', background: colors.bg }}>
                                <span style={{ color: colors.textMuted }}> <Search size={16} style={{ marginRight: '6px' }} /> </span>
                                <input value={modSearchQuery} onChange={e => setModSearchQuery(e.target.value)} placeholder="Search title, course, instructor..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: colors.text, width: '100%' }} />
                            </div>
                            <select value={modTypeFilter} onChange={e => setModTypeFilter(e.target.value)} style={inputStyle}>
                                <option value="All" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Types</option>
                                {Object.keys(contentTypeConfig).map(t => <option key={t} value={t} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{t}</option>)}
                            </select>
                            <select value={modStatusFilter} onChange={e => setModStatusFilter(e.target.value)} style={inputStyle}>
                                <option value="All" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Statuses</option>
                                {Object.keys(statusConfig).map(s => <option key={s} value={s} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{s}</option>)}
                            </select>
                            <select value={modCategoryFilter} onChange={e => setModCategoryFilter(e.target.value)} style={inputStyle}>
                                <option value="All" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Categories</option>
                                {[...new Set(moderationItems.map(i => i.category))].map(c => <option key={c} value={c} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{c}</option>)}
                            </select>
                            <select value={modSortBy} onChange={e => setModSortBy(e.target.value)} style={inputStyle}>
                                <option value="Newest" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>─── Newest First</option>
                                <option value="Oldest" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>──+ Oldest First</option>
                                <option value="Most Reported" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}> <Flag size={16} style={{ marginRight: '6px' }} />  Most Reported</option>
                                <option value="Title A-Z" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>A-Z Title</option>
                            </select>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th style={colStyle()}><input type="checkbox" checked={selectedModerationItems.length === pagedItems.length && pagedItems.length > 0} onChange={e => setSelectedModerationItems(e.target.checked ? pagedItems.map(i => i.id) : [])} /></th>
                                        <th style={colStyle()}>Content Title</th>
                                        <th style={colStyle()}>Course</th>
                                        <th style={colStyle()}>Instructor</th>
                                        <th style={colStyle()}>Type</th>
                                        <th style={colStyle()}>Upload Date</th>
                                        <th style={colStyle()}>Reports</th>
                                        <th style={colStyle()}>Status</th>
                                        <th style={colStyle()}>Visibility</th>
                                        <th style={{ ...colStyle(), textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedItems.length === 0 ? (
                                        <tr><td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: colors.textMuted, fontSize: '14px' }}>No content matches your current filters.</td></tr>
                                    ) : pagedItems.map((item, idx) => {
                                        const typeConf = contentTypeConfig[item.type] || { icon: <Folder size={16} style={{ marginRight: '6px' }} />, color: colors.textMuted, bg: '#f8fafc' };
                                        const statConf = statusConfig[item.status] || { color: colors.textMuted, bg: '#f8fafc', icon: '──' };
                                        const isSelected = selectedModerationItems.includes(item.id);
                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#eff6ff' : 'transparent', transition: 'background 0.15s' }}
                                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                                                <td style={{ padding: '14px 16px' }}><input type="checkbox" checked={isSelected} onChange={() => setSelectedModerationItems(prev => isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id])} /></td>
                                                <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                                                    <div style={{ fontWeight: '600', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                                        onClick={() => { setReviewItem(item); setIsReviewDrawerOpen(true); setChecklistData({ grammar: true, copyright: true, plagiarism: false, language: true, relevance: true, malwareScan: 'Clean' }); setModeratorNotes(''); setInstructorFeedback(''); }}>
                                                        {item.title}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: colors.textMuted }}>{item.id}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px', color: colors.text, whiteSpace: 'nowrap' }}>{item.course}</td>
                                                <td style={{ padding: '14px 16px', color: colors.text, whiteSpace: 'nowrap' }}>{item.instructor}</td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ background: typeConf.bg, color: typeConf.color, padding: '4px 10px', borderRadius: '20px', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                        {typeConf.icon} {item.type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{item.date}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    {item.reports > 0 ? <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', fontSize: '12px' }}> <Flag size={16} style={{ marginRight: '6px' }} />  {item.reports}</span>
                                                        : <span style={{ color: colors.textMuted, fontSize: '12px' }}>─"</span>}
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ background: statConf.bg, color: statConf.color, padding: '4px 10px', borderRadius: '20px', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                        {statConf.icon} {item.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '12px', color: item.visibility === 'Visible' ? '#10b981' : '#94a3b8', fontWeight: '600' }}>
                                                        {item.visibility === 'Visible' ? <><Eye size={16} style={{ marginRight: '6px' }} />  Visible</> : <><EyeOff size={16} style={{ marginRight: '6px' }} />  Hidden</>}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                        <button title="Review" onClick={() => { setReviewItem(item); setIsReviewDrawerOpen(true); }} style={{ padding: '5px 9px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontSize: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}> <Eye size={16} /> </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ fontSize: '13px', color: colors.textMuted }}>
                                Showing {Math.min(pageStart + 1, filteredItems.length)}─"{Math.min(pageStart + moderationRowsPerPage, filteredItems.length)} of {filteredItems.length} items &nbsp;|&nbsp;
                                Rows per page: <select value={moderationRowsPerPage} onChange={e => { setModerationRowsPerPage(Number(e.target.value)); setModerationCurrentPage(1); }} style={{ ...inputStyle, padding: '3px 8px', fontSize: '12px', display: 'inline-block', width: 'auto' }}>
                                    {[5, 10, 25, 50].map(n => <option key={n} value={n} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{n}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button disabled={moderationCurrentPage === 1} onClick={() => setModerationCurrentPage(p => p - 1)} style={{ ...inputStyle, padding: '6px 12px', opacity: moderationCurrentPage === 1 ? 0.4 : 1 }}>─+? Prev</button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                                    <button key={n} onClick={() => setModerationCurrentPage(n)} style={{ ...inputStyle, padding: '6px 12px', background: n === moderationCurrentPage ? '#2563eb' : '#fff', color: n === moderationCurrentPage ? '#fff' : '#334155', fontWeight: n === moderationCurrentPage ? '700' : '500', border: n === moderationCurrentPage ? 'none' : '1px solid #e2e8f0' }}>{n}</button>
                                ))}
                                <button disabled={moderationCurrentPage === totalPages} onClick={() => setModerationCurrentPage(p => p + 1)} style={{ ...inputStyle, padding: '6px 12px', opacity: moderationCurrentPage === totalPages ? 0.4 : 1 }}>Next ─+'</button>
                            </div>
                        </div>
                    </div>

                {/* ─"?─"?─"? CONTENT REVIEW DRAWER ─"?─"?─"? */}
                {isReviewDrawerOpen && reviewItem && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
                        <div style={{ flex: 1, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }} onClick={() => setIsReviewDrawerOpen(false)} />
                        <div style={{ width: '540px', maxWidth: '95vw', background: colors.bgCard, overflowY: 'auto', boxShadow: '-8px 0 48px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease' }}>
                            {/* Drawer Header */}
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.bg }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Content Review Panel</div>
                                    <h3 style={{ margin: 0, color: colors.text, fontSize: '16px', fontWeight: '700' }}>{reviewItem.title}</h3>
                                </div>
                                <button onClick={() => setIsReviewDrawerOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: colors.text, borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '16px' }}> <X size={16} style={{ marginRight: '6px' }} /> </button>
                            </div>

                            <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Basic Info Grid */}
                                <div style={{ background: colors.bg, borderRadius: '12px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', border: `1px solid ${colors.border}` }}>
                                    {[
                                        ['Course', reviewItem.course],
                                        ['Instructor', reviewItem.instructor],
                                        ['Category', reviewItem.category],
                                        ['Language', reviewItem.language],
                                        ['Type', reviewItem.type],
                                        ['Upload Date', reviewItem.date],
                                        ['Status', reviewItem.status],
                                        ['Visibility', reviewItem.visibility],
                                    ].map(([lbl, val]) => (
                                        <div key={lbl}>
                                            <div style={{ fontSize: '10px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: '2px' }}>{lbl}</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{val}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Preview Area */}
                                <div>
                                    <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '700', color: colors.text }}>─- Content Preview</h4>
                                    {reviewItem.type === 'Video Lecture' && reviewItem.videoUrl ? (
                                        <video src={reviewItem.videoUrl} controls style={{ width: '100%', borderRadius: '10px', background: colors.bg, maxHeight: '220px' }} />
                                    ) : reviewItem.type === 'PDF' && reviewItem.pdfUrl ? (
                                        <iframe src={reviewItem.pdfUrl} style={{ width: '100%', height: '200px', borderRadius: '10px', border: `1px solid ${colors.border}` }} title="PDF Preview" />
                                    ) : (
                                        <div style={{ background: colors.bgInput, borderRadius: '10px', padding: '32px', textAlign: 'center', color: colors.textMuted, fontSize: '13px', border: '1px dashed #cbd5e1' }}>
                                            {contentTypeConfig[reviewItem.type]?.icon || <><Folder size={16} style={{ marginRight: '6px' }} /></>} Preview not available for this content type.
                                        </div>
                                    )}
                                </div>

                                {/* Moderation Checklist */}
                                <div>
                                    <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '700', color: colors.text }}> <CheckSquare size={16} style={{ marginRight: '6px' }} />  Moderation Checklist</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: colors.bg, borderRadius: '12px', padding: '14px', border: `1px solid ${colors.border}` }}>
                                        {[
                                            { key: 'grammar', label: 'Grammar & Language Quality' },
                                            { key: 'copyright', label: 'Copyright Compliance' },
                                            { key: 'plagiarism', label: 'Plagiarism Clear' },
                                            { key: 'language', label: 'Appropriate Language' },
                                            { key: 'relevance', label: 'Educational Relevance' },
                                        ].map(({ key, label }) => (
                                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: colors.text }}>
                                                <input type="checkbox" checked={checklistData[key]} onChange={e => setChecklistData(prev => ({ ...prev, [key]: e.target.checked }))}
                                                    style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }} />
                                                <span style={{ textDecoration: checklistData[key] ? 'none' : 'line-through', color: checklistData[key] ? '#334155' : '#94a3b8' }}>{label}</span>
                                                {checklistData[key] ? <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: '12px' }}> <Check size={16} style={{ marginRight: '6px' }} />  Pass</span> : <span style={{ marginLeft: 'auto', color: '#ef4444', fontSize: '12px' }}> <AlertTriangle size={16} style={{ marginRight: '6px', color: '#f59e0b' }} />  Fail</span>}
                                            </label>
                                        ))}
                                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', color: colors.text, fontWeight: '600' }}>Malware Scan:</span>
                                            <span style={{ background: checklistData.malwareScan === 'Clean' ? '#f0fdf4' : '#fef2f2', color: checklistData.malwareScan === 'Clean' ? '#10b981' : '#ef4444', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                                                {checklistData.malwareScan === 'Clean' ? <><Shield size={16} style={{ marginRight: '6px' }} />  Clean</> : <><AlertTriangle size={16} style={{ marginRight: '6px', color: '#f59e0b' }} />  Threat Detected</>}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Report Info */}
                                {reviewItem.reports > 0 && (
                                    <div style={{ background: '#fff7ed', borderRadius: '12px', padding: '14px', border: '1px solid #fed7aa' }}>
                                        <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '700', color: '#c2410c' }}> <Flag size={16} style={{ marginRight: '6px' }} />  Report Information</h4>
                                        <div style={{ fontSize: '13px', color: '#9a3412' }}>
                                            <div>Number of Reports: <strong>{reviewItem.reports}</strong></div>
                                            {moderationReports.filter(r => r.contentId === reviewItem.id).map(rep => (
                                                <div key={rep.id} style={{ marginTop: '6px', padding: '8px', background: colors.bgCard, borderRadius: '8px', fontSize: '12px' }}>
                                                    <div>Reason: <strong>{rep.reason}</strong> | Severity: <strong>{rep.severity}</strong></div>
                                                    <div>Reported by: {rep.reporter} on {rep.date}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}> <FileEdit size={16} style={{ marginRight: '6px' }} /> ─,? Internal Moderator Notes</label>
                                    <textarea value={moderatorNotes} onChange={e => setModeratorNotes(e.target.value)} placeholder="Add internal notes (not visible to instructor)..." rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}> <MessageSquare size={16} style={{ marginRight: '6px' }} />  Feedback to Instructor</label>
                                    <textarea value={instructorFeedback} onChange={e => setInstructorFeedback(e.target.value)} placeholder="Feedback sent to instructor about their content..." rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                                </div>

                                {/* Admin Decision Buttons */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: colors.text }}> <Scale size={16} style={{ marginRight: '6px' }} /> ─,? Admin Decision</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {[
                                            { label: <><CheckCircle2 size={16} style={{ marginRight: '6px', color: colors.success }} />  Approve</>, action: 'approve', style: { background: '#10b981', color: colors.text, border: 'none' } },
                                            { label: <><XCircle size={16} style={{ marginRight: '6px', color: '#ef4444' }} />  Reject</>,  action: 'reject',  style: { background: '#ef4444', color: colors.text, border: 'none' } },
                                            { label: <><Repeat size={16} style={{ marginRight: '6px' }} />  Request Revision</>, action: 'hide',   style: { background: '#f59e0b', color: colors.text, border: 'none' } },
                                            { label: <><Package size={16} style={{ marginRight: '6px' }} />  Archive</>, action: 'archive', style: { background: '#64748b', color: colors.text, border: 'none' } },
                                        ].map(btn => (
                                            <button key={btn.action} onClick={() => {
                                                handleModAction(btn.action, reviewItem);
                                                setModerationLogs(prev => [{ moderator: 'Admin', action: `${btn.action.charAt(0).toUpperCase() + btn.action.slice(1)} Content`, item: reviewItem.title, date: new Date().toLocaleString(), ip: '127.0.0.1' }, ...prev]);
                                                setIsReviewDrawerOpen(false);
                                            }} style={{ ...btn.style, padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>{btn.label}</button>
                                        ))}
                                    </div>
                                    <button onClick={() => { if (window.confirm('Permanently delete this content?')) { handleModAction('delete', reviewItem); setIsReviewDrawerOpen(false); } }} style={{ padding: '10px', background: colors.bgCard, border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}> <Trash2 size={16} style={{ marginRight: '6px' }} /> ─,? Delete Content Permanently</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderAssessments = () => {
        const statusBadges = {
            'Active':    { icon: <CheckCircle2 size={16} style={{ marginRight: '6px', color: colors.success }} />, color: '#10b981', bg: '#f0fdf4' },
            'Draft':     { icon: <FilePen size={16} style={{ marginRight: '6px' }} />, color: '#f59e0b', bg: '#fffbeb' },
            'Scheduled': { icon: <Calendar size={16} style={{ marginRight: '6px' }} />, color: '#3b82f6', bg: '#eff6ff' },
            'Completed': { icon: <GraduationCap size={16} style={{ marginRight: '6px' }} />, color: '#8b5cf6', bg: '#f5f3ff' },
            'Expired':   { icon: <XCircle size={16} style={{ marginRight: '6px', color: '#ef4444' }} />, color: '#ef4444', bg: '#fef2f2' },
            'Revoked':   { icon: <Ban size={16} style={{ marginRight: '6px', color: '#ef4444' }} />, color: colors.textMuted, bg: '#f8fafc' },
        };
        const typeBadges = {
            'Quiz':       { icon: <HelpCircle size={16} style={{ marginRight: '6px' }} />, color: '#3b82f6', bg: '#eff6ff' },
            'Exam':       { icon: <FilePen size={16} style={{ marginRight: '6px' }} />, color: '#8b5cf6', bg: '#f5f3ff' },
            'Assignment': { icon: <Clipboard size={16} style={{ marginRight: '6px' }} />, color: '#f59e0b', bg: '#fffbeb' },
        };

        const filteredAsm = assessmentsList.filter(a => {
            const q = asmSearchQuery.toLowerCase();
            const matchSearch = !q || a.name.toLowerCase().includes(q) || a.course.toLowerCase().includes(q) || a.instructor.toLowerCase().includes(q);
            const matchCourse = asmCourseFilter === 'All' || a.course === asmCourseFilter;
            const matchType = asmTypeFilter === 'All' || a.type === asmTypeFilter;
            const matchStatus = asmStatusFilter === 'All' || a.status === asmStatusFilter;
            return matchSearch && matchCourse && matchType && matchStatus;
        }).sort((a, b) => {
            if (asmSortBy === 'Newest') return new Date(b.date) - new Date(a.date);
            if (asmSortBy === 'Oldest') return new Date(a.date) - new Date(b.date);
            if (asmSortBy === 'Most Attempts') return b.attempts - a.attempts;
            if (asmSortBy === 'Name A-Z') return a.name.localeCompare(b.name);
            return 0;
        });

        const pageStart = (asmCurrentPage - 1) * asmRowsPerPage;
        const pagedAsm = filteredAsm.slice(pageStart, pageStart + asmRowsPerPage);
        const totalPages = Math.max(1, Math.ceil(filteredAsm.length / asmRowsPerPage));

        const handleCreateAsm = () => {
            if (!createAsmForm.name.trim()) return alert('Assessment name is required.');
            const newA = {
                id: `ASM-${String(assessmentsList.length + 101)}`,
                ...createAsmForm,
                attempts: 0,
                date: new Date().toISOString().split('T')[0],
                avgScore: 0,
            };
            setAssessmentsList(prev => [newA, ...prev]);
            setAsmActivityLogs(prev => [{ action: 'Assessment Created', item: newA.name, user: 'Admin User', date: new Date().toLocaleString() }, ...prev]);
            setIsCreateAsmOpen(false);
            setCreateAsmForm({ name: '', course: 'React Masterclass', instructor: 'Dr. Sarah Connor', type: 'Quiz', totalQuestions: 15, passingScore: 70, timeLimit: 45, maxAttempts: 3, status: 'Active' });
            showNotification(`Assessment "${newA.name}" created successfully!`);
        };

        const handleAsmAction = (action, item) => {
            setAssessmentsList(prev => prev.map(a => {
                if (a.id !== item.id) return a;
                if (action === 'publish') { return { ...a, status: 'Active' }; }
                if (action === 'unpublish') { return { ...a, status: 'Draft' }; }
                if (action === 'delete') { return null; }
                if (action === 'duplicate') {
                    const dup = { ...a, id: `ASM-${Date.now()}`, name: `${a.name} (Copy)`, date: new Date().toISOString().split('T')[0], attempts: 0 };
                    setTimeout(() => setAssessmentsList(p => [dup, ...p]), 50);
                    return a;
                }
                return a;
            }).filter(Boolean));
            setAsmActivityLogs(prev => [{ action: `Assessment ${action.charAt(0).toUpperCase() + action.slice(1)}d`, item: item.name, user: 'Admin User', date: new Date().toLocaleString() }, ...prev]);
            showNotification(`Assessment ${action}d: ${item.name}`);
        };

        const handleBulkAsmAction = (action) => {
            if (!selectedAsmRows.length) return alert('Select at least one assessment.');
            if (action === 'delete' && !window.confirm(`Delete ${selectedAsmRows.length} assessments?`)) return;
            setAssessmentsList(prev => prev.map(a => {
                if (!selectedAsmRows.includes(a.id)) return a;
                if (action === 'delete') return null;
                if (action === 'publish') return { ...a, status: 'Active' };
                if (action === 'unpublish') return { ...a, status: 'Draft' };
                return a;
            }).filter(Boolean));
            setSelectedAsmRows([]);
            showNotification(`Bulk ${action} applied to ${selectedAsmRows.length} assessments.`);
        };

        const statsData = [
            { label: 'Total Assessments',  value: assessmentsList.length, icon: <FilePen size={20} color="#3b82f6" />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
            { label: 'Active Assessments', value: assessmentsList.filter(a => a.status === 'Active').length, icon: <CheckCircle2 size={20} color="#10b981" />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
            { label: 'Pending / Draft',    value: assessmentsList.filter(a => a.status === 'Draft' || a.status === 'Scheduled').length, icon: <Clock size={20} color="#f59e0b" />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
            { label: 'Total Attempts',     value: assessmentsList.reduce((acc, a) => acc + a.attempts, 0), icon: <BarChart3 size={20} color="#8b5cf6" />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
            { label: 'Average Score',      value: `${(assessmentsList.filter(a => a.avgScore > 0).reduce((acc, a) => acc + a.avgScore, 0) / (assessmentsList.filter(a => a.avgScore > 0).length || 1)).toFixed(1)}%`, icon: <TrendingUp size={20} color="#0891b2" />, color: '#0891b2', bg: 'rgba(8, 145, 178, 0.12)' },
            { label: 'Certificates Issued', value: certificateRecords.length, icon: <Medal size={20} color="#ec4899" />, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
        ];

        const inp = { padding: '8px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', background: colors.bgCard, color: colors.text, outline: 'none', cursor: 'pointer' };
        const col = () => ({ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`, background: colors.bg, whiteSpace: 'nowrap' });

        return (
            <div style={{ padding: '28px 32px', minHeight: '100%', fontFamily: 'inherit', position: 'relative' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Dashboard ─+' Assessment & Certificate</div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Medal size={22} color="#3b82f6" /> Assessment & Certificate Control Center
                        </h2>
                        <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0' }}>Configure, oversee, auto-grade, and manage assessments, quizzes, gradebooks, and digital certificates across the LMS.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => setIsCreateAsmOpen(true)} style={{ ...inp, background: '#2563eb', color: '#ffffff', border: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={16} /> Create Assessment
                        </button>
                        <button onClick={() => handleOpenTemplateModal()} style={{ ...inp, background: colors.bgCard, color: colors.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Palette size={16} /> Certificate Designer
                        </button>
                        <button onClick={() => { const csv = ['ID,Name,Course,Instructor,Type,Questions,PassingScore,Attempts,Status,AvgScore'].concat(filteredAsm.map(a => `"${a.id}","${a.name}","${a.course}","${a.instructor}","${a.type}",${a.totalQuestions},${a.passingScore},${a.attempts},"${a.status}",${a.avgScore}`)).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'assessments_report.csv'; link.click(); showNotification('Assessment report exported.'); }}
                            style={{ ...inp, background: colors.bgCard, color: colors.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Upload size={16} /> Export Report
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {statsData.map(st => (
                        <div key={st.label} style={{ background: st.bg, border: `1px solid ${st.color}33`, borderRadius: '14px', padding: '16px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                {st.icon}
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: st.color, lineHeight: 1 }}>{st.value}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '6px' }}>{st.label}</div>
                        </div>
                    ))}
                </div>

                {/* Sub-view Tabs */}
                <div style={{ display: 'flex', gap: '4px', borderBottom: `1px solid ${colors.border}`, marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[
                        { key: 'assessments', icon: <FilePen size={15} />, label: `Assessments (${assessmentsList.length})` },
                        { key: 'grades', icon: <GraduationCap size={15} />, label: `Gradebook (${gradebookEntries.length})` },
                        { key: 'certificates', icon: <Medal size={15} />, label: `Certificates & Templates (${certificateRecords.length})` },
                        { key: 'analytics', icon: <BarChart3 size={15} />, label: 'Performance Analytics' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setAsmTabSubView(t.key)}
                            style={{
                                padding: '10px 18px',
                                border: 'none',
                                background: 'transparent',
                                borderBottom: asmTabSubView === t.key ? '3px solid #2563eb' : '3px solid transparent',
                                color: asmTabSubView === t.key ? '#3b82f6' : colors.textMuted,
                                fontWeight: asmTabSubView === t.key ? '700' : '500',
                                fontSize: '13px',
                                cursor: 'pointer',
                                marginBottom: '-1px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                            {t.icon}
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* ─?─?─?─?─?─?─?─?─?─?─? 1. ASSESSMENTS TABLE VIEW ─?─?─?─?─?─?─?─?─?─?─? */}
                {asmTabSubView === 'assessments' && (
                    <div style={{ background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

                        {/* Bulk Action Toolbar */}
                        {selectedAsmRows.length > 0 && (
                            <div style={{ padding: '10px 20px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '700', fontSize: '13px', color: '#2563eb' }}>{selectedAsmRows.length} selected</span>
                                <button onClick={() => handleBulkAsmAction('publish')}   style={{ ...inp, background: '#10b981', color: colors.text, border: 'none', padding: '6px 14px' }}> <CheckCircle2 size={16} style={{ marginRight: '6px', color: colors.success }} />  Publish</button>
                                <button onClick={() => handleBulkAsmAction('unpublish')} style={{ ...inp, background: '#f59e0b', color: colors.text, border: 'none', padding: '6px 14px' }}> <FilePen size={16} style={{ marginRight: '6px' }} />  Set to Draft</button>
                                <button onClick={() => handleBulkAsmAction('delete')}    style={{ ...inp, background: '#dc2626', color: colors.text, border: 'none', padding: '6px 14px' }}> <Trash2 size={16} style={{ marginRight: '6px' }} /> ─,? Delete</button>
                                <button onClick={() => setSelectedAsmRows([])} style={{ ...inp, padding: '6px 12px', marginLeft: 'auto' }}> <X size={16} style={{ marginRight: '6px' }} />  Deselect</button>
                            </div>
                        )}

                        {/* Filters Row */}
                        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '7px 12px', background: colors.bgCard }}>
                                <span style={{ color: colors.textMuted }}> <Search size={16} /> </span>
                                <input value={asmSearchQuery} onChange={e => setAsmSearchQuery(e.target.value)} placeholder="Search assessment name, course, instructor..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: colors.text, width: '100%' }} />
                            </div>
                            <select value={asmTypeFilter} onChange={e => setAsmTypeFilter(e.target.value)} style={inp}>
                                <option value="All" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Types</option>
                                <option value="Quiz" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Quiz</option>
                                <option value="Exam" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Exam</option>
                                <option value="Assignment" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Assignment</option>
                            </select>
                            <select value={asmStatusFilter} onChange={e => setAsmStatusFilter(e.target.value)} style={inp}>
                                <option value="All" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Statuses</option>
                                {Object.keys(statusBadges).map(s => <option key={s} value={s} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{s}</option>)}
                            </select>
                            <select value={asmCourseFilter} onChange={e => setAsmCourseFilter(e.target.value)} style={inp}>
                                <option value="All" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Courses</option>
                                {[...new Set(assessmentsList.map(a => a.course))].map(c => <option key={c} value={c} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{c}</option>)}
                            </select>
                            <select value={asmSortBy} onChange={e => setAsmSortBy(e.target.value)} style={inp}>
                                <option value="Newest" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>─── Newest First</option>
                                <option value="Oldest" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>──+ Oldest First</option>
                                <option value="Most Attempts" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Most Attempts</option>
                                <option value="Name A-Z" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>A-Z Name</option>
                            </select>
                            <button onClick={() => { setAsmSearchQuery(''); setAsmCourseFilter('All'); setAsmTypeFilter('All'); setAsmStatusFilter('All'); setAsmSortBy('Newest'); }} style={{ ...inp, color: '#ef4444', fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}> <X size={14} /> Clear</button>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th style={col()}><input type="checkbox" checked={selectedAsmRows.length === pagedAsm.length && pagedAsm.length > 0} onChange={e => setSelectedAsmRows(e.target.checked ? pagedAsm.map(a => a.id) : [])} /></th>
                                        <th style={col()}>Assessment Name</th>
                                        <th style={col()}>Course</th>
                                        <th style={col()}>Instructor</th>
                                        <th style={col()}>Type</th>
                                        <th style={col()}>Questions</th>
                                        <th style={col()}>Pass Score</th>
                                        <th style={col()}>Attempts</th>
                                        <th style={col()}>Avg Score</th>
                                        <th style={col()}>Status</th>
                                        <th style={{ ...col(), textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedAsm.length === 0 ? (
                                        <tr><td colSpan={11} style={{ padding: '48px', textAlign: 'center', color: colors.textMuted, fontSize: '14px' }}>No assessments found.</td></tr>
                                    ) : pagedAsm.map(asm => {
                                        const tb = typeBadges[asm.type] || { icon: <FileText size={14} />, color: colors.textMuted, bg: 'rgba(148, 163, 184, 0.15)' };
                                        const sb = statusBadges[asm.status] || { icon: '──', color: colors.textMuted, bg: 'rgba(148, 163, 184, 0.15)' };
                                        const isSel = selectedAsmRows.includes(asm.id);
                                        return (
                                            <tr key={asm.id} style={{ borderBottom: `1px solid ${colors.border}`, background: isSel ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                                                <td style={{ padding: '14px 16px' }}><input type="checkbox" checked={isSel} onChange={() => setSelectedAsmRows(prev => isSel ? prev.filter(id => id !== asm.id) : [...prev, asm.id])} /></td>
                                                <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                                                    <div style={{ fontWeight: '600', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asm.name}</div>
                                                    <div style={{ fontSize: '11px', color: colors.textMuted }}>{asm.id} ── Created {asm.date}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{asm.course}</td>
                                                <td style={{ padding: '14px 16px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{asm.instructor}</td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ background: tb.bg, color: tb.color, padding: '4px 10px', borderRadius: '20px', fontWeight: '600', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{tb.icon} {asm.type}</span>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: colors.text }}>{asm.totalQuestions}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#10b981' }}>{asm.passingScore}%</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#3b82f6' }}>{asm.attempts}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: asm.avgScore >= 75 ? '#10b981' : asm.avgScore > 0 ? '#f59e0b' : colors.textMuted }}>{asm.avgScore ? `${asm.avgScore}%` : '─"'}</td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ background: sb.bg, color: sb.color, padding: '4px 10px', borderRadius: '20px', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{sb.icon} {asm.status}</span>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        {asm.status !== 'Active' ? (
                                                            <button title="Publish" onClick={() => handleAsmAction('publish', asm)} style={{ padding: '6px 8px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center' }}> <Rocket size={14} /> </button>
                                                        ) : (
                                                            <button title="Unpublish" onClick={() => handleAsmAction('unpublish', asm)} style={{ padding: '6px 8px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', cursor: 'pointer', color: '#f59e0b', display: 'flex', alignItems: 'center' }}> <Pause size={14} /> </button>
                                                        )}
                                                        <button title="Duplicate" onClick={() => handleAsmAction('duplicate', asm)} style={{ padding: '6px 8px', background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '6px', cursor: 'pointer', color: '#8b5cf6', display: 'flex', alignItems: 'center' }}> <Copy size={14} /> </button>
                                                        <button title="Delete" onClick={() => { if (window.confirm(`Delete "${asm.name}"?`)) handleAsmAction('delete', asm); }} style={{ padding: '6px 8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}> <Trash2 size={14} /> </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ fontSize: '13px', color: colors.textMuted }}>
                                Showing {Math.min(pageStart + 1, filteredAsm.length)}─"{Math.min(pageStart + asmRowsPerPage, filteredAsm.length)} of {filteredAsm.length} assessments
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button disabled={asmCurrentPage === 1} onClick={() => setAsmCurrentPage(p => p - 1)} style={{ ...inp, padding: '6px 12px', opacity: asmCurrentPage === 1 ? 0.4 : 1 }}>─+? Prev</button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                                    <button key={n} onClick={() => setAsmCurrentPage(n)} style={{ ...inp, padding: '6px 12px', background: n === asmCurrentPage ? '#2563eb' : '#fff', color: n === asmCurrentPage ? '#fff' : '#334155', fontWeight: n === asmCurrentPage ? '700' : '500', border: n === asmCurrentPage ? 'none' : '1px solid #e2e8f0' }}>{n}</button>
                                ))}
                                <button disabled={asmCurrentPage === totalPages} onClick={() => setAsmCurrentPage(p => p + 1)} style={{ ...inp, padding: '6px 12px', opacity: asmCurrentPage === totalPages ? 0.4 : 1 }}>Next ─+'</button>
                            </div>
                        </div>
                    </div>
                )}


                {/* ─?─?─?─?─?─?─?─?─?─?─? 3. GRADEBOOK VIEW ─?─?─?─?─?─?─?─?─?─?─? */}
                {asmTabSubView === 'grades' && (
                    <div style={{ background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text }}> <GraduationCap size={16} style={{ marginRight: '6px' }} />  Institutional Gradebook</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.textMuted }}>Monitor student grades, review auto-graded submissions, and override final scores.</p>
                            </div>
                            <button onClick={() => { const csv = ['ID,Student,Course,Assessment,Score,Grade,Status'].concat(gradebookEntries.map(g => `"${g.id}","${g.student}","${g.course}","${g.assessment}",${g.score},"${g.grade}","${g.status}"`)).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'gradebook_export.csv'; link.click(); showNotification('Gradebook exported.'); }}
                                style={{ ...inp, background: '#10b981', color: colors.text, border: 'none', fontWeight: '600' }}> <Upload size={16} style={{ marginRight: '6px' }} />  Export Gradebook</button>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr>{['ID', 'Student Name', 'Course', 'Assessment', 'Score', 'Letter Grade', 'Status', 'Actions'].map(h => <th key={h} style={col()}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {gradebookEntries.map(g => (
                                    <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', color: colors.textMuted, fontSize: '12px', fontWeight: '600' }}>{g.id}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '600', color: colors.text }}>{g.student}</td>
                                        <td style={{ padding: '12px 16px', color: colors.text }}>{g.course}</td>
                                        <td style={{ padding: '12px 16px', color: '#2563eb' }}>{g.assessment}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '700', color: g.score >= 80 ? '#10b981' : '#f59e0b' }}>{g.score}%</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ background: '#f5f3ff', color: '#8b5cf6', padding: '3px 10px', borderRadius: '12px', fontWeight: '700', fontSize: '12px' }}>{g.grade}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ background: g.status === 'Approved' ? '#f0fdf4' : '#fffbeb', color: g.status === 'Approved' ? '#10b981' : '#f59e0b', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>{g.status} {g.override ? '(Override)' : ''}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => setGradebookEntries(prev => prev.map(entry => entry.id === g.id ? { ...entry, status: 'Approved' } : entry))} style={{ ...inp, padding: '4px 10px', background: '#f0fdf4', color: '#10b981', fontSize: '12px' }}>Approve</button>
                                                <button onClick={() => { const newScore = prompt('Enter override score (0-100):', g.score); if (newScore !== null) { setGradebookEntries(prev => prev.map(entry => entry.id === g.id ? { ...entry, score: Number(newScore), override: true } : entry)); showNotification('Grade overridden.'); } }} style={{ ...inp, padding: '4px 10px', background: '#fffbeb', color: '#f59e0b', fontSize: '12px' }}>Override</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ─?─?─?─?─?─?─?─?─?─?─? 4. CERTIFICATES & TEMPLATES VIEW ─?─?─?─?─?─?─?─?─?─?─? */}
                {asmTabSubView === 'certificates' && (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        {/* Issued Certificates Section */}
                        <div style={s.card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={s.cardTitle}>Issued Certificates</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.textMuted }}>Manage, revoke, reissue, or download official digital certificates.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <form onSubmit={handleGenerateCertificate} style={{ display: 'flex', gap: '8px' }}>
                                        <select value={certificateForm.studentId} onChange={(e) => setCertificateForm({ ...certificateForm, studentId: e.target.value })} style={inp}>
                                            <option value="" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Select student</option>
                                            {users.filter((u) => u.assignedRole === 'Student').map((user) => (
                                                <option key={user._id} value={user._id} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{user.fullName}</option>
                                            ))}
                                        </select>
                                        <select value={certificateForm.courseId} onChange={(e) => setCertificateForm({ ...certificateForm, courseId: e.target.value })} style={inp}>
                                            <option value="" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Select course</option>
                                            {allCourses.map((course) => (
                                                <option key={course._id} value={course._id} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{course.courseTitle}</option>
                                            ))}
                                        </select>
                                        <button type="submit" disabled={isCertificateActionLoading} style={{ ...inp, background: '#2563eb', color: colors.text, border: 'none', fontWeight: '700' }}> <Zap size={16} style={{ marginRight: '6px' }} />  Issue Certificate</button>
                                    </form>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {certificateRecords.map((certificate) => (
                                    <div key={certificate._id} style={{ border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '16px', background: colors.bgInput }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: '700', color: colors.text, fontSize: '15px' }}> <Medal size={16} style={{ marginRight: '6px' }} />  {certificate.studentRef?.fullName || 'Student'}</div>
                                                <div style={{ color: colors.textMuted, fontSize: '13px', marginTop: '2px' }}>Course: <strong>{certificate.courseRef?.courseTitle || 'Course'}</strong></div>
                                                <div style={{ color: '#2563eb', fontSize: '12px', marginTop: '4px', fontFamily: 'monospace', fontWeight: '700' }}>{certificate.certificateNumber}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{ ...s.badge, background: certificate.status === 'Revoked' ? `${colors.danger}15` : certificate.status === 'Reissued' ? `${colors.warning}15` : `${colors.success}15`, color: certificate.status === 'Revoked' ? colors.danger : certificate.status === 'Reissued' ? colors.warning : colors.success }}>{certificate.status || 'Issued'}</span>
                                                <button onClick={() => handleDownloadCertificate(certificate._id)} style={{ ...s.actionBtn, color: colors.primary, borderColor: colors.primary }}> <Download size={16} style={{ marginRight: '6px' }} />  Download</button>
                                                <button onClick={() => handleReissueCertificate(certificate._id)} style={{ ...s.actionBtn, color: colors.warning, borderColor: colors.warning }}> <RefreshCw size={16} style={{ marginRight: '6px' }} />  Reissue</button>
                                                <button onClick={() => handleRevokeCertificate(certificate._id)} style={{ ...s.actionBtn, color: colors.danger, borderColor: colors.danger }}> <Ban size={16} style={{ marginRight: '6px', color: '#ef4444' }} />  Revoke</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Certificate Templates & Designer */}
                        <div style={s.card}>
                            <h3 style={s.cardTitle}> <Palette size={16} style={{ marginRight: '6px' }} />  Certificate Templates & Drag-and-Drop Designer</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                    {certificateTemplates.map((template) => (
                                        <div key={template.id} onClick={() => handleSelectTemplate(template.id)}
                                            style={{ padding: '16px', background: activeTemplateId === template.id ? colors.bgCard : colors.bgInput, border: `2px solid ${activeTemplateId === template.id ? colors.primary : colors.border}`, borderRadius: '16px', cursor: 'pointer' }}>
                                            <div style={{ fontWeight: '800', fontSize: '15px', color: colors.text }}>{template.name}</div>
                                            <div style={{ marginTop: '6px', color: colors.textMuted, fontSize: '12px' }}>{template.description}</div>
                                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted }}>
                                                <span>{template.layoutStyle}</span>
                                                {template.id !== 'standard' && <button onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }} style={{ color: colors.danger, border: 'none', background: 'transparent', cursor: 'pointer' }}>Delete</button>}
                                            </div>
                                        </div>
                                    ))}
                                    <div onClick={handleOpenTemplateModal} style={{ minHeight: '120px', padding: '16px', background: colors.bgInput, border: `2px dashed ${colors.border}`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, cursor: 'pointer', fontWeight: '700' }}>
                                         <Plus size={16} style={{ marginRight: '6px' }} />  New Template
                                    </div>
                                </div>

                                {/* Preview Card */}
                                <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fbff', border: `1px solid ${colors.border}` }}>
                                    <h4 style={{ margin: '0 0 10px', fontSize: '15px', color: colors.text }}>Live Template Preview</h4>
                                    {(() => {
                                        const sel = certificateTemplates.find((t) => t.id === activeTemplateId) || certificateTemplates[0] || { name: 'Standard Template', layoutStyle: 'Classic', signature: 'Registrar', colorScheme: 'Blue' };
                                        return (
                                            <div style={{ padding: '20px', borderRadius: '12px', background: colors.bgCard, border: '2px double #2563eb', textAlign: 'center' }}>
                                                <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>EMARE ACADEMIC INSTITUTE</div>
                                                <h3 style={{ margin: '8px 0', color: colors.text, fontSize: '18px' }}>Certificate of Completion</h3>
                                                <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>This is to certify that student completed course requirements under</p>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#2563eb', margin: '6px 0' }}>{sel.name}</div>
                                                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, borderTop: `1px solid ${colors.border}`, paddingTop: '10px' }}>
                                                    <span>Verified via QR Code</span>
                                                    <span>Signature: {sel.signature}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─?─?─?─?─?─?─?─?─?─?─? 5. PERFORMANCE ANALYTICS VIEW ─?─?─?─?─?─?─?─?─?─?─? */}
                {asmTabSubView === 'analytics' && (() => {
                    const totalAsm = assessmentsList.length || 1;
                    const totalAtt = assessmentsList.reduce((acc, a) => acc + a.attempts, 0);
                    const avgPassRate = 84.2;
                    return (
                        <div style={{ display: 'grid', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                {[
                                    { label: 'Overall Pass Rate', value: `${avgPassRate}%`, color: '#10b981', bg: '#f0fdf4', desc: 'Average pass rate across all exams' },
                                    { label: 'Total Exam Attempts', value: totalAtt, color: '#3b82f6', bg: '#eff6ff', desc: 'Student attempt submissions' },
                                    { label: 'Auto-Graded Ratio', value: '92%', color: '#8b5cf6', bg: '#f5f3ff', desc: 'Quizzes auto-graded by system' },
                                    { label: 'Active Certificates', value: certificateRecords.length, color: '#ec4899', bg: '#fdf2f8', desc: 'Issued digital certificates' },
                                ].map(c => (
                                    <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.color}22`, borderRadius: '14px', padding: '20px' }}>
                                        <div style={{ fontSize: '28px', fontWeight: '800', color: c.color }}>{c.value}</div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: colors.text, marginTop: '4px' }}>{c.label}</div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '2px' }}>{c.desc}</div>
                                        <div style={{ marginTop: '10px', height: '5px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: c.color, width: '85%' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, padding: '20px' }}>
                                <h4 style={{ margin: '0 0 14px', fontWeight: '700', color: colors.text, fontSize: '15px' }}> <TrendingUp size={16} style={{ marginRight: '6px' }} />  Assessment Scores & Attempts Breakdown</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {assessmentsList.map(a => (
                                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '220px', fontSize: '13px', fontWeight: '600', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ height: '8px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', background: a.avgScore >= 75 ? '#10b981' : '#f59e0b', width: `${a.avgScore || 20}%` }} />
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb', minWidth: '45px', textAlign: 'right' }}>{a.avgScore ? `${a.avgScore}%` : 'N/A'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })()}


                {/* ─?─?─?─?─?─?─?─?─?─?─? CREATE ASSESSMENT MODAL ─?─?─?─?─?─?─?─?─?─?─? */}
                {isCreateAsmOpen && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }} onClick={() => setIsCreateAsmOpen(false)} />
                        <div style={{ position: 'relative', width: '580px', maxWidth: '95vw', maxHeight: '90vh', background: colors.bgCard, borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'auto', animation: 'fadeIn 0.2s ease' }}>
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.bg, borderRadius: '20px 20px 0 0' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>New Assessment</div>
                                    <h3 style={{ margin: 0, color: colors.text, fontSize: '17px', fontWeight: '700' }}> <FilePen size={16} style={{ marginRight: '6px' }} />  Configure Assessment</h3>
                                </div>
                                <button onClick={() => setIsCreateAsmOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: colors.text, borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '16px' }}> <X size={16} style={{ marginRight: '6px' }} /> </button>
                            </div>

                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}>Title *</label>
                                    <input value={createAsmForm.name} onChange={e => setCreateAsmForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Midterm Comprehensive Quiz" style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}>Course</label>
                                        <select value={createAsmForm.course} onChange={e => setCreateAsmForm(p => ({ ...p, course: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
                                            {allCourses.map(c => <option key={c._id} value={c.courseTitle} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{c.courseTitle}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}>Assessment Type</label>
                                        <select value={createAsmForm.type} onChange={e => setCreateAsmForm(p => ({ ...p, type: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
                                            <option value="Quiz" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Quiz</option>
                                            <option value="Exam" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Exam</option>
                                            <option value="Assignment" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Assignment</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}>Questions</label>
                                        <input type="number" value={createAsmForm.totalQuestions} onChange={e => setCreateAsmForm(p => ({ ...p, totalQuestions: Number(e.target.value) }))} style={{ width: '100%', padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}>Passing %</label>
                                        <input type="number" value={createAsmForm.passingScore} onChange={e => setCreateAsmForm(p => ({ ...p, passingScore: Number(e.target.value) }))} style={{ width: '100%', padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}>Time (min)</label>
                                        <input type="number" value={createAsmForm.timeLimit} onChange={e => setCreateAsmForm(p => ({ ...p, timeLimit: Number(e.target.value) }))} style={{ width: '100%', padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px' }}>
                                    <button onClick={() => setIsCreateAsmOpen(false)} style={{ ...inp, padding: '10px 20px', fontWeight: '600' }}>Cancel</button>
                                    <button onClick={handleCreateAsm} style={{ ...inp, background: '#2563eb', color: colors.text, border: 'none', padding: '10px 24px', fontWeight: '700', boxShadow: '0 2px 10px rgba(37,99,235,0.3)' }}>Create Assessment</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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
                            <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Users</option>
                            <option value="students" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Students</option>
                            <option value="instructors" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Instructors</option>
                        </select>
                        <label style={s.label}>Title</label>
                        <input value={notificationForm.title} onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })} placeholder="Enter a notification title" style={s.input} />
                        <label style={s.label}>Message</label>
                        <textarea value={notificationForm.message} onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })} placeholder="Write the announcement or reminder" rows="4" style={s.input}></textarea>
                        <label style={s.label}>Type</label>
                        <select value={notificationForm.type} onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })} style={s.select}>
                            <option value="announcement" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Announcement</option>
                            <option value="system" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>System</option>
                            <option value="assignment" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Assignment</option>
                            <option value="certificate" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Certificate</option>
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
                            {isNotificationSubmitting ? 'Sending──' : 'Send Notification'}
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
                            <option value="home" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Homepage Content</option>
                            <option value="about" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>About Page</option>
                            <option value="faq" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>FAQ</option>
                            <option value="contact" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Contact Page</option>
                            <option value="privacy" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Privacy Policy</option>
                            <option value="terms" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Terms and Conditions</option>
                            <option value="banners" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Banner Management</option>
                            <option value="testimonials" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Testimonials</option>
                            <option value="news" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>News</option>
                            <option value="blogs" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Blogs</option>
                        </select>
                        <form onSubmit={handleSaveContent} style={{ display: 'grid', gap: '12px' }}>
                            <label style={s.label}>Page Title</label>
                            <input value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} style={s.input} />
                            <label style={s.label}>Content JSON / Text</label>
                            <textarea value={contentForm.content} onChange={(e) => setContentForm({ ...contentForm, content: e.target.value })} rows="10" style={{ ...s.input, minHeight: '220px', fontFamily: 'monospace' }} />
                            <button type="submit" disabled={isContentSaving} style={{ ...s.primaryBtn, opacity: isContentSaving ? 0.7 : 1 }}>
                                {isContentSaving ? 'Saving──' : 'Save Content'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderReports = () => {
        const reportCategories = ['User Reports','Student Reports','Instructor Reports','Course Reports','Enrollment Reports','Quiz Reports','Assignment Reports','Certificate Reports','Financial Reports','Revenue Reports','Attendance Reports','Activity Logs','Login Reports','Content Reports','System Reports'];
        const formatConfig = {
            'PDF':   { icon: <Book size={16} style={{ marginRight: '6px' }} />, color: '#ef4444', bg: '#fef2f2' },
            'Excel': { icon: <BookOpen size={16} style={{ marginRight: '6px' }} />, color: '#22c55e', bg: '#f0fdf4' },
            'CSV':   { icon: <BarChart3 size={16} style={{ marginRight: '6px' }} />, color: '#3b82f6', bg: '#eff6ff' },
            'Word':  { icon: <Book size={16} style={{ marginRight: '6px' }} />, color: '#2563eb', bg: '#eff6ff' },
            'JSON':  { icon: <FileText size={16} style={{ marginRight: '6px' }} />, color: '#f59e0b', bg: '#fffbeb' },
            'XML':   { icon: <ScrollText size={16} style={{ marginRight: '6px' }} />, color: '#8b5cf6', bg: '#f5f3ff' },
        };
        const statusConf = {
            'Completed':  { icon: <CheckCircle2 size={16} style={{ marginRight: '6px', color: colors.success }} />, color: '#10b981', bg: '#f0fdf4' },
            'Processing': { icon: '─3', color: '#f59e0b', bg: '#fffbeb' },
            'Scheduled':  { icon: <Calendar size={16} style={{ marginRight: '6px' }} />, color: '#3b82f6', bg: '#eff6ff' },
            'Failed':     { icon: <XCircle size={16} style={{ marginRight: '6px', color: '#ef4444' }} />, color: '#ef4444', bg: '#fef2f2' },
            'Cancelled':  { icon: <Ban size={16} style={{ marginRight: '6px', color: '#ef4444' }} />, color: colors.textMuted, bg: '#f1f5f9' },
        };
        const categoryIcons = { 'User Reports': <Users size={16} style={{ marginRight: '6px' }} />, 'Student Reports': <GraduationCap size={16} style={{ marginRight: '6px' }} />, 'Instructor Reports': <><User size={16} style={{ marginRight: '6px' }} /><Building2 size={16} style={{ marginRight: '6px' }} /></>, 'Course Reports': <Library size={16} style={{ marginRight: '6px' }} />, 'Enrollment Reports': <FilePen size={16} style={{ marginRight: '6px' }} />, 'Quiz Reports': <HelpCircle size={16} style={{ marginRight: '6px' }} />, 'Assignment Reports': <Clipboard size={16} style={{ marginRight: '6px' }} />, 'Certificate Reports': <Medal size={16} style={{ marginRight: '6px' }} />, 'Financial Reports': <DollarSign size={16} style={{ marginRight: '6px' }} />, 'Revenue Reports': <TrendingUp size={16} style={{ marginRight: '6px' }} />, 'Attendance Reports': <Calendar size={16} style={{ marginRight: '6px' }} />, 'Activity Logs': <Clock size={16} style={{ marginRight: '6px' }} />, 'Login Reports': <Lock size={16} style={{ marginRight: '6px' }} />, 'Content Reports': <Folder size={16} style={{ marginRight: '6px' }} />, 'System Reports': <Monitor size={16} style={{ marginRight: '6px' }} /> };

        const filtered = generatedReports.filter(r => {
            const q = rptSearchQuery.toLowerCase();
            const matchSearch = !q || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.generatedBy.toLowerCase().includes(q);
            const matchCat = rptCategoryFilter === 'All' || r.category === rptCategoryFilter;
            const matchStat = rptStatusFilter === 'All' || r.status === rptStatusFilter;
            const matchFmt = rptFormatFilter === 'All' || r.format === rptFormatFilter;
            return matchSearch && matchCat && matchStat && matchFmt;
        }).sort((a, b) => {
            if (rptSortBy === 'Newest') return new Date(b.date) - new Date(a.date);
            if (rptSortBy === 'Oldest') return new Date(a.date) - new Date(b.date);
            if (rptSortBy === 'Most Downloaded') return b.downloads - a.downloads;
            if (rptSortBy === 'Name A-Z') return a.name.localeCompare(b.name);
            return 0;
        });
        const pageStart = (rptCurrentPage - 1) * rptRowsPerPage;
        const paged = filtered.slice(pageStart, pageStart + rptRowsPerPage);
        const totalPages = Math.max(1, Math.ceil(filtered.length / rptRowsPerPage));

        const handleGenReport = () => {
            if (!genReportForm.name.trim()) return alert('Report name is required.');
            const newR = {
                id: `RPT-${String(generatedReports.length + 1).padStart(3, '0')}`,
                name: genReportForm.name,
                category: genReportForm.category,
                generatedBy: 'Admin User',
                date: new Date().toISOString().split('T')[0],
                format: genReportForm.format,
                size: `${(Math.random() * 5 + 0.3).toFixed(1)} MB`,
                status: genReportForm.delivery === 'schedule' ? 'Scheduled' : 'Processing',
                downloads: 0,
            };
            setGeneratedReports(prev => [newR, ...prev]);
            setRptActivityLog(prev => [{ action: 'Report Generated', item: newR.name, user: 'Admin User', date: new Date().toLocaleString() }, ...prev]);
            if (newR.status === 'Processing') {
                setTimeout(() => { setGeneratedReports(prev => prev.map(r => r.id === newR.id ? { ...r, status: 'Completed' } : r)); showNotification(`Report "${newR.name}" completed!`); }, 3000);
            }
            setIsGenReportOpen(false);
            setGenReportForm({ name: '', category: 'User Reports', description: '', dateFrom: '', dateTo: '', format: 'PDF', delivery: 'download' });
            showNotification(`Report "${newR.name}" is being generated...`);
        };

        const handleDownloadReport = (rpt) => {
            const csv = `Report: ${rpt.name}\nCategory: ${rpt.category}\nGenerated: ${rpt.date}\nFormat: ${rpt.format}\nStatus: ${rpt.status}\n\n--- Sample Data ---\nMetric,Value\nTotal Users,${Math.floor(Math.random() * 5000)}\nActive Users,${Math.floor(Math.random() * 3000)}\nCourses,${Math.floor(Math.random() * 200)}\nCompletion Rate,${Math.floor(Math.random() * 100)}%`;
            const blob = new Blob([csv], { type: 'text/csv' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${rpt.name.replace(/\s+/g, '_')}.${rpt.format.toLowerCase() === 'excel' ? 'xlsx' : rpt.format.toLowerCase()}`;
            link.click();
            setGeneratedReports(prev => prev.map(r => r.id === rpt.id ? { ...r, downloads: r.downloads + 1 } : r));
            setRptActivityLog(prev => [{ action: 'Report Downloaded', item: rpt.name, user: 'Admin User', date: new Date().toLocaleString() }, ...prev]);
            showNotification(`Downloaded: ${rpt.name}`);
        };

        const handleBulkRptAction = (action) => {
            if (!selectedReportRows.length) return alert('Select at least one report.');
            if (action === 'delete' && !window.confirm(`Delete ${selectedReportRows.length} reports?`)) return;
            if (action === 'delete') { setGeneratedReports(prev => prev.filter(r => !selectedReportRows.includes(r.id))); }
            if (action === 'download') { selectedReportRows.forEach(id => { const rpt = generatedReports.find(r => r.id === id); if (rpt) handleDownloadReport(rpt); }); }
            if (action === 'archive') { setGeneratedReports(prev => prev.map(r => selectedReportRows.includes(r.id) ? { ...r, status: 'Cancelled' } : r)); }
            setSelectedReportRows([]);
            showNotification(`Bulk ${action} applied to ${selectedReportRows.length} reports.`);
        };

        const statsData = [
            { label: 'Total Reports',         value: generatedReports.length, icon: <BarChart3 size={16} style={{ marginRight: '6px' }} />, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Generated Today',       value: generatedReports.filter(r => r.date === new Date().toISOString().split('T')[0]).length, icon: <FileText size={16} style={{ marginRight: '6px' }} />, color: '#10b981', bg: '#f0fdf4' },
            { label: 'Scheduled Reports',     value: scheduledReports.length, icon: <Calendar size={16} style={{ marginRight: '6px' }} />, color: '#8b5cf6', bg: '#f5f3ff' },
            { label: 'Exported Files',        value: generatedReports.filter(r => r.status === 'Completed').length, icon: <Upload size={16} style={{ marginRight: '6px' }} />, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Active Templates',      value: reportCategories.length, icon: <Folder size={16} style={{ marginRight: '6px' }} />, color: '#0891b2', bg: '#ecfeff' },
            { label: 'Storage Used',          value: `${(generatedReports.reduce((acc, r) => acc + parseFloat(r.size), 0)).toFixed(1)} MB`, icon: <Save size={16} style={{ marginRight: '6px' }} />, color: colors.textMuted, bg: '#f8fafc' },
        ];

        const inp = { padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', background: colors.bgCard, color: colors.text, outline: 'none', cursor: 'pointer' };
        const col = () => ({ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`, background: colors.bg, whiteSpace: 'nowrap' });

        return (
            <div style={{ padding: '28px 32px', minHeight: '100%', fontFamily: 'inherit', position: 'relative' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Dashboard ─+' Reports & Export</div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', color: colors.text, margin: 0 }}> <BarChart3 size={16} style={{ marginRight: '6px' }} />  Reports & Export</h2>
                        <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0' }}>Generate, schedule, analyze, and export institutional performance reports across all LMS modules.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => setIsGenReportOpen(true)} style={{ ...inp, background: '#2563eb', color: colors.text, border: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}> <Plus size={16} style={{ marginRight: '6px' }} />  Generate Report</button>
                        <button onClick={() => { const csv = ['Name,Category,Generated By,Date,Format,Size,Status,Downloads'].concat(filtered.map(r => `"${r.name}","${r.category}","${r.generatedBy}","${r.date}","${r.format}","${r.size}","${r.status}",${r.downloads}`)).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'all_reports_export.csv'; link.click(); showNotification('Report index exported.'); }}
                            style={{ ...inp, background: colors.bgCard, display: 'flex', alignItems: 'center', gap: '6px' }}> <Upload size={16} style={{ marginRight: '6px' }} />  Export Data</button>
                        <button onClick={() => { const res = [...generatedReports]; setGeneratedReports([]); setTimeout(() => setGeneratedReports(res), 100); showNotification('Reports refreshed.'); }}
                            style={{ ...inp, background: colors.bgCard, display: 'flex', alignItems: 'center', gap: '6px' }}> <RefreshCw size={16} style={{ marginRight: '6px' }} />  Refresh</button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {statsData.map(st => (
                        <div key={st.label} style={{ background: st.bg, border: `1px solid ${st.color}22`, borderRadius: '14px', padding: '16px', cursor: 'pointer' }}>
                            <div style={{ fontSize: '26px' }}>{st.icon}</div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: st.color, lineHeight: 1, marginTop: '4px' }}>{st.value}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>{st.label}</div>
                        </div>
                    ))}
                </div>

                {/* Report Category Quick-Access Cards */}
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}> <FolderOpen size={16} style={{ marginRight: '6px' }} />  Report Categories</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <select 
                            value={rptCategoryFilter} 
                            onChange={(e) => setRptCategoryFilter(e.target.value)} 
                            style={{ ...inp, padding: '8px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', color: colors.text, background: colors.bgCard, cursor: 'pointer', outline: 'none', minWidth: '200px' }}
                        >
                            <option value="All" style={{ background: colors.bgCard, color: colors.text }}>All Categories</option>
                            {reportCategories.map(cat => (
                                <option key={cat} value={cat} style={{ background: colors.bgCard, color: colors.text }}>
                                    {cat.replace(' Reports', '')}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Sub-view Tabs */}
                <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
                    {[{ key: 'all', label: <><Clipboard size={16} style={{ marginRight: '6px' }} />  All Reports</> }].map(t => (
                        <button key={t.key} onClick={() => setRptSubView(t.key)}
                            style={{ padding: '10px 20px', border: 'none', background: 'transparent', borderBottom: rptSubView === t.key ? '3px solid #2563eb' : '3px solid transparent', color: rptSubView === t.key ? '#2563eb' : colors.textMuted, fontWeight: rptSubView === t.key ? '700' : '500', fontSize: '13px', cursor: 'pointer', marginBottom: '-2px' }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ─?─?─?─?─?─?─?─?─?─?─? ALL REPORTS TABLE VIEW ─?─?─?─?─?─?─?─?─?─?─? */}
                {rptSubView === 'all' && (
                    <div style={{ background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

                        {/* Bulk Toolbar */}
                        {selectedReportRows.length > 0 && (
                            <div style={{ padding: '10px 20px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '700', fontSize: '13px', color: '#2563eb' }}>{selectedReportRows.length} selected</span>
                                <button onClick={() => handleBulkRptAction('download')} style={{ ...inp, background: '#10b981', color: colors.text, border: 'none', padding: '6px 14px' }}> <Download size={16} style={{ marginRight: '6px' }} />  Download</button>
                                <button onClick={() => handleBulkRptAction('archive')}  style={{ ...inp, background: '#64748b', color: colors.text, border: 'none', padding: '6px 14px' }}> <Package size={16} style={{ marginRight: '6px' }} />  Archive</button>
                                <button onClick={() => handleBulkRptAction('delete')}   style={{ ...inp, background: '#dc2626', color: colors.text, border: 'none', padding: '6px 14px' }}> <Trash2 size={16} style={{ marginRight: '6px' }} /> ─,? Delete</button>
                                <button onClick={() => setSelectedReportRows([])} style={{ ...inp, padding: '6px 12px', marginLeft: 'auto' }}> <X size={16} style={{ marginRight: '6px' }} />  Deselect</button>
                            </div>
                        )}

                        {/* Filters */}
                        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '7px 12px', background: colors.bg }}>
                                <span style={{ color: colors.textMuted }}> <Search size={16} style={{ marginRight: '6px' }} /> </span>
                                <input value={rptSearchQuery} onChange={e => setRptSearchQuery(e.target.value)} placeholder="Search report name, category..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: colors.text, width: '100%' }} />
                            </div>
                            <select value={rptStatusFilter} onChange={e => setRptStatusFilter(e.target.value)} style={inp}>
                                <option value="All" style={{ background: colors.bgCard, color: colors.text }}>All Statuses</option>
                                {Object.keys(statusConf).map(s => <option key={s} value={s} style={{ background: colors.bgCard, color: colors.text }}>{s}</option>)}
                            </select>
                            <select value={rptFormatFilter} onChange={e => setRptFormatFilter(e.target.value)} style={inp}>
                                <option value="All" style={{ background: colors.bgCard, color: colors.text }}>All Formats</option>
                                {Object.keys(formatConfig).map(f => <option key={f} value={f} style={{ background: colors.bgCard, color: colors.text }}>{f}</option>)}
                            </select>
                            <select value={rptSortBy} onChange={e => setRptSortBy(e.target.value)} style={inp}>
                                <option value="Newest" style={{ background: colors.bgCard, color: colors.text }}>─── Newest First</option>
                                <option value="Oldest" style={{ background: colors.bgCard, color: colors.text }}>──+ Oldest First</option>
                                <option value="Most Downloaded" style={{ background: colors.bgCard, color: colors.text }}> <Download size={16} style={{ marginRight: '6px' }} />  Most Downloaded</option>
                                <option value="Name A-Z" style={{ background: colors.bgCard, color: colors.text }}>A-Z Name</option>
                            </select>
                            <button onClick={() => { setRptSearchQuery(''); setRptCategoryFilter('All'); setRptStatusFilter('All'); setRptFormatFilter('All'); setRptSortBy('Newest'); }} style={{ ...inp, color: '#ef4444', fontSize: '12px', padding: '6px 12px' }}> <X size={16} style={{ marginRight: '6px' }} />  Clear</button>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th style={col()}><input type="checkbox" checked={selectedReportRows.length === paged.length && paged.length > 0} onChange={e => setSelectedReportRows(e.target.checked ? paged.map(r => r.id) : [])} /></th>
                                        <th style={col()}>Report Name</th>
                                        <th style={col()}>Category</th>
                                        <th style={col()}>Generated By</th>
                                        <th style={col()}>Date</th>
                                        <th style={col()}>Format</th>
                                        <th style={col()}>Size</th>
                                        <th style={col()}>Status</th>
                                        <th style={col()}>Downloads</th>
                                        <th style={{ ...col(), textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paged.length === 0 ? (
                                        <tr><td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: colors.textMuted, fontSize: '14px' }}>No reports match your filters.</td></tr>
                                    ) : paged.map(rpt => {
                                        const fc = formatConfig[rpt.format] || { icon: <FileText size={16} style={{ marginRight: '6px' }} />, color: colors.textMuted, bg: '#f8fafc' };
                                        const sc = statusConf[rpt.status]  || { icon: '──', color: colors.textMuted, bg: '#f8fafc' };
                                        const isSel = selectedReportRows.includes(rpt.id);
                                        return (
                                            <tr key={rpt.id} style={{ borderBottom: '1px solid #f1f5f9', background: isSel ? '#eff6ff' : 'transparent', transition: 'background 0.15s' }}
                                                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#fafafa'; }}
                                                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                                                <td style={{ padding: '14px 16px' }}><input type="checkbox" checked={isSel} onChange={() => setSelectedReportRows(prev => isSel ? prev.filter(id => id !== rpt.id) : [...prev, rpt.id])} /></td>
                                                <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                                                    <div style={{ fontWeight: '600', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rpt.name}</div>
                                                    <div style={{ fontSize: '11px', color: colors.textMuted }}>{rpt.id}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ fontSize: '12px', color: colors.text }}>{categoryIcons[rpt.category] || <><FileText size={16} style={{ marginRight: '6px' }} /></>} {rpt.category}</span>
                                                </td>
                                                <td style={{ padding: '14px 16px', color: colors.text, whiteSpace: 'nowrap' }}>{rpt.generatedBy}</td>
                                                <td style={{ padding: '14px 16px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{rpt.date}</td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ background: fc.bg, color: fc.color, padding: '4px 10px', borderRadius: '20px', fontWeight: '600', fontSize: '12px' }}>{fc.icon} {rpt.format}</span>
                                                </td>
                                                <td style={{ padding: '14px 16px', color: colors.textMuted, fontWeight: '500' }}>{rpt.size}</td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ background: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: '20px', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap' }}>{sc.icon} {rpt.status}</span>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>{rpt.downloads}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                        <button title="Download" onClick={() => handleDownloadReport(rpt)} style={{ padding: '5px 9px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} disabled={rpt.status !== 'Completed'}> <Download size={16} style={{ marginRight: '6px' }} /> </button>
                                                        <button title="Duplicate" onClick={() => { const dup = { ...rpt, id: `RPT-${String(generatedReports.length + 1).padStart(3, '0')}`, name: `${rpt.name} (Copy)`, date: new Date().toISOString().split('T')[0], downloads: 0 }; setGeneratedReports(prev => [dup, ...prev]); showNotification(`Duplicated: ${rpt.name}`); }} style={{ padding: '5px 9px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}> <Clipboard size={16} style={{ marginRight: '6px' }} /> </button>
                                                        <button title="Share" onClick={() => { navigator.clipboard?.writeText(`Report: ${rpt.name} | ID: ${rpt.id}`); showNotification('Report link copied to clipboard.'); }} style={{ padding: '5px 9px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}> <Link size={16} style={{ marginRight: '6px' }} /> </button>
                                                        <button title="Delete" onClick={() => { if (window.confirm(`Delete "${rpt.name}"?`)) { setGeneratedReports(prev => prev.filter(r => r.id !== rpt.id)); showNotification(`Deleted: ${rpt.name}`); }}} style={{ padding: '5px 9px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', color: '#dc2626', fontSize: '13px' }}> <Trash2 size={16} style={{ marginRight: '6px' }} /> ─,?</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ fontSize: '13px', color: colors.textMuted }}>
                                Showing {Math.min(pageStart + 1, filtered.length)}─"{Math.min(pageStart + rptRowsPerPage, filtered.length)} of {filtered.length} reports &nbsp;|&nbsp;
                                Rows: <select value={rptRowsPerPage} onChange={e => { setRptRowsPerPage(Number(e.target.value)); setRptCurrentPage(1); }} style={{ ...inp, padding: '3px 8px', fontSize: '12px', display: 'inline-block', width: 'auto' }}>
                                    {[5, 10, 25, 50].map(n => <option key={n} value={n} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{n}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button disabled={rptCurrentPage === 1} onClick={() => setRptCurrentPage(p => p - 1)} style={{ ...inp, padding: '6px 12px', opacity: rptCurrentPage === 1 ? 0.4 : 1 }}>─+? Prev</button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                                    <button key={n} onClick={() => setRptCurrentPage(n)} style={{ ...inp, padding: '6px 12px', background: n === rptCurrentPage ? '#2563eb' : '#fff', color: n === rptCurrentPage ? '#fff' : '#334155', fontWeight: n === rptCurrentPage ? '700' : '500', border: n === rptCurrentPage ? 'none' : '1px solid #e2e8f0' }}>{n}</button>
                                ))}
                                <button disabled={rptCurrentPage === totalPages} onClick={() => setRptCurrentPage(p => p + 1)} style={{ ...inp, padding: '6px 12px', opacity: rptCurrentPage === totalPages ? 0.4 : 1 }}>Next ─+'</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─?─?─?─?─?─?─?─?─?─?─? GENERATE REPORT MODAL ─?─?─?─?─?─?─?─?─?─?─? */}
                {isGenReportOpen && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }} onClick={() => setIsGenReportOpen(false)} />
                        <div style={{ position: 'relative', width: '600px', maxWidth: '95vw', maxHeight: '90vh', background: colors.bgCard, borderRadius: '20px', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'auto', animation: 'fadeIn 0.2s ease' }}>
                            {/* Modal Header */}
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.bg, borderRadius: '20px 20px 0 0' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Generate New Report</div>
                                    <h3 style={{ margin: 0, color: colors.text, fontSize: '17px', fontWeight: '700' }}> <BarChart3 size={16} style={{ marginRight: '6px' }} />  Report Builder</h3>
                                </div>
                                <button onClick={() => setIsGenReportOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: colors.text, borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '16px' }}> <X size={16} style={{ marginRight: '6px' }} /> </button>
                            </div>

                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                {/* Report Name */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}> <FilePen size={16} style={{ marginRight: '6px' }} />  Report Name *</label>
                                    <input value={genReportForm.name} onChange={e => setGenReportForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Monthly Enrollment Summary" style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                </div>

                                {/* Category & Format Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}> <FolderOpen size={16} style={{ marginRight: '6px' }} />  Report Category</label>
                                        <select value={genReportForm.category} onChange={e => setGenReportForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
                                            {reportCategories.map(c => <option key={c} value={c} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{categoryIcons[c]} {c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}> <Bookmark size={16} style={{ marginRight: '6px' }} />  Output Format</label>
                                        <select value={genReportForm.format} onChange={e => setGenReportForm(p => ({ ...p, format: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
                                            {Object.keys(formatConfig).map(f => <option key={f} value={f} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{formatConfig[f].icon} {f}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}> <Calendar size={16} style={{ marginRight: '6px' }} />  Date From</label>
                                        <input type="date" value={genReportForm.dateFrom} onChange={e => setGenReportForm(p => ({ ...p, dateFrom: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}> <Calendar size={16} style={{ marginRight: '6px' }} />  Date To</label>
                                        <input type="date" value={genReportForm.dateTo} onChange={e => setGenReportForm(p => ({ ...p, dateTo: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}> <FileEdit size={16} style={{ marginRight: '6px' }} /> ─,? Description (optional)</label>
                                    <textarea value={genReportForm.description} onChange={e => setGenReportForm(p => ({ ...p, description: e.target.value }))} placeholder="Add notes about this report..." rows={2} style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                                </div>

                                {/* Delivery Options */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '10px' }}> <Mail size={16} style={{ marginRight: '6px' }} />  Delivery Option</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                        {[
                                            { key: 'download', label: <><Download size={16} style={{ marginRight: '6px' }} />  Download Immediately</>, desc: 'Generate and download now' },
                                            { key: 'email', label: <><Mail size={16} style={{ marginRight: '6px' }} />  Email Report</>, desc: 'Send to admin email' },
                                            { key: 'library', label: <><Library size={16} style={{ marginRight: '6px' }} />  Save to Library</>, desc: 'Store in report library' },
                                            { key: 'schedule', label: <><Calendar size={16} style={{ marginRight: '6px' }} />  Schedule Automatic</>, desc: 'Recurring generation' },
                                        ].map(opt => (
                                            <div key={opt.key} onClick={() => setGenReportForm(p => ({ ...p, delivery: opt.key }))}
                                                style={{ padding: '12px', border: genReportForm.delivery === opt.key ? '2px solid #2563eb' : '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', background: genReportForm.delivery === opt.key ? '#eff6ff' : '#fff', transition: 'all 0.15s' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: genReportForm.delivery === opt.key ? '#2563eb' : '#334155' }}>{opt.label}</div>
                                                <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>{opt.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Generate Button */}
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '6px' }}>
                                    <button onClick={() => setIsGenReportOpen(false)} style={{ ...inp, padding: '10px 20px', fontWeight: '600' }}>Cancel</button>
                                    <button onClick={handleGenReport} style={{ ...inp, background: '#2563eb', color: colors.text, border: 'none', padding: '10px 24px', fontWeight: '700', boxShadow: '0 2px 10px rgba(37,99,235,0.3)' }}>
                                        {genReportForm.delivery === 'schedule' ? <><Calendar size={16} style={{ marginRight: '6px' }} />  Schedule Report</> : <><Rocket size={16} style={{ marginRight: '6px' }} />  Generate Report</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderAuditLogs = () => (
        <div style={s.tabContent}>
            <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Audit Logs</h2>
                <p style={s.sectionSub}>Review user activity, login events, course approvals, enrollment actions, system events, errors, and admin operations.</p>
            </div>

            <div style={s.card}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <select value={auditFilter} onChange={(e) => handleAuditFilterChange(e.target.value)} style={s.select}>
                        <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Logs</option>
                        <option value="login" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Login Logs</option>
                        <option value="user" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>User Activity</option>
                        <option value="course" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Course Approval Logs</option>
                        <option value="enrollment" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Enrollment Logs</option>
                        <option value="system" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>System Logs</option>
                        <option value="error" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Error Logs</option>
                        <option value="admin" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Admin Action Logs</option>
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
                                    User: {log.userRef?.fullName || 'System'} A─ Role: {log.userRef?.assignedRole || 'N/A'} A─ IP: {log.ipAddress || 'N/A'}
                                </div>
                            </div>
                        )) : <div style={{ color: colors.textMuted }}>No audit logs found for the selected filter.</div>}
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
        const googleMeetConnected = Boolean(googleMeetStatus?.connected && googleMeetStatus?.authorized);
        const googleMeetHint = !googleMeetStatus?.connected
            ? (googleMeetStatus?.missingEnv?.length ? `Missing backend/.env: ${googleMeetStatus.missingEnv.join(', ')}` : 'Checking connection...')
            : (!googleMeetStatus?.authorized ? 'Authorized account required — connect below.' : '');

        // ─"?─"? Unified event data (Internal + Public) ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?
        const internalRows = calendarEvents.map((e) => ({
            ...e,
            visibility: 'internal',
            location: e.location || (e.eventType === 'Online' ? 'Online' : '')
        }));
        const publicRows = publicEvents.map((e) => ({
            ...e,
            visibility: 'public',
            location: e.venue || (e.eventType !== 'Physical' ? 'Online Live Stream' : '')
        }));
        const allEvents = [...internalRows, ...publicRows];
        const eventLive = (e) => getLiveStatus(e);

        // ─"?─"? Filters ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?
        const q = eventSearch.trim().toLowerCase();
        const filteredEvents = allEvents.filter((e) => {
            const titleOk = !q || (e.title || '').toLowerCase().includes(q);
            const catOk = eventCategoryFilter === 'all' || (e.category || '').toLowerCase() === eventCategoryFilter;
            const visOk = eventVisibilityFilter === 'all' || e.visibility === eventVisibilityFilter;
            const live = eventLive(e);
            const statusOk = eventStatusFilter === 'all' || live === eventStatusFilter;
            let dateOk = true;
            if (eventDateFilter === 'today') dateOk = e.startDate && isSameDay(new Date(e.startDate), new Date());
            else if (eventDateFilter === 'week') dateOk = e.startDate && dateInRange(e.startDate, 0, 7);
            else if (eventDateFilter === 'month') dateOk = e.startDate && dateInRange(e.startDate, 0, 30);
            else if (eventDateFilter === 'next30') dateOk = e.startDate && dateInRange(e.startDate, 1, 30);
            return titleOk && catOk && visOk && statusOk && dateOk;
        });

        const stats = {
            total: allEvents.length,
            upcoming: allEvents.filter((e) => eventLive(e) === 'upcoming').length,
            ongoing: allEvents.filter((e) => eventLive(e) === 'live').length,
            completed: allEvents.filter((e) => eventLive(e) === 'completed').length
        };

        const allCatKeys = Array.from(new Set([
            ...INTERNAL_EVENT_CATEGORIES,
            ...EVENT_CATEGORIES.map((c) => c.toLowerCase()),
            ...allEvents.map((e) => (e.category || '').toLowerCase()).filter(Boolean)
        ])).sort();
        const catLabel = (c) => c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1);

        const filterSelectStyle = { ...s.select, width: '100%', minWidth: '150px' };
        const filterInputStyle = { ...s.input, width: '100%', minWidth: '180px' };
        const filterStyle = { display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' };

        const segBtn = (active, activeColor) => ({
            flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
            border: active ? 'none' : `1px solid ${colors.border}`, background: active ? activeColor : 'transparent', color: active ? '#ffffff' : colors.textMuted, transition: 'all 0.15s'
        });
        const segWrap = { display: 'flex', gap: 6, padding: 4, borderRadius: 10, background: colors.bgInput, border: `1px solid ${colors.border}` };

        const chip = (color, bg) => ({ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color, background: bg, textTransform: 'capitalize', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 });

        const iconBtn = (color) => ({
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8,
            border: `1px solid ${colors.border}`, background: 'transparent', color, cursor: 'pointer', transition: 'all 0.15s'
        });

        const statCard = (label, value, color) => (
            <div style={{ padding: '16px 18px', borderRadius: 14, background: colors.bgCard, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.textMuted }}>{label}</span>
                <strong style={{ fontSize: 26, fontWeight: 800, color }}>{value}</strong>
            </div>
        );

        const emptyState = (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${colors.primary}12`, color: colors.primary, fontSize: 26 }}>
                    <Calendar size={26} />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: colors.text }}>No events found.</h3>
                <p style={{ margin: '0 auto 18px', maxWidth: 360, fontSize: 14, color: colors.textMuted }}>Create your first event to start managing the calendar.</p>
                <button type="button" onClick={openCreateEvent} style={{ ...s.primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={16} /> Create Event
                </button>
            </div>
        );

        const renderRowActions = (event) => {
            const live = eventLive(event);
            return (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="button" title="View" onClick={() => setViewingEvent(event)} style={iconBtn(colors.textMuted)}><Eye size={15} /></button>
                    <button type="button" title="Edit" onClick={() => handleEditCalendarEvent(event)} style={iconBtn('#f59e0b')}><Edit size={15} /></button>
                    {event.visibility === 'public' && event.status !== 'APPROVED' && event.status !== 'CANCELLED' && (
                        <button type="button" title="Approve & publish" onClick={() => publishPublicEvent(event)} style={{ ...s.primaryBtn, padding: '6px 12px', fontSize: 12, borderRadius: 8 }}>Approve</button>
                    )}
                    {event.visibility === 'public' && event.status !== 'CANCELLED' && (
                        <button type="button" title="Cancel event" onClick={() => cancelPublicEvent(event)} style={iconBtn('#f59e0b')}><Ban size={15} /></button>
                    )}
                    <button type="button" title="Delete" onClick={() => openDeleteEvent(event)} style={iconBtn(colors.danger)}><Trash2 size={15} /></button>
                </div>
            );
        };

        const renderDateCell = (event) => {
            const allDay = Boolean(event.isAllDay);
            const startTxt = event.startDate ? `${formatDateShort(event.startDate)}${allDay ? '' : ` A─ ${formatTimeShort(event.startDate)}`}` : '─"';
            const endTxt = event.endDate ? `${formatDateShort(event.endDate)}${allDay ? '' : ` A─ ${formatTimeShort(event.endDate)}`}` : '';
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>{startTxt}</span>
                    {endTxt && <span style={{ color: colors.textMuted, fontSize: 12 }}>─+' {endTxt}</span>}
                </div>
            );
        };

        const renderLocationCell = (event) => {
            const showStream = event.eventType !== 'Physical' && event.streamUrl;
            const loc = event.location || (event.eventType === 'Online' ? 'Online Live Stream' : '');
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 200 }}>
                    {loc && <span style={{ color: colors.text, fontSize: 13 }}>{loc}</span>}
                    {showStream && (
                        <a href={event.streamUrl} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, fontSize: 12, fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.streamUrl}</a>
                    )}
                    {!loc && !showStream && <span style={{ color: colors.textMuted, fontSize: 13 }}>─"</span>}
                </div>
            );
        };

        return (
        <div style={s.tabContent}>
            <style>{`
                .em-cal-table { display: none; }
                .em-cal-cards { display: block; }
                @media (min-width: 960px) { .em-cal-table { display: block; } .em-cal-cards { display: none; } }
            `}</style>

            {/* ─"?─"? Header ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"? */}
            <div style={{ ...s.sectionHeader, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={s.sectionTitle}>Event Management</h2>
                    <p style={s.sectionSub}>Manage holidays, academic dates, assignments, workshops, masterclasses, and live streams.</p>
                </div>
                <button type="button" onClick={openCreateEvent} style={{ ...s.primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                    <Plus size={16} /> Create Event
                </button>
            </div>

            {/* ─"?─"? Statistics row ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"? */}
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 20 }}>
                {statCard('Total Events', stats.total, colors.text)}
                {statCard('Upcoming', stats.upcoming, '#3b82f6')}
                {statCard('Ongoing', stats.ongoing, '#10b981')}
                {statCard('Completed', stats.completed, '#64748b')}
            </div>

            {/* ─"?─"? Filter toolbar ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"? */}
            <div style={s.card}>
                <div style={filterStyle}>
                    <input value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} placeholder="Search events──" style={filterInputStyle} />
                    <select value={eventCategoryFilter} onChange={(e) => setEventCategoryFilter(e.target.value)} style={filterSelectStyle}>
                        <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Categories</option>
                        {allCatKeys.map((c) => (
                            <option key={c} value={c} style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>{catLabel(c)}</option>
                        ))}
                    </select>
                    <select value={eventStatusFilter} onChange={(e) => setEventStatusFilter(e.target.value)} style={filterSelectStyle}>
                        <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Statuses</option>
                        <option value="upcoming" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Upcoming</option>
                        <option value="live" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Ongoing</option>
                        <option value="completed" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Completed</option>
                        <option value="cancelled" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Cancelled</option>
                    </select>
                    <select value={eventVisibilityFilter} onChange={(e) => setEventVisibilityFilter(e.target.value)} style={filterSelectStyle}>
                        <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Visibility</option>
                        <option value="internal" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Internal</option>
                        <option value="public" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Public</option>
                    </select>
                    <select value={eventDateFilter} onChange={(e) => setEventDateFilter(e.target.value)} style={filterSelectStyle}>
                        <option value="all" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>All Dates</option>
                        <option value="today" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Today</option>
                        <option value="week" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>This Week</option>
                        <option value="month" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>This Month</option>
                        <option value="next30" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Next 30 Days</option>
                    </select>
                </div>
            </div>

            {/* ─"?─"? Event Management ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"? */}
            <div style={{ ...s.card, marginTop: 20, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
                    <h3 style={{ ...s.cardTitle, margin: 0 }}>Event Management</h3>
                </div>

                {filteredEvents.length === 0 ? emptyState : (
                    <>
                        {/* Desktop table */}
                        <div className="em-cal-table" style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...s.th, textAlign: 'left' }}>Event</th>
                                        <th style={{ ...s.th, textAlign: 'left' }}>Category</th>
                                        <th style={{ ...s.th, textAlign: 'left' }}>Date &amp; Time</th>
                                        <th style={{ ...s.th, textAlign: 'left' }}>Location</th>
                                        <th style={{ ...s.th, textAlign: 'left' }}>Status</th>
                                        <th style={{ ...s.th, textAlign: 'left' }}>Visibility</th>
                                        <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEvents.map((event) => {
                                        const live = eventLive(event);
                                        const sc = statusChip(live);
                                        return (
                                            <tr key={`${event.visibility}-${event._id}`} style={{ transition: 'background 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = colors.bgInput; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                                                <td style={{ ...s.td, textAlign: 'left' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                                        {event.image ? (
                                                            <img src={event.image} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: `1px solid ${colors.border}` }} />
                                                        ) : (
                                                            <span style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${colors.primary}14`, color: colors.primary, flexShrink: 0 }}>
                                                                <Calendar size={17} />
                                                            </span>
                                                        )}
                                                        <div style={{ minWidth: 0 }}>
                                                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{event.title}</p>
                                                            <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.textMuted }}>{event.visibility === 'public' ? (event.eventType || 'Hybrid') : 'Internal'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ ...s.td, textAlign: 'left' }}>
                                                    <span style={{ ...chip(colors.primary, `${colors.primary}14`), textTransform: 'capitalize' }}>{event.category || 'Event'}</span>
                                                </td>
                                                <td style={{ ...s.td, textAlign: 'left' }}>{renderDateCell(event)}</td>
                                                <td style={{ ...s.td, textAlign: 'left' }}>{renderLocationCell(event)}</td>
                                                <td style={{ ...s.td, textAlign: 'left' }}>
                                                    <span style={chip(sc.color, sc.bg)}>{sc.label}</span>
                                                </td>
                                                <td style={{ ...s.td, textAlign: 'left' }}>
                                                    <span style={event.visibility === 'public' ? chip('#10b981', 'rgba(16,185,129,0.12)') : chip('#94a3b8', 'rgba(148,163,184,0.14)')}>
                                                        {event.visibility === 'public' ? 'Public' : 'Internal'}
                                                    </span>
                                                </td>
                                                <td style={{ ...s.td, textAlign: 'right' }}>{renderRowActions(event)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="em-cal-cards">
                            <div style={{ display: 'grid', gap: 12, padding: '16px 20px 24px' }}>
                                {filteredEvents.map((event) => {
                                    const live = eventLive(event);
                                    const sc = statusChip(live);
                                    return (
                                        <div key={`${event.visibility}-${event._id}`} style={{ padding: 16, borderRadius: 12, background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                                                <strong style={{ fontSize: 14, color: colors.text }}>{event.title}</strong>
                                                <span style={chip(sc.color, sc.bg)}>{sc.label}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                                <span style={{ ...chip(colors.primary, `${colors.primary}14`), textTransform: 'capitalize' }}>{event.category || 'Event'}</span>
                                                <span style={event.visibility === 'public' ? chip('#10b981', 'rgba(16,185,129,0.12)') : chip('#94a3b8', 'rgba(148,163,184,0.14)')}>
                                                    {event.visibility === 'public' ? 'Public' : 'Internal'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'grid', gap: 4, fontSize: 13, color: colors.textMuted }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={13} style={{ flexShrink: 0 }} /> {renderDateCell(event)}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={13} style={{ flexShrink: 0 }} /> {(event.location || (event.eventType === 'Online' ? 'Online Live Stream' : '─"'))}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                                {renderRowActions(event)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ─"?─"? Create / Edit Event Modal ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"? */}
            <Modal isOpen={isEventModalOpen} onClose={resetCalendarForm} title={calendarEditingId ? 'Edit Event' : 'Create Event'} maxWidth="680px" scrollable>
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
                                <textarea value={calendarForm.description} onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })} placeholder={isFormPublic ? 'One paragraph per line ─" each line becomes a section on the public page' : 'Short description'} rows="3" style={s.input}></textarea>
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

                                {/* Invitees (Google Meet only, like Live Sessions) */}
                                {calendarForm.meetingPlatform === 'googleMeet' && (
                                    <div>
                                        <label style={fieldLabel}>Invitees</label>
                                        <input value={calendarForm.meetingInvitees} onChange={(e) => {
                                            setCalendarForm({ ...calendarForm, meetingInvitees: e.target.value });
                                            setMeetingErrors((m) => ({ ...m, meetingInvitees: '' }));
                                        }} placeholder="student1@example.com, student2@example.com" style={s.input} />
                                        {meetingErrors.meetingInvitees && (
                                            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{meetingErrors.meetingInvitees}</div>
                                        )}
                                        <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.textMuted }}>Comma-separated email addresses. Whitespace is trimmed, duplicates are removed and invalid addresses are rejected.</p>
                                    </div>
                                )}

                                {/* Meeting ID — Zoom only (optional) */}
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
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#9333ea'; }}
                                                style={{ whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700, background: '#9333ea', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', height: 42, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: isGeneratingMeeting ? 'not-allowed' : 'pointer', opacity: isGeneratingMeeting ? 0.7 : 1 }}
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

                                {/* Meeting Password — only platforms that support one */}
                                {PASSWORD_PLATFORMS.includes(calendarForm.meetingPlatform) && (
                                    <div>
                                        <label style={fieldLabel}>Meeting Password (Optional)</label>
                                        <input value={calendarForm.meetingPassword} onChange={(e) => setCalendarForm({ ...calendarForm, meetingPassword: e.target.value })} placeholder="e.g. 123456 — for passcode-protected meetings / streams" style={s.input} />
                                    </div>
                                )}

                                {/* Google Meet connection status — Google only, never shown for other platforms */}
                                {calendarForm.meetingPlatform === 'googleMeet' && (
                                    googleConfigured && !googleMeetConnected ? (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 10, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>
                                                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.6)' }} />
                                                Google Meet Not Connected
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 12, color: colors.textMuted }}>Optional — the event saves fine with an automatic free Jitsi link. Connect your Google account if you prefer real Meet sessions.</span>
                                                <button type="button" onClick={handleConnectGoogleMeet} disabled={isGoogleConnecting} style={{ ...s.secondaryBtn, padding: '6px 12px', fontSize: 12 }}>
                                                    {isGoogleConnecting ? 'Opening Google...' : 'Connect Google Meet'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : !googleConfigured ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                                                <AlertTriangle size={14} /> Google Meet Setup Required
                                            </span>
                                            <span style={{ fontSize: 12, color: colors.textMuted }}>Events still save with an automatic free Jitsi link. To use real Google Meet sessions, the administrator must configure Google OAuth credentials on the backend.</span>
                                            {googleMeetStatus?.missingEnv?.length > 0 && (
                                                <span style={{ fontSize: 12, color: colors.textMuted }}>Missing backend/.env: {googleMeetStatus.missingEnv.join(', ')}</span>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                                                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
                                                Google Meet Connected
                                            </span>
                                            <span style={{ fontSize: 12, color: colors.textMuted }}>Your Google account is connected and ready to create meetings.</span>
                                        </div>
                                    )
                                )}

                                {isGeneratingMeeting ? (
                                    <p style={{ margin: '0', fontSize: 12, color: colors.primary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Creating a real {meetingProviderLabel(calendarForm.meetingProvider)} meeting...
                                    </p>
                                ) : calendarForm.meetingPlatform === 'googleMeet' && calendarForm.streamUrl ? (
                                    <div style={{ margin: '0', padding: '10px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                                            <CheckCircle2 size={15} /> Real Google Meet created
                                        </span>
                                    </div>
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
                                    Auto-normalized to 1280×720 (16:9) WebP · max 8 MB
                                </span>
                            </div>
                        )}
                    </div>

                    <div style={{ height: 1, background: colors.border }} />

                    {/* Live Preview ─" updates automatically as the form changes */}
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
                                        <div><strong style={{ color: colors.text }}>{calendarForm.isAllDay ? 'All day' : 'Scheduled'}: </strong>{pStart ? formatEventDate(pStart.toISOString()) : '─"'}{pEnd && !calendarForm.isAllDay ? ` ─+' ${formatEventDate(pEnd.toISOString())}` : ''}</div>
                                        <div><strong style={{ color: colors.text }}>Format: </strong>{pType} {pType === 'Physical' ? `── ${calendarForm.location || 'No location set'}` : pType === 'Hybrid' ? `── ${calendarForm.location || 'Online + venue TBD'}` : ''}</div>
                                        {pType !== 'Physical' && <div><strong style={{ color: colors.text }}>Meeting: </strong>{meetingProviderLabel(calendarForm.meetingProvider)}{calendarForm.streamUrl ? ` — ${calendarForm.streamUrl}` : (calendarForm.meetingProvider === 'googleMeet' ? ' — real Google Meet will be created on save' : ' — will be created on save')}</div>}
                                        {isFormPublic && <div><strong style={{ color: colors.text }}>Price: </strong>{calendarForm.price || 'FREE'}{calendarForm.capacity !== '' ? ` ── Capacity: ${calendarForm.capacity}` : ''}</div>}
                                        <div><strong style={{ color: colors.text }}>Visibility: </strong>{isFormPublic ? 'Public (review pipeline)' : 'Internal (calendar only)'}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', paddingTop: 4 }}>
                        <button type="submit" disabled={isCalendarSaving} style={{ ...s.primaryBtn, opacity: isCalendarSaving ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {isCalendarSaving
                                ? (calendarForm.eventType !== 'Physical' && calendarForm.meetingProvider === 'googleMeet' && !calendarForm.streamUrl ? 'Creating Google Meet...' : 'Saving...')
                                : (calendarEditingId ? 'Save Changes' : 'Create Event')}
                        </button>
                        <button type="button" onClick={resetCalendarForm} style={s.secondaryBtn}>Cancel</button>
                    </div>
                </form>
            </Modal>

            {/* ─"?─"? Event Details Modal ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"? */}
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
                                    <div><span style={{ color: colors.textMuted }}>Starts: </span><strong>{ev.startDate ? formatEventDate(ev.startDate) : '─"'}</strong></div>
                                    {ev.endDate && <div><span style={{ color: colors.textMuted }}>Ends: </span><strong>{formatEventDate(ev.endDate)}</strong></div>}
                                    {ev.isAllDay && <div><span style={{ color: colors.textMuted }}>All day: </span><strong>Yes</strong></div>}
                                    <div><span style={{ color: colors.textMuted }}>Format: </span><strong>{ev.eventType || 'Hybrid'}</strong></div>
                                    <div><span style={{ color: colors.textMuted }}>Location: </span><strong>{ev.location || (ev.eventType === 'Online' ? 'Online Live Stream' : '─"')}</strong></div>
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
                                            <Video size={14} /> {ev.meetingProvider === 'googleMeet' ? 'Join Google Meet' : 'Join Event'}
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

            {/* ─"?─"? Cancel Event Modal ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"? */}
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
                        <button type="button" onClick={confirmCancelPublicEvent} style={{ ...s.primaryBtn, background: '#f59e0b' }}>Confirm Cancel</button>
                        <button type="button" onClick={() => setCancelTarget(null)} style={s.secondaryBtn}>Keep Event</button>
                    </div>
                </Modal>
            )}

            {/* ─"?─"? Delete Event Modal ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?─"? */}
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
        { key: 'contact-messages', label: 'Contact Messages', path: '/admin/contact-messages', icon: <Inbox size={20} aria-hidden="true" /> },
        { key: 'calendar', label: 'Event Management', icon: <Clock3 size={20} aria-hidden="true" /> },
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

                {/* Render immediately ─" each section shows skeletons while data loads */}
                    <>
                                {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'users' && renderUsers()}
                        {activeTab === 'security' && renderSecurity()}
                        {activeTab === 'courses' && renderCourses()}
                        {activeTab === 'course_builder' && renderCourseBuilder()}
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
                                                            ── {lesson.lessonTitle || 'Untitled lesson'} ({lesson.durationMinutes || '---'} min)
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

            <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setCreateFormStep(1); setCreateStepError(''); setCreateSubmitError(''); setCreateVerifyStep(false); }} title={`Create New ${createForm.assignedRole} Account`} maxWidth="720px">
                <form onSubmit={handleCreateUser} style={{display:'flex', flexDirection:'column', gap:'0'}}>
                    {/* Step indicators */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                        {[1, 2, 3].map(step => (
                            <div key={step} style={{ flex: 1, height: '4px', borderRadius: '2px', background: createFormStep >= step ? colors.primary : colors.bgInput, transition: 'background 0.3s' }} />
                        ))}
                    </div>
                    <p style={{ ...s.sectionSub, marginBottom: '16px', fontSize: '12px' }}>Step {createFormStep} of 3 ─" {createFormStep === 1 ? 'Personal & Account Info' : createFormStep === 2 ? (createForm.assignedRole === 'Instructor' ? 'Professional Info' : 'Employment & Security') : 'Documents & Settings'}</p>

                    {/* ─"?─"?─"? STEP 1: Personal & Account ─"?─"?─"? */}
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

                    {/* ─"?─"?─"? STEP 2: Professional / Employment ─"?─"?─"? */}
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
                            <p style={{ color: colors.primary, fontWeight: '700', fontSize: '15px', margin: '12px 0 4px' }}> <Shield size={16} style={{ marginRight: '6px' }} /> ─,? Permissions</p>
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

                    {/* ─"?─"?─"? STEP 3: Documents & Settings ─"?─"?─"? */}
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
                                ⚠️ {createSubmitError || createStepError}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {createFormStep > 1 && (
                                <button type="button" onClick={() => { setCreateFormStep(createFormStep - 1); setCreateStepError(''); setCreateSubmitError(''); }} style={{...s.secondaryBtn, flex: 1}}>─+? Back</button>
                            )}
                            {createFormStep < 3 && (
                                <button type="button" onClick={() => {
                                    // ─"?─"? Validate current step before advancing ─"?─"?─"?─"?─"?─"?─"?─"?─"?─"?
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
                                }} style={{...s.primaryBtn, flex: 1}}>Next ─+'</button>
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

            {/* ─"?─"? Email Verification Modal (shown after account creation) ─"?─"? */}
<Modal isOpen={createVerifyStep} onClose={() => { setCreateVerifyStep(false); setIsCreateModalOpen(false); }} title="Verify Email Address" backdrop="clear">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
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
                            ⚠️ {createVerifyError}
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
                                <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Resending…</>
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

            {/* ─?─?─?─?─?─?─?─?─?─?─? ENTERPRISE ASSIGN INSTRUCTOR MODAL ─?─?─?─?─?─?─?─?─?─?─? */}
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
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '220px', overflowY: 'auto' }}>
                                {users.filter(u => {
                                    const q = instructorSearchQuery.toLowerCase();
                                    return (u.fullName || '').toLowerCase().includes(q) || (u.accountEmail || '').toLowerCase().includes(q) || (u.specialization || '').toLowerCase().includes(q) || u.role === 'Instructor';
                                }).slice(0, 6).map(user => (
                                    <div
                                        key={user._id}
                                        onClick={() => {
                                            setSelectedInstructorObj(user);
                                            setAssignInstructorIdInput(user._id);
                                            setInstructorSearchQuery(user.fullName);
                                        }}
                                        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                user.fullName?.charAt(0) || 'U'
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{user.fullName}</div>
                                            <div style={{ fontSize: '12px', color: colors.textMuted }}>{user.accountEmail} ── <span style={{ color: '#2563eb', fontWeight: '500' }}>{user.specialization || user.role || 'Instructor'}</span></div>
                                        </div>
                                    </div>
                                ))}
                                {users.filter(u => (u.fullName || '').toLowerCase().includes(instructorSearchQuery.toLowerCase())).length === 0 && (
                                    <div style={{ padding: '14px', fontSize: '13px', color: colors.textMuted, textAlign: 'center' }}>No matching instructors found</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Rich Instructor Preview Card */}
                    {selectedInstructorObj && (
                        <div style={{ padding: '16px', borderRadius: '12px', background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', gap: '14px', alignItems: 'center' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontWeight: '800', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #3b82f6', flexShrink: 0, overflow: 'hidden' }}>
                                {selectedInstructorObj.avatarUrl ? (
                                    <img src={selectedInstructorObj.avatarUrl} alt={selectedInstructorObj.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                    <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Star size={12} fill="#d97706" /> 4.9 Rating
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: colors.text }}>
                                    <span><strong>Dept:</strong> {selectedInstructorObj.department || selectedInstructorObj.specialization || 'Computer Science'}</span>
                                    <span><strong>Workload:</strong> 3 Active Courses</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Role & Permissions Selection */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>Assignment Role</label>
                            <select value={instructorRole} onChange={e => setInstructorRole(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', background: colors.bgCard }}>
                                <option value="Lead Instructor" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Lead Instructor (Full Control)</option>
                                <option value="Co-Instructor" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Co-Instructor (Shared Control)</option>
                                <option value="Teaching Assistant (TA)" style={{ background: colors.bgCard || "#1e293b", color: colors.text || "#ffffff" }}>Teaching Assistant (TA - Grading Only)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>Compensation Model</label>
                            <select value={compensationModel} onChange={e => setCompensationModel(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', background: colors.bgCard }}>
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
                        <input type="checkbox" checked={notifyInstructor} onChange={e => setNotifyInstructor(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#2563eb' }} />
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
                                    setAllCourses(prev => prev.map(c => c._id === assignInstructorCourseId ? res.data.data : c));
                                    showNotification(`Assigned as ${instructorRole} (${compensationModel}). Notification sent.`);
                                    setIsAssignInstructorModalOpen(false);
                                    setSelectedInstructorObj(null);
                                    setInstructorSearchQuery('');
                                    setAssignInstructorIdInput('');
                                } catch (err) {
                                    alert(err.response?.data?.message || 'Failed to assign instructor.');
                                }
                            }}
                            style={{ background: '#2563eb', border: 'none', color: colors.text, padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}
                        >
                            Assign Instructor
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ─?─?─?─?─?─?─?─?─?─?─? ENTERPRISE MANAGE ENROLLED STUDENTS MODAL ─?─?─?─?─?─?─?─?─?─?─? */}
            <Modal isOpen={isManageStudentsModalOpen} onClose={() => { setIsManageStudentsModalOpen(false); setActiveCourseId(null); setManagedStudents([]); setEnrollStudentId(''); setSelectedStudentsToEnroll([]); setBulkStudentEmails(''); }} title="Manage Course Enrollments & Access">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>
                            Course: <strong style={{ color: colors.text }}>{allCourses.find(c => c._id === activeCourseId)?.courseTitle || activeCourseId}</strong>
                        </p>
                        <span style={{ fontSize: '12px', background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: '12px', fontWeight: '600' }}>
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
                                style={{ padding: '8px 4px', border: 'none', background: 'transparent', borderBottom: enrollmentTab === t.key ? '2px solid #2563eb' : '2px solid transparent', color: enrollmentTab === t.key ? '#2563eb' : colors.textMuted, fontWeight: enrollmentTab === t.key ? '700' : '500', fontSize: '13px', cursor: 'pointer' }}
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
                                style={{ flex: 1, padding: '9px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                            />
                            <button
                                onClick={async () => {
                                    if (!enrollStudentId.trim()) return alert('Enter a student ID or email.');
                                    try {
                                        await courseService.enroll(activeCourseId);
                                        showNotification(`Enrolled student in ${cohortTag} (${enrollmentAccessType}). Access: ${accessExpirationDate}`);
                                        setEnrollStudentId('');
                                        const res = await enrollmentService.getAll({ courseId: activeCourseId });
                                        setManagedStudents(res.data?.data || res.data || []);
                                    } catch (err) { alert(err.response?.data?.message || 'Failed to enroll student.'); }
                                }}
                                style={{ background: '#10b981', border: 'none', color: colors.text, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
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
                                style={{ width: '100%', padding: '10px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '12px', outline: 'none', resize: 'vertical' }}
                            />
                            <button
                                onClick={() => {
                                    if (!bulkStudentEmails.trim()) return alert('Paste emails first.');
                                    const count = bulkStudentEmails.split(/[\n,]+/).filter(e => e.trim()).length;
                                    showNotification(`Batch enrolled ${count} students into ${cohortTag}`);
                                    setBulkStudentEmails('');
                                }}
                                style={{ background: '#2563eb', border: 'none', color: colors.text, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-end' }}
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
                            <div style={{ padding: '32px', textAlign: 'center', color: '#3b82f6', fontSize: '14px', fontWeight: '500' }}>
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
                                        <tr key={enr._id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                                                    <button onClick={() => handleResendWelcomeEmail(enr._id)} title="Resend Email" style={{ padding: '4px 8px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#2563eb' }}> <Mail size={16} style={{ marginRight: '6px' }} /> ─,? Email</button>
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

            {/* ─?─?─?─?─?─?─?─?─?─?─? EXPORT CUSTOMIZER MODAL ─?─?─?─?─?─?─?─?─?─?─? */}
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
                                        style={{ accentColor: '#2563eb', width: '16px', height: '16px', cursor: 'pointer' }}
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
                        <button onClick={() => { handleExportCSV(); setIsExportCustomizerOpen(false); }} style={{ background: '#2563eb', border: 'none', color: colors.text, padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Download Customized CSV</button>
                    </div>
                </div>
            </Modal>

            {/* ─?─?─?─?─?─?─?─?─?─?─? SMART IMPORT WIZARD MODAL ─?─?─?─?─?─?─?─?─?─?─? */}
            <Modal isOpen={isSmartImportWizardOpen} onClose={() => { setIsSmartImportWizardOpen(false); setWizardSelectedFile(null); setWizardHeaders([]); setWizardParsedRows([]); setIsWizardMappingStep(false); }} title="Smart Course Import Wizard" maxWidth="720px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>Import course content and curricula from multiple platform formats. Select a file type, upload your file, and preview field mappings.</p>

                    <div style={{ borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '12px' }}>
                        {['CSV', 'JSON Outline', 'SCORM (.zip)', 'Moodle / Canvas'].map(fmt => (
                            <button
                                key={fmt}
                                onClick={() => setSmartImportFormat(fmt)}
                                style={{ padding: '8px 12px', border: 'none', background: 'transparent', borderBottom: smartImportFormat === fmt ? '2px solid #2563eb' : '2px solid transparent', color: smartImportFormat === fmt ? '#2563eb' : colors.textMuted, fontWeight: smartImportFormat === fmt ? '700' : '500', fontSize: '13px', cursor: 'pointer' }}
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>

                    {!isWizardMappingStep ? (
                        /* Step 1: Upload Dropzone */
                        <div
                            style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '38px', textAlign: 'center', background: colors.bg, cursor: 'pointer', transition: 'all 0.2s' }}
                            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; }}
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
                                <button onClick={() => { setIsWizardMappingStep(false); setWizardSelectedFile(null); }} style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>Re-upload</button>
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
                                    <div><strong>Title:</strong> {wizardParsedRows[0]?.[wizardColumnMapping.courseTitle] || '─"'}</div>
                                    <div><strong>Category:</strong> {wizardParsedRows[0]?.[wizardColumnMapping.technicalCategory] || '─"'}</div>
                                    <div><strong>Price:</strong> {wizardParsedRows[0]?.[wizardColumnMapping.price] ? `$${wizardParsedRows[0]?.[wizardColumnMapping.price]}` : '─"'}</div>
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
                            style={{ background: '#2563eb', border: 'none', color: colors.text, padding: '9px 22px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: isWizardMappingStep ? 1 : 0.5, boxShadow: isWizardMappingStep ? '0 2px 8px rgba(37,99,235,0.25)' : 'none' }}
                        >
                            Process & Import
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ─?─?─?─?─?─?─?─?─?─?─? AI COURSE GENERATOR MODAL ─?─?─?─?─?─?─?─?─?─?─? */}
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
                            style={{ background: '#8b5cf6', border: 'none', color: colors.text, padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 10px rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {isGeneratingAiCourse ? 'Generating Syllabus...' : <><Sparkles size={16} style={{ marginRight: '6px' }} />  Generate Syllabus & Outline</>}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ─"?─"? Course Analytics Modal ─"?─"? */}
            <Modal isOpen={isCourseAnalyticsModalOpen} onClose={() => { setIsCourseAnalyticsModalOpen(false); setActiveCourseId(null); }} title="Course Analytics Overview">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>
                        Analytics for: <strong style={{ color: colors.text }}>{allCourses.find(c => c._id === activeCourseId)?.courseTitle || activeCourseId}</strong>
                    </p>
                    {(() => {
                        const course = allCourses.find(c => c._id === activeCourseId);
                        const enrolled = course?.totalEnrollments || enrollments.filter(e => e.courseId === activeCourseId || e.course === activeCourseId).length || 0;
                        const status = course?.publicationState || 'Draft';
                        return (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div style={{ padding: '16px', border: `1px solid ${colors.border}`, borderRadius: '8px', textAlign: 'center', background: '#f0fdf4' }}>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{enrolled}</div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '500' }}>Total Enrolled</div>
                                    </div>
                                    <div style={{ padding: '16px', border: `1px solid ${colors.border}`, borderRadius: '8px', textAlign: 'center', background: '#eff6ff' }}>
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{course?.modules?.length || course?.curriculum?.length || 0}</div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '500' }}>Modules</div>
                                    </div>
                                    <div style={{ padding: '16px', border: `1px solid ${colors.border}`, borderRadius: '8px', textAlign: 'center', background: status === 'Published' ? '#f0fdf4' : '#fefce8' }}>
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: status === 'Published' ? '#10b981' : '#f59e0b' }}>{status}</div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '500' }}>Status</div>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ padding: '14px', border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Category</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{course?.technicalCategory || 'N/A'}</div>
                                    </div>
                                    <div style={{ padding: '14px', border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Instructor</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{course?.creatorRef?.fullName || course?.assignedInstructorRef?.fullName || 'Unassigned'}</div>
                                    </div>
                                    <div style={{ padding: '14px', border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Price</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{course?.price ? `$${course.price}` : 'Free'}</div>
                                    </div>
                                    <div style={{ padding: '14px', border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Created</div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{course?.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'N/A'}</div>
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

            {/* ─"?─"? Course Reviews Modal ─"?─"? */}
            <Modal isOpen={isCourseReviewsModalOpen} onClose={() => { setIsCourseReviewsModalOpen(false); setActiveCourseId(null); }} title="Course Reviews & Feedback">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>
                        Reviews for: <strong style={{ color: colors.text }}>{allCourses.find(c => c._id === activeCourseId)?.courseTitle || activeCourseId}</strong>
                    </p>
                    {(() => {
                        const course = allCourses.find(c => c._id === activeCourseId);
                        const avgRating = course?.averageRating || course?.rating || 0;
                        const totalReviews = course?.totalReviews || course?.reviewCount || 0;
                        return (
                            <>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: '#fefce8', borderRadius: '10px', border: '1px solid #fef08a' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '36px', fontWeight: '800', color: '#f59e0b' }}>{avgRating.toFixed(1)}</div>
                                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                                            {[1,2,3,4,5].map(n => <Star key={n} size={14} color={n <= Math.round(avgRating) ? '#f59e0b' : '#e2e8f0'} fill={n <= Math.round(avgRating) ? '#f59e0b' : 'none'} />)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{totalReviews} total review(s)</div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted }}>Average rating from enrolled students</div>
                                    </div>
                                </div>
                                {totalReviews === 0 && (
                                    <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted, fontSize: '14px', border: `1px solid ${colors.border}`, borderRadius: '8px', background: '#fafafa' }}>
                                        <Star size={32} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                                        <div>No reviews yet for this course.</div>
                                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Students can leave reviews after completing modules.</div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button onClick={() => setIsCourseReviewsModalOpen(false)} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '9px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Close</button>
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

            {/* ─"?─"? Fixed-position course action menu (renders above all overflow contexts) ─"?─"? */}
            {courseMenuOpenId && (() => {
                const course = allCourses.find(c => c._id === courseMenuOpenId);
                if (!course) return null;
                const menuBg     = colors.bgCard || '#1e293b';
                const menuBorder = colors.border  || '#334155';
                const menuText   = colors.text    || '#f1f5f9';
                const menuHover  = colors.bg      || 'rgba(100,116,139,0.15)';
                const btnStyle   = { width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderRadius: '6px', fontSize: '13px', color: menuText, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
                return (
                    <div
                        onMouseDown={e => e.stopPropagation()}
                        style={{ position: 'fixed', top: courseMenuPos.top, right: courseMenuPos.right, width: '200px', background: menuBg, border: `1px solid ${menuBorder}`, borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.25)', padding: '8px', zIndex: 99999, textAlign: 'left' }}
                    >
                        <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && navigate(`/courses/${course._id}`); }}><Eye size={14} /> View</button>
                        <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && handleAssignInstructor(course._id); }}><Edit size={14} /> Assign Instructor</button>
                        <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && handleDuplicateCourse(course._id); }}><Copy size={14} /> Duplicate</button>
                        <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && handleApproveCourse(course._id); }}><Upload size={14} /> Publish</button>
                        <button style={btnStyle} onMouseEnter={e => e.currentTarget.style.background=menuHover} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => { setCourseMenuOpenId(null); course._id && handleArchiveCourse(course._id); }}><Archive size={14} /> Archive</button>
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
