/**
 * Admin API Service for EduLife Platform
 * 
 * This module provides functions for admin operations,
 * including user management and system administration.
 */

import { apiClient } from './apiConfig';

/**
 * Get all users (admin only)
 * @param {Object} params - Query parameters for filtering/pagination
 * @returns {Promise<Object>} - Users list with pagination info
 */
export const getAllUsers = async (params = {}) => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
};

/**
 * Get user by ID (admin only)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User data
 */
export const getUserById = async (userId) => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
};

/**
 * Update user (admin only)
 * @param {string} userId - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} - Updated user response
 */
export const updateUser = async (userId, userData) => {
    const response = await apiClient.put(`/admin/users/${userId}`, userData);
    return response.data;
};

/**
 * Delete user (admin only)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Deletion confirmation
 */
export const deleteUser = async (userId) => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
};

/**
 * Get system statistics (admin only)
 * @returns {Promise<Object>} - System stats
 */
export const getSystemStats = async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
};

/**
 * Get all courses with admin details
 * @returns {Promise<Array>} - All courses with admin metadata
 */
export const getAllCoursesAdmin = async () => {
    const response = await apiClient.get('/admin/courses');
    return response.data;
};

/**
 * Update course status (admin only)
 * @param {string} courseId - Course ID
 * @param {string} status - New status
 * @returns {Promise<Object>} - Updated course response
 */
export const updateCourseStatus = async (courseId, status) => {
    const response = await apiClient.put(`/admin/courses/${courseId}/status`, {
        status
    });
    return response.data;
};

/**
 * Get all quiz submissions (admin only)
 * @param {Object} params - Query parameters for filtering
 * @returns {Promise<Object>} - Quiz submissions with pagination
 */
export const getQuizSubmissions = async (params = {}) => {
    const response = await apiClient.get('/admin/quiz-submissions', { params });
    return response.data;
};

/**
 * Export user data (admin only)
 * @param {Object} filters - Export filters
 * @returns {Promise<Blob>} - Export file blob
 */
export const exportUserData = async (filters = {}) => {
    const response = await apiClient.get('/admin/export/users', {
        params: filters,
        responseType: 'blob'
    });
    return response.data;
};

/**
 * Get system logs (admin only)
 * @param {Object} params - Log query parameters
 * @returns {Promise<Object>} - System logs
 */
export const getSystemLogs = async (params = {}) => {
    const response = await apiClient.get('/admin/logs', { params });
    return response.data;
};

// Default export object
const adminApi = {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getSystemStats,
    getAllCoursesAdmin,
    updateCourseStatus,
    getQuizSubmissions,
    exportUserData,
    getSystemLogs,
};

export default adminApi;
