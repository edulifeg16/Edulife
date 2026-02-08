import React, { useContext, useEffect } from 'react';
import StudentSidebar from '../../components/layout/StudentSidebar';
import { ThemeContext } from '../../context/ThemeContext';

const Settings = () => {
  const { theme, fontSize, toggleTheme, changeFontSize } = useContext(ThemeContext);

  useEffect(() => {
    const handleVoiceTheme = (event) => {
      console.log('🎤 Settings received voice-theme-change event:', event.detail);
      const mode = event.detail;
      console.log('🎤 Settings current theme:', theme, 'requested:', mode);
      
      if (mode === 'dark' && theme !== 'dark') {
        console.log('🎤 Settings switching to dark mode');
        toggleTheme();
      } else if (mode === 'light' && theme !== 'light') {
        console.log('🎤 Settings switching to light mode');
        toggleTheme();
      } else {
        console.log('🎤 Settings theme already set to:', mode);
      }
    };

    const handleVoiceFont = (event) => {
      console.log('🎤 Settings received voice-font-change event:', event.detail);
      const size = event.detail;
      console.log('🎤 Settings applying font size change:', size);
      changeFontSize(size);
    };

    console.log('🎤 Settings adding voice event listeners');
    window.addEventListener('voice-theme-change', handleVoiceTheme);
    window.addEventListener('voice-font-change', handleVoiceFont);

    return () => {
      console.log('🎤 Settings removing voice event listeners');
      window.removeEventListener('voice-theme-change', handleVoiceTheme);
      window.removeEventListener('voice-font-change', handleVoiceFont);
    };
  }, [theme, toggleTheme, changeFontSize]);

  const settingBoxStyle = {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    marginBottom: '20px',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '10px',
    fontWeight: 'bold',
  };

  const buttonStyle = {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: '#4CAF50',
    color: 'white',
  };

  const selectStyle = {
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  };

  return (
    <div className={`dashboard-layout theme-${theme} font-${fontSize}`}>
      <StudentSidebar />
      <main className="main-content">
        <h1>Settings</h1>

        <div style={settingBoxStyle}>
          <label style={labelStyle}>Appearance</label>
          <button onClick={toggleTheme} style={buttonStyle}>
            Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </div>

        <div style={settingBoxStyle}>
          <label htmlFor="fontSizeSelect" style={labelStyle}>Font Size</label>
          <select
            id="fontSizeSelect"
            value={fontSize}
            onChange={(e) => changeFontSize(e.target.value)}
            style={selectStyle}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </main>
    </div>
  );
};

export default Settings;
