import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import en from '../translations/en.json';
import am from '../translations/am.json';
import om from '../translations/om.json';
import ti from '../translations/ti.json';

const translations = { en, am, om, ti };

// Maps the human-readable language names stored on the user profile
// (backend `preferredLanguage` field) to i18n dictionary codes.
export const LANGUAGE_CODES = {
    en: 'en',
    English: 'en',
    am: 'am',
    Amharic: 'am',
    'አማርኛ': 'am',
    om: 'om',
    'Afaan Oromo': 'om',
    'Afaan Oromoo': 'om',
    Oromo: 'om',
    ti: 'ti',
    Tigrinya: 'ti',
    'ትግርኛ': 'ti'
};

export const codeForLanguage = (name) => {
    if (!name) return 'en';
    if (LANGUAGE_CODES[name]) return LANGUAGE_CODES[name];
    const lower = String(name).toLowerCase().trim();
    if (lower === 'am' || lower.startsWith('am') || lower.includes('አማርኛ')) return 'am';
    if (lower === 'om' || lower.startsWith('om') || lower.includes('oromo')) return 'om';
    if (lower === 'ti' || lower.startsWith('ti') || lower.includes('tigri') || lower.includes('ትግር')) return 'ti';
    return 'en';
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Restore the saved choice on reload; default to English
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('elms_lang');
        return saved && translations[saved] ? saved : 'en';
    });

    useEffect(() => {
        localStorage.setItem('elms_lang', language);
        document.documentElement.setAttribute('lang', language);
    }, [language]);

    // Accepts either a dictionary code ('am') or a profile language name ('Amharic')
    const changeLanguage = useCallback((lang) => {
        const resolved = translations[lang] ? lang : codeForLanguage(lang);
        setLanguage(resolved);
        localStorage.setItem('elms_lang', resolved);
        document.documentElement.setAttribute('lang', resolved);
    }, []);

    // Falls back to English, then to the raw key
    const t = useCallback((key) => {
        return translations[language]?.[key] || translations.en?.[key] || key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
