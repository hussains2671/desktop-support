const { body, query, param } = require('express-validator');
const path = require('path');
const logger = require('../utils/logger');

// Maximum file size: 100MB (in bytes)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Validate file path to prevent directory traversal
 */
function sanitizeFilePath(filePath) {
    if (!filePath) return null;
    
    // Normalize path separators
    let normalized = filePath.replace(/\\/g, '/');
    
    // Remove any path traversal attempts
    normalized = normalized.replace(/\.\./g, '');
    
    // Remove leading/trailing slashes
    normalized = normalized.replace(/^\/+|\/+$/g, '');
    
    // Only allow certain safe directories (adjust as needed)
    // For now, allow any path but sanitized
    return normalized;
}

/**
 * Validate initiate upload request
 */
exports.validateInitiateUpload = [
    body('agent_id')
        .isInt({ min: 1 })
        .withMessage('agent_id must be a positive integer'),
    body('file_name')
        .trim()
        .notEmpty()
        .withMessage('file_name is required')
        .isLength({ max: 500 })
        .withMessage('file_name must be less than 500 characters')
        .matches(/^[^<>:"|?*\x00-\x1f]+$/)
        .withMessage('file_name contains invalid characters'),
    body('file_size')
        .isInt({ min: 1, max: MAX_FILE_SIZE })
        .withMessage(`file_size must be between 1 and ${MAX_FILE_SIZE} bytes`),
    body('destination_path')
        .optional()
        .trim()
        .custom((value) => {
            const sanitized = sanitizeFilePath(value);
            if (sanitized && sanitized.length === 0) {
                throw new Error('Invalid destination_path');
            }
            return true;
        })
];

/**
 * Validate initiate download request
 */
exports.validateInitiateDownload = [
    body('agent_id')
        .isInt({ min: 1 })
        .withMessage('agent_id must be a positive integer'),
    body('file_path')
        .trim()
        .notEmpty()
        .withMessage('file_path is required')
        .custom((value) => {
            const sanitized = sanitizeFilePath(value);
            if (!sanitized || sanitized.length === 0) {
                throw new Error('Invalid file_path');
            }
            return true;
        })
];

/**
 * Validate file list request
 */
exports.validateFileList = [
    param('agent_id')
        .isInt({ min: 1 })
        .withMessage('agent_id must be a positive integer'),
    query('path')
        .optional()
        .trim()
        .custom((value) => {
            if (value) {
                const sanitized = sanitizeFilePath(value);
                if (!sanitized || sanitized.length === 0) {
                    throw new Error('Invalid path');
                }
            }
            return true;
        })
];

/**
 * Validate transfer status request
 */
exports.validateTransferStatus = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Transfer ID must be a positive integer')
];

/**
 * Validate cancel transfer request
 */
exports.validateCancelTransfer = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Transfer ID must be a positive integer')
];

/**
 * Sanitize file path helper
 */
exports.sanitizeFilePath = sanitizeFilePath;

/**
 * Validate file size
 */
exports.validateFileSize = (size) => {
    if (size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
    }
    return true;
};

