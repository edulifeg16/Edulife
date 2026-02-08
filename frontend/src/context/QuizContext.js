import { createContext, useEffect, useState } from "react";
import axios from "axios";

export const QuizContext = createContext();

export const QuizProvider = ({ children }) => {
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/quizzes");
        setQuizzes(res.data);
        window.__EDULIFE_QUIZZES__ = res.data;
      } catch (err) {
        console.error("❌ Failed to load quizzes:", err);
      }
    };

    loadQuizzes();
  }, []);

  return (
    <QuizContext.Provider value={{ quizzes }}>
      {children}
    </QuizContext.Provider>
  );
};
