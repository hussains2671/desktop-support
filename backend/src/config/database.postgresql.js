const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST || 'db',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            // Production: Increase max based on load (20-50 recommended)
            max: parseInt(process.env.DB_POOL_MAX) || (process.env.NODE_ENV === 'production' ? 20 : 10),
            min: parseInt(process.env.DB_POOL_MIN) || 2,
            acquire: 30000,
            idle: 10000,
            // Connection leak detection
            evict: 1000
        },
        dialectOptions: {
            // PostgreSQL specific options
            ssl: process.env.NODE_ENV === 'production' ? {
                require: true,
                // SECURITY: Set to true in production with proper certificates
                rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
            } : false,
            // Connection timeout
            connectTimeout: 10000
        },
        // PostgreSQL timezone
        timezone: '+00:00',
        // Use snake_case for database columns
        define: {
            underscored: true
        }
    }
);

// Test connection with retry logic
const connectWithRetry = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.authenticate();
            console.log('✅ PostgreSQL connection established successfully.');
            return;
        } catch (err) {
            console.error(`❌ Unable to connect to PostgreSQL database (attempt ${i + 1}/${retries}):`, err.message);
            if (i < retries - 1) {
                console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('💥 Failed to connect to database after all retries. Exiting...');
                process.exit(1);
            }
        }
    }
};

// Connect on startup
if (process.env.NODE_ENV !== 'test') {
    connectWithRetry();
}

module.exports = sequelize;

