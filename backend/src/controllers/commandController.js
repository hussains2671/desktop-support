const { AgentCommand, Agent, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { logAction } = require('../utils/auditLogger');

/**
 * Create a new command for an agent
 * POST /api/commands
 * Requires: Admin authentication, agent belongs to company
 */
exports.createCommand = async (req, res) => {
    try {
        const { agent_id, command_type, command_text, parameters, priority } = req.body;
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

        // Create command
        const command = await AgentCommand.create({
            agent_id: agent_id,
            company_id: companyId,
            command_type: command_type,
            command_text: command_text,
            parameters: parameters || {},
            status: 'pending',
            priority: priority || 5,
            created_by: userId
        });

        // Audit log
        await logAction({
            companyId,
            userId,
            action: 'command.create',
            entityType: 'agent_command',
            entityId: command.id,
            newValues: {
                agent_id: agent_id,
                command_type: command_type,
                priority: priority || 5
            },
            req
        });

        logger.info(`Command created: ${command.id} for agent ${agent_id} by user ${userId}`);

        res.status(201).json({
            success: true,
            message: 'Command created successfully',
            data: command
        });
    } catch (error) {
        logger.error('Create command error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get pending commands for authenticated agent
 * GET /api/commands/pending
 * Requires: Agent authentication
 */
exports.getPendingCommands = async (req, res) => {
    try {
        const agentId = req.agentId;

        // Get pending commands for this agent, ordered by priority (desc) then created_at (asc)
        const commands = await AgentCommand.findAll({
            where: {
                agent_id: agentId,
                status: 'pending'
            },
            order: [
                ['priority', 'DESC'],
                ['created_at', 'ASC']
            ],
            limit: 10 // Maximum 10 commands per request
        });

        res.json({
            success: true,
            data: commands
        });
    } catch (error) {
        logger.error('Get pending commands error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update command execution status
 * POST /api/commands/:id/status
 * Requires: Agent authentication, command belongs to agent
 */
exports.updateCommandStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, result_output, result_error, exit_code, execution_time_ms } = req.body;
        const agentId = req.agentId;
        const companyId = req.companyId;

        // Find command and verify it belongs to this agent
        const command = await AgentCommand.findOne({
            where: {
                id: id,
                agent_id: agentId,
                company_id: companyId
            }
        });

        if (!command) {
            return res.status(404).json({
                success: false,
                message: 'Command not found or does not belong to this agent'
            });
        }

        // Update command
        const updateData = {
            status: status
        };

        if (status === 'running' && !command.started_at) {
            updateData.started_at = new Date();
        }

        if (status === 'completed' || status === 'failed') {
            updateData.completed_at = new Date();
            updateData.result_output = result_output || null;
            updateData.result_error = result_error || null;
            updateData.exit_code = exit_code !== undefined ? exit_code : null;
            updateData.execution_time_ms = execution_time_ms || null;

            // Calculate execution time if not provided
            if (!updateData.execution_time_ms && command.started_at) {
                const startTime = new Date(command.started_at);
                const endTime = new Date();
                updateData.execution_time_ms = endTime - startTime;
            }
        }

        await command.update(updateData);

        // Audit log
        await logAction({
            companyId,
            userId: null, // Agent action, no user
            action: `command.${status}`,
            entityType: 'agent_command',
            entityId: command.id,
            newValues: {
                status: status,
                exit_code: exit_code,
                execution_time_ms: updateData.execution_time_ms
            },
            req
        });

        logger.info(`Command ${id} status updated to ${status} by agent ${agentId}`);

        res.json({
            success: true,
            message: 'Command status updated successfully'
        });
    } catch (error) {
        logger.error('Update command status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get command history with filters
 * GET /api/commands/history
 * Requires: Admin authentication
 */
exports.getCommandHistory = async (req, res) => {
    try {
        const { agent_id, status, start_date, end_date, page = 1, limit = 20 } = req.query;
        const companyId = req.companyId;

        // Build where clause
        const where = {
            company_id: companyId
        };

        if (agent_id) {
            where.agent_id = parseInt(agent_id);
        }

        if (status) {
            where.status = status;
        }

        if (start_date || end_date) {
            where.created_at = {};
            if (start_date) {
                where.created_at[Op.gte] = new Date(start_date);
            }
            if (end_date) {
                where.created_at[Op.lte] = new Date(end_date);
            }
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const limitInt = Math.min(parseInt(limit), 100); // Max 100 per page

        // Get commands with related data
        const { count, rows: commands } = await AgentCommand.findAndCountAll({
            where: where,
            include: [
                {
                    model: Agent,
                    as: 'Agent',
                    attributes: ['id', 'hostname', 'device_id']
                },
                {
                    model: User,
                    as: 'CreatedBy',
                    attributes: ['id', 'email', 'first_name', 'last_name']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: limitInt,
            offset: offset
        });

        res.json({
            success: true,
            data: {
                commands: commands,
                pagination: {
                    page: parseInt(page),
                    limit: limitInt,
                    total: count,
                    pages: Math.ceil(count / limitInt)
                }
            }
        });
    } catch (error) {
        logger.error('Get command history error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Cancel a pending command
 * POST /api/commands/:id/cancel
 * Requires: Admin authentication, command belongs to company
 */
exports.cancelCommand = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId;
        const userId = req.user.id;

        // Find command and verify it belongs to company
        const command = await AgentCommand.findOne({
            where: {
                id: id,
                company_id: companyId
            }
        });

        if (!command) {
            return res.status(404).json({
                success: false,
                message: 'Command not found or does not belong to your company'
            });
        }

        // Check if command can be cancelled
        if (command.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel command with status: ${command.status}`
            });
        }

        // Update command status
        await command.update({
            status: 'cancelled',
            completed_at: new Date()
        });

        // Audit log
        await logAction({
            companyId,
            userId,
            action: 'command.cancel',
            entityType: 'agent_command',
            entityId: command.id,
            oldValues: {
                status: 'pending'
            },
            newValues: {
                status: 'cancelled'
            },
            req
        });

        logger.info(`Command ${id} cancelled by user ${userId}`);

        res.json({
            success: true,
            message: 'Command cancelled successfully'
        });
    } catch (error) {
        logger.error('Cancel command error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

