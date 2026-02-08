// VisualVoiceAssistant.js

import React, { useState, useRef, useEffect, useCallback, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Mic, MicOff } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";

const VisualVoiceAssistant = () => {
  const [listening, setListening] = useState(false);
  const [mode, setMode] = useState("");
  const [pendingSubject, setPendingSubject] = useState(null);
  const [askContinueLesson, setAskContinueLesson] = useState(false);

  const liveRegionRef = useRef(null);
  const pendingSubjectRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const [ignoreSpeechUntil, setIgnoreSpeechUntil] = useState(0);

  const toSafeString = (v) => (v == null ? "" : String(v));

  // --------------------------------------------------------
  // TTS
  // --------------------------------------------------------
  function speak(text, cb) {
    text = toSafeString(text);

    try {
      const synth = window.speechSynthesis;
      if (!synth) {
        cb && cb();
        return;
      }

      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1;

      u.onstart = () => {
        setIgnoreSpeechUntil(Date.now() + text.length * 40);
      };

      u.onend = () => {
        setIgnoreSpeechUntil(Date.now() + 400);
        cb && cb();
      };

      if (liveRegionRef.current) liveRegionRef.current.textContent = text;
      synth.speak(u);
    } catch (e) {
      console.error("TTS error:", e);
      cb && cb();
    }
  }

  // --------------------------------------------------------
  // Helpers
  // --------------------------------------------------------
  
  // Merge courses by subject
  const mergeCoursesBySubject = (courses) => {
    const merged = {};

    courses.forEach((c) => {
      const key = c.subject?.toLowerCase();
      if (!key) return;

      if (!merged[key]) {
        merged[key] = {
          ...c,
          lessons: [...(c.lessons || [])],
        };
      } else {
        merged[key].lessons.push(...(c.lessons || []));
      }
    });

    return Object.values(merged);
  };

  const findCourseBySubject = (subject) => {
    try {
      const courses = window.__EDULIFE_COURSES__ || [];
      const mergedCourses = mergeCoursesBySubject(courses);
      return mergedCourses.find(
        (c) => toSafeString(c.subject).toLowerCase() === toSafeString(subject).toLowerCase()
      );
    } catch {
      return null;
    }
  };

  const getLessonTitle = (subject, index) => {
    const course = findCourseBySubject(subject);
    return course?.lessons?.[index]?.title || null;
  };

  const getFormattedLessonList = (subject) => {
    const course = findCourseBySubject(subject);
    if (!course?.lessons) return [];
    return course.lessons.map((l, i) => `Lesson ${i + 1}: ${l.title || l.name || ""}`);
  };

  const extractNumber = (text) => {
    const t = toSafeString(text).toLowerCase();
    const m = t.match(/\d+/);
    if (m) return Number(m[0]);
    const map = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
    for (const k in map) if (t.includes(k)) return map[k];
    return null;
  };

  // --------------------------------------------------------
  // WAIT FOR LESSON DOM (reads all lessons for a subject)
  // --------------------------------------------------------
  const waitForLessonDOM = () => {
    let tries = 0;

    const check = () => {
      // Find lesson blocks: anchor → parent div → span title
      const lessonBlocks = Array.from(
        document.querySelectorAll("main.main-content a[href*='course']")
      )
        .map((link) => {
          const block = link.closest("div");
          if (!block) return null;

          const span = block.querySelector("span");
          if (!span) return null;

          const title = (span.textContent || "").trim();
          if (!title) return null;

          return { div: block, link, title };
        })
        .filter(Boolean);

      // Lessons found → announce and switch to lesson mode
      if (lessonBlocks.length > 0) {
        setMode("subject-lessons");

        const titles = lessonBlocks.map(
          (b, i) => `Lesson ${i + 1}: ${b.title}`
        );

        try { SpeechRecognition.stopListening(); setListening(false); } catch {}
        speak(
          `${pendingSubjectRef.current} selected. Available lessons are: ${titles.join(
            ", "
          )}. Say the lesson number or lesson name.`,
          () => {
            try {
              SpeechRecognition.startListening({ continuous: true });
              setListening(true);
            } catch {}
          }
        );

        return;
      }

      // Retry if lessons not loaded yet
      tries++;
      if (tries > 35) {
        try { SpeechRecognition.stopListening(); setListening(false); } catch {}
        speak("Lessons are not loading. Please try again.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch {}
        });
        return;
      }

      setTimeout(check, 200);
    };

    check();
  };

  // --------------------------------------------------------
  // READ QUIZ QUESTION (runs automatically on quiz page)
  // --------------------------------------------------------
  const readQuizQuestion = () => {
    if (!location.pathname.includes("/quiz/")) return;
    window.__selectedOption = null;
    window.__quizVoiceInit = false;
    let retries = 0;
    const MAX_RETRIES = 15; // ~4.5 seconds max

    const waitForQuizElements = () => {
      // Use data attributes if available
      let questionTextEl = document.querySelector("[data-testid='quiz-question-text']");
      let optionEls = Array.from(document.querySelectorAll("[data-testid^='quiz-option-']"));

      // Fallback: if data attributes not found, use DOM selectors
      if (!questionTextEl) {
        // Try common quiz question container patterns
        const mainContent = document.querySelector("main.main-content");
        if (mainContent) {
          // Look for large text blocks that might be questions
          const allElements = mainContent.querySelectorAll("h1, h2, h3, p, div[role='heading']");
          for (const el of allElements) {
            const text = el.textContent.trim();
            if (text.length > 15 && text.length < 500 && !text.includes("Option")) {
              questionTextEl = el;
              break;
            }
          }
        }
      }

      if (!optionEls.length) {
        optionEls = Array.from(document.querySelectorAll("main.main-content div"))
          .filter(div => {
            const style = window.getComputedStyle(div);
            return style.cursor === "pointer" && 
                   div.textContent.trim().length > 0 &&
                   !div.querySelector("div") && // Exclude containers with nested divs
                   div.offsetHeight > 0; // Visible element
          });
      }

      console.log('🎤 readQuizQuestion: DOM scan', { 
        questionFound: !!questionTextEl, 
        optionsFound: optionEls.length,
        questionText: questionTextEl?.textContent?.substring(0, 50),
        retries: retries
      });

      if (!questionTextEl || optionEls.length === 0) {
        retries++;
        if (retries >= MAX_RETRIES) {
          console.warn('🎤 readQuizQuestion: Max retries reached, giving up on finding question');
          // Fallback: just wait for options and announce them
          if (optionEls.length > 0) {
            const letters = ["A", "B", "C", "D"];
            const spokenOptions = optionEls.map((opt, i) => {
              const text = opt.textContent.trim();
              return `Option ${letters[i] || i + 1}: ${text}`;
            });
            const fallbackRead = `I found ${optionEls.length} options: ` + spokenOptions.join(". ") + ". Say the option letter like A, B, C or D.";
            try { SpeechRecognition.stopListening(); setListening(false); } catch (e) { }
            speak(fallbackRead, () => {
              try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) { }
            });
          } else {
            try { SpeechRecognition.stopListening(); setListening(false); } catch (e) { }
            speak("Quiz question not found. Please refresh the page.", () => { });
          }
          window.__quizVoiceInit = true;
          return;
        }
        return setTimeout(waitForQuizElements, 300);
      }

      const letters = ["A", "B", "C", "D"];
      const spokenOptions = optionEls.map((opt, i) => {
        const text = opt.textContent.trim();
        return `Option ${letters[i] || i + 1}: ${text}`;
      });

      const fullRead = `Here is your question: ${questionTextEl.textContent.trim()}. `
        + (spokenOptions.length ? spokenOptions.join(". ") + "." : "")
        + " Say the option letter like A, B, C or D.";

      console.log('🎤 readQuizQuestion: Speaking question', { fullRead: fullRead.substring(0, 80) + "..." });

      // ensure mic is off -> read -> start listening
      try { SpeechRecognition.stopListening(); setListening(false); } catch (e) { console.warn('🎤 Stop listening error:', e); }
      speak(fullRead, () => {
        console.log('🎤 readQuizQuestion: Speech complete, starting listening');
        try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) { console.warn('🎤 Start listening error:', e); }
      });

      window.__quizVoiceInit = true;
    };

    setTimeout(waitForQuizElements, 200);
  };


  // --------------------------------------------------------
  // MODE DETECTION
  // --------------------------------------------------------
  useEffect(() => {
    const p = location.pathname || "";

    if (p === "/dashboard/visual") {
      setMode("dashboard");
      stopMic();
      // Wait for screen reader to finish, then start mic
      setTimeout(() => {
        speak("Welcome to visual dashboard This dashboard is designed for visually impaired students. Use voice control to navigate. Example: say 1-Dashboard,2-Profile,3-New courses,4-Courses History,5-Quizzes History,6-Settings,7-Logout. After you say these, the assistant will navigate you", () => startMic());
      }, 1500);
    } else if (p === "/new-courses") setMode("subjects");
    else if (p === "/courses-history") {
      setMode("courses-history");
      stopMic();
      speak("Welcome to courses history.", () => startMic());
    } else if (p === "/quizzes-history") {
      setMode("quizzes-history");
      stopMic();
      speak("Welcome to quizzes history.", () => startMic());
    } else if (p.startsWith("/course")) {
      setMode("lessons");
      stopMic();
      setAskContinueLesson(true);
      setTimeout(() => {
        speak("Do you want to continue the lesson or take the quiz?", () => startMic());
      }, 700);
    } else if (p.includes("/quiz/")) {
      setMode("quiz");
      window.__quizVoiceInit = false;
      window.__selectedOption = null;
      setTimeout(() => readQuizQuestion(), 350);
    } else setMode("");
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // --------------------------------------------------------
  // MAIN HANDLER
  // --------------------------------------------------------
  const handleVoiceCommand = useCallback((raw) => {
    const cmd = toSafeString(raw).toLowerCase().trim();
    if (!cmd) return;

    // If user said quiz anywhere, block global nav from immediately doing something else.
    // We still handle 'open quiz' inside the lessons block below.
    if (cmd.includes("quiz") && mode !== "lessons" && mode !== "quiz" && mode !== "lessons") {
      // swallow to avoid accidental navigation
      console.log("Detected quiz keyword outside lessons/quiz; swallowing to avoid navigation.");
      return;
    }

    // ---------------------- QUIZ MODE (robust reader + A/B/C/D flow) ----------------------
    if (mode === "quiz") {

      // If quiz hasn't auto-read (somehow), trigger it again (safe guard)
      if (!window.__quizVoiceInit) {
        readQuizQuestion();
        return;
      }

      // ----------------- A/B/C/D DETECTION (robust normalization) -----------------
      // Normalize: remove punctuation, multiple spaces, and trim
      const clean = cmd.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

      // Debug: show what we actually received (leave this while debugging)
      console.log("🎤 [quiz] RAW:", cmd, "=> CLEAN:", clean);

      // direct single-word matches (common)
      if (
        clean === "a" ||
        clean === "hey" ||
        clean === "ay" ||
        clean === "aa" ||
        clean === "eh"
      ) {
        window.__selectedOption = 0;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 0 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option A selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }

      if (clean === "b" || clean === "bee" || clean === "be" || clean === "bi") {
        window.__selectedOption = 1;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 1 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option B selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }

      if (clean === "c" || clean === "see" || clean === "sea" || clean === "si") {
        window.__selectedOption = 2;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 2 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option C selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }

      if (clean === "d" || clean === "dee" || clean === "de" || clean === "di" || clean === "the") {
        window.__selectedOption = 3;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 3 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option D selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }

      // sentence-style or phrase matches (covers "option a", "select option b", "i choose c", "answer is d")
      if (/\b(option|select|choose|chosen|answer|i choose|i choose option|i selected)\b.*\ba\b/.test(clean) ||
          /\b(a|option a|select a|choose a|answer a|i choose a)\b/.test(clean)) {
        window.__selectedOption = 0;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 0 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option A selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }

      if (/\b(option|select|choose|chosen|answer|i choose|i choose option|i selected)\b.*\bb\b/.test(clean) ||
          /\b(b|option b|select b|choose b|answer b|i choose b)\b/.test(clean)) {
        window.__selectedOption = 1;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 1 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option B selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }

      if (/\b(option|select|choose|chosen|answer|i choose|i choose option|i selected)\b.*\bc\b/.test(clean) ||
          /\b(c|option c|select c|choose c|answer c|i choose c)\b/.test(clean)) {
        window.__selectedOption = 2;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 2 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option C selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }

      if (/\b(option|select|choose|chosen|answer|i choose|i choose option|i selected)\b.*\bd\b/.test(clean) ||
          /\b(d|option d|select d|choose d|answer d|i choose d)\b/.test(clean)) {
        window.__selectedOption = 3;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 3 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option D selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }

      // Also handle "option 1/2/3/4" to be safe
      if (/\boption\s*1\b/.test(clean) || /\b1\b/.test(clean)) {
        window.__selectedOption = 0;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 0 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option A selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }
      if (/\boption\s*2\b/.test(clean) || /\b2\b/.test(clean)) {
        window.__selectedOption = 1;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 1 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option B selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }
      if (/\boption\s*3\b/.test(clean) || /\b3\b/.test(clean)) {
        window.__selectedOption = 2;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 2 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option C selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }
      if (/\boption\s*4\b/.test(clean) || /\b4\b/.test(clean)) {
        window.__selectedOption = 3;
        window.dispatchEvent(new CustomEvent("voice-select-option", { detail: 3 }));
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Option D selected. Say yes to submit, or next for next question.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }

      // NEXT -> move to next question
      if (cmd.includes("next") || cmd.includes("continue")) {
        if (window.__selectedOption != null) {
          try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
          window.dispatchEvent(new Event("voice-next-question"));
          speak("Moving to next question.", () => {
            // Wait for next question to load, then read it
            setTimeout(() => {
              window.__quizVoiceInit = false;
              readQuizQuestion();
            }, 500);
          });
        } else {
          try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
          speak("No option selected. Say the option letter first.", () => {
            try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
          });
        }
        return;
      }

      // YES -> submit quiz
      if (cmd.includes("yes") || cmd.includes("submit")) {
        if (window.__selectedOption != null) {
          try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
          // notify quiz UI
          window.dispatchEvent(new CustomEvent("voice-select-option", { detail: window.__selectedOption }));
          window.dispatchEvent(new Event("voice-submit-quiz"));
          speak("Submitting your quiz.", () => {
            // After submit, quiz will navigate away, so don't restart mic
          });
        } else {
          try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
          speak("No option selected. Say the option letter first.", () => {
            try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
          });
        }
        return;
      }

      // NO -> cancel selection
      if (cmd.includes("no") || cmd.includes("cancel")) {
        window.__selectedOption = null;
        try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
        speak("Selection cancelled. Say the option letter again.", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
        return;
      }

      // fallback
      try { SpeechRecognition.stopListening(); setListening(false); } catch (e) {}
      speak("Say the option letter like A, B, C or D.", () => {
        try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
      });
      return;
    }

    // ------------------------------------------------------
    // OPEN QUIZ FROM LESSON PAGE ONLY
    // ------------------------------------------------------
    if (
      mode === "lessons" &&
      (cmd.includes("quiz") || cmd.includes("take quiz") || cmd.includes("take the quiz"))
    ) {
      stopMic();
      // look for <button> or <a> with exact text
      const takeQuizButton = Array.from(document.querySelectorAll("button, a")).find(el =>
        el.textContent?.trim().toLowerCase() === "take the quiz" ||
        el.textContent?.trim().toLowerCase().includes("take quiz")
      );

      if (takeQuizButton) {
        speak("Opening the quiz", () => {
          // clicking should cause navigation and the mode detector will call readQuizQuestion()
          takeQuizButton.click();
          setAskContinueLesson(false);
        });
      } else {
        speak("Quiz button not found on this page", () => {
          try { SpeechRecognition.startListening({ continuous: true }); setListening(true); } catch (e) {}
        });
      }
      return;
    }

    // ------------------------------------------------------
    // Prevent mis-detection: do not run global nav if the user said 'quiz'
    if (cmd.includes("quiz")) return;

    // GLOBAL NAVIGATION (1–8)
    const num = extractNumber(cmd);
    if (num && num >= 1 && num <= 8 && !cmd.includes("unit") && !cmd.includes("lesson")) {
      const actions = {
        1: () => navigate("/dashboard/visual"),
        2: () => navigate("/profile"),
        3: () => navigate("/new-courses"),
        4: () => navigate("/courses-history"),
        5: () => navigate("/quizzes-history"),
        6: () => navigate("/settings"),
        7: () => window.dispatchEvent(new CustomEvent("voice-logout-request")),
        8: () => speak("Help. Say a number between one and eight.")
      };
      speak(`Opening option ${num}`, actions[num]);
      return;
    }

    // SUBJECTS mode
    if (mode === "subjects") {
      const SUBJECTS = ["english", "science", "history", "geography", "mathematics"];
      const found = SUBJECTS.find(s => cmd.includes(s));

      if (found) {
        const label = found[0].toUpperCase() + found.slice(1);
        setPendingSubject(label);
        pendingSubjectRef.current = label;

        stopMic();
        
        // Dispatch subject selection event to UI
        window.dispatchEvent(new CustomEvent("voice-subject-select", { detail: label }));
        
        // Wait for lesson DOM to load and announce lessons
        speak(`${label} selected. Loading lessons...`, () => {
          waitForLessonDOM();
        });
        
        return;
      }

      return;
    }

    // SUBJECT-LESSONS mode (after subject selected and lessons loaded)
    if (mode === "subject-lessons") {
      const nm = extractNumber(cmd);
      if (nm) {
        stopMic();
        speak(`Opening lesson ${nm}`, () => {
          // Click the lesson link
          const lessonLinks = Array.from(
            document.querySelectorAll("main.main-content a[href*='course']")
          );
          const targetLink = lessonLinks[nm - 1];
          if (targetLink) {
            targetLink.click();
            setTimeout(() => startMic(), 1200);
          } else {
            speak("Lesson not found.", () => startMic());
          }
        });
        return;
      }

      // Also handle lesson name matching
      const lessonBlocks = Array.from(
        document.querySelectorAll("main.main-content a[href*='course']")
      ).map((link, idx) => {
        const block = link.closest("div");
        const span = block?.querySelector("span");
        const title = (span?.textContent || "").trim().toLowerCase();
        return { link, title, index: idx + 1 };
      });

      const matchedLesson = lessonBlocks.find(l => 
        l.title && cmd.includes(l.title)
      );

      if (matchedLesson) {
        stopMic();
        speak(`Opening ${matchedLesson.title}`, () => {
          matchedLesson.link.click();
          setTimeout(() => startMic(), 1200);
        });
        return;
      }

      return;
    }

    // ❌ Prevent “continue lesson” from running on history pages
    if (mode === "courses-history" || mode === "quizzes-history") {
      return; // do nothing
    }

    // LESSONS mode
    if (mode === "lessons") {
      if (askContinueLesson) {
        if (cmd.includes("yes") || cmd.includes("continue") || cmd.includes("play")) {
          speak("Continuing the lesson", () => {
            window.dispatchEvent(new CustomEvent("voice-continue-lesson"));
          });
          setAskContinueLesson(false);
          return;
        }

        if (cmd.includes("quiz") || cmd.includes("take quiz") || cmd.includes("take the quiz")) {
          const takeQuizButton = Array.from(document.querySelectorAll("button, a")).find(el =>
            el.textContent?.trim().toLowerCase() === "take the quiz" ||
            el.textContent?.trim().toLowerCase().includes("take quiz")
          );

          if (takeQuizButton) {
            speak("Opening the quiz", () => {
              takeQuizButton.click();
              setAskContinueLesson(false);
            });
          } else {
            speak("Quiz button not found on this page");
          }
          return;
        }

        speak("Say continue to continue the lesson, or say take quiz to start the quiz.");
        setAskContinueLesson(false);
        return;
      }

      const nm = extractNumber(cmd);
      if (nm) {
        stopMic();
        speak(`Opening lesson ${nm}`, () => {
          window.dispatchEvent(new CustomEvent("voice-start-lesson", { detail: nm - 1 }));
          setTimeout(() => startMic(), 1200);
        });
        return;
      }

      if (cmd.includes("continue")) {
        speak("Continuing", () =>
          window.dispatchEvent(new CustomEvent("voice-continue-lesson"))
        );
        return;
      }

      if (cmd.includes("pause") || cmd.includes("stop")) {
        window.dispatchEvent(new CustomEvent("voice-pause-lesson"));
        speak("Paused");
        return;
      }
    }

    if (!mode && (cmd.includes("help") || cmd.includes("what"))) {
      speak("Say three to open new courses.");
    }
  }, [mode, navigate, pendingSubject, askContinueLesson, location.pathname]); // add location to deps

  // --------------------------------------------------------
  // TRANSCRIPT HANDLER
  // --------------------------------------------------------
  const { transcript, resetTranscript } = useSpeechRecognition({
    commands: [{ command: "*", callback: () => {} }],
  });

  useEffect(() => {
    if (!transcript) return;

    // debug: show raw transcript for you to paste here if needed
    console.log("🎤 VOICE HEARD:", transcript);

    if (Date.now() < ignoreSpeechUntil) {
      resetTranscript();
      return;
    }

    handleVoiceCommand(transcript);
    resetTranscript();
  }, [transcript, handleVoiceCommand, ignoreSpeechUntil]);

  // --------------------------------------------------------
  // MIC CONTROLS
  // --------------------------------------------------------
  const startMic = () => {
    try {
      SpeechRecognition.startListening({ continuous: true });
      setListening(true);
    } catch {}
  };

  const stopMic = () => {
    try {
      SpeechRecognition.stopListening();
      setListening(false);
    } catch {}
  };

  const toggleMic = () => (listening ? stopMic() : startMic());

  // --------------------------------------------------------
  // SUBJECTS AUTO ANNOUNCE
  // --------------------------------------------------------
  useEffect(() => {
    if (mode === "subjects") {
      stopMic();
      speak(
        "New courses opened. Available subjects are: English, Science, History, Geography, Mathematics. Say the subject name.",
        () => startMic()
      );
    }
  }, [mode]);

  if (!user || user.disabilityType !== "visual") return null;

  return (
    <>
      <button
        onClick={toggleMic}
        aria-label={listening ? "Stop voice control" : "Start voice control"}
        title={listening ? "Stop voice control" : "Start voice control"}
        style={{
          position: "fixed",
          bottom: "25px",
          right: "90px",
          zIndex: 9999,
          backgroundColor: listening ? "#ef4444" : "#22c55e",
          color: "white",
          borderRadius: "50%",
          width: "55px",
          height: "55px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          cursor: "pointer",
        }}
      >
        {listening ? <MicOff size={28} /> : <Mic size={28} />}
      </button>

      <div
        ref={liveRegionRef}
        aria-live="polite"
        style={{
          width: 1,
          height: 1,
          overflow: "hidden",
          position: "absolute",
          clip: "rect(0 0 0 0)"
        }}
      />
    </>
  );
};

export default VisualVoiceAssistant;
