/**
 * CheckpointTimeline.jsx
 *
 * Checkpoint progress bar for the in-video concept player.
 *
 * Divides the video timeline into concept sections. Each section spans from a
 * concept's startSeconds to its timestampSeconds (the checkpoint dot). Dots sit
 * at each concept's exact end time — green when passed, gold when it is the
 * next one the student must complete, slate when still locked.
 *
 * Clicking / dragging the track seeks, but the parent clamps the target so a
 * student can never skip past an unanswered checkpoint.
 */
import React, { useRef, useState } from 'react';

const GREEN = '#10b981';
const GOLD  = '#f59e0b';
const SLATE = '#64748b';

function fmt(sec) {
    if (!Number.isFinite(sec)) return '0:00';
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
}

export default function CheckpointTimeline({
    duration,
    currentTime,
    checkpoints = [],          // sorted by timestampSeconds ascending
    attemptStatus = {},        // { [checkpointId]: { passed } }
    activeCheckpointId = null, // checkpoint whose quiz modal is open
    onSeek                     // (seconds:number) => void
}) {
    const trackRef   = useRef(null);
    const draggingRef = useRef(false);
    const [hoverT,   setHoverT]   = useState(null);
    const [hoverX,   setHoverX]   = useState(0);

    const dur = duration > 0 ? duration : 0;
    const pct = dur > 0 ? Math.min(100, Math.max(0, (currentTime / dur) * 100)) : 0;

    // First unanswered checkpoint = the "gate" the timeline cannot be crossed past
    const nextPending = checkpoints.find(cp => !(attemptStatus?.[cp.checkpointId]?.passed));
    const gateSeconds = nextPending ? nextPending.timestampSeconds : null;

    const timeFromEvent = (e) => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect || dur <= 0) return 0;
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        return ratio * dur;
    };

    const handlePointerDown = (e) => {
        if (dur <= 0) return;
        draggingRef.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onSeek?.(timeFromEvent(e));
    };
    const handlePointerMove = (e) => {
        const t = timeFromEvent(e);
        const rect = trackRef.current?.getBoundingClientRect();
        if (rect) setHoverX(e.clientX - rect.left);
        setHoverT(t);
        if (draggingRef.current) onSeek?.(t);
    };
    const handlePointerUp = () => { draggingRef.current = false; };

    // Section fill colour for a concept segment
    const segmentColor = (cp) => {
        if (attemptStatus?.[cp.checkpointId]?.passed) return GREEN;
        if (cp.checkpointId === activeCheckpointId) return GOLD;
        return 'rgba(255,255,255,0.22)';
    };

    // Build contiguous visual segments: 0 → cp1.end → cp2.end → … → duration
    const segments = [];
    let prevEnd = 0;
    checkpoints.forEach((cp, i) => {
        const end = Math.min(cp.timestampSeconds, dur || cp.timestampSeconds);
        if (end > prevEnd) {
            segments.push({ start: prevEnd, end, color: segmentColor(cp), key: `seg-${i}` });
            prevEnd = end;
        }
    });
    if (dur > prevEnd) {
        segments.push({ start: prevEnd, end: dur, color: 'rgba(255,255,255,0.14)', key: 'seg-tail' });
    }

    return (
        <div style={{ width: '100%', padding: '18px 4px 4px', userSelect: 'none' }}>
            {/* ── Track ─────────────────────────────────────────────────── */}
            <div
                ref={trackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => { draggingRef.current = false; setHoverT(null); }}
                style={{ position: 'relative', height: 26, cursor: 'pointer', touchAction: 'none' }}
                role="slider"
                aria-label="Video position"
                aria-valuemin={0}
                aria-valuemax={Math.round(dur)}
                aria-valuenow={Math.round(currentTime)}
            >
                {/* base rail */}
                <div style={{
                    position: 'absolute', top: 9, left: 0, right: 0, height: 8,
                    borderRadius: 4, background: 'rgba(255,255,255,0.14)'
                }} />
                {/* concept sections */}
                {segments.map(seg => (
                    <div key={seg.key} style={{
                        position: 'absolute', top: 9, height: 8,
                        left:   `${dur > 0 ? (seg.start / dur) * 100 : 0}%`,
                        width:  `${dur > 0 ? ((seg.end - seg.start) / dur) * 100 : 0}%`,
                        background: seg.color, borderRadius: 4,
                        transition: 'background 0.3s'
                    }} />
                ))}
                {/* played fill overlay */}
                <div style={{
                    position: 'absolute', top: 9, left: 0, height: 8, borderRadius: 4,
                    width: `${pct}%`, background: 'linear-gradient(90deg,#22c55e,#16a34a)',
                    opacity: 0.35, pointerEvents: 'none'
                }} />
                {/* playhead */}
                <div style={{
                    position: 'absolute', top: 5, left: `${pct}%`,
                    transform: 'translateX(-50%)', pointerEvents: 'none',
                    width: 4, height: 16, borderRadius: 2, background: '#fff',
                    boxShadow: '0 0 6px rgba(255,255,255,0.7)'
                }} />
                {/* gate limit line — seeking is clamped here while pending */}
                {gateSeconds != null && dur > 0 && (
                    <div title="Answer the current concept question to unlock the rest of the video" style={{
                        position: 'absolute', top: 2,
                        left: `${(gateSeconds / dur) * 100}%`,
                        transform: 'translateX(-50%)', pointerEvents: 'none',
                        width: 2, height: 22,
                        background: 'repeating-linear-gradient(180deg,#f59e0b 0 4px,transparent 4px 8px)',
                        opacity: 0.85
                    }} />
                )}
                {/* hover scrub tooltip */}
                {hoverT != null && (
                    <div style={{
                        position: 'absolute', bottom: 24, left: hoverX,
                        transform: 'translateX(-50%)', pointerEvents: 'none',
                        background: 'rgba(15,23,42,0.95)', color: '#fff',
                        fontSize: 11, fontWeight: 700, padding: '3px 8px',
                        borderRadius: 6, whiteSpace: 'nowrap',
                        border: '1px solid rgba(255,255,255,0.15)'
                    }}>
                        {fmt(hoverT)}
                    </div>
                )}

                {/* ── Checkpoint dots (concept end times) ──────────────── */}
                {checkpoints.map((cp, i) => {
                    if (dur <= 0) return null;
                    const passed = !!attemptStatus?.[cp.checkpointId]?.passed;
                    const isActive = cp.checkpointId === activeCheckpointId;
                    const isNext = nextPending?.checkpointId === cp.checkpointId;
                    const dotColor = passed ? GREEN : isActive || isNext ? GOLD : SLATE;
                    return (
                        <div key={cp.checkpointId} title={`${cp.title || `Concept ${i + 1}`} · ${fmt(cp.timestampSeconds)}${passed ? ' · passed ✓' : ''}`} style={{
                            position: 'absolute', top: 13,
                            left: `${(cp.timestampSeconds / dur) * 100}%`,
                            transform: 'translate(-50%, -50%)'
                        }}>
                            {/* pulsing halo on the next required dot */}
                            {(isActive || isNext) && !passed && (
                                <span style={{
                                    position: 'absolute', inset: -5, borderRadius: '50%',
                                    border: `2px solid ${GOLD}`, opacity: 0.6,
                                    animation: 'cpPulse 1.6s ease-out infinite'
                                }} />
                            )}
                            <span style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 18, height: 18, borderRadius: '50%',
                                background: dotColor, border: '2px solid rgba(255,255,255,0.9)',
                                boxShadow: '0 1px 5px rgba(0,0,0,0.6)',
                                fontSize: 9, fontWeight: 900, color: '#fff', lineHeight: 1
                            }}>
                                {passed ? '✓' : isActive ? '⏸' : i + 1}
                            </span>
                            {/* label under the dot */}
                            <span style={{
                                position: 'absolute', top: 20, left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                                maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis',
                                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                                color: passed ? GREEN : isActive || isNext ? GOLD : 'rgba(255,255,255,0.75)',
                                textAlign: 'center'
                            }}>
                                {cp.title || `Concept ${i + 1}`}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* ── Time readout row ──────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>
                    {fmt(currentTime)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>
                    {nextPending
                        ? `⏸ Checkpoint at ${fmt(nextPending.timestampSeconds)} — quiz will pop up`
                        : '✓ All concepts completed'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>
                    {fmt(dur)}
                </span>
            </div>

            <style>{`@keyframes cpPulse { 0% { transform: scale(0.9); opacity: 0.7; } 70% { transform: scale(1.35); opacity: 0; } 100% { transform: scale(1.35); opacity: 0; } }`}</style>
        </div>
    );
}
