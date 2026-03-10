# 🔴 CRITICAL FIXES & BUG RESOLUTION - PRIORITY 0

**Must Fix BEFORE Phase 10-15 Implementation**  
**These Block Enterprise Deployment**  
**Date:** March 10, 2026

---

## ⚠️ MISSION CRITICAL ISSUES

```
Issue 1: C# Agent DI Container Broken
Status: 🔴 CRITICAL - Service Won't Start
Impact: Agent cannot be deployed to enterprise customers
Fix Time: 2-3 hours

Issue 2: Missing Agent Update Endpoint
Status: 🔴 CRITICAL - Auto-updates blocked
Impact: Agent security patches cannot be deployed
Fix Time: 1-2 hours

Issue 3: Missing Agent Config Template
Status: 🔴 CRITICAL - Service crashes on startup
Impact: Installation fails, cannot be deployed
Fix Time: 1 hour

Issue 4: WebSocket Missing for Remote Desktop
Status: 🟡 HIGH - VNC not working
Impact: Remote desktop feature incomplete
Fix Time: 4-6 hours

Issue 5: Zero Testing Framework
Status: 🟡 HIGH - Code quality at risk
Impact: Regressions go undetected
Fix Time: 8-12 hours

Issue 6: Missing Environment Documentation
Status: 🟡 HIGH - Setup problems
Impact: New developers can't setup environment
Fix Time: 2 hours

Issue 7: No C# Agent Installation Guide
Status: 🟡 HIGH - Enterprise deployment blocked
Impact: Customers can't deploy agent
Fix Time: 3-4 hours
```

---

# 🔧 FIX 1: C# AGENT DI CONTAINER

## Problem
```
File: agent-native/DesktopSupportAgent.Service/UpdateManager.cs
Error: UpdateManager requires ILogger<UpdateManager> in DI container
Current: Program.cs doesn't register logger
Result: Service crashes on startup with DI error
```

## Solution

**File: `agent-native/DesktopSupportAgent.Service/Program.cs`**

Current (broken):
```csharp
public static class Program
{
    public static void Main(string[] args)
    {
        var services = new ServiceCollection();
        
        // Missing logger registration!
        services.AddSingleton<ConfigManager>();
        services.AddSingleton<ApiClient>();
        // ... other services
    }
}
```

Fixed version:
```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DesktopSupportAgent.Service.Config;
using DesktopSupportAgent.Service.Managers;

public static class Program
{
    public static void Main(string[] args)
    {
        var services = new ServiceCollection();
        
        // ✅ FIX 1: Add Logging
        services.AddLogging(config =>
        {
            config.AddConsole();
            config.AddDebug();
            config.SetMinimumLevel(LogLevel.Information);
        });

        // ✅ Services
        services.AddSingleton<ConfigManager>();
        services.AddSingleton<ApiClient>();
        services.AddSingleton<InventoryCollector>();
        services.AddSingleton<PerformanceCollector>();
        services.AddSingleton<EventLogCollector>();
        services.AddSingleton<CommandExecutor>();
        services.AddSingleton<FileTransferManager>();
        services.AddSingleton<VncManager>();
        
        // ✅ FIX 2: Register UpdateManager with Logger
        services.AddSingleton<UpdateManager>();
        
        // ✅ FIX 3: Register Service
        services.AddSingleton<AgentService>();

        var serviceProvider = services.BuildServiceProvider();
        var agentService = serviceProvider.GetRequiredService<AgentService>();
        agentService.Start();
    }
}
```

**File: `agent-native/DesktopSupportAgent.Service/UpdateManager.cs`** - Fix Implementation

