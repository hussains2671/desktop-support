# Phase 11 - SLA System Step-by-Step Execution Guide

**Phase**: 11 - SLA Management & Reporting  
**Status**: Ready to Start  
**Updated**: March 10, 2026  

---

## 🚀 Quick Start Checklist

### Step 0: Prerequisites Check
- [ ] Phase 10 (Ticket System) completed ✅
- [ ] Node.js 18+ installed ✅
- [ ] PostgreSQL running ✅
- [ ] Redis running ✅
- [ ] Workspace ready ✅

### Step 1: Database Setup (30 minutes)

#### 1.1 Create PostgreSQL Migration File
Location: `backend/database/migrations/011_create_sla_tables.sql`

```sql
-- Create SLA table
CREATE TABLE IF NOT EXISTS slas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority_level VARCHAR(50),
    first_response_hours INT NOT NULL DEFAULT 4,
    resolution_hours INT NOT NULL DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);

-- Create SLA Breach table
CREATE TABLE IF NOT EXISTS sla_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sla_id UUID NOT NULL REFERENCES slas(id),
    breach_type VARCHAR(50) NOT NULL DEFAULT 'resolution',
    target_time TIMESTAMP NOT NULL,
    breach_at TIMESTAMP NOT NULL,
    minutes_over INT NOT NULL,
    escalated BOOLEAN DEFAULT false,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create SLA Metrics table
CREATE TABLE IF NOT EXISTS sla_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_tickets INT DEFAULT 0,
    sla_compliant INT DEFAULT 0,
    sla_breached INT DEFAULT 0,
    compliance_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX idx_slas_company_id ON slas(company_id);
CREATE INDEX idx_slas_is_active ON slas(is_active);
CREATE INDEX idx_sla_breaches_ticket_id ON sla_breaches(ticket_id);
CREATE INDEX idx_sla_breaches_sla_id ON sla_breaches(sla_id);
CREATE INDEX idx_sla_breaches_breach_at ON sla_breaches(breach_at);
CREATE INDEX idx_sla_metrics_company_id ON sla_metrics(company_id);
CREATE INDEX idx_sla_metrics_period ON sla_metrics(period_start, period_end);
```

#### 1.2 Run Migration
```bash
cd /workspaces/desktop-support
psql -U postgres desktop_support < backend/database/migrations/011_create_sla_tables.sql
```

Verify:
```bash
psql -U postgres -d desktop_support -c "\dt" | grep sla
```

---

### Step 2: Backend Models (45 minutes)

#### 2.1 Create SLA.js Model
Location: `backend/src/models/SLA.js`

```javascript
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SLA = sequelize.define('SLA', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    company_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    priority_level: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: true,
    },
    first_response_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
      validate: {
        min: 1,
      },
    },
    resolution_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 24,
      validate: {
        min: 1,
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'slas',
    timestamps: true,
    underscored: true,
  });

  return SLA;
};
```

#### 2.2 Create SLABreach.js Model
Location: `backend/src/models/SLABreach.js`

```javascript
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SLABreach = sequelize.define('SLABreach', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticket_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tickets',
        key: 'id',
      },
    },
    sla_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'slas',
        key: 'id',
      },
    },
    breach_type: {
      type: DataTypes.ENUM('first_response', 'resolution'),
      allowNull: false,
      defaultValue: 'resolution',
    },
    target_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    breach_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    minutes_over: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    escalated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'sla_breaches',
    timestamps: true,
    underscored: true,
  });

  return SLABreach;
};
```

#### 2.3 Create SLAMetric.js Model
Location: `backend/src/models/SLAMetric.js`

```javascript
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SLAMetric = sequelize.define('SLAMetric', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    company_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_tickets: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    sla_compliant: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    sla_breached: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    compliance_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'sla_metrics',
    timestamps: true,
    underscored: true,
  });

  return SLAMetric;
};
```

#### 2.4 Verify Models
```bash
cd /workspaces/desktop-support/backend
node -c src/models/SLA.js
node -c src/models/SLABreach.js
node -c src/models/SLAMetric.js
echo "✅ All model syntax valid"
```

---

### Step 3: Backend Service Layer (45 minutes)

#### 3.1 Create slaService.js
Location: `backend/src/services/slaService.js`

