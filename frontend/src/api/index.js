/**
 * API Module Exports for EduLife Platform
 * 
 * This module exports all API services for easy importing.
 * Import individual services or the entire API object.
 */

// Export the central API configuration
export { apiClient, API_BASE_URL } from './apiConfig';

// Export individual API modules
export { default as authApi } from './authApi';
export { default as courseApi } from './courseApi';
export { default as quizApi } from './quizApi';
export { default as userApi } from './userApi';
export { default as adminApi } from './adminApi';
export { default as chatbotApi } from './chatbotApi';

// Export all API functions for direct import
export * from './authApi';
export * from './courseApi';
export * from './quizApi';
export * from './userApi';
export * from './adminApi';
export * from './chatbotApi';

// Default export - consolidated API object
const api = {
    auth: authApi,
    course: courseApi,
    quiz: quizApi,
    user: userApi,
    admin: adminApi,
    chatbot: chatbotApi,
};

export default api;