```csharp
public class UpdateManager
{
    private readonly ILogger<UpdateManager> _logger;
    private readonly ApiClient _apiClient;
    private readonly ConfigManager _configManager;
    private System.Timers.Timer _updateCheckTimer;

    // ✅ FIX: Constructor now properly receives logger
    public UpdateManager(ILogger<UpdateManager> logger, ApiClient apiClient, ConfigManager configManager)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _apiClient = apiClient ?? throw new ArgumentNullException(nameof(apiClient));
        _configManager = configManager ?? throw new ArgumentNullException(nameof(configManager));
    }

    public void StartUpdateCheck()
    {
        _updateCheckTimer = new System.Timers.Timer(3600000); // Check every hour
        _updateCheckTimer.Elapsed += CheckForUpdates;
        _updateCheckTimer.Start();
        _logger.LogInformation("Update checker started");
    }

    private async void CheckForUpdates(object sender, System.Timers.ElapsedEventArgs e)
    {
        try {
            _logger.LogInformation("Checking for updates...");
            
            var latestVersion = await GetLatestVersion();
            var currentVersion = GetCurrentVersion();

            if (latestVersion > currentVersion)
            {
                _logger.LogWarning($"Update available: {latestVersion}");
                await DownloadAndInstallUpdate(latestVersion);
            }
        }
        catch (Exception ex) {
            _logger.LogError(ex, "Update check failed");
        }
    }

    private async Task<Version> GetLatestVersion()
    {
        try {
            var response = await _apiClient.GetAsync("/agent/versions/latest");
            dynamic data = JsonConvert.DeserializeObject(response);
            return new Version(data.version.ToString());
        }
        catch (Exception ex) {
            _logger.LogError(ex, "Failed to get latest version");
            throw;
        }
    }

    private Version GetCurrentVersion()
    {
        return System.Reflection.Assembly.GetExecutingAssembly().GetName().Version;
    }

    // ✅ FIX: Implement actual update mechanism
    private async Task DownloadAndInstallUpdate(Version version)
    {
        try {
            _logger.LogInformation($"Downloading update {version}...");
            
            var updatePath = await _apiClient.DownloadFileAsync(
                $"/agent/versions/{version}/download",
                Path.Combine(Path.GetTempPath(), $"agent-update-{version}.msi")
            );

            await InstallUpdate(updatePath, version);
        }
        catch (Exception ex) {
            _logger.LogError(ex, "Download failed");
        }
    }

    // ✅ FIX: Proper Windows Service restart logic
    private async Task InstallUpdate(string updatePath, Version version)
    {
        try {
            _logger.LogInformation($"Installing update {version}...");

            var processInfo = new ProcessStartInfo
            {
                FileName = "msiexec.exe",
                Arguments = $"/i \"{updatePath}\" /quiet /norestart",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true
            };

            using (var process = Process.Start(processInfo))
            {
                process.WaitForExit();
                
                if (process.ExitCode == 0)
                {
                    _logger.LogInformation("Update installed successfully");
                    await RestartService();
                }
                else
                {
                    _logger.LogError($"Update installation failed with code {process.ExitCode}");
                }
            }

            // Cleanup
            if (File.Exists(updatePath))
                File.Delete(updatePath);
        }
        catch (Exception ex) {
            _logger.LogError(ex, "Installation failed");
        }
    }

    // ✅ FIX: Actually restart the Windows Service
    private async Task RestartService()
    {
        try {
            _logger.LogInformation("Restarting service...");
            
            var serviceName = "DesktopSupportAgent";
            var serviceController = new ServiceController(serviceName);
            
            if (serviceController.Status == ServiceControllerStatus.Running)
            {
                serviceController.Stop();
                await Task.Delay(2000);
            }
            
            serviceController.Start();
            _logger.LogInformation("Service restarted successfully");
        }
        catch (Exception ex) {
            _logger.LogError(ex, "Service restart failed");
        }
    }
}
```

**Verification:**
```bash
# Build and test
cd agent-native/DesktopSupportAgent.Service
dotnet build

# Should compile without DI errors
# Run service
dotnet run
# Should start without crashes
```

---

# 🔧 FIX 2: MISSING AGENT UPDATE ENDPOINT

## Problem
```
UpdateManager calls: GET /api/agent/versions/latest
But endpoint doesn't exist in backend
Result: Auto-updates fail completely
```

## Solution

**File: `backend/src/controllers/agentController.js`** - Add Methods

