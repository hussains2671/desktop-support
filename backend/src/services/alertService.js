const { Alert, Device, Company } = require('../models');
const logger = require('../utils/logger');

class AlertService {
    async createAlert(companyId, deviceId, alertType, severity, title, message, metadata = {}) {
        try {
            const alert = await Alert.create({
                company_id: companyId,
                device_id: deviceId,
                alert_type: alertType,
                severity,
                title,
                message,
                status: 'open',
                metadata
            });

            logger.info(`Alert created: ${alertType} for device ${deviceId}`);
            return alert;
        } catch (error) {
            logger.error('Create alert error:', error);
            throw error;
        }
    }

    async acknowledgeAlert(alertId, userId) {
        try {
            const alert = await Alert.findByPk(alertId);
            if (!alert) {
                throw new Error('Alert not found');
            }

            await alert.update({
                status: 'acknowledged',
                acknowledged_by: userId,
                acknowledged_at: new Date()
            });

            return alert;
        } catch (error) {
            logger.error('Acknowledge alert error:', error);
            throw error;
        }
    }

    async resolveAlert(alertId) {
        try {
            const alert = await Alert.findByPk(alertId);
            if (!alert) {
                throw new Error('Alert not found');
            }

            await alert.update({
                status: 'resolved',
                resolved_at: new Date()
            });

            return alert;
        } catch (error) {
            logger.error('Resolve alert error:', error);
            throw error;
        }
    }
}

module.exports = new AlertService();

