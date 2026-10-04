import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    Clock,
    Loader2,
    MapPin,
    Sparkles,
    Tag,
    Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import EventFooter from '../components/events/EventFooter';
import { formatISODate } from '../data/events';
import { publicEventService } from '../services/api';
import { getLiveStatus } from '../utils/eventStatus';
import { useTheme } from '../context/ThemeContext';

const pad = (n) => String(n).padStart(2, '0');

const eventLiveStatus = (e) => (e.liveStatus || getLiveStatus({ startDate: e.date, endDate: e.endDate, status: e.status }) || 'upcoming');

const liveBadgeClass = (live, isDark) => ({
    upcoming: isDark ? 'border-green-500/40 bg-black/50 text-green-300' : 'border-green-600/30 bg-green-50 text-green-800',
    live: 'border-emerald-400/40 bg-emerald-500/90 text-black shadow-[0_0_15px_rgba(52,211,153,0.3)]',
    completed: isDark ? 'border-white/20 bg-black/50 text-gray-300' : 'border-slate-300 bg-slate-100 text-slate-700',
    cancelled: 'border-red-400/40 bg-red-500/90 text-white',
}[live] || (isDark ? 'border-green-500/40 bg-black/50 text-green-300' : 'border-green-600/30 bg-green-50 text-green-800'));

const liveBadgeText = (live) => ({ upcoming: 'Upcoming', live: 'Live Now', completed: 'Completed', cancelled: 'Cancelled' }[live] || 'Upcoming');

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

