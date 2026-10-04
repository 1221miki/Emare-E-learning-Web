import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import en from '../translations/en.json';
import am from '../translations/am.json';
import om from '../translations/om.json';
import ti from '../translations/ti.json';

const translations = { en, am, om, ti };

// Maps the human-readable language names stored on the user profile
// (backend `preferredLanguage` field) to i18n dictionary codes.
export const LANGUAGE_CODES = {
    English: 'en',
    Amharic: 'am',
    'Afaan Oromo': 'om',
    Tigrinya: 'ti'
};

export const codeForLanguage = (name) => LANGUAGE_CODES[name] || 'en';

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
        setLanguage(translations[lang] ? lang : codeForLanguage(lang));
    }, []);

    // Falls back to English, then to the raw key
    const t = (key) => translations[language]?.[key] || translations.en[key] || key;

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
