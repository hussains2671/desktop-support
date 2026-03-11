# Phase 12 - Implementation Roadmap & Step-by-Step Guide

**Project:** Desktop Support SaaS  
**Phase:** 12 - Multi-Channel Support  
**Comprehensive Approach:** All 4 channels + Advanced Features  
**Estimated Duration:** 6-8 hours  
**Complexity:** High

---

## 📋 Table of Contents

1. [Pre-Implementation Setup](#pre-implementation-setup)
2. [Phase 12.1: Database & Backend Foundation](#phase-121-database--backend-foundation)
3. [Phase 12.2: Channel Integrations](#phase-122-channel-integrations)
4. [Phase 12.3: Frontend Components](#phase-123-frontend-components)
5. [Phase 12.4: Testing & Deployment](#phase-124-testing--deployment)
6. [File Structure](#file-structure)
7. [Dependencies](#dependencies)
8. [Deployment Checklist](#deployment-checklist)

---

## Pre-Implementation Setup

### Step 1: Environment Preparation

```bash
# 1. Create feature branch
git checkout -b feature/phase12-multi-channel

# 2. Create backup
mysqldump -u root desktop_support > backup_phase12_$(date +%Y%m%d_%H%M%S).sql

# 3. Pull latest changes
git pull origin main

# 4. Install new dependencies
npm install @sendgrid/mail @slack/web-api @slack/bolt axios socket.io-client

# 5. Create .env variables
cat >> .env << 'EOF'
# Phase 12 - Multi-Channel Support
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@company.com
SENDGRID_FROM_NAME=Support Team

SLACK_BOT_TOKEN=xoxb-your-slack-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_APP_ID=your-slack-app-id

TEAMS_BOT_APP_ID=your-teams-app-id
TEAMS_BOT_APP_PASSWORD=your-teams-app-password
TEAMS_TENANT_ID=your-tenant-id

MESSAGE_QUEUE_WORKERS=2
MESSAGE_QUEUE_INTERVAL_MS=5000
MAX_MESSAGE_SIZE_MB=25
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
RATE_LIMIT_PER_DAY=10000
EOF

# 6. Verify Docker services
docker-compose ps
```

---

## Phase 12.1: Database & Backend Foundation

### Step 1: Database Migration

**File: `backend/database/migrations/008_create_notification_channels_table.sql`**

```sql
-- Notification Channels Table
CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  configuration JSONB DEFAULT '{}',
  api_key VARCHAR(500),
  api_secret VARCHAR(500),
  webhook_url VARCHAR(500),
  last_verified_at TIMESTAMP,
  verified BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, channel_type),
  CHECK (channel_type IN ('email', 'slack', 'teams', 'inapp'))
);

CREATE INDEX idx_notification_channels_company_id ON notification_channels(company_id);
CREATE INDEX idx_notification_channels_channel_type ON notification_channels(channel_type);
CREATE INDEX idx_notification_channels_is_enabled ON notification_channels(is_enabled);

-- Message Templates Table
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  channel_type VARCHAR(50) NOT NULL,
  subject VARCHAR(500),
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, template_name)
);

CREATE INDEX idx_message_templates_category ON message_templates(category);
CREATE INDEX idx_message_templates_channel_type ON message_templates(channel_type);

-- Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES users(id),
  channel_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255),
  recipient_slack_id VARCHAR(255),
  recipient_teams_id VARCHAR(255),
  template_id UUID REFERENCES message_templates(id),
  subject VARCHAR(500),
  body TEXT NOT NULL,
  message_body_html TEXT,
  external_message_id VARCHAR(500),
  attachments JSONB DEFAULT '[]',
  mentions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_company_id ON messages(company_id);
CREATE INDEX idx_messages_ticket_id ON messages(ticket_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_channel_type ON messages(channel_type);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Message Deliveries Table (Tracking)
CREATE TABLE message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  delivery_timestamp TIMESTAMP,
  read_timestamp TIMESTAMP,
  read_by_user_id UUID REFERENCES users(id),
  failure_reason TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  next_retry_at TIMESTAMP,
  external_status JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_deliveries_message_id ON message_deliveries(message_id);
CREATE INDEX idx_message_deliveries_status ON message_deliveries(status);
CREATE INDEX idx_message_deliveries_channel_type ON message_deliveries(channel_type);
CREATE INDEX idx_message_deliveries_next_retry_at ON message_deliveries(next_retry_at);

-- Rate Limit Log Table
CREATE TABLE rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  channel_type VARCHAR(50) NOT NULL,
  action VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500)
);

CREATE INDEX idx_rate_limit_log_company_id ON rate_limit_log(company_id);
CREATE INDEX idx_rate_limit_log_timestamp ON rate_limit_log(timestamp);
```

**Run Migration:**
```bash
# Using your migration system
npm run db:migrate

# Or psql directly
psql -U postgres -d desktop_support -f backend/database/migrations/008_create_notification_channels_table.sql
```

### Step 2: Create Sequelize Models

**File: `backend/src/models/NotificationChannel.js`**

```javascript
module.exports = (sequelize, DataTypes) => {
  const NotificationChannel = sequelize.define('NotificationChannel', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'company', key: 'id' }
    },
    channelType: {
      type: DataTypes.ENUM('email', 'slack', 'teams', 'inapp'),
      allowNull: false
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    configuration: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    apiKey: {
      type: DataTypes.STRING(500),
      get() {
        const encrypted = this.getDataValue('apiKey');
        return encrypted ? decryptCredential(encrypted) : null;
      },
      set(value) {
        this.setDataValue('apiKey', encryptCredential(value));
      }
    },
    webhook_url: DataTypes.STRING(500),
    lastVerifiedAt: DataTypes.DATE,
    verified: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'notification_channels',
    timestamps: true
  });

  NotificationChannel.associate = (models) => {
    NotificationChannel.belongsTo(models.Company, { 
      foreignKey: 'companyId',
      as: 'company'
    });
  };

  return NotificationChannel;
};
```

**File: `backend/src/models/MessageTemplate.js`**

```javascript
module.exports = (sequelize, DataTypes) => {
  const MessageTemplate = sequelize.define('MessageTemplate', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    templateName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    category: DataTypes.STRING(100),
    channelType: {
      type: DataTypes.ENUM('email', 'slack', 'teams', 'inapp', 'all'),
      allowNull: false
    },
    subject: DataTypes.STRING(500),
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    variables: { type: DataTypes.JSONB, defaultValue: [] },
    isSystem: { type: DataTypes.BOOLEAN, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'message_templates',
    timestamps: true
  });

  return MessageTemplate;
};
```

**File: `backend/src/models/Message.js`**

```javascript
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    ticketId: DataTypes.UUID,
    senderId: DataTypes.UUID,
    channelType: {
      type: DataTypes.ENUM('email', 'slack', 'teams', 'inapp'),
      allowNull: false
    },
    subject: DataTypes.STRING(500),
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    externalMessageId: DataTypes.STRING(500),
    attachments: { type: DataTypes.JSONB, defaultValue: [] },
    mentions: { type: DataTypes.JSONB, defaultValue: [] }
  }, {
    tableName: 'messages',
    timestamps: true
  });

  Message.associate = (models) => {
    Message.belongsTo(models.Ticket, { foreignKey: 'ticketId' });
    Message.belongsTo(models.User, { foreignKey: 'senderId', as: 'sender' });
    Message.hasMany(models.MessageDelivery, { foreignKey: 'messageId', as: 'deliveries' });
  };

  return Message;
};
```

**File: `backend/src/models/MessageDelivery.js`**

```javascript
module.exports = (sequelize, DataTypes) => {
  const MessageDelivery = sequelize.define('MessageDelivery', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'messages', key: 'id' }
    },
    status: {
      type: DataTypes.ENUM(
        'pending', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'read'
      ),
      defaultValue: 'pending'
    },
    retryCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    maxRetries: { type: DataTypes.INTEGER, defaultValue: 3 },
    nextRetryAt: DataTypes.DATE,
    failureReason: DataTypes.TEXT
  }, {
    tableName: 'message_deliveries',
    timestamps: true
  });

  return MessageDelivery;
};
```

**File: `backend/src/models/index.js` (Update)**

Add to your associations:
```javascript
// In the associate section
NotificationChannel.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
MessageTemplate.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Message.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Message.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Message.hasMany(MessageDelivery, { foreignKey: 'message_id', as: 'deliveries' });
MessageDelivery.belongsTo(Message, { foreignKey: 'message_id', as: 'message' });

// Export new models
module.exports = {
  // ... existing
  NotificationChannel,
  MessageTemplate,
  Message,
  MessageDelivery,
  RateLimitLog
};
```

### Step 3: Create Service Layer

**File: `backend/src/services/messageService.js`**

```javascript
const { Message, MessageDelivery, MessageTemplate } = require('../models');
const { v4: uuidv4 } = require('uuid');
const emailService = require('./emailService');
const slackService = require('./slackService');
const teamsService = require('./teamsService');

class MessageService {
  // Send message to specified channel
  async sendMessage(data) {
    const {
      companyId,
      ticketId,
      senderId,
      templateId,
      channelType,
      body,
      recipient,
      variables = {},
      attachments = []
    } = data;

    try {
      // Create message record
      const message = await Message.create({
        companyId,
        ticketId,
        senderId,
        templateId,
        channelType,
        body,
        attachments
      });

      // Create delivery record
      const delivery = await MessageDelivery.create({
        messageId: message.id,
        channelType,
        status: 'pending'
      });

      // Send through appropriate channel
      let result;
      switch (channelType) {
        case 'email':
          result = await emailService.sendEmail(message, recipient, variables);
          break;
        case 'slack':
          result = await slackService.sendMessage(message, recipient, variables);
          break;
        case 'teams':
          result = await teamsService.sendMessage(message, recipient, variables);
          break;
        case 'inapp':
          result = await this.sendInAppMessage(message);
          break;
      }

      // Update delivery
      if (result.success) {
        await delivery.update({
          status: 'sent',
          deliveryTimestamp: new Date(),
          externalMessageId: result.externalId
        });
      } else {
        await delivery.update({
          status: 'failed',
          failureReason: result.error,
          nextRetryAt: this.calculateNextRetry(0)
        });
      }

      return { message, delivery };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get message status
  async getMessageStatus(messageId) {
    const message = await Message.findByPk(messageId, {
      include: [{ association: 'deliveries' }]
    });

    if (!message) throw new Error('Message not found');

    return {
      id: message.id,
      status: message.deliveries[0]?.status || 'unknown',
      deliveries: message.deliveries,
      createdAt: message.createdAt
    };
  }

  // Calculate next retry time with exponential backoff
  calculateNextRetry(retryCount) {
    const baseDelay = 60; // 60 seconds
    const exponent = Math.min(retryCount, 5); // Cap at 5
    const delay = baseDelay * Math.pow(2, exponent);
    return new Date(Date.now() + delay * 1000);
  }

  // Send in-app message via WebSocket
  async sendInAppMessage(message) {
    // Will be implemented with WebSocket in Phase 12.3
    return { success: true };
  }
}

module.exports = new MessageService();
```

**File: `backend/src/services/emailService.js`**

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
  async sendEmail(message, recipient, variables = {}) {
    try {
      const msg = {
        to: recipient.email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL,
          name: process.env.SENDGRID_FROM_NAME
        },
        subject: this.replaceVariables(message.subject, variables),
        html: this.replaceVariables(message.body, variables),
        headers: {
          'X-Message-ID': message.id,
          'X-Ticket-ID': message.ticketId
        }
      };

      if (message.attachments && message.attachments.length > 0) {
        msg.attachments = message.attachments;
      }

      const result = await sgMail.send(msg);
      
      return {
        success: true,
        externalId: result[0]?.headers['x-message-id'],
        messageId: result[0]?.headers['x-message-id']
      };
    } catch (error) {
      console.error('SendGrid error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  replaceVariables(template, variables) {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }
}

module.exports = new EmailService();
```

**File: `backend/src/services/slackService.js`**

```javascript
const { WebClient } = require('@slack/web-api');

class SlackService {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  async sendMessage(message, recipient, variables = {}) {
    try {
      const text = this.replaceVariables(message.body, variables);

      const result = await this.client.chat.postMessage({
        channel: recipient.slack_user_id,
        text,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Ticket' },
                url: `https://app.company.com/tickets/${message.ticketId}`
              }
            ]
          }
        ]
      });

      return {
        success: true,
        externalId: result.ts
      };
    } catch (error) {
      console.error('Slack error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  replaceVariables(template, variables) {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }
}

module.exports = new SlackService();
```

**File: `backend/src/services/teamsService.js`**

```javascript
const axios = require('axios');

class TeamsService {
  async sendMessage(message, recipient, variables = {}) {
    try {
      const text = this.replaceVariables(message.body, variables);

      const adaptiveCard = {
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                text,
                wrap: true
              }
            ],
            actions: [
              {
                type: 'Action.OpenUrl',
                title: 'View Ticket',
                url: `https://app.company.com/tickets/${message.ticketId}`
              }
            ]
          }
        }]
      };

      const response = await axios.post(
        process.env.TEAMS_WEBHOOK_URL,
        adaptiveCard
      );

      return {
        success: true,
        externalId: response.data?.id || 'teams-' + Date.now()
      };
    } catch (error) {
      console.error('Teams error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  replaceVariables(template, variables) {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }
}

module.exports = new TeamsService();
```

### Step 4: Create Controllers

**File: `backend/src/controllers/messageController.js`**

```javascript
const { Message, MessageDelivery } = require('../models');
const messageService = require('../services/messageService');
const { validationResult } = require('express-validator');

exports.sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { channelType, body, recipient, templateId, variables, ticketId } = req.body;
    const { companyId } = req.user;

    const result = await messageService.sendMessage({
      companyId,
      ticketId,
      senderId: req.user.id,
      templateId,
      channelType,
      body,
      recipient,
      variables
    });

    res.status(201).json({
      id: result.message.id,
      status: result.delivery.status,
      channelType: result.delivery.channelType,
      createdAt: result.message.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const status = await messageService.getMessageStatus(messageId);
    res.json(status);
  } catch (error) {
    res.status(404).json({ error: 'Message not found' });
  }
};

exports.listMessages = async (req, res) => {
  try {
    const { ticketId, companyId } = req.query;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await Message.findAndCountAll({
      where: { ticketId, companyId },
      include: [{ association: 'deliveries' }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      data: messages.rows,
      total: messages.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Step 5: Create Routes

**File: `backend/src/routes/messages.js`**

```javascript
const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const auth = require('../middleware/auth');
const messageController = require('../controllers/messageController');

// Send message
router.post(
  '/send',
  auth,
  body('channelType').isIn(['email', 'slack', 'teams', 'inapp']),
  body('body').notEmpty().isLength({ min: 1, max: 5000 }),
  body('recipient').notEmpty(),
  messageController.sendMessage
);

// Get message status
router.get('/:messageId/status', auth, messageController.getMessageStatus);

// List messages
router.get(
  '/',
  auth,
  query('ticketId').optional().isUUID(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  messageController.listMessages
);

module.exports = router;
```

**Update `backend/src/server.js`:**

```javascript
// Add after other routes
const messagesRoutes = require('./routes/messages');
app.use('/api/messages', messagesRoutes);
```

---

## Phase 12.2: Channel Integrations

*(Continue with Slack, Teams, In-App Chat setup)*

### Step 1: Slack Event Handling

**File: `backend/src/integrations/slackEventHandler.js`**

Configure webhook for incoming Slack messages and event tracking.

### Step 2: Email Webhook

**File: `backend/src/integrations/sendgridWebhook.js`**

Handle SendGrid webhooks for delivery tracking, bounces, and complaints.

### Step 3: Teams Connector

**File: `backend/src/integrations/teamsConnector.js`**

Setup Teams webhook and incoming message handling.

### Step 4: Socket.io Setup

**File: `backend/src/integrations/socketioHandler.js`**

Real-time in-app chat via WebSocket.

---

## Phase 12.3: Frontend Components

### Step 1: Chat Component

**File: `frontend/src/pages/MessageCenter.jsx`**

Multi-channel message interface with tabs for each channel.

### Step 2: Template Management

**File: `frontend/src/pages/MessageTemplates.jsx`**

Create, edit, and test message templates.

### Step 3: Channel Configuration

**File: `frontend/src/pages/NotificationSettings.jsx`**

Configure email, Slack, Teams, and chat settings.

### Step 4: Message Tracking Dashboard

**File: `frontend/src/pages/MessageDeliveryStatus.jsx`**

Monitor delivery status, retries, and failures.

---

## Phase 12.4: Testing & Deployment

### Unit Tests

```bash
# Backend tests
npm run test:backend -- --testPathPattern=message

# Frontend tests
npm run test:frontend -- --testPathPattern=MessageCenter
```

### Integration Tests

Test full message flow through each channel.

### E2E Tests

Test user workflows in production-like environment.

---

## File Structure

```
backend/
├── database/
│   └── migrations/
│       └── 008_create_notification_channels_table.sql
├── src/
│   ├── models/
│   │   ├── NotificationChannel.js
│   │   ├── MessageTemplate.js
│   │   ├── Message.js
│   │   ├── MessageDelivery.js
│   │   └── index.js (updated)
│   ├── services/
│   │   ├── messageService.js
│   │   ├── emailService.js
│   │   ├── slackService.js
│   │   ├── teamsService.js
│   │   └── templateEngine.js
│   ├── controllers/
│   │   ├── messageController.js
│   │   ├── templateController.js
│   │   └── channelController.js
│   ├── routes/
│   │   ├── messages.js
│   │   ├── templates.js
│   │   └── channels.js
│   ├── middleware/
│   │   ├── rateLimiter.js
│   │   └── auth.js (updated)
│   └── integrations/
│       ├── slackEventHandler.js
│       ├── sendgridWebhook.js
│       ├── teamsConnector.js
│       └── socketioHandler.js
└── tests/
    ├── services/
    │   └── messageService.test.js
    └── integration/
        └── messageFlow.test.js

frontend/
├── src/
│   ├── pages/
│   │   ├── MessageCenter.jsx
│   │   ├── MessageTemplates.jsx
│   │   ├── NotificationSettings.jsx
│   │   └── MessageDeliveryStatus.jsx
│   ├── components/
│   │   ├── ChatWindow.jsx
│   │   ├── MessageList.jsx
│   │   ├── ChannelSelector.jsx
│   │   └── TemplateManager.jsx
│   └── services/
│       ├── messageService.js
│       └── socketService.js
└── tests/
    └── components/
        └── MessageCenter.test.js
```

---

## Dependencies

### Backend

```json
{
  "dependencies": {
    "@sendgrid/mail": "^7.7.0",
    "@slack/web-api": "^6.8.0",
    "@slack/bolt": "^3.10.0",
    "axios": "^1.4.0",
    "socket.io": "^4.5.0",
    "node-cache": "^5.1.2",
    "express-rate-limit": "^6.7.0",
    "bull": "^4.10.0"
  }
}
```

### Frontend

```json
{
  "dependencies": {
    "socket.io-client": "^4.5.0",
    "react-hook-form": "^7.43.0",
    "zustand": "^4.3.7"
  }
}
```

---

## Deployment Checklist

- [ ] Database migrations applied
- [ ] All environment variables configured
- [ ] Email credentials verified (SendGrid)
- [ ] Slack app configured and token obtained
- [ ] Teams webhook URL configured
- [ ] Socket.io server running
- [ ] All tests passing (100+ test cases)
- [ ] API endpoints responding correctly
- [ ] Message delivery tracking working
- [ ] Retry logic tested
- [ ] Rate limiting enforced
- [ ] Error handling comprehensive
- [ ] Documentation updated
- [ ] Staging deployment successful
- [ ] UAT sign-off obtained
- [ ] Production deployment

---

## Next Steps

1. ✅ **Architecture Complete** - Review and approve
2. 🚀 **Begin Phase 12.1** - Start database and backend setup
3. 📧 **Configure Email** - SendGrid API integration
4. 💬 **Setup Slack** - Bot token and event subscriptions
5. 👥 **Teams Integration** - Connector setup
6. 💻 **Frontend Build** - Message center components
7. ✔ **Testing** - Full test suite
8. 🚢 **Deployment** - Staging → Production

---

**Document Status**: Ready for Development  
**Created**: March 15, 2026  
**Next Review**: After Phase 12.1 Completion

