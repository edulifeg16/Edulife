import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [fontSize, setFontSize] = useState(localStorage.getItem('fontSize') || 'medium');
    const [captionsEnabled, setCaptionsEnabled] = useState(JSON.parse(localStorage.getItem('captionsEnabled') || 'true'));

    useEffect(() => {
        localStorage.setItem('theme', theme);
        localStorage.setItem('fontSize', fontSize);
        localStorage.setItem('captionsEnabled', JSON.stringify(captionsEnabled));
    }, [theme, fontSize, captionsEnabled]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const changeFontSize = (size) => {
        setFontSize(size);
    };

    const changeCaptions = (enabled) => {
        setCaptionsEnabled(enabled);
    };

    return (
        <ThemeContext.Provider value={{ theme, fontSize, captionsEnabled, toggleTheme, changeFontSize, changeCaptions }}>
            {children}
        </ThemeContext.Provider>
    );
};