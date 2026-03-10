const express = require('express');
const router = express.Router();
const eventLogsController = require('../controllers/eventLogsController');
const { authenticate } = require('../middleware/auth');
const { checkFeature } = require('../middleware/featureCheck');
const { cache } = require('../middleware/cache');

// All event logs routes require authentication
router.use(authenticate);

// Company-wide event logs routes
// Cache stats for 5 minutes (300 seconds)
router.get('/stats', checkFeature('event_logs'), cache(300, 'eventlogs'), eventLogsController.getEventLogStats);
// Cache event logs list for 1 minute (60 seconds) - they change frequently
router.get('/', checkFeature('event_logs'), cache(60, 'eventlogs'), eventLogsController.getCompanyEventLogs);
router.get('/export', checkFeature('event_logs'), eventLogsController.exportEventLogs);

module.exports = router;

