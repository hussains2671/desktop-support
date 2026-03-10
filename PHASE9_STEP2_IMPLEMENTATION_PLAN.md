# Phase 9: Remote Desktop & Control - STEP 2: Implementation Plan

**Date:** 2025-01-XX  
**Phase:** Phase 9  
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

### Phase 9.1: Database Schema (Day 1)

#### Task 1.1: Create Remote Sessions Migration
**File:** `database/migrations/005_create_remote_sessions_table.sql`

**Steps:**
1. Create migration file with `remote_sessions` table definition
2. Add indexes for performance (agent_id, company_id, status, user_id)
3. Add foreign key constraints
4. Add check constraints for status and session_type
5. Test migration on development database

**Dependencies:** None

**Estimated Time:** 1-2 hours

#### Task 1.2: Create File Transfers Migration
**File:** `database/migrations/006_create_file_transfers_table.sql`

**Steps:**
1. Create migration file with `file_transfers` table definition
2. Add indexes for performance
3. Add foreign key constraints
4. Add check constraints for status and direction
5. Test migration on development database

**Dependencies:** None (can run in parallel with Task 1.1)

**Estimated Time:** 1-2 hours

#### Task 1.3: Update Schema.sql
**File:** `database/schema.sql`

**Steps:**
1. Add `remote_sessions` table definition to schema.sql
2. Add `file_transfers` table definition to schema.sql
3. Add indexes definitions
4. Add triggers for updated_at
5. Document table structures

**Dependencies:** Task 1.1, Task 1.2

**Estimated Time:** 30 minutes

---

### Phase 9.2: Backend Implementation - Remote Desktop (Day 2-4)

#### Task 2.1: Create RemoteSession Model
**File:** `backend/src/models/RemoteSession.js` (NEW)

**Fields:**
- id, agent_id, company_id, user_id
- session_type (VARCHAR, default 'vnc')
- status (VARCHAR, default 'active')
- connection_string (TEXT)
- vnc_password (encrypted, temporary)
- vnc_port (INTEGER)
- websocket_url (TEXT)
- started_at, ended_at, duration_seconds
- metadata (JSONB) - for storing additional session info

**Relationships:**
- belongsTo Agent
- belongsTo Company
- belongsTo User

**Dependencies:** Task 1.1

**Estimated Time:** 1 hour

#### Task 2.2: Create FileTransfer Model
**File:** `backend/src/models/FileTransfer.js` (NEW)

**Fields:**
- id, agent_id, company_id, user_id
- direction (VARCHAR: 'upload' or 'download')
- file_name (VARCHAR)
- file_path (TEXT)
- file_size (BIGINT)
- status (VARCHAR: 'pending', 'in_progress', 'completed', 'failed', 'cancelled')
- progress (INTEGER, 0-100)
- started_at, completed_at
- error_message (TEXT)
- metadata (JSONB)

**Relationships:**
- belongsTo Agent
- belongsTo Company
- belongsTo User

**Dependencies:** Task 1.2

**Estimated Time:** 1 hour

#### Task 2.3: Update Models Index
**File:** `backend/src/models/index.js` (MODIFY)

**Changes:**
- Import RemoteSession model
- Import FileTransfer model
- Add RemoteSession to exports
- Add FileTransfer to exports
- Define relationships:
  - Agent.hasMany(RemoteSession)
  - Agent.hasMany(FileTransfer)
  - Company.hasMany(RemoteSession)
  - Company.hasMany(FileTransfer)
  - User.hasMany(RemoteSession)
  - User.hasMany(FileTransfer)

**Dependencies:** Task 2.1, Task 2.2

**Estimated Time:** 30 minutes

#### Task 2.4: Create VNC Service
**File:** `backend/src/services/vncService.js` (NEW)

**Purpose:** Manage VNC server lifecycle and session creation

**Functions to Implement:**

1. **generateVNCPassword()**
   - Generate random VNC password (8 characters)
   - Return password string

2. **generateVNCPort(agentId)**
   - Generate unique VNC port for agent
   - Default range: 5900-5999
   - Check for port conflicts
   - Return port number

