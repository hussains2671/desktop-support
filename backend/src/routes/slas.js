const express = require('express');
const slaController = require('../controllers/slaController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// SLA Management endpoints
router.get('/', slaController.getSLAs);
router.post('/', slaController.createSLA);
router.get('/:id', slaController.getSLA);
router.put('/:id', slaController.updateSLA);
router.delete('/:id', slaController.deleteSLA);

// SLA breach endpoints
router.get('/breaches/list', slaController.getSLABreaches);

// Ticket SLA status
router.get('/ticket/:ticketId/status', slaController.getTicketSLAStatus);
router.get('/ticket/:ticketId/breaches', slaController.checkTicketBreaches);

// Reports and metrics
router.get('/metrics/current', slaController.getSLAMetrics);
router.get('/reports/compliance', slaController.getComplianceReport);

module.exports = router;
