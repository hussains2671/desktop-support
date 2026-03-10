const db = require('../models');
const SLAService = require('../services/slaService');
const { v4: uuidv4 } = require('uuid');

// Get all SLAs with caching
exports.getSLAs = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { page = 1, limit = 10, is_active } = req.query;

    const where = { company_id: companyId };
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const { count, rows } = await db.SLA.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
        },
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        current: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching SLAs:', error);
    res
      .status(500)
      .json({ message: 'Error fetching SLAs', error: error.message });
  }
};

// Get single SLA
exports.getSLA = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const sla = await db.SLA.findOne({
      where: { id, company_id: companyId },
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });

    if (!sla) {
      return res.status(404).json({ message: 'SLA not found' });
    }

    res.json(sla);
  } catch (error) {
    console.error('Error fetching SLA:', error);
    res
      .status(500)
      .json({ message: 'Error fetching SLA', error: error.message });
  }
};

// Create SLA
exports.createSLA = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const {
      name,
      description,
      priority_level,
      first_response_hours,
      resolution_hours,
    } = req.body;

    // Validation
    if (!name || !first_response_hours || !resolution_hours) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const sla = await db.SLA.create({
      id: uuidv4(),
      company_id: companyId,
      name,
      description,
      priority_level,
      first_response_hours,
      resolution_hours,
      created_by: req.user.id,
    });

    res.status(201).json(sla);
  } catch (error) {
    console.error('Error creating SLA:', error);
    res
      .status(500)
      .json({ message: 'Error creating SLA', error: error.message });
  }
};

// Update SLA
exports.updateSLA = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const {
      name,
      description,
      priority_level,
      first_response_hours,
      resolution_hours,
      is_active,
    } = req.body;

    const sla = await db.SLA.findOne({
      where: { id, company_id: companyId },
    });

    if (!sla) {
      return res.status(404).json({ message: 'SLA not found' });
    }

    await sla.update({
      name: name || sla.name,
      description: description !== undefined ? description : sla.description,
      priority_level: priority_level || sla.priority_level,
      first_response_hours: first_response_hours || sla.first_response_hours,
      resolution_hours: resolution_hours || sla.resolution_hours,
      is_active: is_active !== undefined ? is_active : sla.is_active,
    });

    res.json(sla);
  } catch (error) {
    console.error('Error updating SLA:', error);
    res
      .status(500)
      .json({ message: 'Error updating SLA', error: error.message });
  }
};

// Delete SLA
exports.deleteSLA = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const sla = await db.SLA.findOne({
      where: { id, company_id: companyId },
    });

    if (!sla) {
      return res.status(404).json({ message: 'SLA not found' });
    }

    await sla.destroy();
    res.json({ message: 'SLA deleted successfully' });
  } catch (error) {
    console.error('Error deleting SLA:', error);
    res
      .status(500)
      .json({ message: 'Error deleting SLA', error: error.message });
  }
};

// Get SLA breaches
exports.getSLABreaches = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { page = 1, limit = 10, resolved } = req.query;

    const where = {};
    if (resolved !== undefined) {
      where.resolved = resolved === 'true';
    }

    const { count, rows } = await db.SLABreach.findAndCountAll({
      where,
      include: [
        {
          model: db.Ticket,
          attributes: ['id', 'ticket_number', 'title', 'priority'],
          where: { company_id: companyId },
        },
        {
          model: db.SLA,
          attributes: ['id', 'name'],
        },
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['breach_at', 'DESC']],
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        current: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching SLA breaches:', error);
    res
      .status(500)
      .json({ message: 'Error fetching breaches', error: error.message });
  }
};

// Get ticket SLA status
exports.getTicketSLAStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await db.Ticket.findByPk(ticketId);

    if (!ticket || ticket.company_id !== req.user.company_id) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const status = await SLAService.getTicketSLAStatus(ticketId);
    res.json(status);
  } catch (error) {
    console.error('Error getting SLA status:', error);
    res
      .status(500)
      .json({ message: 'Error getting status', error: error.message });
  }
};

// Get SLA metrics
exports.getSLAMetrics = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { start_date, end_date } = req.query;

    const startDate = new Date(
      start_date || new Date().setDate(new Date().getDate() - 30)
    );
    const endDate = new Date(end_date || new Date());

    const metrics = await SLAService.calculateMetrics(
      companyId,
      startDate,
      endDate
    );
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res
      .status(500)
      .json({ message: 'Error fetching metrics', error: error.message });
  }
};

// Get compliance report
exports.getComplianceReport = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { start_date, end_date } = req.query;

    const startDate = new Date(
      start_date || new Date().setDate(new Date().getDate() - 30)
    );
    const endDate = new Date(end_date || new Date());

    const report = await SLAService.generateComplianceReport(
      companyId,
      startDate,
      endDate
    );
    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res
      .status(500)
      .json({ message: 'Error generating report', error: error.message });
  }
};

// Check ticket for breaches
exports.checkTicketBreaches = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await db.Ticket.findByPk(ticketId);

    if (!ticket || ticket.company_id !== req.user.company_id) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const breaches = await SLAService.checkForBreaches(ticketId);
    res.json({ breaches: breaches || [] });
  } catch (error) {
    console.error('Error checking breaches:', error);
    res
      .status(500)
      .json({ message: 'Error checking breaches', error: error.message });
  }
};
