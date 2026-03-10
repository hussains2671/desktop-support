const redisClient = require('../utils/redisClient');
const crypto = require('crypto');

/**
 * Generate cache key from request
 */
const generateCacheKey = (req, prefix = 'cache') => {
    const { path, query, companyId, user } = req;
    const queryString = JSON.stringify(query);
    const companyIdStr = companyId || user?.company_id || 'global';
    
    // Create hash of query string to keep key short
    const queryHash = crypto
        .createHash('md5')
        .update(queryString)
        .digest('hex')
        .substring(0, 8);
    
    return `${prefix}:${companyIdStr}:${path}:${queryHash}`;
};

/**
 * Cache middleware
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @param {string} prefix - Cache key prefix (default: 'cache')
 * @param {function} keyGenerator - Custom key generator function (optional)
 */
const cache = (ttl = 300, prefix = 'cache', keyGenerator = null) => {
    return async (req, res, next) => {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Skip caching if Redis is not available
        if (!redisClient.isRedisConnected()) {
            return next();
        }

        // Generate cache key
        const cacheKey = keyGenerator 
            ? keyGenerator(req) 
            : generateCacheKey(req, prefix);

        try {
            // Try to get from cache
            const cached = await redisClient.get(cacheKey);
            
            if (cached !== null) {
                // Cache hit - return cached response
                res.setHeader('X-Cache', 'HIT');
                return res.json(cached);
            }

            // Cache miss - store original json method
            const originalJson = res.json.bind(res);
            
            // Override res.json to cache the response
            res.json = function(data) {
                // Cache the response
                redisClient.set(cacheKey, data, ttl).catch(err => {
                    console.error('Cache set error:', err);
                });
                
                res.setHeader('X-Cache', 'MISS');
                return originalJson(data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            // On error, continue without caching
            next();
        }
    };
};

/**
 * Invalidate cache by pattern
 */
const invalidateCache = async (pattern) => {
    return await redisClient.delPattern(pattern);
};

/**
 * Invalidate cache for specific company
 */
const invalidateCompanyCache = async (companyId) => {
    return await redisClient.delPattern(`cache:${companyId}:*`);
};

/**
 * Invalidate cache for specific endpoint
 */
const invalidateEndpointCache = async (companyId, endpoint) => {
    return await redisClient.delPattern(`cache:${companyId}:${endpoint}:*`);
};

module.exports = {
    cache,
    invalidateCache,
    invalidateCompanyCache,
    invalidateEndpointCache,
    generateCacheKey
};

