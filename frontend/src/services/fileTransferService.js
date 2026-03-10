import api from './api';

/**
 * File Transfer Service
 * Handles all API calls related to file transfers
 */

/**
 * Initiate file upload
 */
export const initiateUpload = async (data) => {
    try {
        const response = await api.post('/file-transfer/upload/initiate', data);
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to initiate upload' 
        };
    }
};

/**
 * Upload file (using FormData)
 */
export const uploadFile = async (uploadUrl, file, onProgress) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await api.post(uploadUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    onProgress(percentCompleted);
                }
            }
        });
        
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to upload file' 
        };
    }
};

/**
 * Initiate file download
 */
export const initiateDownload = async (agentId, filePath) => {
    try {
        const response = await api.post('/file-transfer/download/initiate', {
            agent_id: agentId,
            file_path: filePath
        });
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to initiate download' 
        };
    }
};

/**
 * Download file
 */
export const downloadFile = async (downloadUrl, fileName) => {
    try {
        const response = await api.get(downloadUrl, {
            responseType: 'blob'
        });
        
        // Create blob and download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        return { success: true };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to download file' 
        };
    }
};

/**
 * Get file list on agent
 */
export const getFileList = async (agentId, path = null) => {
    try {
        const params = new URLSearchParams();
        if (path) params.append('path', path);
        
        const response = await api.get(`/file-transfer/list/${agentId}?${params.toString()}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to get file list' 
        };
    }
};

/**
 * Get transfer status
 */
export const getTransferStatus = async (transferId) => {
    try {
        const response = await api.get(`/file-transfer/status/${transferId}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to get transfer status' 
        };
    }
};

/**
 * Cancel transfer
 */
export const cancelTransfer = async (transferId) => {
    try {
        const response = await api.post(`/file-transfer/${transferId}/cancel`);
        return { success: true, message: response.data.message };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to cancel transfer' 
        };
    }
};

/**
 * Get transfer history
 */
export const getTransferHistory = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        
        if (filters.agent_id) params.append('agent_id', filters.agent_id);
        if (filters.direction) params.append('direction', filters.direction);
        if (filters.status) params.append('status', filters.status);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.page) params.append('page', filters.page);
        if (filters.limit) params.append('limit', filters.limit);
        
        const response = await api.get(`/file-transfer/history?${params.toString()}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to get transfer history' 
        };
    }
};

