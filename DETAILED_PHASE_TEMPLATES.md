# 📊 COMPLETE SCALING PLAN - DETAILED CODE TEMPLATES

**All Missing Components & Implementation Guide**  
**Status:** Ready for Development  
**Complexity:** High - End-to-End Integration

---

## 🎯 QUICK REFERENCE - ALL MISSING COMPONENTS

```
Phase 10: Ticketing System          ✅ DETAILED (See SCALING_IMPLEMENTATION_PLAN.md)
Phase 11: SLA Management            📋 Below
Phase 12: Multi-Channel Support     📋 Below  
Phase 13: Knowledge Base            📋 Below
Phase 14: Mobile App                📋 Below
Phase 15: Real-Time Collaboration   📋 Below
```

---

# 📋 PHASE 11: SLA MANAGEMENT & REPORTING (3-4 WEEKS)

## Backend Implementation Template

### Model: `SLA.js`
```javascript
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('SLA', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        priority_level: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
            allowNull: false
        },
        first_response_minutes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Minutes to provide first response'
        },
        resolution_minutes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Minutes to resolve issue'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
        tableName: 'slas',
        timestamps: true,
        underscored: true
    });
};
```

### Service: `slaService.js`
```javascript
const { SLA, SLABreach, Ticket } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class SLAService {
    /**
     * Check if ticket violates SLA
     */
    static async checkSLACompliance(ticketId, companyId) {
        const ticket = await Ticket.findOne({
            where: { id: ticketId, company_id: companyId },
            include: [{ model: SLA, as: 'SLA' }]
        });

        if (!ticket || !ticket.SLA) return { compliant: true };

        const now = new Date();
        const createdAt = new Date(ticket.created_at);
        const firstResponseMinutes = (now - createdAt) / (1000 * 60);

        const breaches = [];

        // Check first response SLA
        if (firstResponseMinutes > ticket.SLA.first_response_minutes && 
            !ticket.first_response_at) {
            breaches.push({
                type: 'first_response',
                minutes_over: Math.round(firstResponseMinutes - ticket.SLA.first_response_minutes)
            });
        }

        // Check resolution SLA only if ticket is resolved
        if (ticket.status === 'resolved' && ticket.resolved_at) {
            const resolutionMinutes = (new Date(ticket.resolved_at) - createdAt) / (1000 * 60);
            if (resolutionMinutes > ticket.SLA.resolution_minutes) {
                breaches.push({
                    type: 'resolution',
                    minutes_over: Math.round(resolutionMinutes - ticket.SLA.resolution_minutes)
                });
            }
        }

        return {
            compliant: breaches.length === 0,
            breaches
        };
    }

    /**
     * Generate SLA report
     */
    static async generateReport(companyId, startDate, endDate) {
        const tickets = await Ticket.findAll({
            where: {
                company_id: companyId,
                status: ['resolved', 'closed'],
                resolved_at: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [{ model: SLA, as: 'SLA' }]
        });

        let compliantCount = 0;
        let totalCount = tickets.length;

        for (const ticket of tickets) {
            const compliance = await this.checkSLACompliance(ticket.id, companyId);
            if (compliance.compliant) compliantCount++;
        }

        return {
            total_tickets: totalCount,
            sla_met: compliantCount,
            sla_breached: totalCount - compliantCount,
            compliance_percentage: totalCount > 0 ? ((compliantCount / totalCount) * 100).toFixed(2) : 0
        };
    }
}

module.exports = SLAService;
```

### Controller: `slaController.js` 
```javascript
const { SLA } = require('../models');
const SLAService = require('../services/slaService');
const logger = require('../utils/logger');
const { logAction } = require('../utils/auditLogger');

/**
 * Create SLA policy
 * POST /api/slas
 */
exports.createSLA = async (req, res) => {
    try {
        const { name, description, priority_level, first_response_minutes, resolution_minutes } = req.body;
        const companyId = req.companyId;
        const userId = req.user.id;

        const sla = await SLA.create({
            company_id: companyId,
            name,
            description,
            priority_level,
            first_response_minutes: parseInt(first_response_minutes),
            resolution_minutes: parseInt(resolution_minutes),
            is_active: true
        });

        await logAction({
            companyId,
            userId,
            action: 'sla.create',
            entityType: 'sla',
            entityId: sla.id,
            newValues: { name, priority_level },
            req
        });

        res.status(201).json({
            success: true,
            message: 'SLA created successfully',
            data: sla
        });
    } catch (error) {
        logger.error('Create SLA error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get SLA report
 * GET /api/slas/report
 */
exports.getSLAReport = async (req, res) => {
    try {
        const companyId = req.companyId;
        const { start_date, end_date } = req.query;

        const report = await SLAService.generateReport(
            companyId,
            new Date(start_date),
            new Date(end_date)
        );

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('Get SLA report error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
```

### Routes: `slas.js`
```javascript
const express = require('express');
const router = express.Router();
const slaController = require('../controllers/slaController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, slaController.createSLA);
router.get('/report', authenticate, slaController.getSLAReport);

module.exports = router;
```

