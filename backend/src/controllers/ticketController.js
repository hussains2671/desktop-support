const { Ticket, TicketComment, TicketHistory, User, Device, Company } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Get all tickets with filtering and pagination
exports.getTickets = async (req, res) => {
    try {
        const { limit = 20, page = 1, status, priority, assigned_to, created_by, search } = req.query;
        const companyId = req.companyId || req.user?.company_id;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const where = { company_id: companyId };

        if (status) {
            where.status = status;
        }
        if (priority) {
            where.priority = priority;
        }
        if (assigned_to) {
            where.assigned_to = assigned_to;
        }
        if (created_by) {
            where.created_by = created_by;
        }
        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
                { ticket_number: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const tickets = await Ticket.findAndCountAll({
            where,
            include: [
                {
                    model: Device,
                    as: 'Device',
                    attributes: ['id', 'hostname', 'username', 'os_version'],
                    required: false
                },
                {
                    model: User,
                    as: 'CreatedBy',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                },
                {
                    model: User,
                    as: 'AssignedTo',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: tickets.rows,
            pagination: {
                total: tickets.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(tickets.count / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Get tickets error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single ticket with comments and history
exports.getTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || req.user?.company_id;

        const ticket = await Ticket.findOne({
            where: {
                id,
                company_id: companyId
            },
            include: [
                {
                    model: Device,
                    as: 'Device',
                    attributes: ['id', 'hostname', 'username', 'os_version'],
                    required: false
                },
                {
                    model: User,
                    as: 'CreatedBy',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                },
                {
                    model: User,
                    as: 'AssignedTo',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                },
                {
                    model: TicketComment,
                    as: 'Comments',
                    include: [
                        {
                            model: User,
                            as: 'CreatedBy',
                            attributes: ['id', 'first_name', 'last_name', 'email']
                        }
                    ],
                    order: [['created_at', 'ASC']]
                },
                {
                    model: TicketHistory,
                    as: 'History',
                    include: [
                        {
                            model: User,
                            as: 'ChangedBy',
                            attributes: ['id', 'first_name', 'last_name', 'email']
                        }
                    ],
                    order: [['changed_at', 'ASC']]
                }
            ]
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            data: ticket
        });
    } catch (error) {
        logger.error('Get ticket error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create new ticket
exports.createTicket = async (req, res) => {
    try {
        const { title, description, priority, device_id, assigned_to } = req.body;
        const companyId = req.companyId || req.user?.company_id;
        const userId = req.user?.id;

        if (!companyId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID and User ID required'
            });
        }

        if (!title || !description || !priority) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, and priority are required'
            });
        }

        // Generate ticket number
        const ticketCount = await Ticket.count({ where: { company_id: companyId } });
        const ticketNumber = `TKT-${companyId}-${ticketCount + 1}`;

        const ticket = await Ticket.create({
            ticket_number: ticketNumber,
            title,
            description,
            priority,
            status: 'open',
            company_id: companyId,
            device_id: device_id || null,
            created_by: userId,
            assigned_to: assigned_to || null
        });

        // Log creation in history
        await TicketHistory.create({
            ticket_id: ticket.id,
            field_changed: 'status',
            old_value: null,
            new_value: 'open',
            changed_by: userId,
            changed_at: new Date()
        });

        // Fetch full ticket with relationships
        const fullTicket = await Ticket.findByPk(ticket.id, {
            include: [
                {
                    model: Device,
                    as: 'Device',
                    attributes: ['id', 'hostname', 'username', 'os_version'],
                    required: false
                },
                {
                    model: User,
                    as: 'CreatedBy',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                },
                {
                    model: User,
                    as: 'AssignedTo',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: fullTicket
        });
    } catch (error) {
        logger.error('Create ticket error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update ticket
exports.updateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, priority, status, assigned_to, resolution_notes } = req.body;
        const companyId = req.companyId || req.user?.company_id;
        const userId = req.user?.id;

        if (!companyId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID and User ID required'
            });
        }

        const ticket = await Ticket.findOne({
            where: {
                id,
                company_id: companyId
            }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Track changes
        const changedFields = [];
        if (title && title !== ticket.title) {
            await TicketHistory.create({
                ticket_id: id,
                field_changed: 'title',
                old_value: ticket.title,
                new_value: title,
                changed_by: userId,
                changed_at: new Date()
            });
            changedFields.push('title');
        }
        if (description && description !== ticket.description) {
            await TicketHistory.create({
                ticket_id: id,
                field_changed: 'description',
                old_value: ticket.description,
                new_value: description,
                changed_by: userId,
                changed_at: new Date()
            });
            changedFields.push('description');
        }
        if (priority && priority !== ticket.priority) {
            await TicketHistory.create({
                ticket_id: id,
                field_changed: 'priority',
                old_value: ticket.priority,
                new_value: priority,
                changed_by: userId,
                changed_at: new Date()
            });
            changedFields.push('priority');
        }
        if (status && status !== ticket.status) {
            await TicketHistory.create({
                ticket_id: id,
                field_changed: 'status',
                old_value: ticket.status,
                new_value: status,
                changed_by: userId,
                changed_at: new Date()
            });
            changedFields.push('status');
        }
        if (assigned_to !== undefined && assigned_to !== ticket.assigned_to) {
            await TicketHistory.create({
                ticket_id: id,
                field_changed: 'assigned_to',
                old_value: ticket.assigned_to,
                new_value: assigned_to,
                changed_by: userId,
                changed_at: new Date()
            });
            changedFields.push('assigned_to');
        }

        // Update ticket
        const updateData = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (priority) updateData.priority = priority;
        if (status) updateData.status = status;
        if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
        if (resolution_notes) updateData.resolution_notes = resolution_notes;

        await ticket.update(updateData);

        // Fetch updated ticket
        const updatedTicket = await Ticket.findByPk(id, {
            include: [
                {
                    model: Device,
                    as: 'Device',
                    attributes: ['id', 'hostname', 'username', 'os_version'],
                    required: false
                },
                {
                    model: User,
                    as: 'CreatedBy',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                },
                {
                    model: User,
                    as: 'AssignedTo',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                }
            ]
        });

        res.json({
            success: true,
            message: 'Ticket updated successfully',
            data: updatedTicket,
            changedFields
        });
    } catch (error) {
        logger.error('Update ticket error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete ticket
exports.deleteTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const ticket = await Ticket.findOne({
            where: {
                id,
                company_id: companyId
            }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Delete related comments and history
        await TicketComment.destroy({ where: { ticket_id: id } });
        await TicketHistory.destroy({ where: { ticket_id: id } });
        await ticket.destroy();

        res.json({
            success: true,
            message: 'Ticket deleted successfully'
        });
    } catch (error) {
        logger.error('Delete ticket error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add comment to ticket
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment_text } = req.body;
        const companyId = req.companyId || req.user?.company_id;
        const userId = req.user?.id;

        if (!companyId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID and User ID required'
            });
        }

        if (!comment_text) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        const ticket = await Ticket.findOne({
            where: {
                id,
                company_id: companyId
            }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const comment = await TicketComment.create({
            ticket_id: id,
            comment_text,
            created_by: userId
        });

        // Fetch comment with user details
        const fullComment = await TicketComment.findByPk(comment.id, {
            include: [
                {
                    model: User,
                    as: 'CreatedBy',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: fullComment
        });
    } catch (error) {
        logger.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete comment
exports.deleteComment = async (req, res) => {
    try {
        const { ticketId, commentId } = req.params;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        // Verify ticket exists and belongs to company
        const ticket = await Ticket.findOne({
            where: {
                id: ticketId,
                company_id: companyId
            }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const comment = await TicketComment.findOne({
            where: {
                id: commentId,
                ticket_id: ticketId
            }
        });

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        await comment.destroy();

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        logger.error('Delete comment error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get ticket statistics
exports.getTicketStats = async (req, res) => {
    try {
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const totalTickets = await Ticket.count({
            where: { company_id: companyId }
        });

        const openTickets = await Ticket.count({
            where: { company_id: companyId, status: 'open' }
        });

        const closedTickets = await Ticket.count({
            where: { company_id: companyId, status: 'closed' }
        });

        const inProgressTickets = await Ticket.count({
            where: { company_id: companyId, status: 'in_progress' }
        });

        const highPriorityTickets = await Ticket.count({
            where: { company_id: companyId, priority: 'high', status: { [Op.ne]: 'closed' } }
        });

        res.json({
            success: true,
            data: {
                totalTickets,
                openTickets,
                closedTickets,
                inProgressTickets,
                highPriorityTickets
            }
        });
    } catch (error) {
        logger.error('Get ticket stats error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
