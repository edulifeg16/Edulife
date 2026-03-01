import { createContext, useState, useEffect } from "react";
import api from "../api/apiConfig";

export const CourseContext = createContext();

export const CourseProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const res = await api.get("/courses");
        setCourses(res.data);

        // Make a safe global for old voice assistant code
        window.__EDULIFE_COURSES__ = res.data;
      } catch (err) {
        console.error("❌ Failed to load courses", err);
      }
    };

    loadCourses();
  }, []);

  return (
    <CourseContext.Provider value={{ courses }}>
      {children}
    </CourseContext.Provider>
  );
};
