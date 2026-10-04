import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizService, gradebookService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import { setAiTutorBlocked, clearAiTutorBlocked, AI_TUTOR_BLOCKED_MESSAGE } from '../../utils/aiTutorBlock';

export default function QuizPage() {
    const { colors, theme } = useTheme();
    const styles = {
        centerContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg, fontFamily: "'Segoe UI', sans-serif" },
        resultCard: { background: colors.bgCard, padding: '48px', borderRadius: '24px', border: '1px solid #334155', textAlign: 'center', maxWidth: '400px', width: '100%' },
        badge: { display:'inline-block', borderRadius:'8px', fontWeight:'700' },
        primaryBtn: { background: 'linear-gradient(135deg, #22c55e, #22c55e)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', width:'100%' },
        
        page: { minHeight: '100vh', background: colors.bg, fontFamily: "'Segoe UI', sans-serif", paddingBottom: '80px' },
        header: { background: colors.bgCard, borderBottom: '1px solid #334155', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 },
        title: { color: colors.text, fontSize: '24px', fontWeight: '800', margin: '0 0 4px' },
        subtitle: { color: colors.textMuted, fontSize: '14px', margin: 0 },
        timer: { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', padding: '8px 16px', borderRadius: '12px', fontSize: '20px', fontWeight: '800', fontFamily: 'monospace' },
        timerWarning: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 16px', borderRadius: '12px', fontSize: '20px', fontWeight: '800', fontFamily: 'monospace', animation: 'pulse 1s infinite' },
        
        main: { maxWidth: '800px', margin: '0 auto', padding: '40px 20px' },
        questionCard: { background: colors.bgCard, border: '1px solid #334155', borderRadius: '16px', padding: '32px', marginBottom: '24px' },
        questionText: { color: colors.text, fontSize: '18px', fontWeight: '600', margin: '0 0 24px', lineHeight: '1.5', display: 'flex', gap: '12px', alignItems: 'flex-start' },
        qNum: { background: 'rgba(255,255,255,0.1)', color: colors.textMuted, padding: '2px 8px', borderRadius: '6px', fontSize: '14px', flexShrink: 0 },
        optionsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
        option: { display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' },
        optionSelected: { background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e' },
        radio: { width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #64748b', flexShrink: 0 },
        radioSelected: { width: '20px', height: '20px', borderRadius: '50%', border: '6px solid #22c55e', background: '#fff', flexShrink: 0 },
        
        footer: { display: 'flex', justifyContent: 'flex-end', marginTop: '40px' },
        submitBtn: { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '12px', padding: '16px 48px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16,185,129,0.3)' }
    };
    const { quizId } = useParams();
    const navigate = useNavigate();
    
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [accessError, setAccessError] = useState(null);

    useEffect(() => {
        // Fetch quiz details
        quizService.getById(quizId)
            .then(res => {
                const q = res.data.data;
                setQuiz(q);
                setTimeLeft(q.allottedDurationMinutes * 60); // Convert to seconds
                // Emare AI Tutor restriction: hide & block the tutor while this
                // restricted quiz is open (server also enforces via ai-lock).
                if (q.aiTutorEnabled === false) setAiTutorBlocked(AI_TUTOR_BLOCKED_MESSAGE);
            })
            .catch(err => {
                // Sequential workflow: quiz locked because its lesson isn't unlocked yet
                if (err.response?.status === 403 && err.response?.data?.lessonLocked) {
                    setAccessError(err.response.data.lockReason || err.response.data.message || 'This quiz is not unlocked yet.');
                    return;
                }
                alert("Quiz not found or you don't have access.");
                navigate('/student/dashboard');
            });
        return () => clearAiTutorBlocked();
    }, [quizId, navigate]);

    // Timer logic
    useEffect(() => {
        if (!quiz || result || timeLeft <= 0) return;
        
        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    handleAutoSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(timerId);
    }, [quiz, result, timeLeft]); // Re-run effect setup if these change, but rely on functional state update

    const handleOptionSelect = (questionId, optionIndex) => {
        if(result) return; // Prevent changes if already submitted
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const submitPayload = async () => {
        setSubmitting(true);
        try {
            // Format answers array for API: { questionId, selectedIndex }
            const payload = Object.entries(answers).map(([questionId, selectedIndex]) => ({
                questionId, selectedIndex
            }));
            
            const res = await quizService.submitAttempt(quizId, payload);
            setResult(res.data.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit quiz.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if(window.confirm("Are you sure you want to submit your answers?")) {
            submitPayload();
        }
    };

    const handleAutoSubmit = () => {
        alert("Time is up! Submitting your answers automatically.");
        submitPayload();
    };

    const handleRetry = () => {
        setResult(null);
        setAnswers({});
        setTimeLeft(quiz.allottedDurationMinutes * 60);
    };

    if (accessError) {
        return (
            <div style={{ ...styles.centerContainer, background: colors.bg, color: colors.text, display: 'flex', flexDirection: 'column' }}>
                <Navbar />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <div style={{ ...styles.resultCard, background: colors.bgCard, borderColor: colors.border }}>
                        <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
                        <h2 style={{ margin: '0 0 8px', color: colors.text }}>Quiz locked</h2>
                        <p style={{ color: colors.textMuted, margin: '0 0 24px', lineHeight: 1.6 }}>{accessError}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button
                                onClick={() => quiz?.courseRef ? navigate(`/student/learn/${quiz.courseRef}`) : navigate('/student/dashboard')}
                                style={styles.primaryBtn}
                            >
                                Continue Learning
                            </button>
                            <button onClick={() => navigate('/student/dashboard')} style={{ ...styles.primaryBtn, background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}` }}>
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!quiz) return <div style={{ ...styles.centerContainer, background: colors.bg, color: colors.text }} />;

    if (result) {
        return (
            <div style={{ ...styles.centerContainer, background: colors.bg, color: colors.text, display: 'flex', flexDirection: 'column' }}>
                <Navbar />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <div style={{ ...styles.resultCard, background: colors.bgCard, borderColor: colors.border }}>
                        <h2 style={{margin:'0 0 8px', color: colors.text}}>Quiz Results</h2>
                        <div style={{fontSize:'48px', fontWeight:'900', color: result.passed ? '#10b981' : '#ef4444', margin:'16px 0'}}>
                            {result.scorePercentage}%
                        </div>
                        <p style={{color: colors.textMuted, margin:'0 0 24px'}}>
                            You scored {result.correctCount} out of {result.totalQuestions} correct.<br/>
                            Passing threshold: {result.passingThreshold}%
                        </p>
                        <div style={{...styles.badge, background: result.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: result.passed ? '#10b981' : '#ef4444', marginBottom:'24px', fontSize:'16px', padding:'8px 16px'}}>
                            {result.passed ? 'PASSED ' : 'FAILED '}
                        </div>
                        <p style={{ color: colors.textMuted, margin: '0 0 24px', fontSize: 12.5, lineHeight: 1.6 }}>
                            {result.attemptLimit > 1 && `Attempts used: ${result.attemptsUsed}/${result.attemptLimit}. `}
                            {!result.passed && result.attemptsLeft > 0
                                ? `You have ${result.attemptsLeft} attempt${result.attemptsLeft > 1 ? 's' : ''} left — try again to pass and unlock the next lesson.`
                                : result.passed
                                    ? 'The next lesson is now unlocked.'
                                    : 'You have used all your attempts for this quiz.'}
                        </p>
                        {!result.passed && result.attemptsLeft > 0 && (
                            <button onClick={handleRetry} style={{ ...styles.primaryBtn, marginBottom: 10 }}>
                                ↻ Try Again ({result.attemptsLeft} attempt{result.attemptsLeft > 1 ? 's' : ''} left)
                            </button>
                        )}
                        <button onClick={() => quiz.courseRef ? navigate(`/student/learn/${quiz.courseRef}`) : navigate('/student/dashboard')} style={{ ...styles.primaryBtn, background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, marginTop: 10 }}>
                            Continue Learning
                        </button>
                        <button onClick={() => navigate('/student/dashboard')} style={{ background: 'transparent', color: colors.textMuted, border: 'none', cursor: 'pointer', fontSize: 13, marginTop: 12 }}>Return to Dashboard</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...styles.page, background: colors.bg, color: colors.text }}>
            <Navbar />
            <header style={{ ...styles.header, background: colors.bgCard, borderColor: colors.border }}>
                <div>
                    <h1 style={{ ...styles.title, color: colors.text }}>{quiz.quizTitle}</h1>
                    <p style={{ ...styles.subtitle, color: colors.textMuted }}>Answer all questions before the timer expires.</p>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', background: quiz.aiTutorEnabled === false ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: quiz.aiTutorEnabled === false ? '#ef4444' : '#10b981' }}>
                        {quiz.aiTutorEnabled === false ? '🔒 Emare AI Tutor: Disabled for this quiz' : '⊡ Emare AI Tutor: Enabled'}
                    </span>
                </div>
                <div style={timeLeft < 60 ? styles.timerWarning : styles.timer}>
                    ⏱ {formatTime(timeLeft)}
                </div>
            </header>

            <main style={styles.main}>
                <form onSubmit={handleManualSubmit}>
                    {quiz.questionArray?.map((q, index) => (
                        <div key={q._id} style={{ ...styles.questionCard, background: colors.bgCard, borderColor: colors.border }}>
                            <h3 style={{ ...styles.questionText, color: colors.text }}>
                                <span style={styles.qNum}>Q{index + 1}</span> {q.questionText}
                            </h3>
                            <div style={styles.optionsList}>
                                {q.options.map((opt, optIndex) => {
                                    const isSelected = answers[q._id] === optIndex;
                                    return (
                                        <div 
                                            key={optIndex} 
                                            onClick={() => handleOptionSelect(q._id, optIndex)}
                                            style={{
                                                ...styles.option,
                                                borderColor: isSelected ? colors.primary : colors.border,
                                                background: isSelected ? (theme === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.08)') : 'transparent'
                                            }}
                                        >
                                            <div style={isSelected ? styles.radioSelected : styles.radio}></div>
                                            <span style={{color: isSelected ? colors.text : colors.textMuted}}>{opt}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div style={styles.footer}>
                        <button type="submit" disabled={submitting} style={styles.submitBtn}>
                            {submitting ? 'Submitting...' : 'Submit Quiz'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

