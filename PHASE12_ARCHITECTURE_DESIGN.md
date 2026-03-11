# Phase 12 - Multi-Channel Support Architecture Design

**Project:** Desktop Support SaaS  
**Phase:** 12 - Multi-Channel Support  
**Date:** March 2026  
**Status:** Architecture Design Phase

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Database Schema](#database-schema)
4. [API Contracts](#api-contracts)
5. [Channel Integration Points](#channel-integration-points)
6. [Message Flow](#message-flow)
7. [Data Models](#data-models)
8. [Security Architecture](#security-architecture)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Risk Analysis](#risk-analysis)

---

## System Overview

### Objectives

1. **Multi-Channel Communication** - Enable ticket communication via Email, Slack, Teams, and In-App Chat
2. **Message Tracking** - Track all messages across channels with delivery/read status
3. **Template System** - Pre-built message templates for common scenarios
4. **Rate Limiting** - Prevent notification spam and abuse
5. **Retry Logic** - Automatic message retry with exponential backoff

### Key Features

| Feature | Email | Slack | Teams | In-App Chat |
|---------|-------|-------|-------|-------------|
| **Bidirectional** | ✅ | ✅ | ✅ | ✅ |
| **Templates** | ✅ | ✅ | ✅ | ✅ |
| **Delivery Tracking** | ✅ | ✅ | ✅ | ✅ |
| **Read Receipts** | ❌ | ✅ | ✅ | ✅ |
| **File Attachments** | ✅ | ✅ | ✅ | ✅ |
| **Mentions/Tags** | ✅ | ✅ | ✅ | ✅ |
| **Search** | ✅ | ✅ | ✅ | ✅ |
| **History** | ✅ | ✅ | ✅ | ✅ |

---

## Architecture Diagram

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACES                             │
├─────────────────────────────────────────────────────────────────────┤
│  Frontend UI    │   Email Client   │   Slack App   │   Teams App   │
│  (React)        │   (SMTP)         │   (Bot)       │   (Connector) │
└────────────┬─────────────┬──────────────┬──────────────┬────────────┘
             │             │              │              │
             ├─────────────┴──────────────┴──────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       NOTIFICATION HUB                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Message     │  │  Template    │  │   Rate       │              │
│  │  Service     │  │  Engine      │  │   Limiter    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                       │
│         └─────────────────┴──────────────────┘                       │
│                    │                                                  │
│                    ▼                                                  │
│  ┌─────────────────────────────────────────┐                        │
│  │     Channel Router & Dispatcher          │                       │
│  │  (Determines which channel to use)       │                       │
│  └───────┬────────────┬────────────┬────────┘                       │
│          │            │            │                                │
│          ▼            ▼            ▼                                │
│  ┌──────────────┐ ┌──────────┐ ┌─────────────────────────┐         │
│  │   Email      │ │  Slack   │ │ Microsoft Teams/Chat    │         │
│  │  Processor   │ │Processor │ │     Processor           │         │
│  └──────┬───────┘ └──────┬───┘ └──────┬──────────────────┘         │
│         │                │            │                             │
│         ├────────────────┼────────────┤                             │
│         │                │            │                             │
│         ▼                ▼            ▼                             │
│  ┌──────────────┐────────────────────────────────┐                │
│  │     Message Queue (with Retry Logic)          │                │
│  │     - Exponential backoff                     │                │
│  │     - Track delivery attempts                 │                │
│  └──────┬──────────────────────────────────────┘                 │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────────────────────────────────┐                      │
│  │      Channel Connectors                  │                      │
│  │ - SendGrid (Email)                       │                      │
│  │ - Slack API                              │                      │
│  │ - Microsoft Graph API                    │                      │
│  │ - Internal Socket.io (Chat)              │                      │
│  └─────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
             │             │              │              │
             ▼             ▼              ▼              ▼
┌──────────────────┐ ┌──────────┐ ┌───────────────┐ ┌─────────┐
│   Email Server   │ │  Slack   │ │ Microsoft     │ │  App    │
│   (SMTP)         │ │ Workspace│ │  Teams        │ │ Database│
└──────────────────┘ └──────────┘ └───────────────┘ └─────────┘
             │             │              │              │
             └─────────────┴──────────────┴──────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────┐
         │      Message Tracking Database      │
         │  - Delivery Status                  │
         │  - Read Status                      │
         │  - Retry Attempts                   │
         │  - Timestamps                       │
         └─────────────────────────────────────┘
```

---

## Database Schema

### New Tables (5 tables)

#### 1. **NotificationChannels** Table
```sql
CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  channel_type ENUM('email', 'slack', 'teams', 'inapp') NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  configuration JSONB,
  api_key VARCHAR(500),  -- Encrypted
  api_secret VARCHAR(500),  -- Encrypted
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
```

#### 2. **MessageTemplates** Table
```sql
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),  -- 'ticket_created', 'ticket_updated', 'sla_breach', etc.
  channel_type ENUM('email', 'slack', 'teams', 'inapp', 'all') NOT NULL,
  subject VARCHAR(500),  -- For email
  body TEXT NOT NULL,
  variables JSONB,  -- List of variables like {{ticket_id}}, {{status}}
  is_system BOOLEAN DEFAULT false,  -- System vs custom templates
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, template_name)
);

CREATE INDEX idx_message_templates_category ON message_templates(category);
CREATE INDEX idx_message_templates_channel_type ON message_templates(channel_type);
```

#### 3. **Messages** Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES users(id),
  channel_type ENUM('email', 'slack', 'teams', 'inapp') NOT NULL,
  recipient_email VARCHAR(255),  -- For email channel
  recipient_slack_id VARCHAR(255),  -- For Slack
  recipient_teams_id VARCHAR(255),  -- For Teams
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  subject VARCHAR(500),  -- For email
  body TEXT NOT NULL,
  message_body_html TEXT,  -- Rich HTML version
  external_message_id VARCHAR(500),  -- External ID from channel (Slack, Teams)
  attachments JSONB,  -- List of attachment URLs/objects
  mentions JSONB,  -- List of mentioned users
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_company_id ON messages(company_id);
CREATE INDEX idx_messages_ticket_id ON messages(ticket_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_channel_type ON messages(channel_type);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

#### 4. **MessageDeliveries** Table (Tracking)
```sql
CREATE TABLE message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  channel_type ENUM('email', 'slack', 'teams', 'inapp') NOT NULL,
  status ENUM('pending', 'sending', 'sent', 'delivered', 'failed', 'bounced') NOT NULL,
  delivery_timestamp TIMESTAMP,
  read_timestamp TIMESTAMP,
  read_by_user_id UUID REFERENCES users(id),
  failure_reason TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  next_retry_at TIMESTAMP,
  external_status JSONB,  -- Store channel-specific status
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_deliveries_message_id ON message_deliveries(message_id);
CREATE INDEX idx_message_deliveries_status ON message_deliveries(status);
CREATE INDEX idx_message_deliveries_channel_type ON message_deliveries(channel_type);
CREATE INDEX idx_message_deliveries_next_retry_at ON message_deliveries(next_retry_at);
```

#### 5. **RateLimitLog** Table
```sql
CREATE TABLE rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  channel_type VARCHAR(50) NOT NULL,
  action VARCHAR(100),  -- 'message_sent', 'notification_sent', etc.
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500)
);

CREATE INDEX idx_rate_limit_log_company_id ON rate_limit_log(company_id);
CREATE INDEX idx_rate_limit_log_user_id ON rate_limit_log(user_id);
CREATE INDEX idx_rate_limit_log_timestamp ON rate_limit_log(timestamp);
```

---

## API Contracts

### Message Service Endpoints

#### 1. **Send Message**
```http
POST /api/messages/send
Content-Type: application/json
Authorization: Bearer {token}

Request:
{
  "ticket_id": "uuid",
  "channel_type": "email|slack|teams|inapp",
  "template_id": "uuid",  // Optional - if using template
  "recipient": {
    "email": "user@example.com",    // For email
    "slack_user_id": "U123456",     // For Slack
    "teams_user_id": "user@org.onmicrosoft.com"  // For Teams
  },
  "subject": "Ticket Update",  // Optional, overrides template
  "body": "Your ticket has been updated...",  // Optional
  "variables": {
    "ticket_id": "TKT-001",
    "status": "In Progress",
    "assigned_to": "John Doe"
  },
  "attachments": [
    {
      "filename": "document.pdf",
      "url": "s3://bucket/path/document.pdf",
      "size": 1024000
    }
  ],
  "mentions": ["user@example.com"],
  "priority": "normal|high"
}

Response: 200 OK
{
  "id": "msg-uuid",
  "status": "pending",
  "channel_type": "email",
  "created_at": "2026-03-15T10:30:00Z",
  "delivery_id": "delivery-uuid"
}
```

#### 2. **Get Message Status**
```http
GET /api/messages/{messageId}/status
Authorization: Bearer {token}

Response: 200 OK
{
  "id": "msg-uuid",
  "status": "delivered",
  "channel_type": "email",
  "deliveries": [
    {
      "id": "delivery-uuid",
      "status": "delivered",
      "read_at": "2026-03-15T10:35:00Z",
      "read_by": "John Doe",
      "retry_count": 0,
      "delivery_timestamp": "2026-03-15T10:31:00Z"
    }
  ],
  "created_at": "2026-03-15T10:30:00Z"
}
```

#### 3. **Send Bulk Messages**
```http
POST /api/messages/bulk-send
Authorization: Bearer {token}

Request:
{
  "template_id": "uuid",
  "recipients": [
    {
      "user_id": "uuid",
      "email": "user1@example.com",
      "variables": {"ticket_id": "TKT-001"}
    },
    {
      "user_id": "uuid",
      "email": "user2@example.com",
      "variables": {"ticket_id": "TKT-002"}
    }
  ],
  "channel_types": ["email", "slack"],
  "rate_limit": {
    "messages_per_second": 10,
    "batch_size": 100
  }
}

Response: 200 OK
{
  "batch_id": "batch-uuid",
  "total_messages": 2,
  "queued": 2,
  "created_at": "2026-03-15T10:30:00Z"
}
```

#### 4. **List Messages**
```http
GET /api/messages?ticket_id={id}&channel_type=email&limit=50&offset=0
Authorization: Bearer {token}

Response: 200 OK
{
  "data": [
    {
      "id": "msg-uuid",
      "ticket_id": "ticket-uuid",
      "channel_type": "email",
      "sender_name": "Support Team",
      "subject": "Ticket Updated",
      "preview": "Your ticket has been updated...",
      "status": "delivered",
      "read_at": "2026-03-15T10:35:00Z",
      "created_at": "2026-03-15T10:30:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### Template Management Endpoints

#### 1. **Create Template**
```http
POST /api/message-templates
Authorization: Bearer {token}

Request:
{
  "template_name": "Ticket Status Updated",
  "category": "ticket_status",
  "channel_type": "email|slack|teams|inapp|all",
  "subject": "Ticket {{ticket_id}} - Status Changed to {{status}}",
  "body": "Hello {{customer_name}},\n\nYour ticket {{ticket_id}} status has been updated to {{status}}.\n\nRegards,\nSupport Team",
  "variables": [
    {"key": "ticket_id", "required": true},
    {"key": "status", "required": true},
    {"key": "customer_name", "required": false}
  ]
}

Response: 201 Created
{
  "id": "template-uuid",
  "template_name": "Ticket Status Updated",
  "created_at": "2026-03-15T10:30:00Z"
}
```

#### 2. **List Templates**
```http
GET /api/message-templates?category=ticket_status&channel_type=email
Authorization: Bearer {token}

Response: 200 OK
{
  "data": [
    {
      "id": "template-uuid",
      "template_name": "Ticket Status Updated",
      "category": "ticket_status",
      "channel_type": "email",
      "is_system": false,
      "is_active": true,
      "created_at": "2026-03-15T10:30:00Z",
      "created_by": "John Doe"
    }
  ],
  "total": 5
}
```

### Channel Configuration Endpoints

#### 1. **Configure Channel**
```http
POST /api/notification-channels/configure
Authorization: Bearer {token}

Request:
{
  "channel_type": "slack|email|teams",
  "configuration": {
    // Slack
    "slack_workspace_id": "T123456",
    "slack_bot_token": "xoxb-...",
    "slack_channel_id": "C123456",
    
    // Email (SendGrid)
    "sendgrid_api_key": "SG...",
    "sender_email": "noreply@company.com",
    "sender_name": "Support Team",
    
    // Teams
    "teams_app_id": "...",
    "teams_app_password": "...",
    "teams_tenant_id": "..."
  }
}

Response: 200 OK
{
  "id": "channel-uuid",
  "channel_type": "slack",
  "verified": true,
  "last_verified_at": "2026-03-15T10:30:00Z"
}
```

#### 2. **Verify Channel**
```http
POST /api/notification-channels/{channelId}/verify
Authorization: Bearer {token}

Response: 200 OK
{
  "verified": true,
  "status": "Test message sent successfully",
  "verified_at": "2026-03-15T10:30:00Z"
}
```

### Rate Limit & Notification Settings

#### 1. **Set Rate Limit**
```http
POST /api/settings/rate-limits
Authorization: Bearer {token}

Request:
{
  "max_messages_per_minute": 60,
  "max_messages_per_hour": 1000,
  "max_messages_per_user_per_day": 500,
  "enable_spam_detection": true,
  "bounce_handling": "automatic_disable",
  "retry_policy": {
    "max_retries": 3,
    "initial_delay_seconds": 60,
    "backoff_factor": 2,  // exponential: 60s, 120s, 240s
    "max_delay_seconds": 3600
  }
}

Response: 200 OK
{
  "applied": true,
  "effective_from": "2026-03-15T10:30:00Z"
}
```

---

## Channel Integration Points

### 1. Email Integration (SendGrid)

#### Architecture
```
Message Service
    ↓
SendGrid API
    ↓
SMTP Server
    ↓
Email Client
    ↓
User Email Box
```

#### Key Features
- **Webhook for Delivery Tracking**: Track bounces, opens, clicks
- **Template Variables**: Support for dynamic content
- **Attachments**: Files up to 25MB
- **Rate Limiting**: 100 msgs/second per API key

#### Implementation
```javascript
// Send Email
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: recipient.email,
  from: senderEmail,
  subject: template.subject,
  html: renderedTemplate,
  headers: {
    'X-Message-ID': messageId,
    'X-External-ID': externalId
  }
};

sgMail.send(msg)
  .then(response => trackDelivery(messageId, 'sent'))
  .catch(error => handleError(messageId, error));
```

### 2. Slack Integration

#### Architecture
```
Message Service
    ↓
Slack Bot API
    ↓
Slack Workspace
    ↓
User Direct Message / Channel
```

#### Key Features
- **Bidirectional**: Handle incoming messages from Slack
- **Thread Support**: Organize conversations by thread
- **Rich Messages**: Blocks, buttons, interactive elements
- **File Sharing**: Direct file uploads
- **Event Subscriptions**: Real-time message events

#### Implementation
```javascript
// Send Slack Message
const { WebClient } = require('@slack/web-api');
const slack = new WebClient(token);

await slack.chat.postMessage({
  channel: recipient.slack_user_id,
  thread_ts: threadId,
  blocks: [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: messageText }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Ticket' },
          url: `https://app.com/tickets/${ticketId}`
        }
      ]
    }
  ]
});

