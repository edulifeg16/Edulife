import { useEffect, useRef, useCallback, useContext } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const VisualScreenReader = ({ enabled = true }) => {
  const liveRef = useRef(null);
  const location = useLocation();
  const { user } = useContext(AuthContext);

  // Only enable for visual users on visual-specific pages
  const isVisualUser = user && user.disabilityType === 'visual';
  const isVisualPage = location.pathname.includes("/dashboard/visual") || 
                       (location.pathname.includes("/new-courses") && isVisualUser);

  const speak = useCallback((text, interrupt = true) => {
    if (!window.speechSynthesis) return;
    const synth = window.speechSynthesis;

    if (interrupt) synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    utter.volume = 1;
    synth.speak(utter);

    if (liveRef.current) liveRef.current.textContent = text;
  }, []);

  /** Read all lessons from the page */
  const readAllLessons = useCallback(() => {
    // Check if we're on the new-courses page with lessons displayed
    if (location.pathname.includes("/new-courses")) {
      const main = document.querySelector("main");
      if (!main) return speak("No lessons found");

      // Find all lesson divs that contain lesson information
      const lessonDivs = main.querySelectorAll("div[style*='backgroundColor']");
      const lessonsText = [];

      // Extract lesson titles - look for divs with lesson content
      lessonDivs.forEach((div) => {
        const text = div.innerText?.trim();
        if (text && text.includes("Start Lesson")) {
          const lessonTitle = text.replace("Start Lesson", "").trim();
          if (lessonTitle) lessonsText.push(lessonTitle);
        }
      });

      if (lessonsText.length === 0) {
        speak("No lessons available");
      } else {
        const lessonsToRead = `Available lessons: ${lessonsText.join(", ")}`;
        speak(lessonsToRead);
      }
    } else {
      // For dashboard, read the entire content
      const main = document.querySelector("main");
      if (!main) return speak("Dashboard not found");
      const cleaned = main.innerText.replace(/\s+/g, " ").trim();
      speak(cleaned);
    }
  }, [location.pathname, speak]);

  /** Read the page content */
  const readDashboard = useCallback(() => {
    readAllLessons();
  }, [readAllLessons]);

  /** When the page loads → auto announce */
  useEffect(() => {
    if (!enabled || !isVisualUser || !isVisualPage) return;

    const title = document.querySelector("h1");
    if (title) {
      speak(`You are on: ${title.innerText}. Screen reader mode active.`);
    }

    // Also speak summary automatically after a delay
    const timer = setTimeout(() => {
      readDashboard();
    }, 1000);

    return () => clearTimeout(timer);
  }, [enabled, isVisualUser, isVisualPage, readDashboard, speak]);

  // Don't render UI if not a visual user or not on visual page
  if (!isVisualUser || !isVisualPage || !enabled) return null;

  return (
    <>
      {/* Floating Read Page Button */}
      <button
        onClick={readDashboard}
        style={{
          position: "fixed",
          bottom: "25px",
          right: "160px",
          zIndex: 9999,
          backgroundColor: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "50px",
          padding: "12px 20px",
          cursor: "pointer",
          fontSize: "14px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        }}
        aria-label="Read page content"
      >
        Read Page
      </button>

      {/* Live region for accessibility announcements */}
      <div
        ref={liveRef}
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          left: "-10000px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      />
    </>
  );
};

export default VisualScreenReader;