```javascript
const db = require('../models');
const { Op } = require('sequelize');

class SLAService {
  // Check if ticket has breached SLA
  static async checkForBreaches(ticketId) {
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
    const firstResponseDeadline = new Date(createdTime.getTime() + sla.first_response_hours * 60 * 60 * 1000);
    
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
      const resolutionDeadline = new Date(createdTime.getTime() + sla.resolution_hours * 60 * 60 * 1000);
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
  }

  // Get SLA status for ticket
  static async getTicketSLAStatus(ticketId) {
    const ticket = await db.Ticket.findByPk(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const sla = await db.SLA.findOne({
      where: {
        company_id: ticket.company_id,
        is_active: true,
        ...(ticket.priority && { priority_level: ticket.priority }),
      },
    });

    if (!sla) return { status: 'no_sla', sla: null };

    const createdTime = new Date(ticket.created_at);
    const firstResponseDeadline = new Date(createdTime.getTime() + sla.first_response_hours * 60 * 60 * 1000);
    const resolutionDeadline = new Date(createdTime.getTime() + sla.resolution_hours * 60 * 60 * 1000);

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
          minutes_over: Math.floor((responseTime - firstResponseDeadline) / (1000 * 60)),
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
          minutes_over: Math.floor((resolvedAt - resolutionDeadline) / (1000 * 60)),
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
  }

  // Calculate compliance metrics
  static async calculateMetrics(companyId, startDate, endDate) {
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
      const status = await this.getTicketSLAStatus(ticket.id);
      if (status.status === 'compliant') {
        compliant++;
      } else if (status.status === 'breached') {
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
  }

  // Generate compliance report
  static async generateComplianceReport(companyId, startDate, endDate) {
    const metrics = await this.calculateMetrics(companyId, startDate, endDate);
    const breaches = await db.SLABreach.findAll({
      include: [
        {
          model: db.Ticket,
          where: { company_id: companyId },
        },
        { model: db.SLA },
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
  }
}

module.exports = SLAService;
```

#### 3.2 Verify Service
```bash
node -c backend/src/services/slaService.js
echo "✅ SLA Service syntax valid"
```

---

### Step 4: Backend Controller (60 minutes)

#### 4.1 Create slaController.js
Location: `backend/src/controllers/slaController.js`

```javascript
const db = require('../models');
const SLAService = require('../services/slaService');
const { v4: uuidv4 } = require('uuid');

// Cache configuration
const CACHE_DURATION = {
  LISTS: 5 * 60,      // 5 minutes
  METRICS: 30 * 60,   // 30 minutes
  SINGLE: 2 * 60,     // 2 minutes
};

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
        { model: db.User, as: 'creator', attributes: ['id', 'username', 'email'] },
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
    res.status(500).json({ message: 'Error fetching SLAs', error: error.message });
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
        { model: db.User, as: 'creator', attributes: ['id', 'username', 'email'] },
      ],
    });

    if (!sla) {
      return res.status(404).json({ message: 'SLA not found' });
    }

    res.json(sla);
  } catch (error) {
    console.error('Error fetching SLA:', error);
    res.status(500).json({ message: 'Error fetching SLA', error: error.message });
  }
};

// Create SLA
exports.createSLA = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { name, description, priority_level, first_response_hours, resolution_hours } = req.body;

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
    res.status(500).json({ message: 'Error creating SLA', error: error.message });
  }
};

// Update SLA
exports.updateSLA = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const { name, description, priority_level, first_response_hours, resolution_hours, is_active } = req.body;

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
    res.status(500).json({ message: 'Error updating SLA', error: error.message });
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
    res.status(500).json({ message: 'Error deleting SLA', error: error.message });
  }
};

// Get SLA breaches
exports.getSLABreaches = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { page = 1, limit = 10, resolved } = req.query;

    const where = {
      '$ticket.company_id$': companyId,
    };

    if (resolved !== undefined) {
      where.resolved = resolved === 'true';
    }

    const { count, rows } = await db.SLABreach.findAndCountAll({
      where,
      include: [
        { model: db.Ticket, attributes: ['id', 'ticket_number', 'title', 'priority'] },
        { model: db.SLA, attributes: ['id', 'name'] },
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
    res.status(500).json({ message: 'Error fetching breaches', error: error.message });
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
    res.status(500).json({ message: 'Error getting status', error: error.message });
  }
};

// Get SLA metrics
exports.getSLAMetrics = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { start_date, end_date } = req.query;

    const startDate = new Date(start_date || new Date().setDate(new Date().getDate() - 30));
    const endDate = new Date(end_date || new Date());

    const metrics = await SLAService.calculateMetrics(companyId, startDate, endDate);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ message: 'Error fetching metrics', error: error.message });
  }
};

// Get compliance report
exports.getComplianceReport = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { start_date, end_date } = req.query;

    const startDate = new Date(start_date || new Date().setDate(new Date().getDate() - 30));
    const endDate = new Date(end_date || new Date());

    const report = await SLAService.generateComplianceReport(companyId, startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report', error: error.message });
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
    res.status(500).json({ message: 'Error checking breaches', error: error.message });
  }
};
```

