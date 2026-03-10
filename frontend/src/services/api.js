import axios from 'axios';
import toast from 'react-hot-toast';

// Get API URL dynamically based on current host and protocol
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol; // 'https:' or 'http:'
    const isHttps = protocol === 'https:';
    
    // When using HTTPS with reverse proxy, API is on same host/port
    // When using HTTP, API might be on different port
    const apiProtocol = isHttps ? 'https' : 'http';
    const apiPort = isHttps ? '' : ':3000'; // No port for HTTPS (uses 443), port 3000 for HTTP
    
    // Check environment variable first (highest priority)
    if (import.meta.env.VITE_API_BASE_URL) {
        const envUrl = import.meta.env.VITE_API_BASE_URL;
        // If accessing via HTTPS but env URL is HTTP, use HTTPS version
        if (isHttps && envUrl.startsWith('http://')) {
            console.warn('Page is HTTPS but VITE_API_BASE_URL is HTTP. Using HTTPS version.');
            return envUrl.replace('http://', 'https://').replace(':3000', '');
        }
        return envUrl;
    }
    
    // Map hostnames to backend URLs (case-insensitive matching)
    // Updated to use protocol from current page
    const hostMap = {
        'localhost': `${apiProtocol}://localhost${apiPort}/api`,
        '127.0.0.1': `${apiProtocol}://127.0.0.1${apiPort}/api`,
        'ufomum-abdula.ufomoviez.com': `${apiProtocol}://ufomum-abdula.ufomoviez.com${apiPort}/api`,
        '10.73.77.58': `${apiProtocol}://10.73.77.58${apiPort}/api`,
        '192.168.86.22': `${apiProtocol}://192.168.86.22${apiPort}/api`,
        '192.168.86.152': `${apiProtocol}://192.168.86.152${apiPort}/api`
    };
    
    // Check hostname map first (case-insensitive)
    const lowerHostname = hostname.toLowerCase();
    if (hostMap[lowerHostname]) {
        return hostMap[lowerHostname];
    }
    
    // For HTTPS with reverse proxy, API is on same host (no port)
    // For HTTP, API is on port 3000
    const apiUrl = isHttps 
        ? `${apiProtocol}://${hostname}/api`  // HTTPS: same host, /api path
        : `${apiProtocol}://${hostname}${apiPort}/api`;  // HTTP: same host, port 3000
    
    return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Log API URL for debugging (only in development)
if (import.meta.env.DEV) {
    console.log('🌐 API Base URL:', API_BASE_URL);
    console.log('📍 Current Hostname:', window.location.hostname);
    console.log('🔗 Full URL:', window.location.href);
}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - Add auth token
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

// Response interceptor - Handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            toast.error('Session expired. Please login again.');
        } else if (error.response?.status === 403) {
            toast.error(error.response.data.message || 'Access denied');
        } else if (error.response?.data?.message) {
            toast.error(error.response.data.message);
        } else {
            toast.error('An error occurred');
        }
        return Promise.reject(error);
    }
);

export default api;

