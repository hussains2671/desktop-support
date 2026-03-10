const { Alert, Device, User } = require('../models');
const logger = require('../utils/logger');

exports.getAlerts = async (req, res) => {
    try {
        const { limit = 20, page = 1, status, severity, device_id, alert_type } = req.query;
        const companyId = req.companyId || req.user?.company_id;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const where = { company_id: companyId };
        
        if (status) {
            where.status = status;
        }
        if (severity) {
            where.severity = severity;
        }
        if (device_id) {
            where.device_id = device_id;
        }
        if (alert_type) {
            where.alert_type = alert_type;
        }

        const alerts = await Alert.findAndCountAll({
            where,
            include: [
                {
                    model: Device,
                    as: 'Device',
                    attributes: ['id', 'hostname', 'username', 'os_version']
                },
                {
                    model: User,
                    as: 'AcknowledgedBy',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: alerts.rows,
            pagination: {
                total: alerts.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(alerts.count / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Get alerts error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || req.user?.company_id;

        const alert = await Alert.findOne({
            where: {
                id,
                company_id: companyId
            },
            include: [
                {
                    model: Device,
                    as: 'Device',
                    attributes: ['id', 'hostname', 'username', 'os_version']
                },
                {
                    model: User,
                    as: 'AcknowledgedBy',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                }
            ]
        });

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        res.json({
            success: true,
            data: alert
        });
    } catch (error) {
        logger.error('Get alert error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.acknowledgeAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const companyId = req.companyId || req.user?.company_id;

        const alert = await Alert.findOne({
            where: {
                id,
                company_id: companyId
            }
        });

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        await alert.update({
            status: 'acknowledged',
            acknowledged_by: userId,
            acknowledged_at: new Date()
        });

        logger.info(`Alert ${id} acknowledged by user ${userId}`);

        res.json({
            success: true,
            message: 'Alert acknowledged',
            data: alert
        });
    } catch (error) {
        logger.error('Acknowledge alert error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.resolveAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || req.user?.company_id;

        const alert = await Alert.findOne({
            where: {
                id,
                company_id: companyId
            }
        });

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        await alert.update({
            status: 'resolved',
            resolved_at: new Date()
        });

        logger.info(`Alert ${id} resolved`);

        res.json({
            success: true,
            message: 'Alert resolved',
            data: alert
        });
    } catch (error) {
        logger.error('Resolve alert error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getAlertStats = async (req, res) => {
    try {
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const [total, open, critical, high] = await Promise.all([
            Alert.count({ where: { company_id: companyId } }),
            Alert.count({ where: { company_id: companyId, status: 'open' } }),
            Alert.count({ where: { company_id: companyId, severity: 'critical' } }),
            Alert.count({ where: { company_id: companyId, severity: 'high' } })
        ]);

        res.json({
            success: true,
            data: {
                total,
                open,
                critical,
                high
            }
        });
    } catch (error) {
        logger.error('Get alert stats error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

