/**
 * Central API Configuration for EduLife Platform
 * 
 * This module provides the base configuration for all API calls,
 * including the base URL and pre-configured axios instance.
 */

import axios from 'axios';

// Base API URL - can be overridden with environment variable
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create a pre-configured axios instance
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token if available
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized access
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Optionally redirect to login page
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;