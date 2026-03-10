/**
 * Enhanced Audit Logging Utility
 * Logs all security-relevant actions
 */

const { AuditLog } = require('../models');
const logger = require('./logger');

/**
 * Get client IP address from request
 */
function getClientIp(req) {
    if (!req) return 'unknown';
    
    return req.ip || 
           (req.connection && req.connection.remoteAddress) || 
           (req.socket && req.socket.remoteAddress) ||
           (req.headers && req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
           'unknown';
}

/**
 * Get user agent from request
 */
function getUserAgent(req) {
    if (!req || !req.headers) return 'unknown';
    return req.headers['user-agent'] || 'unknown';
}

/**
 * Create audit log entry
 */
async function logAction({
    companyId,
    userId,
    action,
    entityType = null,
    entityId = null,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    req = null
}) {
    try {
        // Extract IP and user agent from request if provided
        const finalIp = ipAddress || (req ? getClientIp(req) : null);
        const finalUserAgent = userAgent || (req ? getUserAgent(req) : null);

        await AuditLog.create({
            company_id: companyId,
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_values: oldValues,
            new_values: newValues,
            ip_address: finalIp,
            user_agent: finalUserAgent
        });

        logger.info(`Audit log created: ${action} by user ${userId}`, {
            companyId,
            userId,
            action,
            entityType,
            entityId
        });
    } catch (error) {
        // Don't throw - audit logging should not break the application
        logger.error('Failed to create audit log:', error);
    }
}

/**
 * Log authentication events
 */
async function logAuthEvent(userId, companyId, action, req, details = {}) {
    await logAction({
        companyId,
        userId,
        action: `auth.${action}`,
        newValues: details,
        req
    });
}

/**
 * Log user management events
 */
async function logUserAction(userId, companyId, action, targetUserId, oldValues = null, newValues = null, req = null) {
    await logAction({
        companyId,
        userId,
        action: `user.${action}`,
        entityType: 'user',
        entityId: targetUserId,
        oldValues,
        newValues,
        req
    });
}

/**
 * Log security events
 */
async function logSecurityEvent(userId, companyId, action, details = {}, req = null) {
    await logAction({
        companyId,
        userId,
        action: `security.${action}`,
        newValues: details,
        req
    });
}

module.exports = {
    logAction,
    logAuthEvent,
    logUserAction,
    logSecurityEvent,
    getClientIp,
    getUserAgent
};

