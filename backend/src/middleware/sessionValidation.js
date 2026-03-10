const { RemoteSession } = require('../models');
const logger = require('../utils/logger');

/**
 * Validate session exists and belongs to company
 */
exports.validateSessionAccess = async (req, res, next) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        const session = await RemoteSession.findOne({
            where: {
                id: parseInt(id),
                company_id: companyId
            }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found or does not belong to your company'
            });
        }

        // Attach session to request
        req.session = session;
        next();
    } catch (error) {
        logger.error('Session validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating session'
        });
    }
};

/**
 * Validate session is active
 */
exports.validateSessionActive = async (req, res, next) => {
    try {
        if (!req.session) {
            return res.status(400).json({
                success: false,
                message: 'Session not found'
            });
        }

        if (req.session.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Session is not active'
            });
        }

        next();
    } catch (error) {
        logger.error('Session active validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating session status'
        });
    }
};

