/**
 * User API Service for EduLife Platform
 * 
 * This module provides functions for user-related operations,
 * including profile management and user data.
 */

import { apiClient } from './apiConfig';

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User data
 */
export const getUserById = async (userId) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} - Updated user response
 */
export const updateUser = async (userId, userData) => {
    const response = await apiClient.put(`/users/${userId}`, userData);
    return response.data;
};

/**
 * Get user's enrolled courses
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of enrolled courses
 */
export const getUserCourses = async (userId) => {
    const response = await apiClient.get(`/users/${userId}/courses`);
    return response.data;
};

/**
 * Enroll user in a course
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} - Enrollment confirmation
 */
export const enrollInCourse = async (userId, courseId) => {
    const response = await apiClient.post(`/users/${userId}/courses/${courseId}/enroll`);
    return response.data;
};

/**
 * Unenroll user from a course
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} - Unenrollment confirmation
 */
export const unenrollFromCourse = async (userId, courseId) => {
    const response = await apiClient.delete(`/users/${userId}/courses/${courseId}/enroll`);
    return response.data;
};

/**
 * Get user's learning progress
 * @param {string} userId - User ID
 * @param {string} [courseId] - Optional course ID to filter progress
 * @returns {Promise<Object>} - Learning progress data
 */
export const getUserProgress = async (userId, courseId = null) => {
    const params = courseId ? { courseId } : {};
    const response = await apiClient.get(`/users/${userId}/progress`, { params });
    return response.data;
};

/**
 * Update user's lesson progress
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @param {number} lessonId - Lesson ID
 * @param {Object} progressData - Progress data (completed, timeSpent, etc.)
 * @returns {Promise<Object>} - Progress update confirmation
 */
export const updateLessonProgress = async (userId, courseId, lessonId, progressData) => {
    const response = await apiClient.put(
        `/users/${userId}/courses/${courseId}/lessons/${lessonId}/progress`,
        progressData
    );
    return response.data;
};

/**
 * Get user's quiz history
 * @param {string} userId - User ID
 * @param {Object} params - Query parameters for filtering/pagination
 * @returns {Promise<Object>} - Quiz history with pagination
 */
export const getUserQuizHistory = async (userId, params = {}) => {
    const response = await apiClient.get(`/users/${userId}/quiz-history`, { params });
    return response.data;
};

/**
 * Get user's achievements/badges
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of user achievements
 */
export const getUserAchievements = async (userId) => {
    const response = await apiClient.get(`/users/${userId}/achievements`);
    return response.data;
};

/**
 * Update user preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - User preferences object
 * @returns {Promise<Object>} - Updated preferences response
 */
export const updateUserPreferences = async (userId, preferences) => {
    const response = await apiClient.put(`/users/${userId}/preferences`, preferences);
    return response.data;
};

/**
 * Get user's notification settings
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Notification settings
 */
export const getNotificationSettings = async (userId) => {
    const response = await apiClient.get(`/users/${userId}/notifications/settings`);
    return response.data;
};

/**
 * Update user's notification settings
 * @param {string} userId - User ID
 * @param {Object} settings - Notification settings
 * @returns {Promise<Object>} - Updated settings response
 */
export const updateNotificationSettings = async (userId, settings) => {
    const response = await apiClient.put(`/users/${userId}/notifications/settings`, settings);
    return response.data;
};

// Default export object
const userApi = {
    getUserById,
    updateUser,
    getUserCourses,
    enrollInCourse,
    unenrollFromCourse,
    getUserProgress,
    updateLessonProgress,
    getUserQuizHistory,
    getUserAchievements,
    updateUserPreferences,
    getNotificationSettings,
    updateNotificationSettings,
};

export default userApi;