3. **createVNCConnectionString(agentId, port, password)**
   - Create connection string for noVNC
   - Format: `ws://server:port/websockify?token=xxx`
   - Return connection string

4. **validateSessionAccess(sessionId, userId, companyId)**
   - Verify user has access to session
   - Check session belongs to company
   - Return boolean

**Dependencies:** None

**Estimated Time:** 2-3 hours

#### Task 2.5: Create Remote Desktop Controller
**File:** `backend/src/controllers/remoteDesktopController.js` (NEW)

**Functions to Implement:**

1. **createSession** (Admin/Technician only)
   - Validate input (agent_id)
   - Validate agent belongs to company
   - Check if agent is online
   - Check if agent already has active session
   - Generate VNC port and password
   - Create RemoteSession record
   - Send command to agent to start VNC server
   - Return session object with connection details

2. **getSession** (Admin/Technician only)
   - Validate session belongs to company
   - Return session details (without sensitive data)

3. **getActiveSessions** (Admin/Technician only)
   - Filter by company_id
   - Optional filters: agent_id, user_id
   - Return active sessions list

4. **endSession** (Admin/Technician only)
   - Validate session belongs to company
   - Update session status to 'ended'
   - Calculate duration_seconds
   - Send command to agent to stop VNC server
   - Audit log

5. **getSessionHistory** (Admin/Technician only)
   - Filter by company_id
   - Optional filters: agent_id, user_id, date range
   - Pagination support
   - Return sessions with agent/user info

6. **refreshSession** (Admin/Technician only)
   - Validate session belongs to company
   - Check session is still active
   - Regenerate connection string if needed
   - Return updated session

**Dependencies:** Task 2.1, Task 2.3, Task 2.4

**Estimated Time:** 5-6 hours

#### Task 2.6: Create Remote Desktop Routes
**File:** `backend/src/routes/remoteDesktop.js` (NEW)

**Routes:**
- `POST /api/remote-desktop/sessions` - Create session
- `GET /api/remote-desktop/sessions/:id` - Get session
- `GET /api/remote-desktop/sessions` - Get active sessions
- `POST /api/remote-desktop/sessions/:id/end` - End session
- `GET /api/remote-desktop/sessions/history` - Get session history
- `POST /api/remote-desktop/sessions/:id/refresh` - Refresh session

**Middleware:**
- authenticate, authorize('admin', 'company_admin', 'technician')
- rateLimit
- validation middleware
- company isolation

**Dependencies:** Task 2.5

**Estimated Time:** 1-2 hours

#### Task 2.7: Create Session Validation Middleware
**File:** `backend/src/middleware/sessionValidation.js` (NEW)

**Validations:**
- Validate session exists
- Validate session belongs to company
- Validate user has access to session
- Validate session is active (for operations)

**Dependencies:** Task 2.1

**Estimated Time:** 1 hour

---

### Phase 9.3: Backend Implementation - File Transfer (Day 4-5)

#### Task 3.1: Create File Transfer Controller
**File:** `backend/src/controllers/fileTransferController.js` (NEW)

**Functions to Implement:**

1. **initiateUpload** (Admin/Technician only)
   - Validate input (agent_id, file_name, file_size)
   - Validate agent belongs to company
   - Check file size limits (max 100MB default)
   - Validate file type (optional whitelist)
   - Create FileTransfer record with status 'pending'
   - Generate upload token/URL
   - Return upload details

2. **uploadFile** (Agent only)
   - Authenticate agent
   - Validate upload token
   - Validate file size
   - Save file to secure location
   - Update FileTransfer status to 'completed'
   - Audit log

3. **initiateDownload** (Admin/Technician only)
   - Validate input (agent_id, file_path)
   - Validate agent belongs to company
   - Validate file exists on agent
   - Create FileTransfer record with status 'pending'
   - Send command to agent to prepare file
   - Return download token/URL

4. **downloadFile** (Agent only)
   - Authenticate agent
   - Validate download token
   - Read file from agent
   - Stream file to backend
   - Update FileTransfer status to 'completed'
   - Audit log

5. **getFileList** (Admin/Technician only)
   - Validate agent belongs to company
   - Send command to agent to list files
   - Return file list (name, size, type, modified date)

