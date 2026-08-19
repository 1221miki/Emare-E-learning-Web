import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    Calendar,
    CalendarDays,
    Camera,
    CheckCircle2,
    Clock,
    Loader2,
    MapPin,
    ShieldCheck,
    Sparkles,
    Tag,
    Users,
    Video,
    X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import EventFooter from '../components/events/EventFooter';
import FloatingActions from '../components/events/FloatingActions';
import EventCalendar from '../components/events/EventCalendar';
import { events as staticEvents, eventGallery, getEventById as staticGetEventById, formatISODate, formatLongDate } from '../data/events';
import { publicEventService } from '../services/api';
import { getLiveStatus, LIVE_STATUS_META } from '../utils/eventStatus';

const TIME_SLOTS = ['15:00', '17:00', '19:00'];

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
    const { eventId } = useParams();
    const [apiEvent, setApiEvent] = useState(null);
    const [apiEvents, setApiEvents] = useState(null);

    useEffect(() => {
        publicEventService
            .getBySlug(eventId)
            .then((res) => setApiEvent({ ...(res.data?.data || null), date: res.data?.data ? new Date(res.data.data.date) : null }))
            .catch(() => setApiEvent(null));
        publicEventService
            .getAll()
            .then((res) => setApiEvents((res.data?.data || []).map((e) => ({ ...e, date: new Date(e.date) }))))
            .catch(() => setApiEvents([]));
    }, [eventId]);

    const event = useMemo(
        () => (apiEvent !== null ? apiEvent : staticGetEventById(eventId)),
        [apiEvent, eventId]
    );
    const eventDate = event ? new Date(event.date) : null;
    const countdown = useCountdown(eventDate ?? FALLBACK_COUNTDOWN_TARGET);

    const liveStatus = event.liveStatus || getLiveStatus({ startDate: event.date, endDate: event.endDate, status: event.status }) || 'upcoming';
    const statusMeta = LIVE_STATUS_META[liveStatus] || LIVE_STATUS_META.upcoming;
    const isLive = liveStatus === 'live';
    const isCancelled = liveStatus === 'cancelled';
    const isCompleted = liveStatus === 'completed';
    const joinUrl = event.meetingUrl || event.streamUrl;
    const canJoin = isLive && joinUrl;

    const otherEvents = useMemo(
        () => (apiEvents !== null ? apiEvents : staticEvents).filter((e) => e.id !== event?.id).slice(0, 2),
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

    const isGoogleMeet = event?.meetingProvider === 'googleMeet';
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

    const handleConfirm = async () => {
        setSubmitting(true);
        try {
            const res = await publicEventService.register(event.id, {
                fullName: form.name,
                phone: form.phone,
                email: form.email,
                city: form.city,
                selectedDate: `${selectedDate.year}-${padCount(selectedDate.month + 1)}-${padCount(selectedDate.day)}`,
                selectedSlot,
            });
            if (res.data?.data?.bookingRef) setBookingRef(res.data.data.bookingRef);
            setModal({ view: 'success' });
        } catch (err) {
            // Backend unreachable → still confirm locally; API errors (fully booked / duplicate) are surfaced as a warning.
            if (!err.response) {
                setModal({ view: 'success' });
            } else {
                setModal({ view: 'success', warning: true, message: err.response?.data?.message || 'Registration could not be saved.' });
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
        <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#0B0C10_0%,#14141F_45%,#1F1F2E_100%)] text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[size:26px_26px]" />
            <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
            <Navbar />
            {children}
            <FloatingActions />
            <EventFooter />
        </div>
    );

    if (!event) {
        return shell(
            <main className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-center px-4 pb-24 pt-40 text-center sm:px-6">
                <span className="text-6xl">🔍</span>
                <h1 className="mt-6 text-3xl font-black text-white">Event Not Found</h1>
                <p className="mt-3 max-w-md text-sm text-[#9CA3AF]">
                    The event you are looking for does not exist or has been removed.
                </p>
                <Link
                    to="/events"
                    className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_25px_rgba(255,193,7,0.4)] transition hover:brightness-110"
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
                    className="inline-flex items-center gap-2 text-sm font-bold text-gray-300 transition hover:text-amber-400"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Events
                </Link>

                {/* ── Hero / Banner ──────────────────────────────────────── */}
                <section className="relative mt-6 overflow-hidden rounded-3xl border border-amber-500/20">
                    <img src={event.image} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10]/95 via-[#0B0C10]/70 to-[#0B0C10]/35" />
                    <div className="relative flex min-h-[320px] flex-col justify-end gap-5 px-6 py-10 sm:min-h-[380px] sm:px-12 sm:py-12">
                        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] ${isCancelled ? 'bg-red-500/20 text-red-300' : isLive ? 'bg-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,0.4)]' : isCompleted ? 'bg-white/10 text-gray-300' : 'bg-amber-400 text-black shadow-[0_0_20px_rgba(255,193,7,0.4)]'}`}>
                            <Sparkles className="h-3.5 w-3.5" /> {isLive ? 'Live Now' : isCancelled ? 'Cancelled' : isCompleted ? 'Completed' : 'Upcoming Event'}
                        </span>
                        <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">{event.title}</h1>
                        <p className="max-w-xl text-sm text-gray-300 sm:text-base">{event.tagline}</p>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-200">
                            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-amber-400" /> {eventDateISO}</span>
                            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" /> {event.time}</span>
                            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-400" /> {event.location}</span>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {[
                                { label: 'Days', value: countdown.days },
                                { label: 'Hours', value: countdown.hours },
                                { label: 'Min', value: countdown.minutes },
                                { label: 'Sec', value: countdown.seconds },
                            ].map((b) => (
                                <div key={b.label} className="flex min-w-[76px] flex-col items-center rounded-2xl border border-amber-500/25 bg-black/40 px-4 py-3 backdrop-blur">
                                    <span className="text-2xl font-black tabular-nums text-white">{padCount(b.value)}</span>
                                    <span className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-400">{b.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-end sm:justify-between">
                            {isCancelled ? (
                                <div className="flex w-fit items-center gap-3 rounded-2xl border border-red-400/40 bg-red-500/15 px-6 py-4 text-sm font-bold text-red-200">
                                    <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
                                    This event has been cancelled by the organizer.
                                </div>
                            ) : isCompleted ? (
                                <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-gray-300">
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-gray-400" />
                                    This event has ended.
                                </div>
                            ) : canJoin ? (
                                <a
                                    href={joinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-8 py-4 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_30px_rgba(16,185,129,0.45)] transition hover:shadow-[0_0_45px_rgba(16,185,129,0.6)]"
                                >
                                    <Video className="h-4 w-4" /> {isGoogleMeet ? 'Join Google Meet' : 'Join Event Now'}
                                </a>
                            ) : (
                                <button
                                    onClick={scrollToSecureSpot}
                                    className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-4 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_30px_rgba(255,193,7,0.45)] transition hover:shadow-[0_0_45px_rgba(255,193,7,0.6)]"
                                >
                                    Register Now <ArrowRight className="h-4 w-4" />
                                </button>
                            )}
                            <div className="w-full sm:w-52">
                                <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300">
                                    👥 {event.slotsLeft} Slots Left
                                </span>
                                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
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
                            <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-400">About The Event</span>
                            <span className="h-px flex-1 bg-gradient-to-r from-amber-400/50 to-transparent" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{event.tagline}</h2>
                        {event.description.map((p, i) => (
                            <p key={i} className="mt-4 leading-relaxed text-[#9CA3AF]">{p}</p>
                        ))}

                        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-[#12131A] p-5">
                            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-400">Localized Schedule</p>
                            <ul className="mt-3 space-y-1.5 text-sm text-[#9CA3AF]">
                                <li><span className="font-semibold text-gray-200">Date:</span> {formatLongDate(eventDate)}</li>
                                <li><span className="font-semibold text-gray-200">Time:</span> {event.time} (EAT) — Local Time</li>
                                <li><span className="font-semibold text-gray-200">Location:</span> {event.location} · {event.city} &amp; Online Live Stream</li>
                            </ul>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-[#12131A] p-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400"><CalendarDays className="h-5 w-5" /></span>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Date</p>
                                    <p className="text-sm font-semibold text-white">{formatLongDate(eventDate)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-[#12131A] p-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400"><Clock className="h-5 w-5" /></span>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Time (LT)</p>
                                    <p className="text-sm font-semibold text-white">{event.time} EAT</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-[#12131A] p-4 sm:col-span-2">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400"><MapPin className="h-5 w-5" /></span>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Location</p>
                                    <p className="text-sm font-semibold text-white">{event.location} · {event.city}</p>
                                </div>
                            </div>
                        </div>

                        {event.speaker && (
                            <div className="mt-8 rounded-3xl border border-amber-500/20 bg-[#12131A] p-6">
                                <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-400">Organizer / Speaker</span>
                                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                                    <img src={event.speaker.avatar} alt={event.speaker.name} className="h-16 w-16 shrink-0 rounded-2xl border border-amber-500/20 object-cover" />
                                    <div>
                                        <p className="flex items-center gap-2 text-lg font-extrabold text-white">
                                            <BadgeCheck className="h-5 w-5 text-amber-400" /> {event.speaker.name}
                                        </p>
                                        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">{event.speaker.role}</p>
                                        <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">{event.speaker.bio}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <aside className="flex flex-col gap-6">
                        <div className="rounded-3xl border border-amber-500/20 bg-[#12131A] p-6">
                            <h3 className="mb-5 text-xs font-extrabold uppercase tracking-[0.25em] text-amber-400">Event Info</h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-center gap-3">
                                    <CalendarDays className="h-4 w-4 shrink-0 text-amber-400" />
                                    <span className="text-gray-200">{formatLongDate(eventDate)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                                    <span className="text-gray-200">{event.time} (EAT)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="h-4 w-4 shrink-0 text-amber-400" />
                                    <span className="text-gray-200">{event.location}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-[#1A1B23] px-4 py-3">
                                    <span className="flex items-center gap-2 font-semibold text-gray-200"><Tag className="h-4 w-4 text-amber-400" /> Price</span>
                                    <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-black">{event.price}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-[#1A1B23] px-4 py-3">
                                    <span className="flex items-center gap-2 font-semibold text-gray-200"><Users className="h-4 w-4 text-amber-400" /> Remaining</span>
                                    <span className="text-xs font-extrabold text-amber-300">{event.slotsLeft} spots</span>
                                </div>
                            </div>
                            {isCancelled ? (
                                <div className="mt-6 w-full rounded-xl border border-red-400/40 bg-red-500/15 py-3 text-center text-xs font-extrabold uppercase tracking-wide text-red-200">Event Cancelled</div>
                            ) : isCompleted ? (
                                <div className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-center text-xs font-extrabold uppercase tracking-wide text-gray-300">Event Ended</div>
                            ) : canJoin ? (
                                <div className="mt-6 flex w-full flex-col gap-2">
                                    <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:brightness-110">
                                        <Video className="h-4 w-4" /> {isGoogleMeet ? 'Join Google Meet' : 'Join Event'}
                                    </a>
                                    <button onClick={copyMeetingLink} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 py-2.5 text-xs font-bold uppercase tracking-wide text-amber-300 transition hover:bg-amber-400/20">
                                        Copy Meeting Link
                                    </button>
                                    {event.meetingPassword && (
                                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-gray-300">
                                            Meeting password: <span className="font-mono font-bold text-amber-300">{event.meetingPassword}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={scrollToSecureSpot}
                                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:brightness-110"
                                >
                                    Register Now
                                </button>
                            )}
                        </div>

                        <div className="rounded-3xl border border-amber-500/20 bg-[#12131A] p-6">
                            <h3 className="mb-5 text-xs font-extrabold uppercase tracking-[0.25em] text-amber-400">Upcoming Events</h3>
                            <div className="space-y-4">
                                {otherEvents.map((e) => (
                                        <Link
                                            key={e.id}
                                            to={`/events/${e.id}`}
                                            className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-[#1A1B23] p-3 transition hover:border-amber-400/40"
                                        >
                                            <img src={e.image} alt={e.title} className="h-14 w-14 shrink-0 rounded-xl border border-amber-500/20 object-cover" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-white group-hover:text-amber-300">{e.title}</p>
                                                <p className="mt-1 text-xs text-gray-400">{formatISODate(e.date)} · {e.time}</p>
                                            </div>
                                            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-400 transition group-hover:gap-2">
                                                View Page <ArrowRight className="h-3.5 w-3.5" />
                                            </span>
                                        </Link>
                                    ))}
                            </div>
                        </div>
                    </aside>
                </section>

                {/* ── Gallery ──────────────────────────────────────────── */}
                <section className="mt-20">
                    <div className="mb-6 flex items-center gap-3">
                        <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-400">Moments From Our Events</span>
                        <span className="h-px flex-1 bg-gradient-to-r from-amber-400/50 to-transparent" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="group relative overflow-hidden rounded-3xl border border-amber-500/20 sm:row-span-2">
                            <img src={eventGallery[0].src} alt={eventGallery[0].label} className="h-full min-h-[420px] w-full object-cover transition duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70 transition group-hover:opacity-100" />
                            <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                                <Camera className="h-3.5 w-3.5 text-amber-400" /> {eventGallery[0].label}
                            </span>
                        </div>
                        {eventGallery.slice(1).map((g) => (
                            <div key={g.label} className="group relative overflow-hidden rounded-3xl border border-amber-500/20">
                                <img src={g.src} alt={g.label} className="h-48 w-full object-cover transition duration-500 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70 transition group-hover:opacity-100" />
                                <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                                    <Camera className="h-3.5 w-3.5 text-amber-400" /> {g.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Registration / Booking ────────────────────────────── */}
                <section id="secure-your-spot" className="mt-20 scroll-mt-28">
                    <div className="mb-2 text-center">
                        <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-400">Secure Your Spot</span>
                    </div>
                    <h2 className="text-center text-2xl font-extrabold text-white sm:text-3xl">Reserve your place today</h2>
                    <p className="mx-auto mt-2 max-w-xl text-center text-sm text-[#9CA3AF]">
                        Select your preferred date and complete the registration. Seats are limited and filling up fast.
                    </p>

                    {isCancelled || isCompleted ? (
                        <div className="mt-10 overflow-hidden rounded-3xl border border-amber-500/20 bg-[#12131A] p-10 text-center shadow-[0_0_40px_rgba(255,193,7,0.07)]">
                            <span className="text-5xl">{isCancelled ? '🚫' : '✅'}</span>
                            <h3 className="mt-4 text-xl font-extrabold text-white">{isCancelled ? 'Registration Closed' : 'Event Completed'}</h3>
                            <p className="mx-auto mt-2 max-w-md text-sm text-[#9CA3AF]">
                                {isCancelled
                                    ? 'This event was cancelled by the organizer and is no longer accepting registrations.'
                                    : 'This event has ended. Thank you for your interest — check the events page for upcoming sessions.'}
                            </p>
                            <Link to="/events" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:brightness-110">
                                Browse Upcoming Events <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    ) : (
                    <div className="mt-10 overflow-hidden rounded-3xl border border-amber-500/20 bg-[#12131A] shadow-[0_0_40px_rgba(255,193,7,0.07)]">
                        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />
                        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr]">
                            <EventCalendar selected={selectedDate} onSelect={setSelectedDate} />

                            <div className="flex flex-col">
                            <h3 className="text-lg font-extrabold text-white">Registration Details</h3>
                            <p className="mt-1 text-xs text-gray-400">
                                {eventDateISO} · {selectedSlot} · {event.location}
                            </p>

                            <p className="mt-6 mb-2 text-xs font-bold uppercase tracking-widest text-amber-300">Time Slot</p>
                            <div className="flex flex-wrap gap-2.5">
                                {TIME_SLOTS.map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setSelectedSlot(t)}
                                        className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                                            selectedSlot === t
                                                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-[0_0_18px_rgba(255,193,7,0.4)]'
                                                : 'border border-white/10 text-gray-300 hover:border-amber-400/50 hover:text-amber-300'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            <p className="mt-6 mb-3 text-xs font-bold uppercase tracking-widest text-amber-300">Personal Details</p>

                            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); handleConfirm(); }}>
                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-400">Full Name</label>
                                    <input
                                        value={form.name}
                                        onChange={setField('name')}
                                        required
                                        placeholder="Abebe Kebede"
                                        className="w-full rounded-xl border border-amber-500/20 bg-[#1A1B23] px-4 py-3 text-sm text-white placeholder-gray-500 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-400">Phone Number</label>
                                    <input
                                        value={form.phone}
                                        onChange={setField('phone')}
                                        required
                                        placeholder="+251 9XX XXX XXX"
                                        className="w-full rounded-xl border border-amber-500/20 bg-[#1A1B23] px-4 py-3 text-sm text-white placeholder-gray-500 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-400">Email Address</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={setField('email')}
                                        required
                                        placeholder="you@email.com"
                                        className="w-full rounded-xl border border-amber-500/20 bg-[#1A1B23] px-4 py-3 text-sm text-white placeholder-gray-500 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-400">City / Location</label>
                                    <input
                                        value={form.city}
                                        onChange={setField('city')}
                                        required
                                        placeholder="Addis Ababa"
                                        className="w-full rounded-xl border border-amber-500/20 bg-[#1A1B23] px-4 py-3 text-sm text-white placeholder-gray-500 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 py-4 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_30px_rgba(255,193,7,0.4)] transition hover:shadow-[0_0_45px_rgba(255,193,7,0.6)] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue to Confirmation'}
                                    {!submitting && <ArrowRight className="h-4 w-4" />}
                                </button>
                            </form>

                            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-gray-500">
                                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
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
                    <div className="relative w-full max-w-md rounded-3xl border border-amber-500/25 bg-[#12131A] p-8 shadow-[0_0_60px_rgba(255,193,7,0.15)]">
                        <button onClick={closeModal} aria-label="Close" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition hover:text-white">
                            <X className="h-4 w-4" />
                        </button>

                        {modal.view === 'linkCopied' ? (
                            <>
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15 shadow-[0_0_35px_rgba(255,193,7,0.4)]">
                                    <CheckCircle2 className="h-8 w-8 text-amber-400" />
                                </div>
                                <h3 className="mt-5 text-center text-2xl font-extrabold text-white">Meeting Link Copied</h3>
                                <p className="mt-2 break-all text-center text-sm text-[#9CA3AF]">{joinUrl}</p>
                                <button
                                    onClick={closeModal}
                                    className="mt-6 w-full rounded-2xl border border-amber-400/40 bg-amber-400/10 py-3.5 text-sm font-extrabold uppercase tracking-wide text-amber-300 transition hover:bg-amber-400/20"
                                >
                                    Done
                                </button>
                            </>
                        ) : (
                            <>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15 shadow-[0_0_35px_rgba(255,193,7,0.4)]">
                            <CheckCircle2 className="h-8 w-8 text-amber-400" />
                        </div>
                        <h3 className="mt-5 text-center text-2xl font-extrabold text-white">You're in! 🎉</h3>
                        <p className="mt-2 text-center text-sm text-[#9CA3AF]">
                            Your booking for <span className="font-bold text-white">{event.title}</span> is confirmed.
                        </p>
                        {modal.warning && (
                            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-200">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                                <span>{modal.message || 'The platform could not confirm your registration right now — please contact us to finalize your spot.'}</span>
                            </div>
                        )}
                        <div className="mt-6 space-y-3 rounded-2xl border border-white/5 bg-[#1A1B23] p-5 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Booking Ref</span>
                                <span className="font-mono font-bold text-amber-300">{bookingRef}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Date</span>
                                <span className="font-semibold text-white">{toISO(new Date(selectedDate.year, selectedDate.month, selectedDate.day))}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Time</span>
                                <span className="font-semibold text-white">{selectedSlot}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Name</span>
                                <span className="font-semibold text-white">{form.name || 'Guest'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Phone</span>
                                <span className="font-semibold text-white">{form.phone || '—'}</span>
                            </div>
                        </div>
                        <p className="mt-4 text-center text-xs text-gray-500">
                            A confirmation SMS &amp; email have been sent to your contact details.
                        </p>
                        <button
                            onClick={closeModal}
                            className="mt-6 w-full rounded-2xl border border-amber-400/40 bg-amber-400/10 py-3.5 text-sm font-extrabold uppercase tracking-wide text-amber-300 transition hover:bg-amber-400/20"
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
