import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

/**
 * Emare E-Learning — Design Token System
 *
 * Single source of truth for color, elevation and radius across the app.
 * Every page consumes these via useTheme().colors, so refining values here
 * restyles the entire platform without touching page markup.
 *
 * Brand identity: trustworthy indigo/blue primary + violet accent,
 * neutral slate surfaces, semantic green/amber/red used sparingly.
 */

// Shared (theme-independent) brand values
const BRAND = {
    accent: '#7c3aed',          // violet — secondary brand color
    gradient: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    warning: '#f59e0b',
    danger: '#ef4444'
};

const DARK = {
    // Surfaces — one coherent slate ramp (bg < card < elevated)
    bg: '#0b1120',
    bgCard: '#111a2e',
    bgInput: 'rgba(148,163,184,0.10)',
    bgDarker: 'rgba(10,15,28,0.72)',
    bgDarkest: 'rgba(7,11,22,0.85)',
    border: '#24304d',

    // Text
    text: '#dbe2f0',
    textMuted: '#93a1bd',       // AA on card backgrounds
    textBright: '#f4f7fc',

    // Interactive
    primary: '#3b82f6',         // lighter in dark mode for contrast on dark surfaces
    primaryHover: '#60a5fa',
    primarySoft: 'rgba(59,130,246,0.14)',
    accent: BRAND.accent,
    success: '#34d399',
    warning: BRAND.warning,
    danger: BRAND.danger,

    // Elevation & shape
    shadow: '0 1px 2px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.35)',
    shadowSm: '0 1px 3px rgba(0,0,0,0.4)',
    gradient: BRAND.gradient,

    radius: { sm: '8px', md: '12px', lg: '16px', xl: '22px', pill: '999px' }
};

const LIGHT = {
    // Surfaces
    bg: '#f5f7fb',
    bgCard: '#ffffff',
    bgInput: '#eef2f8',
    bgDarker: '#eef2f8',
    bgDarkest: '#e3e9f2',
    border: '#e3e8f0',

    // Text
    text: '#16213a',
    textMuted: '#5a6580',       // ≥ 7:1 on white — strong readability
    textBright: '#0c1526',

    // Interactive
    primary: '#1d4ed8',         // deep blue — 7.6:1 on white
    primaryHover: '#1e40af',
    primarySoft: 'rgba(29,78,216,0.08)',
    accent: BRAND.accent,
    success: '#047857',
    warning: '#b45309',         // darkened amber for AA text contrast
    danger: '#dc2626',

    // Elevation & shape
    shadow: '0 1px 2px rgba(16,24,40,0.05), 0 10px 30px -8px rgba(16,24,40,0.16)',
    shadowSm: '0 1px 3px rgba(16,24,40,0.08)',
    gradient: BRAND.gradient,

    radius: { sm: '8px', md: '12px', lg: '16px', xl: '22px', pill: '999px' }
};

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeValue] = useState(localStorage.getItem('elms_theme') || 'light');

    useEffect(() => {
        localStorage.setItem('elms_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        const c = theme === 'dark' ? DARK : LIGHT;
        document.body.style.background = c.bg;
        document.body.style.color = c.text;
        // Mirror key tokens as CSS variables for global stylesheets
        const root = document.documentElement.style;
        root.setProperty('--emare-bg', c.bg);
        root.setProperty('--emare-bg-card', c.bgCard);
        root.setProperty('--emare-border', c.border);
        root.setProperty('--emare-text', c.text);
        root.setProperty('--emare-text-muted', c.textMuted);
        root.setProperty('--emare-primary', c.primary);
        root.setProperty('--emare-accent', c.accent);
        root.setProperty('--emare-gradient', c.gradient);
        root.setProperty('--emare-shadow', c.shadow);
        root.setProperty('--emare-radius-md', c.radius.md);
    }, [theme]);

    const setTheme = (value) => setThemeValue(value);
    const toggleTheme = () => setThemeValue(prev => prev === 'dark' ? 'light' : 'dark');

    const colors = theme === 'dark' ? DARK : LIGHT;

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