6. **getTransferStatus** (Admin/Technician only)
   - Validate transfer belongs to company
   - Return transfer status and progress

7. **cancelTransfer** (Admin/Technician only)
   - Validate transfer belongs to company
   - Update status to 'cancelled'
   - Send cancel command to agent
   - Audit log

8. **getTransferHistory** (Admin/Technician only)
   - Filter by company_id
   - Optional filters: agent_id, direction, status, date range
   - Pagination support
   - Return transfers with agent/user info

**Dependencies:** Task 2.2, Task 2.3

**Estimated Time:** 6-7 hours

#### Task 3.2: Create File Transfer Routes
**File:** `backend/src/routes/fileTransfer.js` (NEW)

**Routes:**
- `POST /api/file-transfer/upload/initiate` - Initiate upload
- `POST /api/file-transfer/upload` - Upload file (agent)
- `POST /api/file-transfer/download/initiate` - Initiate download
- `GET /api/file-transfer/download/:id` - Download file
- `GET /api/file-transfer/list/:agent_id` - List files on agent
- `GET /api/file-transfer/status/:id` - Get transfer status
- `POST /api/file-transfer/:id/cancel` - Cancel transfer
- `GET /api/file-transfer/history` - Get transfer history

**Middleware:**
- authenticate, authorize (for admin endpoints)
- authenticateAgent (for agent endpoints)
- rateLimit
- validation middleware
- file upload middleware (multer or express-fileupload)
- company isolation

**Dependencies:** Task 3.1

**Estimated Time:** 2 hours

#### Task 3.3: Create File Transfer Validation Middleware
**File:** `backend/src/middleware/fileTransferValidation.js` (NEW)

**Validations:**
- File size limits (max 100MB)
- File type whitelist (optional)
- File path sanitization
- Transfer direction validation
- Agent access validation

**Dependencies:** None

**Estimated Time:** 1 hour

---

### Phase 9.4: Agent Script Updates (Day 5-6)

#### Task 4.1: Add VNC Server Management Functions
**File:** `agent/DesktopSupportAgent.ps1` (MODIFY)

**Functions to Add:**

1. **Start-VNCServer**
   - Check if TightVNC Server is installed
   - If not installed, download and install silently
   - Configure VNC server with password
   - Start VNC server on specified port
   - Return status

2. **Stop-VNCServer**
   - Stop VNC server
   - Clean up temporary files
   - Return status

3. **Get-VNCServerStatus**
   - Check if VNC server is running
   - Return port and status

4. **Install-TightVNC**
   - Download TightVNC Server installer
   - Install silently
   - Configure firewall rules
   - Return installation status

**Dependencies:** None

**Estimated Time:** 3-4 hours

#### Task 4.2: Add File Transfer Functions
**File:** `agent/DesktopSupportAgent.ps1` (MODIFY)

**Functions to Add:**

1. **Receive-File**
   - Receive file upload from backend
   - Validate file size
   - Save file to secure location
   - Return file path

2. **Send-File**
   - Read file from agent
   - Stream file to backend
   - Return transfer status

3. **Get-FileList**
   - List files in specified directory
   - Return file metadata (name, size, type, modified date)

4. **Validate-FilePath**
   - Sanitize file path
   - Check file exists
   - Check file permissions
   - Return validation result

**Dependencies:** None

**Estimated Time:** 2-3 hours

#### Task 4.3: Update Command Polling to Handle VNC Commands
**File:** `agent/DesktopSupportAgent.ps1` (MODIFY)

**Changes:**
- Add command type: 'start_vnc'
- Add command type: 'stop_vnc'
- Add command type: 'file_upload'
- Add command type: 'file_download'
- Add command type: 'file_list'
- Handle new command types in command execution

**Dependencies:** Task 4.1, Task 4.2

**Estimated Time:** 1-2 hours

---

### Phase 9.5: WebSocket Proxy Setup (Day 6)

#### Task 5.1: Install and Configure websockify
**File:** `backend/src/services/websockifyService.js` (NEW)

**Purpose:** Manage WebSocket proxy for VNC connections

