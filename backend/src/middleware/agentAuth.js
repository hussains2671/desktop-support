const { Agent } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate agent using X-Agent-Key header
 * Attaches agent and company_id to request object
 */
const authenticateAgent = async (req, res, next) => {
    try {
        const agentKey = req.headers['x-agent-key'];

        if (!agentKey) {
            return res.status(401).json({
                success: false,
                message: 'Agent key required'
            });
        }

        const agent = await Agent.findOne({
            where: { agent_key: agentKey }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Attach agent and company_id to request
        req.agent = agent;
        req.companyId = agent.company_id;
        req.agentId = agent.id;

        next();
    } catch (error) {
        logger.error('Agent authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

module.exports = { authenticateAgent };

