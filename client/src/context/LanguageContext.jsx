import React, { createContext, useState, useContext, useEffect } from 'react';
import en from '../translations/en.json';
import am from '../translations/am.json';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Check local storage for saved language, default to 'en'
    const [language, setLanguage] = useState(localStorage.getItem('elms_lang') || 'en');

    // Dictionary map
    const translations = { en, am };

    // Function to change language
    const changeLanguage = (lang) => {
        setLanguage(lang);
        localStorage.setItem('elms_lang', lang);
    };

    // Helper function to get translated text by key
    const t = (key) => {
        // Fallback to English if key is missing in Amharic
        return translations[language][key] || translations['en'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