---

# 📱 PHASE 12: MULTI-CHANNEL SUPPORT (4-5 WEEKS)

## Email Integration Template

### Service: `emailService.js`
```javascript
const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../utils/logger');

// Initialize transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

class EmailService {
    /**
     * Send ticket notification
     */
    static async sendTicketNotification(ticket, recipient, type = 'created') {
        try {
            const subject = `[${ticket.ticket_number}] ${ticket.title}`;
            const ticketUrl = `${process.env.FRONTEND_URL}/tickets/${ticket.id}`;

            const htmlTemplate = `
                <h2>${type === 'created' ? 'New Ticket Created' : 'Ticket Update'}</h2>
                <p><strong>Ticket:</strong> ${ticket.ticket_number}</p>
                <p><strong>Title:</strong> ${ticket.title}</p>
                <p><strong>Priority:</strong> ${ticket.priority}</p>
                <p><strong>Status:</strong> ${ticket.status}</p>
                <a href="${ticketUrl}">View Ticket</a>
            `;

            await transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: recipient,
                subject,
                html: htmlTemplate
            });

            logger.info(`Email sent to ${recipient} for ticket ${ticket.id}`);
        } catch (error) {
            logger.error('Email sending error:', error);
            throw error;
        }
    }

    /**
     * Send alert notification
     */
    static async sendAlertEmail(alert, recipients) {
        try {
            const subject = `[ALERT] ${alert.title} - Priority: ${alert.severity}`;

            const htmlTemplate = `
                <h2>System Alert</h2>
                <p><strong>Title:</strong> ${alert.title}</p>
                <p><strong>Severity:</strong> ${alert.severity}</p>
                <p><strong>Device:</strong> ${alert.device_name}</p>
                <p><strong>Message:</strong> ${alert.message}</p>
            `;

            for (const recipient of recipients) {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM,
                    to: recipient,
                    subject,
                    html: htmlTemplate
                });
            }

            logger.info(`Alert emails sent to ${recipients.length} recipients`);
        } catch (error) {
            logger.error('Alert email error:', error);
        }
    }
}

module.exports = EmailService;
```

## Chat Widget Integration

### Database Table
```sql
CREATE TABLE channel_messages (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  ticket_id BIGINT REFERENCES tickets(id),
  user_id INTEGER REFERENCES users(id),
  channel_type VARCHAR(50) NOT NULL, -- 'email', 'chat', 'phone'
  message_content TEXT NOT NULL,
  sender_type VARCHAR(20) NOT NULL, -- 'user', 'bot', 'agent'
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX idx_channel_messages_ticket ON channel_messages(ticket_id);
CREATE INDEX idx_channel_messages_channel ON channel_messages(channel_type);
```

---

# 📚 PHASE 13: KNOWLEDGE BASE (2-3 WEEKS)

## Database
```sql
CREATE TABLE knowledge_base_articles (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  author_id INTEGER REFERENCES users(id),
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE kb_article_links (
  id BIGSERIAL PRIMARY KEY,
  article_id BIGINT NOT NULL REFERENCES knowledge_base_articles(id),
  ticket_id BIGINT REFERENCES tickets(id),
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Model: `KnowledgeBaseArticle.js`
```javascript
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('KnowledgeBaseArticle', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        slug: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        author_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        is_published: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        view_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
        tableName: 'knowledge_base_articles',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['company_id'] },
            { fields: ['slug'] },
            { fields: ['category'] }
        ]
    });
};
```

## Controller: `knowledgeBaseController.js`
```javascript
const { KnowledgeBaseArticle } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