```javascript
const { Agent, AgentConfiguration } = require('../models');
const logger = require('../utils/logger');

/**
 * Get latest agent version
 * GET /api/agent/versions/latest
 */
exports.getLatestVersion = async (req, res) => {
    try {
        // Get latest from config or database
        const latestVersion = '1.2.0'; // Should be from config or DB
        
        res.json({
            success: true,
            data: {
                version: latestVersion,
                releaseDate: new Date('2025-03-10'),
                downloadUrl: `${process.env.BACKEND_URL}/api/agent/versions/${latestVersion}/download`,
                changelog: [
                    'Security patches',
                    'Performance improvements',
                    'Bug fixes'
                ]
            }
        });
    } catch (error) {
        logger.error('Get latest version error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Download agent version
 * GET /api/agent/versions/:version/download
 */
exports.downloadAgentVersion = async (req, res) => {
    try {
        const { version } = req.params;
        
        // Validate version format
        if (!/^\d+\.\d+\.\d+$/.test(version)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid version format'
            });
        }

        // File path on server
        const filePath = path.join(__dirname, '../../releases', `agent-${version}.msi`);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Version not found'
            });
        }

        // Send file
        res.download(filePath, `DesktopSupportAgent-${version}.msi`, (err) => {
            if (err) {
                logger.error('Download error:', err);
            } else {
                logger.info(`Agent version ${version} downloaded`);
            }
        });
    } catch (error) {
        logger.error('Download agent error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Report agent version (after update)
 * POST /api/agent/versions/report
 */
exports.reportVersion = async (req, res) => {
    try {
        const { agent_id, version } = req.body;
        const agentKey = req.headers['x-agent-key'];

        // Verify agent
        const agent = await Agent.findOne({
            where: { id: agent_id, agent_key: agentKey }
        });

        if (!agent) {
            return res.status(401).json({
                success: false,
                message: 'Agent not found or invalid key'
            });
        }

        // Update agent version
        await agent.update({ version });

        logger.info(`Agent ${agent_id} updated to version ${version}`);

        res.json({
            success: true,
            message: 'Version reported successfully'
        });
    } catch (error) {
        logger.error('Report version error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
```

**File: `backend/src/routes/agent.js`** - Add Routes

```javascript
const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { authenticate } = require('../middleware/auth');

// Public endpoints (no auth needed for version check)
router.get('/versions/latest', agentController.getLatestVersion);
router.get('/versions/:version/download', agentController.downloadAgentVersion);

// Agent authenticated endpoints
router.post('/versions/report', agentController.reportVersion);

module.exports = router;
```

---

# 🔧 FIX 3: MISSING AGENT CONFIG TEMPLATE

## Problem
```
ConfigManager expects: C:\Program Files\DesktopSupportAgent\config.json
File doesn't exist
Result: Service crashes on startup
```

## Solution

**File: `agent-native/config.json.example`**

```json
{
  "api": {
    "baseUrl": "https://api.yourapp.com",
    "timeout": 30000,
    "retryAttempts": 3,
    "retryDelay": 5000
  },
  "agent": {
    "id": "AGENT-001",
    "key": "sk_live_your_agent_key_here",
    "name": "Desktop-01",
    "location": "Mumbai - Office",
    "enabled": true
  },
  "collection": {
    "hardware": {
      "enabled": true,
      "interval": 86400000
    },
    "software": {
      "enabled": true,
      "interval": 86400000
    },
    "performance": {
      "enabled": true,
      "interval": 60000
    },
    "events": {
      "enabled": true,
      "interval": 300000,
      "maxLogs": 1000
    },
    "security": {
      "enabled": true,
      "interval": 3600000
    }
  },
  "commands": {
    "enabled": true,
    "checkInterval": 30000,
    "timeout": 1800000,
    "maxConcurrent": 2
  },
  "vncServer": {
    "enabled": true,
    "port": 5900,
    "password": "your_vnc_password",
    "autoStart": true
  },
  "fileTransfer": {
    "enabled": true,
    "maxFileSize": 104857600,
    "uploadPath": "C:\\DesktopSupportAgent\\uploads"
  },
  "updates": {
    "enabled": true,
    "checkInterval": 3600000,
    "autoInstall": false
  },
  "logging": {
    "level": "info",
    "directory": "C:\\ProgramData\\DesktopSupportAgent\\logs",
    "maxSize": 10485760,
    "maxFiles": 10
  },
  "security": {
    "sslVerify": true,
    "certificatePath": "",
    "encryptLocalData": true
  }
}
```