**Implementation:**
- Use `ws` library for WebSocket server
- Create WebSocket proxy that bridges VNC protocol
- Handle connection authentication via tokens
- Manage connection lifecycle
- Log connections for audit

**Alternative:** Use standalone websockify (Python) if preferred

**Dependencies:** None

**Estimated Time:** 4-5 hours

#### Task 5.2: Integrate WebSocket Proxy with Express
**File:** `backend/src/server.js` (MODIFY)

**Changes:**
- Initialize WebSocket server
- Mount WebSocket endpoint: `/websockify`
- Handle WebSocket connections
- Integrate with session authentication

**Dependencies:** Task 5.1

**Estimated Time:** 1-2 hours

---

### Phase 9.6: Frontend Implementation (Day 7-9)

#### Task 6.1: Install noVNC Library
**File:** `frontend/package.json` (MODIFY)

**Changes:**
- Add `@novnc/novnc` dependency
- Or use CDN (if preferred)

**Dependencies:** None

**Estimated Time:** 15 minutes

#### Task 6.2: Create Remote Desktop Service
**File:** `frontend/src/services/remoteDesktopService.js` (NEW)

**Functions:**
- `createSession(agentId)` - Create remote session
- `getSession(sessionId)` - Get session details
- `getActiveSessions()` - Get active sessions
- `endSession(sessionId)` - End session
- `getSessionHistory(filters)` - Get session history
- `refreshSession(sessionId)` - Refresh session

**Dependencies:** None

**Estimated Time:** 1-2 hours

#### Task 6.3: Create File Transfer Service
**File:** `frontend/src/services/fileTransferService.js` (NEW)

**Functions:**
- `initiateUpload(agentId, file)` - Initiate file upload
- `uploadFile(uploadUrl, file)` - Upload file
- `initiateDownload(agentId, filePath)` - Initiate download
- `downloadFile(downloadUrl)` - Download file
- `getFileList(agentId, path)` - Get file list
- `getTransferStatus(transferId)` - Get transfer status
- `cancelTransfer(transferId)` - Cancel transfer
- `getTransferHistory(filters)` - Get transfer history

**Dependencies:** None

**Estimated Time:** 2-3 hours

#### Task 6.4: Create NoVNC Viewer Component
**File:** `frontend/src/components/Common/NoVNCViewer.jsx` (NEW)

**Features:**
- Integrate noVNC client
- Handle connection lifecycle
- Display connection status
- Handle errors
- Show loading states
- Fullscreen toggle
- Keyboard/mouse controls

**Dependencies:** Task 6.1, Task 6.2

**Estimated Time:** 4-5 hours

#### Task 6.5: Create File Browser Component
**File:** `frontend/src/components/Common/FileBrowser.jsx` (NEW)

**Features:**
- Display file list
- Navigate directories
- File selection
- File upload UI
- File download UI
- Progress indicators
- File type icons

**Dependencies:** Task 6.3

**Estimated Time:** 3-4 hours

#### Task 6.6: Create File Transfer Progress Component
**File:** `frontend/src/components/Common/FileTransferProgress.jsx` (NEW)

**Features:**
- Display transfer progress
- Show transfer status
- Cancel button
- Transfer speed indicator
- Time remaining estimate

**Dependencies:** Task 6.3

**Estimated Time:** 2 hours

#### Task 6.7: Create Remote Desktop Page
**File:** `frontend/src/pages/RemoteDesktop.jsx` (NEW)

**Features:**
- Agent selection
- Session management UI
- Active sessions list
- Session history
- Remote desktop viewer (NoVNC)
- File transfer panel
- Connection controls
- Session controls (end, refresh)

**Dependencies:** Task 6.2, Task 6.3, Task 6.4, Task 6.5, Task 6.6

**Estimated Time:** 6-8 hours

#### Task 6.8: Update App Routes
**File:** `frontend/src/App.jsx` (MODIFY)

**Changes:**
- Add `/remote-desktop` route
- Add navigation link (if navigation component exists)

**Dependencies:** Task 6.7

**Estimated Time:** 15 minutes

---

### Phase 9.7: Testing & Documentation (Day 10)

