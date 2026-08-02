import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { aiService, uploadService } from '../services/api';

export default function AiAssistant({ context = {}, initialPrompt = { prompt: '', id: null } }) {
    const { colors } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            sender: 'ai',
            text: `Hello! I am your Emare AI Learning Assistant. ${context.courseName ? `Let's review ${context.courseName} together.` : 'How can I help you with your studies today?'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [lastResponse, setLastResponse] = useState('');
    const [error, setError] = useState('');
    const [history, setHistory] = useState([]);
    const [serverHistory, setServerHistory] = useState([]);
    const [showQuickPrompts, setShowQuickPrompts] = useState(true);
    const [attachedFile, setAttachedFile] = useState(null);
    const [pdfText, setPdfText] = useState('');
    const [pdfUrl, setPdfUrl] = useState('');
    const [uploadingFile, setUploadingFile] = useState(false);
    const [voiceListening, setVoiceListening] = useState(false);
    const [selectedRating, setSelectedRating] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

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
                {
                    sender: 'ai',
                    text: `Hello! I am your Emare AI Learning Assistant. Let's review ${context.courseName} together.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        }
    }, [context.courseName]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    const quickPrompts = useMemo(
        () => [
            { label: 'Summarize my latest lesson', tag: 'Summary' },
            { label: 'Explain this topic in simple terms', tag: 'Explain' },
            { label: 'Generate a short quiz for me', tag: 'Practice' },
            { label: 'Help me debug this code', tag: 'Code' },
            { label: 'Review my assignment instructions', tag: 'Review' },
            { label: 'Create flashcards for this lesson', tag: 'Study' },
            { label: 'Translate notes to Amharic', tag: 'Translate' },
            { label: 'Build a 3-day study plan', tag: 'Plan' }
        ],
        []
    );

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
        addMessage({
            sender: 'user',
            text: query,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        if (!questionOverride) setInput('');
        setIsTyping(true);

        try {
            const payloadContext = {
                ...context,
                pdfText: pdfText || undefined,
                pdfUrl: pdfUrl || undefined,
                attachedPdfName: attachedFile?.name || undefined
            };

            const response = await aiService.askQuestion({ question: query, courseContext: payloadContext });
            const answer = response.data?.data?.answer || 'Sorry, I could not generate a response. Please try again.';
            addMessage({
                sender: 'ai',
                text: answer,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            setLastResponse(answer);
            saveHistoryItem(query);
            reloadServerHistory();
        } catch (err) {
            const fallback = "I couldn't connect to the AI service right now. Please try again or check your network.";
            addMessage({
                sender: 'ai',
                text: fallback,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            setError(err?.response?.data?.message || fallback);
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

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(null);
        }
    };

    const handleCopyResponse = async () => {
        if (!lastResponse) return;
        try {
            await navigator.clipboard.writeText(lastResponse);
            setError('Response copied to clipboard!');
            setTimeout(() => setError(''), 2200);
        } catch (err) {
            console.warn('Copy failed', err);
            setError('Unable to copy response.');
            setTimeout(() => setError(''), 2200);
        }
    };

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setError('Only PDF files are supported for AI attachments.');
            setTimeout(() => setError(''), 3000);
            return;
        }

        setAttachedFile(file);
        setUploadingFile(true);
        setError('Uploading PDF...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await uploadService.uploadFile(formData);
            const uploadData = response.data?.data || {};

            setPdfText(uploadData.pdfText || '');
            setPdfUrl(uploadData.url || '');
            setError(`PDF attached: ${file.name}`);
        } catch (err) {
            console.warn('PDF upload failed', err);
            setAttachedFile(null);
            setPdfText('');
            setPdfUrl('');
            setError('PDF upload failed. Please try again.');
        } finally {
            setUploadingFile(false);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleClearAttachment = () => {
        setAttachedFile(null);
        setPdfText('');
        setPdfUrl('');
        setError('PDF attachment removed.');
        setTimeout(() => setError(''), 2400);
    };

    const handleAskPdfQuestion = () => {
        if (!attachedFile) return;
        const prompt = `Please answer my next question using only the attached PDF document titled "${attachedFile.name}". Use the PDF content to support your response.`;
        setInput(prompt);
        handleSend(null, prompt);
    };

    const handleVoiceToggle = () => {
        setVoiceListening((prev) => !prev);
        setError(voiceListening ? 'Voice input disabled.' : 'Voice input enabled (mock mode).');
        setTimeout(() => setError(''), 2200);
    };

    const handleRegenerate = () => {
        const lastQuestion = [...messages].reverse().find((m) => m.sender === 'user');
        if (lastQuestion) {
            handleSend(null, lastQuestion.text);
        }
    };

    const s = {
        container: {
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
        },
        toggleBtn: {
            width: '62px',
            height: '62px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            color: '#fff',
            border: 'none',
            boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            transition: 'transform 0.2s',
            zIndex: 10
        },
        chatBox: {
            width: '380px',
            minHeight: '560px',
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '22px',
            boxShadow: '0 22px 55px rgba(0,0,0,0.22)',
            marginBottom: '16px',
            display: isOpen ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
            transformOrigin: 'bottom right',
            animation: 'scaleIn 0.2s ease',
            fontFamily: "'Inter', sans-serif",
            maxHeight: 'calc(100vh - 72px)'
        },
        header: {
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            color: '#fff',
            padding: '18px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px'
        },
        title: {
            margin: 0,
            fontSize: '15px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        subtitle: {
            fontSize: '12px',
            color: 'rgba(255,255,255,0.92)',
            marginTop: '6px',
            lineHeight: 1.4
        },
        headerMeta: {
            fontSize: '11px',
            color: 'rgba(255,255,255,0.82)',
            marginTop: '8px'
        },
        closeBtn: {
            background: 'rgba(255,255,255,0.16)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '18px',
            borderRadius: '14px',
            width: '34px',
            height: '34px',
            lineHeight: '1'
        },
        promptCollapsible: {
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px 8px',
            borderBottom: `1px solid ${colors.border}`
        },
        promptToggle: {
            border: 'none',
            background: 'transparent',
            color: colors.text,
            cursor: 'pointer',
            fontSize: '12px'
        },
        promptBar: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '10px',
            padding: '0 18px 16px',
            background: colors.bgCard
        },
        promptChip: {
            background: colors.bgInput,
            border: `1px solid ${colors.border}`,
            borderRadius: '14px',
            padding: '10px 14px',
            color: colors.text,
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'transform 0.2s, background 0.2s',
            textAlign: 'left'
        },
        actionBar: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '10px',
            padding: '14px 18px',
            background: colors.bgCard,
            borderBottom: `1px solid ${colors.border}`
        },
        actionButton: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '14px',
            border: `1px solid ${colors.border}`,
            background: colors.bgInput,
            color: colors.text,
            fontSize: '12px',
            cursor: 'pointer'
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
        msgRow: (isUser) => ({
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
            justifyContent: isUser ? 'flex-end' : 'flex-start'
        }),
        avatar: (isUser) => ({
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: '16px',
            background: isUser ? colors.primary : colors.accent,
            color: '#fff',
            flexShrink: 0
        }),
        msgBubble: (isUser) => ({
            maxWidth: '78%',
            padding: '14px 16px',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isUser ? colors.primary : colors.bgInput,
            color: isUser ? '#fff' : colors.text,
            border: isUser ? 'none' : `1px solid ${colors.border}`,
            whiteSpace: 'pre-wrap',
            fontSize: '14px',
            lineHeight: 1.6
        }),
        msgMeta: {
            marginTop: '6px',
            fontSize: '11px',
            color: colors.textMuted,
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px'
        },
        helperBar: {
            padding: '14px 18px 10px',
            borderTop: `1px solid ${colors.border}`,
            background: colors.bgCard
        },
        helperText: {
            fontSize: '12px',
            color: colors.textMuted,
            lineHeight: 1.5
        },
        pdfPreviewCard: {
            marginTop: '12px',
            padding: '14px',
            borderRadius: '16px',
            background: colors.bgInput,
            border: `1px solid ${colors.border}`
        },
        pdfPreviewHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '10px'
        },
        pdfPreviewBody: {
            display: 'grid',
            gap: '8px'
        },
        pdfPreviewMeta: {
            fontSize: '11px',
            color: colors.textMuted
        },
        pdfPreviewActions: {
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
        },
        pdfActionBtn: {
            background: colors.primary,
            border: 'none',
            color: '#fff',
            borderRadius: '14px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '12px'
        },
        pdfActionLink: {
            color: colors.primary,
            fontSize: '12px',
            fontWeight: '700',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center'
        },
        clearAttachmentBtn: {
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff',
            borderRadius: '14px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '12px'
        },
        subActions: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
        },
        badge: {
            padding: '6px 10px',
            borderRadius: '12px',
            background: colors.bgInput,
            color: colors.text,
            fontSize: '11px'
        },
        ratingRow: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
        },
        ratingStar: (active) => ({
            cursor: 'pointer',
            color: active ? colors.primary : colors.textMuted,
            fontSize: '16px'
        }),
        inputForm: {
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '14px 16px 18px',
            background: colors.bgCard,
            borderTop: `1px solid ${colors.border}`
        },
        textarea: {
            width: '100%',
            minHeight: '90px',
            resize: 'none',
            borderRadius: '18px',
            border: `1px solid ${colors.border}`,
            background: colors.bgInput,
            color: colors.text,
            padding: '14px 16px',
            fontSize: '14px',
            outline: 'none',
            lineHeight: 1.6
        },
        inputRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
        },
        sendBtn: {
            background: colors.primary,
            border: 'none',
            color: '#fff',
            borderRadius: '16px',
            padding: '0 18px',
            cursor: 'pointer',
            fontSize: '14px',
            minHeight: '44px'
        },
        typingIndicator: {
            fontSize: '12px',
            color: colors.textMuted,
            padding: '8px 12px',
            borderRadius: '16px',
            background: colors.bgInput,
            alignSelf: 'center',
            maxWidth: 'fit-content'
        },
        attachmentLabel: {
            marginTop: '6px',
            fontSize: '12px',
            color: colors.textMuted
        }
    };

    return (
        <div style={s.container}>
            <style>
                {`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.94); }
                    to { opacity: 1; transform: scale(1); }
                }
                button:hover { transform: scale(1.02); }
                `}
            </style>

            <div id="ai-assistant-root" style={s.chatBox}>
                <div style={s.header}>
                    <div>
                        <h3 style={s.title}><span>🤖</span> Emare AI Tutor</h3>
                        <div style={s.subtitle}>Smart AI guidance for lessons, assignments, quizzes, and projects.</div>
                        <div style={s.headerMeta}>{assistantCourseLabel} • {Math.max(messages.length - 1, 0)} conversation{messages.length - 1 === 1 ? '' : 's'}</div>
                    </div>
                    <button onClick={() => setIsOpen(false)} style={s.closeBtn} aria-label="Close AI assistant">×</button>
                </div>

                <div style={s.promptCollapsible}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Quick prompts</span>
                        <span style={{ fontSize: '11px', color: colors.textMuted }}>Tap a prompt to start with a helpful question.</span>
                    </div>
                    <button type="button" style={s.promptToggle} onClick={() => setShowQuickPrompts((prev) => !prev)}>
                        {showQuickPrompts ? 'Hide' : 'Show'} prompts
                    </button>
                </div>

                {showQuickPrompts && (
                    <div style={s.promptBar}>
                        {quickPrompts.slice(0, 6).map((prompt) => (
                            <button key={prompt.label} type="button" style={s.promptChip} onClick={() => handleQuickPrompt(prompt.label)}>
                                <strong>{prompt.tag}</strong> · {prompt.label}
                            </button>
                        ))}
                    </div>
                )}

                <div style={s.actionBar}>
                    <button type="button" style={s.actionButton} onClick={handleAttachClick} disabled={uploadingFile}>
                        {uploadingFile ? 'Uploading PDF...' : '📎 Attach PDF'}
                    </button>
                    <button type="button" style={s.actionButton} onClick={handleVoiceToggle}>{voiceListening ? '🎙 Stop' : '🎙 Voice input'}</button>
                    <button type="button" style={s.actionButton} onClick={handleCopyResponse}>📋 Copy response</button>
                </div>

                <div style={s.msgArea}>
                    {messages.map((m, i) => {
                        const isUser = m.sender === 'user';
                        return (
                            <div key={i} style={s.msgRow(isUser)}>
                                {!isUser && <div style={s.avatar(false)}>AI</div>}
                                <div>
                                    <div style={s.msgBubble(isUser)}>{m.text}</div>
                                    <div style={s.msgMeta}>
                                        <span>{isUser ? 'You' : 'Emare AI'}</span>
                                        <span>{m.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                {isUser && <div style={s.avatar(true)}>👤</div>}
                            </div>
                        );
                    })}
                    {isTyping && <div style={s.typingIndicator}>AI is typing...</div>}
                    <div ref={messagesEndRef} />
                </div>

                <div style={s.helperBar}>
                    <div style={s.subActions}>
                        <span style={s.badge}>Context: {assistantCourseLabel}</span>
                        <div style={s.ratingRow}>
                            <span style={{ fontSize: '12px', color: colors.textMuted }}>Rate answer:</span>
                            {[1, 2, 3, 4, 5].map((value) => (
                                <span key={value} style={s.ratingStar(selectedRating >= value)} onClick={() => setSelectedRating(value)}>
                                    ★
                                </span>
                            ))}
                        </div>
                    </div>
                    <div style={s.helperText}>{error || (lastResponse ? 'Use the actions or ask another question.' : 'Ask the AI anything about your course.')}</div>
                    {attachedFile && (
                        <div style={s.pdfPreviewCard}>
                            <div style={s.pdfPreviewHeader}>
                                <strong>Attached PDF:</strong>
                                <button type="button" style={s.clearAttachmentBtn} onClick={handleClearAttachment}>Remove</button>
                            </div>
                            <div style={s.pdfPreviewBody}>
                                <div><strong>{attachedFile.name}</strong></div>
                                <div style={s.pdfPreviewMeta}>{attachedFile.type} • {(attachedFile.size / 1024).toFixed(1)} KB</div>
                                <div style={s.pdfPreviewActions}>
                                    <button type="button" style={s.pdfActionBtn} onClick={handleAskPdfQuestion}>Ask PDF question</button>
                                    {pdfUrl && (
                                        <a href={pdfUrl} target="_blank" rel="noreferrer" style={s.pdfActionLink}>Open PDF</a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSend} style={s.inputForm}>
                    <textarea
                        rows={3}
                        placeholder="Ask a question about your course, assignment, quiz, or project... (Shift+Enter for new line)"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={s.textarea}
                    />
                    <div style={s.inputRow}>
                        <button type="submit" style={s.sendBtn}>{isTyping ? 'Sending...' : 'Send'}</button>
                    </div>
                </form>
            </div>

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={s.toggleBtn}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    aria-label="Open AI assistant"
                >
                    🤖
                </button>
            )}

            <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
    );
}
