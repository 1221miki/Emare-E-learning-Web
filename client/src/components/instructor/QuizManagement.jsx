import React, { useState, useEffect } from 'react';
import { quizService } from '../../services/api';
import { FileQuestion, PlusCircle, Edit3, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export default function QuizManagement({ courses = [], colors = {}, s = {} }) {
    const [quizzes, setQuizzes] = useState([]);
    const [quizSearch, setQuizSearch] = useState('');
    const [quizCourseFilter, setQuizCourseFilter] = useState('all');
    const [showQuizCreateModal, setShowQuizCreateModal] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState(null);
    const [quizToast, setQuizToast] = useState('');
    const [savingQuiz, setSavingQuiz] = useState(false);

    // Quiz form state
    const [qForm, setQForm] = useState({
        courseRef: '',
        quizTitle: '',
        allottedDurationMinutes: 15,
        passingScoreThreshold: 60,
        attemptLimit: 1,
        questionArray: []
    });

    // Question form state
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [editingQuestionIdx, setEditingQuestionIdx] = useState(null);
    const [questionForm, setQuestionForm] = useState({
        questionText: '',
        type: 'mcq',
        options: ['', '', '', ''],
        correctAnswerIndex: 0,
        correctAnswers: [],
        points: 1,
        explanation: ''
    });

    const showQuizToast = (msg) => {
        setQuizToast(msg);
        setTimeout(() => setQuizToast(''), 3500);
    };

    // Fetch quizzes
    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const res = await quizService.getInstructorQuizzes();
            setQuizzes(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch quizzes:', err);
            setQuizzes([]);
        }
    };

    // Filter quizzes
    const filteredQuizzes = quizzes.filter(q => {
        const matchSearch = q.quizTitle?.toLowerCase().includes(quizSearch.toLowerCase());
        const matchCourse = quizCourseFilter === 'all' || q.courseRef?._id === quizCourseFilter || q.courseRef === quizCourseFilter;
        return matchSearch && matchCourse;
    });

    // Open create modal
    const openCreateQuiz = () => {
        setEditingQuiz(null);
        setQForm({
            courseRef: courses[0]?._id || '',
            quizTitle: '',
            allottedDurationMinutes: 15,
            passingScoreThreshold: 60,
            attemptLimit: 1,
            questionArray: []
        });
        setShowQuestionForm(false);
        setShowQuizCreateModal(true);
    };

    // Open edit modal
    const openEditQuiz = (quiz) => {
        setEditingQuiz(quiz);
        setQForm({
            courseRef: quiz.courseRef?._id || quiz.courseRef || '',
            quizTitle: quiz.quizTitle || '',
            allottedDurationMinutes: quiz.allottedDurationMinutes || 15,
            passingScoreThreshold: quiz.passingScoreThreshold || 60,
            attemptLimit: quiz.attemptLimit || 1,
            questionArray: quiz.questionArray || []
        });
        setShowQuestionForm(false);
        setShowQuizCreateModal(true);
    };

    // Save quiz (create or update)
    const handleSaveQuiz = async () => {
        if (!qForm.quizTitle.trim()) { alert('Please enter a quiz title.'); return; }
        if (!qForm.courseRef) { alert('Please select a course.'); return; }
        if (qForm.questionArray.length === 0) { alert('Please add at least one question.'); return; }

        setSavingQuiz(true);
        try {
            if (editingQuiz) {
                const res = await quizService.update(editingQuiz._id, qForm);
                setQuizzes(quizzes.map(q => q._id === editingQuiz._id ? res.data.data : q));
                showQuizToast('Quiz updated successfully!');
            } else {
                const res = await quizService.create(qForm);
                setQuizzes([res.data.data, ...quizzes]);
                showQuizToast('Quiz created successfully!');
            }
            setShowQuizCreateModal(false);
            fetchQuizzes();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save quiz.');
        }
        setSavingQuiz(false);
    };

    // Delete quiz
    const handleDeleteQuiz = async (quizId) => {
        if (!window.confirm('Are you sure you want to delete this quiz?')) return;
        try {
            await quizService.delete(quizId);
            setQuizzes(quizzes.filter(q => q._id !== quizId));
            showQuizToast('Quiz deleted.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete quiz.');
        }
    };

    // Add question to form
    const handleAddQuestion = () => {
        if (!questionForm.questionText.trim()) { alert('Please enter question text.'); return; }
        if (questionForm.type === 'mcq' && questionForm.options.some(o => !o.trim())) { alert('Please fill all MCQ options.'); return; }

        const newQ = { ...questionForm };
        if (questionForm.type === 'tf') {
            newQ.options = ['True', 'False'];
        }
        if (questionForm.type === 'short') {
            newQ.options = [];
            newQ.correctAnswerIndex = undefined;
        }

        if (editingQuestionIdx !== null) {
            const updated = [...qForm.questionArray];
            updated[editingQuestionIdx] = newQ;
            setQForm({ ...qForm, questionArray: updated });
            setEditingQuestionIdx(null);
        } else {
            setQForm({ ...qForm, questionArray: [...qForm.questionArray, newQ] });
        }

        setQuestionForm({ questionText: '', type: 'mcq', options: ['', '', '', ''], correctAnswerIndex: 0, correctAnswers: [], points: 1, explanation: '' });
        setShowQuestionForm(false);
    };

    // Remove question
    const removeQuestion = (idx) => {
        const updated = qForm.questionArray.filter((_, i) => i !== idx);
        setQForm({ ...qForm, questionArray: updated });
    };

    // Reorder question
    const moveQuestion = (idx, dir) => {
        const arr = [...qForm.questionArray];
        const target = dir === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= arr.length) return;
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        setQForm({ ...qForm, questionArray: arr });
    };

    // Edit question
    const editQuestion = (idx) => {
        setEditingQuestionIdx(idx);
        setQuestionForm({ ...qForm.questionArray[idx] });
        setShowQuestionForm(true);
    };

    // Local styles for quiz section
    const qs = {
        badge: (active) => ({
            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
            background: active ? '#d1fae5' : '#fef3c7',
            color: active ? '#065f46' : '#92400e',
            border: `2px solid ${active ? '#6ee7b7' : '#fcd34d'}`
        }),
        questionCard: {
            background: '#f0f4ff', borderRadius: '12px', padding: '16px',
            border: '2px solid #c7d2fe', marginBottom: '12px'
        },
        typeBadge: (type) => ({
            padding: '2px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            background: type === 'mcq' ? '#dbeafe' : type === 'tf' ? '#f3e8ff' : '#fce7f3',
            color: type === 'mcq' ? '#1e40af' : type === 'tf' ? '#6d28d9' : '#be185d'
        }),
        correctOption: {
            background: '#d1fae5', border: '2px solid #6ee7b7',
            borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#065f46', fontWeight: '600'
        },
        normalOption: {
            background: '#f0f4ff', border: '2px solid #c7d2fe',
            borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#4f46e5'
        }
    };

    const totalPoints = qForm.questionArray.reduce((sum, q) => sum + (q.points || 1), 0);

    return (
        <div>
            {/* Toast */}
            {quizToast && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 2000, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', padding: '14px 24px', borderRadius: '12px', fontWeight: 700, boxShadow: '0 8px 32px rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                     {quizToast}
                </div>
            )}

            {/* Header */}
            <div style={s.tabHeader}>
                <h2 style={s.tabTitle}>Quizzes</h2>
                <p style={s.tabSubtitle}>Build and publish quizzes for course assessment.</p>
            </div>

            {/* Action Bar */}
            <div style={{ ...s.panelCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '240px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, fontSize: '14px' }}>⌕</span>
                        <input
                            style={{ ...s.input, paddingLeft: '36px', width: '100%' }}
                            placeholder="Search quizzes..."
                            value={quizSearch}
                            onChange={(e) => setQuizSearch(e.target.value)}
                        />
                    </div>
                    <select
                        style={{ ...s.select, minWidth: '180px' }}
                        value={quizCourseFilter}
                        onChange={(e) => setQuizCourseFilter(e.target.value)}
                    >
                        <option value="all">All Courses</option>
                        {courses.map(c => (
                            <option key={c._id} value={c._id}>{c.courseTitle}</option>
                        ))}
                    </select>
                </div>
                <button onClick={openCreateQuiz} style={s.primaryBtn}>
                    <PlusCircle size={16} style={{ marginRight: '6px' }} /> Create New Quiz
                </button>
            </div>

            {/* Stats Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div style={s.panelCard}>
                    <span style={{ fontSize: '11px', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Total Quizzes</span>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>{quizzes.length}</div>
                </div>
                <div style={s.panelCard}>
                    <span style={{ fontSize: '11px', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Active</span>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>{quizzes.filter(q => q.isActive !== false).length}</div>
                </div>
                <div style={s.panelCard}>
                    <span style={{ fontSize: '11px', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Total Questions</span>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>{quizzes.reduce((sum, q) => sum + (q.questionArray?.length || 0), 0)}</div>
                </div>
            </div>

            {/* Quizzes Table */}
            <div style={s.tableCard}>
                {filteredQuizzes.length === 0 ? (
                    <div style={{ ...s.emptyBox, margin: '20px' }}>
                        <FileQuestion size={40} style={{ color: colors.textMuted, marginBottom: '12px' }} />
                        <p style={s.emptyText}>{quizzes.length === 0 ? 'No quizzes yet. Create your first quiz!' : 'No quizzes match your search.'}</p>
                        {quizzes.length === 0 && (
                            <button onClick={openCreateQuiz} style={{ ...s.primaryBtn, marginTop: '16px' }}>
                                <PlusCircle size={16} style={{ marginRight: '6px' }} /> Create First Quiz
                            </button>
                        )}
                    </div>
                ) : (
                    <table style={s.table}>
                        <thead>
                            <tr style={s.thRow}>
                                <th style={s.th}>Quiz Title & Course</th>
                                <th style={s.th}>Questions</th>
                                <th style={s.th}>Duration & Pass %</th>
                                <th style={s.th}>Status</th>
                                <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQuizzes.map((quiz) => (
                                <tr key={quiz._id} style={s.tr}>
                                    <td style={s.td}>
                                        <div style={{ fontWeight: 700, color: colors.text, marginBottom: '3px' }}>{quiz.quizTitle}</div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted }}>
                                            {quiz.courseRef?.courseTitle || 'Unknown Course'}
                                        </div>
                                    </td>
                                    <td style={s.td}>
                                        <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{quiz.questionArray?.length || 0}</span>
                                        <span style={{ color: colors.textMuted, fontSize: '12px' }}> questions</span>
                                    </td>
                                    <td style={s.td}>
                                        <div style={{ color: colors.text, fontWeight: 600 }}>⏱ {quiz.allottedDurationMinutes} mins</div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted }}>Pass: {quiz.passingScoreThreshold}%</div>
                                    </td>
                                    <td style={s.td}>
                                        <span style={qs.badge(quiz.isActive !== false)}>
                                            {quiz.isActive !== false ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ ...s.td, textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => openEditQuiz(quiz)}
                                                style={{ ...s.actionBtn, padding: '5px 10px' }}
                                                title="Edit Quiz"
                                            >
                                                <Edit3 size={14} style={{ marginRight: '4px' }} /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuiz(quiz._id)}
                                                style={{ ...s.dangerBtn, padding: '5px 10px' }}
                                                title="Delete Quiz"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── CREATE / EDIT QUIZ MODAL ──────────────────────── */}
            {showQuizCreateModal && (
                <div style={s.backdrop}>
                    <div style={{ ...s.modal, maxWidth: '760px', maxHeight: '90vh', overflow: 'auto' }}>
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>
                                {editingQuiz ? '️ Edit Quiz' : '🆕 Create New Quiz'}
                            </h3>
                            <button onClick={() => setShowQuizCreateModal(false)} style={s.closeBtn}></button>
                        </div>
                        <div style={s.modalBody}>
                            {/* Quiz Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                                <div style={s.formGroup}>
                                    <label style={s.label}>Quiz Title *</label>
                                    <input
                                        style={s.input}
                                        placeholder="e.g. MERN Stack Fundamentals Exam"
                                        value={qForm.quizTitle}
                                        onChange={(e) => setQForm({ ...qForm, quizTitle: e.target.value })}
                                    />
                                </div>

                                <div style={s.formGrid}>
                                    <div style={s.formGroup}>
                                        <label style={s.label}>Course *</label>
                                        <select
                                            style={s.select}
                                            value={qForm.courseRef}
                                            onChange={(e) => setQForm({ ...qForm, courseRef: e.target.value })}
                                        >
                                            <option value="">Select a course...</option>
                                            {courses.map(c => (
                                                <option key={c._id} value={c._id}>{c.courseTitle}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={s.formGroup}>
                                        <label style={s.label}>Duration (minutes)</label>
                                        <input
                                            type="number"
                                            style={s.input}
                                            min={5}
                                            max={180}
                                            value={qForm.allottedDurationMinutes}
                                            onChange={(e) => setQForm({ ...qForm, allottedDurationMinutes: parseInt(e.target.value) || 15 })}
                                        />
                                    </div>
                                </div>

                                <div style={s.formGrid}>
                                    <div style={s.formGroup}>
                                        <label style={s.label}>Passing Score (%)</label>
                                        <input
                                            type="number"
                                            style={s.input}
                                            min={0}
                                            max={100}
                                            value={qForm.passingScoreThreshold}
                                            onChange={(e) => setQForm({ ...qForm, passingScoreThreshold: parseInt(e.target.value) || 60 })}
                                        />
                                    </div>
                                    <div style={s.formGroup}>
                                        <label style={s.label}>Max Attempts</label>
                                        <input
                                            type="number"
                                            style={s.input}
                                            min={1}
                                            max={10}
                                            value={qForm.attemptLimit}
                                            onChange={(e) => setQForm({ ...qForm, attemptLimit: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{ borderTop: '2px solid #e0e7ff', margin: '0 0 20px', paddingTop: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div>
                                        <h4 style={{ margin: 0, color: colors.text, fontSize: '16px', fontWeight: 700 }}>
                                            Questions ({qForm.questionArray.length})
                                        </h4>
                                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Total Points: {totalPoints}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingQuestionIdx(null);
                                            setQuestionForm({ questionText: '', type: 'mcq', options: ['', '', '', ''], correctAnswerIndex: 0, correctAnswers: [], points: 1, explanation: '' });
                                            setShowQuestionForm(true);
                                        }}
                                        style={s.actionBtn}
                                    >
                                        + Add Question
                                    </button>
                                </div>

                                {/* Questions List */}
                                {qForm.questionArray.length === 0 && !showQuestionForm && (
                                    <div style={{ padding: '40px 20px', textAlign: 'center', border: '2px dashed #c7d2fe', borderRadius: '12px' }}>
                                        <FileQuestion size={36} style={{ color: colors.textMuted, marginBottom: '10px' }} />
                                        <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>No questions yet. Add your first question above.</p>
                                    </div>
                                )}

                                {qForm.questionArray.map((q, idx) => (
                                    <div key={idx} style={qs.questionCard}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
                                                    {idx + 1}
                                                </span>
                                                <span style={qs.typeBadge(q.type)}>
                                                    {q.type === 'mcq' ? 'MCQ' : q.type === 'tf' ? 'True/False' : 'Short Answer'}
                                                </span>
                                                <span style={{ fontSize: '11px', color: colors.textMuted }}>{q.points || 1} pts</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={() => moveQuestion(idx, 'up')} disabled={idx === 0} style={{ ...s.actionBtnAlt, padding: '4px 6px', opacity: idx === 0 ? 0.3 : 1 }} title="Move Up"><ArrowUp size={12} /></button>
                                                <button onClick={() => moveQuestion(idx, 'down')} disabled={idx === qForm.questionArray.length - 1} style={{ ...s.actionBtnAlt, padding: '4px 6px', opacity: idx === qForm.questionArray.length - 1 ? 0.3 : 1 }} title="Move Down"><ArrowDown size={12} /></button>
                                                <button onClick={() => editQuestion(idx)} style={{ ...s.actionBtn, padding: '4px 8px', fontSize: '11px' }}><Edit3 size={11} /></button>
                                                <button onClick={() => removeQuestion(idx)} style={{ ...s.dangerBtn, padding: '4px 8px', fontSize: '11px' }}><Trash2 size={11} /></button>
                                            </div>
                                        </div>
                                        <div style={{ color: colors.text, fontSize: '14px', fontWeight: 600, marginBottom: '8px', paddingLeft: '38px' }}>{q.questionText}</div>
                                        {q.type === 'mcq' && q.options && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingLeft: '38px' }}>
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} style={oIdx === q.correctAnswerIndex ? qs.correctOption : qs.normalOption}>
                                                        <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt} {oIdx === q.correctAnswerIndex && ' '}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {q.type === 'tf' && (
                                            <div style={{ paddingLeft: '38px', display: 'flex', gap: '8px' }}>
                                                <span style={q.correctAnswerIndex === 0 ? qs.correctOption : qs.normalOption}>True {q.correctAnswerIndex === 0 && ''}</span>
                                                <span style={q.correctAnswerIndex === 1 ? qs.correctOption : qs.normalOption}>False {q.correctAnswerIndex === 1 && ''}</span>
                                            </div>
                                        )}
                                        {q.type === 'short' && q.correctAnswers?.length > 0 && (
                                            <div style={{ paddingLeft: '38px', fontSize: '12px', color: colors.textMuted }}>
                                                Expected: <strong style={{ color: '#3b82f6' }}>{q.correctAnswers.join(', ')}</strong>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Add/Edit Question Form */}
                                {showQuestionForm && (
                                    <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '14px', padding: '20px', marginTop: '16px' }}>
                                        <h4 style={{ margin: '0 0 16px', color: '#818cf8', fontSize: '14px', fontWeight: 700 }}>
                                            {editingQuestionIdx !== null ? '️ Edit Question' : '+ New Question'}
                                        </h4>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={s.formGrid}>
                                                <div style={s.formGroup}>
                                                    <label style={s.label}>Question Type</label>
                                                    <select
                                                        style={s.select}
                                                        value={questionForm.type}
                                                        onChange={(e) => {
                                                            const newType = e.target.value;
                                                            setQuestionForm({
                                                                ...questionForm,
                                                                type: newType,
                                                                options: newType === 'mcq' ? ['', '', '', ''] : newType === 'tf' ? ['True', 'False'] : [],
                                                                correctAnswerIndex: 0,
                                                                correctAnswers: []
                                                            });
                                                        }}
                                                    >
                                                        <option value="mcq">Multiple Choice (MCQ)</option>
                                                        <option value="tf">True / False</option>
                                                        <option value="short">Short Answer</option>
                                                    </select>
                                                </div>
                                                <div style={s.formGroup}>
                                                    <label style={s.label}>Points</label>
                                                    <input
                                                        type="number"
                                                        style={s.input}
                                                        min={1}
                                                        value={questionForm.points}
                                                        onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                                                    />
                                                </div>
                                            </div>

                                            <div style={s.formGroup}>
                                                <label style={s.label}>Question Text *</label>
                                                <textarea
                                                    style={{ ...s.input, minHeight: '70px', resize: 'vertical' }}
                                                    placeholder="Type your question here..."
                                                    value={questionForm.questionText}
                                                    onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                                                />
                                            </div>

                                            {/* MCQ Options */}
                                            {questionForm.type === 'mcq' && (
                                                <div>
                                                    <label style={{ ...s.label, marginBottom: '8px', display: 'block' }}>Options (select correct answer)</label>
                                                    {questionForm.options.map((opt, oIdx) => (
                                                        <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                            <input
                                                                type="radio"
                                                                name="qCorrectAnswer"
                                                                checked={questionForm.correctAnswerIndex === oIdx}
                                                                onChange={() => setQuestionForm({ ...questionForm, correctAnswerIndex: oIdx })}
                                                                style={{ accentColor: '#22c55e', width: '16px', height: '16px', cursor: 'pointer' }}
                                                            />
                                                            <span style={{ color: colors.text, fontWeight: 700, width: '20px' }}>{String.fromCharCode(65 + oIdx)}.</span>
                                                            <input
                                                                style={{ ...s.input, flex: 1 }}
                                                                placeholder={`Option ${String.fromCharCode(65 + oIdx)}...`}
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const newOpts = [...questionForm.options];
                                                                    newOpts[oIdx] = e.target.value;
                                                                    setQuestionForm({ ...questionForm, options: newOpts });
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* True/False */}
                                            {questionForm.type === 'tf' && (
                                                <div>
                                                    <label style={{ ...s.label, marginBottom: '8px', display: 'block' }}>Correct Answer</label>
                                                    <div style={{ display: 'flex', gap: '16px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: colors.text, fontWeight: 600 }}>
                                                            <input type="radio" name="tfAnswer" checked={questionForm.correctAnswerIndex === 0} onChange={() => setQuestionForm({ ...questionForm, correctAnswerIndex: 0 })} style={{ accentColor: '#22c55e' }} />
                                                            True
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: colors.text, fontWeight: 600 }}>
                                                            <input type="radio" name="tfAnswer" checked={questionForm.correctAnswerIndex === 1} onChange={() => setQuestionForm({ ...questionForm, correctAnswerIndex: 1 })} style={{ accentColor: '#22c55e' }} />
                                                            False
                                                        </label>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Short Answer */}
                                            {questionForm.type === 'short' && (
                                                <div style={s.formGroup}>
                                                    <label style={s.label}>Expected Answer / Key Phrases (comma separated)</label>
                                                    <input
                                                        style={s.input}
                                                        placeholder="e.g. 201, Created"
                                                        value={(questionForm.correctAnswers || []).join(', ')}
                                                        onChange={(e) => setQuestionForm({ ...questionForm, correctAnswers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                                    />
                                                </div>
                                            )}

                                            {/* Explanation (optional) */}
                                            <div style={s.formGroup}>
                                                <label style={s.label}>Explanation (optional)</label>
                                                <input
                                                    style={s.input}
                                                    placeholder="Why is this the correct answer?"
                                                    value={questionForm.explanation || ''}
                                                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                                <button onClick={() => { setShowQuestionForm(false); setEditingQuestionIdx(null); }} style={s.actionBtnAlt}>Cancel</button>
                                                <button onClick={handleAddQuestion} style={s.primaryBtn}>
                                                    {editingQuestionIdx !== null ? 'Update Question' : 'Add Question'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Save / Cancel Buttons */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid rgba(51,65,85,0.4)', paddingTop: '20px' }}>
                                <button onClick={() => setShowQuizCreateModal(false)} style={s.actionBtnAlt}>Cancel</button>
                                <button onClick={handleSaveQuiz} disabled={savingQuiz} style={{ ...s.primaryBtn, opacity: savingQuiz ? 0.6 : 1 }}>
                                    {savingQuiz ? 'Saving...' : editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