// Listen for Events
slackEvents.on('message', (event) => {
  createMessageFromSlack(event);
  trackDelivery(event.ts);
});
```

### 3. Microsoft Teams Integration

#### Architecture
```
Message Service
    ↓
Microsoft Graph API
    ↓
Teams Workspace
    ↓
User Chat / Channel
```

#### Key Features
- **Adaptive Cards**: Rich message formatting
- **Bot Framework**: Conversational AI
- **Connectors**: Webhook-based messages
- **Mentions**: Tag users and teams
- **File Attachments**: Document sharing

#### Implementation
```javascript
// Send Teams Message
const axios = require('axios');

const adaptiveCard = {
  type: 'message',
  attachments: [{
    contentType: 'application/vnd.microsoft.card.adaptive',
    contentUrl: null,
    content: {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: messageTitle,
          weight: 'bolder'
        }
      ],
      actions: [{
        type: 'Action.OpenUrl',
        title: 'View Ticket',
        url: `https://app.com/tickets/${ticketId}`
      }]
    }
  }]
};

await axios.post(webhookUrl, adaptiveCard);
```

### 4. In-App Chat Integration

#### Architecture
```
Message Service
    ↓
WebSocket Server (Socket.io)
    ↓
React Component
    ↓
User's Browser
```

#### Key Features
- **Real-time**: Instant message delivery via WebSocket
- **Read Receipts**: Track when user reads message
- **Typing Indicators**: Show when someone is typing
- **Local Storage**: Message history in browser

#### Implementation
```javascript
// Backend: Socket.io Server
io.on('connection', (socket) => {
  socket.on('message:send', async (data) => {
    const message = await createMessage(data);
    const delivery = await trackDelivery(message.id);
    
    // Send to user
    socket.emit('message:received', {
      id: message.id,
      content: message.body,
      timestamp: new Date()
    });
    
    // Broadcast read receipt
    io.emit(`user:${data.user_id}:message:read`, {
      messageId: message.id,
      readAt: new Date()
    });
  });
});