#### Task 7.1: Backend Testing
- Test all API endpoints
- Test authentication/authorization
- Test company isolation
- Test error handling
- Test rate limiting
- Test file upload/download
- Test session management

**Estimated Time:** 4-5 hours

#### Task 7.2: Frontend Testing
- Test remote desktop connection
- Test file transfer
- Test UI components
- Test error handling
- Test loading states
- Test responsive design

**Estimated Time:** 3-4 hours

#### Task 7.3: Integration Testing
- Test end-to-end remote desktop flow
- Test end-to-end file transfer flow
- Test agent integration
- Test WebSocket proxy
- Test session timeout
- Test concurrent sessions

**Estimated Time:** 3-4 hours

#### Task 7.4: Documentation Updates
**Files to Update:**
- `IMPLEMENTATION_PHASES.md` - Mark Phase 9 as complete
- `PROJECT_STATUS_SUMMARY.md` - Update status
- Create `API_DOCUMENTATION_PHASE9.md` - API documentation
- Update `README.md` if needed

**Estimated Time:** 2-3 hours

---

## 2. Database Schema

### 2.1 Remote Sessions Table

```sql
CREATE TABLE remote_sessions (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    session_type VARCHAR(20) DEFAULT 'vnc' CHECK (session_type IN ('vnc', 'rdp', 'ssh')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'timeout', 'error')),
    connection_string TEXT,
    vnc_password VARCHAR(255), -- Encrypted, temporary
    vnc_port INTEGER,
    websocket_url TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_remote_sessions_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_remote_sessions_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_remote_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_remote_sessions_agent ON remote_sessions(agent_id);
CREATE INDEX idx_remote_sessions_company ON remote_sessions(company_id);
CREATE INDEX idx_remote_sessions_user ON remote_sessions(user_id);
CREATE INDEX idx_remote_sessions_status ON remote_sessions(status);
CREATE INDEX idx_remote_sessions_company_status ON remote_sessions(company_id, status);
CREATE INDEX idx_remote_sessions_started_at ON remote_sessions(started_at DESC);
CREATE INDEX idx_remote_sessions_active ON remote_sessions(agent_id, status) WHERE status = 'active';
```

### 2.2 File Transfers Table

```sql
CREATE TABLE file_transfers (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('upload', 'download')),
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_file_transfers_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_file_transfers_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_file_transfers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_file_transfers_agent ON file_transfers(agent_id);
CREATE INDEX idx_file_transfers_company ON file_transfers(company_id);
CREATE INDEX idx_file_transfers_user ON file_transfers(user_id);
CREATE INDEX idx_file_transfers_status ON file_transfers(status);
CREATE INDEX idx_file_transfers_direction ON file_transfers(direction);
CREATE INDEX idx_file_transfers_company_status ON file_transfers(company_id, status);
CREATE INDEX idx_file_transfers_started_at ON file_transfers(started_at DESC);
CREATE INDEX idx_file_transfers_active ON file_transfers(agent_id, status) WHERE status IN ('pending', 'in_progress');
```

### 2.3 Updated_at Triggers

```sql
CREATE TRIGGER update_remote_sessions_updated_at BEFORE UPDATE ON remote_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_transfers_updated_at BEFORE UPDATE ON file_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 3. API Endpoints List

### 3.1 Remote Desktop Endpoints

#### Create Remote Session
- **Endpoint:** `POST /api/remote-desktop/sessions`
- **Auth:** Admin, Company Admin, Technician
- **Request Body:**
  ```json
  {
    "agent_id": 1
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "agent_id": 1,
      "session_type": "vnc",
      "status": "active",
      "websocket_url": "ws://server:8080/websockify?token=xxx",
      "started_at": "2025-01-XX..."
    }
  }
  ```

#### Get Session
- **Endpoint:** `GET /api/remote-desktop/sessions/:id`
- **Auth:** Admin, Company Admin, Technician
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "agent_id": 1,
      "status": "active",
      "started_at": "2025-01-XX...",
      "duration_seconds": 3600
    }
  }
  ```

