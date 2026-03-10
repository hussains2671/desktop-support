const express = require('express');
const router = express.Router();
const commandController = require('../controllers/commandController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { authenticateAgent } = require('../middleware/agentAuth');
const { validate } = require('../middleware/validation');
const {
    validateCreateCommand,
    validateUpdateCommandStatus,
    validateCancelCommand,
    validateGetCommandHistory
} = require('../middleware/commandValidation');
const rateLimit = require('express-rate-limit');

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Rate limiting for agent endpoints (higher limit for polling)
const agentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs (for polling)
    message: 'Too many requests from this IP, please try again later.'
});

// Create command (Admin only)
router.post('/',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    adminLimiter,
    validateCreateCommand,
    validate,
    commandController.createCommand
);

// Get pending commands (Agent only)
router.get('/pending',
    authenticateAgent,
    agentLimiter,
    commandController.getPendingCommands
);

// Update command status (Agent only)
router.post('/:id/status',
    authenticateAgent,
    agentLimiter,
    validateUpdateCommandStatus,
    validate,
    commandController.updateCommandStatus
);

// Get command history (Admin only)
router.get('/history',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    adminLimiter,
    validateGetCommandHistory,
    validate,
    commandController.getCommandHistory
);

// Cancel command (Admin only)
router.post('/:id/cancel',
    authenticate,
    authorize('admin', 'company_admin'),
    adminLimiter,
    validateCancelCommand,
    validate,
    commandController.cancelCommand
);

module.exports = router;

