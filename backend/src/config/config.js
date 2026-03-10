require('dotenv').config();

// Detect if HTTPS is enabled
const useHttps = process.env.USE_HTTPS === 'true' || 
                 (process.env.API_BASE_URL && process.env.API_BASE_URL.startsWith('https://')) ||
                 (process.env.NODE_ENV === 'production');

// Extract protocol from API_BASE_URL or determine based on environment
const getProtocol = () => {
    if (process.env.API_BASE_URL) {
        return process.env.API_BASE_URL.startsWith('https://') ? 'https' : 'http';
    }
    return useHttps ? 'https' : 'http';
};

const protocol = getProtocol();

module.exports = {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this',
    jwtExpiry: process.env.JWT_EXPIRY || '7d',
    geminiApiKey: process.env.GEMINI_API_KEY,
    nodeEnv: process.env.NODE_ENV || 'development',
    apiBaseUrl: process.env.API_BASE_URL || `${protocol}://localhost:3000`,
    frontendUrl: process.env.FRONTEND_URL || `${protocol}://localhost:3001`,
    useHttps: useHttps,
    protocol: protocol,
    
    // Database
    db: {
        host: process.env.DB_HOST || 'db',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        dialect: process.env.DB_DIALECT || 'postgres'
    },
    
    // Redis
    redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        enable: process.env.REDIS_ENABLE !== 'false' // Enable by default
    }
};

