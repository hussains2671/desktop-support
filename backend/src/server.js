const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const sanitizeInput = require('./middleware/sanitize');
require('dotenv').config();

const config = require('./config/config');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const redisClient = require('./utils/redisClient');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const agentRoutes = require('./routes/agent');
const deviceRoutes = require('./routes/devices');
const aiRoutes = require('./routes/ai');
const alertRoutes = require('./routes/alerts');
const inventoryRoutes = require('./routes/inventory');
const eventLogsRoutes = require('./routes/eventLogs');
const reportsRoutes = require('./routes/reports');
const notificationsRoutes = require('./routes/notifications');
const commandsRoutes = require('./routes/commands');
const remoteDesktopRoutes = require('./routes/remoteDesktop');
const fileTransferRoutes = require('./routes/fileTransfer');
const ticketsRoutes = require('./routes/tickets');
const slaRoutes = require('./routes/slas');

// Swagger documentation
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Desktop Support API',
            version: '1.0.0',
            description: 'Multi-tenant Desktop Support Management System API',
            contact: {
                name: 'Aaditech Solution',
                email: 'support@aaditech.com'
            }
        },
        servers: [
            {
                url: process.env.API_BASE_URL || 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                },
                agentKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-Agent-Key'
                }
            }
        },
        security: [
            { bearerAuth: [] }
        ]
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - allow multiple origins
const allowedOrigins = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    process.env.FRONTEND_URL,
    'http://UFOMUM-AbdulA.ufomoviez.com:3001',
    'http://ufomum-abdula.ufomoviez.com:3001',
    'http://10.73.77.58:3001',
    'http://192.168.86.22:3001',
    'http://192.168.86.152:3001'
].filter(Boolean); // Remove undefined values

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Agent-Key']
}));

// Rate limiting - General API
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/event-logs', eventLogsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/commands', commandsRoutes);
app.use('/api/remote-desktop', remoteDesktopRoutes);
app.use('/api/file-transfer', fileTransferRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/slas', slaRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(status).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server
const PORT = config.port || 3000;

// Initialize database and start server
const startServer = async () => {
    try {
        // Test database connection
        await sequelize.authenticate();
        logger.info('✅ Database connection established');

        // Initialize Redis (non-blocking with timeout)
        try {
            await Promise.race([
                redisClient.initRedis(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Redis init timeout')), 6000))
            ]);
        } catch (error) {
            logger.warn('⚠️  Redis initialization timed out or failed, continuing without cache');
        }
        
        if (redisClient.isRedisConnected()) {
            logger.info('✅ Redis cache connected');
        } else {
            logger.warn('⚠️  Redis cache not available (continuing without cache)');
        }

        // Sync database (only in development)
        if (process.env.NODE_ENV === 'development') {
            // await sequelize.sync({ alter: true }); // Uncomment if needed
            logger.info('Database models loaded');
        }

        // Create HTTP server
        const server = http.createServer(app);

        // Initialize WebSocket service for real-time communication
        try {
            const WebSocketService = require('./services/websocketService');
            const wsService = new WebSocketService(server);
            global.wsService = wsService;
            logger.info('✅ WebSocket service initialized');
        } catch (error) {
            logger.warn('⚠️  WebSocket service initialization failed:', error.message);
        }

        // Initialize WebSocket proxy for VNC connections
        try {
            const websockifyService = require('./services/websockifyService');
            websockifyService.initialize(server);
            logger.info('✅ WebSocket proxy initialized');
        } catch (error) {
            logger.warn('⚠️  WebSocket proxy not available:', error.message);
            logger.warn('   Install ws package: npm install ws');
        }

        // Bind to 0.0.0.0 to accept connections from all interfaces (required for Docker)
        const HOST = process.env.HOST || '0.0.0.0';
        server.listen(PORT, HOST, () => {
            logger.info(`🚀 Server running on ${HOST}:${PORT}`);
            logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    await sequelize.close();
    await redisClient.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');
    await sequelize.close();
    await redisClient.close();
    process.exit(0);
});

module.exports = app;

