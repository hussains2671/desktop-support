const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

// All alert routes require authentication
router.use(authenticate);

// Get alerts (with pagination and filters)
// Cache alerts list for 1 minute (60 seconds) - alerts change frequently
router.get('/', cache(60, 'alerts'), alertController.getAlerts);

// Get alert statistics
// Cache stats for 5 minutes (300 seconds)
router.get('/stats', cache(300, 'alerts'), alertController.getAlertStats);

// Get single alert
router.get('/:id', alertController.getAlert);

// Acknowledge alert
router.post('/:id/acknowledge', alertController.acknowledgeAlert);

// Resolve alert
router.post('/:id/resolve', alertController.resolveAlert);

module.exports = router;

