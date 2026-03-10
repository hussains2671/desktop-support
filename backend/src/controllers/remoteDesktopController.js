const { RemoteSession, Agent, AgentCommand, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { logAction } = require('../utils/auditLogger');
const vncService = require('../services/vncService');

/**
 * Create a new remote desktop session
 * POST /api/remote-desktop/sessions
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.createSession = async (req, res) => {
    try {
        const { agent_id } = req.body;
        const companyId = req.companyId;
        const userId = req.user.id;

        // Validate input
        if (!agent_id) {
            return res.status(400).json({
                success: false,
                message: 'agent_id is required'
            });
        }

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

        // Check if agent is online
        if (agent.status !== 'online') {
            return res.status(400).json({
                success: false,
                message: 'Agent is not online. Cannot create remote session.'
            });
        }

        // Check if agent already has an active session
        const existingSession = await RemoteSession.findOne({
            where: {
                agent_id: agent_id,
                company_id: companyId,
                status: 'active'
            }
        });

        if (existingSession) {
            return res.status(400).json({
                success: false,
                message: 'Agent already has an active remote session',
                data: {
                    session_id: existingSession.id,
                    websocket_url: existingSession.websocket_url
                }
            });
        }

        // Generate VNC password and port
        const vncPassword = vncService.generateVNCPassword();
        const vncPort = await vncService.generateVNCPort(agent_id);

        // Encrypt password for storage
        const encryptedPassword = vncService.encryptPassword(vncPassword);

        // Create session record
        const session = await RemoteSession.create({
            agent_id: agent_id,
            company_id: companyId,
            user_id: userId,
            session_type: 'vnc',
            status: 'active',
            vnc_password: encryptedPassword.encrypted,
            vnc_port: vncPort,
            started_at: new Date()
        });

        // Generate connection string and WebSocket URL
        const connectionInfo = vncService.createVNCConnectionString(agent_id, vncPort, session.id);
        
        // Update session with connection info
        await session.update({
            websocket_url: connectionInfo.websocket_url,
            connection_string: `vnc://${agent.ip_address || 'localhost'}:${vncPort}`
        });

        // Send command to agent to start VNC server
        try {
            await AgentCommand.create({
                agent_id: agent_id,
                company_id: companyId,
                command_type: 'custom',
                command_text: 'start_vnc',
                parameters: {
                    port: vncPort,
                    password: vncPassword
                },
                status: 'pending',
                priority: 8, // High priority
                created_by: userId
            });

            logger.info(`VNC start command created for agent ${agent_id}, session ${session.id}`);
        } catch (cmdError) {
            logger.error('Failed to create VNC start command:', cmdError);
            // Don't fail the session creation, agent will handle it
        }

        // Audit log
        await logAction({
            companyId,
            userId,
            action: 'remote_session.create',
            entityType: 'remote_session',
            entityId: session.id,
            newValues: {
                agent_id: agent_id,
                session_type: 'vnc',
                vnc_port: vncPort
            },
            req
        });

        logger.info(`Remote session created: ${session.id} for agent ${agent_id} by user ${userId}`);

        // Return session without sensitive data
        const sessionData = session.toJSON();
        delete sessionData.vnc_password; // Don't return password

        res.status(201).json({
            success: true,
            message: 'Remote session created successfully',
            data: {
                ...sessionData,
                websocket_url: connectionInfo.websocket_url
            }
        });
    } catch (error) {
        logger.error('Create remote session error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get remote session details
 * GET /api/remote-desktop/sessions/:id
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.getSession = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId;

        const session = await RemoteSession.findOne({
            where: {
                id: id,
                company_id: companyId
            },
            include: [
                { model: Agent, as: 'Agent', attributes: ['id', 'hostname', 'status'] },
                { model: User, as: 'User', attributes: ['id', 'email', 'first_name', 'last_name'] }
            ]
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found or does not belong to your company'
            });
        }

        // Don't return sensitive data
        const sessionData = session.toJSON();
        delete sessionData.vnc_password;

        res.json({
            success: true,
            data: sessionData
        });
    } catch (error) {
        logger.error('Get session error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get active remote sessions
 * GET /api/remote-desktop/sessions
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.getActiveSessions = async (req, res) => {
    try {
        const companyId = req.companyId;
        const { agent_id, user_id } = req.query;

        const whereClause = {
            company_id: companyId,
            status: 'active'
        };

        if (agent_id) {
            whereClause.agent_id = parseInt(agent_id);
        }

        if (user_id) {
            whereClause.user_id = parseInt(user_id);
        }

        const sessions = await RemoteSession.findAll({
            where: whereClause,
            include: [
                { model: Agent, as: 'Agent', attributes: ['id', 'hostname', 'status'] },
                { model: User, as: 'User', attributes: ['id', 'email', 'first_name', 'last_name'] }
            ],
            order: [['started_at', 'DESC']]
        });

        // Remove sensitive data
        const sessionsData = sessions.map(session => {
            const data = session.toJSON();
            delete data.vnc_password;
            return data;
        });

        res.json({
            success: true,
            data: sessionsData
        });
    } catch (error) {
        logger.error('Get active sessions error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * End a remote session
 * POST /api/remote-desktop/sessions/:id/end
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.endSession = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId;
        const userId = req.user.id;

        const session = await RemoteSession.findOne({
            where: {
                id: id,
                company_id: companyId
            },
            include: [{ model: Agent, as: 'Agent' }]
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found or does not belong to your company'
            });
        }

        if (session.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Session is not active'
            });
        }

        // Calculate duration
        const endedAt = new Date();
        const durationSeconds = Math.floor((endedAt - new Date(session.started_at)) / 1000);

        // Update session
        await session.update({
            status: 'ended',
            ended_at: endedAt,
            duration_seconds: durationSeconds
        });

        // Send command to agent to stop VNC server
        try {
            await AgentCommand.create({
                agent_id: session.agent_id,
                company_id: companyId,
                command_type: 'custom',
                command_text: 'stop_vnc',
                parameters: {
                    port: session.vnc_port
                },
                status: 'pending',
                priority: 8,
                created_by: userId
            });

            logger.info(`VNC stop command created for agent ${session.agent_id}, session ${id}`);
        } catch (cmdError) {
            logger.error('Failed to create VNC stop command:', cmdError);
        }

        // Audit log
        await logAction({
            companyId,
            userId,
            action: 'remote_session.end',
            entityType: 'remote_session',
            entityId: session.id,
            newValues: {
                duration_seconds: durationSeconds
            },
            req
        });

        logger.info(`Remote session ended: ${id} by user ${userId}`);

        res.json({
            success: true,
            message: 'Session ended successfully',
            data: {
                id: session.id,
                duration_seconds: durationSeconds
            }
        });
    } catch (error) {
        logger.error('End session error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get session history
 * GET /api/remote-desktop/sessions/history
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.getSessionHistory = async (req, res) => {
    try {
        const companyId = req.companyId;
        const { agent_id, user_id, start_date, end_date, page = 1, limit = 20 } = req.query;

        const whereClause = {
            company_id: companyId
        };

        if (agent_id) {
            whereClause.agent_id = parseInt(agent_id);
        }

        if (user_id) {
            whereClause.user_id = parseInt(user_id);
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

        const { count, rows: sessions } = await RemoteSession.findAndCountAll({
            where: whereClause,
            include: [
                { model: Agent, as: 'Agent', attributes: ['id', 'hostname'] },
                { model: User, as: 'User', attributes: ['id', 'email', 'first_name', 'last_name'] }
            ],
            order: [['started_at', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        // Remove sensitive data
        const sessionsData = sessions.map(session => {
            const data = session.toJSON();
            delete data.vnc_password;
            return data;
        });

        res.json({
            success: true,
            data: {
                sessions: sessionsData,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    pages: Math.ceil(count / parseInt(limit))
                }
            }
        });
    } catch (error) {
        logger.error('Get session history error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Refresh session connection
 * POST /api/remote-desktop/sessions/:id/refresh
 * Requires: Admin, Company Admin, or Technician authentication
 */
exports.refreshSession = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId;

        const session = await RemoteSession.findOne({
            where: {
                id: id,
                company_id: companyId,
                status: 'active'
            },
            include: [{ model: Agent, as: 'Agent' }]
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Active session not found or does not belong to your company'
            });
        }

        // Regenerate connection info
        const connectionInfo = vncService.createVNCConnectionString(
            session.agent_id,
            session.vnc_port,
            session.id
        );

        // Update session
        await session.update({
            websocket_url: connectionInfo.websocket_url
        });

        res.json({
            success: true,
            message: 'Session refreshed successfully',
            data: {
                websocket_url: connectionInfo.websocket_url
            }
        });
    } catch (error) {
        logger.error('Refresh session error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

