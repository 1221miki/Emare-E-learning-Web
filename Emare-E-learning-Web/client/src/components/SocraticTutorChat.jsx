/**
 * SocraticTutorChat.jsx
 * React component for Socratic AI Tutoring interface
 */

import React, { useState, useEffect, useRef } from 'react';
import socraticApi from '../../services/socraticApi';
import './SocraticTutorChat.css';

const SocraticTutorChat = ({ courseId, courseName, onClose }) => {
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [topic, setTopic] = useState('');
    const [sessionStarted, setSessionStarted] = useState(false);
    const [comprehensionLevel, setComprehensionLevel] = useState(3);
    const [difficultyLevel, setDifficultyLevel] = useState(3);
    const [showHintOption, setShowHintOption] = useState(false);
    const [sessionSummary, setSessionSummary] = useState(null);
    const [showSummary, setShowSummary] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    /**
     * Start a new Socratic session
     */
    const handleStartSession = async () => {
        if (!topic.trim()) {
            alert('Please enter a topic');
            return;
        }

        try {
            setIsLoading(true);
            const response = await socraticApi.startSession(
                courseId,
                topic,
                [],
                difficultyLevel
            );

            if (response.success) {
                setSessionId(response.session.sessionId);
                setSessionStarted(true);
                setMessages([
                    {
                        role: 'system',
                        content: `Welcome to Socratic Learning! We'll explore "${topic}" together. I'll ask questions to help you discover answers yourself. Ready to begin?`
                    }
                ]);
            }
        } catch (error) {
            console.error('Error starting session:', error);
            alert('Failed to start session');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Send question and get Socratic response
     */
    const handleSendMessage = async () => {
        if (!userInput.trim() || !sessionId) {
            return;
        }

        const question = userInput;
        setUserInput('');

        // Add user message
        const newMessages = [
            ...messages,
            { role: 'user', content: question }
        ];
        setMessages(newMessages);

        try {
            setIsLoading(true);

            const response = await socraticApi.streamSocraticResponse(
                sessionId,
                question,
                courseId,
                false
            );

            // Add tutor response
            if (response.messages && response.messages.length > 0) {
                const tutorMessage = response.messages.find(msg => msg.type === 'response');
                if (tutorMessage) {
                    newMessages.push({
                        role: 'tutor',
                        content: tutorMessage.content,
                        relevantContent: tutorMessage.relevantContent
                    });
                    setMessages(newMessages);
                    setShowHintOption(true);
                }
            }
        } catch (error) {
            console.error('Error getting response:', error);
            newMessages.push({
                role: 'error',
                content: 'Sorry, there was an error. Please try again.'
            });
            setMessages(newMessages);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Request a hint
     */
    const handleGetHint = async () => {
        if (!sessionId) return;

        try {
            setIsLoading(true);
            const response = await socraticApi.streamSocraticResponse(
                sessionId,
                topic,
                courseId,
                true
            );

            if (response.messages && response.messages.length > 0) {
                const hintMessage = response.messages.find(msg => msg.type === 'response');
                if (hintMessage) {
                    setMessages([
                        ...messages,
                        {
                            role: 'tutor',
                            content: `💡 Hint: ${hintMessage.content}`
                        }
                    ]);
                    setShowHintOption(false);
                }
            }
        } catch (error) {
            console.error('Error getting hint:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * End session and show summary
     */
    const handleEndSession = async () => {
        if (!sessionId) return;

        try {
            setIsLoading(true);
            const response = await socraticApi.endSession(sessionId);

            if (response.success) {
                setSessionSummary(response.summary);
                setShowSummary(true);
            }
        } catch (error) {
            console.error('Error ending session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Reset for new session
     */
    const handleNewSession = () => {
        setSessionId(null);
        setSessionStarted(false);
        setMessages([]);
        setTopic('');
        setShowSummary(false);
        setSessionSummary(null);
        setShowHintOption(false);
    };

    // Session setup screen
    if (!sessionStarted) {
        return (
            <div className="socratic-container">
                <div className="socratic-header">
                    <h2>🎓 Socratic AI Tutor</h2>
                    <p className="course-name">{courseName}</p>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="session-setup">
                    <div className="setup-form">
                        <div className="form-group">
                            <label htmlFor="topic">What would you like to learn about?</label>
                            <input
                                id="topic"
                                type="text"
                                placeholder="e.g., React Hooks, Database Design, etc."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleStartSession()}
                                autoFocus
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="difficulty">Difficulty Level</label>
                                <select
                                    id="difficulty"
                                    value={difficultyLevel}
                                    onChange={(e) => setDifficultyLevel(parseInt(e.target.value))}
                                >
                                    <option value={1}>Beginner</option>
                                    <option value={2}>Intermediate</option>
                                    <option value={3}>Intermediate-Advanced</option>
                                    <option value={4}>Advanced</option>
                                    <option value={5}>Expert</option>
                                </select>
                            </div>
                        </div>

                        <div className="info-box">
                            <h3>How Socratic Learning Works:</h3>
                            <ul>
                                <li>I'll ask questions to guide your thinking</li>
                                <li>You discover answers through dialogue</li>
                                <li>Feedback helps you deepen understanding</li>
                                <li>Hints available when you need them</li>
                            </ul>
                        </div>

                        <button
                            className="start-btn"
                            onClick={handleStartSession}
                            disabled={!topic.trim() || isLoading}
                        >
                            {isLoading ? 'Starting...' : 'Start Learning Session'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Session summary screen
    if (showSummary && sessionSummary) {
        return (
            <div className="socratic-container">
                <div className="socratic-header">
                    <h2>📊 Session Summary</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="summary-content">
                    <div className="summary-card">
                        <h3>{topic}</h3>
                        <div className="summary-metrics">
                            <div className="metric">
                                <span className="metric-label">Duration</span>
                                <span className="metric-value">{sessionSummary.sessionDuration?.toFixed(1)} min</span>
                            </div>
                            <div className="metric">
                                <span className="metric-label">Total Questions</span>
                                <span className="metric-value">{sessionSummary.totalQuestions}</span>
                            </div>
                            <div className="metric">
                                <span className="metric-label">Correct Responses</span>
                                <span className="metric-value">{sessionSummary.correctResponses}</span>
                            </div>
                            <div className="metric">
                                <span className="metric-label">Accuracy</span>
                                <span className="metric-value">{sessionSummary.accuracy}</span>
                            </div>
                            <div className="metric">
                                <span className="metric-label">Comprehension Level</span>
                                <span className="metric-value">{sessionSummary.comprehensionLevel}/5</span>
                            </div>
                            <div className="metric">
                                <span className="metric-label">Hints Used</span>
                                <span className="metric-value">{sessionSummary.hintsUsed}</span>
                            </div>
                        </div>

                        <div className="summary-actions">
                            <button className="btn-primary" onClick={handleNewSession}>
                                Start New Session
                            </button>
                            <button className="btn-secondary" onClick={onClose}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active chat session
    return (
        <div className="socratic-container">
            <div className="socratic-header">
                <div>
                    <h2>🎓 Socratic Learning</h2>
                    <p className="topic">{topic}</p>
                </div>
                <div className="header-controls">
                    <span className="comprehension-level">Level: {comprehensionLevel}/5</span>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
            </div>

            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div key={index} className={`message message-${msg.role}`}>
                        <div className="message-avatar">
                            {msg.role === 'tutor' && '🧑‍🏫'}
                            {msg.role === 'user' && '👤'}
                            {msg.role === 'system' && 'ℹ️'}
                            {msg.role === 'error' && '❌'}
                        </div>
                        <div className="message-content">
                            <p>{msg.content}</p>
                            {msg.relevantContent && msg.relevantContent.length > 0 && (
                                <div className="relevant-content">
                                    <small>📚 Relevant Course Material:</small>
                                    {msg.relevantContent.map((item, idx) => (
                                        <div key={idx} className="content-preview">
                                            <strong>{item.lesson}</strong>
                                            <p>{item.preview}...</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-section">
                {showHintOption && (
                    <button className="hint-btn" onClick={handleGetHint} disabled={isLoading}>
                        💡 Get a Hint
                    </button>
                )}

                <div className="input-area">
                    <input
                        type="text"
                        placeholder="Share your thoughts or ask a question..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        disabled={isLoading}
                    />
                    <button
                        className="send-btn"
                        onClick={handleSendMessage}
                        disabled={!userInput.trim() || isLoading}
                    >
                        {isLoading ? '⏳' : '📤'}
                    </button>
                </div>

                <button className="end-session-btn" onClick={handleEndSession} disabled={isLoading}>
                    End Session & View Summary
                </button>
            </div>
        </div>
    );
};

export default SocraticTutorChat;
