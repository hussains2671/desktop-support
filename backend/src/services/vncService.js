const crypto = require('crypto');
const config = require('../config/config');
const logger = require('../utils/logger');
const { RemoteSession } = require('../models');
const { Op } = require('sequelize');

class VNCService {
    /**
     * Generate a random VNC password (8 characters, alphanumeric)
     * VNC passwords are limited to 8 characters
     */
    generateVNCPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    /**
     * Generate a unique VNC port for an agent
     * Port range: 5900-5999 (VNC standard ports)
     * Returns the port number
     */
    async generateVNCPort(agentId) {
        const basePort = 5900;
        const maxPort = 5999;
        
        // Get all active sessions to check for port conflicts
        const activeSessions = await RemoteSession.findAll({
            where: {
                status: 'active',
                vnc_port: {
                    [Op.not]: null
                }
            },
            attributes: ['vnc_port']
        });

        const usedPorts = new Set(activeSessions.map(s => s.vnc_port).filter(p => p !== null));

        // Try to find an available port
        for (let port = basePort; port <= maxPort; port++) {
            if (!usedPorts.has(port)) {
                return port;
            }
        }

        // If all ports are taken, use a random port in range
        logger.warn('All VNC ports in range are in use, using random port');
        return basePort + Math.floor(Math.random() * (maxPort - basePort + 1));
    }

    /**
     * Create VNC connection string for noVNC
     * Format: ws://server:port/websockify?token=xxx or wss://server/websockify?token=xxx
     */
    createVNCConnectionString(agentId, port, sessionId) {
        // Determine WebSocket protocol based on HTTPS usage
        // Use wss:// if HTTPS is enabled, otherwise ws://
        const wsProtocol = config.useHttps || config.protocol === 'https' ? 'wss' : 'ws';
        
        // Extract host from API_BASE_URL
        const host = config.apiBaseUrl.replace(/^https?:\/\//, '').split(':')[0] || 'localhost';
        
        // For HTTPS, don't include port (uses standard 443)
        // For HTTP, include port if not production
        const wsPort = (config.useHttps || config.protocol === 'https') ? '' : `:${config.port}`;
        
        // Generate a token for this session (using session ID + secret)
        const token = this.generateSessionToken(sessionId, agentId);
        
        // WebSocket URL for noVNC
        const websocketUrl = `${wsProtocol}://${host}${wsPort}/websockify?token=${token}&session=${sessionId}`;
        
        logger.info(`Generated WebSocket URL: ${websocketUrl} (protocol: ${wsProtocol}, host: ${host})`);
        
        return {
            websocket_url: websocketUrl,
            token: token,
            port: port
        };
    }

    /**
     * Generate a session token for WebSocket authentication
     */
    generateSessionToken(sessionId, agentId) {
        const secret = config.jwtSecret;
        const data = `${sessionId}:${agentId}:${Date.now()}`;
        return crypto.createHash('sha256').update(data + secret).digest('hex').substring(0, 32);
    }

    /**
     * Validate session access
     * Verify user has access to session and session belongs to company
     */
    async validateSessionAccess(sessionId, userId, companyId) {
        try {
            const session = await RemoteSession.findOne({
                where: {
                    id: sessionId,
                    company_id: companyId
                }
            });

            if (!session) {
                return { valid: false, message: 'Session not found or access denied' };
            }

            // Check if session is active
            if (session.status !== 'active') {
                return { valid: false, message: 'Session is not active' };
            }

            // Check if user created the session or is admin
            // Note: In a real implementation, you might want to check user role
            if (session.user_id !== userId) {
                // Allow if user is admin (this check should be done at route level)
                // For now, we'll allow if session belongs to company
                return { valid: true, session };
            }

            return { valid: true, session };
        } catch (error) {
            logger.error('Session access validation error:', error);
            return { valid: false, message: 'Error validating session access' };
        }
    }

    /**
     * Encrypt VNC password for storage
     * Note: In production, use proper encryption (AES-256)
     */
    encryptPassword(password) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(config.jwtSecret, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        
        let encrypted = cipher.update(password, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return {
            encrypted: iv.toString('hex') + ':' + encrypted,
            iv: iv.toString('hex')
        };
    }

    /**
     * Decrypt VNC password
     */
    decryptPassword(encryptedData) {
        try {
            const algorithm = 'aes-256-cbc';
            const key = crypto.scryptSync(config.jwtSecret, 'salt', 32);
            const parts = encryptedData.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            
            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            logger.error('Password decryption error:', error);
            return null;
        }
    }
}

module.exports = new VNCService();

