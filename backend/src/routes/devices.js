const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticate } = require('../middleware/auth');
const { checkFeature } = require('../middleware/featureCheck');
const { cache } = require('../middleware/cache');

router.use(authenticate);

// Cache device list for 1 minute (60 seconds) - devices can change frequently
router.get('/', cache(60, 'devices'), deviceController.getAllDevices);
// Cache individual device details for 2 minutes (120 seconds)
router.get('/:id', cache(120, 'devices'), deviceController.getDevice);
// Cache hardware/software for 3 minutes (180 seconds) - changes less frequently
router.get('/:id/hardware', cache(180, 'devices'), deviceController.getDeviceHardware);
router.get('/:id/software', cache(180, 'devices'), deviceController.getDeviceSoftware);
// Cache event logs for 1 minute (60 seconds)
router.get('/:id/event-logs', checkFeature('event_logs'), cache(60, 'devices'), deviceController.getDeviceEventLogs);
// Cache performance metrics for 1 minute (60 seconds) - real-time data
router.get('/:id/performance', checkFeature('performance_monitoring'), cache(60, 'devices'), deviceController.getDevicePerformance);

module.exports = router;