#### 4.2 Verify Controller
```bash
node -c backend/src/controllers/slaController.js
echo "✅ SLA Controller syntax valid"
```

---

### Step 5: Backend Routes (15 minutes)

#### 5.1 Create slas.js Routes
Location: `backend/src/routes/slas.js`

```javascript
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
```

#### 5.2 Verify Routes
```bash
node -c backend/src/routes/slas.js
echo "✅ SLA Routes syntax valid"
```

---

### Step 6: Database Model Integration (15 minutes)

#### 6.1 Update models/index.js

Add to the relationships section in `backend/src/models/index.js`:

```javascript
// SLA Relationships
models.SLA.belongsTo(models.Company, { foreignKey: 'company_id' });
models.Company.hasMany(models.SLA, { foreignKey: 'company_id' });

models.SLA.hasMany(models.SLABreach, { foreignKey: 'sla_id', onDelete: 'CASCADE' });
models.SLABreach.belongsTo(models.SLA, { foreignKey: 'sla_id' });

models.Ticket.hasMany(models.SLABreach, { foreignKey: 'ticket_id', onDelete: 'CASCADE' });
models.SLABreach.belongsTo(models.Ticket, { foreignKey: 'ticket_id' });

models.User.hasMany(models.SLA, { foreignKey: 'created_by', as: 'creator' });
models.SLA.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });

// SLA Metrics
models.SLAMetric.belongsTo(models.Company, { foreignKey: 'company_id' });
models.Company.hasMany(models.SLAMetric, { foreignKey: 'company_id' });
```

Also add model imports at the top:

```javascript
const SLA = require('./SLA')(sequelize, DataTypes);
const SLABreach = require('./SLABreach')(sequelize, DataTypes);
const SLAMetric = require('./SLAMetric')(sequelize, DataTypes);
```

And export them in the models object:

```javascript
module.exports = {
  // ... existing exports
  SLA,
  SLABreach,
  SLAMetric,
};
```

---

### Step 7: Server Integration (10 minutes)

#### 7.1 Update server.js

Add to the routes section in `backend/src/server.js`:

```javascript
// Add with other route requires (around line 30)
const slaRoutes = require('./routes/slas');

// Add with other route uses (around line 180)
app.use('/api/slas', slaRoutes);
```

#### 7.2 Verify Integration
```bash
cd /workspaces/desktop-support/backend
node -c src/server.js
echo "✅ Server integration verified"
```

---

### Step 8: Frontend - SLA Management Page (90 minutes)