**File: `agent-native/DesktopSupportAgent.Service/ConfigManager.cs`** - Update Path Handling

```csharp
using System;
using System.IO;
using Newtonsoft.Json.Linq;

public class ConfigManager
{
    private readonly ILogger<ConfigManager> _logger;
    private JObject _config;
    private string _configPath;

    public ConfigManager(ILogger<ConfigManager> logger)
    {
        _logger = logger;
        LoadConfig();
    }

    private void LoadConfig()
    {
        try {
            // Try multiple locations in order of priority:
            var possiblePaths = new[]
            {
                // Development
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json"),
                
                // Production
                Path.Combine("C:\\Program Files\\DesktopSupportAgent", "config.json"),
                
                // Program data
                Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                    "DesktopSupportAgent",
                    "config.json"
                )
            };

            foreach (var path in possiblePaths)
            {
                if (File.Exists(path))
                {
                    _configPath = path;
                    _logger.LogInformation($"Loading config from: {path}");
                    var configText = File.ReadAllText(path);
                    _config = JObject.Parse(configText);
                    _logger.LogInformation("Configuration loaded successfully");
                    return;
                }
            }

            // No config found - use defaults and log warning
            _logger.LogWarning("No config.json found - using defaults. Please create config.json at one of:");
            foreach (var path in possiblePaths)
            {
                _logger.LogWarning($"  - {path}");
            }

            _config = new JObject();
            SetDefaults();
        }
        catch (Exception ex) {
            _logger.LogError(ex, "Failed to load config");
            throw;
        }
    }

    private void SetDefaults()
    {
        _config = JObject.FromObject(new
        {
            api = new
            {
                baseUrl = "https://api.yourapp.com",
                timeout = 30000
            },
            agent = new
            {
                enabled = true
            },
            logging = new
            {
                level = "info"
            }
        });
    }

    public string GetString(string key, string defaultValue = null)
    {
        return _config.SelectToken(key)?.Value<string>() ?? defaultValue;
    }

    public int GetInt(string key, int defaultValue = 0)
    {
        return _config.SelectToken(key)?.Value<int>() ?? defaultValue;
    }

    public bool GetBool(string key, bool defaultValue = false)
    {
        return _config.SelectToken(key)?.Value<bool>() ?? defaultValue;
    }

    public T GetObject<T>(string key)
    {
        var token = _config.SelectToken(key);
        return token?.ToObject<T>();
    }
}
```

---

# 🔧 FIX 4: WEBSOCKET FOR REMOTE DESKTOP

## Problem
```
Frontend expects: WebSocket connection for VNC (wss://)
Backend has: No WebSocket proxy
Result: Remote desktop feature doesn't work
```

## Solution

**File: `backend/src/services/websocketService.js`**

