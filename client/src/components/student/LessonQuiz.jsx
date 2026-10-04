/**
 * LessonQuiz.jsx
 *
 * In-workspace "Knowledge Check" — the quiz linked to the CURRENT lesson,
 * embedded directly in the Learning Workspace so a student never leaves the
 * workspace to attempt or retake a lesson quiz.
 *
 * Question flow (per question):
 *   Attempt 1 → Incorrect → "2 attempts remaining" → try again
 *   Attempt 2 → Incorrect → "1 attempt remaining"  → try again
 *   Attempt 3 → Incorrect → reveal the correct answer
 *   Student selects the revealed correct answer → question completed
 *
 * The three-attempt counter and "answer revealed" state are persisted
 * server-side (QuestionAttempt), so refreshing or logging out can never reset
 * them. Once every question is completed the quiz is marked passed (a 100%
 * GradeBook row is written), which unlocks the assignment and the next lesson
 * through the existing sequential progression.
 */
import React, { useEffect, useRef, useState } from 'react';
import { quizService } from '../../services/api';
import { setAiTutorBlocked, clearAiTutorBlocked, AI_TUTOR_BLOCKED_MESSAGE } from '../../utils/aiTutorBlock';

const MAX_ATTEMPTS = 3;

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
    const [locked, setLocked] = useState('');
    const [error, setError] = useState('');

    // Per-question state keyed by question _id.
    const [tracking, setTracking] = useState({});      // { questionId: { relevantAttempts, correctAnswerRevealed, answered } }
    const [selections, setSelections] = useState({});  // { questionId: selectedIndex }
    const [feedback, setFeedback] = useState({});      // { questionId: { type, message, correctIndex, explanation } }
    const [checking, setChecking] = useState(null);    // questionId currently being validated
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [completionError, setCompletionError] = useState('');
    const onOutcomeRef = useRef(onOutcome);
    onOutcomeRef.current = onOutcome;

    useEffect(() => {
        if (!quizId) return;
        let cancelled = false;

        Promise.all([
            quizService.getById(quizId),
            quizService.getTracking(quizId).catch(() => null)
        ])
            .then(([quizRes, trackingRes]) => {
                if (cancelled) return;
                const q = quizRes.data?.data;
                setQuiz(q);
                if (q?.aiTutorEnabled === false) setAiTutorBlocked(AI_TUTOR_BLOCKED_MESSAGE);

                // Restore persisted per-question state (survives page refresh).
                const initial = {};
                const rows = trackingRes?.data?.data || [];
                const questionCount = q?.questionArray?.length || 0;
                rows.forEach(r => {
                    initial[r.questionId] = {
                        attemptsUsed: r.attemptsUsed,
                        correctAnswerRevealed: !!r.correctAnswerRevealed,
                        answered: !!r.answered
                    };
                });
                // Pre-seed unanswered questions in a stable shape.
                (q?.questionArray || []).forEach(qq => {
                    if (!initial[qq._id]) initial[qq._id] = { attemptsUsed: 0, correctAnswerRevealed: false, answered: false };
                });
                setTracking(initial);
                setQuizCompleted(rows.filter(r => r.answered).length >= questionCount && questionCount > 0);
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

    const checkAnswer = async (questionId, selectedIndex) => {
        if (!quiz || checking) return;
        if (selectedIndex === undefined || selectedIndex === null) return;
        setChecking(questionId);
        setCompletionError('');
        try {
            const res = await quizService.checkQuestion(quizId, questionId, selectedIndex);
            const d = res.data?.data;
            const t = tracking[questionId] || { attemptsUsed: 0, correctAnswerRevealed: false, answered: false };

            setTracking(prev => ({
                ...prev,
                [questionId]: {
                    attemptsUsed: d.attemptsUsed,
                    correctAnswerRevealed: !!d.answerRevealed,
                    answered: !!d.answered
                }
            }));

            // Build feedback for this question.
            if (d.answered) {
                setFeedback(prev => ({
                    ...prev,
                    [questionId]: {
                        type: 'correct',
                        message: 'Correct — question completed.',
                        correctIndex: null,
                        explanation: null
                    }
                }));
            } else if (d.answerRevealed) {
                setFeedback(prev => ({
                    ...prev,
                    [questionId]: {
                        type: 'revealed',
                        message: `You have used all ${MAX_ATTEMPTS} attempts. The correct answer is shown below — select it to continue.`,
                        correctIndex: d.correctAnswerIndex,
                        explanation: d.explanation
                    }
                }));
            } else {
                setFeedback(prev => ({
                    ...prev,
                    [questionId]: {
                        type: 'incorrect',
                        message: `Incorrect. ${d.attemptsLeft > 0 ? `${d.attemptsLeft} attempt${d.attemptsLeft > 1 ? 's' : ''} remaining.` : 'No attempts remaining.'}`,
                        correctIndex: null,
                        explanation: null
                    }
                }));
            }

            if (d.quizCompleted) {
                setQuizCompleted(true);
                if (onOutcomeRef.current) onOutcomeRef.current({ passed: true });
            }
        } catch (err) {
            setCompletionError(err.response?.data?.message || 'Failed to check that answer. Please try again.');
        } finally {
            setChecking(null);
        }
    };

    // ── Derived counts ───────────────────────────────────────────────────────
    const questions = quiz?.questionArray || [];
    const answeredCount = questions.filter(q => tracking[q._id]?.answered).length;
    const totalCount = questions.length;
    const allDone = totalCount > 0 && answeredCount >= totalCount;

    const tFor = (qid) => tracking[qid] || { attemptsUsed: 0, correctAnswerRevealed: false, answered: false };
    const fbFor = (qid) => feedback[qid];

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

    // ── Quiz completed banner ──
    if (allDone) {
        return (
            <div style={{ ...cardStyle, background: isDark ? '#10281f' : '#f0fdf4', borderColor: `${green}55` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>✅</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: text }}>
                            {quizCompleted ? 'Knowledge Check completed!' : 'Knowledge Check completed!'}
                        </div>
                        <div style={{ fontSize: 13, color: green, marginTop: 4, fontWeight: 600, lineHeight: 1.6 }}>
                            You have completed all {totalCount} question{totalCount === 1 ? '' : 's'}. Your assignment (if required) and the next lesson are now unlocked.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Question-by-question flow ──
    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ background: `${gold}20`, color: gold, borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' }}>
                        🧠 KNOWLEDGE CHECK
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: text }}>{quiz.quizTitle}</span>
                    <span style={{ fontSize: 11.5, color: muted, fontWeight: 600 }}>
                        {totalCount} question{totalCount === 1 ? '' : 's'} · up to {MAX_ATTEMPTS} attempts each
                    </span>
                    {quiz.aiTutorEnabled === false ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: red, background: 'rgba(239,68,68,0.1)', borderRadius: 999, padding: '3px 10px' }}>🔒 AI Tutor disabled</span>
                    ) : null}
                </div>
                <span style={{ fontSize: 12, color: muted, fontWeight: 700 }}>{answeredCount}/{totalCount} completed</span>
            </div>

            {completionError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: red, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>⚠ {completionError}</div>
            )}

            {questions.map((q, qi) => {
                const t = tFor(q._id);
                const fb = fbFor(q._id);
                const answered = t.answered;
                const revealed = t.correctAnswerRevealed;
                const selected = selections[q._id];
                const attemptsLeft = Math.max(0, MAX_ATTEMPTS - t.attemptsUsed);

                // Option styling helper.
                const optionStyle = (oi) => {
                    if (answered) {
                        return { borderColor: `${green}66`, background: `${green}14`, color: text, fontWeight: 600 };
                    }
                    if (revealed && oi === fb?.correctIndex) {
                        return { borderColor: gold, background: `${gold}18`, color: text, fontWeight: 800 };
                    }
                    if (revealed) {
                        return { borderColor: `${red}55`, color: text, background: 'rgba(239,68,68,0.05)', fontWeight: 500 };
                    }
                    const isSel = selected === oi;
                    return {
                        borderColor: isSel ? accent : border,
                        background: isSel ? `${accent}12` : 'transparent',
                        color: text,
                        fontWeight: isSel ? 700 : 500
                    };
                };

                return (
                    <div key={q._id || qi} style={{ background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${border}`, borderRadius: 14, padding: '15px 18px', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: text, flex: 1, minWidth: 0 }}>
                                <span style={{ color: accent, marginRight: 6 }}>Q{qi + 1}.</span>{q.questionText}
                            </p>
                            {!answered && (
                                <span style={{
                                    fontSize: 11, fontWeight: 800, flexShrink: 0,
                                    color: attemptsLeft === 3 ? muted : (attemptsLeft === 0 ? red : gold),
                                    padding: '3px 10px', borderRadius: 999,
                                    background: attemptsLeft === 3 ? 'rgba(0,0,0,0.04)' : (attemptsLeft === 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.12)')
                                }}>
                                    {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left
                                </span>
                            )}
                        </div>

                        {/* Options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                            {(q.options || []).map((opt, oi) => {
                                const st = optionStyle(oi);
                                const isRevealedCorrect = revealed && oi === fb?.correctIndex && !answered;
                                const clickable = !answered && !checking;
                                return (
                                    <label
                                        key={oi}
                                        onClick={() => {
                                            if (!clickable) return;
                                            setSelections(prev => ({ ...prev, [q._id]: oi }));
                                            setFeedback(prev => {
                                                const n = { ...prev };
                                                delete n[q._id];
                                                return n;
                                            });
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10, cursor: clickable ? 'pointer' : 'default',
                                            padding: '10px 14px', borderRadius: 10, fontSize: 13.5,
                                            color: st.color, transition: 'all 0.15s',
                                            border: `1.5px solid ${st.borderColor}`,
                                            background: st.background,
                                            fontWeight: st.fontWeight
                                        }}
                                    >
                                        {isRevealedCorrect && <span style={{ flexShrink: 0 }}>✅</span>}
                                        {!isRevealedCorrect && (
                                            <input
                                                type="radio"
                                                name={`lq_${qi}`}
                                                checked={selected === oi}
                                                onChange={() => {}}
                                                disabled={answered || !!checking}
                                                style={{ accentColor: accent, width: 16, height: 16, flexShrink: 0 }}
                                            />
                                        )}
                                        <span style={{ flex: 1 }}>{opt}</span>
                                        {isRevealedCorrect && <span style={{ flexShrink: 0, color: gold, fontSize: 11, fontWeight: 800 }}>CORRECT ANSWER</span>}
                                    </label>
                                );
                            })}
                        </div>

                        {/* Feedback / attempts remaining */}
                        {fb && (
                            <div style={{
                                marginTop: 12, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, lineHeight: 1.5,
                                color: fb.type === 'incorrect' ? red : (fb.type === 'correct' ? green : gold),
                                background: fb.type === 'incorrect' ? 'rgba(239,68,68,0.08)' : (fb.type === 'correct' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.1)'),
                                border: `1px solid ${fb.type === 'incorrect' ? red + '40' : (fb.type === 'correct' ? green + '40' : gold + '40')}`
                            }}>
                                {fb.message}
                                {fb.type === 'revealed' && fb.correctIndex !== null && (
                                    <div style={{ marginTop: 6, fontSize: 13, color: text }}>
                                        The correct answer is: <strong style={{ color: gold }}>{q.options[fb.correctIndex]}</strong>
                                    </div>
                                )}
                                {fb.type === 'revealed' && fb.explanation && (
                                    <div style={{ marginTop: 6, fontSize: 12.5, color: muted, fontWeight: 500 }}>💡 {fb.explanation}</div>
                                )}
                                {fb.type === 'revealed' && (
                                    <div style={{ marginTop: 8, fontSize: 12.5, color: text, fontWeight: 600 }}>
                                        Select the correct answer above, then press "Check Answer".
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action button */}
                        {!answered && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                                <button
                                    disabled={selected === undefined || !!checking}
                                    onClick={() => checkAnswer(q._id, selected)}
                                    style={{
                                        background: `linear-gradient(135deg, ${accent}, #15803d)`, color: '#fff', border: 'none',
                                        borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 13,
                                        cursor: (selected === undefined || checking) ? 'not-allowed' : 'pointer', opacity: (selected === undefined || checking) ? 0.6 : 1
                                    }}
                                >
                                    {checking === q._id ? 'Checking…' : 'Check Answer'}
                                </button>
                            </div>
                        )}

                        {answered && (
                            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: green, background: 'rgba(16,185,129,0.08)', border: `1px solid ${green}40` }}>
                                ✓ Completed
                            </div>
                        )}
                    </div>
                );
            })}

            {totalCount === 0 && (
                <div style={{ color: muted, fontSize: 13, padding: '12px 0' }}>This quiz has no questions yet — ask your instructor.</div>
            )}
        </div>
    );
}