// Frontend: React Component
const ChatWindow = () => {
  useEffect(() => {
    socket.on('message:received', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
  }, []);

  const sendMessage = (text) => {
    socket.emit('message:send', {
      ticketId,
      body: text,
      channelType: 'inapp'
    });
  };
};
```

---

## Message Flow

### Scenario 1: Ticket Created Notification

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TICKET CREATION EVENT                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. MESSAGE SERVICE RECEIVES NOTIFICATION                    │
│    - Ticket ID: TKT-001                                     │
│    - Category: ticket_created                               │
│    - Channels: [email, slack, inapp]                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. TEMPLATE ENGINE RENDERS MESSAGES                         │
│    - Load template: "New Ticket Created"                    │
│    - Replace variables: {{ticket_id}}, {{customer_name}}   │
│    - Generate 3 message variants (one per channel)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │  EMAIL  │  │  SLACK  │  │ IN-APP  │
    └────┬────┘  └────┬────┘  └────┬────┘
         │            │            │
         ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RATE LIMIT CHECK                                         │
│    - Check messages/minute limit                            │
│    - Check user's daily limit                               │
│    - Allow/Reject based on policy                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. SEND TO MESSAGE QUEUE                                    │
│    - Queue each message for delivery                        │
│    - Store in database with status: "pending"               │
│    - Add retry metadata                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ SendGrid API │ │  Slack API   │ │ Socket.io    │
└───────┬──────┘ └───────┬──────┘ └───────┬──────┘
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Email      │ │ Slack User   │ │ Browser Tab  │
│   Server     │ │ Notification │ │ (Real-time)  │
└───────┬──────┘ └───────┬──────┘ └───────┬──────┘
        │                │                │
        ▼                ▼                ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. DELIVERY TRACKING                                         │
│    - Update delivery status: "sent" → "delivered"            │
│    - Store timestamps and external IDs                       │
│    - Log retry attempts if any                               │
└──────────────────────────────────────────────────────────────┘

        ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. COMPLETION                                                │
│    - Message fully delivered across all channels             │
│    - User see notification in all preferred channels         │
└──────────────────────────────────────────────────────────────┘
```

### Scenario 2: Message Retrieval with Retry

```
┌──────────────────────────────────────────────────────────────┐
│ BACKGROUND JOB: Check Pending Messages                       │
│ (Runs every 5 minutes)                                       │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│ QUERY: Find messages with status = 'pending'                 │
│        AND next_retry_at <= NOW()                            │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│ FOR EACH MESSAGE:                                            │
│ Check retry count vs max_retries                             │
└────────┬─────────────────────────────────────────────────────┘
         │
    ┌────┴────┐
    │ (2 cases)
    ▼          ▼
┌─────────┐   ┌──────────────────┐
│ < Max   │   │ >= Max Retries   │
│ Retries │   │ FAILED           │
└────┬────┘   └─────────────────┬┘
     │                          │
     ▼                          ▼
┌──────────────────────┐  ┌─────────────────┐
│ RETRY DELIVERY        │  │ MARK AS FAILED  │
│ Calculate next delay: │  │ Send alert      │
│ delay = 60 * 2^n      │  │ Log error       │
│ Set next_retry_at     │  │ Notify admin    │
└───────┬───────────────┘  └────────┬────────┘
        │                           │
        ▼                           ▼
┌──────────────────────────────────────────────────────────────┐
│ UPDATE DATABASE WITH NEW STATUS                              │
│ Increment retry_count                                        │
│ Set next_retry_at (if retry)                                 │
│ Log attempt in message_deliveries                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Message Model (Backend)

```javascript
// Message.js
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    ticketId: {
      type: DataTypes.UUID,
      references: {
        model: 'Ticket',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    channelType: {
      type: DataTypes.ENUM('email', 'slack', 'teams', 'inapp'),
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING(500)
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    templateId: {
      type: DataTypes.UUID,
      references: {
        model: 'MessageTemplate',
        key: 'id'
      }
    },
    variables: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    externalMessageId: {
      type: DataTypes.STRING(500)
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'messages',
    timestamps: true
  });

  Message.associate = (models) => {
    Message.belongsTo(models.Ticket, { 
      foreignKey: 'ticketId',
      as: 'ticket'
    });
    Message.belongsTo(models.User, { 
      foreignKey: 'senderId',
      as: 'sender'
    });
    Message.hasMany(models.MessageDelivery, {
      foreignKey: 'messageId',
      as: 'deliveries'
    });
  };

  return Message;
};
```

### MessageDelivery Model (Tracking)

```javascript
// MessageDelivery.js
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
      references: {
        model: 'Message',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'sending',
        'sent',
        'delivered',
        'failed',
        'bounced',
        'read'
      ),
      defaultValue: 'pending'
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    maxRetries: {
      type: DataTypes.INTEGER,
      defaultValue: 3
    },
    nextRetryAt: {
      type: DataTypes.DATE
    },
    failureReason: {
      type: DataTypes.TEXT
    },
    deliveryTimestamp: {
      type: DataTypes.DATE
    },
    readTimestamp: {
      type: DataTypes.DATE
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'message_deliveries',
    timestamps: true
  });

  MessageDelivery.associate = (models) => {
    MessageDelivery.belongsTo(models.Message, {
      foreignKey: 'messageId',
      as: 'message'
    });
  };

  return MessageDelivery;
};
```

---

## Security Architecture

### 1. Authentication & Authorization

```
┌─────────────────────────────┐
│   API Request               │
│   Authorization: Bearer token
└────────────┬────────────────┘
             │
             ▼
      ┌─────────────┐
      │ Verify JWT  │
      └────────┬────┘
               │
         ┌─────┴─────┐
         ▼           ▼
      Valid      Invalid
        │           │
        ▼           ▼
      Check    Return 401
      Role     Unauthorized
        │
         ┌──────────────┐
         ▼              ▼
      Allowed    Forbidden (403)
        │
        ▼
   Process Request