```javascript
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../config/config');

class WebSocketService {
    constructor(server) {
        this.wss = new WebSocket.Server({ server, path: '/ws' });
        this.connections = new Map();
        this.setupHandlers();
    }

    setupHandlers() {
        this.wss.on('connection', (ws, req) => {
            logger.info('WebSocket client connected');

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(ws, message);
                } catch (error) {
                    logger.error('WebSocket message error:', error);
                }
            });

            ws.on('close', () => {
                logger.info('WebSocket client disconnected');
                this.connections.delete(ws);
            });

            ws.on('error', (error) => {
                logger.error('WebSocket error:', error);
            });
        });
    }

    handleMessage(ws, message) {
        const { type, token, sessionId, data } = message;

        switch (type) {
            case 'auth':
                this.handleAuth(ws, token);
                break;

            case 'vnc-session':
                this.handleVncSession(ws, sessionId, data);
                break;

            case 'ticket-update':
                this.broadcastTicketUpdate(data);
                break;

            case 'comment-added':
                this.broadcastCommentAdded(data);
                break;

            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;

            default:
                logger.warn(`Unknown message type: ${type}`);
        }
    }

    handleAuth(ws, token) {
        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            ws.userId = decoded.id;
            ws.companyId = decoded.company_id;
            
            this.connections.set(ws, {
                userId: decoded.id,
                companyId: decoded.company_id,
                connectedAt: new Date()
            });

            ws.send(JSON.stringify({
                type: 'auth-success',
                message: 'Authenticated'
            }));

            logger.info(`User ${decoded.id} authenticated via WebSocket`);
        } catch (error) {
            logger.error('Auth error:', error);
            ws.send(JSON.stringify({
                type: 'auth-error',
                message: 'Authentication failed'
            }));
            ws.close();
        }
    }

    handleVncSession(ws, sessionId, data) {
        // Handle VNC data forwarding
        logger.info(`VNC session ${sessionId} data received`);
        // Forward to VNC server
        // This requires vncproxy library or websockify
    }

    broadcastTicketUpdate(data) {
        const { companyId, ticketId, update } = data;
        
        for (const [ws, conn] of this.connections) {
            if (conn.companyId === companyId) {
                ws.send(JSON.stringify({
                    type: 'ticket-updated',
                    ticketId,
                    data: update
                }));
            }
        }
    }

    broadcastCommentAdded(data) {
        const { companyId, ticketId, comment } = data;
        
        for (const [ws, conn] of this.connections) {
            if (conn.companyId === companyId) {
                ws.send(JSON.stringify({
                    type: 'comment-added',
                    ticketId,
                    data: comment
                }));
            }
        }
    }

    broadcast(message, filter = null) {
        for (const [ws, conn] of this.connections) {
            if (!filter || filter(conn)) {
                ws.send(JSON.stringify(message));
            }
        }
    }
}

module.exports = WebSocketService;
```

**File: `backend/src/server.js`** - Integrate WebSocket

```javascript
const WebSocketService = require('./services/websocketService');

// After creating HTTP server:
const server = http.createServer(app);
const wsService = new WebSocketService(server);

// Make available globally for controllers
global.wsService = wsService;

// Start server
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
```

**File: `frontend/src/hooks/useWebSocket.js`** - Frontend Hook

```javascript
import { useEffect, useRef } from 'react';

export const useWebSocket = (onMessage) => {
    const ws = useRef(null);

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WebSocket connected');
            
            // Send auth token
            const token = localStorage.getItem('token');
            ws.current.send(JSON.stringify({
                type: 'auth',
                token
            }));
        };

        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            onMessage(message);
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [onMessage]);

    return ws.current;
};
```

---

# 🧪 FIX 5: TESTING FRAMEWORK

## Problem
```
Zero testing found in project
No unit tests
No integration tests
Code quality at risk
```

## Solution

**File: `backend/__tests__/setup.js`**

```javascript
// Jest setup file
const dotenv = require('dotenv');
dotenv.config({ path: '.env.test' });

// Mock database
jest.mock('../src/config/database.postgresql', () => ({
    authenticate: jest.fn(),
    sync: jest.fn()
}));

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
```

**File: `backend/__tests__/models/Ticket.test.js`**

```javascript
const { Ticket } = require('../../src/models');
const { sequelize } = require('../../src/config/database.postgresql');

describe('Ticket Model', () => {
    beforeAll(async () => {
        await sequelize.sync();
    });

    afterEach(async () => {
        await Ticket.destroy({ where: {} });
    });

    test('should create a ticket', async () => {
        const ticket = await Ticket.create({
            company_id: 1,
            title: 'Test Ticket',
            description: 'Test Description',
            status: 'open',
            priority: 'medium'
        });

        expect(ticket).toBeDefined();
        expect(ticket.title).toBe('Test Ticket');
        expect(ticket.status).toBe('open');
    });

    test('should enforce company isolation', async () => {
        const ticket = await Ticket.create({
            company_id: 1,
            title: 'Company 1 Ticket',
            status: 'open'
        });

        const foundTicket = await Ticket.findOne({
            where: { id: ticket.id, company_id: 2 }
        });

        expect(foundTicket).toBeNull();
    });

    test('should validate required fields', async () => {
        try {
            await Ticket.create({
                company_id: 1
                // Missing title and description
            });
            throw new Error('Should have failed');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });
});
```

