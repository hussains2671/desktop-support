const { EventLog, Device } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

exports.getCompanyEventLogs = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 100, 
            level, 
            log_type, 
            source,
            device_id,
            start_date, 
            end_date,
            search 
        } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        // Get all device IDs for this company
        const devices = await Device.findAll({
            where: { company_id: companyId },
            attributes: ['id']
        });
        const deviceIds = devices.map(d => d.id);

        if (deviceIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: {
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: 0
                }
            });
        }

        // Build where clause
        const where = {
            device_id: { [Op.in]: deviceIds }
        };

        if (level) {
            where.level = level;
        }
        if (log_type) {
            where.log_type = log_type;
        }
        if (source) {
            where.source = { [Op.iLike]: `%${source}%` };
        }
        if (device_id) {
            where.device_id = parseInt(device_id);
        }
        if (start_date || end_date) {
            where.time_generated = {};
            if (start_date) {
                where.time_generated[Op.gte] = new Date(start_date);
            }
            if (end_date) {
                where.time_generated[Op.lte] = new Date(end_date);
            }
        }
        if (search) {
            where[Op.or] = [
                { message: { [Op.iLike]: `%${search}%` } },
                { source: { [Op.iLike]: `%${search}%` } },
                { category: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const logs = await EventLog.findAndCountAll({
            where,
            include: [{
                model: Device,
                as: 'Device',
                attributes: ['id', 'hostname', 'username'],
                required: false
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['time_generated', 'DESC']]
        });

        res.json({
            success: true,
            data: logs.rows,
            pagination: {
                total: logs.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(logs.count / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Get company event logs error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getEventLogStats = async (req, res) => {
    try {
        const { start_date, end_date, device_id } = req.query;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        // Get all device IDs for this company
        const devices = await Device.findAll({
            where: { company_id: companyId },
            attributes: ['id']
        });
        const deviceIds = devices.map(d => d.id);

        if (deviceIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    total: 0,
                    by_level: {},
                    by_type: {},
                    by_source: {},
                    recent_critical: 0,
                    recent_errors: 0
                }
            });
        }

        // Build where clause
        const where = {
            device_id: { [Op.in]: deviceIds }
        };

        if (device_id) {
            where.device_id = parseInt(device_id);
        }
        if (start_date || end_date) {
            where.time_generated = {};
            if (start_date) {
                where.time_generated[Op.gte] = new Date(start_date);
            }
            if (end_date) {
                where.time_generated[Op.lte] = new Date(end_date);
            }
        }

        // Get total count
        const total = await EventLog.count({ where });

        // Get counts by level
        const levels = ['critical', 'error', 'warning', 'information', 'verbose'];
        const byLevel = {};
        for (const level of levels) {
            byLevel[level] = await EventLog.count({
                where: { ...where, level }
            });
        }

        // Get counts by type
        const types = ['system', 'application', 'security', 'hardware', 'custom'];
        const byType = {};
        for (const type of types) {
            byType[type] = await EventLog.count({
                where: { ...where, log_type: type }
            });
        }

        // Get top sources
        const topSources = await EventLog.findAll({
            where,
            attributes: [
                'source',
                [EventLog.sequelize.fn('COUNT', EventLog.sequelize.col('id')), 'count']
            ],
            group: ['source'],
            order: [[EventLog.sequelize.literal('count'), 'DESC']],
            limit: 10,
            raw: true
        });

        const bySource = {};
        topSources.forEach(item => {
            if (item.source) {
                bySource[item.source] = parseInt(item.count);
            }
        });

        // Get recent critical and errors (last 24 hours)
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCritical = await EventLog.count({
            where: {
                ...where,
                level: 'critical',
                time_generated: { [Op.gte]: last24Hours }
            }
        });
        const recentErrors = await EventLog.count({
            where: {
                ...where,
                level: 'error',
                time_generated: { [Op.gte]: last24Hours }
            }
        });

        res.json({
            success: true,
            data: {
                total,
                by_level: byLevel,
                by_type: byType,
                by_source: bySource,
                recent_critical: recentCritical,
                recent_errors: recentErrors
            }
        });
    } catch (error) {
        logger.error('Get event log stats error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.exportEventLogs = async (req, res) => {
    try {
        const { 
            level, 
            log_type, 
            source,
            device_id,
            start_date, 
            end_date 
        } = req.query;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        // Get all device IDs for this company
        const devices = await Device.findAll({
            where: { company_id: companyId },
            attributes: ['id']
        });
        const deviceIds = devices.map(d => d.id);

        if (deviceIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No devices found'
            });
        }

        // Build where clause
        const where = {
            device_id: { [Op.in]: deviceIds }
        };

        if (level) {
            where.level = level;
        }
        if (log_type) {
            where.log_type = log_type;
        }
        if (source) {
            where.source = { [Op.iLike]: `%${source}%` };
        }
        if (device_id) {
            where.device_id = parseInt(device_id);
        }
        if (start_date || end_date) {
            where.time_generated = {};
            if (start_date) {
                where.time_generated[Op.gte] = new Date(start_date);
            }
            if (end_date) {
                where.time_generated[Op.lte] = new Date(end_date);
            }
        }

        // Get logs (limit to 10000 for export)
        const logs = await EventLog.findAll({
            where,
            include: [{
                model: Device,
                as: 'Device',
                attributes: ['id', 'hostname', 'username']
            }],
            limit: 10000,
            order: [['time_generated', 'DESC']]
        });

        // Convert to CSV format
        const csvHeader = 'Time,Device,Level,Type,Source,Event ID,Message,Category,User\n';
        const csvRows = logs.map(log => {
            const time = log.time_generated ? new Date(log.time_generated).toISOString() : '';
            const device = log.Device?.hostname || 'Unknown';
            const level = log.level || '';
            const type = log.log_type || '';
            const source = (log.source || '').replace(/,/g, ';');
            const eventId = log.event_id || '';
            const message = (log.message || '').replace(/,/g, ';').replace(/\n/g, ' ');
            const category = log.category || '';
            const user = log.user_name || '';
            return `${time},${device},${level},${type},${source},${eventId},"${message}",${category},${user}`;
        });

        const csv = csvHeader + csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="event-logs-${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        logger.error('Export event logs error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

