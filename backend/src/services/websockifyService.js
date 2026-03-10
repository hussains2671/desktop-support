const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const logger = require('../utils/logger');
const { RemoteSession } = require('../models');
const vncService = require('./vncService');
const config = require('../config/config');

/**
 * WebSocket Proxy Service for VNC Connections
 * Bridges VNC protocol to WebSocket for noVNC client
 */
class WebSocketProxyService {
    constructor() {
        this.wss = null;
        this.activeConnections = new Map(); // sessionId -> WebSocket
    }

    /**
     * Initialize WebSocket server
     */
    initialize(server) {
        try {
            // Create WebSocket server attached to HTTP server
            this.wss = new WebSocket.Server({
                server: server,
                path: '/websockify',
                verifyClient: (info) => {
                    // Verify client connection with token
                    return this.verifyConnection(info);
                }
            });

            this.wss.on('connection', (ws, req) => {
                this.handleConnection(ws, req);
            });

            logger.info('WebSocket proxy server initialized on /websockify');
        } catch (error) {
            logger.error('Failed to initialize WebSocket server:', error);
            throw error;
        }
    }

    /**
     * Verify WebSocket connection
     */
    async verifyConnection(info) {
        try {
            const parsedUrl = url.parse(info.req.url, true);
            const token = parsedUrl.query.token;
            const sessionId = parsedUrl.query.session;

            if (!token || !sessionId) {
                logger.warn('WebSocket connection rejected: missing token or session');
                return false;
            }

            // Find session
            const session = await RemoteSession.findOne({
                where: {
                    id: parseInt(sessionId),
                    status: 'active'
                }
            });

            if (!session) {
                logger.warn(`WebSocket connection rejected: session ${sessionId} not found or inactive`);
                return false;
            }

            // Verify token (stored in session metadata or regenerate)
            // For now, we'll accept if session exists and is active
            // In production, implement proper token validation
            return true;
        } catch (error) {
            logger.error('Error verifying WebSocket connection:', error);
            return false;
        }
    }

    /**
     * Handle new WebSocket connection
     */
    async handleConnection(ws, req) {
        try {
            const parsedUrl = url.parse(req.url, true);
            const sessionId = parseInt(parsedUrl.query.session);
            const token = parsedUrl.query.token;

            logger.info(`WebSocket connection established for session ${sessionId}`);

            // Find session
            const session = await RemoteSession.findOne({
                where: {
                    id: sessionId,
                    status: 'active'
                }
            });

            if (!session) {
                logger.warn(`Session ${sessionId} not found, closing connection`);
                ws.close(1008, 'Session not found');
                return;
            }

            // Store connection
            this.activeConnections.set(sessionId, ws);

            // Get VNC server connection details
            const vncHost = 'localhost'; // VNC server is on the agent machine
            const vncPort = session.vnc_port;

            // Create TCP connection to VNC server
            // Note: In a real implementation, you would need to:
            // 1. Connect to the agent's VNC server (requires network access)
            // 2. Bridge the WebSocket to TCP connection
            // 3. Handle VNC protocol handshake

            // For now, we'll set up the connection structure
            // Actual VNC bridging requires additional setup

            ws.on('message', (data) => {
                this.handleWebSocketMessage(ws, sessionId, data);
            });

            ws.on('close', () => {
                logger.info(`WebSocket connection closed for session ${sessionId}`);
                this.activeConnections.delete(sessionId);
            });

            ws.on('error', (error) => {
                logger.error(`WebSocket error for session ${sessionId}:`, error);
                this.activeConnections.delete(sessionId);
            });

            // Send connection ready message
            ws.send(JSON.stringify({
                type: 'connected',
                sessionId: sessionId
            }));

        } catch (error) {
            logger.error('Error handling WebSocket connection:', error);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1011, 'Internal server error');
            }
        }
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(ws, sessionId, data) {
        try {
            // Forward message to VNC server
            // In a real implementation, this would:
            // 1. Parse VNC protocol messages
            // 2. Forward to TCP connection to VNC server
            // 3. Handle responses

            // For now, log the message
            logger.debug(`WebSocket message received for session ${sessionId}, size: ${data.length}`);

            // Echo back for testing (remove in production)
            // In production, this would forward to VNC server
            // ws.send(data);
        } catch (error) {
            logger.error('Error handling WebSocket message:', error);
        }
    }

    /**
     * Close connection for a session
     */
    closeSession(sessionId) {
        const ws = this.activeConnections.get(sessionId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Session ended');
            this.activeConnections.delete(sessionId);
            logger.info(`Closed WebSocket connection for session ${sessionId}`);
        }
    }

    /**
     * Get active connections count
     */
    getActiveConnectionsCount() {
        return this.activeConnections.size;
    }
}

// Export singleton instance
module.exports = new WebSocketProxyService();