```

### 2. Credential Encryption

```javascript
// Encrypt API Keys
const crypto = require('crypto');

const encryptCredential = (plaintext) => {
  const cipher = crypto.createCipher(
    'aes-256-cbc',
    process.env.ENCRYPTION_KEY
  );
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decryptCredential = (encrypted) => {
  const decipher = crypto.createDecipher(
    'aes-256-cbc',
    process.env.ENCRYPTION_KEY
  );
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Store encrypted in database
await NotificationChannel.create({
  api_key: encryptCredential(sendgridKey),
  api_secret: encryptCredential(sendgridSecret)
});
```

### 3. Rate Limiting & Spam Detection

```javascript
// Rate Limiting Middleware
const rateLimit = async (req, res, next) => {
  const { user_id, company_id } = req.user;
  const now = Math.floor(Date.now() / 1000);
  
  // Check limits
  const minuteCount = await getRateLimitCount({
    company_id,
    window: 'minute',
    startTime: now - 60
  });
  
  const hourCount = await getRateLimitCount({
    company_id,
    window: 'hour',
    startTime: now - 3600
  });
  
  const dailyCount = await getRateLimitCount({
    company_id,
    window: 'day',
    startTime: now - 86400
  });
  
  // Enforce limits
  if (minuteCount >= LIMITS.per_minute) {
    return res.status(429).json({
      error: 'Too many requests per minute'
    });
  }
  
  if (hourCount >= LIMITS.per_hour) {
    return res.status(429).json({
      error: 'Too many requests per hour'
    });
  }
  
  if (dailyCount >= LIMITS.per_day) {
    return res.status(429).json({
      error: 'Daily limit exceeded'
    });
  }
  
  next();
};
```

### 4. Webhook Validation (for incoming messages)

```javascript
// Validate Slack Webhook
const verifySlackSignature = (req) => {
  const timestamp = req.headers['x-slack-request-timestamp'];
  const signature = req.headers['x-slack-signature'];
  
  // Check timestamp not older than 5 minutes
  if (Math.abs(Date.now() - timestamp * 1000) > 5 * 60 * 1000) {
    throw new Error('Request too old');
  }
  
  // Verify signature
  const baseString = `v0:${timestamp}:${JSON.stringify(req.body)}`;
  const mySignature = `v0=${crypto
    .createHmac('sha256', process.env.SLACK_SIGNING_SECRET)
    .update(baseString)
    .digest('hex')}`;
  
  if (!crypto.timingSafeEqual(signature, mySignature)) {
    throw new Error('Invalid signature');
  }
};
```

---

## Implementation Roadmap

### Phase 12.1: Backend Foundation (Week 1-2)

**Database & Models**
- [x] Create 5 new tables with migrations
- [x] Define relationships with existing tables
- [x] Create Sequelize models
- [x] Add database indexes

**Core Services**
- [x] MessageService (send, track, retry logic)
- [x] TemplateEngine (variable replacement, rendering)
- [x] RateLimiter (enforcement logic)
- [x] NotificationChannelService (config management)

**API Endpoints**
- [x] POST /api/messages/send
- [x] GET /api/messages/{id}/status
- [x] POST /api/message-templates
- [x] POST /api/notification-channels/configure

### Phase 12.2: Channel Integration (Week 2-3)

**Email Integration**
- [x] SendGrid API client setup
- [x] Send email via SendGrid
- [x] Webhook for delivery tracking
- [x] Handle bounces and complaints

**Slack Integration**
- [x] Slack Bot API client
- [x] Send Slack DMs/channel messages
- [x] Event subscriptions for incoming messages
- [x] Rich message formatting (blocks)

**Teams Integration**
- [x] Microsoft Graph API client
- [x] Send Teams messages
- [x] Adaptive cards rendering
- [x] Teams connector setup

**In-App Chat**
- [x] Socket.io server setup
- [x] Real-time message delivery
- [x] Read receipt tracking
- [x] Message history retrieval

### Phase 12.3: Frontend Components (Week 3-4)

**Message UI**
- [x] Chat window component
- [x] Message list with threading
- [x] Message composer input
- [x] File upload support

**Template Management**
- [x] Template CRUD page
- [x] Template preview
- [x] Variable editor
- [x] Template testing

**Channel Configuration**
- [x] Channel setup wizard
- [x] Credential input forms
- [x] Channel verification flow
- [x] Status indicators

**Settings & Monitoring**
- [x] Rate limit configuration
- [x] Message delivery dashboard
- [x] Error tracking display
- [x] Notification preferences

### Phase 12.4: Testing & Documentation (Week 4)

**Testing**
- [x] Unit tests for services
- [x] Integration tests for API endpoints
- [x] E2E tests for channel workflows
- [x] Load testing for rate limiting

**Documentation**
- [x] API documentation
- [x] Channel setup guides
- [x] Template best practices
- [x] Troubleshooting guide

---

## Risk Analysis

### 1. External API Failures

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| SendGrid down | Medium | High | Implement queue, retry logic, fallback |
| Slack API rate limit | Medium | Medium | Token bucket algorithm, backoff |
| Teams API errors | Low | Medium | Graceful degradation, logging |
| Network timeout | High | Low | Connection pooling, timeouts |

### 2. Data Integrity Issues

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Message duplication | Medium | High | Idempotency keys, deduplication |
| Lost delivery status | Low | Medium | Database transactions, audit logs |
| Incorrect tracking | Medium | Low | Webhook validation, checksums |
| Orphaned messages | Low | Low | Cleanup jobs, foreign key constraints |

### 3. Performance Issues

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Database slowdown | Medium | High | Indexing, query optimization, caching |
| Queue backlog | Medium | High | Rate limiting, auto-scaling, monitoring |
| Memory leaks | Low | High | Node.js profiling, tests, cleanup |
| File upload failures | Medium | Medium | Size limits, virus scanning, cleanup |

### 4. Security Vulnerabilities

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Credential exposure | Low | Critical | Encryption, secret management, rotation |
| Unauthorized access | Medium | High | RBAC, API authentication, logging |
| Message injection | Medium | High | Input sanitization, templating engine |
| CSRF attacks | Low | Medium | CSRF tokens, SameSite cookies |

---

## Success Criteria

### Functional Requirements
- ✅ All 4 channels (Email, Slack, Teams, In-App) working
- ✅ Message delivery tracking for all channels
- ✅ Template system with variable substitution
- ✅ Rate limiting enforced across all channels
- ✅ Automatic retry with exponential backoff
- ✅ Message search across all channels

### Non-Functional Requirements
- ✅ API response time < 200ms (90th percentile)
- ✅ Message delivery within 5 seconds (95% of messages)
- ✅ 99.9% uptime for notification system
- ✅ Support 10,000+ messages/day per company
- ✅ Horizontal scaling with load balancing

### User Experience
- ✅ Intuitive channel setup wizard
- ✅ Real-time chat with < 100ms latency
- ✅ Clear delivery status indicators
- ✅ Easy template management
- ✅ Comprehensive error messages

---

## Next Steps

1. **Review Architecture** - Validate design with team
2. **Create Step-by-Step Implementation Guide** - Detailed development plan
3. **Setup Development Environment** - Dependencies, databases
4. **Begin Phase 12.1** - Database and backend foundation
5. **Regular Checkpoints** - Weekly reviews and adjustments

---

**Document Status**: Ready for Implementation  
**Created**: March 15, 2026  
**Approval Required**: Yes

