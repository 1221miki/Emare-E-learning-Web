import React from 'react';
import { quizService } from '../../../services/api';
import { BrainCircuit, Target, ClipboardList, Clock, CheckCircle2, BookOpen, Rocket } from 'lucide-react';

export default function QuizzesTab(dash) {
    const { colors, quizzesList, activeQuiz, setActiveQuiz, quizAnswers, setQuizAnswers, quizResult, setQuizResult, quizSubmitting, setQuizSubmitting, styles } = dash;
        const handleStartQuiz = (quiz) => {
            setActiveQuiz(quiz);
            setQuizAnswers({});
            setQuizResult(null);
        };

        const handleSubmitQuiz = async () => {
            if (!activeQuiz) return;
            setQuizSubmitting(true);
            try {
                const answersArray = Object.entries(quizAnswers).map(([questionIndex, selectedIndex]) => ({
                    questionIndex: parseInt(questionIndex),
                    selectedOptionIndex: parseInt(selectedIndex)
                }));
                const res = await quizService.submitAttempt(activeQuiz._id, answersArray);
                setQuizResult(res.data.data || res.data);
            } catch(err) {
                // Calculate locally as fallback
                let correct = 0;
                (activeQuiz.questions || []).forEach((q, i) => {
                    if (quizAnswers[i] !== undefined && parseInt(quizAnswers[i]) === q.correctOptionIndex) correct++;
                });
                const total = (activeQuiz.questions || []).length;
                const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                setQuizResult({ score: pct, correctAnswers: correct, totalQuestions: total, passed: pct >= (activeQuiz.passingScore || 60) });
            } finally {
                setQuizSubmitting(false);
            }
        };

        if (activeQuiz) {
            const questions = activeQuiz.questions || [];
            return (
                <div>
                    <button onClick={() => { setActiveQuiz(null); setQuizResult(null); }} style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: '14px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>← Back to Quizzes</button>

                    {quizResult ? (
                        <div style={{ ...styles.panelCard, textAlign: 'center', padding: '48px' }}>
                            <div style={{ fontSize: '64px', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                                {quizResult.passed
                                    ? <CheckCircle2 size={64} color={colors.success} aria-hidden="true" />
                                    : <BookOpen size={64} color={colors.primary} aria-hidden="true" />
                                }
                            </div>
                            <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: '800', margin: '0 0 8px' }}>{quizResult.passed ? 'Quiz Passed!' : 'Keep Practicing!'}</h2>
                            <p style={{ color: colors.textMuted, fontSize: '14px', margin: '0 0 24px' }}>{activeQuiz.quizTitle}</p>
                            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
                                <div style={{ padding: '20px 32px', borderRadius: '16px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                    <div style={{ fontSize: '36px', fontWeight: '800', color: quizResult.passed ? colors.success : '#ef4444' }}>{quizResult.score}%</div>
                                    <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>Score</div>
                                </div>
                                <div style={{ padding: '20px 32px', borderRadius: '16px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                                    <div style={{ fontSize: '36px', fontWeight: '800', color: colors.text }}>{quizResult.correctAnswers}/{quizResult.totalQuestions}</div>
                                    <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>Correct</div>
                                </div>
                            </div>
                            <button onClick={() => { setActiveQuiz(null); setQuizResult(null); }} style={styles.resumeBtn}>Back to All Quizzes</button>
                        </div>
                    ) : (
                        <div style={styles.panelCard}>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: '800', margin: '0 0 8px' }}>{activeQuiz.quizTitle}</h2>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: colors.textMuted }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ClipboardList size={14} aria-hidden="true" /> {questions.length} Questions</span>
                                    {activeQuiz.timeLimitMinutes && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} aria-hidden="true" /> {activeQuiz.timeLimitMinutes} min</span>}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Target size={14} aria-hidden="true" /> Passing Score: {activeQuiz.passingScore || 60}%</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {questions.map((q, qi) => (
                                    <div key={qi} style={{ padding: '20px', borderRadius: '12px', background: colors.bgInput, border: `1px solid ${quizAnswers[qi] !== undefined ? colors.primary + '40' : colors.border}` }}>
                                        <p style={{ color: colors.text, fontSize: '15px', fontWeight: '600', margin: '0 0 16px' }}><span style={{ color: colors.primary, fontWeight: '800' }}>Q{qi + 1}.</span> {q.questionText}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {(q.options || []).map((opt, oi) => (
                                                <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${quizAnswers[qi] === String(oi) ? colors.primary : colors.border}`, background: quizAnswers[qi] === String(oi) ? `${colors.primary}10` : 'transparent', transition: 'all 0.15s' }}>
                                                    <input
                                                        type="radio"
                                                        name={`q_${qi}`}
                                                        value={oi}
                                                        checked={quizAnswers[qi] === String(oi)}
                                                        onChange={() => setQuizAnswers(prev => ({ ...prev, [qi]: String(oi) }))}
                                                        style={{ accentColor: colors.primary, width: '16px', height: '16px' }}
                                                    />
                                                    <span style={{ color: colors.text, fontSize: '14px' }}>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <span style={{ color: colors.textMuted, fontSize: '13px', alignSelf: 'center' }}>{Object.keys(quizAnswers).length}/{questions.length} answered</span>
                                <button
                                    onClick={handleSubmitQuiz}
                                    disabled={quizSubmitting || Object.keys(quizAnswers).length === 0}
                                    style={{ ...styles.resumeBtn, opacity: Object.keys(quizAnswers).length === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
                                    aria-label="Submit Quiz"
                                >
                                    <Rocket size={16} aria-hidden="true" /> {quizSubmitting ? 'Submitting...' : 'Submit Quiz'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div>
                <div style={styles.tabHeader}>
                    <h2 style={{ ...styles.tabTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BrainCircuit size={20} aria-hidden="true" /> Quizzes &amp; Assessments
                    </h2>
                    <p style={styles.tabSubtitle}>Take quizzes from your enrolled courses and test your knowledge</p>
                </div>
                {quizzesList.length === 0 ? (
                    <div style={styles.emptyContent}>
                        <Target size={48} color={colors.textMuted} style={{ marginBottom: '16px' }} aria-hidden="true" />
                        <p style={styles.emptyText}>No quizzes available for your courses yet. Check back after lessons are published.</p>
                    </div>
                ) : (
                    <div style={styles.courseGrid}>
                        {quizzesList.map((quiz) => (
                            <div key={quiz._id} style={{ ...styles.courseCard, cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <span style={styles.courseBadge}>{quiz.quizType || 'MCQ'}</span>
                                    <span style={{ fontSize: '11px', color: colors.textMuted }}>{quiz.totalMarks || 100} pts</span>
                                </div>
                                <h3 style={{ ...styles.courseTitle, marginBottom: '8px' }}>{quiz.quizTitle || 'Course Quiz'}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '12px', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}><ClipboardList size={13} aria-hidden="true" /> {(quiz.questions || []).length} Questions</span>
                                    {quiz.timeLimitMinutes && <span style={{ fontSize: '12px', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={13} aria-hidden="true" /> {quiz.timeLimitMinutes} min time limit</span>}
                                    <span style={{ fontSize: '12px', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}><Target size={13} aria-hidden="true" /> Pass at {quiz.passingScore || 60}%</span>
                                </div>
                                <button onClick={() => handleStartQuiz(quiz)} style={{ ...styles.watchBtn, width: '100%' }}>Start Quiz →</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
}
