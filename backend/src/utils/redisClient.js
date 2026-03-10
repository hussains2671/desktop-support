const { createClient } = require('redis');
const config = require('../config/config');
const logger = require('./logger');

let client = null;
let isConnected = false;

/**
 * Initialize Redis client
 */
const initRedis = async () => {
    if (!config.redis.enable) {
        logger.info('Redis caching is disabled');
        return null;
    }

    try {
        client = createClient({
            socket: {
                host: config.redis.host,
                port: config.redis.port,
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger.error('Redis reconnection failed after 10 attempts');
                        return new Error('Redis connection failed');
                    }
                    return Math.min(retries * 100, 3000);
                }
            },
            password: config.redis.password
        });

        client.on('error', (err) => {
            logger.error('Redis Client Error:', err);
            isConnected = false;
        });

        client.on('connect', () => {
            logger.info('Redis client connecting...');
        });

        client.on('ready', () => {
            logger.info('Redis client ready');
            isConnected = true;
        });

        client.on('end', () => {
            logger.warn('Redis connection ended');
            isConnected = false;
        });

        // Add connection timeout to prevent blocking server startup
        const connectPromise = client.connect();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Redis connection timeout')), 5000); // 5 second timeout
        });

        try {
            await Promise.race([connectPromise, timeoutPromise]);
            return client;
        } catch (error) {
            // If connection fails or times out, log but don't throw - server can run without Redis
            logger.warn('Redis connection failed or timed out, continuing without cache:', error.message);
            isConnected = false;
            // Don't close the client here, let it retry in the background
            return null;
        }
    } catch (error) {
        logger.error('Failed to initialize Redis:', error);
        isConnected = false;
        return null;
    }
};

/**
 * Get Redis client instance
 */
const getClient = () => {
    return client;
};

/**
 * Check if Redis is connected
 */
const isRedisConnected = () => {
    return isConnected && client !== null;
};

/**
 * Get cached value
 */
const get = async (key) => {
    if (!isRedisConnected()) {
        return null;
    }

    try {
        const value = await client.get(key);
        if (value) {
            return JSON.parse(value);
        }
        return null;
    } catch (error) {
        logger.error(`Redis GET error for key ${key}:`, error);
        return null;
    }
};

/**
 * Set cached value with expiration
 */
const set = async (key, value, expirationSeconds = 300) => {
    if (!isRedisConnected()) {
        return false;
    }

    try {
        const serialized = JSON.stringify(value);
        await client.setEx(key, expirationSeconds, serialized);
        return true;
    } catch (error) {
        logger.error(`Redis SET error for key ${key}:`, error);
        return false;
    }
};

/**
 * Delete cached value
 */
const del = async (key) => {
    if (!isRedisConnected()) {
        return false;
    }

    try {
        await client.del(key);
        return true;
    } catch (error) {
        logger.error(`Redis DEL error for key ${key}:`, error);
        return false;
    }
};

/**
 * Delete multiple keys by pattern
 */
const delPattern = async (pattern) => {
    if (!isRedisConnected()) {
        return false;
    }

    try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
        }
        return true;
    } catch (error) {
        logger.error(`Redis DEL pattern error for ${pattern}:`, error);
        return false;
    }
};

/**
 * Clear all cache (use with caution)
 */
const flushAll = async () => {
    if (!isRedisConnected()) {
        return false;
    }

    try {
        await client.flushAll();
        return true;
    } catch (error) {
        logger.error('Redis FLUSHALL error:', error);
        return false;
    }
};

/**
 * Close Redis connection
 */
const close = async () => {
    if (client) {
        try {
            await client.quit();
            isConnected = false;
            logger.info('Redis connection closed');
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
        }
    }
};

module.exports = {
    initRedis,
    getClient,
    isRedisConnected,
    get,
    set,
    del,
    delPattern,
    flushAll,
    close
};

