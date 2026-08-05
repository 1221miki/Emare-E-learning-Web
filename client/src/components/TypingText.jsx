import React, { useState, useEffect } from 'react';

export default function TypingText({ phrases = [], speed = 80, delay = 2000, style = {} }) {
    const [displayText, setDisplayText] = useState('');
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [charIndex, setCharIndex] = useState(0);

    useEffect(() => {
        const currentPhrase = phrases[phraseIndex];
        let timeout;

        if (!isDeleting) {
            // Typing forward
            if (charIndex < currentPhrase.length) {
                timeout = setTimeout(() => {
                    setDisplayText(prev => prev + currentPhrase[charIndex]);
                    setCharIndex(charIndex + 1);
                }, speed);
            } else {
                // Finished typing, wait then start deleting
                timeout = setTimeout(() => {
                    setIsDeleting(true);
                }, delay);
            }
        } else {
            // Deleting backward
            if (charIndex > 0) {
                timeout = setTimeout(() => {
                    setDisplayText(prev => prev.slice(0, -1));
                    setCharIndex(charIndex - 1);
                }, speed / 2);
            } else {
                // Finished deleting, move to next phrase
                setPhraseIndex((prev) => (prev + 1) % phrases.length);
                setIsDeleting(false);
            }
        }

        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, phraseIndex, phrases, speed, delay]);

    return (
        <span style={style}>
            {displayText}
            <span style={{ animation: 'blink 0.7s infinite', marginLeft: '2px' }}>|</span>
        </span>
    );
}
