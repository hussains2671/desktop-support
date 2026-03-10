const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');

// Agent registration (public, but requires company_id in body)
router.post('/register', agentController.register);

// Agent operations (require agent key in header)
router.post('/heartbeat', agentController.heartbeat);
router.post('/inventory', agentController.uploadInventory);
router.post('/event-logs', agentController.uploadEventLogs);
router.post('/performance', agentController.uploadPerformance);

// Version management endpoints (public for agents)
router.get('/versions/latest', agentController.getLatestVersion);
router.get('/versions/:version/download', agentController.downloadAgentVersion);
router.post('/versions/report', agentController.reportVersion);

// Download installer files (require authentication)
const { authenticate } = require('../middleware/auth');
router.get('/download/:type', authenticate, agentController.downloadInstaller);
router.get('/script', agentController.downloadAgentScript);

// Agent management routes (require authentication)
router.get('/', authenticate, agentController.getAllAgents);
router.get('/:id', authenticate, agentController.getAgent);
router.put('/:id', authenticate, agentController.updateAgent);
router.delete('/:id', authenticate, agentController.deleteAgent);
router.post('/:id/revoke', authenticate, agentController.revokeAgentKey);
router.post('/:id/rotate-key', authenticate, agentController.rotateAgentKey);

module.exports = router;

