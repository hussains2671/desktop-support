const { NotificationPreference, Alert, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// List notifications (reuse Alerts as notifications source)
exports.getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, severity, search } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Company ID required' });
        }

        const where = { company_id: companyId };
        if (status) where.status = status;
        if (severity) where.severity = severity;
        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { message: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const notifications = await Alert.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: notifications.rows,
            pagination: {
                total: notifications.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(notifications.count / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark notifications as read (acknowledge)
exports.markRead = async (req, res) => {
    try {
        const { ids = [] } = req.body;
        const userId = req.user?.id;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Company ID required' });
        }

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No notification IDs provided' });
        }

        const alerts = await Alert.findAll({ where: { id: { [Op.in]: ids }, company_id: companyId } });
        for (const alert of alerts) {
            await alert.update({ status: 'acknowledged', acknowledged_by: userId, acknowledged_at: new Date() });
        }

        res.json({ success: true, message: 'Notifications marked as read', count: alerts.length });
    } catch (error) {
        logger.error('Mark notifications read error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Simple Notification Preferences model shim (in DB we can store in company_features or separate table)
exports.getPreferences = async (req, res) => {
    try {
        // Return defaults for now
        res.json({
            success: true,
            data: {
                email_enabled: false,
                in_app_enabled: true,
                severities: ['critical', 'high', 'medium']
            }
        });
    } catch (error) {
        logger.error('Get notification preferences error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updatePreferences = async (req, res) => {
    try {
        const { email_enabled, in_app_enabled, severities } = req.body;
        // Persisting preferences is a future enhancement; for now, echo back
        res.json({
            success: true,
            message: 'Preferences updated',
            data: { email_enabled: !!email_enabled, in_app_enabled: !!in_app_enabled, severities: severities || [] }
        });
    } catch (error) {
        logger.error('Update notification preferences error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
