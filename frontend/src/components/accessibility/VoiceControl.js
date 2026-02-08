import React, { useRef, useEffect } from 'react';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';

const VoiceControl = ({ children, customCommands = [] }) => {
    const liveRegionRef = useRef(null);
    const {
        listening,
        transcript,
        resetTranscript,
        browserSupportsSpeechRecognition,
        toggleListening,
        handleFocusSpeak,
        speak
    } = useVoiceCommands(customCommands);

    // This effect updates the live region to announce status changes to screen readers
    useEffect(() => {
        if (liveRegionRef.current) {
            liveRegionRef.current.textContent = listening 
                ? "Voice listening activated." 
                : "Voice listening stopped.";
        }
    }, [listening]); // This effect runs whenever the 'listening' state changes

    if (!browserSupportsSpeechRecognition) {
        return (
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded mb-4">
                <h2 className="font-semibold">Browser Compatibility Notice</h2>
                <p>Your browser does not support voice controls. Please use Chrome or Edge for the best experience.</p>
                {children}
            </div>
        );
    }

    return (
        <div role="application">
            {/* Voice Control Bar */}
            <div className="bg-gray-100 p-4 rounded-lg mb-4 shadow-sm">
                <div className="flex items-center gap-4 mb-2">
                    <button
                        onClick={toggleListening}
                        onFocus={handleFocusSpeak}
                        aria-pressed={listening}
                        aria-label={listening ? "Stop listening" : "Start listening"}
                        className={`px-4 py-2 rounded-full font-semibold ${
                            listening 
                                ? 'bg-red-500 text-white hover:bg-red-600' 
                                : 'bg-green-500 text-white hover:bg-green-600'
                        } transition-colors`}
                    >
                        {listening ? "Stop Listening" : "Start Listening"}
                    </button>
                    <button
                        onClick={() => {
                            resetTranscript();
                            speak("Transcript cleared");
                        }}
                        onFocus={handleFocusSpeak}
                        aria-label="Clear transcript"
                        className="px-4 py-2 rounded-full bg-gray-500 text-white hover:bg-gray-600 transition-colors font-semibold"
                    >
                        Clear transcript
                    </button>
                </div>
                
                {/* Live Transcript */}
                <div className="text-sm text-gray-600">
                    <p>Status: {listening ? "Listening" : "Not Listening"}</p>
                    <p className="font-medium">Transcript:</p>
                    <div
                        className="bg-white border rounded p-2 min-h-[40px] mt-1"
                        tabIndex={0}
                        onFocus={handleFocusSpeak}
                        aria-label="Voice transcript"
                    >
                        {transcript || <em className="text-gray-400">Say a command...</em>}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {children}

            {/* Hidden live region for screen readers */}
            <div
                aria-hidden="false"
                aria-live="polite"
                ref={liveRegionRef}
                className="sr-only"
            />
        </div>
    );
};

export default VoiceControl;