function Countdown({ target }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const t = useCountdown(target);
    const cells = [
        { label: 'DAYS', value: pad(t.days) },
        { label: 'HOURS', value: pad(t.hours) },
        { label: 'MIN', value: pad(t.minutes) },
        { label: 'SEC', value: pad(t.seconds) },
    ];
    return (
        <div className="flex flex-wrap items-center gap-3">
            {cells.map((c, i) => (
                <React.Fragment key={c.label}>
                    <div className={`flex h-[74px] w-[74px] flex-col items-center justify-center rounded-2xl border backdrop-blur transition-colors duration-200 ${
                        isDark
                            ? 'border-green-600/25 bg-[#1A1B23]/90 text-white shadow-[0_0_28px_rgba(34,197,94,0.15)]'
                            : 'border-green-600/30 bg-white/95 text-slate-900 shadow-[0_4px_20px_rgba(34,197,94,0.12)]'
                    }`}>
                        <span className={`text-2xl font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.value}</span>
                        <span className="mt-0.5 text-[9px] font-bold tracking-[0.22em] text-green-600 dark:text-green-500">{c.label}</span>
                    </div>
                    {i < cells.length - 1 && <span className="text-xl font-black text-green-600/60 dark:text-green-500/60">:</span>}
                </React.Fragment>
            ))}
        </div>
    );
}

export default function EventsPage() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [apiEvents, setApiEvents] = useState(null);
    const [loadState, setLoadState] = useState('loading');

    const loadEvents = useCallback(() => {
        setLoadState('loading');
        publicEventService
            .getAll()
            .then((res) => {
                setApiEvents((res.data?.data || []).map((e) => ({ ...e, date: new Date(e.date) })));
                setLoadState('ready');
            })
            .catch(() => {
                setApiEvents([]);
                setLoadState('error');
            });
    }, []);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    const events = apiEvents || [];
    const featured = events.find((e) => e.featured) ?? events[0];
    const others = events.filter((e) => e.id !== featured?.id);
    const hasEvents = events.length > 0;
    const featuredLive = featured ? eventLiveStatus(featured) : 'upcoming';

    return (
        <div className={`relative min-h-screen overflow-x-hidden transition-colors duration-200 ${
            isDark
                ? 'bg-[linear-gradient(135deg,#0B0C10_0%,#14141F_45%,#1F1F2E_100%)] text-white'
                : 'bg-[linear-gradient(135deg,#f8fafc_0%,#f1f5f9_45%,#e2e8f0_100%)] text-[#16213a]'
        }`}>
            <div className={`pointer-events-none absolute inset-0 bg-[size:26px_26px] ${
                isDark
                    ? 'bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)]'
                    : 'bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.05)_1px,transparent_0)]'
            }`} />
            <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-green-600/10 blur-[120px]" />

            <Navbar />

            <main className="relative z-10 mx-auto max-w-7xl px-4 pt-24 sm:px-6 sm:pt-28">
                <h1 className="sr-only">Events Dashboard</h1>

                {loadState === 'loading' ? (
                    <div className={`rounded-3xl border px-6 py-20 text-center transition-colors duration-200 ${
                        isDark ? 'border-green-600/20 bg-[#12131A]/80 text-white' : 'border-slate-200 bg-white text-slate-900 shadow-sm'
                    }`}>
                        <Loader2 className="mx-auto h-10 w-10 animate-spin text-green-600 dark:text-green-500" />
                        <h2 className={`mt-5 text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Loading events…</h2>
                        <p className={`mx-auto mt-2 max-w-md text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                            Fetching the latest events from the platform.
                        </p>
                    </div>
                ) : loadState === 'error' ? (
                    <div className={`rounded-3xl border px-6 py-20 text-center transition-colors duration-200 ${
                        isDark ? 'border-red-400/30 bg-[#12131A]/80 text-white' : 'border-red-200 bg-white text-slate-900 shadow-sm'
                    }`}>
                        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
                        <h2 className={`mt-5 text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Unable to load events</h2>
                        <p className={`mx-auto mt-2 max-w-md text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                            Please try again.
                        </p>
                        <button
                            onClick={loadEvents}
                            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:brightness-110 shadow-lg shadow-green-600/20"
                        >
                            Retry
                        </button>
                    </div>
                ) : hasEvents ? (
                    <>
                {/* ── Featured Event Hero ─────────────────────────────────── */}
                <section className={`relative overflow-hidden rounded-3xl border ${
                    isDark ? 'border-green-600/20 shadow-2xl' : 'border-slate-200 shadow-lg'
                }`}>
                    <img src={featured.image} alt={featured.title} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/40" />
                    <div className="relative flex flex-col gap-6 px-6 py-12 text-white sm:px-12 sm:py-16">
                        <div>
                            <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] backdrop-blur ${liveBadgeClass(eventLiveStatus(featured), true)}`}>
                                <Sparkles className="h-3.5 w-3.5" /> Featured · {liveBadgeText(eventLiveStatus(featured))}
                            </span>
                            <h2 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl text-white">
                                {featured.title.split('&').map((part, i) =>
                                    i === 0 ? part : (
                                        <span key={i} className="bg-gradient-to-r from-green-300 to-green-500 bg-clip-text text-transparent">&amp;{part}</span>
                                    )
                                )}
                            </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-200">
                            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-green-400" /> {formatISODate(featured.date)}</span>
                            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-green-400" /> {featured.time}</span>
                            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green-400" /> {featured.location}</span>
                        </div>

                        {featuredLive === 'live' ? (
                            <span className="inline-flex w-fit items-center gap-2.5 rounded-full bg-emerald-500/90 px-5 py-2.5 text-sm font-extrabold uppercase tracking-[0.2em] text-black shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-60" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-black" />
                                </span>
                                Live Now
                            </span>
                        ) : featuredLive === 'cancelled' ? (
                            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-red-400/40 bg-red-500/15 px-5 py-2.5 text-sm font-extrabold uppercase tracking-[0.2em] text-red-300">
                                This Event Was Cancelled
                            </span>
                        ) : featuredLive === 'completed' ? (
                            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-extrabold uppercase tracking-[0.2em] text-gray-300">
                                This Event Has Ended
                            </span>
                        ) : (
                            <Countdown target={featured.date} />
                        )}

                        <div className="mt-2 flex flex-col gap-5 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
                            <Link
                                to={`/events/${featured.id}`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-8 py-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_4px_24px_rgba(34,197,94,0.4)] transition hover:brightness-110"
                            >
                                View Event Details <ArrowRight className="h-4 w-4" />
                            </Link>
                            <div className="w-full sm:w-64">
                                <div className="mb-1.5 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-green-300">👥 {featured.slotsLeft} Slots Left</span>
                                    <span className="text-gray-300">{featured.price === 'FREE' ? 'Free' : featured.price}</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]"
                                        style={{ width: `${Math.round(((featured.totalSlots - featured.slotsLeft) / featured.totalSlots) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── All Events Grid ────────────────────────────────────── */}
                <section className="mt-20">
                    <div className="mb-6 flex items-center gap-3">
                        <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-green-600 dark:text-green-500">All Events</span>
                        <span className="h-px flex-1 bg-gradient-to-r from-green-500/50 to-transparent" />
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {others.map((event) => (
                            <Link
                                key={event.id}
                                to={`/events/${event.id}`}
                                className={`group flex flex-col overflow-hidden rounded-3xl border transition duration-200 ${
                                    isDark
                                        ? 'border-green-600/20 bg-[#12131A] text-white hover:border-green-500/50 hover:shadow-[0_0_35px_rgba(34,197,94,0.15)]'
                                        : 'border-slate-200 bg-white text-slate-900 shadow-md hover:border-green-500/50 hover:shadow-xl'
                                }`}
                            >
                                <div className="relative overflow-hidden">
                                    <img src={event.image} alt={event.title} className="h-48 w-full object-cover transition duration-500 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                    <span className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest backdrop-blur ${liveBadgeClass(eventLiveStatus(event), isDark)}`}>
                                        <Sparkles className="h-3 w-3" /> {liveBadgeText(eventLiveStatus(event))}
                                    </span>
                                </div>
                                <div className="flex flex-1 flex-col p-5">
                                    <h3 className={`text-lg font-extrabold transition ${
                                        isDark ? 'text-white group-hover:text-green-300' : 'text-slate-900 group-hover:text-green-600'
                                    }`}>
                                        {event.title}
                                    </h3>
                                    <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{event.tagline}</p>
                                    <div className={`mt-4 space-y-2 text-xs ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                                        <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-green-600 dark:text-green-500" /> {formatISODate(event.date)}</p>
                                        <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-green-600 dark:text-green-500" /> {event.time}</p>
                                        <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-green-600 dark:text-green-500" /> {event.location}</p>
                                    </div>
                                    <div className={`mt-4 flex items-center justify-between border-t pt-4 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                                        <span className={`flex items-center gap-1.5 text-xs font-bold ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                                            <Users className="h-3.5 w-3.5" /> {event.slotsLeft} spots
                                        </span>
                                        <span className={`flex items-center gap-1.5 text-xs font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                                            <Tag className="h-3.5 w-3.5 text-green-600 dark:text-green-500" /> {event.price}
                                        </span>
                                    </div>
                                    <span className="mt-4 text-xs font-bold text-green-600 dark:text-green-500 opacity-0 transition group-hover:opacity-100">
                                        View Details →
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
                    </>
                ) : (
                    <div className={`rounded-3xl border px-6 py-20 text-center transition-colors duration-200 ${
                        isDark ? 'border-green-600/20 bg-[#12131A]/80 text-white' : 'border-slate-200 bg-white text-slate-900 shadow-sm'
                    }`}>
                        <span className="text-5xl">📅</span>
                        <h2 className={`mt-5 text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>No published events yet</h2>
                        <p className={`mx-auto mt-2 max-w-md text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                            Approved events will appear here automatically. Check back soon — the Emare team is preparing the next lineup.
                        </p>
                    </div>
                )}

            </main>

            <EventFooter />
        </div>
    );
}
