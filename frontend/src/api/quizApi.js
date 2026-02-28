/**
 * Quiz API Service for EduLife Platform
 * 
 * This module provides functions for quiz operations,
 * including taking quizzes, submitting answers, and viewing results.
 */

import { apiClient } from './apiConfig';

/**
 * Get all available quizzes
 * @param {Object} params - Query parameters for filtering
 * @returns {Promise<Array>} - List of quizzes
 */
export const getAllQuizzes = async (params = {}) => {
    const response = await apiClient.get('/quizzes', { params });
    return response.data;
};

/**
 * Get quiz by ID
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Object>} - Quiz data with questions
 */
export const getQuizById = async (quizId) => {
    const response = await apiClient.get(`/quizzes/${quizId}`);
    return response.data;
};

/**
 * Submit quiz answers
 * @param {string} quizId - Quiz ID
 * @param {Array} answers - Array of user answers
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Quiz submission result
 */
export const submitQuiz = async (quizId, answers, userId) => {
    const response = await apiClient.post('/quizzes/submit', {
        quizId,
        answers,
        userId
    });
    return response.data;
};

/**
 * Get user quiz history
 * @param {string} userId - User ID
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} - User's quiz history
 */
export const getUserQuizHistory = async (userId, params = {}) => {
    const response = await apiClient.get(`/users/${userId}/quiz-history`, { params });
    return response.data;
};

/**
 * Get quiz results by submission ID
 * @param {string} submissionId - Quiz submission ID
 * @returns {Promise<Object>} - Detailed quiz results
 */
export const getQuizResults = async (submissionId) => {
    const response = await apiClient.get(`/quizzes/results/${submissionId}`);
    return response.data;
};

/**
 * Create new quiz (admin/teacher)
 * @param {Object} quizData - Quiz data including questions
 * @returns {Promise<Object>} - Created quiz response
 */
export const createQuiz = async (quizData) => {
    const response = await apiClient.post('/quizzes', quizData);
    return response.data;
};

/**
 * Update quiz (admin/teacher)
 * @param {string} quizId - Quiz ID
 * @param {Object} quizData - Updated quiz data
 * @returns {Promise<Object>} - Updated quiz response
 */
export const updateQuiz = async (quizId, quizData) => {
    const response = await apiClient.put(`/quizzes/${quizId}`, quizData);
    return response.data;
};

/**
 * Delete quiz (admin/teacher)
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Object>} - Deletion confirmation
 */
export const deleteQuiz = async (quizId) => {
    const response = await apiClient.delete(`/quizzes/${quizId}`);
    return response.data;
};

/**
 * Get quiz statistics
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Object>} - Quiz statistics
 */
export const getQuizStats = async (quizId) => {
    const response = await apiClient.get(`/quizzes/${quizId}/stats`);
    return response.data;
};

/**
 * Get quizzes by course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} - Course quizzes
 */
export const getQuizzesByCourse = async (courseId) => {
    const response = await apiClient.get(`/courses/${courseId}/quizzes`);
    return response.data;
};

// Default export object
const quizApi = {
    getAllQuizzes,
    getQuizById,
    submitQuiz,
    getUserQuizHistory,
    getQuizResults,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    getQuizStats,
    getQuizzesByCourse,
};

export default quizApi;