#### Get Active Sessions
- **Endpoint:** `GET /api/remote-desktop/sessions?agent_id=1&user_id=1`
- **Auth:** Admin, Company Admin, Technician
- **Query Params:** agent_id (optional), user_id (optional)
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "agent_id": 1,
        "user_id": 1,
        "status": "active",
        "started_at": "2025-01-XX..."
      }
    ]
  }
  ```

#### End Session
- **Endpoint:** `POST /api/remote-desktop/sessions/:id/end`
- **Auth:** Admin, Company Admin, Technician
- **Response:**
  ```json
  {
    "success": true,
    "message": "Session ended successfully"
  }
  ```

#### Get Session History
- **Endpoint:** `GET /api/remote-desktop/sessions/history?agent_id=1&start_date=2025-01-01&end_date=2025-01-31&page=1&limit=20`
- **Auth:** Admin, Company Admin, Technician
- **Query Params:** agent_id, user_id, start_date, end_date, page, limit
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "sessions": [...],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 100,
        "pages": 5
      }
    }
  }
  ```

#### Refresh Session
- **Endpoint:** `POST /api/remote-desktop/sessions/:id/refresh`
- **Auth:** Admin, Company Admin, Technician
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "websocket_url": "ws://server:8080/websockify?token=xxx"
    }
  }
  ```

### 3.2 File Transfer Endpoints

#### Initiate Upload
- **Endpoint:** `POST /api/file-transfer/upload/initiate`
- **Auth:** Admin, Company Admin, Technician
- **Request Body:**
  ```json
  {
    "agent_id": 1,
    "file_name": "document.pdf",
    "file_size": 1048576,
    "destination_path": "C:\\Users\\Public\\Documents"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "transfer_id": 1,
      "upload_url": "/api/file-transfer/upload?token=xxx",
      "expires_at": "2025-01-XX..."
    }
  }
  ```

#### Upload File (Agent)
- **Endpoint:** `POST /api/file-transfer/upload`
- **Auth:** Agent (X-Agent-Key header)
- **Request:** Multipart form data with file
- **Response:**
  ```json
  {
    "success": true,
    "message": "File uploaded successfully"
  }
  ```

#### Initiate Download
- **Endpoint:** `POST /api/file-transfer/download/initiate`
- **Auth:** Admin, Company Admin, Technician
- **Request Body:**
  ```json
  {
    "agent_id": 1,
    "file_path": "C:\\Users\\Public\\Documents\\document.pdf"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "transfer_id": 1,
      "download_url": "/api/file-transfer/download/1?token=xxx",
      "file_name": "document.pdf",
      "file_size": 1048576
    }
  }
  ```

#### Download File
- **Endpoint:** `GET /api/file-transfer/download/:id`
- **Auth:** Admin, Company Admin, Technician
- **Response:** File stream

#### Get File List
- **Endpoint:** `GET /api/file-transfer/list/:agent_id?path=C:\\Users\\Public\\Documents`
- **Auth:** Admin, Company Admin, Technician
- **Query Params:** path (optional, default: C:\Users\Public\Documents)
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "name": "document.pdf",
        "path": "C:\\Users\\Public\\Documents\\document.pdf",
        "size": 1048576,
        "type": "file",
        "modified_at": "2025-01-XX..."
      }
    ]
  }
  ```

