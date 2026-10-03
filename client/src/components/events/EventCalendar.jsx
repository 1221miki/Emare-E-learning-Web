import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export default function EventCalendar({ selected, onSelect, availableDays = [5, 12, 19, 26] }) {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
    const { year, month } = view;
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const prev = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
    const next = () => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));

    const isPast = (d) => new Date(year, month, d).getTime() < startOfToday;
    const isAvailable = (d) => availableDays.includes(d);
    const isSelected = (d) => selected.year === year && selected.month === month && selected.day === d;

    return (
        <div className="rounded-3xl border border-green-600/20 bg-[#12131A] p-6">
            <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-bold text-white">{monthLabel}</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={prev}
                        aria-label="Previous month"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-600/20 text-gray-300 transition hover:border-green-500/50 hover:text-green-500"
                    >
                        <ChevronRight className="h-4 w-4 rotate-180" />
                    </button>
                    <button
                        onClick={next}
                        aria-label="Next month"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-600/20 text-gray-300 transition hover:border-green-500/50 hover:text-green-500"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <span key={d} className="py-1">{d}</span>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
                {cells.map((d, i) => {
                    if (d === null) return <span key={`e${i}`} />;
                    const past = isPast(d);
                    const available = isAvailable(d) && !past;
                    const selectedNow = isSelected(d);
                    return (
                        <button
                            key={d}
                            disabled={!available && !selectedNow}
                            onClick={() => onSelect({ year, month, day: d })}
                            className={`flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition ${
                                selectedNow
                                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-black shadow-[0_0_20px_rgba(74,222,128,0.4)]'
                                    : available
                                      ? 'border border-green-600/30 bg-green-500/10 text-green-300 hover:border-green-500 hover:bg-green-500/20 hover:shadow-[0_0_14px_rgba(74,222,128,0.25)]'
                                      : past
                                        ? 'cursor-not-allowed text-gray-700'
                                        : 'text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            {d}
                        </button>
                    );
                })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-white/5 pt-4 text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Available date</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/20" /> Unavailable</span>
            </div>
        </div>
    );
}
