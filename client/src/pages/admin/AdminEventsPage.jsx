import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    Calendar,
    CalendarDays,
    CheckCircle2,
    Check,
    Clock,
    Copy,
    ExternalLink,
    Eye,
    Globe,
    Lock,
    MapPin,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    Users,
    Video,
    Wand2,
    X,
    XCircle,
    Loader2,
    Send,
    Ban,
    UploadCloud,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import EventFooter from '../../components/events/EventFooter';
import Modal from '../../components/Modal';
import { useTheme } from '../../context/ThemeContext';
import { eventService, calendarService, uploadService } from '../../services/api';
import { EVENT_CATEGORIES, getLiveStatus, isValidUrl } from '../../utils/eventStatus';

const getInputCls = (isDark) =>
    isDark
        ? 'w-full rounded-xl border border-slate-600/40 bg-[#151a2c] px-4 py-3 text-sm text-white placeholder-gray-500 transition focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none'
        : 'w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-500/30 focus:outline-none';

// ── Status meta (badge colors) ─────────────────────────────
const STATUS_META = {
    PENDING_REVIEW: { label: 'Pending Review', pill: 'bg-amber-400/15 text-amber-300 border-amber-400/40', dot: 'bg-amber-400' },
    APPROVED: { label: 'Published', pill: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40', dot: 'bg-emerald-400' },
    REJECTED: { label: 'Rejected', pill: 'bg-red-400/15 text-red-300 border-red-400/40', dot: 'bg-red-400' },
    DRAFT: { label: 'Draft', pill: 'bg-white/5 text-gray-300 border-white/10', dot: 'bg-gray-400' },
    CANCELLED: { label: 'Cancelled', pill: 'bg-red-400/15 text-red-300 border-red-400/40', dot: 'bg-red-400' },
};

// ── Live-status badge colors (auto-derived from time) ───────
const LIVE_PILL = {
    upcoming: 'bg-sky-400/15 text-sky-300 border-sky-400/40',
    live: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40',
    completed: 'bg-white/5 text-gray-300 border-white/10',
    cancelled: 'bg-red-400/15 text-red-300 border-red-400/40',
};
const LIVE_LABEL = { upcoming: 'Upcoming', live: 'Live Now', completed: 'Completed', cancelled: 'Cancelled' };

// ── Client mirror of the backend validation engine ─────────
const toMin = (t) => {
    const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\/.+/i.test(v.trim());

const computeValidationChecks = (event) => {
    const checks = [];
    const push = (key, label, passed, message) => checks.push({ key, label, passed, critical: true, message });
    const u = event.submittedBy && typeof event.submittedBy === 'object' ? event.submittedBy : null;

    const titleOk = typeof event.title === 'string' && event.title.trim().length >= 10;
    const descOk = Array.isArray(event.description) && event.description.length > 0;
    push('titleDescription', 'Title & Description', titleOk && descOk,
        titleOk && descOk ? 'Title is descriptive and full description provided.' : 'Title must be ≥10 characters with a full description.');

    const startFuture = event.startDate && new Date(event.startDate).getTime() > Date.now();
    const sMin = toMin(event.startTime);
    const eMin = toMin(event.endTime);
    push('schedule', 'Date & Time Schedule', Boolean(startFuture) && sMin !== null && eMin !== null && eMin > sMin,
        !startFuture ? 'Start date must be in the future.' : 'End time must be after start time.');

    const capacityOk = Number(event.totalSlots) > 0;
    push('capacity', 'Capacity & Seats', capacityOk, capacityOk ? 'Capacity is set above zero.' : 'totalSlots must be greater than 0.');

    const hasVenue = typeof event.venue === 'string' && event.venue.trim().length > 0;
    const hasStream = isHttpUrl(event.streamUrl);
    const needsVenue = event.eventType !== 'Online';
    const needsStream = event.eventType !== 'Physical';
    const locationOk = (!needsVenue || hasVenue) && (!needsStream || hasStream);
    push('locationOrStream', 'Location / Stream Link', locationOk,
        locationOk ? 'Venue and/or live stream link provided.' : 'Venue or valid live-stream URL required.');

    const instructorOk = Boolean(u) && u.isActive !== false && ['Instructor', 'Admin'].includes(u.assignedRole);
    push('instructorVerified', 'Instructor Verification', instructorOk,
        instructorOk ? 'Submitted by a verified active instructor.' : 'A valid active instructor profile must be attached.');

    const coverOk = typeof event.image === 'string' && event.image.trim().length > 0;
    push('coverImage', 'Cover Image & Banner', coverOk, coverOk ? 'High-resolution cover image attached.' : 'Cover image is missing.');

    return { passed: checks.every((c) => c.passed), checks };
};

const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const toDateInput = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// ── Small toast stack (no external library) ────────────────
function useToasts() {
    const [toasts, setToasts] = useState([]);
    const pushToast = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random();
        setToasts((t) => [...t, { id, message, type }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    }, []);
    return { toasts, pushToast };
}

const TOAST_STYLE = {
    success: { border: 'border-emerald-400/40', icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> },
    error: { border: 'border-red-400/40', icon: <XCircle className="h-4 w-4 text-red-400" /> },
    info: { border: 'border-green-500/40', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
};

const TABS = [
    { key: 'all', label: 'All Events' },
    { key: 'PENDING_REVIEW', label: 'Pending Review' },
    { key: 'APPROVED', label: 'Published' },
    { key: 'REJECTED', label: 'Rejected' },
];

const EMPTY_FORM = {
    title: '',
    tagline: '',
    eventType: 'Physical',
    venue: '',
    city: '',
    streamUrl: '',
    startDate: '',
    startTime: '15:00',
    endTime: '18:30',
    price: 'FREE',
    totalSlots: 0,
    image: '',
    status: 'DRAFT',
    isFeatured: false,
    descriptionText: '',
};

// ── Meeting platform / provider helpers (ported from AdminDashboard) ──
const MEETING_PLATFORMS = [
    { value: 'zoom',       label: 'Zoom' },
    { value: 'microsoftTeams', label: 'Microsoft Teams' },
    { value: 'jitsi',      label: 'Jitsi Meet' },
    { value: 'custom',     label: 'Custom Meeting Link' },
    { value: 'youtubeLive',label: 'YouTube Live' },
    { value: 'rtmp',       label: 'Custom RTMP / Web Stream' },
];
const platformToProvider = { zoom: 'zoom', microsoftTeams: 'microsoftTeams', jitsi: 'jitsi', custom: 'custom', youtubeLive: 'custom', rtmp: 'custom' };
const meetingProviderLabel = (v) => ({ zoom: 'Zoom', microsoftTeams: 'Microsoft Teams', jitsi: 'Jitsi Meet', internal: 'Internal Join Link', custom: 'Manual URL' }[v] || 'Internal Join Link');
// Platforms where the "Generate Meeting Link" button is available (backend integration or local Jitsi).
const GENERATABLE_PLATFORMS = ['zoom', 'microsoftTeams', 'jitsi'];
// Platforms that support a meeting password in the form.
const PASSWORD_PLATFORMS = ['zoom', 'custom', 'youtubeLive', 'rtmp'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const parseInviteesInput = (value) => {
    if (!value) return [];
    return String(value)
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
};
const normalizeInviteesInput = (value) => {
    const seen = new Set();
    const list = [];
    const invalid = [];
    parseInviteesInput(value).forEach((email) => {
        const e = email.toLowerCase();
        if (!EMAIL_PATTERN.test(e)) { invalid.push(email); return; }
        if (seen.has(e)) return;
        seen.add(e);
        list.push(e);
    });
    return { list, invalid };
};
const getDefaultMeetingLink = (platform, title) => {
    const slug = (title || 'emare-meeting').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'emare-meeting';
    if (platform === 'jitsi') return `https://meet.jit.si/${slug}`;
    return null;
};
const combineDateAndTime = (dateStr, timeStr) => {
    if (!dateStr) return null;
    const d = new Date(`${dateStr}T${timeStr || '00:00'}`);
    return Number.isNaN(d.getTime()) ? null : d;
};
const copyToClipboard = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
        const ta = document.createElement('textarea'); ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
        let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
        document.body.removeChild(ta); return ok;
    }
};

const INTERNAL_EVENT_CATEGORIES = ['Academic', 'Training', 'Holiday', 'Workshop', 'Masterclass', 'Webinar'];

const EMPTY_CREATE_FORM = {
    title: '',
    category: 'Masterclass',
    description: '',
    startDate: '',
    startTime: '10:00',
    endDate: '',
    endTime: '11:00',
    isAllDay: false,
    location: '',
    eventType: 'Online',
    streamUrl: '',
    meetingPlatform: 'zoom',
    meetingProvider: 'zoom',
    meetingInvitees: '',
    meetingId: '',
    meetingPassword: '',
    visibility: 'public',
    // public-event extras
    eventStatus: 'SCHEDULED',
    price: 'FREE',
    capacity: 50,
    bannerImage: '',
    enableRegistration: true,
    eventCategory: 'Masterclass',
};

export default function AdminEventsPage() {
    const { theme, colors } = useTheme();
    const isDark = theme === 'dark';
    const inputCls = getInputCls(isDark);
    const location = useLocation();
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [visibilityFilter, setVisibilityFilter] = useState('all');
    const [busy, setBusy] = useState({});

    // delete / cancel confirms
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelReason, setCancelReason] = useState('');

    // inspect drawer
    const [inspected, setInspected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [rejectionNote, setRejectionNote] = useState('');

    // edit modal
    const [editTarget, setEditTarget] = useState(null);
    const [editForm, setEditForm] = useState(EMPTY_FORM);
    const [editOpen, setEditOpen] = useState(false);
    const [editSaving, setEditSaving] = useState(false);

    // create modal
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
    const [createSaving, setCreateSaving] = useState(false);
    const [meetingGenerating, setMeetingGenerating] = useState(false);
    const [createFormError, setCreateFormError] = useState('');
    const [meetingErrors, setMeetingErrors] = useState({});
    const [bannerUploading, setBannerUploading] = useState(false);
    const [bannerUploadError, setBannerUploadError] = useState('');

    const { toasts, pushToast } = useToasts();

    const loadEvents = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await eventService.getAll();
            setEvents(res.data?.data || []);
        } catch (err) {
            setLoadError(err.response?.data?.message || 'Unable to load events.');
            setEvents([]);
            pushToast(err.response?.data?.message || 'Failed to load events.', 'error');
        } finally {
            setLoading(false);
        }
    }, [pushToast]);

    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const res = await eventService.getStats();
            setStats(res.data?.data || null);
        } catch {
            setStats(null);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();
        loadStats();
    }, [loadEvents, loadStats]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return events.filter((e) => {
            const matchesTab = activeTab === 'all' || e.status === activeTab;
            if (!matchesTab) return false;
            if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
            if (visibilityFilter !== 'all' && (e.visibility || 'public') !== visibilityFilter) return false;
            if (!q) return true;
            const instructorName = e.submittedBy?.fullName || '';
            const instructorEmail = e.submittedBy?.accountEmail || '';
            return (
                e.title.toLowerCase().includes(q) ||
                e.venue.toLowerCase().includes(q) ||
                instructorName.toLowerCase().includes(q) ||
                instructorEmail.toLowerCase().includes(q)
            );
        });
    }, [events, activeTab, search, categoryFilter, visibilityFilter]);

    const checks = useMemo(
        () => (inspected ? computeValidationChecks(inspected) : { passed: false, checks: [] }),
        [inspected]
    );

    const openInspect = (event) => {
        setInspected(event);
        setRejectionNote(event.reviewNote || '');
        setDrawerOpen(true);
    };

    const patchEvent = (id, patch) => {
        setEvents((prev) => prev.map((e) => (e._id === id ? { ...e, ...patch } : e)));
        if (inspected?._id === id) setInspected((prev) => ({ ...prev, ...patch }));
    };

    const handleApprove = async (event) => {
        setBusy((b) => ({ ...b, [event._id]: 'approve' }));
        try {
            await eventService.setStatus(event._id, { status: 'APPROVED' });
            patchEvent(event._id, { status: 'APPROVED', reviewNote: '', reviewedAt: new Date().toISOString(), publishedAt: new Date().toISOString() });
            pushToast(`"${event.title}" is now live on the public site.`);
            setDrawerOpen(false);
            loadStats();
        } catch (err) {
            pushToast(err.response?.data?.message || 'Approval failed — validation checks not met.', 'error');
        } finally {
            setBusy((b) => { const n = { ...b }; delete n[event._id]; return n; });
        }
    };

    const handleReject = async (event, note) => {
        setBusy((b) => ({ ...b, [event._id]: 'reject' }));
        try {
            await eventService.setStatus(event._id, { status: 'REJECTED', rejectionReason: note });
            patchEvent(event._id, { status: 'REJECTED', reviewNote: note, reviewedAt: new Date().toISOString() });
            pushToast('Event rejected and returned to the instructor with feedback.', 'info');
            setDrawerOpen(false);
            loadStats();
        } catch (err) {
            pushToast(err.response?.data?.message || 'Failed to reject event.', 'error');
        } finally {
            setBusy((b) => { const n = { ...b }; delete n[event._id]; return n; });
        }
    };

    const openEdit = (event) => {
        setEditTarget(event);
        setEditForm({
            title: event.title || '',
            tagline: event.tagline || '',
            eventType: event.eventType || 'Physical',
            venue: event.venue || '',
            city: event.city || '',
            streamUrl: event.streamUrl || '',
            startDate: event.startDate ? toDateInput(event.startDate) : '',
            startTime: event.startTime || '15:00',
            endTime: event.endTime || '18:30',
            price: event.price || 'FREE',
            totalSlots: event.totalSlots || 0,
            image: event.image || '',
            status: event.status || 'DRAFT',
            isFeatured: Boolean(event.isFeatured),
            descriptionText: Array.isArray(event.description) ? event.description.join('\n') : '',
        });
        setEditOpen(true);
    };

    const handleSaveEdit = async () => {
        setEditSaving(true);
        try {
            const payload = {
                ...editForm,
                description: editForm.descriptionText.split('\n').map((p) => p.trim()).filter(Boolean),
            };
            const res = await eventService.update(editTarget._id, payload);
            const updated = res.data?.data;
            setEvents((prev) => prev.map((e) => (e._id === editTarget._id ? updated : e)));
            if (inspected?._id === editTarget._id) setInspected(updated);
            pushToast('Event details updated.');
            setEditOpen(false);
        } catch (err) {
            pushToast(err.response?.data?.message || 'Failed to update event.', 'error');
        } finally {
            setEditSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const event = deleteTarget;
        setBusy((b) => ({ ...b, [event._id]: 'delete' }));
        try {
            await eventService.remove(event._id);
            setEvents((prev) => prev.filter((e) => e._id !== event._id));
            setDrawerOpen(false);
            setDeleteTarget(null);
            pushToast('Event deleted.', 'info');
            loadStats();
        } catch (err) {
            pushToast(err.response?.data?.message || 'Failed to delete event.', 'error');
        } finally {
            setBusy((b) => { const n = { ...b }; delete n[event._id]; return n; });
            setDeleteTarget(null);
        }
    };

    const confirmCancel = async () => {
        if (!cancelTarget) return;
        const event = cancelTarget;
        setBusy((b) => ({ ...b, [event._id]: 'cancel' }));
        try {
            await eventService.cancel(event._id, { reason: cancelReason });
            patchEvent(event._id, { status: 'CANCELLED', reviewedAt: new Date().toISOString() });
            setCancelTarget(null);
            setCancelReason('');
            pushToast(`"${event.title}" cancelled. Registrants have been notified.`);
            setDrawerOpen(false);
            loadStats();
        } catch (err) {
            pushToast(err.response?.data?.message || 'Failed to cancel event.', 'error');
        } finally {
            setBusy((b) => { const n = { ...b }; delete n[event._id]; return n; });
        }
    };

    // ── Create event helpers ────────────────────────────────────────────────

    const isFormPublic = createForm.visibility === 'public';

    const resetCreateForm = () => {
        setCreateForm(EMPTY_CREATE_FORM);
        setCreateFormError('');
        setMeetingErrors({});
        setBannerUploadError('');
        setCreateOpen(false);
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setBannerUploadError('Please select an image file (JPG, PNG, or WebP).');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setBannerUploadError('Image must be smaller than 5MB.');
            return;
        }
        setBannerUploadError('');
        setBannerUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('targetType', 'event');
            formData.append('folder', 'emare_elms/event_thumbnails');
            const res = await uploadService.uploadFile(formData);
            const url = res.data?.data?.url;
            if (!url) throw new Error('Upload completed but no image URL was returned.');
            setCreateForm((f) => ({ ...f, bannerImage: url }));
            pushToast('Event thumbnail uploaded successfully.', 'success');
        } catch (err) {
            setBannerUploadError(err.response?.data?.message || err.message || 'Failed to upload thumbnail.');
            pushToast('Thumbnail upload failed.', 'error');
        } finally {
            setBannerUploading(false);
        }
    };

    const handleGenerateMeetingLink = async () => {
        const provider = platformToProvider[createForm.meetingPlatform] || createForm.meetingProvider;
        if (provider === 'custom') {
            return pushToast('Manual URLs are entered directly — paste your link into the Meeting Link field.', 'error');
        }
        if (!createForm.title.trim()) return pushToast('Enter an event title before generating a link.', 'error');

        const startDate = createForm.startDate
            ? combineDateAndTime(createForm.startDate, createForm.isAllDay ? '00:00' : (createForm.startTime || '00:00'))
            : null;
        const endDate = createForm.endDate
            ? combineDateAndTime(createForm.endDate, createForm.isAllDay ? '23:59' : (createForm.endTime || '23:59'))
            : null;

        // Jitsi — generate locally without hitting the server
        if (createForm.meetingPlatform === 'jitsi') {
            const link = getDefaultMeetingLink('jitsi', createForm.title);
            setCreateForm((f) => ({ ...f, streamUrl: link, meetingProvider: 'jitsi' }));
            pushToast('Jitsi Meet link generated.', 'success');
            return;
        }

        try {
            setMeetingGenerating(true);
            const { data: res } = await eventService.generateMeetingLink({
                provider,
                title: createForm.title,
                startDate: startDate ? startDate.toISOString() : undefined,
                endDate: endDate ? endDate.toISOString() : undefined,
            });
            const url = res?.data?.url || res?.data?.meetingUrl || '';
            if (!url) throw new Error('No meeting link was returned.');
            setCreateForm((f) => ({ ...f, streamUrl: url, meetingProvider: res?.data?.provider || provider, meetingId: res?.data?.meetingProviderId || '' }));
            pushToast(
                `${meetingProviderLabel(res?.data?.provider || provider)} meeting created successfully.`,
                'success'
            );
        } catch (err) {
            pushToast(
                err.response?.data?.message || 'Failed to generate meeting link.',
                'error'
            );
        } finally {
            setMeetingGenerating(false);
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setCreateFormError('');
        setMeetingErrors({});

        if (!createForm.title.trim()) { setCreateFormError('Event title is required.'); return; }
        if (!createForm.startDate)    { setCreateFormError('Start date is required.'); return; }

        const start = combineDateAndTime(createForm.startDate, createForm.isAllDay ? '00:00' : (createForm.startTime || '00:00'));
        if (!start) { setCreateFormError('Start date is invalid.'); return; }

        const end = createForm.endDate
            ? combineDateAndTime(createForm.endDate, createForm.isAllDay ? '23:59' : (createForm.endTime || '23:59'))
            : null;
        if (end && end < start) { setCreateFormError('End date/time must be after the start date/time.'); return; }

        if (createForm.eventType === 'Physical' && !createForm.location.trim()) {
            setCreateFormError('Location is required for a physical event.');
            return;
        }

        // Meeting URL must be a valid http(s) link whenever one is entered.
        const trimmedUrl = (createForm.streamUrl || '').trim();
        if (createForm.eventType !== 'Physical' && trimmedUrl && !isValidUrl(trimmedUrl)) {
            setMeetingErrors((m) => ({ ...m, streamUrl: 'Please enter a valid meeting URL.' }));
            setCreateFormError('Please enter a valid meeting URL.');
            return;
        }

        // Invitees must be comma-separated valid email addresses.
        const inviteesResult = normalizeInviteesInput(createForm.meetingInvitees);
        if (inviteesResult.invalid.length) {
            setMeetingErrors((m) => ({ ...m, meetingInvitees: `Invalid invitee email(s): ${inviteesResult.invalid.join(', ')}` }));
            setCreateFormError(`Invalid invitee email(s): ${inviteesResult.invalid.join(', ')}`);
            return;
        }

        if (isFormPublic) {
            if (createForm.bannerImage && !isValidUrl(createForm.bannerImage)) {
                setCreateFormError('Banner image URL is invalid — use a full http(s) link.'); return;
            }
        }

        setCreateSaving(true);
        try {
            if (isFormPublic) {
                const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                const endTime = createForm.isAllDay ? '23:59' : (end ? (() => {
                    const hh = String(end.getHours()).padStart(2, '0');
                    const mm = String(end.getMinutes()).padStart(2, '0');
                    const sMin = start.getHours() * 60 + start.getMinutes();
                    const eMin = end.getHours() * 60 + end.getMinutes();
                    return eMin > sMin ? `${hh}:${mm}` : '23:59';
                })() : '23:59');

                const payload = {
                    title: createForm.title,
                    tagline: '',
                    category: createForm.eventCategory || createForm.category || 'Masterclass',
                    description: createForm.description ? createForm.description.split('\n').filter(Boolean) : [],
                    eventType: createForm.eventType || 'Online',
                    venue: createForm.location || (createForm.eventType !== 'Physical' ? 'Online Live Stream' : ''),
                    city: '',
                    streamUrl: createForm.streamUrl || '',
                    startDate: start.toISOString(),
                    endDate: end ? end.toISOString() : null,
                    startTime,
                    endTime,
                    allDay: Boolean(createForm.isAllDay),
                    visibility: 'public',
                    meetingProvider: platformToProvider[createForm.meetingPlatform] || createForm.meetingProvider || 'zoom',
                    meetingPlatform: createForm.meetingPlatform,
                    meetingInvitees: createForm.meetingInvitees || '',
                    invitees: inviteesResult.list,
                    meetingId: createForm.meetingId || '',
                    meetingPassword: createForm.meetingPassword || '',
                    price: createForm.price || 'FREE',
                    totalSlots: Number(createForm.capacity) || 0,
                    image: createForm.bannerImage || '',
                    status: 'PENDING_REVIEW',
                    isFeatured: false,
                    registrationEnabled: Boolean(createForm.enableRegistration),
                };
                const res = await eventService.create(payload);
                const created = res.data?.data;
                setEvents((prev) => [created, ...prev]);
                pushToast('Public event created.');
            } else {
                // Internal event — stored in the Event model so it appears in the
                // Admin Events table with visibility "internal", and mirrored to
                // the internal calendar for the dashboard calendar view.
                const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                const endTime = createForm.isAllDay ? '23:59' : (end ? (() => {
                    const hh = String(end.getHours()).padStart(2, '0');
                    const mm = String(end.getMinutes()).padStart(2, '0');
                    const sMin = start.getHours() * 60 + start.getMinutes();
                    const eMin = end.getHours() * 60 + end.getMinutes();
                    return eMin > sMin ? `${hh}:${mm}` : '23:59';
                })() : '23:59');

                const payload = {
                    title: createForm.title,
                    tagline: '',
                    category: createForm.category,
                    description: createForm.description ? createForm.description.split('\n').filter(Boolean) : [],
                    eventType: createForm.eventType || 'Online',
                    venue: createForm.location || (createForm.eventType !== 'Physical' ? 'Online Live Stream' : ''),
                    city: '',
                    streamUrl: createForm.streamUrl || '',
                    startDate: start.toISOString(),
                    endDate: end ? end.toISOString() : null,
                    startTime,
                    endTime,
                    allDay: Boolean(createForm.isAllDay),
                    visibility: 'internal',
                    meetingProvider: platformToProvider[createForm.meetingPlatform] || createForm.meetingProvider || 'zoom',
                    meetingPlatform: createForm.meetingPlatform,
                    meetingInvitees: createForm.meetingInvitees || '',
                    invitees: inviteesResult.list,
                    meetingId: createForm.meetingId || '',
                    meetingPassword: createForm.meetingPassword || '',
                    price: 'FREE',
                    totalSlots: 0,
                    image: '',
                    status: createForm.eventStatus === 'CANCELLED' ? 'CANCELLED' : 'APPROVED',
                    isFeatured: false,
                    registrationEnabled: false,
                };
                const res = await eventService.create(payload);
                const created = res.data?.data;
                setEvents((prev) => [created, ...prev]);
                try {
                    await calendarService.createEvent({
                        title: createForm.title,
                        category: 'event',
                        description: createForm.description || '',
                        startDate: start.toISOString(),
                        endDate: end ? end.toISOString() : null,
                        location: createForm.location || '',
                        eventType: createForm.eventType || 'Online',
                        streamUrl: createForm.streamUrl || '',
                        visibility: 'internal',
                        meetingProvider: platformToProvider[createForm.meetingPlatform] || createForm.meetingProvider || 'zoom',
                        meetingPlatform: createForm.meetingPlatform,
                        meetingInvitees: createForm.meetingInvitees || '',
                        invitees: inviteesResult.list,
                        meetingId: createForm.meetingId || '',
                        meetingPassword: createForm.meetingPassword || '',
                        isAllDay: Boolean(createForm.isAllDay),
                        status: createForm.eventStatus === 'CANCELLED' ? 'CANCELLED' : 'SCHEDULED',
                    });
                } catch {
                    pushToast('Event saved, but the internal calendar could not be updated.', 'info');
                }
                pushToast('Internal event created.');
            }
            resetCreateForm();
            loadEvents();
            loadStats();
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to save event.';
            setCreateFormError(msg);
        } finally {
            setCreateSaving(false);
        }
    };

    const handleCopyMeetingLink = async (url) => {
        if (!url) return;
        const ok = await copyToClipboard(url);
        pushToast(ok ? 'Meeting link copied.' : 'Could not copy link.', ok ? 'success' : 'error');
    };

    const metrics = [
        {
            label: 'Total Submitted Events',
            value: stats?.total ?? events.length,
            icon: CalendarDays,
            accent: 'text-white',
            badge: null,
        },
        {
            label: 'Pending Approvals',
            value: stats?.pending ?? 0,
            icon: ShieldAlert,
            accent: 'text-green-500',
            badge: stats?.pending || 0,
        },
        {
            label: 'Active Live Events',
            value: stats?.live ?? 0,
            icon: Video,
            accent: 'text-emerald-400',
            badge: null,
        },
        {
            label: 'Total Registrations',
            value: stats?.totalRegistrations ?? 0,
            icon: Users,
            accent: 'text-sky-400',
            badge: null,
        },
    ];

    const pendingCount = stats?.pending ?? events.filter((e) => e.status === 'PENDING_REVIEW').length;

    const fInp = {
        width: '100%',
        padding: '10px 14px',
        borderRadius: 10,
        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
        color: isDark ? '#fff' : '#0f172a',
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box'
    };
    const fSel = {
        width: '100%',
        padding: '10px 14px',
        borderRadius: 10,
        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#fff' : '#0f172a',
        fontSize: 14,
        outline: 'none'
    };
    const fOpt = {
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#ffffff' : '#0f172a'
    };
    const fLbl = {
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 6,
        color: isDark ? '#9ca3af' : '#475569'
    };
    const fDiv = {
        height: 1,
        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
    };

    return (
        <div className={`relative min-h-screen overflow-x-hidden ${isDark ? 'bg-[linear-gradient(135deg,#0B0C10_0%,#14141F_45%,#1F1F2E_100%)] text-white' : 'bg-[linear-gradient(135deg,#f8fafc_0%,#f1f5f9_45%,#e2e8f0_100%)] text-[#16213a]'}`}>
            <div className={`pointer-events-none absolute inset-0 ${isDark ? 'bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)]' : 'bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)]'} bg-[size:26px_26px]`} />
            <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-green-600/10 blur-[120px]" />
            <Navbar />

            <main className="relative z-10 mx-auto max-w-7xl px-4 pt-24 sm:px-6 sm:pt-28">
                <Link to="/admin/dashboard" className={`inline-flex items-center gap-2 text-sm font-bold transition ${isDark ? 'text-gray-300 hover:text-green-500' : 'text-slate-600 hover:text-green-600'}`}>
                    <ArrowLeft className="h-4 w-4" /> Admin Dashboard
                </Link>

                <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Event Management</h1>
                        <p className={`mt-1 text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>Validate, approve, reject, edit and publish instructor-submitted events.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {pendingCount > 0 && (
                            <span className="inline-flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-green-600 dark:text-green-300">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[11px] font-black text-black">{pendingCount}</span>
                                Need Review
                            </span>
                        )}
                        <button
                            onClick={() => { setCreateForm(EMPTY_CREATE_FORM); setCreateOpen(true); }}
                            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_18px_rgba(74,222,128,0.3)] transition hover:brightness-110"
                        >
                            <Plus className="h-4 w-4" /> Create Event
                        </button>
                        <button
                            onClick={() => { loadEvents(); loadStats(); }}
                            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition ${isDark ? 'border-white/10 text-gray-200 hover:border-green-500/50 hover:text-green-300' : 'border-slate-300 text-slate-700 bg-white hover:border-green-600 hover:text-green-700 shadow-sm'}`}
                        >
                            <RefreshCw className="h-4 w-4" /> Refresh
                        </button>
                    </div>
                </div>

                {/* ── Overview Metrics Bar ─────────────────────────── */}
                <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {metrics.map((m) => (
                        <div key={m.label} className={`relative overflow-hidden rounded-3xl border p-5 ${isDark ? 'border-white/10 bg-[#12131A]/80' : 'border-slate-200 bg-white shadow-sm'}`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{m.label}</p>
                                    <p className={`mt-2 text-3xl font-black tabular-nums ${m.accent}`}>
                                        {statsLoading ? '—' : m.value}
                                    </p>
                                </div>
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-green-600/20 bg-green-500/10 text-green-600 dark:text-green-500">
                                    <m.icon className="h-5 w-5" />
                                </span>
                            </div>
                            {m.badge !== null && (
                                <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[11px] font-black text-black">
                                    {m.badge}
                                </span>
                            )}
                        </div>
                    ))}
                </section>

                {/* ── Filters + Search ─────────────────────────────── */}
                <section className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                className={`rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition ${
                                    activeTab === t.key
                                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-black shadow-[0_0_18px_rgba(74,222,128,0.35)]'
                                        : isDark
                                            ? 'border border-white/10 text-gray-300 hover:border-green-500/40 hover:text-green-300 bg-white/5'
                                            : 'border border-slate-300 text-slate-700 hover:border-green-600 hover:text-green-700 bg-white shadow-sm'
                                }`}
                            >
                                {t.label}
                                {t.key !== 'all' && (
                                    <span className="ml-1.5 opacity-70">({events.filter((e) => e.status === t.key).length})</span>
                                )}
                            </button>
                        ))}
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${isDark ? 'border-white/10 bg-[#12131A] text-gray-300 hover:border-green-500/40' : 'border-slate-300 bg-white text-slate-800 hover:border-green-600 shadow-sm'}`}
                        >
                            <option value="all" className={isDark ? 'bg-[#12131A] text-white' : 'bg-white text-slate-800'}>All Categories</option>
                            {EVENT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat} className={isDark ? 'bg-[#12131A] text-white' : 'bg-white text-slate-800'}>{cat}</option>
                            ))}
                        </select>
                        <select
                            value={visibilityFilter}
                            onChange={(e) => setVisibilityFilter(e.target.value)}
                            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${isDark ? 'border-white/10 bg-[#12131A] text-gray-300 hover:border-green-500/40' : 'border-slate-300 bg-white text-slate-800 hover:border-green-600 shadow-sm'}`}
                        >
                            <option value="all" className={isDark ? 'bg-[#12131A] text-white' : 'bg-white text-slate-800'}>All Visibility</option>
                            <option value="public" className={isDark ? 'bg-[#12131A] text-white' : 'bg-white text-slate-800'}>Public</option>
                            <option value="internal" className={isDark ? 'bg-[#12131A] text-white' : 'bg-white text-slate-800'}>Internal</option>
                        </select>
                    </div>
                    <div className="relative w-full lg:w-80">
                        <Search className={`absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search event title or instructor…"
                            className={`w-full rounded-2xl border py-2.5 pl-10 pr-4 text-sm transition focus:ring-2 focus:outline-none ${isDark ? 'border-white/10 bg-[#12131A] text-white placeholder-gray-500 focus:border-green-500/60 focus:ring-green-500/20' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-green-600 focus:ring-green-500/20 shadow-sm'}`}
                        />
                    </div>
                </section>

                {/* ── Data Table ───────────────────────────────────── */}
                <section className={`mt-6 overflow-hidden rounded-3xl border ${isDark ? 'border-white/10 bg-[#12131A]/80' : 'border-slate-200 bg-white shadow-sm'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1180px] text-left text-sm">
                            <thead>
                                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'border-white/10 text-gray-400' : 'border-slate-200 text-slate-500 bg-slate-50/70'}`}>
                                    <th className="px-5 py-4">Event</th>
                                    <th className="px-5 py-4">Category</th>
                                    <th className="px-5 py-4">Date &amp; Time</th>
                                    <th className="px-5 py-4">Location</th>
                                    <th className="px-5 py-4">Seats</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4">Visibility</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-green-500" />
                                            <p className={`mt-3 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Loading events…</p>
                                        </td>
                                    </tr>
                                ) : loadError ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-16 text-center">
                                            <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
                                            <p className={`mt-3 text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Unable to load events</p>
                                            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Please try again.</p>
                                            <button
                                                onClick={() => { loadEvents(); loadStats(); }}
                                                className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider transition ${isDark ? 'border-white/10 text-gray-200 hover:border-green-500/50 hover:text-green-300' : 'border-slate-300 text-slate-700 bg-white hover:border-green-600 hover:text-green-700 shadow-sm'}`}
                                            >
                                                <RefreshCw className="h-3.5 w-3.5" /> Retry
                                            </button>
                                        </td>
                                    </tr>
                                ) : events.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-16 text-center">
                                            <CalendarDays className={`mx-auto h-10 w-10 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
                                            <p className={`mt-4 text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>No events found</p>
                                            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Create your first event to see it here.</p>
                                            <button
                                                onClick={() => { setCreateForm(EMPTY_CREATE_FORM); setCreateOpen(true); }}
                                                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-black shadow-[0_0_18px_rgba(74,222,128,0.3)] transition hover:brightness-110"
                                            >
                                                <Plus className="h-4 w-4" /> Create Event
                                            </button>
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className={`px-5 py-16 text-center text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                            No events match the current filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((event) => {
                                        const meta = STATUS_META[event.status] || STATUS_META.DRAFT;
                                        const registered = event.registeredCount || 0;
                                        const total = event.totalSlots || 0;
                                        const fill = total > 0 ? Math.min(100, Math.round((registered / total) * 100)) : 0;
                                        return (
                                            <tr key={event._id} className={`border-b transition ${isDark ? 'border-white/5 hover:bg-white/[0.03]' : 'border-slate-100 hover:bg-slate-50/80'}`}>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={event.image || '/images/education-hero.jpg'} alt="" className={`h-11 w-11 shrink-0 rounded-xl border object-cover ${isDark ? 'border-white/10' : 'border-slate-200'}`} />
                                                        <div className="min-w-0">
                                                            <p className={`max-w-[240px] truncate font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{event.title}</p>
                                                            <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'border-white/10 bg-white/5 text-gray-300' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                                                                {event.eventType === 'Online' ? <Video className="h-3 w-3 text-green-500" /> : <MapPin className="h-3 w-3 text-green-500" />}
                                                                {event.eventType}
                                                            </span>
                                                            <p className={`mt-1 flex items-center gap-1 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                                                <Users className="h-3 w-3 text-green-500" />
                                                                {event.submittedBy?.fullName || 'Platform Admin'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${isDark ? 'border-white/10 bg-white/5 text-gray-200' : 'border-slate-200 bg-slate-100 text-slate-800'}`}>{event.category || 'Masterclass'}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className={`flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-slate-800'}`}><Calendar className="h-3.5 w-3.5 text-green-500" /> {fmtDate(event.startDate)}</p>
                                                    <p className={`mt-1 flex items-center gap-2 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}><Clock className="h-3.5 w-3.5 text-green-500" /> {event.timeLabel || `${event.startTime} – ${event.endTime}`}</p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {event.eventType === 'Physical' ? (
                                                        <p className={`max-w-[220px] truncate text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{[event.venue, event.city].filter(Boolean).join(', ') || 'Physical venue'}</p>
                                                    ) : event.eventType === 'Online' ? (
                                                        <>
                                                            <p className={`text-xs font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>Online Live Stream</p>
                                                            {event.meetingUrl || event.streamUrl ? (
                                                                <a href={event.meetingUrl || event.streamUrl} target="_blank" rel="noopener noreferrer" className="mt-1 flex max-w-[220px] items-center gap-1 truncate text-xs text-sky-500 hover:text-sky-600">
                                                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                                                    <span className="truncate">{event.meetingUrl || event.streamUrl}</span>
                                                                </a>
                                                            ) : null}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className={`max-w-[220px] truncate text-xs ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>{[event.venue, event.city].filter(Boolean).join(', ') || 'Venue TBD'}</p>
                                                            {event.meetingUrl || event.streamUrl ? (
                                                                <a href={event.meetingUrl || event.streamUrl} target="_blank" rel="noopener noreferrer" className="mt-1 flex max-w-[220px] items-center gap-1 truncate text-xs text-sky-500 hover:text-sky-600">
                                                                    <Video className="h-3 w-3 shrink-0" />
                                                                    <span className="truncate">{event.meetingUrl || event.streamUrl}</span>
                                                                </a>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className={isDark ? 'text-gray-200' : 'text-slate-800'}>{registered}<span className={isDark ? 'text-gray-500' : 'text-slate-400'}> / {total}</span></p>
                                                    <div className={`mt-1.5 h-1.5 w-24 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                                                        <div className={`h-full rounded-full ${fill >= 100 ? 'bg-red-400' : 'bg-gradient-to-r from-green-500 to-green-600'}`} style={{ width: `${fill}%` }} />
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${meta.pill}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                                        {meta.label}
                                                    </span>
                                                    {event.status !== 'CANCELLED' && (
                                                        <span className={`ml-1.5 mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${LIVE_PILL[getLiveStatus(event)] || LIVE_PILL.upcoming}`}>
                                                            <span className="h-1.5 w-1.5 rounded-full" />
                                                            {LIVE_LABEL[getLiveStatus(event)] || 'Upcoming'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${event.visibility === 'internal' ? (isDark ? 'border-white/10 bg-white/5 text-gray-300' : 'border-slate-200 bg-slate-100 text-slate-700') : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300'}`}>
                                                        {event.visibility === 'internal' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                                        {event.visibility === 'internal' ? 'Internal' : 'Public'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => openInspect(event)}
                                                            title="View event"
                                                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${isDark ? 'border-white/10 text-gray-300 hover:border-green-500/50 hover:text-green-300' : 'border-slate-300 text-slate-600 bg-white hover:border-green-600 hover:text-green-600 shadow-xs'}`}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        {(event.status === 'PENDING_REVIEW' || event.status === 'DRAFT') && (
                                                            <button
                                                                onClick={() => handleApprove(event)}
                                                                disabled={busy[event._id] === 'approve'}
                                                                title="Approve & publish"
                                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 text-emerald-400 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                {busy[event._id] === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                            </button>
                                                        )}
                                                        {event.status === 'PENDING_REVIEW' && (
                                                            <button
                                                                onClick={() => handleReject(event, event.reviewNote || '')}
                                                                disabled={busy[event._id] === 'reject'}
                                                                title="Reject & return to instructor"
                                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/30 text-red-400 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                {busy[event._id] === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                                            </button>
                                                        )}
                                                        {event.status !== 'CANCELLED' && (
                                                            <button
                                                                onClick={() => { setCancelTarget(event); setCancelReason(''); }}
                                                                disabled={busy[event._id] === 'cancel'}
                                                                title="Cancel event"
                                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-orange-400/30 text-orange-400 transition hover:bg-orange-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                {busy[event._id] === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openEdit(event)}
                                                            title="Edit details"
                                                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${isDark ? 'border-white/10 text-gray-300 hover:border-green-500/50 hover:text-green-300' : 'border-slate-300 text-slate-600 bg-white hover:border-green-600 hover:text-green-600 shadow-xs'}`}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteTarget(event)}
                                                            disabled={busy[event._id] === 'delete'}
                                                            title="Delete"
                                                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${isDark ? 'border-white/10 text-gray-300 hover:border-red-400/50 hover:text-red-300' : 'border-slate-300 text-slate-600 bg-white hover:border-red-500 hover:text-red-600 shadow-xs'} disabled:opacity-40`}
                                                        >
                                                            {busy[event._id] === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
                </section>
            </main>

            <EventFooter />

            {/* ── Inspect & Validate Drawer ─────────────────────────── */}
            {drawerOpen && inspected && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
                    <div className={`absolute inset-y-0 right-0 flex w-full max-w-5xl flex-col overflow-hidden border-l shadow-2xl ${isDark ? 'border-green-600/20 bg-[#10111A]' : 'border-slate-200 bg-white'}`}>
                        <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Inspect &amp; Validate</h2>
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${STATUS_META[inspected.status].pill}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[inspected.status].dot}`} />
                                    {STATUS_META[inspected.status].label}
                                </span>
                            </div>
                            <button onClick={() => setDrawerOpen(false)} className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${isDark ? 'border-white/10 text-gray-300 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-2">
                            {/* Left — public preview */}
                            <div className={`border-b p-6 lg:border-b-0 lg:border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.25em] text-green-600 dark:text-green-500">Public Preview</p>
                                <div className="relative overflow-hidden rounded-3xl border border-green-600/20 shadow-md">
                                    <img src={inspected.image || '/images/education-hero.jpg'} alt="" className="h-44 w-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <span className="inline-flex rounded-full bg-green-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-black">Upcoming Event</span>
                                        <h3 className="mt-2 text-xl font-black leading-tight text-white">{inspected.title}</h3>
                                        <p className="mt-1 text-xs text-gray-200">{inspected.tagline}</p>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                                    <div className={`rounded-2xl border p-3 ${isDark ? 'border-white/10 bg-[#171823]' : 'border-slate-200 bg-slate-50'}`}>
                                        <Calendar className="h-4 w-4 text-green-600 dark:text-green-500" />
                                        <p className={`mt-2 font-semibold ${isDark ? 'text-gray-300' : 'text-slate-800'}`}>{fmtDate(inspected.startDate)}</p>
                                    </div>
                                    <div className={`rounded-2xl border p-3 ${isDark ? 'border-white/10 bg-[#171823]' : 'border-slate-200 bg-slate-50'}`}>
                                        <Clock className="h-4 w-4 text-green-600 dark:text-green-500" />
                                        <p className={`mt-2 font-semibold ${isDark ? 'text-gray-300' : 'text-slate-800'}`}>{inspected.timeLabel || `${inspected.startTime} – ${inspected.endTime}`}</p>
                                    </div>
                                    <div className={`rounded-2xl border p-3 ${isDark ? 'border-white/10 bg-[#171823]' : 'border-slate-200 bg-slate-50'}`}>
                                        <MapPin className="h-4 w-4 text-green-600 dark:text-green-500" />
                                        <p className={`mt-2 truncate font-semibold ${isDark ? 'text-gray-300' : 'text-slate-800'}`}>{inspected.venue || 'Online Live Stream'}</p>
                                    </div>
                                </div>

                                <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.25em] text-green-600 dark:text-green-500">About</p>
                                <div className={`mt-2 space-y-3 text-sm leading-relaxed ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                                    {(inspected.description && inspected.description.length ? inspected.description : ['No description provided.']).map((p, i) => (
                                        <p key={i}>{p}</p>
                                    ))}
                                </div>

                                {inspected.speaker?.name && (
                                    <div className={`mt-5 flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-[#171823]' : 'border-slate-200 bg-slate-50'}`}>
                                        <img src={inspected.speaker.avatar || inspected.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                                        <div>
                                            <p className={`flex items-center gap-1.5 text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}><BadgeCheck className="h-4 w-4 text-green-600 dark:text-green-500" /> {inspected.speaker.name}</p>
                                            <p className="text-xs text-green-600 dark:text-green-400">{inspected.speaker.role}</p>
                                        </div>
                                    </div>
                                )}

                                <div className={`mt-5 rounded-2xl border p-4 text-sm ${isDark ? 'border-white/10 bg-[#171823]' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-slate-700'}`}><Users className="h-4 w-4 text-green-600 dark:text-green-500" /> Seats</span>
                                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{inspected.registeredCount || 0}<span className={isDark ? 'text-gray-500' : 'text-slate-400'}> / {inspected.totalSlots}</span></span>
                                    </div>
                                    <div className={`mt-2 h-2 w-full overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                                        <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600" style={{ width: `${inspected.totalSlots ? Math.min(100, Math.round(((inspected.registeredCount || 0) / inspected.totalSlots) * 100)) : 0}%` }} />
                                    </div>
                                </div>
                            </div>

                            {/* Right — validation checklist */}
                            <div className="p-6">
                                <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.25em] text-green-600 dark:text-green-500">Validation Checklist</p>

                                <div className={`mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${checks.passed ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400' : 'border-red-400/40 bg-red-400/10 text-red-400'}`}>
                                    {checks.passed ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                                    {checks.passed ? 'All checks passed — ready to publish.' : `${checks.checks.filter((c) => !c.passed).length} check(s) failing — approve is blocked.`}
                                </div>

                                <ul className="space-y-2.5">
                                    {checks.checks.map((c) => (
                                        <li
                                            key={c.key}
                                            className={`flex items-start gap-3 rounded-2xl border p-3.5 text-sm ${
                                                c.passed ? (isDark ? 'border-emerald-400/20 bg-emerald-400/[0.06]' : 'border-emerald-200 bg-emerald-50/60') : (isDark ? 'border-red-400/25 bg-red-400/[0.07]' : 'border-red-200 bg-red-50/60')
                                            }`}
                                        >
                                            <span className={`mt-0.5 shrink-0 ${c.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {c.passed ? <CheckCircle2 className="h-[18px] w-[18px]" /> : <XCircle className="h-[18px] w-[18px]" />}
                                            </span>
                                            <div>
                                                <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.label}</p>
                                                <p className={`mt-0.5 text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>{c.message}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                {inspected.status === 'REJECTED' && inspected.reviewNote && (
                                    <div className="mt-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
                                        <p className="text-xs font-extrabold uppercase tracking-widest text-green-600 dark:text-green-300">Previous Feedback Sent to Instructor</p>
                                        <p className="mt-1.5 text-sm text-green-700 dark:text-green-100/80">{inspected.reviewNote}</p>
                                    </div>
                                )}

                                <div className="mt-5">
                                    <p className={`mb-2 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Rejection Notes (sent to instructor)</p>
                                    <textarea
                                        value={rejectionNote}
                                        onChange={(e) => setRejectionNote(e.target.value)}
                                        rows={3}
                                        placeholder="Explain what needs to be fixed before resubmission…"
                                        className={`w-full rounded-2xl border px-4 py-3 text-sm transition focus:ring-2 focus:outline-none ${isDark ? 'border-white/10 bg-[#171823] text-white placeholder-gray-500 focus:border-red-400/60 focus:ring-red-400/20' : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:ring-red-500/20'}`}
                                    />
                                </div>

                                <div className="mt-5 space-y-2.5">
                                    <button
                                        onClick={() => handleApprove(inspected)}
                                        disabled={!checks.passed || busy[inspected._id] === 'approve'}
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 py-3.5 text-sm font-extrabold uppercase tracking-wide text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {busy[inspected._id] === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                        {checks.passed ? 'Approve & Publish to Site' : 'Approve Blocked — Fix Failing Checks'}
                                    </button>
                                    <button
                                        onClick={() => handleReject(inspected, rejectionNote)}
                                        disabled={busy[inspected._id] === 'reject'}
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-400 to-red-500 py-3.5 text-sm font-extrabold uppercase tracking-wide text-black transition hover:brightness-110 disabled:opacity-60"
                                    >
                                        {busy[inspected._id] === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        Reject &amp; Return to Instructor
                                    </button>
                                    <button
                                        onClick={() => { setDrawerOpen(false); openEdit(inspected); }}
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-green-600 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition hover:brightness-110 shadow-sm"
                                    >
                                        <Pencil className="h-4 w-4" /> Edit Event Details Directly
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create Event Modal ────────────────────────────── */}
            {createOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={resetCreateForm} />
                    <div className={`relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border shadow-2xl ${isDark ? 'border-green-600/25 bg-[#12131A] text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
                        {/* Header */}
                        <div className={`sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-white/10 bg-[#12131A]' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                                    <Plus className="h-5 w-5" />
                                </span>
                                <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Create New Event</h2>
                            </div>
                            <button onClick={resetCreateForm} className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${isDark ? 'border-white/10 text-gray-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                <form onSubmit={handleCreateEvent} style={{ display: 'grid', gap: 16 }}>

                    {/* Form error banner */}
                    {createFormError && (
                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                            {createFormError}
                        </div>
                    )}

                    {/* ── BASIC INFORMATION ── */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#16a34a', marginBottom: 12 }}>Basic Information</div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div>
                                <label style={fLbl}>Event Title *</label>
                                <input
                                    value={createForm.title}
                                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                                    placeholder="e.g. Digital Income Masterclass"
                                    style={fInp}
                                    required
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={fLbl}>Category *</label>
                                    <select
                                        value={createForm.category}
                                        onChange={(e) => setCreateForm({ ...createForm, category: e.target.value, eventCategory: e.target.value })}
                                        style={fSel}
                                    >
                                        {EVENT_CATEGORIES.map((cat) => <option key={cat} value={cat} style={fOpt}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={fLbl}>Status</label>
                                    <select
                                        value={createForm.eventStatus}
                                        onChange={(e) => setCreateForm({ ...createForm, eventStatus: e.target.value })}
                                        style={fSel}
                                    >
                                        <option value="SCHEDULED" style={fOpt}>Scheduled</option>
                                        <option value="CANCELLED" style={fOpt}>Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={fLbl}>Description</label>
                                <textarea
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    placeholder={isFormPublic ? 'One paragraph per line — each line becomes a section on the public page' : 'Short description'}
                                    rows={3}
                                    style={{ ...fInp, resize: 'vertical' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={fDiv} />

                    {/* ── SCHEDULE ── */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#16a34a', marginBottom: 12 }}>Schedule</div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={fLbl}>Start Date *</label>
                                    <input type="date" value={createForm.startDate} onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })} style={fInp} required />
                                </div>
                                <div>
                                    <label style={fLbl}>Start Time</label>
                                    <input type="time" value={createForm.startTime} disabled={createForm.isAllDay} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })} style={{ ...fInp, opacity: createForm.isAllDay ? 0.5 : 1 }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={fLbl}>End Date</label>
                                    <input type="date" value={createForm.endDate} onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })} style={fInp} />
                                </div>
                                <div>
                                    <label style={fLbl}>End Time</label>
                                    <input type="time" value={createForm.endTime} disabled={createForm.isAllDay} onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })} style={{ ...fInp, opacity: createForm.isAllDay ? 0.5 : 1 }} />
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: isDark ? '#9ca3af' : '#475569', cursor: 'pointer', fontSize: 14 }}>
                                <input type="checkbox" checked={createForm.isAllDay} onChange={(e) => setCreateForm({ ...createForm, isAllDay: e.target.checked })} />
                                All day event
                            </label>
                        </div>
                    </div>

                    <div style={fDiv} />

                    {/* ── LOCATION ── */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#16a34a', marginBottom: 12 }}>Location</div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {['Online', 'Physical', 'Hybrid'].map((t) => (
                                    <button
                                        key={t} type="button"
                                        onClick={() => setCreateForm({ ...createForm, eventType: t })}
                                        style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${createForm.eventType === t ? '#16a34a' : isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`, background: createForm.eventType === t ? '#16a34a' : 'transparent', color: createForm.eventType === t ? '#fff' : isDark ? '#9ca3af' : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
                                    >{t}</button>
                                ))}
                            </div>
                            {(createForm.eventType === 'Physical' || createForm.eventType === 'Hybrid') && (
                                <div>
                                    <label style={fLbl}>Location</label>
                                    <input value={createForm.location} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })} placeholder="e.g. Emare Live Hub, Addis Ababa" style={fInp} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={fDiv} />

                    {/* ── VIRTUAL MEETING & LIVE STREAM SETTINGS ── */}
                    {createForm.eventType !== 'Physical' && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#16a34a', marginBottom: 12 }}>Virtual Meeting &amp; Live Stream Settings</div>
                            <div style={{ display: 'grid', gap: 12 }}>

                                {/* Platform */}
                                <div>
                                    <label style={fLbl}>Platform</label>
                                    <select
                                        value={createForm.meetingPlatform}
                                        onChange={(e) => {
                                            const p = e.target.value;
                                            setCreateForm((f) => ({
                                                ...f,
                                                meetingPlatform: p,
                                                meetingProvider: platformToProvider[p] || p,
                                                streamUrl: p === 'jitsi' ? (getDefaultMeetingLink('jitsi', f.title) || f.streamUrl) : f.streamUrl,
                                            }));
                                            setMeetingErrors((m) => ({ ...m, streamUrl: '', meetingInvitees: '' }));
                                        }}
                                        style={fSel}
                                    >
                                        {MEETING_PLATFORMS.map((pf) => (
                                            <option key={pf.value} value={pf.value} style={fOpt}>{pf.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Meeting ID — Zoom only (optional) */}
                                {createForm.meetingPlatform === 'zoom' && (
                                    <div>
                                        <label style={fLbl}>Meeting ID (Optional)</label>
                                        <input
                                            value={createForm.meetingId || ''}
                                            onChange={(e) => setCreateForm({ ...createForm, meetingId: e.target.value })}
                                            placeholder="e.g. 846 1234 5678"
                                            style={fInp}
                                        />
                                    </div>
                                )}

                                {/* Meeting Link + Generate button */}
                                <div>
                                    <label style={fLbl}>Meeting Link</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <input
                                            value={createForm.streamUrl}
                                            onChange={(e) => {
                                                setCreateForm({ ...createForm, streamUrl: e.target.value });
                                                setMeetingErrors((m) => ({ ...m, streamUrl: '' }));
                                            }}
                                            placeholder="Enter a meeting link or generate one automatically"
                                            style={{ ...fInp, flex: '1 1 200px' }}
                                        />
                                        {GENERATABLE_PLATFORMS.includes(createForm.meetingPlatform) && (
                                            <button
                                                type="button"
                                                onClick={handleGenerateMeetingLink}
                                                disabled={meetingGenerating}
                                                style={{ whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', height: 42, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: meetingGenerating ? 'not-allowed' : 'pointer', opacity: meetingGenerating ? 0.7 : 1 }}
                                            >
                                                {meetingGenerating
                                                    ? <><Loader2 size={15} className="animate-spin" /> Generating meeting…</>
                                                    : <><Wand2 size={15} /> Generate Meeting Link</>}
                                            </button>
                                        )}
                                    </div>
                                    {meetingErrors.streamUrl && (
                                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{meetingErrors.streamUrl}</div>
                                    )}
                                    {!GENERATABLE_PLATFORMS.includes(createForm.meetingPlatform) && (
                                        <p style={{ margin: '6px 0 0', fontSize: 12, color: isDark ? '#9ca3af' : '#64748b' }}>Paste your external meeting / live-stream URL directly. It is validated when the event is saved.</p>
                                    )}

                                    {/* Copy / Open links once URL exists */}
                                    {createForm.streamUrl && (
                                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            <button type="button" onClick={() => handleCopyMeetingLink(createForm.streamUrl)} style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`, background: 'transparent', color: isDark ? '#9ca3af' : '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <Copy size={13} /> Copy Link
                                            </button>
                                            <a href={createForm.streamUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`, background: 'transparent', color: isDark ? '#9ca3af' : '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                                                <ExternalLink size={13} /> Open Meeting
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Meeting Password — only platforms that support one */}
                                {PASSWORD_PLATFORMS.includes(createForm.meetingPlatform) && (
                                    <div>
                                        <label style={fLbl}>Meeting Password (Optional)</label>
                                        <input
                                            value={createForm.meetingPassword}
                                            onChange={(e) => setCreateForm({ ...createForm, meetingPassword: e.target.value })}
                                            placeholder="e.g. 123456 — for passcode-protected meetings / streams"
                                            style={fInp}
                                        />
                                    </div>
                                )}

                                {/* Meeting creation progress / success */}
                                {meetingGenerating ? (
                                    <p style={{ margin: 0, fontSize: 12, color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <Loader2 size={13} className="animate-spin" /> Creating a real {meetingProviderLabel(createForm.meetingProvider)} meeting…
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    )}

                    <div style={fDiv} />

                    {/* ── VISIBILITY ── */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#16a34a', marginBottom: 12 }}>Visibility</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[['internal', '#64748b'], ['public', '#16a34a']].map(([v, color]) => (
                                <button
                                    key={v} type="button"
                                    onClick={() => setCreateForm({ ...createForm, visibility: v })}
                                    style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${createForm.visibility === v ? color : isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`, background: createForm.visibility === v ? color : 'transparent', color: createForm.visibility === v ? '#fff' : isDark ? '#9ca3af' : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                >
                                    {v === 'internal' ? <><Lock size={13} /> Internal</> : <><Globe size={13} /> Public</>}
                                </button>
                            ))}
                        </div>
                        <p style={{ margin: '10px 0 0', fontSize: 12, color: isDark ? '#9ca3af' : '#64748b' }}>
                            {isFormPublic
                                ? 'Public events appear in the public events area and go through the review pipeline.'
                                : 'Internal events appear only on the admin/internal calendar (holidays, academic dates, meetings).'}
                        </p>
                    </div>

                    {/* ── PUBLIC EVENT OPTIONS ── */}
                    {isFormPublic && (
                        <>
                            <div style={fDiv} />
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#16a34a', marginBottom: 12 }}>Public Event Options</div>
                                <div style={{ display: 'grid', gap: 12 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={fLbl}>Price</label>
                                            <input value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })} placeholder="FREE / 0" style={fInp} />
                                        </div>
                                        <div>
                                            <label style={fLbl}>Total seats / capacity</label>
                                            <input type="number" min="0" value={createForm.capacity} onChange={(e) => setCreateForm({ ...createForm, capacity: e.target.value })} placeholder="e.g. 50" style={fInp} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={fLbl}>Event Thumbnail</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                            <input id="event-banner-upload" type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: 'none' }} />
                                            <label
                                                htmlFor="event-banner-upload"
                                                style={{ whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700, background: 'rgba(22,163,74,0.15)', color: isDark ? '#4ade80' : '#15803d', border: '1px solid rgba(22,163,74,0.35)', borderRadius: 8, padding: '9px 16px', display: 'inline-flex', alignItems: 'center', gap: 7, cursor: bannerUploading ? 'not-allowed' : 'pointer', opacity: bannerUploading ? 0.6 : 1 }}
                                            >
                                                {bannerUploading
                                                    ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
                                                    : <><UploadCloud size={15} /> Upload Thumbnail</>}
                                            </label>
                                            {createForm.bannerImage && (
                                                <>
                                                    <img src={createForm.bannerImage} alt="Thumbnail preview" style={{ width: 112, height: 64, objectFit: 'cover', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}` }} />
                                                    <button
                                                        type="button"
                                                        onClick={() => setCreateForm({ ...createForm, bannerImage: '' })}
                                                        title="Remove thumbnail"
                                                        style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`, background: 'transparent', color: '#ef4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        {bannerUploadError && (
                                            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{bannerUploadError}</div>
                                        )}
                                        <p style={{ margin: '6px 0 10px', fontSize: 12, color: isDark ? '#9ca3af' : '#64748b' }}>JPG, PNG or WebP up to 5MB. Shown on the public event listing.</p>
                                        <label style={fLbl}>…or paste an image URL</label>
                                        <input value={createForm.bannerImage} onChange={(e) => setCreateForm({ ...createForm, bannerImage: e.target.value })} placeholder="https://…/cover.jpg" style={fInp} />
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, cursor: 'pointer' }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#e5e7eb' : '#1e293b' }}>Enable public registration</span>
                                        <input type="checkbox" checked={createForm.enableRegistration} onChange={(e) => setCreateForm({ ...createForm, enableRegistration: e.target.checked })} />
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    <div style={fDiv} />

                    {/* ── LIVE PREVIEW ── */}
                    {(() => {
                        const pStart = createForm.startDate ? combineDateAndTime(createForm.startDate, createForm.isAllDay ? '00:00' : (createForm.startTime || '00:00')) : null;
                        const pEnd = createForm.endDate ? combineDateAndTime(createForm.endDate, createForm.isAllDay ? '23:59' : (createForm.endTime || '23:59')) : null;
                        const now = new Date();
                        const pStatus = createForm.eventStatus === 'CANCELLED' ? 'cancelled'
                            : (!pStart ? 'upcoming' : (pEnd && now > pEnd ? 'completed' : (now >= pStart ? 'live' : 'upcoming')));
                        const statusColors = { upcoming: { label: 'Upcoming', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' }, live: { label: 'Ongoing', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }, completed: { label: 'Completed', color: '#64748b', bg: 'rgba(100,116,139,0.14)' }, cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' } };
                        const sc = statusColors[pStatus] || statusColors.upcoming;
                        const pType = createForm.eventType || 'Online';
                        return (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#16a34a', marginBottom: 12 }}>Live Preview</div>
                                <div style={{ padding: 14, borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 8 }}>
                                        <strong style={{ fontSize: 15, lineHeight: 1.3, color: isDark ? '#fff' : '#0f172a' }}>{createForm.title.trim() || 'Untitled event'}</strong>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.color}40`, borderRadius: 20, padding: '2px 10px' }}>{sc.label}</span>
                                    </div>
                                    <div style={{ display: 'grid', gap: 4, fontSize: 13, color: isDark ? '#9ca3af' : '#64748b' }}>
                                        <div><strong style={{ color: isDark ? '#9ca3af' : '#475569' }}>{createForm.isAllDay ? 'All day' : 'Scheduled'}: </strong>{pStart ? pStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                                        <div><strong style={{ color: isDark ? '#9ca3af' : '#475569' }}>Format: </strong>{pType}{pType === 'Physical' ? ` — ${createForm.location || 'No location set'}` : pType === 'Hybrid' ? ` — ${createForm.location || 'Online + venue TBD'}` : ''}</div>
                                        {pType !== 'Physical' && <div><strong style={{ color: isDark ? '#9ca3af' : '#475569' }}>Meeting: </strong>{meetingProviderLabel(createForm.meetingProvider)}{createForm.streamUrl ? ` — ${createForm.streamUrl}` : ' — will be created on save'}</div>}
                                        <div><strong style={{ color: isDark ? '#9ca3af' : '#475569' }}>Visibility: </strong>{isFormPublic ? 'Public (review pipeline)' : 'Internal (calendar only)'}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── Submit ── */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', paddingTop: 4 }}>
                        <button
                            type="submit"
                            disabled={createSaving}
                            style={{ padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', fontWeight: 800, border: 'none', cursor: createSaving ? 'not-allowed' : 'pointer', opacity: createSaving ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                        >
                            {createSaving
                                ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                                : <><Plus size={16} /> Create Event</>}
                        </button>
                        <button type="button" onClick={resetCreateForm} style={{ padding: '12px 24px', borderRadius: 10, background: 'transparent', color: isDark ? '#9ca3af' : '#64748b', fontWeight: 600, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`, cursor: 'pointer', fontSize: 14 }}>
                            Cancel
                        </button>
                    </div>
                </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ────────────────────────────────────────── */}
            {editOpen && editTarget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
                    <div className={`relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border p-6 shadow-2xl sm:p-8 ${isDark ? 'border-green-600/25 bg-[#12131A] text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
                        <div className="flex items-center justify-between">
                            <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit Event Details</h2>
                            <button onClick={() => setEditOpen(false)} className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${isDark ? 'border-white/10 text-gray-300 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Event Title</label>
                                <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className={inputCls} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Tagline</label>
                                <input value={editForm.tagline} onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })} className={inputCls} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Description (one paragraph per line)</label>
                                <textarea rows={4} value={editForm.descriptionText} onChange={(e) => setEditForm({ ...editForm, descriptionText: e.target.value })} className={`${inputCls} resize-y`} />
                            </div>
                            <div>
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Event Type</label>
                                <select value={editForm.eventType} onChange={(e) => setEditForm({ ...editForm, eventType: e.target.value })} className={inputCls}>
                                    <option value="Physical">Physical</option>
                                    <option value="Online">Online</option>
                                    <option value="Hybrid">Hybrid</option>
                                </select>
                            </div>
                            <div>
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Status</label>
                                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={inputCls}>
                                    <option value="DRAFT">Draft</option>
                                    <option value="PENDING_REVIEW">Pending Review</option>
                                    <option value="APPROVED">Approved / Published</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Venue (physical)</label>
                                <input value={editForm.venue} onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>City</label>
                                <input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className={inputCls} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Live Stream URL (for Online / Hybrid)</label>
                                <input value={editForm.streamUrl} onChange={(e) => setEditForm({ ...editForm, streamUrl: e.target.value })} placeholder="https://…" className={inputCls} />
                            </div>
                            <div>
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Start Date</label>
                                <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className={inputCls} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Start Time</label>
                                    <input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} className={inputCls} />
                                </div>
                                <div>
                                    <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>End Time</label>
                                    <input type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Price</label>
                                <input value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Total Slots</label>
                                <input type="number" min={0} value={editForm.totalSlots} onChange={(e) => setEditForm({ ...editForm, totalSlots: Number(e.target.value) })} className={inputCls} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Cover Image URL</label>
                                <input value={editForm.image} onChange={(e) => setEditForm({ ...editForm, image: e.target.value })} className={inputCls} />
                            </div>
                            <label className={`flex items-center gap-2.5 text-sm font-semibold sm:col-span-2 ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={editForm.isFeatured}
                                    onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                                    className={`h-4 w-4 rounded accent-green-600 ${isDark ? 'border-white/20 bg-[#1A1B23]' : 'border-slate-300 bg-white'}`}
                                />
                                Featured event (highlighted on the events page)
                            </label>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button onClick={() => setEditOpen(false)} className={`rounded-2xl border px-6 py-3 text-sm font-bold transition ${isDark ? 'border-white/10 text-gray-300 hover:text-white' : 'border-slate-300 text-slate-700 hover:text-slate-900 bg-slate-50'}`}>
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={editSaving}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-green-600 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-60 shadow-md"
                            >
                                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Cancel Event Modal ──────────────────────────────── */}
            {cancelTarget && (
                <Modal isOpen={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Cancel Event" maxWidth="460px">
                    <p className={`mb-3 text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                        Cancel <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{cancelTarget.title}</span>? Registered users will be notified.
                    </p>
                    <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Cancellation reason (optional)"
                        rows={3}
                        className={`w-full rounded-xl border px-4 py-3 text-sm transition focus:ring-2 focus:outline-none ${isDark ? 'border-white/10 bg-[#1A1B23] text-white placeholder-gray-500 focus:border-green-500 focus:ring-green-500/30' : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:bg-white focus:ring-green-500/30'}`}
                    />
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button onClick={confirmCancel} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:brightness-110 shadow-sm">
                            Confirm Cancel
                        </button>
                        <button onClick={() => setCancelTarget(null)} className={`rounded-2xl border px-6 py-3 text-sm font-bold transition ${isDark ? 'border-white/10 text-gray-300 hover:text-white' : 'border-slate-300 text-slate-700 hover:text-slate-900 bg-slate-50'}`}>
                            Keep Event
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── Delete Event Modal ──────────────────────────────── */}
            {deleteTarget && (
                <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete Event" maxWidth="460px">
                    <p className={`mb-5 text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                        Delete <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{deleteTarget.title}</span> permanently? This action cannot be undone.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={confirmDelete} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:brightness-110 shadow-sm">
                            <Trash2 className="h-4 w-4" /> Delete Event
                        </button>
                        <button onClick={() => setDeleteTarget(null)} className={`rounded-2xl border px-6 py-3 text-sm font-bold transition ${isDark ? 'border-white/10 text-gray-300 hover:text-white' : 'border-slate-300 text-slate-700 hover:text-slate-900 bg-slate-50'}`}>
                            Cancel
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── Toasts ────────────────────────────────────────────── */}
            <div className="fixed bottom-6 right-6 z-[80] flex flex-col gap-2.5">
                {toasts.map((t) => (
                    <div key={t.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur ${TOAST_STYLE[t.type].border} ${isDark ? 'bg-[#12131A] text-white' : 'bg-white text-slate-900 border-slate-200'}`}>
                        {TOAST_STYLE[t.type].icon}
                        <span className="max-w-xs">{t.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
