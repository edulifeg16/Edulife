/**
 * Course API Service for EduLife Platform
 * 
 * This module provides functions to interact with the course API,
 * including support for S3 signed URLs.
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Get a course by ID with signed URLs for video playback
 * @param {string} courseId - The course ID
 * @param {string} [disabilityType] - User's disability type for content adaptation
 * @returns {Promise<Object>} - Course data with signed URLs
 */
export const getCourseWithSignedUrls = async (courseId, disabilityType = null) => {
    try {
        const params = disabilityType ? { disabilityType } : {};
        const response = await axios.get(`${API_BASE_URL}/courses/${courseId}/signed`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching course with signed URLs:', error);
        // Fall back to regular endpoint
        const fallbackResponse = await axios.get(`${API_BASE_URL}/courses/${courseId}`);
        return fallbackResponse.data;
    }
};

/**
 * Get a course by ID (standard endpoint, for backward compatibility)
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - Course data
 */
export const getCourse = async (courseId) => {
    const response = await axios.get(`${API_BASE_URL}/courses/${courseId}`);
    return response.data;
};

/**
 * Get signed URLs for a specific lesson
 * @param {string} courseId - The course ID
 * @param {number} lessonIndex - The lesson index
 * @param {string} [mode='normal'] - 'normal' or 'cognitive'
 * @returns {Promise<Object>} - Object with videoUrl and captionUrl
 */
export const getLessonSignedUrls = async (courseId, lessonIndex, mode = 'normal') => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/courses/${courseId}/lessons/${lessonIndex}/signed-urls`,
            { params: { mode } }
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching lesson signed URLs:', error);
        throw error;
    }
};

/**
 * Get all courses for a student based on their profile
 * @param {string} disabilityType - Student's disability type
 * @param {number} standard - Student's class/standard
 * @returns {Promise<Array>} - Array of courses
 */
export const getStudentCourses = async (disabilityType, standard) => {
    const response = await axios.get(`${API_BASE_URL}/courses/student/${disabilityType}/${standard}`);
    return response.data;
};

/**
 * Get all courses (admin)
 * @returns {Promise<Array>} - Array of all courses
 */
export const getAllCourses = async () => {
    const response = await axios.get(`${API_BASE_URL}/courses`);
    return response.data;
};

/**
 * Create a new course with video upload
 * @param {FormData} formData - Form data containing course info and videos
 * @param {Function} [onProgress] - Progress callback
 * @returns {Promise<Object>} - Created course data
 */
export const createCourse = async (formData, onProgress = null) => {
    const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
    };
    
    if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
        };
    }
    
    const response = await axios.post(`${API_BASE_URL}/courses`, formData, config);
    return response.data;
};

/**
 * Delete a course
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - Deletion confirmation
 */
export const deleteCourse = async (courseId) => {
    const response = await axios.delete(`${API_BASE_URL}/courses/${courseId}`);
    return response.data;
};

/**
 * Generate subtitles for a lesson
 * @param {string} courseId - The course ID
 * @param {string} lessonId - The lesson ID
 * @param {string} [language] - Language code (e.g., 'en', 'mr')
 * @returns {Promise<Object>} - Caption generation result
 */
export const generateSubtitles = async (courseId, lessonId, language = null) => {
    const payload = language ? { language } : {};
    const response = await axios.post(
        `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/generate-subtitles`,
        payload
    );
    return response.data;
};

/**
 * Search for a course/lesson by name
 * @param {string} searchTerm - Search term
 * @returns {Promise<Object>} - Search result with course and lesson info
 */
export const searchCourseByLesson = async (searchTerm) => {
    const response = await axios.get(`${API_BASE_URL}/courses/search/lesson/${encodeURIComponent(searchTerm)}`);
    return response.data;
};

// Default export object
const courseApi = {
    getCourseWithSignedUrls,
    getCourse,
    getLessonSignedUrls,
    getStudentCourses,
    getAllCourses,
    createCourse,
    deleteCourse,
    generateSubtitles,
    searchCourseByLesson,
};

export default courseApi;
