import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Calendar,
    Camera,
    Clock,
    MapPin,
    Sparkles,
    Tag,
    Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import EventFooter from '../components/events/EventFooter';
import { events as staticEvents, eventGallery, formatISODate } from '../data/events';
import { publicEventService } from '../services/api';
import { getLiveStatus, LIVE_STATUS_META } from '../utils/eventStatus';

const pad = (n) => String(n).padStart(2, '0');

const eventLiveStatus = (e) => (e.liveStatus || getLiveStatus({ startDate: e.date, endDate: e.endDate, status: e.status }) || 'upcoming');
const liveBadgeClass = (live) => ({
    upcoming: 'border-amber-400/40 bg-black/50 text-amber-300',
    live: 'border-emerald-400/40 bg-emerald-500/90 text-black',
    completed: 'border-white/20 bg-black/50 text-gray-300',
    cancelled: 'border-red-400/40 bg-red-500/90 text-white',
}[live] || 'border-amber-400/40 bg-black/50 text-amber-300');
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
                    <div className="flex h-[74px] w-[74px] flex-col items-center justify-center rounded-2xl border border-amber-500/25 bg-[#1A1B23]/90 shadow-[0_0_28px_rgba(245,158,11,0.15)] backdrop-blur">
                        <span className="text-2xl font-black tabular-nums text-white">{c.value}</span>
                        <span className="mt-0.5 text-[9px] font-bold tracking-[0.22em] text-amber-400">{c.label}</span>
                    </div>
                    {i < cells.length - 1 && <span className="text-xl font-black text-amber-400/60">:</span>}
                </React.Fragment>
            ))}
        </div>
    );
}

export default function EventsPage() {
    const [apiEvents, setApiEvents] = useState(null);

    useEffect(() => {
        publicEventService
            .getAll()
            .then((res) => setApiEvents((res.data?.data || []).map((e) => ({ ...e, date: new Date(e.date) }))))
            .catch(() => setApiEvents([]));
    }, []);

    const events = useMemo(() => (apiEvents === null ? staticEvents : apiEvents), [apiEvents]);
    const featured = events.find((e) => e.featured) ?? events[0];
    const others = events.filter((e) => e.id !== featured?.id);
    const hasEvents = events.length > 0;
    const featuredLive = eventLiveStatus(featured);

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#0B0C10_0%,#14141F_45%,#1F1F2E_100%)] text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[size:26px_26px]" />
            <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />

            <Navbar />

            <main className="relative z-10 mx-auto max-w-7xl px-4 pt-24 sm:px-6 sm:pt-28">
                <div className="mb-8 text-center">
                    <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-400">Upcoming Events</span>
                    <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                        Learn. Create. <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">Grow.</span>
                    </h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm text-[#9CA3AF]">
                        Live sessions, bootcamps and masterclasses from the Emare team. Pick an event, reserve your spot and show up.
                    </p>
                </div>

                {hasEvents ? (
                    <>
                {/* ── Featured Event Hero ─────────────────────────────────── */}
                <section className="relative overflow-hidden rounded-3xl border border-amber-500/20">
                    <img src={featured.image} alt={featured.title} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10]/95 via-[#0B0C10]/75 to-[#0B0C10]/40" />
                    <div className="relative flex flex-col gap-6 px-6 py-12 sm:px-12 sm:py-16">
                        <div>
                            <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] backdrop-blur ${liveBadgeClass(eventLiveStatus(featured))}`}>
                                <Sparkles className="h-3.5 w-3.5" /> Featured · {liveBadgeText(eventLiveStatus(featured))}
                            </span>
                            <h2 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
                                {featured.title.split('&').map((part, i) =>
                                    i === 0 ? part : (
                                        <span key={i} className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">&amp;{part}</span>
                                    )
                                )}
                            </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-300">
                            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-amber-400" /> {formatISODate(featured.date)}</span>
                            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" /> {featured.time}</span>
                            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-400" /> {featured.location}</span>
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

                        <div className="mt-2 flex flex-col gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                            <Link
                                to={`/events/${featured.id}`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-4 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_30px_rgba(255,193,7,0.45)] transition hover:shadow-[0_0_45px_rgba(255,193,7,0.6)]"
                            >
                                View Event Details <ArrowRight className="h-4 w-4" />
                            </Link>
                            <div className="w-full sm:w-64">
                                <div className="mb-1.5 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-amber-300">👥 {featured.slotsLeft} Slots Left</span>
                                    <span className="text-gray-400">{featured.price === 'FREE' ? 'Free' : featured.price}</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_12px_rgba(255,193,7,0.6)]"
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
                        <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-400">All Events</span>
                        <span className="h-px flex-1 bg-gradient-to-r from-amber-400/50 to-transparent" />
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {others.map((event) => (
                            <Link
                                key={event.id}
                                to={`/events/${event.id}`}
                                className="group flex flex-col overflow-hidden rounded-3xl border border-amber-500/20 bg-[#12131A] transition hover:border-amber-400/50 hover:shadow-[0_0_35px_rgba(255,193,7,0.15)]"
                            >
                                <div className="relative overflow-hidden">
                                    <img src={event.image} alt={event.title} className="h-48 w-full object-cover transition duration-500 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                    <span className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest backdrop-blur ${liveBadgeClass(eventLiveStatus(event))}`}>
                                        <Sparkles className="h-3 w-3" /> {liveBadgeText(eventLiveStatus(event))}
                                    </span>
                                </div>
                                <div className="flex flex-1 flex-col p-5">
                                    <h3 className="text-lg font-extrabold text-white transition group-hover:text-amber-300">{event.title}</h3>
                                    <p className="mt-1 text-xs text-gray-400">{event.tagline}</p>
                                    <div className="mt-4 space-y-2 text-xs text-gray-300">
                                        <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-amber-400" /> {formatISODate(event.date)}</p>
                                        <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-amber-400" /> {event.time}</p>
                                        <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-amber-400" /> {event.location}</p>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                                            <Users className="h-3.5 w-3.5" /> {event.slotsLeft} spots
                                        </span>
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
                                            <Tag className="h-3.5 w-3.5 text-amber-400" /> {event.price}
                                        </span>
                                    </div>
                                    <span className="mt-4 text-xs font-bold text-amber-400 opacity-0 transition group-hover:opacity-100">
                                        View Details →
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
                    </>
                ) : (
                    <div className="rounded-3xl border border-amber-500/20 bg-[#12131A]/80 px-6 py-20 text-center">
                        <span className="text-5xl">📅</span>
                        <h2 className="mt-5 text-2xl font-extrabold text-white">No published events yet</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-[#9CA3AF]">
                            Approved events will appear here automatically. Check back soon — the Emare team is preparing the next lineup.
                        </p>
                    </div>
                )}

                {/* ── Gallery ───────────────────────────────────────────── */}
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
            </main>

            <EventFooter />
        </div>
    );
}