**File: `backend/__tests__/controllers/ticket.test.js`**

```javascript
const request = require('supertest');
const { app } = require('../../src/server');
const { Ticket } = require('../../src/models');

describe('Ticket Controller', () => {
    let token;
    let companyId = 1;
    let userId = 1;

    beforeAll(async () => {
        // Mock authentication
        token = 'Bearer test-token';
    });

    describe('POST /api/tickets', () => {
        test('should create ticket', async () => {
            const response = await request(app)
                .post('/api/tickets')
                .set('Authorization', token)
                .send({
                    title: 'New Ticket',
                    description: 'Test Description',
                    priority: 'high'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('New Ticket');
        });

        test('should fail without title', async () => {
            const response = await request(app)
                .post('/api/tickets')
                .set('Authorization', token)
                .send({
                    description: 'Test Description'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/tickets', () => {
        test('should list tickets', async () => {
            const response = await request(app)
                .get('/api/tickets')
                .set('Authorization', token);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data.tickets)).toBe(true);
        });

        test('should filter by status', async () => {
            const response = await request(app)
                .get('/api/tickets?status=open')
                .set('Authorization', token);

            expect(response.status).toBe(200);
            response.body.data.tickets.forEach(ticket => {
                expect(ticket.status).toBe('open');
            });
        });
    });
});
```

**File: `package.json`** - Add Scripts

```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:integration": "jest --testPathPattern='integration'",
    "test:coverage": "jest --coverage --coverageThreshold={\"lines\":80}"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "supertest": "^6.3.0",
    "@testing-library/react": "^14.0.0"
  }
}
```

---

# 📝 FIX 6: ENVIRONMENT VARIABLES

## Problem
```
No .env.example file
Developers don't know what variables are needed
Setup fails or uses wrong values
```

## Solution

**File: `.env.example`**

```bash
# ==========================================
# DATABASE CONFIGURATION
# ==========================================
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
DB_NAME=desktop_support
DB_SSLMODE=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ==========================================
# API CONFIGURATION
# ==========================================
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# ==========================================
# FRONTEND CONFIGURATION
# ==========================================
VITE_API_BASE_URL=http://localhost:3000/api
FRONTEND_URL=http://localhost:3001

# ==========================================
# AUTHENTICATION
# ==========================================
JWT_SECRET=your_jwt_secret_key_min_32_chars_long
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# ==========================================
# SECURITY
# ==========================================
CORS_ORIGIN=http://localhost:3001,https://yourdomain.com
BCRYPT_ROUNDS=10
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15

# ==========================================
# EMAIL SERVICE (SMTP)
# ==========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com
SMTP_SECURE=false

# ==========================================
# AI SERVICE (Gemini)
# ==========================================
GEMINI_API_KEY=your_gemini_api_key_here

# ==========================================
# VNC Configuration
# ==========================================
VNC_PORT=5900
VNC_TIMEOUT=3600

# ==========================================
# File Upload
# ==========================================
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads

# ==========================================
# Logging
# ==========================================
LOG_DIR=./logs
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=10

# ==========================================
# External Services
# ==========================================
WEBHOOK_SECRET=your_webhook_secret
STRIPE_KEY=sk_test_your_stripe_key
SENDGRID_API_KEY=your_sendgrid_key

# ==========================================
# HTTPS/SSL (Production)
# ==========================================
HTTPS_CERT_PATH=/etc/ssl/certs/yourdomain.crt
HTTPS_KEY_PATH=/etc/ssl/private/yourdomain.key

# ==========================================
# Deployment
# ==========================================
ENVIRONMENT=development
VERSION=1.0.0
```

**File: `ENV_SETUP_GUIDE.md`**

