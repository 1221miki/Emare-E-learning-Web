import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { aiService } from '../services/api';

export default function AiAssistant({ context = {}, initialPrompt = { prompt: '', id: null } }) {
    const { colors } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { sender: 'ai', text: `Hello! I am your Emare AI Learning Assistant. ${context.courseName ? `Let's review ${context.courseName} together.` : 'How can I help you with your studies today?'}` }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [lastResponse, setLastResponse] = useState('');
    const [error, setError] = useState('');
    const [history, setHistory] = useState([]);
    const [serverHistory, setServerHistory] = useState([]);
    const messagesEndRef = useRef(null);

    const assistantCourseLabel = context.courseName || 'General Study';
    const storageKey = useMemo(() => `emare-ai-${assistantCourseLabel.replace(/\s+/g, '-').toLowerCase()}`, [assistantCourseLabel]);
    const storageMessageKey = `${storageKey}-messages`;
    const storageHistoryKey = `${storageKey}-history`;

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    useEffect(() => {
        const savedMessages = window.localStorage.getItem(storageMessageKey);
        const savedHistory = window.localStorage.getItem(storageHistoryKey);

        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                if (Array.isArray(parsed) && parsed.length) {
                    setMessages(parsed);
                }
            } catch (err) {
                console.warn('Failed to parse saved AI messages', err);
            }
        }

        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                if (Array.isArray(parsed)) {
                    setHistory(parsed);
                }
            } catch (err) {
                console.warn('Failed to parse saved AI history', err);
            }
        }

        const loadServerHistory = async () => {
            try {
                const response = await aiService.getHistory();
                if (response.data?.success) {
                    setServerHistory(response.data.data);
                }
            } catch (err) {
                console.warn('Failed to load server AI history', err);
            }
        };

        loadServerHistory();
    }, [storageMessageKey, storageHistoryKey]);

    useEffect(() => {
        if (context.courseName && messages.length === 1 && messages[0].sender === 'ai') {
            setMessages([
                { sender: 'ai', text: `Hello! I am your Emare AI Learning Assistant. Let's review ${context.courseName} together.` }
            ]);
        }
    }, [context.courseName]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const quickPrompts = useMemo(() => [
        { label: 'Summarize my latest lesson', tag: 'Summary' },
        { label: 'Explain this topic in simple terms', tag: 'Explain' },
        { label: 'Generate a short quiz for me', tag: 'Practice' },
        { label: 'Help me debug this code', tag: 'Code' },
        { label: 'Review my assignment instructions', tag: 'Review' },
        { label: 'Create flashcards for this lesson', tag: 'Study' },
        { label: 'Translate notes to Amharic', tag: 'Translate' },
        { label: 'Build a 3-day study plan', tag: 'Plan' }
    ], []);

    const addMessage = (msg) => setMessages((prev) => [...prev, msg]);

    const saveHistoryItem = (query) => {
        setHistory((prev) => {
            const updated = [query, ...prev.filter((item) => item !== query)].slice(0, 8);
            window.localStorage.setItem(storageHistoryKey, JSON.stringify(updated));
            return updated;
        });
    };

    const reloadServerHistory = async () => {
        try {
            const response = await aiService.getHistory();
            if (response.data?.success) {
                setServerHistory(response.data.data);
            }
        } catch (err) {
            console.warn('Failed to reload server AI history', err);
        }
    };

    const handleSend = async (e, questionOverride) => {
        if (e) e.preventDefault?.();
        const query = (questionOverride || input).trim();
        if (!query) return;
        setError('');
        addMessage({ sender: 'user', text: query });
        if (!questionOverride) setInput('');
        setIsTyping(true);

        try {
            const response = await aiService.askQuestion({ question: query, courseContext: context });
            const answer = response.data?.data?.answer || 'Sorry, I could not generate a response. Please try again.';
            addMessage({ sender: 'ai', text: answer });
            setLastResponse(answer);
            saveHistoryItem(query);
            reloadServerHistory();
        } catch (err) {
            const fallback = "I couldn't connect to the AI service right now. Please try again or check your network.";
            addMessage({ sender: 'ai', text: fallback });
            setError(err.response?.data?.message || fallback);
        } finally {
            setIsTyping(false);
        }
    };

    useEffect(() => {
        if (initialPrompt?.prompt) {
            setIsOpen(true);
            setTimeout(() => {
                handleSend(null, initialPrompt.prompt);
            }, 200);
        }
    }, [initialPrompt?.id]);

    useEffect(() => {
        window.localStorage.setItem(storageMessageKey, JSON.stringify(messages));
    }, [messages, storageMessageKey]);

    const handleQuickPrompt = (prompt) => {
        if (!isOpen) setIsOpen(true);
        setInput(prompt);
        handleSend(null, prompt);
    };

    const s = {
        container: {
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
        },
        toggleBtn: {
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            color: '#fff',
            border: 'none',
            boxShadow: '0 14px 35px rgba(0,0,0,0.22)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            transition: 'transform 0.2s',
            zIndex: 10
        },
        chatBox: {
            width: '360px',
            minHeight: '520px',
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '20px',
            boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
            marginBottom: '16px',
            display: isOpen ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
            transformOrigin: 'bottom right',
            animation: 'scaleIn 0.25s ease',
            fontFamily: "'Inter', sans-serif",
            maxHeight: 'calc(100vh - 80px)'
        },
        header: {
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            color: '#fff',
            padding: '18px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        title: {
            margin: 0,
            fontSize: '15px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        subtitle: {
            fontSize: '12px',
            color: 'rgba(255,255,255,0.8)',
            marginTop: '6px'
        },
        closeBtn: {
            background: 'rgba(255,255,255,0.16)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '18px',
            borderRadius: '12px',
            width: '34px',
            height: '34px'
        },
        msgArea: {
            flex: 1,
            padding: '18px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: colors.bg
        },
        msgBubble: (isUser) => ({
            maxWidth: '85%',
            padding: '14px 16px',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isUser ? colors.primary : colors.bgInput,
            color: isUser ? '#fff' : colors.text,
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            fontSize: '14px',
            lineHeight: 1.6,
            border: isUser ? 'none' : `1px solid ${colors.border}`,
            whiteSpace: 'pre-wrap'
        }),
        promptBar: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            padding: '0 18px 16px'
        },
        promptChip: {
            background: colors.bgInput,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '10px 14px',
            color: colors.text,
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'transform 0.2s, background 0.2s'
        },
        helperBar: {
            padding: '16px 18px',
            borderTop: `1px solid ${colors.border}`,
            background: colors.bgCard
        },
        historyBar: {
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '0 18px 10px'
        },
        historyHeader: {
            color: colors.textMuted,
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
        },
        historyList: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '10px'
        },
        historyItem: {
            background: colors.bgInput,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '10px 12px',
            color: colors.text,
            fontSize: '12px',
            textAlign: 'left',
            cursor: 'pointer',
            whiteSpace: 'normal',
            minHeight: '46px'
        },
        historyButtonBar: {
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '0 18px 12px'
        },
        clearHistoryBtn: {
            background: colors.bgInput,
            border: `1px solid ${colors.border}`,
            borderRadius: '14px',
            padding: '10px 14px',
            color: colors.text,
            fontSize: '12px',
            cursor: 'pointer'
        },
        inputForm: {
            display: 'flex',
            padding: '14px 16px 18px',
            background: colors.bgCard,
            borderTop: `1px solid ${colors.border}`,
            gap: '10px'
        },
        input: {
            flex: 1,
            background: colors.bgInput,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            padding: '14px 16px',
            borderRadius: '18px',
            outline: 'none',
            fontSize: '14px'
        },
        sendBtn: {
            background: colors.primary,
            border: 'none',
            color: '#fff',
            borderRadius: '16px',
            padding: '0 14px',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        feedbackText: { color: colors.textMuted, fontSize: '12px', marginTop: '8px', minHeight: '18px' }
    };

    return (
        <div style={s.container}>
            <style>
                {`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.92); }
                    to { opacity: 1; transform: scale(1); }
                }
                button:hover { transform: scale(1.02); }
                `}
            </style>
            <div id="ai-assistant-root" style={s.chatBox}>
                <div style={s.header}>
                    <div>
                        <h3 style={s.title}><span>🤖</span> Emare AI Tutor</h3>
                        <div style={s.subtitle}>Your professional AI tutor for lessons, assignments, quizzes, and projects.</div>
                    </div>
                    <button onClick={() => setIsOpen(false)} style={s.closeBtn}>×</button>
                </div>

                <div style={s.promptBar}>
                        {quickPrompts.slice(0, 6).map((prompt) => (
                            <button key={prompt.label} type="button" style={s.promptChip} onClick={() => handleQuickPrompt(prompt.label)}>
                                <strong>{prompt.tag}</strong> · {prompt.label}
                            </button>
                        ))}
                    </div>
                    {history.length > 0 && (
                        <div style={s.historyBar}>
                            <div style={s.historyHeader}>Recent local questions</div>
                            <div style={s.historyList}>
                                {history.map((item) => (
                                    <button key={item} type="button" style={s.historyItem} onClick={() => handleQuickPrompt(item)}>
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {serverHistory.length > 0 && (
                        <div style={s.historyBar}>
                            <div style={s.historyHeader}>Server transcript</div>
                            <div style={s.historyList}>
                                {serverHistory.map((entry) => (
                                    <button
                                        key={entry._id}
                                        type="button"
                                        style={s.historyItem}
                                        onClick={() => handleQuickPrompt(entry.question)}
                                    >
                                        {entry.question}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div style={s.historyButtonBar}>
                        <button type="button" style={s.clearHistoryBtn} onClick={async () => {
                            try {
                                await aiService.clearHistory();
                                setServerHistory([]);
                                window.localStorage.removeItem(storageMessageKey);
                                window.localStorage.removeItem(storageHistoryKey);
                                setHistory([]);
                                setMessages([{ sender: 'ai', text: `Hello! I am your Emare AI Learning Assistant. ${context.courseName ? `Let's review ${context.courseName} together.` : 'How can I help you with your studies today?'}` }]);
                            } catch (err) {
                                console.warn('Failed to clear AI history', err);
                            }
                        }}>
                            Clear history
                        </button>
                    </div>
                <div style={s.msgArea}>
                    {messages.map((m, i) => (
                        <div key={i} style={s.msgBubble(m.sender === 'user')}>
                            {m.text}
                        </div>
                    ))}
                    {isTyping && <div style={s.typingIndicator}>AI is typing...</div>}
                    <div ref={messagesEndRef} />
                </div>

                <div style={s.helperBar}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Context: {assistantCourseLabel}</span>
                    </div>
                    <div style={s.feedbackText}>{error || (lastResponse ? 'Use the buttons or type a question to continue.' : 'Ask the AI anything about your course.')}</div>
                </div>

                <form onSubmit={handleSend} style={s.inputForm}>
                    <input
                        type="text"
                        placeholder="Ask a question about your course, assignment, quiz, or project..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        style={s.input}
                    />
                    <button type="submit" style={s.sendBtn}>➤</button>
                </form>
            </div>

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={s.toggleBtn}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    🤖
                </button>
            )}
        </div>
    );
}
