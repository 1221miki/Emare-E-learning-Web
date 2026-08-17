import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeValue] = useState(localStorage.getItem('elms_theme') || 'dark');

    useEffect(() => {
        localStorage.setItem('elms_theme', theme);
        document.body.style.background = theme === 'dark' ? '#0b1220' : '#f8fafc';
        document.body.style.color = theme === 'dark' ? '#eef2ff' : '#0f172a';
    }, [theme]);

    const setTheme = (value) => setThemeValue(value);
    const toggleTheme = () => setThemeValue(prev => prev === 'dark' ? 'light' : 'dark');

    const colors = theme === 'dark' ? {
        bg: '#0b1220', bgCard: '#111827', bgInput: 'rgba(255,255,255,0.08)',
        border: '#334155', text: '#e2e8f0', textMuted: '#94a3b8',
        primary: '#2563eb', accent: '#7c3aed', success: '#10b981',
        bgDarker: 'rgba(14,23,38,0.65)', bgDarkest: 'rgba(15,20,34,0.6)', textBright: '#f8fafc'
    } : {
        bg: '#f8fafc', bgCard: '#ffffff', bgInput: '#f1f5f9',
        border: '#e2e8f0', text: '#0f172a', textMuted: '#475569',
        primary: '#1d4ed8', accent: '#7c3aed', success: '#059669',
        bgDarker: '#f1f5f9', bgDarkest: '#e2e8f0', textBright: '#0f172a'
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
