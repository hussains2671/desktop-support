const { FileTransfer, Agent, AgentCommand, User } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { logAction } = require('../utils/auditLogger');
const config = require('../config/config');
const { sanitizeFilePath, validateFileSize } = require('../middleware/fileTransferValidation');

/**
 * Generate upload/download token
 */
function generateTransferToken(transferId, agentId) {
    const secret = config.jwtSecret;
    const data = `${transferId}:${agentId}:${Date.now()}`;
    return crypto.createHash('sha256').update(data + secret).digest('hex').substring(0, 32);
}

/**
 * Initiate file upload
 * POST /api/file-transfer/upload/initiate
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.initiateUpload = async (req, res) => {
    try {
        const { agent_id, file_name, file_size, destination_path } = req.body;
        const companyId = req.companyId;
        const userId = req.user.id;

        // Validate file size
        validateFileSize(file_size);

        // Verify agent exists and belongs to company
        const agent = await Agent.findOne({
            where: {
                id: agent_id,
                company_id: companyId
            }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found or does not belong to your company'
            });
        }

        // Sanitize file path
        const sanitizedPath = destination_path 
            ? sanitizeFilePath(destination_path) 
            : 'C:\\Users\\Public\\Documents';

        const fullPath = `${sanitizedPath}\\${file_name}`;

        // Create file transfer record
        const transfer = await FileTransfer.create({
            agent_id: agent_id,
            company_id: companyId,
            user_id: userId,
            direction: 'upload',
            file_name: file_name,
            file_path: fullPath,
            file_size: file_size,
            status: 'pending',
            started_at: new Date()
        });

        // Generate upload token
        const token = generateTransferToken(transfer.id, agent_id);

        // Store token in metadata
        await transfer.update({
            metadata: {
                upload_token: token,
                expires_at: new Date(Date.now() + 3600000) // 1 hour expiry
            }
        });

        // Send command to agent to prepare for file upload
        try {
            await AgentCommand.create({
                agent_id: agent_id,
                company_id: companyId,
                command_type: 'custom',
                command_text: 'file_upload',
                parameters: {
                    transfer_id: transfer.id,
                    file_name: file_name,
                    file_path: fullPath,
                    file_size: file_size,
                    token: token
                },
                status: 'pending',
                priority: 7,
                created_by: userId
            });
        } catch (cmdError) {
            logger.error('Failed to create file upload command:', cmdError);
        }

        // Audit log
        await logAction({
            companyId,
            userId,
            action: 'file_transfer.upload.initiate',
            entityType: 'file_transfer',
            entityId: transfer.id,
            newValues: {
                agent_id: agent_id,
                file_name: file_name,
                file_size: file_size
            },
            req
        });

        logger.info(`File upload initiated: ${transfer.id} for agent ${agent_id} by user ${userId}`);

        res.status(201).json({
            success: true,
            message: 'File upload initiated successfully',
            data: {
                transfer_id: transfer.id,
                upload_url: `/api/file-transfer/upload?token=${token}&transfer_id=${transfer.id}`,
                expires_at: transfer.metadata.expires_at
            }
        });
    } catch (error) {
        logger.error('Initiate upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Upload file (Agent endpoint)
 * POST /api/file-transfer/upload
 * Requires: Agent authentication
 */
