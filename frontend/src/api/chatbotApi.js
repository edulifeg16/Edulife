/**
 * Chatbot API Service for EduLife Platform
 * 
 * This module provides functions for chatbot interactions,
 * including sending messages and managing chat sessions.
 */

import { apiClient } from './apiConfig';

/**
 * Send message to chatbot
 * @param {string} message - User message
 * @param {string} [sessionId] - Chat session ID
 * @param {Object} [context] - Additional context for the chatbot
 * @returns {Promise<Object>} - Chatbot response
 */
export const sendMessage = async (message, sessionId = null, context = {}) => {
    const response = await apiClient.post('/chatbot/message', {
        message,
        sessionId,
        context
    });
    return response.data;
};

/**
 * Start a new chat session
 * @param {Object} [initialContext] - Initial context for the session
 * @returns {Promise<Object>} - New session data
 */
export const startSession = async (initialContext = {}) => {
    const response = await apiClient.post('/chatbot/session/start', {
        context: initialContext
    });
    return response.data;
};

/**
 * End a chat session
 * @param {string} sessionId - Session ID to end
 * @returns {Promise<Object>} - Session end confirmation
 */
export const endSession = async (sessionId) => {
    const response = await apiClient.post(`/chatbot/session/${sessionId}/end`);
    return response.data;
};

/**
 * Get chat history for a session
 * @param {string} sessionId - Session ID
 * @param {number} [limit] - Number of messages to retrieve
 * @returns {Promise<Object>} - Chat history
 */
export const getChatHistory = async (sessionId, limit = 50) => {
    const response = await apiClient.get(`/chatbot/session/${sessionId}/history`, {
        params: { limit }
    });
    return response.data;
};

/**
 * Get user's chat sessions
 * @param {number} [limit] - Number of sessions to retrieve
 * @returns {Promise<Array>} - List of user's chat sessions
 */
export const getUserSessions = async (limit = 20) => {
    const response = await apiClient.get('/chatbot/sessions', {
        params: { limit }
    });
    return response.data;
};

/**
 * Delete a chat session
 * @param {string} sessionId - Session ID to delete
 * @returns {Promise<Object>} - Deletion confirmation
 */
export const deleteSession = async (sessionId) => {
    const response = await apiClient.delete(`/chatbot/session/${sessionId}`);
    return response.data;
};

/**
 * Get chatbot configuration/settings
 * @returns {Promise<Object>} - Chatbot configuration
 */
export const getChatbotConfig = async () => {
    const response = await apiClient.get('/chatbot/config');
    return response.data;
};

/**
 * Rate a chatbot response
 * @param {string} messageId - Message ID to rate
 * @param {number} rating - Rating (1-5)
 * @param {string} [feedback] - Optional feedback text
 * @returns {Promise<Object>} - Rating confirmation
 */
export const rateResponse = async (messageId, rating, feedback = null) => {
    const response = await apiClient.post('/chatbot/rate', {
        messageId,
        rating,
        feedback
    });
    return response.data;
};

/**
 * Get suggested questions/prompts
 * @param {Object} [context] - Context for generating suggestions
 * @returns {Promise<Array>} - List of suggested questions
 */
export const getSuggestions = async (context = {}) => {
    const response = await apiClient.get('/chatbot/suggestions', {
        params: context
    });
    return response.data;
};

// Default export object
const chatbotApi = {
    sendMessage,
    startSession,
    endSession,
    getChatHistory,
    getUserSessions,
    deleteSession,
    getChatbotConfig,
    rateResponse,
    getSuggestions,
};

export default chatbotApi;
