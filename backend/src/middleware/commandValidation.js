const { body, param, query } = require('express-validator');

// Allowed command types
const ALLOWED_COMMAND_TYPES = ['chkdsk', 'sfc', 'diskpart', 'powershell', 'cmd', 'custom'];

// Command type whitelist validator
const isValidCommandType = (value) => {
    if (!ALLOWED_COMMAND_TYPES.includes(value)) {
        throw new Error(`Command type must be one of: ${ALLOWED_COMMAND_TYPES.join(', ')}`);
    }
    return true;
};

// Command text sanitization - remove dangerous patterns
const sanitizeCommandText = (value) => {
    if (typeof value !== 'string') {
        return value;
    }
    
    // Remove potentially dangerous patterns (basic sanitization)
    // Note: More comprehensive validation should be done in controller
    const dangerousPatterns = [
        /rm\s+-rf/i,
        /format\s+[a-z]:/i,
        /del\s+\/f\s+\/s\s+\/q\s+c:\\windows/i,
        /shutdown\s+\/s/i,
        /restart\s+\/r/i
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
            throw new Error('Command contains potentially dangerous patterns');
        }
    }
    
    return value.trim();
};

// Validation rules for creating a command
const validateCreateCommand = [
    body('agent_id')
        .isInt({ min: 1 })
        .withMessage('Agent ID must be a positive integer'),
    
    body('command_type')
        .notEmpty()
        .withMessage('Command type is required')
        .custom(isValidCommandType),
    
    body('command_text')
        .notEmpty()
        .withMessage('Command text is required')
        .isLength({ min: 1, max: 10000 })
        .withMessage('Command text must be between 1 and 10000 characters')
        .custom(sanitizeCommandText),
    
    body('parameters')
        .optional()
        .isObject()
        .withMessage('Parameters must be an object'),
    
    body('priority')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Priority must be between 1 and 10')
];

// Validation rules for updating command status
const validateUpdateCommandStatus = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Command ID must be a positive integer'),
    
    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['running', 'completed', 'failed'])
        .withMessage('Status must be one of: running, completed, failed'),
    
    body('result_output')
        .optional()
        .isString()
        .isLength({ max: 1048576 }) // 1MB max
        .withMessage('Output must be less than 1MB'),
    
    body('result_error')
        .optional()
        .isString()
        .isLength({ max: 1048576 }) // 1MB max
        .withMessage('Error must be less than 1MB'),
    
    body('exit_code')
        .optional()
        .isInt()
        .withMessage('Exit code must be an integer'),
    
    body('execution_time_ms')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Execution time must be a non-negative integer')
];

// Validation rules for canceling a command
const validateCancelCommand = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Command ID must be a positive integer')
];

// Validation rules for getting command history
const validateGetCommandHistory = [
    query('agent_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Agent ID must be a positive integer'),
    
    query('status')
        .optional()
        .isIn(['pending', 'running', 'completed', 'failed', 'cancelled'])
        .withMessage('Invalid status'),
    
    query('start_date')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    
    query('end_date')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
    
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
];

module.exports = {
    validateCreateCommand,
    validateUpdateCommandStatus,
    validateCancelCommand,
    validateGetCommandHistory,
    ALLOWED_COMMAND_TYPES
};