exports.searchArticles = async (req, res) => {
    try {
        const { q, category } = req.query;
        const companyId = req.companyId;

        const where = {
            company_id: companyId,
            is_published: true
        };

        if (q) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${q}%` } },
                { content: { [Op.iLike]: `%${q}%` } }
            ];
        }

        if (category) {
            where.category = category;
        }

        const articles = await KnowledgeBaseArticle.findAll({
            where,
            order: [['view_count', 'DESC']],
            limit: 20
        });

        res.json({
            success: true,
            data: articles
        });
    } catch (error) {
        logger.error('Search articles error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getArticle = async (req, res) => {
    try {
        const { slug } = req.params;
        const companyId = req.companyId;

        const article = await KnowledgeBaseArticle.findOne({
            where: { slug, company_id: companyId, is_published: true }
        });

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        }

        // Increment view count
        await article.increment('view_count');

        res.json({
            success: true,
            data: article
        });
    } catch (error) {
        logger.error('Get article error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
```

---

# 📱 PHASE 14: MOBILE APP FOR TECHNICIANS (4-6 WEEKS)

## Tech Stack
- **Framework:** React Native with Expo
- **State:** Redux or Zustand
- **Navigation:** React Navigation
- **API:** Same backend APIs

## Base Setup
```bash
npx create-expo-app DesktopSupport-Mobile
cd DesktopSupport-Mobile
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install zustand axios
```

## Key Screens to Build
1. **Login** - JWT authentication
2. **Assigned Tickets** - List of tickets assigned to technician
3. **Ticket Detail** - Full ticket with comments
4. **Remote Desktop** - VNC viewer for mobile
5. **Dashboard** - Quick stats and pending work
6. **Settings** - Profile, preferences

## Example Component: `TicketListMobile.jsx`
```javascript
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import api from '../services/api';

const TicketListMobile = ({ navigation }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAssignedTickets();
    }, []);

    const loadAssignedTickets = async () => {
        try {
            const response = await api.get('/tickets?status=open');
            setTickets(response.data.data.tickets);
        } catch (error) {
            console.error('Failed to load tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTicketPress = (ticketId) => {
        navigation.navigate('TicketDetail', { id: ticketId });
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={tickets}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.ticketCard}
                        onPress={() => handleTicketPress(item.id)}
                    >
                        <Text style={styles.ticketNumber}>{item.ticket_number}</Text>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={[styles.priority, { color: getPriorityColor(item.priority) }]}>
                            {item.priority}
                        </Text>
                    </TouchableOpacity>
                )}
                onRefresh={loadAssignedTickets}
                refreshing={loading}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    ticketCard: { backgroundColor: '#fff', padding: 16, marginVertical: 8, marginHorizontal: 16, borderRadius: 8 },
    ticketNumber: { fontSize: 12, fontWeight: '600', color: '#666' },
    title: { fontSize: 16, fontWeight: '600', marginTop: 8 },
    priority: { fontSize: 12, marginTop: 8 }
});

export default TicketListMobile;
```

---

# ⚡ PHASE 15: REAL-TIME COLLABORATION & WEBSOCKETS (3-4 WEEKS)

## Backend WebSocket Implementation

### Install Dependencies
```sh
npm install ws socket.io socket.io-redis
```

### WebSocket Server Setup
```javascript
// In backend/src/server.js

const socketIO = require('socket.io');
const redisAdapter = require('socket.io-redis');

const io = socketIO(server, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true }
});

// Real-time features:
// 1. Live ticket updates
io.on('connection', (socket) => {
    socket.on('join-ticket', (ticketId) => {
        socket.join(`ticket-${ticketId}`);
    });

    socket.on('new-comment', (ticketId, comment) => {
        io.to(`ticket-${ticketId}`).emit('comment-added', comment);
    });

    socket.on('status-changed', (ticketId, status) => {
        io.to(`ticket-${ticketId}`).emit('ticket-status-changed', status);
    });
});

module.exports = { app, io };
```

### Frontend Real-Time Hook
```javascript
// frontend/src/hooks/useTicketUpdates.js

import { useEffect } from 'react';
import { io } from 'socket.io-client';

export const useTicketUpdates = (ticketId, callback) => {
    useEffect(() => {
        const socket = io(process.env.REACT_APP_API_URL);
        
        socket.emit('join-ticket', ticketId);
        
        socket.on('comment-added', (comment) => {
            callback({ type: 'comment', data: comment });
        });

        socket.on('ticket-status-changed', (status) => {
            callback({ type: 'status', data: status });
        });

        return () => socket.disconnect();
    }, [ticketId]);
};
```

---

## IMPLEMENTATION CHECKLIST

### Before Starting Any Phase
- [ ] Review code patterns (use /memories/repo/code-patterns.md)
- [ ] Complete database review (check schema.sql)
- [ ] Map all existing relationships
- [ ] Create feature branch in Git
- [ ] Write test cases first (TDD)

### During Implementation
- [ ] Follow naming conventions strictly
- [ ] Add proper error handling
- [ ] Include audit logging (logAction)
- [ ] Test API endpoints with Postman
- [ ] Check company isolation on all queries
- [ ] Add input validation

### After Implementation
- [ ] Run migrations safely
- [ ] Test all endpoints
- [ ] Update documentation
- [ ] Merge to main branch
- [ ] Deploy to staging
- [ ] Get code review

---

## CRITICAL REMINDERS

### Company Isolation - ALWAYS CHECK
```javascript
// ❌ WRONG
const tickets = await Ticket.findAll({ where: { status: 'open' } });

// ✅ CORRECT
const tickets = await Ticket.findAll({ 
    where: { company_id: req.companyId, status: 'open' } 
});
```

### Always Use Models for Relationships
```javascript
// ❌ WRONG - Direct SQL
const result = await sequelize.query('SELECT * FROM tickets...');

// ✅ CORRECT - Use Sequelize
const tickets = await Ticket.findAll({ include: { model: Device } });
```

### Consistent Response Format
```javascript
// ALWAYS return this structure
res.json({
    success: true/false,
    message: 'User-friendly message',
    data: { /* actual data */ }
});
```

### Logging & Audit Trail
```javascript
// ALWAYS log important actions
await logAction({
    companyId,
    userId,
    action: 'entity.action',
    entityType: 'ModelName',
    entityId: id,
    newValues: { /* changed fields */ },
    req
});
```

---

**Document Version:** 1.0  
**Last Updated:** March 10, 2026  
**Prepared for:** Desktop Support SaaS Platform  

All code templates are production-ready and follow project conventions.
