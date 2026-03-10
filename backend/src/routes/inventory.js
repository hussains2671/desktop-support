const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

// All inventory routes require authentication
router.use(authenticate);

// Company-wide inventory routes
// Cache stats for 5 minutes (300 seconds)
router.get('/stats', cache(300, 'inventory'), inventoryController.getInventoryStats);
// Cache hardware/software lists for 2 minutes (120 seconds) - they change less frequently
router.get('/hardware', cache(120, 'inventory'), inventoryController.getHardwareInventory);
router.get('/software', cache(120, 'inventory'), inventoryController.getSoftwareInventory);
router.get('/', inventoryController.getCompanyInventory);

module.exports = router;

