/**
 * Central API Configuration for EduLife Platform
 * 
 * This module provides the base configuration for all API calls,
 * including the base URL and pre-configured axios instance.
 */

import axios from 'axios';

// Base URL for the backend server (without /api)
const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Base API URL - for API endpoints
export const API_BASE_URL = `${BASE_URL}/api`;

// Server base URL - for static files, uploads, etc.
export const SERVER_BASE_URL = BASE_URL;

// Create a pre-configured axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token dynamically
api.interceptors.request.use(
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
api.interceptors.response.use(
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

// Keep apiClient as alias for backward compatibility
export const apiClient = api;

export default api;