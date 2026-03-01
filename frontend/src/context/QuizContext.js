import { createContext, useEffect, useState } from "react";
import api from "../api/apiConfig";

export const QuizContext = createContext();

export const QuizProvider = ({ children }) => {
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const res = await api.get("/quizzes");
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
