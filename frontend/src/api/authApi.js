/**
 * Authentication API Service for EduLife Platform
 * 
 * This module provides functions for user authentication,
 * registration, and profile management.
 */

import { apiClient } from './apiConfig';

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - Login response with token and user data
 */
export const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', {
        email,
        password
    });
    return response.data;
};

/**
 * Register new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Registration response
 */
export const register = async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
};

/**
 * Logout user
 * @returns {Promise<Object>} - Logout response
 */
export const logout = async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
};

/**
 * Get current user profile
 * @returns {Promise<Object>} - User profile data
 */
export const getProfile = async () => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
};

/**
 * Update user profile
 * @param {Object} profileData - Updated profile data
 * @returns {Promise<Object>} - Updated profile response
 */
export const updateProfile = async (profileData) => {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
};

/**
 * Change user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Password change response
 */
export const changePassword = async (currentPassword, newPassword) => {
    const response = await apiClient.put('/auth/change-password', {
        currentPassword,
        newPassword
    });
    return response.data;
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} - Password reset request response
 */
export const requestPasswordReset = async (email) => {
    const response = await apiClient.post('/auth/reset-password-request', {
        email
    });
    return response.data;
};

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Password reset response
 */
export const resetPassword = async (token, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', {
        token,
        newPassword
    });
    return response.data;
};

// Default export object
const authApi = {
    login,
    register,
    logout,
    getProfile,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
};

export default authApi;