#### Get Transfer Status
- **Endpoint:** `GET /api/file-transfer/status/:id`
- **Auth:** Admin, Company Admin, Technician
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "status": "in_progress",
      "progress": 50,
      "file_name": "document.pdf",
      "file_size": 1048576
    }
  }
  ```

#### Cancel Transfer
- **Endpoint:** `POST /api/file-transfer/:id/cancel`
- **Auth:** Admin, Company Admin, Technician
- **Response:**
  ```json
  {
    "success": true,
    "message": "Transfer cancelled successfully"
  }
  ```

#### Get Transfer History
- **Endpoint:** `GET /api/file-transfer/history?agent_id=1&direction=upload&page=1&limit=20`
- **Auth:** Admin, Company Admin, Technician
- **Query Params:** agent_id, direction, status, start_date, end_date, page, limit
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "transfers": [...],
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

## 4. Frontend Components List

### 4.1 Page Components

#### RemoteDesktop.jsx
- Main remote desktop page
- Agent selection
- Session management
- Remote desktop viewer
- File transfer panel

### 4.2 Common Components

#### NoVNCViewer.jsx
- noVNC client integration
- Connection handling
- Fullscreen toggle
- Keyboard/mouse controls
- Connection status display

#### FileBrowser.jsx
- File list display
- Directory navigation
- File selection
- Upload/download buttons
- File type icons

#### FileTransferProgress.jsx
- Progress bar
- Transfer status
- Cancel button
- Speed indicator
- Time remaining

### 4.3 Service Files

#### remoteDesktopService.js
- API calls for remote desktop operations
- Session management functions

#### fileTransferService.js
- API calls for file transfer operations
- Upload/download handling

---

## 5. Security Measures

### 5.1 Authentication & Authorization

✅ **Session Creation:**
- Require authentication (authenticate middleware)
- Require authorization (admin, company_admin, technician roles)
- Validate agent belongs to company
- Validate user has permission to access agent

✅ **Session Access:**
- Validate session belongs to company
- Validate user has access to session
- Token-based WebSocket authentication
- Session timeout (configurable, default: 2 hours)

✅ **File Transfer:**
- Require authentication for all operations
- Validate agent belongs to company
- Validate file paths (prevent directory traversal)
- File size limits (max 100MB default)
- File type validation (optional whitelist)

### 5.2 Input Validation

✅ **Remote Desktop:**
- Validate agent_id (integer, exists, belongs to company)
- Validate session_id (integer, exists, belongs to company)
- Sanitize all inputs

✅ **File Transfer:**
- Validate file_name (string, max 500 chars, no path traversal)
- Validate file_path (sanitized, within allowed directories)
- Validate file_size (positive integer, within limits)
- Validate direction (enum: 'upload' or 'download')
- Sanitize file paths

### 5.3 Data Protection

✅ **VNC Passwords:**
- Generate random passwords (8 characters, alphanumeric)
- Encrypt passwords in database
- Passwords expire with session
- Never return passwords in API responses

✅ **File Storage:**
- Store files in secure location
- Use unique file names (UUID)
- Set proper file permissions
- Clean up temporary files

✅ **Session Data:**
- Encrypt sensitive session data
- Don't expose VNC passwords
- Don't expose internal IPs/ports
- Log all session activities

### 5.4 Network Security

✅ **WebSocket Connections:**
- Use WSS (WebSocket Secure) in production
- Token-based authentication
- Validate tokens on connection
- Rate limit connections
- Timeout idle connections

✅ **File Transfer:**
- Use HTTPS for file transfers
- Token-based authentication
- Validate tokens
- Rate limit uploads/downloads
- Scan files for malware (optional, future)

### 5.5 Audit Logging

✅ **Session Activities:**
- Log session creation
- Log session access
- Log session end
- Log session errors
- Include user_id, agent_id, company_id, IP address

✅ **File Transfer Activities:**
- Log file upload initiation
- Log file download initiation
- Log file transfer completion
- Log file transfer errors
- Log file transfer cancellation
- Include file_name, file_size, file_path

### 5.6 Rate Limiting

✅ **Remote Desktop:**
- Session creation: 10 requests per 15 minutes
- Session access: 100 requests per 15 minutes
- Session refresh: 20 requests per 15 minutes

✅ **File Transfer:**
- Upload initiation: 20 requests per 15 minutes
- Download initiation: 20 requests per 15 minutes
- File list: 50 requests per 15 minutes

### 5.7 Company Isolation

✅ **Multi-Tenant Security:**
- All queries filter by company_id
- Validate agent belongs to company
- Validate session belongs to company
- Validate file transfer belongs to company
- Prevent cross-company access

---

## 6. Testing Strategy

### 6.1 Unit Testing

#### Backend Tests
- **Remote Desktop Controller:**
  - Test session creation
  - Test session retrieval
  - Test session ending
  - Test session history
  - Test error handling
  - Test authorization

- **File Transfer Controller:**
  - Test upload initiation
  - Test download initiation
  - Test file list
  - Test transfer status
  - Test transfer cancellation
  - Test error handling

- **VNC Service:**
  - Test password generation
  - Test port generation
  - Test connection string creation
  - Test session validation

#### Frontend Tests
- **NoVNC Viewer:**
  - Test connection
  - Test disconnection
  - Test error handling
  - Test fullscreen toggle

- **File Browser:**
  - Test file list display
  - Test directory navigation
  - Test file selection

- **File Transfer Progress:**
  - Test progress display
  - Test cancel functionality

### 6.2 Integration Testing

#### Remote Desktop Flow
1. Create session
2. Connect via noVNC
3. Verify connection
4. End session
5. Verify session ended

#### File Transfer Flow
1. Initiate upload
2. Upload file
3. Verify file received
4. Initiate download
5. Download file
6. Verify file downloaded

#### Agent Integration
1. Agent receives VNC start command
2. Agent starts VNC server
3. Verify VNC server running
4. Agent receives VNC stop command
5. Agent stops VNC server
6. Verify VNC server stopped

### 6.3 Security Testing

#### Authentication Tests
- Test unauthenticated access (should fail)
- Test unauthorized access (should fail)
- Test cross-company access (should fail)
- Test token validation
- Test session timeout

#### Input Validation Tests
- Test invalid agent_id
- Test invalid file_path (path traversal)
- Test file size limits
- Test file type validation
- Test SQL injection attempts
- Test XSS attempts

#### Rate Limiting Tests
- Test rate limit enforcement
- Test rate limit reset
- Test different rate limits for different endpoints

### 6.4 Performance Testing

#### Load Testing
- Test concurrent sessions (10, 50, 100)
- Test concurrent file transfers
- Test WebSocket connection limits
- Test database query performance

#### Stress Testing
- Test maximum file size upload
- Test maximum concurrent sessions
- Test session timeout handling
- Test connection recovery

### 6.5 Manual Testing Checklist

#### Remote Desktop
- [ ] Create session for online agent
- [ ] Create session for offline agent (should fail)
- [ ] Connect via noVNC
- [ ] Verify remote desktop display
- [ ] Test keyboard input
- [ ] Test mouse input
- [ ] Test fullscreen mode
- [ ] End session
- [ ] Verify session ended
- [ ] View session history
- [ ] Test session timeout

#### File Transfer
- [ ] Upload small file (< 1MB)
- [ ] Upload large file (50MB)
- [ ] Upload file exceeding limit (should fail)
- [ ] Download file
- [ ] List files on agent
- [ ] Navigate directories
- [ ] Cancel transfer in progress
- [ ] View transfer history
- [ ] Test file path validation

#### Security
- [ ] Test unauthorized access (should fail)
- [ ] Test cross-company access (should fail)
- [ ] Test session token validation
- [ ] Test file path traversal (should fail)
- [ ] Test rate limiting
- [ ] Verify audit logs

#### Error Handling
- [ ] Test agent offline scenario
- [ ] Test network disconnection
- [ ] Test invalid session ID
- [ ] Test invalid file path
- [ ] Test file not found
- [ ] Test connection timeout

---

## 📊 Implementation Timeline

| Phase | Tasks | Duration | Days |
|-------|-------|----------|------|
| 9.1 | Database Schema | 1-2 hours | Day 1 |
| 9.2 | Remote Desktop Backend | 8-10 hours | Day 2-4 |
| 9.3 | File Transfer Backend | 9-10 hours | Day 4-5 |
| 9.4 | Agent Script Updates | 6-9 hours | Day 5-6 |
| 9.5 | WebSocket Proxy | 5-7 hours | Day 6 |
| 9.6 | Frontend Implementation | 18-22 hours | Day 7-9 |
| 9.7 | Testing & Documentation | 12-16 hours | Day 10 |
| **Total** | | **59-76 hours** | **7-10 days** |

---

## ✅ Approval Checklist

Before proceeding to Step 3 (Implementation), please confirm:

- [ ] Database schema approved
- [ ] API endpoints approved
- [ ] Frontend components approved
- [ ] Security measures approved
- [ ] Testing strategy approved
- [ ] Technology choices approved (TightVNC + noVNC)
- [ ] Timeline acceptable

---

**Status:** ⏳ PENDING - Awaiting Approval  
**Next Step:** Step 3 - Implementation (after approval)

