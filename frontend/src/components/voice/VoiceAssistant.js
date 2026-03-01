import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, MicOff } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { PAGES_COMMANDS } from './voiceCommands';
import { API_BASE_URL } from '../../api/apiConfig';

const VoiceAssistant = () => {
  const [listening, setListening] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [helpList, setHelpList] = useState([]);
  const liveRegionRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  // Debug logging function
  const logVoice = (message, data = null) => {
    console.log(`🎤 VoiceAssistant: ${message}`, data);
  };

  // Check microphone permissions
  useEffect(() => {
    try {
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'microphone' });
        logVoice('Microphone permission status checked');
      }
    } catch (error) {
      logVoice('Error checking microphone permissions', error);
    }
  }, []);

  const routes = {
    mobilityDashboard: '/dashboard/mobility',
    visualDashboard: '/dashboard/visual',
    profile: '/profile',
    newCourses: '/new-courses',
    coursesHistory: '/courses-history',
    quizzes: '/quizzes',
    quizzesHistory: '/quizzes-history',
    settings: '/settings',
    courseViewer: '/course'
  };

  const subjects = [
    'English', 'Mathematics', 'Science', 'History', 'Geography'
  ];

  const speak = useCallback((text, { interrupt = true } = {}) => {
    logVoice('Speaking text', { text, interrupt });
    if (!('speechSynthesis' in window)) {
      logVoice('Speech synthesis not supported in browser');
      return;
    }
    try {
      const synth = window.speechSynthesis;
      if (interrupt) synth.cancel();

      // If we're currently listening, stop recognition while we speak to avoid
      // the TTS audio being picked up as new voice input (which can create loops).
      try {
        if (listeningRef.current) {
          restartAfterSpeakRef.current = true;
          SpeechRecognition.stopListening();
        }
      } catch (e) {
        logVoice('Error stopping recognition before speak', e);
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;

      // Mark speaking state so callbacks can avoid reacting to commands while TTS runs
      isSpeakingRef.current = true;

      utter.onend = () => {
        isSpeakingRef.current = false;
        // Restore listening if we stopped it earlier — but NOT during chatbot handoff
        if (restartAfterSpeakRef.current) {
          restartAfterSpeakRef.current = false;
          if (!chatbotHandoffRef.current) {
            try {
              SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
            } catch (err) {
              logVoice('Error restarting recognition after speak', err);
            }
          } else {
            logVoice('Skipping mic restart after speak - chatbot handoff active');
          }
        }
        if (liveRegionRef.current) liveRegionRef.current.textContent = text;
      };

      utter.onerror = (err) => {
        logVoice('TTS utterance error', err);
        isSpeakingRef.current = false;
      };

      synth.speak(utter);
    } catch (e) {
      logVoice('TTS error', e);
      console.error('TTS error', e);
    }
  }, []);

  

  // Speak an array of messages in sequence and show on-screen list while speaking
  const speakCommands = useCallback((items = []) => {
    logVoice('speakCommands called', { itemsLength: items.length });
    if (!('speechSynthesis' in window)) {
      logVoice('Speech synthesis not supported in browser for speakCommands');
      return;
    }

    const synth = window.speechSynthesis;
    try { synth.cancel(); } catch (e) { logVoice('Error canceling synth before speakCommands', e); }

    // Stop recognition once before speaking the sequence
    const wasListening = listeningRef.current;
    try {
      if (wasListening) SpeechRecognition.stopListening();
    } catch (e) {
      logVoice('Error stopping recognition before speakCommands', e);
    }

    isSpeakingRef.current = true;
    try { setHelpList(items); setHelpVisible(true); } catch (e) { logVoice('Error setting helpVisible', e); }

    const speakNext = (i) => {
      if (i >= items.length) {
        isSpeakingRef.current = false;
        try { setHelpVisible(false); setHelpList([]); } catch (e) { logVoice('Error clearing helpVisible', e); }
        if (wasListening) {
          try {
            SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
          } catch (err) {
            logVoice('Error restarting recognition after speakCommands', err);
          }
        }
        return;
      }

      try {
        logVoice('speakCommands speaking item', { index: i, text: items[i] });
        const utter = new SpeechSynthesisUtterance(items[i]);
        utter.rate = 1;
        utter.pitch = 1;
        utter.onend = () => speakNext(i + 1);
        utter.onerror = (err) => {
          logVoice('TTS error during speakCommands', err);
          speakNext(i + 1);
        };
        synth.speak(utter);
        if (liveRegionRef.current) liveRegionRef.current.textContent = items[i];
      } catch (e) {
        logVoice('speakCommands utter error', e);
        speakNext(i + 1);
      }
    };

    speakNext(0);
  }, []);

  // Refs to manage speaking/listening state safely in callbacks/effects
  const isSpeakingRef = useRef(false);
  const restartAfterSpeakRef = useRef(false);
  const listeningRef = useRef(listening);

  // Keep listeningRef updated when listening state changes
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // Use refs to track previous values and avoid infinite loops
  const prevPathRef = useRef(location.pathname);
  const prevUserRef = useRef(user);

  useEffect(() => {
    // Check if voice assistant should be visible
    let shouldBeVisible = false;
    
    if (user && (user.disabilityType === 'mobility' || user.disabilityType === 'visual')) {
      const currentPath = location.pathname;
      const exactPaths = [
        '/dashboard/mobility',
        '/dashboard/visual', 
        '/profile',
        '/new-courses',
        '/courses-history',
        '/quizzes',
        '/quizzes-history',
        '/settings'
      ];
      
      shouldBeVisible = (
        exactPaths.includes(currentPath) ||
        currentPath.startsWith('/quiz/') ||
        currentPath.startsWith('/course/')
      );
    }
    
    // Only update if something actually changed
    const pathChanged = prevPathRef.current !== location.pathname;
    const userChanged = prevUserRef.current?.disabilityType !== user?.disabilityType;
    
    if (pathChanged || userChanged || shouldBeVisible !== isVisible) {
      logVoice('Voice assistant visibility update', {
        shouldBeVisible,
        currentPath: location.pathname,
        pathChanged,
        userChanged,
        userDisability: user?.disabilityType
      });
      
      setIsVisible(shouldBeVisible);
      
      // Stop listening if navigating away from supported page
      if (!shouldBeVisible && listening) {
        logVoice('Stopping voice assistant - navigated away from supported page');
        SpeechRecognition.stopListening();
        setListening(false);
        speak('Voice assistant disabled', { interrupt: true });
      }
    }
    
    // Update refs
    prevPathRef.current = location.pathname;
    prevUserRef.current = user;
  }, [location.pathname, user, isVisible, listening, speak]);

  // Auto-start listening for mobility users and keep it on throughout session
  useEffect(() => {
    // Do NOT auto-restart if mic was intentionally paused for chatbot handoff
    if (chatbotHandoffRef.current) {
      logVoice('Skipping auto-start - chatbot handoff active');
      return;
    }
    if (user?.disabilityType === 'mobility' && isVisible && !listening) {
      logVoice('Auto-starting voice commands for mobility user - mic will stay on');
      const timer = setTimeout(() => {
        if (!listeningRef.current && user?.disabilityType === 'mobility' && !chatbotHandoffRef.current) {
          SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
          setListening(true);
          logVoice('✅ Voice commands active - mic is red, ready for direct commands');
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user?.disabilityType, isVisible, listening]);
  // Flag to suppress auto-restart of VoiceAssistant mic during chatbot handoff
  const chatbotHandoffRef = useRef(false);

  // Flag to track if video is playing (for filtering false commands)
  const videoPlayingRef = useRef(false);

  function setVideoPlayingMode(isPlaying) {
    videoPlayingRef.current = isPlaying;
    if (isPlaying) {
      logVoice("Video playing mode enabled - filtering audio interference but keeping video audio");
      // Don't mute the video - let it play with sound
      // Instead, we'll use smart filtering in the voice commands
    } else {
      logVoice("Video playing mode disabled - normal listening resumed");
    }
  }

  function goTo(target) {
    logVoice('Processing voice navigation command', { target });
    const normalized = target.toLowerCase();

    // Check for navigation commands FIRST (before subject matching)
    if (normalized.includes('dashboard')) {
      logVoice('Navigating to dashboard');
      navigate('/dashboard');
      speak('Navigating to dashboard');
    } else if (normalized.includes('profile')) {
      logVoice('Navigating to profile');
      navigate('/profile');
      speak('Opening profile page');
    } else if (normalized.includes('new courses')) {
      logVoice('Navigating to new courses');
      navigate('/new-courses');
      speak('Opening your courses');
    } else if (normalized.includes('courses history')) {
      logVoice('Navigating to courses history');
      navigate('/courses-history');
      speak('Opening your courses history');
    } else if (normalized.includes('quizzes history')) {
      logVoice('Navigating to quizzes history');
      navigate('/quizzes-history');
      speak('Opening your quizzes history');
    } else if (normalized.includes('quizzes') && !normalized.includes('history')) {
      logVoice('Navigating to quizzes');
      navigate('/quizzes');
      speak('Opening quizzes');
    } else if (normalized.includes('settings')) {
      logVoice('Navigating to settings');
      navigate('/settings');
      speak('Opening your settings');
    } else {
      // Only check for subjects if no navigation command matched
      const matchedSubject = subjects.find((subj) =>
        normalized.includes(subj.toLowerCase())
      );
      if (matchedSubject) {
        logVoice('Navigating to subject', { subject: matchedSubject });
        navigate(`/new-courses?subject=${matchedSubject}`);
        speak(`Opening ${matchedSubject} courses`);
        window.dispatchEvent(new CustomEvent('voice-subject-select', { detail: matchedSubject }));
      } else {
        logVoice('No matching command or subject found', { target });
        speak(`I couldn't find general ${target}`);
      }
    }
  }

  // Wrapper function to check listening state and video playing mode before executing commands
  const withListeningCheck = (callback) => {
    return (...args) => {
      if (!listening) {
        logVoice('Command ignored - not listening');
        return;
      }
      // Allow certain critical commands even during video playback
      const allowedDuringVideo = ['pause', 'stop', 'quiz'];
      const command = args[0] || '';
      const isAllowedDuringVideo = allowedDuringVideo.some(keyword => 
        command.toLowerCase().includes(keyword)
      );
      
      if (videoPlayingRef.current && !isAllowedDuringVideo) {
        logVoice('Command ignored - video playing mode (not critical command)', { command });
        return;
      }
      return callback(...args);
    };
  };

  // 🎙 Voice commands
  const commands = [
    {
      // PRIORITY: Quizzes History - Must come before general quiz commands
      command: /.*(quizzes?\s+history|quiz\s+history).*/i,
      callback: withListeningCheck(() => {
        logVoice('Voice command triggered: quizzes history (priority)');
        navigate('/quizzes-history');
        speak('Opening your quizzes history');
      }),
    },
    // Subject-specific regex commands that catch keywords anywhere in speech
    {
      command: /.*english.*/i,
      callback: () => {
        logVoice('Voice command triggered: English subject', { currentPath: location.pathname });
        if (location.pathname === '/new-courses') {
          navigate('/new-courses?subject=English');
          speak('Opening English courses');
          window.dispatchEvent(new CustomEvent('voice-subject-select', { detail: 'English' }));
        } else {
          speak('Please go to new courses page to select a subject');
        }
      },
    },
    {
      command: /.*mathematics?.*/i,
      callback: () => {
        logVoice('Voice command triggered: Mathematics subject', { currentPath: location.pathname });
        if (location.pathname === '/new-courses') {
          navigate('/new-courses?subject=Mathematics');
          speak('Opening Mathematics courses');
          window.dispatchEvent(new CustomEvent('voice-subject-select', { detail: 'Mathematics' }));
        } else {
          speak('Please go to new courses page to select a subject');
        }
      },
    },
    {
      command: /.*math.*/i,
      callback: () => {
        logVoice('Voice command triggered: Math subject (short form)', { currentPath: location.pathname });
        if (location.pathname === '/new-courses') {
          navigate('/new-courses?subject=Mathematics');
          speak('Opening Mathematics courses');
          window.dispatchEvent(new CustomEvent('voice-subject-select', { detail: 'Mathematics' }));
        } else {
          speak('Please go to new courses page to select a subject');
        }
      },
    },
    {
      command: /.*science.*/i,
      callback: () => {
        logVoice('Voice command triggered: Science subject', { currentPath: location.pathname });
        if (location.pathname === '/new-courses') {
          navigate('/new-courses?subject=Science');
          speak('Opening Science courses');
          window.dispatchEvent(new CustomEvent('voice-subject-select', { detail: 'Science' }));
        } else {
          speak('Please go to new courses page to select a subject');
        }
      },
    },
    {
      command: /.*history.*/i,
      callback: () => {
        logVoice('Voice command triggered: History subject', { currentPath: location.pathname });
        if (location.pathname === '/new-courses') {
          navigate('/new-courses?subject=History');
          speak('Opening History courses');
          window.dispatchEvent(new CustomEvent('voice-subject-select', { detail: 'History' }));
        } else {
          speak('Please go to new courses page to select a subject');
        }
      },
    },
    {
      command: /.*geography.*/i,
      callback: () => {
        logVoice('Voice command triggered: Geography subject', { currentPath: location.pathname });
        if (location.pathname === '/new-courses') {
          navigate('/new-courses?subject=Geography');
          speak('Opening Geography courses');
          window.dispatchEvent(new CustomEvent('voice-subject-select', { detail: 'Geography' }));
        } else {
          speak('Please go to new courses page to select a subject');
        }
      },
    },
    {
      command: ['go to *', 'show me *'],
      callback: (target) => {
        logVoice('Voice command triggered: navigation', { target });
        goTo(target);
      },
    },
    {
      command: /.*dashboard.*/i,
      callback: () => {
        logVoice('Voice command triggered: dashboard');
        navigate('/dashboard');
        speak('Opening dashboard');
      },
    },
    {
      command: /.*(new\s+courses|courses).*/i,
      callback: () => {
        logVoice('Voice command triggered: new courses');
        navigate('/new-courses');
        speak('Opening your courses');
      },
    },
    {
      command: /.*(courses?\s+history|course\s+history).*/i,
      callback: () => {
        logVoice('Voice command triggered: courses history');
        navigate('/courses-history');
        speak('Opening your courses history');
      },
    },
    {
      // Handle "view [lesson name]" on courses-history page
      command: /.*view\s+(.+)/i,
      callback: async (lessonName) => {
        logVoice('Voice command triggered: view lesson', { lessonName, currentPath: location.pathname });
        
        if (location.pathname === '/courses-history') {
          try {
            logVoice('Searching for lesson on courses history page', { lessonName });
            const searchUrl = `${API_BASE_URL}/courses/search/lesson/${encodeURIComponent(lessonName)}`;
            const searchResponse = await fetch(searchUrl);
            
            if (searchResponse.ok) {
              const result = await searchResponse.json();
              if (result.success) {
                logVoice('Found lesson match', {
                  lessonTitle: result.lessonTitle,
                  courseId: result.courseId,
                  lessonIndex: result.lessonIndex
                });
                
                speak(`Opening ${result.lessonTitle}`);
                setTimeout(() => {
                  navigate(`/course/${result.courseId}?lesson=${result.lessonIndex}`);
                }, 500);
                return;
              }
            }
            
            logVoice('Lesson not found', { lessonName });
            speak(`Sorry, I couldn't find a lesson named ${lessonName}`);
          } catch (error) {
            logVoice('Error searching for lesson', { error: error.message });
            speak(`There was an error searching for ${lessonName}`);
          }
        } else {
          speak('This command is only available on the courses history page');
        }
      },
    },
    {
      command: /^(?!.*quiz).*\b(play|start)\b(?!.*quiz).*/i,
      callback: () => {
        if (location.pathname.startsWith('/course/')) {
          logVoice("Voice command: play video");
          window.dispatchEvent(new CustomEvent('voice-video-play'));
          setVideoPlayingMode(true);   // ✔ enable video mode but keep listening
          speak("Playing video");
        }
      },
    },
    {
      command: /.*pause.*/i,
      callback: () => {
        if (location.pathname.startsWith('/course/')) {
          logVoice("Voice command: pause video");
          window.dispatchEvent(new CustomEvent('voice-video-pause'));
          setVideoPlayingMode(false);  // ✔ disable video mode
          speak("Video paused");
        }
      },
    },

    {
      command: /.*profile.*/i,
      callback: () => {
        logVoice('Voice command triggered: profile');
        navigate('/profile');
        speak('Opening your profile');
      },
    },
    {
      command: /.*settings.*/i,
      callback: () => {
        logVoice('Voice command triggered: settings');
        navigate('/settings');
        speak('Opening settings');
      },
    },
    {
      // Note: This must come AFTER quizzes history command to avoid conflicts
      command: /quiz(es)?\s+history/i,
      callback: () => {
        logVoice('Voice command triggered: quizzes');
        navigate('/quizzes-history');
        speak('Opening available quizzes');
      },
    },
    {
      command: /.*(log\s*out|sign\s*out).*/i,
      callback: () => {
        logVoice('Voice command triggered: logout');
        window.dispatchEvent(new CustomEvent('voice-logout-request'));
        navigate('/auth');        
      },
    },
    {
      command: /.*back.*/i,
      callback: () => {
        logVoice('Voice command triggered: back to subjects (regex match)');
        // If TTS is currently speaking, ignore this command to avoid a loop
        if (isSpeakingRef.current) {
          logVoice('Ignoring back-to-subjects command while speaking');
          return;
        }

        window.dispatchEvent(new CustomEvent('voice-back-to-subjects'));
        navigate('/new-courses');
        speak('Going back to subjects');
      },
    },
    {
      //.* allows extra words before and after 
      // Flexible dark mode detection: "dark", "dark mode", "switch to dark", etc.
      command: /.*dark.*/i, 
      callback: () => {
        logVoice('Voice command triggered: dark mode (regex)', { currentPath: location.pathname, settingsRoute: routes.settings });
        if (location.pathname === routes.settings) {
          logVoice('Dispatching voice-theme-change event', { theme: 'dark' });
          window.dispatchEvent(new CustomEvent('voice-theme-change', { detail: 'dark' }));
          speak('Switching to dark mode');
        } else {
          logVoice('Not on settings page for dark mode', { currentPath: location.pathname, settingsPath: routes.settings });
          speak('Please go to settings page to change theme');
        }
      },
    },
    {
      // Flexible light mode detection: "light", "light mode", "switch to light", etc.
      command: /.*light.*/i,
      callback: () => {
        logVoice('Voice command triggered: light mode (regex)', { currentPath: location.pathname, settingsRoute: routes.settings });
        if (location.pathname === routes.settings) {
          logVoice('Dispatching voice-theme-change event', { theme: 'light' });
          window.dispatchEvent(new CustomEvent('voice-theme-change', { detail: 'light' }));
          speak('Switching to light mode');
        } else {
          logVoice('Not on settings page for light mode', { currentPath: location.pathname, settingsPath: routes.settings });
          speak('Please go to settings page to change theme');
        }
      },
    },
    {
      // Flexible font size detection: "small", "font size small", "make it small", etc.
      command: /.*small.*/i,
      callback: () => {
        logVoice('Voice command triggered: small font', { currentPath: location.pathname, settingsRoute: routes.settings });
        if (location.pathname === routes.settings) {
          logVoice('Dispatching voice-font-change event', { size: 'small' });
          window.dispatchEvent(new CustomEvent('voice-font-change', { detail: 'small' }));
          speak('Setting font size to small');
        } else {
          logVoice('Not on settings page', { currentPath: location.pathname, settingsPath: routes.settings });
          speak('Please go to settings page to change font size');
        }
      },
    },
    {
      // Flexible font size detection: "medium", "font size medium", "make it medium", etc.
      command: /.*medium.*/i,
      callback: () => {
        logVoice('Voice command triggered: medium font', { currentPath: location.pathname, settingsRoute: routes.settings });
        if (location.pathname === routes.settings) {
          logVoice('Dispatching voice-font-change event', { size: 'medium' });
          window.dispatchEvent(new CustomEvent('voice-font-change', { detail: 'medium' }));
          speak('Setting font size to medium');
        } else {
          logVoice('Not on settings page', { currentPath: location.pathname, settingsPath: routes.settings });
          speak('Please go to settings page to change font size');
        }
      },
    },
    {
      // Flexible font size detection: "large", "font size large", "make it large", etc.
      command: /.*large.*/i,
      callback: () => {
        logVoice('Voice command triggered: large font', { currentPath: location.pathname, settingsRoute: routes.settings });
        if (location.pathname === routes.settings) {
          logVoice('Dispatching voice-font-change event', { size: 'large' });
          window.dispatchEvent(new CustomEvent('voice-font-change', { detail: 'large' }));
          speak('Setting font size to large');
        } else {
          logVoice('Not on settings page', { currentPath: location.pathname, settingsPath: routes.settings });
          speak('Please go to settings page to change font size');
        }
      },
    },
    {
      command: ['start lesson *', 'start *', 'begin lesson *', 'begin *', 'open lesson *', 'open *'],
      callback: (lessonName) => {
        logVoice('Voice command triggered: start lesson', { lessonName, currentPath: location.pathname });
        
        // Only work on new courses page
        if (location.pathname === routes.newCourses) {
          // Clean up the lesson name (remove punctuation, normalize)
          const cleanedLessonName = lessonName.replace(/[.,!?]/g, '').trim();
          logVoice('Starting lesson search', { originalName: lessonName, cleanedName: cleanedLessonName });
          
          // Dispatch event to NewCourses page to handle the search
          window.dispatchEvent(new CustomEvent('voice-search-course', { detail: cleanedLessonName }));
          
        } else {
          logVoice('Not on new courses page for lesson start', { 
            currentPath: location.pathname, 
            newCoursesPath: routes.newCourses 
          });
          speak('Please go to new courses page to start a lesson');
        }
      },
    },
    {
      command: /.*quiz.*/i,
      callback: () => {
        logVoice('Voice command triggered: quiz', { currentPath: location.pathname });
        
        // Only work on course viewer page (where quiz link appears)
        if (location.pathname.startsWith('/course/')) {
          window.dispatchEvent(new CustomEvent('voice-take-quiz'));
          speak('Taking the quiz');
        } else {
          logVoice('Not on course page for quiz', { currentPath: location.pathname });
          speak('Please go to a course lesson to take a quiz');
        }
      },
    },
    {
      command: /(?:option|select|choose|pick)\s*(?:(\d+)|(one|two|three|four|1st|2nd|3rd|4th|first|second|third|fourth))/i,
      callback: (command, digitNum, wordNum) => {
        logVoice('Voice command triggered: select option', { 
          command,
          digitNum, 
          wordNum, 
          transcript,
          currentPath: location.pathname 
        });

        if (!location.pathname.startsWith('/quiz/')) {
          speak('Please go to a quiz to select an option');
          return;
        }

        // Use the transcript from useSpeechRecognition hook
        const fullTranscript = transcript || '';
        
        logVoice('Using transcript for option selection', { 
          fullTranscript, 
          transcriptLength: fullTranscript.length 
        });

        // Find ALL matches in the transcript to get the last (most recent) command
        let allMatches = [];
        try {
          allMatches = [...fullTranscript.matchAll(/(?:option|select|choose|pick)\s*(?:(\d+)|(one|two|three|four|1st|2nd|3rd|4th|first|second|third|fourth))/gi)];
        } catch (error) {
          logVoice('Error during matchAll operation', { 
            error: error.message, 
            fullTranscript, 
            transcriptType: typeof fullTranscript 
          });
          speak('Please choose option 1, 2, 3, or 4');
          return;
        }

        const lastMatch = allMatches[allMatches.length - 1];
        
        logVoice('All option matches found', { 
          fullTranscript,
          totalMatches: allMatches.length, 
          allMatches: allMatches.map(m => m[0]),
          lastMatch: lastMatch?.[0] 
        });

        if (!lastMatch || allMatches.length === 0) {
          logVoice('No valid option matches found', { fullTranscript, allMatches: allMatches.length });
          speak('Please choose option 1, 2, 3, or 4');
          return;
        }

        const [, lastDigitNum, lastWordNum] = lastMatch;
        let optionIndex = -1;
        let spokenOption = '';

        // Handle digit numbers
        if (lastDigitNum) {
          const num = parseInt(lastDigitNum, 10);
          if (num >= 1 && num <= 4) {
            optionIndex = num - 1; // Convert to 0-based index
            spokenOption = lastDigitNum;
          }
        }
        // Handle word numbers
        else if (lastWordNum) {
          const wordLower = lastWordNum.toLowerCase();
          const wordToNum = {
            'one': 1, '1st': 1, 'first': 1,
            'two': 2, '2nd': 2, 'second': 2,
            'three': 3, '3rd': 3, 'third': 3,
            'four': 4, '4th': 4, 'fourth': 4
          };
          
          if (wordToNum[wordLower]) {
            optionIndex = wordToNum[wordLower] - 1; // Convert to 0-based index
            spokenOption = wordToNum[wordLower].toString();
          }
        }

        logVoice('Option selection processing', { 
          optionIndex, 
          spokenOption,
          lastDigitNum,
          lastWordNum,
          selectedCommand: lastMatch[0]
        });

        if (optionIndex >= 0 && optionIndex <= 3) {
          window.dispatchEvent(
            new CustomEvent('voice-select-option', { detail: optionIndex })
          );
          speak(`Selected option ${spokenOption}`);
          logVoice('Successfully dispatched voice-select-option event', { optionIndex });
        } else {
          logVoice('Invalid option selection', { lastDigitNum, lastWordNum, optionIndex });
          speak('Please choose option 1, 2, 3, or 4');
        }
      },
    },
  
    {
      command: /.*next.*question.*/i,
      callback: () => {
        logVoice('Voice command triggered: next question', { currentPath: location.pathname });
        
        // Only work on quiz taker page
        if (location.pathname.startsWith('/quiz/')) {
          window.dispatchEvent(new CustomEvent('voice-next-question'));
          speak('Next question');
        } else {
          speak('Please go to a quiz to go to next question');
        }
      },
    },
    {
      command: /.*submit.*quiz.*/i,
      callback: () => {
        logVoice('Voice command triggered: submit quiz', { currentPath: location.pathname });
        
        // Only work on quiz taker page
        if (location.pathname.startsWith('/quiz/')) {
          window.dispatchEvent(new CustomEvent('voice-submit-quiz'));
          speak('Submitting quiz');
        } else {
          speak('Please go to a quiz to submit');
        }
      },
    },
    {
      command: /.*full.*transcript.*/i,
      callback: () => {
        logVoice('Voice command triggered: show full transcript', { currentPath: location.pathname });
        
        // Only work on course viewer page (where video player exists)
        if (location.pathname.startsWith('/course/')) {
          window.dispatchEvent(new CustomEvent('voice-show-transcript'));
          speak('Showing full transcript');
        } else {
          logVoice('Not on course page for show transcript', { currentPath: location.pathname });
          speak('Please go to a course lesson to show transcript');
        }
      },
    },
    {
      command: /.*hide.*transcript.*/i,
      callback: () => {
        logVoice('Voice command triggered: hide transcript', { currentPath: location.pathname });
        
        // Only work on course viewer page (where video player exists)
        if (location.pathname.startsWith('/course/')) {
          window.dispatchEvent(new CustomEvent('voice-hide-transcript'));
          speak('Hiding transcript');
        } else {
          logVoice('Not on course page for hide transcript', { currentPath: location.pathname });
          speak('Please go to a course lesson to hide transcript');
        }
      },
    },
    {
  command: /.*mute\s*video.*/i,
  callback: () => {
    if (location.pathname.startsWith('/course/')) {
      logVoice("Voice command: mute video");
      window.dispatchEvent(new CustomEvent('voice-video-mute'));
      speak("Video muted");
    }
  }
},
{
  command: /.*unmute\s*video.*/i,
  callback: () => {
    if (location.pathname.startsWith('/course/')) {
      logVoice("Voice command: unmute video");
      window.dispatchEvent(new CustomEvent('voice-video-unmute'));
      speak("Video unmuted");
    }
  }
},  
    {
      command: ['stop listening'],
      callback: () => {
        logVoice('Voice command triggered: stop listening');
        stopListening();
      },
    },
    {
      command: ['start listening'],
      callback: () => {
        logVoice('Voice command triggered: start listening');
        startListening();
      },
    },
    {
      command: /(scroll\s*up(\s*a\s*little)?|scroll\s*up\s*a\s*lot)/i,
      callback: (phrase) => {
        logVoice(`Voice command: ${phrase}`);

        let amount = -400; // default scroll up

        if (/a\s*little/i.test(phrase)) amount = -200;
        if (/a\s*lot/i.test(phrase)) amount = -800;

        window.scrollBy({ top: amount, behavior: 'smooth' });
      },
    },
    {
      command: /(scroll\s*down(\s*a\s*little)?|scroll\s*down\s*a\s*lot)/i,
      callback: (phrase) => {
        logVoice(`Voice command: ${phrase}`);

        let amount = 400; // default scroll down

        if (/a\s*little/i.test(phrase)) amount = 200;
        if (/a\s*lot/i.test(phrase)) amount = 800;

        window.scrollBy({ top: amount, behavior: 'smooth' });
      },
    },
    // ---- Chatbot voice commands (mobility only) ----
    {
      command: /.*open\s*chat\s*bot.*/i,
      callback: () => {
        logVoice('Voice command triggered: open chatbot');
        window.dispatchEvent(new CustomEvent('voice-open-chatbot'));
        speak('Opening chatbot');
      },
    },
    {
      command: /.*close\s*chat\s*bot.*/i,
      callback: () => {
        logVoice('Voice command triggered: close chatbot');
        window.dispatchEvent(new CustomEvent('voice-close-chatbot'));
        speak('Closing chatbot');
      },
    },
    {
      command: /.*(chat\s*bot\s*mic|ask\s*chat\s*bot|talk\s*to\s*chat\s*bot).*/i,
      callback: () => {
        logVoice('Voice command triggered: chatbot mic');
        // Set handoff flag BEFORE stopping, so auto-start effect & speak() won't restart
        chatbotHandoffRef.current = true;
        // Use abortListening to forcefully release the browser mic
        try {
          SpeechRecognition.abortListening();
          setListening(false);
          listeningRef.current = false;
          logVoice('VoiceAssistant mic aborted for chatbot mic handoff');
        } catch (e) {
          logVoice('Error aborting VoiceAssistant mic', e);
        }
        speak('Activating chatbot microphone. Speak your question.');
        // Wait for TTS to finish, then hand off to chatbot mic with delay
        const waitForTTS = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(waitForTTS);
            // Give browser time to fully release the mic
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('voice-chatbot-mic'));
            }, 600);
          }
        }, 300);
      },
    }
  ];

  const { browserSupportsSpeechRecognition, transcript } = useSpeechRecognition({ commands });

  // Log transcript changes
  useEffect(() => {
    if (transcript) {
      logVoice('Transcript updated', { transcript });
    }
  }, [transcript]);

  // Add additional logging for speech recognition events
  useEffect(() => {
    logVoice('Browser speech recognition support', { 
      browserSupportsSpeechRecognition,
      isHttps: window.location.protocol === 'https:',
      userAgent: navigator.userAgent,
      speechRecognition: !!window.SpeechRecognition || !!window.webkitSpeechRecognition
    });
    
    // Log when speech recognition starts/stops
    const handleSpeechStart = () => logVoice('Speech recognition started');
    const handleSpeechEnd = () => logVoice('Speech recognition ended');
    const handleSpeechError = (event) => logVoice('Speech recognition error', event.error);
    const handleSpeechResult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      logVoice('Speech recognition result', { transcript, confidence: event.results[0]?.[0]?.confidence });
    };

    if (browserSupportsSpeechRecognition) {
      // Note: These events might not be available in all browsers, but we'll try to log them
      window.addEventListener('speechstart', handleSpeechStart);
      window.addEventListener('speechend', handleSpeechEnd);
      window.addEventListener('speecherror', handleSpeechError);
      window.addEventListener('speechresult', handleSpeechResult);
    }

    return () => {
      if (browserSupportsSpeechRecognition) {
        window.removeEventListener('speechstart', handleSpeechStart);
        window.removeEventListener('speechend', handleSpeechEnd);
        window.removeEventListener('speecherror', handleSpeechError);
        window.removeEventListener('speechresult', handleSpeechResult);
      }
    };
  }, [browserSupportsSpeechRecognition]);

  // Listen for programmatic requests to read page commands from other UI components
  useEffect(() => {
    const handleReadPage = (e) => {
      const pageKey = e.detail;
      logVoice('UI requested read-page-commands', { pageKey });
      if (pageKey && PAGES_COMMANDS[pageKey]) speakCommands(PAGES_COMMANDS[pageKey]);
      else speak('Sorry, I cannot find commands for that page');
    };

    window.addEventListener('read-page-commands', handleReadPage);
    return () => window.removeEventListener('read-page-commands', handleReadPage);
  }, [speakCommands, speak]);

  // Resume VoiceAssistant mic after chatbot mic finishes
  useEffect(() => {
    const handleChatbotMicDone = () => {
      logVoice('Chatbot mic done - resuming VoiceAssistant mic');
      // Clear handoff flag so auto-start can work again
      chatbotHandoffRef.current = false;
      if (user?.disabilityType === 'mobility' && isVisible) {
        try {
          SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
          setListening(true);
          logVoice('VoiceAssistant mic resumed after chatbot mic handoff');
        } catch (e) {
          logVoice('Error resuming VoiceAssistant mic', e);
        }
      }
    };

    window.addEventListener('voice-chatbot-mic-done', handleChatbotMicDone);
    return () => window.removeEventListener('voice-chatbot-mic-done', handleChatbotMicDone);
  }, [user?.disabilityType, isVisible]);

  function startListening() {
    logVoice('Attempting to start listening', {
      browserSupport: browserSupportsSpeechRecognition,
      currentlyListening: listening
    });
    
    try {
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
      setListening(true);
      speak('Voice control activated');
      logVoice('Successfully started listening');
    } catch (error) {
      logVoice('Error starting listening', error);
    }
  }

  function stopListening() {
    logVoice('Attempting to stop listening', { currentlyListening: listening });
    
    try {
      SpeechRecognition.stopListening();
      setListening(false);
      speak('Voice control deactivated');
      logVoice('Successfully stopped listening');
    } catch (error) {
      logVoice('Error stopping listening', error);
    }
  }

  function toggleListening() {
    logVoice('Toggling listening state', { currentlyListening: listening });
    if (listening) stopListening();
    else startListening();
  }

  // Use refs to track previous render state to reduce logging noise
  const prevRenderState = useRef({ listening: false, isVisible: false });
  
  if (!browserSupportsSpeechRecognition || !isVisible) {
    if (prevRenderState.current.isVisible) {
      logVoice('Voice assistant hidden', {
        browserSupport: browserSupportsSpeechRecognition,
        isVisible,
        reason: !browserSupportsSpeechRecognition ? 'No browser support' : 'Not visible'
      });
      prevRenderState.current = { listening, isVisible };
    }
    return null;
  }

  // Only log when listening state or visibility actually changes
  if (prevRenderState.current.listening !== listening || prevRenderState.current.isVisible !== isVisible) {
    logVoice('Voice assistant state changed', { 
      listening, 
      isVisible,
      previousListening: prevRenderState.current.listening,
      previousVisible: prevRenderState.current.isVisible
    });
    prevRenderState.current = { listening, isVisible };
  }

  return (
    <>
      {/* Debug Panel - Only visible in development or with debug flag */}
      {(process.env.NODE_ENV === 'development' || window.location.search.includes('debug=voice')) && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 10000,
          maxWidth: '300px'
        }}>
          <strong>🎤 Voice Debug</strong><br/>
          User: {user?.name || 'None'}<br/>
          Disability: {user?.disabilityType || 'None'}<br/>
          Path: {location.pathname}<br/>
          Visible: {isVisible ? '✅' : '❌'}<br/>
          Listening: {listening ? '🔴' : '⚫'}<br/>
          Browser Support: {browserSupportsSpeechRecognition ? '✅' : '❌'}<br/>
          Last Transcript: {transcript || 'None'}<br/>
          <small>Add ?debug=voice to URL to show this panel</small>
        </div>
      )}

      {/* Voice Status for Mobility Users */}
      {user?.disabilityType === 'mobility' && isVisible && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          zIndex: 9998,
          background: listening ? 'rgba(239, 68, 68, 0.95)' : 'rgba(34, 197, 94, 0.95)',
          color: 'white',
          padding: '10px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          maxWidth: '200px',
          textAlign: 'center'
        }}>
          {listening ? (
            <><strong>🎤 Voice Commands Active</strong><br/>Say your command directly</>
          ) : (
            <><strong>⏳ Starting...</strong><br/>Voice commands loading</>
          )}
        </div>
      )}

          {/* Help overlay - visible when speakCommands is active or when user triggers page read */}
          {helpVisible && (
            <div aria-live="polite" style={{
              position: 'fixed',
              bottom: '100px',
              right: '20px',
              zIndex: 10001,
              background: 'rgba(0,0,0,0.85)',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              maxWidth: '360px'
            }}>
              <strong>Voice commands:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px' }}>
                {helpList.map((c, i) => (
                  <li key={i} style={{ marginBottom: '6px' }}>{c}</li>
                ))}
              </ul>
              <div style={{ marginTop: '8px', textAlign: 'right' }}>
                <button onClick={() => { setHelpVisible(false); setHelpList([]); }} style={{ padding: '6px 10px' }}>Close</button>
              </div>
            </div>
          )}

      <button
        onClick={toggleListening}
        style={{
          position: 'fixed',
          bottom: '25px',
          right: '90px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: listening ? '#ef4444' : '#22c55e',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '55px',
          height: '55px',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
        }}
        title={user?.disabilityType === 'mobility' 
          ? (listening ? 'Voice commands active - click to stop' : 'Voice commands starting...')
          : (listening ? 'Stop listening' : 'Start listening')
        }
        aria-label={user?.disabilityType === 'mobility' 
          ? (listening ? 'Stop voice commands' : 'Voice commands starting')
          : (listening ? 'Stop listening' : 'Start listening')
        }
      >
        {listening ? <MicOff size={26} /> : <Mic size={26} />}
      </button>

      <div
        aria-hidden="false"
        aria-live="polite"
        ref={liveRegionRef}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      />
    </>
  );
};

export default VoiceAssistant;