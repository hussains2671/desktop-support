import api from './api';

/**
 * Remote Desktop Service
 * Handles all API calls related to remote desktop sessions
 */

/**
 * Create a new remote desktop session
 */
export const createSession = async (agentId) => {
    try {
        const response = await api.post('/remote-desktop/sessions', {
            agent_id: agentId
        });
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to create remote session' 
        };
    }
};

/**
 * Get session details
 */
export const getSession = async (sessionId) => {
    try {
        const response = await api.get(`/remote-desktop/sessions/${sessionId}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to get session' 
        };
    }
};

/**
 * Get active sessions
 */
export const getActiveSessions = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        
        if (filters.agent_id) params.append('agent_id', filters.agent_id);
        if (filters.user_id) params.append('user_id', filters.user_id);
        
        const response = await api.get(`/remote-desktop/sessions?${params.toString()}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to get active sessions' 
        };
    }
};

/**
 * End a remote session
 */
export const endSession = async (sessionId) => {
    try {
        const response = await api.post(`/remote-desktop/sessions/${sessionId}/end`);
        return { success: true, message: response.data.message, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to end session' 
        };
    }
};

/**
 * Get session history
 */
export const getSessionHistory = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        
        if (filters.agent_id) params.append('agent_id', filters.agent_id);
        if (filters.user_id) params.append('user_id', filters.user_id);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.page) params.append('page', filters.page);
        if (filters.limit) params.append('limit', filters.limit);
        
        const response = await api.get(`/remote-desktop/sessions/history?${params.toString()}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to get session history' 
        };
    }
};

/**
 * Refresh session connection
 */
export const refreshSession = async (sessionId) => {
    try {
        const response = await api.post(`/remote-desktop/sessions/${sessionId}/refresh`);
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to refresh session' 
        };
    }
};

