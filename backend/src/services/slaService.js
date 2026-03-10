const db = require('../models');
const { Op } = require('sequelize');

class SLAService {
  // Check if ticket has breached SLA
  static async checkForBreaches(ticketId) {
    try {
      const ticket = await db.Ticket.findByPk(ticketId);
      if (!ticket) throw new Error('Ticket not found');

      const sla = await db.SLA.findOne({
        where: {
          company_id: ticket.company_id,
          is_active: true,
          ...(ticket.priority && { priority_level: ticket.priority }),
        },
      });

      if (!sla) return null;

      const now = new Date();
      const breaches = [];

      // Check first_response breach
      const createdTime = new Date(ticket.created_at);
      const firstResponseDeadline = new Date(
        createdTime.getTime() + sla.first_response_hours * 60 * 60 * 1000
      );

      const firstResponse = await db.TicketComment.findOne({
        where: { ticket_id: ticketId },
        order: [['created_at', 'ASC']],
      });

      if (!firstResponse && now > firstResponseDeadline) {
        const minutesOver = Math.floor((now - firstResponseDeadline) / (1000 * 60));
        breaches.push({
          breach_type: 'first_response',
          target_time: firstResponseDeadline,
          minutes_over: minutesOver,
        });
      }

      // Check resolution breach
      if (ticket.status !== 'closed') {
        const resolutionDeadline = new Date(
          createdTime.getTime() + sla.resolution_hours * 60 * 60 * 1000
        );
        if (now > resolutionDeadline) {
          const minutesOver = Math.floor((now - resolutionDeadline) / (1000 * 60));
          breaches.push({
            breach_type: 'resolution',
            target_time: resolutionDeadline,
            minutes_over: minutesOver,
          });
        }
      }

      // Create breach records
      for (const breach of breaches) {
        await db.SLABreach.findOrCreate({
          where: {
            ticket_id: ticketId,
            sla_id: sla.id,
            breach_type: breach.breach_type,
          },
          defaults: {
            ticket_id: ticketId,
            sla_id: sla.id,
            ...breach,
            breach_at: now,
          },
        });
      }

      return breaches.length > 0 ? breaches : null;
    } catch (error) {
      console.error('Error checking breaches:', error);
      throw error;
    }
  }

  // Get SLA status for ticket
  static async getTicketSLAStatus(ticketId) {
    try {
      const ticket = await db.Ticket.findByPk(ticketId);
      if (!ticket) throw new Error('Ticket not found');

      const sla = await db.SLA.findOne({
        where: {
          company_id: ticket.company_id,
          is_active: true,
          ...(ticket.priority && { priority_level: ticket.priority }),
        },
      });

      if (!sla) {
        return { status: 'no_sla', sla: null };
      }

      const createdTime = new Date(ticket.created_at);
      const firstResponseDeadline = new Date(
        createdTime.getTime() + sla.first_response_hours * 60 * 60 * 1000
      );
      const resolutionDeadline = new Date(
        createdTime.getTime() + sla.resolution_hours * 60 * 60 * 1000
      );

      const now = new Date();
      let status = 'compliant';
      let breachInfo = null;

      // Get first response time
      const firstResponse = await db.TicketComment.findOne({
        where: { ticket_id: ticketId },
        order: [['created_at', 'ASC']],
      });

      if (firstResponse) {
        const responseTime = new Date(firstResponse.created_at);
        if (responseTime > firstResponseDeadline) {
          status = 'breached';
          breachInfo = {
            type: 'first_response',
            deadline: firstResponseDeadline,
            actual: responseTime,
            minutes_over: Math.floor(
              (responseTime - firstResponseDeadline) / (1000 * 60)
            ),
          };
        }
      } else if (now > firstResponseDeadline) {
        status = 'at_risk';
      }

      // Check resolution
      if (ticket.status === 'closed') {
        const resolvedAt = new Date(ticket.updated_at);
        if (resolvedAt > resolutionDeadline) {
          status = 'breached';
          breachInfo = {
            type: 'resolution',
            deadline: resolutionDeadline,
            actual: resolvedAt,
            minutes_over: Math.floor(
              (resolvedAt - resolutionDeadline) / (1000 * 60)
            ),
          };
        }
      } else if (now > resolutionDeadline) {
        status = 'breached';
        breachInfo = {
          type: 'resolution',
          deadline: resolutionDeadline,
          actual: now,
          minutes_over: Math.floor((now - resolutionDeadline) / (1000 * 60)),
        };
      }

      return {
        status,
        sla: {
          id: sla.id,
          name: sla.name,
          first_response_hours: sla.first_response_hours,
          resolution_hours: sla.resolution_hours,
        },
        deadlines: {
          first_response: firstResponseDeadline,
          resolution: resolutionDeadline,
        },
        breachInfo,
      };
    } catch (error) {
      console.error('Error getting SLA status:', error);
      throw error;
    }
  }

  // Calculate compliance metrics
  static async calculateMetrics(companyId, startDate, endDate) {
    try {
      const tickets = await db.Ticket.findAll({
        where: {
          company_id: companyId,
          created_at: {
            [Op.between]: [startDate, endDate],
          },
        },
      });

      let compliant = 0;
      let breached = 0;

      for (const ticket of tickets) {
        const statusResult = await this.getTicketSLAStatus(ticket.id);
        if (statusResult.status === 'compliant') {
          compliant++;
        } else if (statusResult.status === 'breached') {
          breached++;
        }
      }

      const percentage = tickets.length > 0 ? (compliant / tickets.length) * 100 : 0;

      return {
        total: tickets.length,
        compliant,
        breached,
        percentage: Math.round(percentage * 100) / 100,
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      throw error;
    }
  }

  // Generate compliance report
  static async generateComplianceReport(companyId, startDate, endDate) {
    try {
      const metrics = await this.calculateMetrics(companyId, startDate, endDate);
      const breaches = await db.SLABreach.findAll({
        include: [
          {
            model: db.Ticket,
            where: { company_id: companyId },
            attributes: ['id', 'ticket_number', 'title'],
          },
          {
            model: db.SLA,
            attributes: ['id', 'name'],
          },
        ],
        where: {
          created_at: { [Op.between]: [startDate, endDate] },
        },
      });

      return {
        period: { start: startDate, end: endDate },
        metrics,
        breaches: breaches.length,
        breach_details: breaches.map(b => ({
          ticket_id: b.ticket_id,
          breach_type: b.breach_type,
          minutes_over: b.minutes_over,
          date: b.breach_at,
        })),
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
}

module.exports = SLAService;