```markdown
# Environment Setup Guide

## 1. Copy Environment Template
\`\`\`bash
cp .env.example .env
\`\`\`

## 2. Generate Required Secrets

### JWT Secret (32+ chars)
\`\`\`bash
openssl rand -base64 32
\`\`\`

### Database Password
\`\`\`bash
openssl rand -base64 24
\`\`\`

## 3. Update .env with Your Values

\`\`\`bash
# Database
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=generated_password_above

# Frontend
FRONTEND_URL=http://localhost:3001

# JWT
JWT_SECRET=generated_secret_above

# Email
SMTP_HOST=your-smtp-server
SMTP_USER=your-email
SMTP_PASSWORD=app_password

# AI
GEMINI_API_KEY=your-key-from-google-cloud
\`\`\`

## 4. Verify Setup

\`\`\`bash
# Check required variables
grep "^[^#]" .env | wc -l
# Should show 30+ variables

# Test database connection
npm run test:db-connection

# Test API
curl http://localhost:3000/api/health
\`\`\`

## Development vs Production

### Development (.env)
- Allow CORS from localhost
- Use local database
- Enable detailed logs

### Production
- Restrict CORS to domain only
- Use managed database (RDS)
- Use environment variables only (no .env file)
- Enable HTTPS

See DEPLOYMENT_GUIDE.md for production setup.
```

---

# 📘 FIX 7: C# AGENT INSTALLATION GUIDE

## Problem
```
No deployment guide for C# agent
Enterprise customers can't install
Only PowerShell agent documented
```

## Solution

**File: `agent-native/INSTALLATION_GUIDE.md`**

```markdown
# Desktop Support Agent (.NET) - Installation Guide

## System Requirements

- **OS:** Windows 10/11 or Windows Server 2019+
- **.NET Runtime:** .NET 6.0 or higher
- **Memory:** Minimum 256MB RAM
- **Network:** HTTPS/TLS 1.2+
- **Admin Rights:** Required for service installation

## Pre-Installation Checklist

- [ ] Download agent installer (.msi)
- [ ] Obtain API Key from platform
- [ ] Note API endpoint (e.g., https://api.yourapp.com)
- [ ] Windows Firewall allows outbound HTTPS
- [ ] Username/password for service account (optional)

## Installation Steps

### Step 1: Download Agent

```bash
# Download from releases
https://releases.yourdomain.com/agent/latest/DesktopSupportAgent.msi

# Or build from source
cd agent-native
dotnet publish -c Release
```

### Step 2: Create Configuration File

Location: `C:\Program Files\DesktopSupportAgent\config.json`

```json
{
  "api": {
    "baseUrl": "https://api.yourdomain.com",
    "timeout": 30000
  },
  "agent": {
    "id": "AGENT-001",
    "key": "sk_live_your_agent_key_from_platform",
    "name": "Desktop-01",
    "location": "Mumbai - Office"
  },
  "vncServer": {
    "enabled": true,
    "port": 5900,
    "password": "strong_vnc_password"
  }
}
```

### Step 3: Run Installer

```bash
# Option A: GUI Installation
DesktopSupportAgent-1.0.0.msi

# Option B: Silent Installation
msiexec.exe /i DesktopSupportAgent-1.0.0.msi /quiet /norestart

# Option C: PowerShell
Start-Process msiexec.exe -ArgumentList '/i DesktopSupportAgent-1.0.0.msi /quiet' -Wait
```

### Step 4: Verify Installation

```bash
# Check service status
Get-Service -Name DesktopSupportAgent

# Should show: Running

# Check logs
Get-Content "C:\ProgramData\DesktopSupportAgent\logs\agent.log"

# Verify API connection
Test-NetConnection -ComputerName api.yourdomain.com -Port 443
```

### Step 5: Register Agent in Platform

1. Go to Admin Dashboard
2. Navigate to Agents
3. Click "Add Agent"
4. Fill in details matching config.json
5. Copy generated API Key
6. Update config.json with API Key
7. Restart service:

```bash
Restart-Service -Name DesktopSupportAgent
```

## Troubleshooting

### Service Won't Start

```bash
# Check service logs
Get-EventLog -LogName System | Where-Object {$_.Source -like "*DesktopSupportAgent*"}