exports.uploadFile = async (req, res) => {
    try {
        const { token, transfer_id } = req.query;
        const agentId = req.agentId;

        if (!token || !transfer_id) {
            return res.status(400).json({
                success: false,
                message: 'Token and transfer_id are required'
            });
        }

        // Find transfer
        const transfer = await FileTransfer.findOne({
            where: {
                id: parseInt(transfer_id),
                agent_id: agentId,
                direction: 'upload',
                status: 'pending'
            }
        });

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: 'Transfer not found or invalid'
            });
        }

        // Verify token
        if (transfer.metadata.upload_token !== token) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // Check expiry
        if (new Date(transfer.metadata.expires_at) < new Date()) {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        // Update transfer status
        await transfer.update({
            status: 'in_progress',
            progress: 0
        });

        // Note: Actual file handling would be done here
        // For now, we'll assume the agent handles the file upload
        // In a real implementation, you might stream the file here

        res.json({
            success: true,
            message: 'File upload accepted',
            data: {
                transfer_id: transfer.id
            }
        });
    } catch (error) {
        logger.error('Upload file error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Initiate file download
 * POST /api/file-transfer/download/initiate
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.initiateDownload = async (req, res) => {
    try {
        const { agent_id, file_path } = req.body;
        const companyId = req.companyId;
        const userId = req.user.id;

        // Verify agent exists and belongs to company
        const agent = await Agent.findOne({
            where: {
                id: agent_id,
                company_id: companyId
            }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found or does not belong to your company'
            });
        }

        // Sanitize file path
        const sanitizedPath = sanitizeFilePath(file_path);
        if (!sanitizedPath) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file path'
            });
        }

        // Extract file name from path
        const fileName = sanitizedPath.split(/[\\/]/).pop();

        // Create file transfer record
        const transfer = await FileTransfer.create({
            agent_id: agent_id,
            company_id: companyId,
            user_id: userId,
            direction: 'download',
            file_name: fileName,
            file_path: sanitizedPath,
            file_size: 0, // Will be updated when file is retrieved
            status: 'pending',
            started_at: new Date()
        });

        // Generate download token
        const token = generateTransferToken(transfer.id, agent_id);

        // Store token in metadata
        await transfer.update({
            metadata: {
                download_token: token,
                expires_at: new Date(Date.now() + 3600000) // 1 hour expiry
            }
        });

        // Send command to agent to prepare file for download
        try {
            await AgentCommand.create({
                agent_id: agent_id,
                company_id: companyId,
                command_type: 'custom',
                command_text: 'file_download',
                parameters: {
                    transfer_id: transfer.id,
                    file_path: sanitizedPath,
                    token: token
                },
                status: 'pending',
                priority: 7,
                created_by: userId
            });
        } catch (cmdError) {
            logger.error('Failed to create file download command:', cmdError);
        }

        // Audit log
        await logAction({
            companyId,
            userId,
            action: 'file_transfer.download.initiate',
            entityType: 'file_transfer',
            entityId: transfer.id,
            newValues: {
                agent_id: agent_id,
                file_path: sanitizedPath
            },
            req
        });

        logger.info(`File download initiated: ${transfer.id} for agent ${agent_id} by user ${userId}`);

        res.status(201).json({
            success: true,
            message: 'File download initiated successfully',
            data: {
                transfer_id: transfer.id,
                download_url: `/api/file-transfer/download/${transfer.id}?token=${token}`,
                file_name: fileName,
                expires_at: transfer.metadata.expires_at
            }
        });
    } catch (error) {
        logger.error('Initiate download error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Download file
 * GET /api/file-transfer/download/:id
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { token } = req.query;
        const companyId = req.companyId;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        // Find transfer
        const transfer = await FileTransfer.findOne({
            where: {
                id: parseInt(id),
                company_id: companyId,
                direction: 'download',
                status: 'completed'
            }
        });

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: 'Transfer not found or file not ready'
            });
        }

        // Verify token
        if (transfer.metadata.download_token !== token) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // Note: In a real implementation, you would stream the file here
        // For now, we'll return a placeholder response
        // The actual file would be retrieved from the agent and streamed

        res.json({
            success: true,
            message: 'File download ready',
            data: {
                transfer_id: transfer.id,
                file_name: transfer.file_name,
                file_size: transfer.file_size
                // In real implementation, file would be streamed here
            }
        });
    } catch (error) {
        logger.error('Download file error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get file list on agent
 * GET /api/file-transfer/list/:agent_id
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.getFileList = async (req, res) => {
    try {
        const { agent_id } = req.params;
        const { path: directoryPath } = req.query;
        const companyId = req.companyId;

        // Verify agent exists and belongs to company
        const agent = await Agent.findOne({
            where: {
                id: parseInt(agent_id),
                company_id: companyId
            }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found or does not belong to your company'
            });
        }

        // Sanitize path
        const sanitizedPath = directoryPath ? sanitizeFilePath(directoryPath) : 'C:\\Users\\Public\\Documents';

        // Send command to agent to list files
        // Note: In a real implementation, this would be handled via command system
        // For now, return a placeholder response

        res.json({
            success: true,
            message: 'File list request sent to agent',
            data: {
                agent_id: agent_id,
                path: sanitizedPath
                // Files would be returned after agent processes the command
            }
        });
    } catch (error) {
        logger.error('Get file list error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get transfer status
 * GET /api/file-transfer/status/:id
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.getTransferStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId;

        const transfer = await FileTransfer.findOne({
            where: {
                id: parseInt(id),
                company_id: companyId
            },
            include: [
                { model: Agent, as: 'Agent', attributes: ['id', 'hostname'] },
                { model: User, as: 'User', attributes: ['id', 'email', 'first_name', 'last_name'] }
            ]
        });

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: 'Transfer not found or does not belong to your company'
            });
        }

        res.json({
            success: true,
            data: transfer
        });
    } catch (error) {
        logger.error('Get transfer status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Cancel transfer
 * POST /api/file-transfer/:id/cancel
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.cancelTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId;
        const userId = req.user.id;

        const transfer = await FileTransfer.findOne({
            where: {
                id: parseInt(id),
                company_id: companyId,
                status: { [Op.in]: ['pending', 'in_progress'] }
            }
        });

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: 'Transfer not found or cannot be cancelled'
            });
        }

        // Update transfer status
        await transfer.update({
            status: 'cancelled',
            completed_at: new Date()
        });

        // Send cancel command to agent
        try {
            await AgentCommand.create({
                agent_id: transfer.agent_id,
                company_id: companyId,
                command_type: 'custom',
                command_text: 'file_transfer_cancel',
                parameters: {
                    transfer_id: transfer.id
                },
                status: 'pending',
                priority: 9, // High priority for cancellation
                created_by: userId
            });
        } catch (cmdError) {
            logger.error('Failed to create cancel command:', cmdError);
        }

        // Audit log
        await logAction({
            companyId,
            userId,
            action: 'file_transfer.cancel',
            entityType: 'file_transfer',
            entityId: transfer.id,
            req
        });

        logger.info(`File transfer cancelled: ${transfer.id} by user ${userId}`);

        res.json({
            success: true,
            message: 'Transfer cancelled successfully'
        });
    } catch (error) {
        logger.error('Cancel transfer error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get transfer history
 * GET /api/file-transfer/history
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.getTransferHistory = async (req, res) => {
    try {
        const companyId = req.companyId;
        const { agent_id, direction, status, start_date, end_date, page = 1, limit = 20 } = req.query;

        const whereClause = {
            company_id: companyId
        };

        if (agent_id) {
            whereClause.agent_id = parseInt(agent_id);
        }

        if (direction) {
            whereClause.direction = direction;
        }

        if (status) {
            whereClause.status = status;
        }

        if (start_date || end_date) {
            whereClause.started_at = {};
            if (start_date) {
                whereClause.started_at[Op.gte] = new Date(start_date);
            }
            if (end_date) {
                whereClause.started_at[Op.lte] = new Date(end_date);
            }
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: transfers } = await FileTransfer.findAndCountAll({
            where: whereClause,
            include: [
                { model: Agent, as: 'Agent', attributes: ['id', 'hostname'] },
                { model: User, as: 'User', attributes: ['id', 'email', 'first_name', 'last_name'] }
            ],
            order: [['started_at', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        res.json({
            success: true,
            data: {
                transfers: transfers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    pages: Math.ceil(count / parseInt(limit))
                }
            }
        });
    } catch (error) {
        logger.error('Get transfer history error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

