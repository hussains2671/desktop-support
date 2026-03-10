const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticate } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

// All reports routes require authentication
router.use(authenticate);

// Report endpoints
// Cache reports for 5 minutes (300 seconds) - reports are generated data
router.get('/devices', cache(300, 'reports'), reportsController.getDeviceReport);
router.get('/performance', cache(300, 'reports'), reportsController.getPerformanceReport);
router.get('/inventory', cache(300, 'reports'), reportsController.getInventoryReport);
router.post('/generate', reportsController.generateReport);
router.get('/export', reportsController.exportReports);

module.exports = router;

