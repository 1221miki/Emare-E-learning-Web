import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function AiAssistant({ context = {} }) {
    const { colors } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { sender: 'ai', text: 'Hello! I am your Emare AI Learning Assistant. How can I help you with your studies today?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        // Simulate API call to backend aiService
        setTimeout(() => {
            let aiResponse = "I am processing your request. Since I'm in mock mode, I can't fully answer yet.";
            const p = userMsg.toLowerCase();
            
            if (p.includes('summary')) {
                aiResponse = "Here is a quick summary: Keep practicing React fundamentals and exploring our interactive labs!";
            } else if (p.includes('stuck') || p.includes('help')) {
                aiResponse = `I see you are working in ${context.courseName || 'a course'}. Let's break down the problem step by step. What specifically is confusing you?`;
            }

            setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
            setIsTyping(false);
        }, 1200);
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
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            transition: 'transform 0.2s',
            zIndex: 2
        },
        chatBox: {
            width: '350px',
            height: '500px',
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
            marginBottom: '16px',
            display: isOpen ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
            transformOrigin: 'bottom right',
            animation: 'scaleIn 0.3s ease',
            fontFamily: "'Inter', sans-serif"
        },
        header: {
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            color: '#fff',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        title: {
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        closeBtn: {
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '20px'
        },
        msgArea: {
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: colors.bg
        },
        msgBubble: (isUser) => ({
            maxWidth: '85%',
            padding: '12px 16px',
            borderRadius: isUser ? '16px 16px 0 16px' : '16px 16px 16px 0',
            background: isUser ? colors.primary : colors.bgInput,
            color: isUser ? '#fff' : colors.text,
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            fontSize: '14px',
            lineHeight: 1.5,
            border: isUser ? 'none' : `1px solid ${colors.border}`
        }),
        typingIndicator: {
            alignSelf: 'flex-start',
            color: colors.textMuted,
            fontSize: '12px',
            fontStyle: 'italic',
            marginLeft: '8px'
        },
        inputForm: {
            display: 'flex',
            padding: '12px',
            background: colors.bgCard,
            borderTop: `1px solid ${colors.border}`
        },
        input: {
            flex: 1,
            background: colors.bgInput,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            padding: '12px 16px',
            borderRadius: '24px',
            outline: 'none',
            fontSize: '14px'
        },
        sendBtn: {
            background: 'transparent',
            border: 'none',
            color: colors.primary,
            cursor: 'pointer',
            padding: '0 12px',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center'
        }
    };

    return (
        <div style={s.container}>
            <style>
                {`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                `}
            </style>
            <div style={s.chatBox}>
                <div style={s.header}>
                    <h3 style={s.title}><span>🤖</span> Emare AI Tutor</h3>
                    <button onClick={() => setIsOpen(false)} style={s.closeBtn}>×</button>
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

                <form onSubmit={handleSend} style={s.inputForm}>
                    <input 
                        type="text" 
                        placeholder="Ask a question..." 
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
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    🤖
                </button>
            )}
        </div>
    );
}
