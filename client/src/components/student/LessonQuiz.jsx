/**
 * LessonQuiz.jsx
 *
 * In-workspace "Knowledge Check" — the quiz linked to the CURRENT lesson,
 * embedded directly in the Learning Workspace so a student never leaves the
 * workspace to attempt or retake a lesson quiz.
 *
 * Rendered only for the active lesson once its CONTENT is complete and the
 * quiz is not yet passed. Handles fetch, countdown timer, answering,
 * submission, and pass/fail + attempt-limit handling. The backend still
 * enforces the lesson → quiz gate (content must be complete first).
 */
import React, { useEffect, useRef, useState } from 'react';
import { quizService } from '../../services/api';
import { setAiTutorBlocked, clearAiTutorBlocked, AI_TUTOR_BLOCKED_MESSAGE } from '../../utils/aiTutorBlock';

export default function LessonQuiz({ quizId, isDark, onOutcome }) {
    // Palette mirrors the Learning Workspace theme.
    const bgCard = isDark ? '#1e293b' : '#ffffff';
    const border = isDark ? '#334155' : '#e2e8f0';
    const text   = isDark ? '#f1f5f9' : '#0f172a';
    const muted  = isDark ? '#94a3b8' : '#64748b';
    const green  = '#10b981';
    const gold   = '#f59e0b';
    const red    = '#ef4444';
    const accent = '#22c55e';

    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [locked, setLocked] = useState('');
    const [error, setError] = useState('');
    const autoSubmittedRef = useRef(false);

    useEffect(() => {
        if (!quizId) return;
        let cancelled = false;
        quizService.getById(quizId)
            .then(res => {
                if (cancelled) return;
                const q = res.data?.data;
                setQuiz(q);
                setTimeLeft((Number(q?.allottedDurationMinutes) || 0) * 60);
                if (q?.aiTutorEnabled === false) setAiTutorBlocked(AI_TUTOR_BLOCKED_MESSAGE);
            })
            .catch(err => {
                if (cancelled) return;
                const isLocked = err.response?.status === 403 && err.response?.data?.lessonLocked;
                if (isLocked) {
                    setLocked(err.response?.data?.lockReason || err.response?.data?.message || 'This quiz is not unlocked yet.');
                } else {
                    setError(err.response?.data?.message || 'Could not load this quiz. Please try again.');
                }
            });
        return () => { cancelled = true; clearAiTutorBlocked(); };
    }, [quizId]);

    const submitAnswers = async () => {
        if (!quiz || submitting) return;
        setSubmitting(true);
        setError('');
        try {
            const payload = Object.entries(answers).map(([questionId, selectedIndex]) => ({
                questionId,
                selectedIndex: Number(selectedIndex)
            }));
            const res = await quizService.submitAttempt(quizId, payload);
            const data = res.data?.data;
            setResult(data);
            if (onOutcome) onOutcome({
                passed: !!data?.passed,
                attemptsUsed: data?.attemptsUsed,
                attemptsLeft: data?.attemptsLeft,
                attemptsLimit: data?.attemptLimit
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit quiz. Please try again.');
            autoSubmittedRef.current = false;
        } finally {
            setSubmitting(false);
        }
    };

    // Countdown timer — auto-submits once time runs out (exactly once).
    useEffect(() => {
        if (!quiz || result || autoSubmittedRef.current) return;
        if (timeLeft <= 0) {
            if (!autoSubmittedRef.current) {
                autoSubmittedRef.current = true;
                submitAnswers();
            }
            return;
        }
        const id = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(id);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quiz, result, timeLeft === 0]);

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (!window.confirm('Are you sure you want to submit your answers?')) return;
        submitAnswers();
    };

    const handleRetry = () => {
        setResult(null);
        setAnswers({});
        autoSubmittedRef.current = false;
        setTimeLeft((Number(quiz?.allottedDurationMinutes) || 0) * 60);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const answeredCount = Object.keys(answers).length;
    const totalCount = quiz?.questionArray?.length || 0;

    const cardStyle = {
        background: bgCard,
        border: `1px solid ${border}`,
        borderRadius: 14,
        padding: '18px 20px 20px',
        marginTop: 14,
        animation: 'fadeIn 0.25s ease'
    };

    // ── Locked (lesson content not complete / sequence not ready) ──
    if (locked) {
        return (
            <div style={{ ...cardStyle, borderColor: isDark ? 'rgba(239,68,68,0.35)' : '#fca5a5', background: isDark ? 'rgba(239,68,68,0.06)' : '#fff7f7' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>🔒</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: text }}>Knowledge Check locked</div>
                        <div style={{ fontSize: 13, color: muted, marginTop: 4, lineHeight: 1.6 }}>{locked}</div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Load error / loading ──
    if (!quiz) {
        return (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '24px 20px' }}>
                {error ? (
                    <div style={{ color: red, fontSize: 13, fontWeight: 600 }}>⚠ {error}</div>
                ) : (
                    <div style={{ color: muted, fontSize: 13, fontWeight: 600 }}>Loading Knowledge Check…</div>
                )}
            </div>
        );
    }

    // ── Result view ──
    if (result) {
        const passed = !!result.passed;
        return (
            <div style={cardStyle}>
                <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Knowledge Check Results</div>
                    <div style={{ fontSize: 46, fontWeight: 900, color: passed ? green : red, lineHeight: 1.1 }}>{result.scorePercentage}%</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: text, margin: '8px 0 4px' }}>
                        {passed ? '🎉 Quiz passed!' : 'Not this time — keep practising'}
                    </div>
                    <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
                        You scored {result.correctCount} out of {result.totalQuestions} correct · passing threshold {result.passingThreshold}%
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                    {!passed && (result.attemptsLeft ?? 0) > 0 && (
                        <button onClick={handleRetry} style={{
                            background: `linear-gradient(135deg, ${accent}, #15803d)`, color: '#fff', border: 'none',
                            borderRadius: 10, padding: '11px 26px', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                        }}>
                            ↻ Try Again ({result.attemptsLeft} attempt{result.attemptsLeft > 1 ? 's' : ''} left)
                        </button>
                    )}
                    {!passed && (result.attemptsLeft ?? 0) <= 0 && result.attemptLimit > 1 && (
                        <div style={{
                            background: 'rgba(239,68,68,0.1)', border: `1px solid ${red}40`, color: red,
                            borderRadius: 10, padding: '11px 18px', fontSize: 13, fontWeight: 700
                        }}>
                            You have used all {result.attemptLimit} attempts for this quiz.
                        </div>
                    )}
                </div>
                {!passed && (result.attemptsLeft ?? 0) <= 0 && (
                    <p style={{ fontSize: 12.5, color: muted, textAlign: 'center', margin: '12px 0 0', lineHeight: 1.6 }}>
                        The assignment and next lesson stay locked until you pass this quiz. Ask your instructor if you are out of attempts.
                    </p>
                )}
                {passed && (
                    <p style={{ fontSize: 13, color: green, textAlign: 'center', margin: '14px 0 0', fontWeight: 700 }}>
                        ✓ Your assignment is now unlocked below.
                    </p>
                )}
            </div>
        );
    }

    // ── Question form ──
    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ background: `${gold}20`, color: gold, borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' }}>
                        🧠 KNOWLEDGE CHECK
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: text }}>{quiz.quizTitle}</span>
                    <span style={{ fontSize: 11.5, color: muted, fontWeight: 600 }}>
                        {totalCount} question{totalCount === 1 ? '' : 's'} · pass {quiz.passingScoreThreshold ?? 60}%
                    </span>
                    {quiz.aiTutorEnabled === false ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: red, background: 'rgba(239,68,68,0.1)', borderRadius: 999, padding: '3px 10px' }}>🔒 AI Tutor disabled</span>
                    ) : null}
                </div>
                {timeLeft > 0 && (
                    <div style={{
                        background: timeLeft < 60 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        border: `1px solid ${timeLeft < 60 ? red + '50' : green + '50'}`,
                        color: timeLeft < 60 ? red : green,
                        padding: '6px 14px', borderRadius: 10, fontSize: 16, fontWeight: 800, fontFamily: 'monospace'
                    }}>
                        ⏱ {formatTime(timeLeft)}
                    </div>
                )}
            </div>

            <form onSubmit={handleManualSubmit}>
                {(quiz.questionArray || []).map((q, qi) => (
                    <div key={q._id || qi} style={{ background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${border}`, borderRadius: 14, padding: '15px 18px', marginBottom: 14 }}>
                        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: text }}>
                            <span style={{ color: accent, marginRight: 6 }}>Q{qi + 1}.</span>{q.questionText}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(q.options || []).map((opt, oi) => {
                                const selected = answers[q._id] === oi;
                                return (
                                    <label key={oi} onClick={() => { setAnswers(prev => ({ ...prev, [q._id]: oi })); setError(''); }} style={{
                                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                                        padding: '10px 14px', borderRadius: 10, fontSize: 13.5,
                                        color: text, transition: 'all 0.15s',
                                        border: `1.5px solid ${selected ? accent : border}`,
                                        background: selected ? `${accent}12` : 'transparent',
                                        fontWeight: selected ? 700 : 500
                                    }}>
                                        <input type="radio" name={`lq_${qi}`} checked={selected} onChange={() => {}} style={{ accentColor: accent, width: 16, height: 16 }} />
                                        {opt}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {totalCount === 0 && (
                    <div style={{ color: muted, fontSize: 13, padding: '12px 0' }}>This quiz has no questions yet — ask your instructor.</div>
                )}

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: red, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>⚠ {error}</div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: muted }}>{answeredCount}/{totalCount} answered</span>
                    <button type="submit" disabled={submitting} style={{
                        background: `linear-gradient(135deg, ${accent}, #15803d)`, color: '#fff', border: 'none',
                        borderRadius: 10, padding: '12px 30px', fontWeight: 800, fontSize: 14,
                        cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1
                    }}>
                        {submitting ? 'Submitting…' : 'Submit Answers'}
                    </button>
                </div>
            </form>
        </div>
    );
}