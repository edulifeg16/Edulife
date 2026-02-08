import React, { useContext } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRouter from './routes/AppRouter';
import Chatbot from './components/chatbot/Chatbot';
import VoiceAssistant from './components/voice/VoiceAssistant';
import VisualVoiceAssistant from './components/voice/VisualVoiceAssistant';
import { AuthContext } from './context/AuthContext';

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <AppRouter />
      <Chatbot />
      
      {/* ✔ Mobility users only - voice commands for mobility-accessible pages */}
      {user?.disabilityType === 'mobility' && <VoiceAssistant />}
      
      {/* ✔ Visual users only - voice commands for visual dashboard */}
      {user?.disabilityType === 'visual' && <VisualVoiceAssistant />}
    </Router>
  );
}

export default App;