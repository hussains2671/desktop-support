# Phase 8: Remote Command Execution System - STEP 2: Implementation Plan

**Date:** 2025-01-XX  
**Phase:** Phase 8  
**Status:** ⏳ PENDING - Awaiting Approval

---

## 📋 Table of Contents

1. [Detailed Implementation Plan](#1-detailed-implementation-plan)
2. [Database Schema](#2-database-schema)
3. [API Endpoints List](#3-api-endpoints-list)
4. [Frontend Components List](#4-frontend-components-list)
5. [Security Measures](#5-security-measures)
6. [Testing Strategy](#6-testing-strategy)

---

## 1. Detailed Implementation Plan

### Phase 8.1: Database Schema (Day 1)

#### Task 1.1: Create Migration File
**File:** `database/migrations/004_create_agent_commands_table.sql`

**Steps:**
1. Create migration file with table definition
2. Add indexes for performance
3. Add foreign key constraints
4. Test migration on development database

**Dependencies:** None

**Estimated Time:** 1-2 hours

#### Task 1.2: Update Schema.sql
**File:** `database/schema.sql`

**Steps:**
1. Add `agent_commands` table definition to schema.sql
2. Add indexes definition
3. Document table structure

**Dependencies:** Task 1.1

**Estimated Time:** 30 minutes

---

### Phase 8.2: Backend Implementation (Day 2-4)

#### Task 2.1: Create Agent Authentication Middleware
**File:** `backend/src/middleware/agentAuth.js` (NEW)

**Purpose:** Reusable middleware for agent authentication

**Implementation:**
- Extract agent authentication logic from agentController
- Validate `X-Agent-Key` header
- Find agent and attach to `req.agent`
- Set `req.companyId` from agent
- Handle errors appropriately

**Dependencies:** None

**Estimated Time:** 1 hour

#### Task 2.2: Create AgentCommand Model
**File:** `backend/src/models/AgentCommand.js` (NEW)

**Fields:**
- id, agent_id, company_id, command_type, command_text
- parameters (JSONB), status, priority, created_by
- created_at, started_at, completed_at
- result_output, result_error, exit_code, execution_time_ms

**Relationships:**
- belongsTo Agent
- belongsTo Company
- belongsTo User (created_by)

**Dependencies:** Task 1.1

**Estimated Time:** 1 hour

#### Task 2.3: Update Models Index
**File:** `backend/src/models/index.js` (MODIFY)

**Changes:**
- Import AgentCommand model
- Add AgentCommand to exports
- Define relationships:
  - Agent.hasMany(AgentCommand)
  - Company.hasMany(AgentCommand)
  - User.hasMany(AgentCommand, { foreignKey: 'created_by' })

**Dependencies:** Task 2.2

**Estimated Time:** 30 minutes

#### Task 2.4: Create Command Controller
**File:** `backend/src/controllers/commandController.js` (NEW)

**Functions to Implement:**

1. **createCommand** (Admin only)
   - Validate input (agent_id, command_type, command_text)
   - Validate command type (whitelist)
   - Validate agent belongs to company
   - Create command record with status 'pending'
   - Audit log
   - Return command object

2. **getPendingCommands** (Agent only)
   - Authenticate agent
   - Get pending commands for agent
   - Order by priority, created_at
   - Return commands array

3. **updateCommandStatus** (Agent only)
   - Authenticate agent
   - Validate command belongs to agent
   - Update status, result_output, result_error, exit_code
   - Calculate execution_time_ms
   - Update started_at, completed_at
   - Audit log

4. **getCommandHistory** (Admin only)
   - Filter by company_id
   - Optional filters: agent_id, status, date range
   - Pagination support
   - Return commands with agent/user info

5. **cancelCommand** (Admin only)
   - Validate command belongs to company
   - Check if command can be cancelled (status = 'pending')
   - Update status to 'cancelled'
   - Audit log

**Dependencies:** Task 2.1, Task 2.2, Task 2.3

**Estimated Time:** 4-5 hours

#### Task 2.5: Create Command Validation
**File:** `backend/src/middleware/commandValidation.js` (NEW)

**Validations:**
- Command type whitelist: ['chkdsk', 'sfc', 'diskpart', 'powershell', 'cmd', 'custom']
- Command text sanitization
- Parameter validation (JSON schema)
- Agent ID validation
- Priority range (1-10, default 5)

**Dependencies:** None

**Estimated Time:** 2 hours

#### Task 2.6: Create Command Routes
**File:** `backend/src/routes/commands.js` (NEW)

**Routes:**
- `POST /api/commands` - authenticate, authorize('admin'), validate, createCommand
- `GET /api/commands/pending` - authenticateAgent, getPendingCommands
- `POST /api/commands/:id/status` - authenticateAgent, validate, updateCommandStatus
- `GET /api/commands/history` - authenticate, authorize('admin', 'technician'), getCommandHistory
- `POST /api/commands/:id/cancel` - authenticate, authorize('admin'), cancelCommand

**Rate Limiting:**
- Admin endpoints: 100 requests/15min
- Agent endpoints: 200 requests/15min (higher for polling)

**Dependencies:** Task 2.4, Task 2.5

**Estimated Time:** 1-2 hours

#### Task 2.7: Register Routes in Server
**File:** `backend/src/server.js` (MODIFY)

**Changes:**
- Import commandsRoutes
- Add: `app.use('/api/commands', commandsRoutes);`

**Dependencies:** Task 2.6

**Estimated Time:** 15 minutes

---

### Phase 8.3: Agent Script Updates (Day 4-5)

#### Task 3.1: Add Command Polling Function
**File:** `agent/DesktopSupportAgent.ps1` (MODIFY)

**Function:** `Get-PendingCommands`

**Implementation:**
- GET request to `/api/commands/pending`
- Use `X-Agent-Key` header
- Handle errors gracefully
- Return commands array or empty array

**Dependencies:** Task 2.6

**Estimated Time:** 1 hour

#### Task 3.2: Add Command Execution Function
**File:** `agent/DesktopSupportAgent.ps1` (MODIFY)

**Function:** `Invoke-CommandExecution`

**Implementation:**
- Accept command object
- Switch on command_type
- Execute appropriate command:
  - `chkdsk`: `chkdsk C: /f /r`
  - `sfc`: `sfc /scannow`
  - `diskpart`: Execute diskpart script
  - `powershell`: Execute PowerShell script
  - `cmd`: Execute CMD command
  - `custom`: Execute custom command
- Capture output and errors
- Measure execution time
- Return result object

**Security:**
- Validate command before execution
- Timeout protection (max 30 minutes)
- Output sanitization
- Error handling

**Dependencies:** Task 3.1

**Estimated Time:** 3-4 hours

#### Task 3.3: Add Command Result Reporting
**File:** `agent/DesktopSupportAgent.ps1` (MODIFY)

**Function:** `Send-CommandResult`

**Implementation:**
- POST request to `/api/commands/:id/status`
- Send status, output, error, exit_code, execution_time_ms
- Handle errors gracefully
- Log result

**Dependencies:** Task 3.2, Task 2.6

**Estimated Time:** 1 hour

#### Task 3.4: Integrate Command Polling in Main Loop
**File:** `agent/DesktopSupportAgent.ps1` (MODIFY)

**Changes:**
- Add command polling in main loop
- Poll every 30 seconds (configurable)
- Execute commands sequentially
- Report results after execution

**Dependencies:** Task 3.1, Task 3.2, Task 3.3

**Estimated Time:** 1 hour

---

### Phase 8.4: Frontend Implementation (Day 5-7)

#### Task 4.1: Create Command Service
**File:** `frontend/src/services/commandService.js` (NEW)

**Functions:**
- `createCommand(agentId, commandType, commandText, parameters)`
- `getCommandHistory(filters, pagination)`
- `cancelCommand(commandId)`
- `getCommandDetails(commandId)`

**Dependencies:** Task 2.6

**Estimated Time:** 1 hour

#### Task 4.2: Create Command Form Component
**File:** `frontend/src/components/Common/CommandForm.jsx` (NEW)

**Features:**
- Agent selection dropdown
- Command type selector (chkdsk, sfc, diskpart, powershell, cmd, custom)
- Command text input/textarea
- Parameters input (JSON editor)
- Priority selector (1-10)
- Predefined command templates
- Validation
- Submit handler

**Dependencies:** Task 4.1

**Estimated Time:** 3-4 hours

#### Task 4.3: Create Command History Component
**File:** `frontend/src/components/Common/CommandHistory.jsx` (NEW)

**Features:**
- Table view with columns:
  - ID, Agent, Command Type, Status, Created At, Completed At, Actions
- Filters:
  - Agent filter
  - Status filter (pending, running, completed, failed, cancelled)
  - Date range filter
- Pagination
- Sort by created_at (desc)
- Status badges (color-coded)
- View details button
- Cancel button (for pending commands)

**Dependencies:** Task 4.1

**Estimated Time:** 3-4 hours

#### Task 4.4: Create Command Output Viewer Component
**File:** `frontend/src/components/Common/CommandOutput.jsx` (NEW)

**Features:**
- Display command details:
  - Command type, text, parameters
  - Status, execution time, exit code
  - Created by, created at, started at, completed at
- Output display:
  - Standard output (scrollable, monospace font)
  - Error output (if any, highlighted)
  - Exit code indicator
- Real-time updates (polling for running commands)
- Copy to clipboard button
- Download output button

**Dependencies:** Task 4.1

**Estimated Time:** 2-3 hours

#### Task 4.5: Create Remote Commands Page
**File:** `frontend/src/pages/RemoteCommands.jsx` (NEW)

**Features:**
- Page layout with tabs/sections:
  - Create Command (CommandForm)
  - Command History (CommandHistory)
- Statistics cards:
  - Total commands, Pending, Running, Completed, Failed
- Real-time updates (polling every 10 seconds)
- Loading states
- Error handling

**Dependencies:** Task 4.2, Task 4.3, Task 4.4

**Estimated Time:** 3-4 hours

#### Task 4.6: Add Route and Navigation
**Files:** 
- `frontend/src/App.jsx` (MODIFY)
- `frontend/src/components/Layout/Sidebar.jsx` (MODIFY - if exists)

**Changes:**
- Add route: `/remote-commands` → RemoteCommands page
- Add menu item: "Remote Commands" (with icon)
- Add authorization check (admin, technician roles)

**Dependencies:** Task 4.5

**Estimated Time:** 30 minutes

---

## 2. Database Schema

### Table: `agent_commands`

```sql
CREATE TABLE IF NOT EXISTS agent_commands (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    command_type VARCHAR(50) NOT NULL CHECK (command_type IN ('chkdsk', 'sfc', 'diskpart', 'powershell', 'cmd', 'custom')),
    command_text TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    result_output TEXT,
    result_error TEXT,
    exit_code INTEGER,
    execution_time_ms INTEGER,
    CONSTRAINT fk_agent_commands_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_agent_commands_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_agent_commands_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_agent_commands_agent ON agent_commands(agent_id);
CREATE INDEX idx_agent_commands_company ON agent_commands(company_id);
CREATE INDEX idx_agent_commands_status ON agent_commands(status);
CREATE INDEX idx_agent_commands_created_at ON agent_commands(created_at DESC);
CREATE INDEX idx_agent_commands_agent_status ON agent_commands(agent_id, status) WHERE status IN ('pending', 'running');
CREATE INDEX idx_agent_commands_company_status ON agent_commands(company_id, status, created_at DESC);
CREATE INDEX idx_agent_commands_created_by ON agent_commands(created_by);
```

### Migration File Structure

**File:** `database/migrations/004_create_agent_commands_table.sql`

```sql
-- ============================================
-- Migration 004: Create agent_commands table
-- Phase 8: Remote Command Execution System
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS agent_commands (
    -- Table definition as above
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_commands_agent ON agent_commands(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commands_company ON agent_commands(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_commands_status ON agent_commands(status);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created_at ON agent_commands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_commands_agent_status ON agent_commands(agent_id, status) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_agent_commands_company_status ON agent_commands(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created_by ON agent_commands(created_by);

COMMIT;
```

---

## 3. API Endpoints List

### 3.1 Admin Endpoints (Require User Authentication)

#### POST `/api/commands`
**Description:** Create a new command for an agent

**Authentication:** Required (JWT token)  
**Authorization:** Admin, Company Admin, Technician roles

**Request Body:**
```json
{
  "agent_id": 1,
  "command_type": "powershell",
  "command_text": "Get-Process | Select-Object -First 10",
  "parameters": {
    "timeout": 300
  },
  "priority": 5
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "agent_id": 1,
    "command_type": "powershell",
    "command_text": "Get-Process | Select-Object -First 10",
    "status": "pending",
    "priority": 5,
    "created_at": "2025-01-XX..."
  }
}
```

**Validation:**
- agent_id: Required, integer, must belong to company
- command_type: Required, enum ['chkdsk', 'sfc', 'diskpart', 'powershell', 'cmd', 'custom']
- command_text: Required, string, max 10000 chars, sanitized
- parameters: Optional, JSON object
- priority: Optional, integer 1-10, default 5

---

#### GET `/api/commands/history`
**Description:** Get command history with filters

**Authentication:** Required (JWT token)  
**Authorization:** Admin, Company Admin, Technician roles

**Query Parameters:**
- `agent_id` (optional): Filter by agent
- `status` (optional): Filter by status
- `start_date` (optional): Filter by start date (ISO format)
- `end_date` (optional): Filter by end date (ISO format)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "commands": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

---

#### POST `/api/commands/:id/cancel`
**Description:** Cancel a pending command

**Authentication:** Required (JWT token)  
**Authorization:** Admin, Company Admin roles

**Response (200):**
```json
{
  "success": true,
  "message": "Command cancelled successfully"
}
```

**Validation:**
- Command must belong to company
- Command status must be 'pending'

---

### 3.2 Agent Endpoints (Require Agent Authentication)

#### GET `/api/commands/pending`
**Description:** Get pending commands for authenticated agent

**Authentication:** Required (X-Agent-Key header)  
**Authorization:** Agent must be authenticated

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "command_type": "powershell",
      "command_text": "Get-Process",
      "parameters": {},
      "priority": 5,
      "created_at": "2025-01-XX..."
    }
  ]
}
```

**Notes:**
- Returns only pending commands for the authenticated agent
- Ordered by priority (desc), then created_at (asc)
- Maximum 10 commands per request

---

#### POST `/api/commands/:id/status`
**Description:** Update command execution status

**Authentication:** Required (X-Agent-Key header)  
**Authorization:** Agent must own the command

**Request Body:**
```json
{
  "status": "completed",
  "result_output": "Process output...",
  "result_error": null,
  "exit_code": 0,
  "execution_time_ms": 1500
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Command status updated"
}
```

**Validation:**
- status: Required, enum ['running', 'completed', 'failed']
- result_output: Optional, string, max 1MB
- result_error: Optional, string, max 1MB
- exit_code: Optional, integer
- execution_time_ms: Optional, integer >= 0

---

## 4. Frontend Components List

### 4.1 Command Service
**File:** `frontend/src/services/commandService.js`

**Functions:**
- `createCommand(data)` - POST /api/commands
- `getCommandHistory(filters)` - GET /api/commands/history
- `cancelCommand(id)` - POST /api/commands/:id/cancel
- `getCommandDetails(id)` - GET /api/commands/:id (if implemented)

---

### 4.2 Command Form Component
**File:** `frontend/src/components/Common/CommandForm.jsx`

**Props:**
- `agents` - Array of agents
- `onSubmit` - Callback function
- `onCancel` - Callback function

**State:**
- agentId, commandType, commandText, parameters, priority
- loading, errors

**Features:**
- Agent dropdown (filtered by company)
- Command type selector with icons
- Command text textarea (monospace)
- Parameters JSON editor (optional)
- Priority slider/input (1-10)
- Predefined templates dropdown
- Form validation
- Submit/Cancel buttons

---

### 4.3 Command History Component
**File:** `frontend/src/components/Common/CommandHistory.jsx`

**Props:**
- `commands` - Array of commands
- `loading` - Loading state
- `onViewDetails` - Callback
- `onCancel` - Callback
- `onFilterChange` - Callback

**Features:**
- Data table with sorting
- Status badges (color-coded)
- Filters (agent, status, date range)
- Pagination
- Actions (View, Cancel)
- Real-time updates indicator

---

### 4.4 Command Output Viewer Component
**File:** `frontend/src/components/Common/CommandOutput.jsx`

**Props:**
- `command` - Command object
- `onClose` - Callback

**Features:**
- Command details card
- Output display (scrollable, monospace)
- Error display (highlighted)
- Exit code indicator
- Execution time display
- Copy to clipboard
- Download output
- Real-time polling (if status = 'running')

---

### 4.5 Remote Commands Page
**File:** `frontend/src/pages/RemoteCommands.jsx`

**Features:**
- Page header with title
- Statistics cards (Total, Pending, Running, Completed, Failed)
- Tabs/Sections:
  - Create Command
  - Command History
- Real-time updates (polling every 10 seconds)
- Loading states
- Error handling
- Responsive design

---

## 5. Security Measures

### 5.1 Authentication & Authorization

#### User Authentication (Admin Endpoints)
- ✅ JWT token required
- ✅ Token validation in `authenticate` middleware
- ✅ User must be active
- ✅ Role-based authorization (admin, technician)

#### Agent Authentication (Agent Endpoints)
- ✅ `X-Agent-Key` header required
- ✅ Agent key validation
- ✅ Agent must exist and be active
- ✅ Company isolation enforced

---

### 5.2 Input Validation

#### Command Creation
- ✅ Command type whitelist validation
- ✅ Command text sanitization (remove dangerous patterns)
- ✅ Parameter validation (JSON schema)
- ✅ Agent ID validation (must belong to company)
- ✅ Priority range validation (1-10)

#### Command Execution (Agent)
- ✅ Command validation before execution
- ✅ Timeout protection (max 30 minutes)
- ✅ Output size limits (1MB max)
- ✅ Exit code validation

---

### 5.3 Command Whitelist

**Allowed Command Types:**
- `chkdsk` - Disk check (C: /f /r)
- `sfc` - System file checker (/scannow)
- `diskpart` - Disk management (script-based)
- `powershell` - PowerShell scripts
- `cmd` - CMD commands
- `custom` - Custom commands (with strict validation)

**Blocked Patterns:**
- ❌ Commands that delete system files
- ❌ Commands that modify registry (unless explicit)
- ❌ Commands that format disks
- ❌ Commands that shutdown/restart (unless explicit)
- ❌ Commands with network operations (unless explicit)

---

### 5.4 Rate Limiting

#### Admin Endpoints
- `POST /api/commands`: 20 requests/15min per user
- `GET /api/commands/history`: 100 requests/15min per user
- `POST /api/commands/:id/cancel`: 10 requests/15min per user

#### Agent Endpoints
- `GET /api/commands/pending`: 200 requests/15min per agent (polling)
- `POST /api/commands/:id/status`: 100 requests/15min per agent

---

### 5.5 Company Isolation

- ✅ All queries filtered by `company_id`
- ✅ Agents can only access their own commands
- ✅ Users can only access commands from their company
- ✅ Validation: Agent must belong to user's company

---

### 5.6 Audit Logging

**Events to Log:**
- Command created (user_id, agent_id, command_type)
- Command started (agent_id, command_id)
- Command completed (agent_id, command_id, exit_code)
- Command failed (agent_id, command_id, error)
- Command cancelled (user_id, command_id)

**Log Fields:**
- user_id, agent_id, command_id, action, timestamp, ip_address

---

### 5.7 Output Sanitization

- ✅ Remove sensitive data from output (passwords, keys)
- ✅ Truncate large outputs (max 1MB)
- ✅ Escape HTML in output display
- ✅ Sanitize error messages

---

### 5.8 Timeout Protection

- ✅ Maximum execution time: 30 minutes
- ✅ Agent must report status within timeout
- ✅ Auto-cancel commands that exceed timeout
- ✅ Alert on timeout

---

## 6. Testing Strategy

### 6.1 Backend Testing

#### Unit Tests
**File:** `backend/tests/controllers/commandController.test.js` (if test framework exists)

**Test Cases:**
1. **createCommand:**
   - ✅ Valid command creation
   - ✅ Invalid agent_id (not in company)
   - ✅ Invalid command_type
   - ✅ Missing required fields
   - ✅ Unauthorized access

2. **getPendingCommands:**
   - ✅ Returns pending commands for agent
   - ✅ Empty array if no pending commands
   - ✅ Invalid agent key
   - ✅ Company isolation

3. **updateCommandStatus:**
   - ✅ Status update to 'running'
   - ✅ Status update to 'completed'
   - ✅ Status update to 'failed'
   - ✅ Invalid command_id
   - ✅ Command not owned by agent

4. **getCommandHistory:**
   - ✅ Returns commands for company
   - ✅ Filters by agent_id
   - ✅ Filters by status
   - ✅ Pagination works
   - ✅ Company isolation

5. **cancelCommand:**
   - ✅ Cancel pending command
   - ✅ Cannot cancel running/completed command
   - ✅ Invalid command_id
   - ✅ Unauthorized access

---

#### Integration Tests
**Test Scenarios:**
1. ✅ Full command lifecycle (create → poll → execute → report)
2. ✅ Multiple agents, multiple commands
3. ✅ Company isolation (agent from company A cannot see company B commands)
4. ✅ Rate limiting enforcement
5. ✅ Timeout handling

---

### 6.2 Agent Testing

#### Manual Testing
**Test Scenarios:**
1. ✅ Agent polls for commands (every 30 seconds)
2. ✅ Agent executes chkdsk command
3. ✅ Agent executes sfc command
4. ✅ Agent executes PowerShell command
5. ✅ Agent executes CMD command
6. ✅ Agent handles command timeout
7. ✅ Agent reports errors correctly
8. ✅ Agent handles network errors gracefully

**Test Commands:**
```powershell
# Test chkdsk
chkdsk C: /f /r

# Test sfc
sfc /scannow

# Test PowerShell
Get-Process | Select-Object -First 10

# Test CMD
dir C:\

# Test custom
ipconfig /all
```

---

### 6.3 Frontend Testing

#### Manual Testing
**Test Scenarios:**
1. ✅ Create command form validation
2. ✅ Command history display
3. ✅ Command output viewer
4. ✅ Real-time updates (polling)
5. ✅ Cancel command functionality
6. ✅ Filters and pagination
7. ✅ Error handling
8. ✅ Loading states
9. ✅ Responsive design

**Browser Testing:**
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Mobile responsive

---

### 6.4 Security Testing

#### Test Cases:
1. ✅ Unauthorized access attempts
2. ✅ Cross-company access attempts
3. ✅ Command injection attempts
4. ✅ Rate limiting enforcement
5. ✅ Input validation (malicious inputs)
6. ✅ Output sanitization
7. ✅ Timeout protection

**Security Test Commands:**
```powershell
# Should be blocked or sanitized
rm -rf /
format C:
del /f /s /q C:\Windows
```

---

### 6.5 Performance Testing

#### Test Scenarios:
1. ✅ Database query performance (with indexes)
2. ✅ Command polling performance (multiple agents)
3. ✅ Frontend rendering (large command history)
4. ✅ Real-time updates (multiple concurrent commands)

**Performance Targets:**
- Command creation: < 100ms
- Command polling: < 50ms
- Command history query: < 200ms (with pagination)
- Frontend render: < 500ms

---

### 6.6 End-to-End Testing

#### Test Flow:
1. ✅ Admin creates command via UI
2. ✅ Agent polls and receives command
3. ✅ Agent executes command
4. ✅ Agent reports result
5. ✅ Admin views result in UI
6. ✅ Admin cancels pending command
7. ✅ Agent handles cancellation

---

## 📊 Implementation Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|-------------|
| 8.1 Database | Migration, Schema update | 1-2 hours | None |
| 8.2 Backend | Middleware, Model, Controller, Routes | 8-10 hours | 8.1 |
| 8.3 Agent | Polling, Execution, Reporting | 6-7 hours | 8.2 |
| 8.4 Frontend | Components, Page, Integration | 10-12 hours | 8.2 |
| **Total** | **All tasks** | **25-31 hours** | **~5-7 days** |

---

## ✅ Success Criteria

### Backend:
- ✅ All API endpoints working
- ✅ Security validated (authentication, authorization, validation)
- ✅ Company isolation verified
- ✅ Rate limiting working
- ✅ Audit logging implemented

### Agent:
- ✅ Command polling working
- ✅ Command execution working (all types)
- ✅ Result reporting working
- ✅ Error handling working
- ✅ Timeout protection working

### Frontend:
- ✅ Command creation UI working
- ✅ Command history display working
- ✅ Command output viewer working
- ✅ Real-time updates working
- ✅ All features tested

---

## 🚀 Ready for Implementation

**Status:** ✅ **PLAN COMPLETE - AWAITING APPROVAL**

All implementation details, database schema, API endpoints, frontend components, security measures, and testing strategy have been defined.

**Next Steps:**
1. ✅ Review and approve this implementation plan
2. ⏳ Proceed to STEP 3: Implementation (after approval)

---

**Prepared By:** AI Assistant  
**Date:** 2025-01-XX  
**Version:** 1.0

