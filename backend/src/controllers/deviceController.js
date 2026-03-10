const { Device, HardwareInventory, SoftwareInventory, EventLog, PerformanceMetric, NetworkInfo, SecurityStatus, Agent } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

exports.getAllDevices = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const offset = (page - 1) * limit;
        const companyId = req.companyId;

        const where = { company_id: companyId };
        if (search) {
            where[Op.or] = [
                { hostname: { [Op.iLike]: `%${search}%` } },
                { username: { [Op.iLike]: `%${search}%` } },
                { serial_number: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (status) {
            where.status = status;
        }

        const devices = await Device.findAndCountAll({
            where,
            include: [{
                model: Agent,
                as: 'Agent',
                attributes: ['id', 'status', 'last_heartbeat']
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['last_seen', 'DESC']]
        });

        res.json({
            success: true,
            data: devices.rows,
            pagination: {
                total: devices.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(devices.count / limit)
            }
        });
    } catch (error) {
        logger.error('Get devices error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDevice = async (req, res) => {
    try {
        const device = await Device.findOne({
            where: {
                id: req.params.id,
                company_id: req.companyId
            },
            include: [{
                model: Agent,
                as: 'Agent',
                attributes: ['id', 'status', 'last_heartbeat', 'agent_version']
            }]
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        res.json({
            success: true,
            data: device
        });
    } catch (error) {
        logger.error('Get device error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDeviceHardware = async (req, res) => {
    try {
        const hardware = await HardwareInventory.findAll({
            where: {
                device_id: req.params.id
            },
            order: [['component_type', 'ASC']]
        });

        res.json({
            success: true,
            data: hardware
        });
    } catch (error) {
        logger.error('Get device hardware error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDeviceSoftware = async (req, res) => {
    try {
        const { page = 1, limit = 50, search } = req.query;
        const offset = (page - 1) * limit;

        const where = { device_id: req.params.id };
        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }

        const software = await SoftwareInventory.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['name', 'ASC']]
        });

        res.json({
            success: true,
            data: software.rows,
            pagination: {
                total: software.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(software.count / limit)
            }
        });
    } catch (error) {
        logger.error('Get device software error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDeviceEventLogs = async (req, res) => {
    try {
        const { page = 1, limit = 100, level, log_type, start_date, end_date } = req.query;
        const offset = (page - 1) * limit;

        const where = { device_id: req.params.id };
        if (level) {
            where.level = level;
        }
        if (log_type) {
            where.log_type = log_type;
        }
        if (start_date && end_date) {
            where.time_generated = {
                [Op.between]: [new Date(start_date), new Date(end_date)]
            };
        }

        const logs = await EventLog.findAndCountAll({
            where,
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
                pages: Math.ceil(logs.count / limit)
            }
        });
    } catch (error) {
        logger.error('Get device event logs error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDevicePerformance = async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

        const metrics = await PerformanceMetric.findAll({
            where: {
                device_id: req.params.id,
                recorded_at: {
                    [Op.gte]: startDate
                }
            },
            order: [['recorded_at', 'ASC']],
            limit: 1000
        });

        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        logger.error('Get device performance error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