#### 8.1 Create SLAManagement.jsx
Location: `frontend/src/pages/SLAManagement.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Eye, BarChart3, AlertTriangle, CheckCircle,
  Calendar, Clock, AlertCircle, Loader
} from 'lucide-react';
import api from '../services/api';
import './SLAManagement.css';

export default function SLAManagement() {
  const [activeTab, setActiveTab] = useState('policies');
  const [slas, setSLAs] = useState([]);
  const [breaches, setBreaches] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSLA, setEditingSLA] = useState(null);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority_level: 'medium',
    first_response_hours: 4,
    resolution_hours: 24,
  });

  useEffect(() => {
    loadSLAs();
    loadMetrics();
  }, []);

  const loadSLAs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/slas', {
        params: { page, limit: 10 }
      });
      setSLAs(response.data.data);
    } catch (error) {
      console.error('Error loading SLAs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBreaches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/slas/breaches/list', {
        params: { page, limit: 10 }
      });
      setBreaches(response.data.data);
    } catch (error) {
      console.error('Error loading breaches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await api.get('/slas/metrics/current');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const handleCreateSLA = async () => {
    try {
      if (!formData.name) {
        alert('Please enter SLA name');
        return;
      }
      
      if (editingSLA) {
        await api.put(`/slas/${editingSLA.id}`, formData);
      } else {
        await api.post('/slas', formData);
      }
      
      resetForm();
      setShowModal(false);
      loadSLAs();
    } catch (error) {
      console.error('Error creating SLA:', error);
      alert('Error creating SLA');
    }
  };

  const handleDeleteSLA = async (id) => {
    if (window.confirm('Delete this SLA?')) {
      try {
        await api.delete(`/slas/${id}`);
        loadSLAs();
      } catch (error) {
        console.error('Error deleting SLA:', error);
        alert('Error deleting SLA');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority_level: 'medium',
      first_response_hours: 4,
      resolution_hours: 24,
    });
    setEditingSLA(null);
  };

  const handleEditSLA = (sla) => {
    setEditingSLA(sla);
    setFormData({
      name: sla.name,
      description: sla.description,
      priority_level: sla.priority_level,
      first_response_hours: sla.first_response_hours,
      resolution_hours: sla.resolution_hours,
    });
    setShowModal(true);
  };

  return (
    <div className="sla-container">
      {/* Header */}
      <div className="sla-header">
        <div>
          <h1>SLA Management</h1>
          <p>Manage Service Level Agreements and track compliance</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus size={20} /> New SLA Policy
        </button>
      </div>

      {/* Tabs */}
      <div className="sla-tabs">
        <button
          className={`tab ${activeTab === 'policies' ? 'active' : ''}`}
          onClick={() => setActiveTab('policies')}
        >
          SLA Policies
        </button>
        <button
          className={`tab ${activeTab === 'breaches' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('breaches');
            loadBreaches();
          }}
        >
          Breaches
        </button>
        <button
          className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          Metrics
        </button>
      </div>

      {/* Metrics Dashboard */}
      {metrics && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon accuracy">
              <CheckCircle size={32} />
            </div>
            <div className="metric-content">
              <h3>Compliance Rate</h3>
              <p className="metric-value">{metrics.percentage}%</p>
              <small>{metrics.compliant}/{metrics.total} tickets</small>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon warning">
              <AlertTriangle size={32} />
            </div>
            <div className="metric-content">
              <h3>Total Tickets</h3>
              <p className="metric-value">{metrics.total}</p>
              <small>In selected period</small>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon error">
              <AlertCircle size={32} />
            </div>
            <div className="metric-content">
              <h3>Breached</h3>
              <p className="metric-value">{metrics.breached}</p>
              <small>SLA breaches</small>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'policies' && (
        <div className="sla-policies">
          {loading ? (
            <div className="loading"><Loader className="spinner" /> Loading...</div>
          ) : slas.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={48} />
              <h3>No SLA Policies Yet</h3>
              <p>Create your first SLA policy to get started</p>
            </div>
          ) : (
            <div className="sla-list">
              {slas.map(sla => (
                <div key={sla.id} className="sla-card">
                  <div className="sla-card-header">
                    <h3>{sla.name}</h3>
                    <span className={`priority-badge ${sla.priority_level}`}>
                      {sla.priority_level || 'General'}
                    </span>
                  </div>
                  {sla.description && (
                    <p className="sla-description">{sla.description}</p>
                  )}
                  <div className="sla-targets">
                    <div className="target">
                      <Clock size={16} />
                      <span>First Response: {sla.first_response_hours}h</span>
                    </div>
                    <div className="target">
                      <Calendar size={16} />
                      <span>Resolution: {sla.resolution_hours}h</span>
                    </div>
                  </div>
                  <div className="sla-actions">
                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => handleEditSLA(sla)}
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      className="btn-sm btn-danger"
                      onClick={() => handleDeleteSLA(sla.id)}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'breaches' && (
        <div className="sla-breaches">
          {loading ? (
            <div className="loading"><Loader className="spinner" /> Loading...</div>
          ) : breaches.length === 0 ? (
            <div className="empty-state success">
              <CheckCircle size={48} />
              <h3>No SLA Breaches</h3>
              <p>All tickets are within SLA targets</p>
            </div>
          ) : (
            <div className="breach-table">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>SLA Policy</th>
                    <th>Breach Type</th>
                    <th>Minutes Over</th>
                    <th>Breached At</th>
                  </tr>
                </thead>
                <tbody>
                  {breaches.map(breach => (
                    <tr key={breach.id} className="breach-row">
                      <td>{breach.ticket?.ticket_number}</td>
                      <td>{breach.sla?.name}</td>
                      <td>
                        <span className={`badge ${breach.breach_type}`}>
                          {breach.breach_type === 'first_response' ? 'First Response' : 'Resolution'}
                        </span>
                      </td>
                      <td>{breach.minutes_over}</td>
                      <td>{new Date(breach.breach_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="sla-reports">
          <div className="report-card">
            <div className="report-header">
              <BarChart3 size={24} />
              <h3>Compliance Report</h3>
            </div>
            {metrics && (
              <div className="report-content">
                <div className="report-row">
                  <span>Compliance Rate:</span>
                  <strong>{metrics.percentage}%</strong>
                </div>
                <div className="report-row">
                  <span>Compliant Tickets:</span>
                  <strong>{metrics.compliant}</strong>
                </div>
                <div className="report-row">
                  <span>Breached Tickets:</span>
                  <strong>{metrics.breached}</strong>
                </div>
                <div className="report-row">
                  <span>Total Tickets:</span>
                  <strong>{metrics.total}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSLA ? 'Edit SLA' : 'Create New SLA'}</h2>
              <button
                className="btn-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Policy Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Support"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="SLA description..."
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority Level</label>
                  <select
                    value={formData.priority_level}
                    onChange={e => setFormData({ ...formData, priority_level: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>First Response (hours) *</label>
                  <input
                    type="number"
                    value={formData.first_response_hours}
                    onChange={e => setFormData({ ...formData, first_response_hours: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Resolution Time (hours) *</label>
                <input
                  type="number"
                  value={formData.resolution_hours}
                  onChange={e => setFormData({ ...formData, resolution_hours: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateSLA}
              >
                {editingSLA ? 'Update SLA' : 'Create SLA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 8.2 Create SLAManagement.css
Location: `frontend/src/pages/SLAManagement.css`

```css
.sla-container {
  padding: 28px;
  max-width: 1400px;
  margin: 0 auto;
}

.sla-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.sla-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.sla-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.sla-tabs {
  display: flex;
  gap: 16px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--border-color);
}

.tab {
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-weight: 500;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 12px;
  color: white;
}

.metric-icon.accuracy {
  background: linear-gradient(135deg, #10b981, #059669);
}

.metric-icon.warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.metric-icon.error {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.metric-content h3 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.metric-value {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.metric-content small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.sla-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.sla-card {
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.sla-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.sla-card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.priority-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.priority-badge.low {
  background: #dcfce7;
  color: #166534;
}

.priority-badge.medium {
  background: #fef3c7;
  color: #92400e;
}

.priority-badge.high {
  background: #fed7aa;
  color: #92400e;
}

.priority-badge.critical {
  background: #fecaca;
  color: #7f1d1d;
}

.sla-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.sla-targets {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.target {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.sla-actions {
  display: flex;
  gap: 8px;
}

.btn-sm {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--secondary-bg);
  color: var(--text-primary);
}

.btn-danger {
  background: #fee2e2;
  color: #991b1b;
}

.btn-danger:hover {
  background: #fecaca;
}

.breach-table {
  overflow-x: auto;
}

.breach-table table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.breach-table th {
  padding: 12px;
  background: var(--secondary-bg);
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.breach-table td {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.badge.resolution {
  background: #fef3c7;
  color: #92400e;
}

.badge.first_response {
  background: #fed7aa;
  color: #7c2d12;
}

.report-card {
  padding: 28px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.report-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.report-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.report-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
}

.report-row:last-child {
  border-bottom: none;
}

.report-row span {
  color: var(--text-secondary);
}

.report-row strong {
  color: var(--text-primary);
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state.success {
  color: #10b981;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: var(--text-secondary);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 13px;
  color: var(--text-secondary);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-secondary {
  padding: 10px 16px;
  background: var(--secondary-bg);
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

/* Dark mode */
:root[data-theme="dark"] {
  --card-bg: #1f2937;
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
  --border-color: #374151;
  --secondary-bg: #111827;
  --input-bg: #111827;
  --primary-color: #6366f1;
  --primary-dark: #4f46e5;
}

:root[data-theme="light"] {
  --card-bg: #ffffff;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --secondary-bg: #f9fafb;
  --input-bg: #f9fafb;
  --primary-color: #6366f1;
  --primary-dark: #4f46e5;
}
```

---

### Step 9: Frontend Service (15 minutes)

#### 9.1 Create slaService.js
Location: `frontend/src/services/slaService.js`

```javascript
import api from './api';

export const slaService = {
  // SLA Management
  getSLAs: (page = 1, limit = 10) =>
    api.get('/slas', { params: { page, limit } }),
  
  getSLA: (id) =>
    api.get(`/slas/${id}`),
  
  createSLA: (data) =>
    api.post('/slas', data),
  
  updateSLA: (id, data) =>
    api.put(`/slas/${id}`, data),
  
  deleteSLA: (id) =>
    api.delete(`/slas/${id}`),

  // Breaches
  getSLABreaches: (page = 1, limit = 10) =>
    api.get('/slas/breaches/list', { params: { page, limit } }),

  checkTicketBreaches: (ticketId) =>
    api.get(`/slas/ticket/${ticketId}/breaches`),

  // Status and Metrics
  getTicketSLAStatus: (ticketId) =>
    api.get(`/slas/ticket/${ticketId}/status`),

  getSLAMetrics: (startDate, endDate) =>
    api.get('/slas/metrics/current', {
      params: { start_date: startDate, end_date: endDate }
    }),

  getComplianceReport: (startDate, endDate) =>
    api.get('/slas/reports/compliance', {
      params: { start_date: startDate, end_date: endDate }
    }),
};

export default slaService;
```

---

### Step 10: Frontend Integration (10 minutes)

#### 10.1 Update App.jsx

Add to imports:
```javascript
import SLAManagement from './pages/SLAManagement';
```

Add to routes:
```javascript
<Route path="sla-management" element={<SLAManagement />} />
```

#### 10.2 Update Layout.jsx (Navigation)

Add to navigation menu items:
```javascript
{ 
  icon: BarChart3, 
  label: 'SLA Management', 
  path: '/sla-management', 
  roles: ['admin', 'manager', 'support'] 
}
```

Also add the import:
```javascript
import { BarChart3 } from 'lucide-react';
```

---

### Step 11: Testing (30 minutes)

#### 11.1 System Tests
```bash
cd /workspaces/desktop-support

# Test backend syntax
node -c backend/src/models/SLA.js
node -c backend/src/models/SLABreach.js
node -c backend/src/models/SLAMetric.js
node -c backend/src/services/slaService.js
node -c backend/src/controllers/slaController.js
node -c backend/src/routes/slas.js
node -c backend/src/server.js

# Test frontend syntax
npx eslint frontend/src/pages/SLAManagement.jsx
npx eslint frontend/src/services/slaService.js
```

#### 11.2 Manual Testing
```
1. Start backend: npm run dev:backend
2. Start frontend: npm run dev:frontend
3. Navigate to /sla-management
4. Create a test SLA policy
5. View policies list
6. Check metrics dashboard
7. View breaches
```

---

### Step 12: Documentation (30 minutes)

Create comprehensive documentation files:

1. **SLA_SYSTEM_IMPLEMENTATION.md* - Technical guide
2. **SLA_SYSTEM_COMPLETION_SUMMARY.md** - What was built
3. **SLA_SYSTEM_QUICK_REFERENCE.md** - User guide

---

## ✅ Completion Checklist

- [ ] Database migration applied
- [ ] SLA.js model created
- [ ] SLABreach.js model created
- [ ] SLAMetric.js model created
- [ ] slaService.js created
- [ ] slaController.js created
- [ ] slas.js routes created
- [ ] models/index.js updated
- [ ] server.js updated
- [ ] SLAManagement.jsx created
- [ ] SLAManagement.css created
- [ ] slaService.js (frontend) created
- [ ] App.jsx updated
- [ ] Layout.jsx updated
- [ ] All syntax verified
- [ ] Manual testing complete
- [ ] Documentation created
- [ ] Git commit ready

---

**Created**: March 10, 2026  
**Roadmap**: Follow the 4-step model → service → controller → routes → frontend pattern  
**Next**: Begin with Step 1 - Database setup
