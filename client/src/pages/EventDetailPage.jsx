import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    Calendar,
    CalendarDays,
    CheckCircle2,
    Clock,
    Loader2,
    Lock,
    MapPin,
    ShieldCheck,
    Sparkles,
    Star,
    Tag,
    Users,
    Video,
    X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import EventFooter from '../components/events/EventFooter';
import EventCalendar from '../components/events/EventCalendar';
import { formatISODate, formatLongDate } from '../data/events';
import { publicEventService } from '../services/api';
import { getLiveStatus, LIVE_STATUS_META } from '../utils/eventStatus';

const TIME_SLOTS = ['15:00', '17:00', '19:00'];

const isPaidEvent = (price) => {
    if (!price) return false;
    const raw = String(price).trim().toUpperCase();
    if (!raw || raw === 'FREE' || raw === '0' || raw === '0.00') return false;
    const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    return Number.isFinite(num) && num > 0;
};

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const padCount = (n) => String(n).padStart(2, '0');

const FALLBACK_COUNTDOWN_TARGET = new Date(Date.now() + 86400000);

function useCountdown(target) {
    const diff = () => {
        const ms = Math.max(0, target.getTime() - Date.now());
        return {
            days: Math.floor(ms / 86400000),
            hours: Math.floor((ms % 86400000) / 3600000),
            minutes: Math.floor((ms % 3600000) / 60000),
            seconds: Math.floor((ms % 60000) / 1000),
        };
    };
    const [t, setT] = useState(diff);
    useEffect(() => {
        const id = setInterval(() => setT(diff()), 1000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);
    return t;
}

export default function EventDetailPage() {
    const { theme, colors } = useTheme();
    const isDark = theme === 'dark';
    const { eventId } = useParams();
    const [searchParams] = useSearchParams();
    const paidSuccess = searchParams.get('paid') === '1';
    const paidBookingRef = searchParams.get('booking') || '';
    const [apiEvent, setApiEvent] = useState(null);
    const [apiEvents, setApiEvents] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        publicEventService
            .getBySlug(eventId, paidBookingRef ? { booking: paidBookingRef } : {})
            .then((res) => {
                if (cancelled) return;
                setApiEvent({ ...(res.data?.data || null), date: res.data?.data ? new Date(res.data.data.date) : null });
            })
            .catch(() => { if (!cancelled) setApiEvent(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        publicEventService
            .getAll()
            .then((res) => {
                if (!cancelled) setApiEvents((res.data?.data || []).map((e) => ({ ...e, date: new Date(e.date) })));
            })
            .catch(() => { if (!cancelled) setApiEvents([]); });
        return () => { cancelled = true; };
    }, [eventId, paidBookingRef]);

    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    const event = apiEvent;
    const eventDate = event ? new Date(event.date) : null;
    const countdown = useCountdown(eventDate ?? FALLBACK_COUNTDOWN_TARGET);

    const liveStatus = event
        ? (event.liveStatus || getLiveStatus({ startDate: event.date, endDate: event.endDate, status: event.status }) || 'upcoming')
        : 'upcoming';
    const statusMeta = LIVE_STATUS_META[liveStatus] || LIVE_STATUS_META.upcoming;
    const isLive = liveStatus === 'live';
    const isCancelled = liveStatus === 'cancelled';
    const isCompleted = liveStatus === 'completed';

    // Access control: only users who have registered/paid or are host/admin can see/join the meeting
    const isHostOrAdmin = Boolean(
        user?.assignedRole === 'Admin' ||
        event?.isHost ||
        (event?.submittedBy && String(event?.submittedBy) === String(user?._id || user?.id))
    );
    const isRegistered = Boolean(
        event?.hasAccess ||
        (event?.userRegistration && event?.userRegistration?.status === 'confirmed') ||
        (paidSuccess && paidBookingRef)
    );
    const hasAccess = isHostOrAdmin || isRegistered;
    const joinUrl = hasAccess ? (event ? (event.meetingUrl || event.streamUrl) : null) : null;
    const canJoin = isLive && Boolean(joinUrl) && hasAccess;

    const otherEvents = useMemo(
        () => (apiEvents || []).filter((e) => e.id !== event?.id).slice(0, 2),
        [apiEvents, event]
    );

    const [selectedDate, setSelectedDate] = useState(() => {
        const t = new Date();
        return { year: t.getFullYear(), month: t.getMonth(), day: t.getDate() };
    });
    const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
    const [form, setForm] = useState({ name: '', phone: '', email: '', city: '' });
    const [modal, setModal] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [bookingRef, setBookingRef] = useState(() => `EMR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);

    useEffect(() => {
        if (event?.userRegistration?.bookingRef) {
            setBookingRef(event.userRegistration.bookingRef);
        } else if (paidBookingRef) {
            setBookingRef(paidBookingRef);
        }
    }, [event?.userRegistration?.bookingRef, paidBookingRef]);

    // Pre-fill form with user data when authenticated
    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                name: prev.name || user.fullName || user.name || '',
                email: prev.email || user.accountEmail || user.email || '',
                phone: prev.phone || user.phone || '',
                city: prev.city || user.city || ''
            }));
        }
    }, [user]);

    // Save form to localStorage before login redirect
    useEffect(() => {
        if (form.name || form.phone || form.email || form.city) {
            localStorage.setItem('event_registration_form', JSON.stringify(form));
        }
    }, [form]);

    // Restore form from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('event_registration_form');
        if (saved) {
            try {
                setForm(JSON.parse(saved));
            } catch {}
        }
    }, []);

    // Show paid confirmation when returning from the payment gateway
    useEffect(() => {
        if (paidSuccess && apiEvent) {
            if (paidBookingRef) setBookingRef(paidBookingRef);
            setModal({ view: 'success' });
        }
    }, [paidSuccess, apiEvent, paidBookingRef]);

    const [feedbackRating, setFeedbackRating] = useState(5);
    const [feedbackHoverRating, setFeedbackHoverRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
    const [editingFeedback, setEditingFeedback] = useState(false);

    useEffect(() => {
        if (event?.userRegistration?.feedback) {
            setFeedbackRating(event.userRegistration.feedback.rating || 5);
            setFeedbackComment(event.userRegistration.feedback.comment || '');
        }
    }, [event?.userRegistration?.feedback]);

    const handleJoinMeeting = async () => {
        if (!joinUrl) return;
        try {
            if (isAuthenticated && !isHostOrAdmin) {
                await publicEventService.recordAttendance(event.id);
                setApiEvent(prev => prev ? ({
                    ...prev,
                    userRegistration: {
                        ...(prev.userRegistration || {}),
                        attended: true,
                        attendedAt: new Date().toISOString()
                    }
                }) : prev);
            }
        } catch (err) {
            console.error('Failed to record attendance:', err);
        }
        window.open(joinUrl, '_blank', 'noopener,noreferrer');
    };

    const handleFeedbackSubmit = async (e) => {
        e?.preventDefault();
        if (!feedbackRating) return;
        setFeedbackSubmitting(true);
        try {
            const res = await publicEventService.submitFeedback(event.id, {
                rating: feedbackRating,
                comment: feedbackComment
            });
            const savedFeedback = res.data?.data || {
                rating: feedbackRating,
                comment: feedbackComment,
                submittedAt: new Date().toISOString()
            };
            setApiEvent(prev => prev ? ({
                ...prev,
                userRegistration: {
                    ...(prev.userRegistration || {}),
                    feedback: savedFeedback
                }
            }) : prev);
            setEditingFeedback(false);
        } catch (err) {
            console.error('Failed to submit feedback:', err);
        } finally {
            setFeedbackSubmitting(false);
        }
    };

    const copyMeetingLink = async () => {
        if (!joinUrl) return;
        try {
            await navigator.clipboard.writeText(joinUrl);
            setModal({ view: 'linkCopied' });
        } catch {
            setModal({ view: 'linkCopied' });
        }
    };

    const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const closeModal = () => setModal(null);

    const isEventPaid = isPaidEvent(event?.price);

    const normalizePhone = (rawPhone) => {
        let cleaned = String(rawPhone || '').replace(/\D/g, '');
        if (cleaned.startsWith('251')) {
            cleaned = '0' + cleaned.slice(3);
        }
        if (cleaned.length === 9 && (cleaned.startsWith('9') || cleaned.startsWith('7'))) {
            cleaned = '0' + cleaned;
        }
        if (cleaned.length === 10 && (cleaned.startsWith('9') || cleaned.startsWith('7'))) {
            cleaned = '0' + cleaned.slice(0, 9);
        }
        return cleaned;
    };

    const validatePhone = (phone) => {
        const normalized = normalizePhone(phone);
        return /^0[79]\d{8}$/.test(normalized);
    };

    const handleConfirm = async () => {
        // Require authentication for all event registrations
        if (!isAuthenticated) {
            const currentPath = window.location.pathname + window.location.search;
            navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
            return;
        }

        const normalizedPhone = normalizePhone(form.phone);
        if (!validatePhone(form.phone)) {
            setModal({ view: 'success', warning: true, message: 'Invalid phone number. Please enter a valid 10-digit Ethiopian mobile number starting with 09 or 07 (e.g. 0912 345 678).' });
            return;
        }

        setSubmitting(true);
        try {
            const res = await publicEventService.register(event.id, {
                fullName: form.name,
                phone: normalizedPhone,
                email: form.email,
                city: form.city,
                selectedDate: `${selectedDate.year}-${padCount(selectedDate.month + 1)}-${padCount(selectedDate.day)}`,
                selectedSlot,
            });
            const payload = res.data?.data;
            if (payload?.requiresPayment && payload?.paymentUrl) {
                // Redirect to Chapa checkout to complete payment
                window.location.href = payload.paymentUrl;
                return;
            }
            if (payload?.bookingRef) setBookingRef(payload.bookingRef);
            setApiEvent(prev => prev ? ({
                ...prev,
                hasAccess: true,
                userRegistration: {
                    bookingRef: payload?.bookingRef || bookingRef,
                    status: 'confirmed',
                    selectedDate: `${selectedDate.year}-${padCount(selectedDate.month + 1)}-${padCount(selectedDate.day)}`,
                    selectedSlot
                }
            }) : prev);
            setModal({ view: 'success' });
        } catch (err) {
            const apiError = err.response?.data;
            if (apiError?.requiresLogin) {
                const currentPath = window.location.pathname + window.location.search;
                navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
                return;
            }
            const isFreeEvent = !isEventPaid;
            if (apiError?.alreadyRegistered) {
                // User already has a confirmed booking for this event
                if (apiError.data?.bookingRef) setBookingRef(apiError.data.bookingRef);
                setApiEvent(prev => prev ? ({
                    ...prev,
                    hasAccess: true,
                    userRegistration: {
                        bookingRef: apiError.data?.bookingRef || bookingRef,
                        status: 'confirmed'
                    }
                }) : prev);
                setModal({ view: 'success', alreadyRegistered: true, message: apiError.message || 'You have already registered for this event.' });
            } else if (!err.response) {
                setModal({ view: 'success', warning: true, message: 'Network error. Please check your connection and try again.' });
            } else if (isFreeEvent && apiError?.message?.includes('Payment initialization')) {
                if (apiError.data?.bookingRef) setBookingRef(apiError.data.bookingRef);
                setApiEvent(prev => prev ? ({ ...prev, hasAccess: true }) : prev);
                setModal({ view: 'success' });
            } else {
                setModal({ view: 'success', warning: true, message: apiError?.message || 'Registration could not be saved.' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const scrollToSecureSpot = () => {
        const el = document.getElementById('secure-your-spot');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const shell = (children) => (
        <div className={`relative min-h-screen overflow-x-hidden ${isDark ? 'bg-[linear-gradient(135deg,#0B0C10_0%,#14141F_45%,#1F1F2E_100%)] text-white' : 'bg-[linear-gradient(135deg,#f8fafc_0%,#f1f5f9_45%,#e2e8f0_100%)] text-[#16213a]'}`}>
            <div className={`pointer-events-none absolute inset-0 ${isDark ? 'bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)]' : 'bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)]'} bg-[size:26px_26px]`} />
            <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-green-600/10 blur-[120px]" />
            <Navbar />
            {children}
            <EventFooter />
        </div>
    );

    if (!event) {
        return shell(
            <main className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-center px-4 pb-24 pt-40 text-center sm:px-6">
                {loading ? (
                    <>
                        <Loader2 className="h-12 w-12 animate-spin text-green-500" />
                        <h1 className={`mt-6 text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Loading Event…</h1>
                        <p className={`mt-3 max-w-md text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                            Fetching the latest event details, please wait a moment.
                        </p>
                    </>
                ) : (
                    <>
                        <span className="text-6xl">🔍</span>
                        <h1 className={`mt-6 text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Event Not Found</h1>
                        <p className={`mt-3 max-w-md text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                            The event you are looking for does not exist or has been removed.
                        </p>
                    </>
                )}
                <Link
                    to="/events"
                    className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_25px_rgba(74,222,128,0.4)] transition hover:brightness-110"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Events
                </Link>
            </main>
        );
    }

    const eventDateISO = formatISODate(eventDate);

    return shell(
        <>
            <main className="relative z-10 mx-auto max-w-7xl px-4 pt-24 sm:px-6 sm:pt-28">
                {/* Back to Events */}
                <Link
                    to="/events"
                    className={`inline-flex items-center gap-2 text-sm font-bold transition ${isDark ? 'text-gray-300 hover:text-green-500' : 'text-slate-600 hover:text-green-600'}`}
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Events
                </Link>

                {/* ── Hero / Banner ──────────────────────────────────────── */}
                <section className="relative mt-6 overflow-hidden rounded-3xl border border-green-600/20 shadow-xl">
                    <img src={event.image} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10]/95 via-[#0B0C10]/75 to-[#0B0C10]/40" />
                    <div className="relative flex min-h-[320px] flex-col justify-end gap-5 px-6 py-10 sm:min-h-[380px] sm:px-12 sm:py-12 text-white">
                        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] ${isCancelled ? 'bg-red-500/20 text-red-300' : isLive ? 'bg-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,0.4)]' : isCompleted ? 'bg-white/10 text-gray-300' : 'bg-green-500 text-black shadow-[0_0_20px_rgba(74,222,128,0.4)]'}`}>
                            <Sparkles className="h-3.5 w-3.5" /> {isLive ? 'Live Now' : isCancelled ? 'Cancelled' : isCompleted ? 'Completed' : 'Upcoming Event'}
                        </span>
                        <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl text-white">{event.title}</h1>
                        <p className="max-w-xl text-sm text-gray-200 sm:text-base">{event.tagline}</p>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-200">
                            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-green-400" /> {eventDateISO}</span>
                            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-green-400" /> {event.time}</span>
                            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green-400" /> {event.location}</span>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {[
                                { label: 'Days', value: countdown.days },
                                { label: 'Hours', value: countdown.hours },
                                { label: 'Min', value: countdown.minutes },
                                { label: 'Sec', value: countdown.seconds },
                            ].map((b) => (
                                <div key={b.label} className="flex min-w-[76px] flex-col items-center rounded-2xl border border-green-500/30 bg-black/55 px-4 py-3 backdrop-blur shadow-md">
                                    <span className="text-2xl font-black tabular-nums text-white">{padCount(b.value)}</span>
                                    <span className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-400">{b.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-4 border-t border-white/15 pt-5 sm:flex-row sm:items-end sm:justify-between">
                            {isCancelled ? (
                                <div className="flex w-fit items-center gap-3 rounded-2xl border border-red-400/40 bg-red-500/20 px-6 py-4 text-sm font-bold text-red-200">
                                    <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
                                    This event has been cancelled by the organizer.
                                </div>
                            ) : isCompleted ? (
                                <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-sm font-bold text-gray-200">
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-gray-300" />
                                    This event has ended.
                                </div>
                            ) : canJoin ? (
                                <button
                                    onClick={handleJoinMeeting}
                                    className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-8 py-4 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_30px_rgba(16,185,129,0.45)] transition hover:shadow-[0_0_45px_rgba(16,185,129,0.6)] cursor-pointer"
                                >
                                    <Video className="h-4 w-4 animate-pulse" /> {isHostOrAdmin ? 'Join Meeting as Host' : 'Join Event Now'}
                                </button>
                            ) : hasAccess ? (
                                <div className="flex w-fit items-center gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-6 py-4 text-sm font-bold text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                                    {isHostOrAdmin ? 'Organizer Access Confirmed' : `Registered ✓ (Ref: ${event?.userRegistration?.bookingRef || bookingRef})`}
                                </div>
                            ) : !isAuthenticated ? (
                                <button
                                    onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                                    className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-8 py-4 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_30px_rgba(74,222,128,0.45)] transition hover:shadow-[0_0_45px_rgba(74,222,128,0.6)]"
                                >
                                    {isEventPaid ? `Sign In to Register & Pay (${event.price})` : 'Sign In to Register Free'} <ArrowRight className="h-4 w-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={scrollToSecureSpot}
                                    className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-8 py-4 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_30px_rgba(74,222,128,0.45)] transition hover:shadow-[0_0_45px_rgba(74,222,128,0.6)]"
                                >
                                    {isEventPaid ? `Pay ${event.price} & Register` : 'Register Now'} <ArrowRight className="h-4 w-4" />
                                </button>
                            )}
                            <div className="w-full sm:w-52">
                                <span className="inline-flex items-center gap-2 text-xs font-semibold text-green-300">
                                    👥 {event.slotsLeft} Slots Left
                                </span>
                                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/20">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-500"
                                        style={{ width: `${Math.round(((event.totalSlots - event.slotsLeft) / event.totalSlots) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── About + Sidebar ───────────────────────────────────── */}
                <section className="mt-16 grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <div className="mb-4 flex items-center gap-3">
                            <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-green-600 dark:text-green-500">About The Event</span>
                            <span className="h-px flex-1 bg-gradient-to-r from-green-500/50 to-transparent" />
                        </div>
                        <h2 className={`text-2xl font-extrabold sm:text-3xl ${isDark ? 'text-white' : 'text-slate-900'}`}>{event.tagline}</h2>
                        {(Array.isArray(event.description) ? event.description : [event.description]).filter(Boolean).map((p, i) => (
                            <p key={i} className={`mt-4 leading-relaxed ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>{p}</p>
                        ))}

                        <div className={`mt-6 rounded-2xl border p-5 ${isDark ? 'border-green-600/20 bg-[#12131A]' : 'border-slate-200 bg-white shadow-sm'}`}>
                            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-green-600 dark:text-green-500">Localized Schedule</p>
                            <ul className={`mt-3 space-y-1.5 text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                                <li><span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>Date:</span> {formatLongDate(eventDate)}</li>
                                <li><span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>Time:</span> {event.time} (EAT) — Local Time</li>
                                <li><span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>Location:</span> {event.location} · {event.city} &amp; Online Live Stream</li>
                            </ul>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <div className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-green-600/20 bg-[#12131A]' : 'border-slate-200 bg-white shadow-sm'}`}>
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-500"><CalendarDays className="h-5 w-5" /></span>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Date</p>
                                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatLongDate(eventDate)}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-green-600/20 bg-[#12131A]' : 'border-slate-200 bg-white shadow-sm'}`}>
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-500"><Clock className="h-5 w-5" /></span>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Time (LT)</p>
                                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{event.time} EAT</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-3 rounded-2xl border p-4 sm:col-span-2 ${isDark ? 'border-green-600/20 bg-[#12131A]' : 'border-slate-200 bg-white shadow-sm'}`}>
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-500"><MapPin className="h-5 w-5" /></span>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Location</p>
                                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{event.location} · {event.city}</p>
                                </div>
                            </div>
                        </div>

                        {event.speaker && (
                            <div className={`mt-8 rounded-3xl border p-6 ${isDark ? 'border-green-600/20 bg-[#12131A]' : 'border-slate-200 bg-white shadow-sm'}`}>
                                <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-green-600 dark:text-green-500">Organizer / Speaker</span>
                                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                                    <img src={event.speaker.avatar} alt={event.speaker.name} className="h-16 w-16 shrink-0 rounded-2xl border border-green-600/20 object-cover" />
                                    <div>
                                        <p className={`flex items-center gap-2 text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            <BadgeCheck className="h-5 w-5 text-green-600 dark:text-green-500" /> {event.speaker.name}
                                        </p>
                                        <p className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400">{event.speaker.role}</p>
                                        <p className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>{event.speaker.bio}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <aside className="flex flex-col gap-6">
                        <div className={`rounded-3xl border p-6 ${isDark ? 'border-green-600/20 bg-[#12131A]' : 'border-slate-200 bg-white shadow-sm'}`}>
                            <h3 className="mb-5 text-xs font-extrabold uppercase tracking-[0.25em] text-green-600 dark:text-green-500">Event Info</h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-center gap-3">
                                    <CalendarDays className="h-4 w-4 shrink-0 text-green-600 dark:text-green-500" />
                                    <span className={isDark ? 'text-gray-200' : 'text-slate-700'}>{formatLongDate(eventDate)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 shrink-0 text-green-600 dark:text-green-500" />
                                    <span className={isDark ? 'text-gray-200' : 'text-slate-700'}>{event.time} (EAT)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="h-4 w-4 shrink-0 text-green-600 dark:text-green-500" />
                                    <span className={isDark ? 'text-gray-200' : 'text-slate-700'}>{event.location}</span>
                                </div>
                                <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${isDark ? 'border-green-600/20 bg-[#1A1B23]' : 'border-slate-200 bg-slate-50'}`}>
                                    <span className={`flex items-center gap-2 font-semibold ${isDark ? 'text-gray-200' : 'text-slate-700'}`}><Tag className="h-4 w-4 text-green-600 dark:text-green-500" /> Price</span>
                                    <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-extrabold text-black">{event.price}</span>
                                </div>
                                <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${isDark ? 'border-green-600/20 bg-[#1A1B23]' : 'border-slate-200 bg-slate-50'}`}>
                                    <span className={`flex items-center gap-2 font-semibold ${isDark ? 'text-gray-200' : 'text-slate-700'}`}><Users className="h-4 w-4 text-green-600 dark:text-green-500" /> Remaining</span>
                                    <span className="text-xs font-extrabold text-green-600 dark:text-green-400">{event.slotsLeft} spots</span>
                                </div>
                            </div>
                            {isCancelled ? (
                                <div className="mt-6 w-full rounded-xl border border-red-400/40 bg-red-500/15 py-3 text-center text-xs font-extrabold uppercase tracking-wide text-red-200">Event Cancelled</div>
                            ) : isCompleted ? (
                                <div className={`mt-6 w-full rounded-xl border py-3 text-center text-xs font-extrabold uppercase tracking-wide ${isDark ? 'border-white/10 bg-white/5 text-gray-300' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>Event Ended</div>
                            ) : canJoin ? (
                                <div className="mt-6 flex w-full flex-col gap-2">
                                    <button onClick={handleJoinMeeting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:brightness-110 shadow-lg cursor-pointer">
                                        <Video className="h-4 w-4" /> {isHostOrAdmin ? 'Join as Host' : 'Join Event'}
                                    </button>
                                    <button onClick={copyMeetingLink} className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 py-2.5 text-xs font-bold uppercase tracking-wide text-green-600 dark:text-green-300 transition hover:bg-green-500/20">
                                        Copy Meeting Link
                                    </button>
                                    {event.meetingPassword && (
                                        <div className={`rounded-lg border px-3 py-2 text-center text-xs ${isDark ? 'border-white/10 bg-white/5 text-gray-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                            Meeting password: <span className="font-mono font-bold text-green-600 dark:text-green-400">{event.meetingPassword}</span>
                                        </div>
                                    )}
                                </div>
                            ) : hasAccess ? (
                                <div className={`mt-6 rounded-2xl border p-4 text-center ${isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'}`}>
                                    <div className="flex items-center justify-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                        <CheckCircle2 className="h-4 w-4" /> You're Registered
                                    </div>
                                    <div className="mt-1 text-xs font-mono font-bold text-gray-400">
                                        Ref: {event.userRegistration?.bookingRef || bookingRef}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-400">
                                        The live meeting link will unlock here automatically when the session goes live.
                                    </p>
                                </div>
                            ) : !isAuthenticated ? (
                                <div className="mt-6 flex w-full flex-col gap-2">
                                    <button
                                        onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                                        className="w-full rounded-xl bg-gradient-to-r from-green-500 to-green-600 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:brightness-110 shadow-md"
                                    >
                                        {isEventPaid ? `Sign In to Register & Pay` : 'Sign In to Register'}
                                    </button>
                                    <p className={`text-center text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                        Account required to attend &amp; join live session
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={scrollToSecureSpot}
                                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-green-500 to-green-600 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:brightness-110 shadow-md"
                                >
                                    {isEventPaid ? `Pay ${event.price} & Register` : 'Register Now'}
                                </button>
                            )}
                        </div>

                        <div className={`rounded-3xl border p-6 ${isDark ? 'border-green-600/20 bg-[#12131A]' : 'border-slate-200 bg-white shadow-sm'}`}>
                            <h3 className="mb-5 text-xs font-extrabold uppercase tracking-[0.25em] text-green-600 dark:text-green-500">Upcoming Events</h3>
                            <div className="space-y-4">
                                {otherEvents.map((e) => (
                                    <Link
                                        key={e.id}
                                        to={`/events/${e.id}`}
                                        className={`group flex items-center gap-4 rounded-2xl border p-3 transition ${isDark ? 'border-white/5 bg-[#1A1B23] hover:border-green-500/40' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-green-500/50 shadow-sm'}`}
                                    >
                                        <img src={e.image} alt={e.title} className="h-14 w-14 shrink-0 rounded-xl border border-green-600/20 object-cover" />
                                        <div className="min-w-0 flex-1">
                                            <p className={`truncate text-sm font-bold transition ${isDark ? 'text-white group-hover:text-green-300' : 'text-slate-900 group-hover:text-green-600'}`}>{e.title}</p>
                                            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{formatISODate(e.date)} · {e.time}</p>
                                        </div>
                                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-green-600 dark:text-green-500 transition group-hover:gap-2">
                                            View Page <ArrowRight className="h-3.5 w-3.5" />
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </aside>
                </section>



                {/* ── Registration / Booking ────────────────────────────── */}
                <section id="secure-your-spot" className="mt-20 scroll-mt-28">
                    <div className="mb-2 text-center">
                        <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-green-600 dark:text-green-500">Secure Your Spot</span>
                    </div>
                    <h2 className={`text-center text-2xl font-extrabold sm:text-3xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Reserve your place today</h2>
                    <p className={`mx-auto mt-2 max-w-xl text-center text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                        {isEventPaid
                            ? `Select your preferred date and complete payment of ${event.price}. Seats are limited and filling up fast.`
                            : 'Select your preferred date and complete the registration. Seats are limited and filling up fast.'}
                    </p>

                    {isCancelled ? (
                        <div className={`mt-10 overflow-hidden rounded-3xl border p-10 text-center shadow-lg ${isDark ? 'border-green-600/20 bg-[#12131A]' : 'border-slate-200 bg-white'}`}>
                            <span className="text-5xl">🚫</span>
                            <h3 className={`mt-4 text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Registration Closed</h3>
                            <p className={`mx-auto mt-2 max-w-md text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                                This event was cancelled by the organizer and is no longer accepting registrations.
                            </p>
                            <Link to="/events" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:brightness-110 shadow-md">
                                Browse Upcoming Events <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    ) : isCompleted ? (
                        hasAccess ? (
                            <div className={`mt-10 overflow-hidden rounded-3xl border shadow-xl ${isDark ? 'border-emerald-500/30 bg-[#12131A]' : 'border-emerald-200 bg-white'}`}>
                                <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-400" />
                                <div className="p-8 sm:p-10">
                                    <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-6 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                                                <BadgeCheck className="h-8 w-8" />
                                            </div>
                                            <div>
                                                <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                                                    Stage 6: Event Completed
                                                </span>
                                                <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    Participation Record &amp; Feedback
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {event?.userRegistration?.attended ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-1.5 text-xs font-bold text-emerald-300 shadow-xs">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Verified Attendance (Present)
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold ${isDark ? 'border-white/10 bg-white/5 text-gray-300' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                                                    <CheckCircle2 className="h-4 w-4 text-gray-400" /> Registered Participant
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-8 grid gap-8 lg:grid-cols-2">
                                        {/* Left: Participation Record */}
                                        <div className={`rounded-2xl border p-6 ${isDark ? 'border-white/5 bg-[#171822]' : 'border-slate-200 bg-slate-50'}`}>
                                            <h4 className="text-xs font-extrabold uppercase tracking-[0.2em] text-green-500">Participation Record</h4>
                                            <div className="mt-4 space-y-3 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Event Title</span>
                                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{event.title}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Booking Reference</span>
                                                    <span className="font-mono font-bold text-green-400">{event?.userRegistration?.bookingRef || bookingRef}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Date &amp; Time</span>
                                                    <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>{eventDateISO} · {event.time}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Location / Format</span>
                                                    <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>{event.location}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Attendance Status</span>
                                                    <span className={`font-bold ${event?.userRegistration?.attended ? 'text-emerald-400' : 'text-gray-400'}`}>
                                                        {event?.userRegistration?.attended
                                                            ? `Checked in ${event?.userRegistration?.attendedAt ? new Date(event.userRegistration.attendedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '✓'}`
                                                            : 'Not recorded'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-6 border-t pt-4 border-white/10 flex items-center justify-between">
                                                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Proof of Attendance</span>
                                                <span className="rounded-lg bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400 border border-green-500/30">
                                                    Verified Record
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right: Feedback & Review */}
                                        <div className={`rounded-2xl border p-6 ${isDark ? 'border-white/5 bg-[#171822]' : 'border-slate-200 bg-slate-50'}`}>
                                            <h4 className="text-xs font-extrabold uppercase tracking-[0.2em] text-green-500">Session Feedback &amp; Rating</h4>

                                            {event?.userRegistration?.feedback?.rating && !editingFeedback ? (
                                                <div className="mt-4">
                                                    <div className="flex items-center gap-1.5">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star
                                                                key={s}
                                                                className={`h-5 w-5 ${s <= (event.userRegistration.feedback.rating || 0) ? 'fill-amber-400 text-amber-400' : isDark ? 'text-gray-600' : 'text-slate-300'}`}
                                                            />
                                                        ))}
                                                        <span className="ml-2 font-bold text-amber-400">{event.userRegistration.feedback.rating}.0 / 5.0</span>
                                                    </div>

                                                    {event.userRegistration.feedback.comment ? (
                                                        <p className={`mt-3 rounded-xl border p-3 text-sm italic leading-relaxed ${isDark ? 'border-white/10 bg-white/5 text-gray-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                                                            "{event.userRegistration.feedback.comment}"
                                                        </p>
                                                    ) : (
                                                        <p className="mt-3 text-xs text-gray-400 italic">No written comment provided.</p>
                                                    )}

                                                    <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                                                        <span>Submitted: {event.userRegistration.feedback.submittedAt ? new Date(event.userRegistration.feedback.submittedAt).toLocaleDateString() : 'Confirmed'}</span>
                                                        <button
                                                            onClick={() => setEditingFeedback(true)}
                                                            className="font-bold text-green-400 hover:underline"
                                                        >
                                                            Update Review
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <form onSubmit={handleFeedbackSubmit} className="mt-4">
                                                    <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                                                        How was the session? Rate your experience and share your feedback:
                                                    </p>

                                                    <div className="my-3 flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <button
                                                                key={s}
                                                                type="button"
                                                                onClick={() => setFeedbackRating(s)}
                                                                onMouseEnter={() => setFeedbackHoverRating(s)}
                                                                onMouseLeave={() => setFeedbackHoverRating(0)}
                                                                className="p-1 transition hover:scale-110"
                                                            >
                                                                <Star
                                                                    className={`h-6 w-6 ${s <= (feedbackHoverRating || feedbackRating) ? 'fill-amber-400 text-amber-400' : isDark ? 'text-gray-600' : 'text-slate-300'}`}
                                                                />
                                                            </button>
                                                        ))}
                                                        <span className="ml-2 text-xs font-bold text-amber-400">
                                                            {['', '1 - Poor', '2 - Fair', '3 - Good', '4 - Very Good', '5 - Outstanding!'][feedbackHoverRating || feedbackRating] || ''}
                                                        </span>
                                                    </div>

                                                    <textarea
                                                        value={feedbackComment}
                                                        onChange={(e) => setFeedbackComment(e.target.value)}
                                                        placeholder="Share your experience, what you learned, or suggestions for the organizer…"
                                                        rows={3}
                                                        className={`w-full rounded-xl border p-3 text-sm transition focus:ring-2 focus:ring-green-500/30 focus:outline-none ${isDark ? 'border-white/10 bg-[#10111A] text-white placeholder-gray-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'}`}
                                                    />

                                                    <div className="mt-3 flex items-center gap-2">
                                                        <button
                                                            type="submit"
                                                            disabled={feedbackSubmitting}
                                                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-black shadow-md transition hover:brightness-110 disabled:opacity-50"
                                                        >
                                                            {feedbackSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                                            Submit Feedback
                                                        </button>
                                                        {editingFeedback && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingFeedback(false)}
                                                                className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${isDark ? 'border-white/10 text-gray-300' : 'border-slate-300 text-slate-700'}`}
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`mt-10 overflow-hidden rounded-3xl border p-10 text-center shadow-lg ${isDark ? 'border-green-600/20 bg-[#12131A]' : 'border-slate-200 bg-white'}`}>
                                <span className="text-5xl">✅</span>
                                <h3 className={`mt-4 text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Event Completed</h3>
                                <p className={`mx-auto mt-2 max-w-md text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                                    This event has ended. Thank you for your interest — check the events page for upcoming sessions.
                                </p>
                                <Link to="/events" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:brightness-110 shadow-md">
                                    Browse Upcoming Events <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        )
                    ) : hasAccess ? (
                        <div className={`mt-10 overflow-hidden rounded-3xl border shadow-xl ${isDark ? 'border-emerald-500/30 bg-[#12131A]' : 'border-emerald-200 bg-white'}`}>
                            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-400" />
                            <div className="p-8 sm:p-10 text-center max-w-2xl mx-auto">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                                    <CheckCircle2 className="h-8 w-8" />
                                </div>
                                <span className="mt-4 inline-block rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                                    {isHostOrAdmin ? 'Host / Organizer Access' : 'Confirmed Registration'}
                                </span>
                                <h3 className={`mt-3 text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {isHostOrAdmin ? "You are hosting this session" : "You're all set for this event!"}
                                </h3>
                                <p className={`mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                                    {isHostOrAdmin
                                        ? "You have full organizer access to run and broadcast this session."
                                        : `Your spot for ${event.title} is secured. Access credentials are confirmed.`}
                                </p>

                                <div className={`mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-2xl border p-4 text-left text-xs ${isDark ? 'border-white/10 bg-[#1A1B23]' : 'border-slate-200 bg-slate-50'}`}>
                                    <div>
                                        <span className="block text-gray-400 uppercase font-bold text-[10px] tracking-wider">Booking Ref</span>
                                        <span className="font-mono font-bold text-green-400 text-sm">{event?.userRegistration?.bookingRef || bookingRef}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-400 uppercase font-bold text-[10px] tracking-wider">Date</span>
                                        <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{eventDateISO}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-400 uppercase font-bold text-[10px] tracking-wider">Time</span>
                                        <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{event.time}</span>
                                    </div>
                                </div>

                                {event?.userRegistration?.attended && (
                                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-1.5 text-xs font-bold text-emerald-300">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Attendance Recorded (Checked-in)
                                    </div>
                                )}

                                {canJoin ? (
                                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <button
                                            onClick={handleJoinMeeting}
                                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-8 py-4 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_30px_rgba(16,185,129,0.5)] transition hover:brightness-110 cursor-pointer"
                                        >
                                            <Video className="h-4 w-4" /> Enter Live Meeting Room
                                        </button>
                                        <button
                                            onClick={copyMeetingLink}
                                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-4 text-sm font-bold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/20"
                                        >
                                            Copy Link
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                                        <p className="text-sm font-semibold text-emerald-300">
                                            🔒 The live meeting link will unlock automatically right here when the session goes live.
                                        </p>
                                        <p className="mt-1 text-xs text-gray-400">
                                            A reminder will also be sent to your registered email and phone.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : !isAuthenticated ? (
                        <div className={`mt-10 overflow-hidden rounded-3xl border shadow-xl ${isDark ? 'border-green-600/20 bg-[#12131A]' : 'border-slate-200 bg-white'}`}>
                            <div className="h-1.5 w-full bg-gradient-to-r from-green-500 via-green-600 to-emerald-500" />
                            <div className="p-8 sm:p-12 text-center max-w-xl mx-auto">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/15 text-green-500 border border-green-500/30 shadow-[0_0_25px_rgba(34,197,94,0.3)]">
                                    <Lock className="h-8 w-8" />
                                </div>
                                <h3 className={`mt-5 text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Sign In to Join This Event
                                </h3>
                                <p className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                                    To reserve your spot, process payment{isEventPaid ? ` of ${event.price}` : ''}, and receive your verified meeting access credentials, please sign in or create a free account.
                                </p>

                                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <Link
                                        to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-8 py-4 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_25px_rgba(74,222,128,0.4)] transition hover:brightness-110"
                                    >
                                        Sign In to Account <ArrowRight className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        to={`/register?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                                        className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-sm font-bold uppercase tracking-wide transition ${isDark ? 'border-white/15 bg-white/5 text-gray-200 hover:bg-white/10' : 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'}`}
                                    >
                                        Create New Account
                                    </Link>
                                </div>
                                <p className={`mt-4 text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                    After signing in, you will be brought straight back to finalize your registration.
                                </p>
                            </div>
                        </div>
                    ) : (
                    <div className={`mt-10 overflow-hidden rounded-3xl border shadow-xl ${isDark ? 'border-green-600/20 bg-[#12131A]' : 'border-slate-200 bg-white'}`}>
                        <div className="h-1.5 w-full bg-gradient-to-r from-green-500 via-green-600 to-emerald-500" />
                        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr]">
                            <EventCalendar selected={selectedDate} onSelect={setSelectedDate} />

                            <div className="flex flex-col">
                            <h3 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Registration Details</h3>
                            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                {eventDateISO} · {selectedSlot} · {event.location}
                            </p>

                            <p className="mt-6 mb-2 text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-400">Time Slot</p>
                            <div className="flex flex-wrap gap-2.5">
                                {TIME_SLOTS.map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setSelectedSlot(t)}
                                        className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                                            selectedSlot === t
                                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-black shadow-[0_0_18px_rgba(74,222,128,0.4)]'
                                                : isDark
                                                    ? 'border border-white/10 text-gray-300 hover:border-green-500/50 hover:text-green-300 bg-white/5'
                                                    : 'border border-slate-300 text-slate-700 hover:border-green-600 hover:text-green-700 bg-slate-50'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            <p className="mt-6 mb-3 text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-400">Personal Details</p>

                            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); handleConfirm(); }}>
                                <div className="sm:col-span-2">
                                    <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Full Name</label>
                                    <input
                                        value={form.name}
                                        onChange={setField('name')}
                                        required
                                        placeholder="Abebe Kebede"
                                        className={`w-full rounded-xl border px-4 py-3 text-sm transition focus:ring-2 focus:ring-green-500/30 focus:outline-none ${isDark ? 'border-green-600/20 bg-[#1A1B23] text-white placeholder-gray-500 focus:border-green-500' : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:bg-white'}`}
                                    />
                                </div>
                                <div>
                                    <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Phone Number</label>
                                    <input
                                        value={form.phone}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^\d+]/g, '').slice(0, 15);
                                            setForm(prev => ({ ...prev, phone: raw }));
                                        }}
                                        onBlur={() => {
                                            if (form.phone) {
                                                const normalized = normalizePhone(form.phone);
                                                if (normalized.length === 10) {
                                                    setForm(prev => ({ ...prev, phone: normalized }));
                                                }
                                            }
                                        }}
                                        required
                                        placeholder="09XX XXX XXX"
                                        className={`w-full rounded-xl border px-4 py-3 text-sm transition focus:ring-2 focus:ring-green-500/30 focus:outline-none ${isDark ? 'border-green-600/20 bg-[#1A1B23] text-white placeholder-gray-500 focus:border-green-500' : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:bg-white'}`}
                                    />
                                    <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Must start with 09 or 07, exactly 10 digits</p>
                                </div>
                                <div>
                                    <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Email Address</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={setField('email')}
                                        required
                                        placeholder="you@email.com"
                                        className={`w-full rounded-xl border px-4 py-3 text-sm transition focus:ring-2 focus:ring-green-500/30 focus:outline-none ${isDark ? 'border-green-600/20 bg-[#1A1B23] text-white placeholder-gray-500 focus:border-green-500' : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:bg-white'}`}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={`mb-1.5 block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>City / Location</label>
                                    <input
                                        value={form.city}
                                        onChange={setField('city')}
                                        required
                                        placeholder="Addis Ababa"
                                        className={`w-full rounded-xl border px-4 py-3 text-sm transition focus:ring-2 focus:ring-green-500/30 focus:outline-none ${isDark ? 'border-green-600/20 bg-[#1A1B23] text-white placeholder-gray-500 focus:border-green-500' : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:bg-white'}`}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 py-4 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_30px_rgba(74,222,128,0.4)] transition hover:shadow-[0_0_45px_rgba(74,222,128,0.6)] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEventPaid ? `Pay ${event.price} & Confirm` : 'Continue to Confirmation'}
                                    {!submitting && isEventPaid ? <ShieldCheck className="h-4 w-4" /> : !submitting && <ArrowRight className="h-4 w-4" />}
                                </button>
                            </form>

                            <p className={`mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                                <ShieldCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                                Your details are secure &amp; never shared with third parties.
                            </p>
                            </div>
                        </div>
                    </div>
                    )}
                </section>
            </main>

            {/* ── Confirmation Modal ─────────────────────────────────────── */}
            {modal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
                    <div className={`relative w-full max-w-md rounded-3xl border p-8 shadow-2xl ${isDark ? 'border-green-600/25 bg-[#12131A]' : 'border-slate-200 bg-white'}`}>
                        <button onClick={closeModal} aria-label="Close" className={`absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border transition ${isDark ? 'border-white/10 text-gray-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}>
                            <X className="h-4 w-4" />
                        </button>

                        {modal.view === 'linkCopied' ? (
                            <>
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 shadow-[0_0_35px_rgba(74,222,128,0.4)]">
                                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                                </div>
                                <h3 className={`mt-5 text-center text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Meeting Link Copied</h3>
                                <p className={`mt-2 break-all text-center text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>{joinUrl}</p>
                                <button
                                    onClick={closeModal}
                                    className="mt-6 w-full rounded-2xl border border-green-500/40 bg-green-500/10 py-3.5 text-sm font-extrabold uppercase tracking-wide text-green-600 dark:text-green-300 transition hover:bg-green-500/20"
                                >
                                    Done
                                </button>
                            </>
                        ) : (
                            <>
                        {modal.warning ? (
                            <>
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 shadow-[0_0_35px_rgba(245,158,11,0.4)]">
                                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                                </div>
                                <h3 className={`mt-5 text-center text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Registration Issue</h3>
                                <p className={`mt-2 text-center text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                                    {modal.message || 'The platform could not confirm your registration right now — please contact us to finalize your spot.'}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 shadow-[0_0_35px_rgba(74,222,128,0.4)]">
                                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                                </div>
                                <h3 className={`mt-5 text-center text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{modal.alreadyRegistered ? 'Already Registered ✓' : "You're in! 🎉"}</h3>
                                <p className={`mt-2 text-center text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                                    {modal.alreadyRegistered
                                        ? `Your existing booking for ${event.title} is confirmed. No additional payment is needed.`
                                        : `Your booking for ${event.title} is confirmed.`}
                                </p>
                                {modal.alreadyRegistered && (
                                    <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-200">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-500" />
                                        <span>{modal.message}</span>
                                    </div>
                                )}
                            </>
                        )}
                        <div className={`mt-6 space-y-3 rounded-2xl border p-5 text-sm ${isDark ? 'border-white/5 bg-[#1A1B23]' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex items-center justify-between">
                                <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Booking Ref</span>
                                <span className="font-mono font-bold text-green-600 dark:text-green-400">{bookingRef}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Date</span>
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{toISO(new Date(selectedDate.year, selectedDate.month, selectedDate.day))}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Time</span>
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedSlot}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Name</span>
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{form.name || 'Guest'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>Phone</span>
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{form.phone || '—'}</span>
                            </div>
                            {joinUrl && (
                                <div className={`mt-1 flex items-center justify-between gap-3 border-t pt-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                    <span className={`flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}><Video className="h-3.5 w-3.5 text-green-600 dark:text-green-500" /> Meeting Link</span>
                                    <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="max-w-[55%] truncate font-semibold text-green-600 dark:text-green-400 underline decoration-green-500/40 underline-offset-2 hover:text-green-500">
                                        {joinUrl}
                                    </a>
                                </div>
                            )}
                        </div>
                        <p className={`mt-4 text-center text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                            A confirmation SMS &amp; email have been sent to your contact details.
                        </p>
                        <button
                            onClick={closeModal}
                            className="mt-6 w-full rounded-2xl border border-green-500/40 bg-green-500/10 py-3.5 text-sm font-extrabold uppercase tracking-wide text-green-600 dark:text-green-300 transition hover:bg-green-500/20"
                        >
                            Done
                        </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
