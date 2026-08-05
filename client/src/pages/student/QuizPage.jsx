import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizService, gradebookService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

export default function QuizPage() {
    const { colors, theme } = useTheme();
    const styles = {
        centerContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.bg, fontFamily: "'Segoe UI', sans-serif" },
        resultCard: { background: colors.bgCard, padding: '48px', borderRadius: '24px', border: '1px solid #334155', textAlign: 'center', maxWidth: '400px', width: '100%' },
        badge: { display:'inline-block', borderRadius:'8px', fontWeight:'700' },
        primaryBtn: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', width:'100%' },
        
        page: { minHeight: '100vh', background: colors.bg, fontFamily: "'Segoe UI', sans-serif", paddingBottom: '80px' },
        header: { background: colors.bgCard, borderBottom: '1px solid #334155', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 },
        title: { color: colors.text, fontSize: '24px', fontWeight: '800', margin: '0 0 4px' },
        subtitle: { color: colors.textMuted, fontSize: '14px', margin: 0 },
        timer: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '8px 16px', borderRadius: '12px', fontSize: '20px', fontWeight: '800', fontFamily: 'monospace' },
        timerWarning: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 16px', borderRadius: '12px', fontSize: '20px', fontWeight: '800', fontFamily: 'monospace', animation: 'pulse 1s infinite' },
        
        main: { maxWidth: '800px', margin: '0 auto', padding: '40px 20px' },
        questionCard: { background: colors.bgCard, border: '1px solid #334155', borderRadius: '16px', padding: '32px', marginBottom: '24px' },
        questionText: { color: colors.text, fontSize: '18px', fontWeight: '600', margin: '0 0 24px', lineHeight: '1.5', display: 'flex', gap: '12px', alignItems: 'flex-start' },
        qNum: { background: 'rgba(255,255,255,0.1)', color: colors.textMuted, padding: '2px 8px', borderRadius: '6px', fontSize: '14px', flexShrink: 0 },
        optionsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
        option: { display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' },
        optionSelected: { background: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f6' },
        radio: { width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #64748b', flexShrink: 0 },
        radioSelected: { width: '20px', height: '20px', borderRadius: '50%', border: '6px solid #3b82f6', background: '#fff', flexShrink: 0 },
        
        footer: { display: 'flex', justifyContent: 'flex-end', marginTop: '40px' },
        submitBtn: { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '12px', padding: '16px 48px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16,185,129,0.3)' }
    };
    const { quizId } = useParams();
    const navigate = useNavigate();
    
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        // Fetch quiz details
        quizService.getById(quizId)
            .then(res => {
                const q = res.data.data;
                setQuiz(q);
                setTimeLeft(q.allottedDurationMinutes * 60); // Convert to seconds
            })
            .catch(err => {
                alert("Quiz not found or you don't have access.");
                navigate('/student/dashboard');
            })
            .finally(() => setLoading(false));
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

    if (loading) return <div style={{ ...styles.centerContainer, background: colors.bg, color: colors.text }}>Loading Quiz...</div>;
    if (!quiz) return <div style={{ ...styles.centerContainer, background: colors.bg, color: colors.text }}>Quiz not found.</div>;

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
                            {result.passed ? 'PASSED ✓' : 'FAILED ✗'}
                        </div>
                        <button onClick={() => navigate('/student/dashboard')} style={styles.primaryBtn}>Return to Dashboard</button>
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
                                                background: isSelected ? (theme === 'dark' ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)') : 'transparent'
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

