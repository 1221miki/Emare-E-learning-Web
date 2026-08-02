import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('elms_theme') || 'dark');

    useEffect(() => {
        localStorage.setItem('elms_theme', theme);
        document.body.style.background = theme === 'dark' ? '#0f172a' : '#f8fafc';
        document.body.style.color = theme === 'dark' ? '#f1f5f9' : '#0f172a';
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const colors = theme === 'dark' ? {
        bg: '#0f172a', bgCard: '#1e293b', bgInput: 'rgba(255,255,255,0.05)',
        border: '#334155', text: '#f1f5f9', textMuted: '#94a3b8',
        primary: '#3b82f6', accent: '#8b5cf6', success: '#10b981'
    } : {
        bg: '#f8fafc', bgCard: '#ffffff', bgInput: '#f1f5f9',
        border: '#e2e8f0', text: '#0f172a', textMuted: '#64748b',
        primary: '#2563eb', accent: '#7c3aed', success: '#059669'
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