# Check app logs
Get-Content "C:\ProgramData\DesktopSupportAgent\logs\agent.log" -Tail 100

# Restart service
Restart-Service -Name DesktopSupportAgent -Force
```

### API Connection Failed

```bash
# Test connectivity
Test-NetConnection -ComputerName api.yourdomain.com -Port 443 -DetailedInfo

# Verify config.json exists and is valid
Test-Path "C:\Program Files\DesktopSupportAgent\config.json"

# Check firewall rules
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*DesktopSupport*"}
```

### VNC Not Working

```bash
# Check VNC port
Test-NetConnection -ComputerName localhost -Port 5900

# Check VNC service
Get-Service | Where-Object {$_.Name -like "*VNC*"}

# Verify password in config.json
```

## Uninstallation

```bash
# Option A: GUI
Control Panel → Programs → Uninstall a Program → Desktop Support Agent

# Option B: Silent
msiexec.exe /x DesktopSupportAgent-1.0.0.msi /quiet

# Option C: PowerShell
Get-WmiObject -Class Win32_Product -Filter "Name='Desktop Support Agent'" | Remove-WmiObject
```

## Upgrade Process

```bash
1. Stop service: Stop-Service -Name DesktopSupportAgent
2. Keep config.json: Copy from old installation
3. Run new installer
4. Start service: Start-Service -Name DesktopSupportAgent
5. Verify: Get-Service -Name DesktopSupportAgent
```

## Security Best Practices

- [ ] Use strong VNC password (16+ characters)
- [ ] Restrict firewall access to management network
- [ ] Rotate API keys quarterly
- [ ] Update agent immediately after security patches
- [ ] Monitor agent logs regularly
- [ ] Use service account instead of ADMIN

## Support

For issues:
1. Check logs: `C:\ProgramData\DesktopSupportAgent\logs\agent.log`
2. Contact support: support@yourdomain.com
3. Provide logs and config.json (mask sensitive data)
```

---

# ✅ FIX IMPLEMENTATION CHECKLIST

```
PRIORITY 0: Critical Fixes (Must Do First)

[ ] Fix 1: C# Agent DI Container
    - [ ] Add logging to Program.cs
    - [ ] Register UpdateManager in DI
    - [ ] Test service startup
    - [ ] Time: 2-3 hours

[ ] Fix 2: Agent Update Endpoint
    - [ ] Create versioning controller
    - [ ] Add download endpoint
    - [ ] Add report endpoint
    - [ ] Test with agent
    - [ ] Time: 1-2 hours

[ ] Fix 3: Agent Config Template
    - [ ] Create config.json.example
    - [ ] Update ConfigManager to handle multiple paths
    - [ ] Document all config options
    - [ ] Test with defaults
    - [ ] Time: 1 hour

[ ] Fix 4: WebSocket for Remote Desktop
    - [ ] Create WebSocket service
    - [ ] Integrate with server
    - [ ] Add frontend hook
    - [ ] Test VNC connectivity
    - [ ] Time: 4-6 hours

[ ] Fix 5: Testing Framework
    - [ ] Setup Jest configuration
    - [ ] Create test templates
    - [ ] Add sample tests
    - [ ] Achieve 80%+ coverage
    - [ ] Time: 8-12 hours

[ ] Fix 6: Environment Variables
    - [ ] Create .env.example
    - [ ] Document all variables
    - [ ] Create setup guide
    - [ ] Test with fresh setup
    - [ ] Time: 2 hours

[ ] Fix 7: C# Agent Installation Guide
    - [ ] Write installation steps
    - [ ] Create troubleshooting guide
    - [ ] Test on Windows 10/11
    - [ ] Test on Windows Server 2019
    - [ ] Time: 3-4 hours

TOTAL TIME: 2-3 weeks (with parallel work)
```

---

**CRITICAL FIXES COMPLETE**

After these fixes are done, you can proceed with Phase 10-15 implementation plans.

Start with Fix 1 & 2 immediately - they block everything else.
