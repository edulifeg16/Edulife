import React, { useState, useContext, useEffect, useRef } from 'react'; 
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const Chatbot = () => {
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ from: 'bot', text: 'Hello! How can I help you today?' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);
    const currentUserRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const noSpeechRestartRef = useRef(true); // allow auto-restart on no-speech
    const SILENCE_TIMEOUT = 15000; // 15 seconds of total silence before auto-stopping mic

    // Reset chat when user changes
    useEffect(() => {
        if (user && currentUserRef.current && currentUserRef.current !== user._id) {
            // Different user logged in, reset chat
            setMessages([{ from: 'bot', text: 'Hello! How can I help you today?' }]);
            setInput('');
            setIsLoading(false);
            setIsListening(false);
            // Stop any ongoing speech
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
            }
        }
        if (user) {
            currentUserRef.current = user._id;
        }
    }, [user]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Function to speak text
    const speakText = (text) => {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            utterance.lang = 'en-US';
            
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleVoiceInput = async (voiceText) => {
        if (!voiceText.trim()) return;

        const userMessage = { from: 'user', text: voiceText };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const res = await axios.post('http://localhost:5000/api/chatbot/query', { message: voiceText });
            const botMessage = { from: 'bot', text: res.data.reply };
            setMessages(prev => [...prev, botMessage]);
            // Speak the bot's response
            speakText(res.data.reply);
        } catch (error) {
            const errorMessage = { from: 'bot', text: 'Sorry, I am having trouble connecting. Please try again later.' };
            setMessages(prev => [...prev, errorMessage]);
            speakText(errorMessage.text);
        } finally {
            setIsLoading(false);
            setInput('');
        }
    };

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            let finalText = '';

            const resetSilenceTimer = () => {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    // User has been silent for SILENCE_TIMEOUT — stop everything
                    console.log('🤖 Chatbot: silence timeout reached, stopping mic');
                    noSpeechRestartRef.current = false; // prevent no-speech restart
                    try { recognitionRef.current.stop(); } catch {}
                }, SILENCE_TIMEOUT);
            };

            recognitionRef.current.onresult = (event) => {
                let interim = '';
                finalText = '';
                for (let i = 0; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        finalText += result[0].transcript;
                    } else {
                        interim += result[0].transcript;
                    }
                }
                // Show interim text in the input field for live feedback
                setInput(finalText || interim);
                // Reset silence timer on every result (user is still speaking)
                resetSilenceTimer();
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                // On 'no-speech': Chrome fires this after ~5-7s even with continuous.
                // Instead of giving up, restart recognition to extend the window
                // until our own SILENCE_TIMEOUT fires.
                if (event.error === 'no-speech') {
                    if (noSpeechRestartRef.current) {
                        console.log('🤖 Chatbot: no-speech error, restarting mic (silence timer still running)');
                        // Don't clear the silence timer — it's our real timeout
                        try {
                            recognitionRef.current.stop();
                        } catch {}
                        setTimeout(() => {
                            if (noSpeechRestartRef.current) {
                                try {
                                    recognitionRef.current.start();
                                    setIsListening(true);
                                    console.log('🤖 Chatbot: mic restarted after no-speech');
                                } catch (e) {
                                    console.error('🤖 Chatbot: restart failed', e);
                                    setIsListening(false);
                                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                                    window.dispatchEvent(new CustomEvent('voice-chatbot-mic-done'));
                                }
                            }
                        }, 300);
                        return; // don't dispatch mic-done yet
                    }
                    // If noSpeechRestartRef is false, the silence timer already fired
                    setIsListening(false);
                    const errorMsg = { from: 'bot', text: 'No speech detected. Please click the microphone and try again.' };
                    setMessages(prev => [...prev, errorMsg]);
                    window.dispatchEvent(new CustomEvent('voice-chatbot-mic-done'));
                    return;
                }

                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                noSpeechRestartRef.current = false;
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    const errorMsg = { from: 'bot', text: 'Microphone access denied. Please enable microphone permissions in your browser.' };
                    setMessages(prev => [...prev, errorMsg]);
                }
                // Notify VoiceAssistant that chatbot mic is done (even on error)
                window.dispatchEvent(new CustomEvent('voice-chatbot-mic-done'));
            };

            recognitionRef.current.onend = () => {
                // If we're in a no-speech restart cycle, don't finalize yet
                if (noSpeechRestartRef.current && !finalText.trim()) {
                    console.log('🤖 Chatbot: onend during no-speech restart cycle, skipping finalize');
                    return;
                }
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                noSpeechRestartRef.current = false;
                setIsListening(false);
                // Submit the final captured text if any
                if (finalText.trim()) {
                    setInput(finalText);
                    handleVoiceInput(finalText);
                }
                // Notify VoiceAssistant that chatbot mic is done
                window.dispatchEvent(new CustomEvent('voice-chatbot-mic-done'));
            };
        }
        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for voice-assistant events (mobility users)
    useEffect(() => {
        const handleOpenChatbot = () => {
            console.log('🤖 Chatbot: received voice-open-chatbot event');
            setIsOpen(true);
        };

        const handleCloseChatbot = () => {
            console.log('🤖 Chatbot: received voice-close-chatbot event');
            setIsOpen(false);
        };

        const startChatbotMic = (retries = 0) => {
            if (!recognitionRef.current) {
                console.error('🤖 Chatbot: speech recognition not available');
                window.dispatchEvent(new CustomEvent('voice-chatbot-mic-done'));
                return;
            }
            try {
                // Make sure it's stopped first
                try { recognitionRef.current.abort(); } catch {}

                setInput('');
                noSpeechRestartRef.current = true;
                recognitionRef.current.start();
                setIsListening(true);
                // Start the silence timer
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    console.log('🤖 Chatbot: silence timeout reached (voice cmd), stopping mic');
                    noSpeechRestartRef.current = false;
                    try { recognitionRef.current.stop(); } catch {}
                }, SILENCE_TIMEOUT);
                console.log('🤖 Chatbot: mic started via voice command (15s timeout)');
            } catch (err) {
                console.error('🤖 Chatbot: error starting mic, attempt', retries + 1, err);
                if (retries < 3) {
                    // Retry after a delay — browser may still be releasing the mic
                    setTimeout(() => startChatbotMic(retries + 1), 500);
                } else {
                    console.error('🤖 Chatbot: all retries exhausted');
                    setIsListening(false);
                    window.dispatchEvent(new CustomEvent('voice-chatbot-mic-done'));
                }
            }
        };

        const handleChatbotMic = () => {
            console.log('🤖 Chatbot: received voice-chatbot-mic event');
            // Open the chatbot window first
            setIsOpen(true);

            // Stop any ongoing speech before listening
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
            }

            // Start with a small delay to ensure browser mic is fully free
            setTimeout(() => startChatbotMic(0), 400);
        };

        window.addEventListener('voice-open-chatbot', handleOpenChatbot);
        window.addEventListener('voice-close-chatbot', handleCloseChatbot);
        window.addEventListener('voice-chatbot-mic', handleChatbotMic);

        return () => {
            window.removeEventListener('voice-open-chatbot', handleOpenChatbot);
            window.removeEventListener('voice-close-chatbot', handleCloseChatbot);
            window.removeEventListener('voice-chatbot-mic', handleChatbotMic);
        };
    }, []);

    // Don't render the chatbot for admins
    if (user?.role === 'admin') {
        return null;
    }

    const toggleListening = () => {
        if (!recognitionRef.current) {
            const errorMsg = { from: 'bot', text: 'Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.' };
            setMessages(prev => [...prev, errorMsg]);
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            // Stop any ongoing speech before listening
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
            }
            setInput('');
            noSpeechRestartRef.current = true;
            recognitionRef.current.start();
            setIsListening(true);
            // Start the silence timer
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
                console.log('🤖 Chatbot: silence timeout reached (manual), stopping mic');
                noSpeechRestartRef.current = false;
                try { recognitionRef.current.stop(); } catch {}
            }, SILENCE_TIMEOUT);
        }
    };

    const toggleChat = () => setIsOpen(!isOpen);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { from: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post('http://localhost:5000/api/chatbot/query', { message: currentInput });
            const botMessage = { from: 'bot', text: res.data.reply };
            setMessages(prev => [...prev, botMessage]);
            // Speak the bot's response
            speakText(res.data.reply);
        } catch (error) {
            const errorMessage = { from: 'bot', text: 'Sorry, I am having trouble connecting. Please try again later.' };
            setMessages(prev => [...prev, errorMessage]);
            speakText(errorMessage.text);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Inline Styles ---
    const chatIconStyle = { position: 'fixed', bottom: '20px', right: '20px', backgroundColor: '#4CAF50', color: 'white', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', cursor: 'pointer', zIndex: 1000 };
    const chatWindowStyle = { position: 'fixed', bottom: '100px', right: '20px', width: '350px', height: '500px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 1000, transition: 'all 0.3s ease-in-out', transform: isOpen ? 'scale(1)' : 'scale(0)', transformOrigin: 'bottom right' };
    const messagesContainerStyle = { flexGrow: 1, padding: '10px', overflowY: 'auto', maxHeight: '320px' };
    const voiceControlStyle = { display: 'flex', flexDirection: 'column', padding: '10px', borderTop: '1px solid #eee', gap: '10px' };
    const micButtonStyle = { border: 'none', backgroundColor: isListening ? '#ff4444' : '#2196F3', color: 'white', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', transition: 'all 0.3s', boxShadow: isListening ? '0 0 15px rgba(255, 68, 68, 0.5)' : '0 2px 5px rgba(0,0,0,0.2)', flexShrink: 0 };
    const statusTextStyle = { fontSize: '12px', color: isSpeaking ? '#4CAF50' : (isListening ? '#ff4444' : '#666'), fontWeight: (isListening || isSpeaking) ? 'bold' : 'normal', textAlign: 'center' };
    const inputRowStyle = { display: 'flex', gap: '8px', alignItems: 'center' };
    const inputStyle = { flexGrow: 1, border: '1px solid #ccc', borderRadius: '20px', padding: '8px 12px', fontSize: '14px' };
    const sendButtonStyle = { border: 'none', backgroundColor: '#4CAF50', color: 'white', borderRadius: '20px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', flexShrink: 0 };
    const botMessageStyle = { textAlign: 'left', backgroundColor: '#f1f1f1', borderRadius: '10px', padding: '10px', maxWidth: '80%', alignSelf: 'flex-start', marginBottom: '10px' };
    const userMessageStyle = { textAlign: 'left', backgroundColor: '#d1f1e1', borderRadius: '10px', padding: '10px', maxWidth: '80%', alignSelf: 'flex-end', marginBottom: '10px' };

    return (
        <>
            <div style={chatIconStyle} onClick={toggleChat}>💬</div>
            <div style={chatWindowStyle}>
                <div style={{ padding: '10px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '10px 10px 0 0', textAlign: 'center' }}>
                    <h4>EduLife Assistant</h4>
                </div>
                <div style={messagesContainerStyle}>
                    {messages.map((msg, index) => (
                        <div key={index} style={msg.from === 'bot' ? botMessageStyle : userMessageStyle}>
                            {msg.text}
                        </div>
                    ))}
                    {isLoading && <div style={botMessageStyle}>...</div>}
                    <div ref={messagesEndRef} />
                </div>
                <div style={voiceControlStyle}>
                    <div style={statusTextStyle}>
                        {isSpeaking ? 'Speaking...' : (isListening ? 'Listening...' : 'Speak or Type')}
                    </div>
                    <form onSubmit={handleSend} style={inputRowStyle}>
                        <button type="button" onClick={toggleListening} style={micButtonStyle} title={isListening ? "Stop listening" : "Click to speak"} disabled={isSpeaking}>
                            {isListening ? '⏹️' : '🎤'}
                        </button>
                        <input 
                            type="text" 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            placeholder="Type your message..." 
                            style={inputStyle}
                            disabled={isListening}
                        />
                        <button type="submit" style={sendButtonStyle} disabled={isListening || !input.trim()}>Send</button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default Chatbot;