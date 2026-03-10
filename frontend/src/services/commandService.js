import api from './api';

/**
 * Command Service
 * Handles all API calls related to remote command execution
 */

/**
 * Create a new command for an agent
 */
export const createCommand = async (data) => {
    try {
        const response = await api.post('/commands', data);
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to create command' 
        };
    }
};

/**
 * Get command history with filters
 */
export const getCommandHistory = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        
        if (filters.agent_id) params.append('agent_id', filters.agent_id);
        if (filters.status) params.append('status', filters.status);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.page) params.append('page', filters.page);
        if (filters.limit) params.append('limit', filters.limit);
        
        const response = await api.get(`/commands/history?${params.toString()}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to get command history' 
        };
    }
};

/**
 * Cancel a pending command
 */
export const cancelCommand = async (commandId) => {
    try {
        const response = await api.post(`/commands/${commandId}/cancel`);
        return { success: true, message: response.data.message };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to cancel command' 
        };
    }
};

/**
 * Get command details (if endpoint exists)
 */
export const getCommandDetails = async (commandId) => {
    try {
        // This would require a GET /commands/:id endpoint
        // For now, we'll get it from history
        const response = await api.get(`/commands/history?limit=1`);
        const command = response.data.data.commands.find(c => c.id === parseInt(commandId));
        if (command) {
            return { success: true, data: command };
        }
        return { success: false, message: 'Command not found' };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to get command details' 
        };
    }
};

