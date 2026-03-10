const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../config/config');

class WebSocketService {
    constructor(server) {
        this.wss = new WebSocket.Server({ server, path: '/ws' });
        this.connections = new Map();
        this.setupHandlers();
        logger.info('WebSocket service initialized');
    }

    setupHandlers() {
        this.wss.on('connection', (ws, req) => {
            logger.info('WebSocket client connected');

            ws.isAlive = true;
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(ws, message);
                } catch (error) {
                    logger.error('WebSocket message parsing error:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });

            ws.on('close', () => {
                logger.info('WebSocket client disconnected');
                this.connections.delete(ws);
            });

            ws.on('error', (error) => {
                logger.error('WebSocket error:', error);
            });
        });

        // Health check
        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }

    handleMessage(ws, message) {
        const { type, token, sessionId, data } = message;

        switch (type) {
            case 'auth':
                this.handleAuth(ws, token);
                break;

            case 'vnc-session':
                this.handleVncSession(ws, sessionId, data);
                break;

            case 'ticket-update':
                this.broadcastTicketUpdate(data);
                break;

            case 'comment-added':
                this.broadcastCommentAdded(data);
                break;

            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;

            default:
                logger.warn(`Unknown message type: ${type}`);
        }
    }

    handleAuth(ws, token) {
        try {
            const decoded = jwt.verify(token, config.jwt?.secret || process.env.JWT_SECRET);
            ws.userId = decoded.id;
            ws.companyId = decoded.company_id;
            ws.userEmail = decoded.email;
            
            this.connections.set(ws, {
                userId: decoded.id,
                companyId: decoded.company_id,
                email: decoded.email,
                connectedAt: new Date()
            });

            ws.send(JSON.stringify({
                type: 'auth-success',
                message: 'Authenticated',
                userId: decoded.id,
                companyId: decoded.company_id
            }));

            logger.info(`User ${decoded.id} authenticated via WebSocket`);
        } catch (error) {
            logger.error('WebSocket auth error:', error);
            ws.send(JSON.stringify({
                type: 'auth-error',
                message: 'Authentication failed'
            }));
            ws.close(1008, 'Authentication failed');
        }
    }

    handleVncSession(ws, sessionId, data) {
        try {
            // Forward VNC data to appropriate handler
            // In production, this would proxy to actual VNC server
            logger.info(`VNC session ${sessionId} data received (${data.length} bytes)`);
            
            // You can forward this to a VNC proxy/websockify if needed
            // For now, just acknowledge
            ws.send(JSON.stringify({
                type: 'vnc-ack',
                sessionId: sessionId
            }));
        } catch (error) {
            logger.error('VNC session error:', error);
        }
    }

    broadcastTicketUpdate(data) {
        const { companyId, ticketId, update } = data;
        
        this.connections.forEach((conn, ws) => {
            if (conn.companyId === companyId && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'ticket-updated',
                    ticketId,
                    data: update,
                    timestamp: new Date()
                }));
            }
        });
    }

    broadcastCommentAdded(data) {
        const { companyId, ticketId, comment } = data;
        
        this.connections.forEach((conn, ws) => {
            if (conn.companyId === companyId && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'comment-added',
                    ticketId,
                    data: comment,
                    timestamp: new Date()
                }));
            }
        });
    }

    broadcast(message, filter = null) {
        this.connections.forEach((conn, ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                if (!filter || filter(conn)) {
                    ws.send(JSON.stringify(message));
                }
            }
        });
    }

    broadcastToCompany(companyId, message) {
        this.broadcast(message, (conn) => conn.companyId === companyId);
    }

    broadcastToUser(userId, message) {
        this.broadcast(message, (conn) => conn.userId === userId);
    }

    getConnectedUsers() {
        const users = [];
        this.connections.forEach((conn) => {
            users.push({
                userId: conn.userId,
                companyId: conn.companyId,
                connectedAt: conn.connectedAt
            });
        });
        return users;
    }

    getConnectionCount() {
        return this.connections.size;
    }
}

module.exports = WebSocketService;
