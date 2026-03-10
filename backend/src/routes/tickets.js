const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

// All ticket routes require authentication
router.use(authenticate);

// Get all tickets (with pagination, filtering, and search)
// Cache tickets list for 2 minutes (120 seconds)
router.get('/', cache(120, 'tickets'), ticketController.getTickets);

// Get ticket statistics
// Cache stats for 5 minutes (300 seconds)
router.get('/stats', cache(300, 'tickets'), ticketController.getTicketStats);

// Create new ticket
router.post('/', ticketController.createTicket);

// Get single ticket with comments and history
router.get('/:id', ticketController.getTicket);

// Update ticket
router.put('/:id', ticketController.updateTicket);

// Delete ticket
router.delete('/:id', ticketController.deleteTicket);

// Add comment to ticket
router.post('/:id/comments', ticketController.addComment);

// Delete comment from ticket
router.delete('/:ticketId/comments/:commentId', ticketController.deleteComment);

module.exports = router;
