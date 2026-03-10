const express = require('express');
const router = express.Router();
const remoteDesktopController = require('../controllers/remoteDesktopController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { validateSessionAccess, validateSessionActive } = require('../middleware/sessionValidation');
const rateLimit = require('express-rate-limit');

// Rate limiting for remote desktop endpoints
const remoteDesktopLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Create session (Admin, Company Admin, Technician)
router.post('/sessions',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    remoteDesktopLimiter,
    validate,
    remoteDesktopController.createSession
);

// Get session (Admin, Company Admin, Technician)
router.get('/sessions/:id',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    remoteDesktopLimiter,
    validateSessionAccess,
    remoteDesktopController.getSession
);

// Get active sessions (Admin, Company Admin, Technician)
router.get('/sessions',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    remoteDesktopLimiter,
    remoteDesktopController.getActiveSessions
);

// End session (Admin, Company Admin, Technician)
router.post('/sessions/:id/end',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    remoteDesktopLimiter,
    validateSessionAccess,
    validateSessionActive,
    remoteDesktopController.endSession
);

// Get session history (Admin, Company Admin, Technician)
router.get('/sessions/history',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    remoteDesktopLimiter,
    remoteDesktopController.getSessionHistory
);

// Refresh session (Admin, Company Admin, Technician)
router.post('/sessions/:id/refresh',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    remoteDesktopLimiter,
    validateSessionAccess,
    validateSessionActive,
    remoteDesktopController.refreshSession
);

module.exports = router;

