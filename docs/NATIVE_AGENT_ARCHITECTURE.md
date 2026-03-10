# Native Windows Service Agent Architecture

## Problem Statement

Current PowerShell-based agent fails in enterprise environments where:
- PowerShell execution is blocked via GPO
- ExecutionPolicy is Restricted
- Script signing is mandatory (AllSigned)
- AppLocker blocks PowerShell scripts
- Antivirus/EDR blocks PowerShell execution

## Solution: Native Windows Service (C#/.NET)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Backend API (Node.js)                 │
│  (NO CHANGES - Same endpoints, same JSON format)        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTPS/REST API
                       │ (Same as before)
                       │
┌──────────────────────▼──────────────────────────────────┐
│         Native Windows Service (C#/.NET)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  DesktopSupportAgentService.exe                 │  │
│  │  - No PowerShell dependency                      │  │
│  │  - Native Windows Service                       │  │
│  │  - Same API calls as PowerShell version         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Features (Same as PowerShell version):               │
│  ✓ Hardware Inventory (WMI/CIM via .NET)              │
│  ✓ Software Inventory (Registry via .NET)              │
│  ✓ Performance Metrics (Performance Counters)         │
│  ✓ Event Logs (EventLog API)                          │
│  ✓ Command Execution (Process.Start)                   │
│  ✓ File Transfer (HTTP multipart)                     │
│  ✓ VNC Management (Service control)                    │
│  ✓ Heartbeat (HTTP POST)                                │
└─────────────────────────────────────────────────────────┘
```

### Key Benefits

1. **No PowerShell Dependency**
   - Pure .NET executable
   - Works even if PowerShell is completely blocked
   - No ExecutionPolicy issues

2. **Better Performance**
   - Compiled code (faster than interpreted PowerShell)
   - Lower memory footprint
   - Native Windows Service (better resource management)

3. **Enterprise Ready**
   - Can be code-signed with standard certificates
   - MSI installer support (SCCM/MECM compatible)
   - Group Policy friendly

4. **Backward Compatible**
   - Same backend APIs
   - Same JSON payloads
   - Same features
   - Can coexist with PowerShell version during migration

## Implementation Plan

### Phase 1: Core Service Structure

**Project Structure:**
```
DesktopSupportAgent/
├── DesktopSupportAgent.sln
├── DesktopSupportAgent.Service/
│   ├── Program.cs                    # Service entry point
│   ├── AgentService.cs               # Main service class
│   ├── ConfigManager.cs              # Config.json reader
│   ├── ApiClient.cs                  # HTTP client for backend
│   ├── InventoryCollector.cs         # Hardware/Software inventory
│   ├── PerformanceCollector.cs       # Performance metrics
│   ├── EventLogCollector.cs         # Event logs
│   ├── CommandExecutor.cs           # Command execution
│   ├── FileTransferManager.cs       # File transfer
│   └── VncManager.cs                # VNC management
├── DesktopSupportAgent.Installer/
│   └── Installer project (WiX/MSI)
└── DesktopSupportAgent.Updater/
    └── Auto-update mechanism
```

### Phase 2: Feature Parity

All current PowerShell features implemented in C#:

1. **Hardware Inventory**
   - Use `System.Management` (WMI) or `Microsoft.Management.Infrastructure` (CIM)
   - Same data structure as PowerShell version

2. **Software Inventory**
   - Registry reading via `Microsoft.Win32.Registry`
   - Same registry keys as PowerShell version

3. **Performance Metrics**
   - `System.Diagnostics.PerformanceCounter`
   - Same metrics as PowerShell version

4. **Event Logs**
   - `System.Diagnostics.EventLog`
   - Same log sources and levels

5. **Command Execution**
   - `System.Diagnostics.Process`
   - Support same command types (chkdsk, sfc, diskpart, cmd, custom)

6. **File Transfer**
   - `System.Net.Http.HttpClient`
   - Multipart form data upload/download

7. **VNC Management**
   - Service control via `System.ServiceProcess.ServiceController`
   - Registry configuration

### Phase 3: Installer & Deployment

1. **MSI Installer (WiX)**
   - Install service executable
   - Create Windows Service
   - Set up config.json
   - Register with backend

2. **EXE Installer (Optional)**
   - Self-extracting installer
   - Silent installation support
   - Pre-configured with Company Code

3. **Auto-Update**
   - Version check on startup
   - Download new version from backend
   - Side-by-side installation
   - Rollback support

## Migration Strategy

### Option A: Gradual Migration (Recommended)

1. **Dual Support Period**
   - Backend supports both PowerShell and Native agents
   - Agent registration includes `agent_type: "powershell" | "native"`
   - Dashboard shows agent type

2. **Coexistence**
   - Both versions can run on different machines
   - Same backend APIs
   - Same data model

3. **Migration Path**
   - New installations: Use Native agent
   - Existing installations: Optional upgrade
   - PowerShell version deprecated after migration period

### Option B: Complete Replacement

1. **Replace PowerShell version entirely**
   - All new features in Native version only
   - PowerShell version marked as legacy
   - Migration guide for existing customers

## Backend Compatibility

**NO BACKEND CHANGES REQUIRED** - Same APIs work for both:

- `/api/agent/register` - Same request/response
- `/api/agent/heartbeat` - Same payload
- `/api/agent/inventory` - Same JSON structure
- `/api/agent/performance` - Same metrics format
- `/api/agent/event-logs` - Same log format
- `/api/commands/*` - Same command structure
- `/api/file-transfer/*` - Same transfer protocol

## Version Management

### Versioning Strategy

1. **Agent Version in Config**
   ```json
   {
     "agent_version": "2.0.0",
     "agent_type": "native",
     "api_base_url": "...",
     "agent_key": "..."
   }
   ```

2. **Backend Version Endpoint**
   - `/api/agent/versions` - List available versions
   - `/api/agent/versions/latest` - Latest version info
   - `/api/agent/versions/:version/download` - Download specific version

3. **Auto-Update Flow**
   - Agent checks version on startup
   - If update available, download new version
   - Install side-by-side
   - Restart service with new version
   - Keep old version for rollback

## Security Considerations

1. **Code Signing**
   - Sign executable with code-signing certificate
   - No ExecutionPolicy needed (not a script)

2. **Service Account**
   - Run as Local System (default)
   - Or dedicated service account (recommended)

3. **File Permissions**
   - Install directory: SYSTEM + Administrators only
   - Config file: Encrypted at rest (DPAPI)

4. **Network Security**
   - HTTPS only (certificate validation)
   - Agent key authentication (same as before)

## Performance Comparison

| Metric | PowerShell Agent | Native Agent |
|--------|-----------------|-------------|
| Memory Usage | ~50-100 MB | ~20-40 MB |
| CPU Usage | 1-2% | <0.5% |
| Startup Time | 3-5 seconds | <1 second |
| Script Execution | Required | Not required |
| Enterprise Compatibility | Limited | Full |

## Implementation Timeline

- **Week 1-2**: Core service structure, config management, API client
- **Week 3-4**: Inventory collection (hardware/software)
- **Week 5-6**: Performance metrics, event logs
- **Week 7-8**: Command execution, file transfer
- **Week 9-10**: VNC management, installer
- **Week 11-12**: Testing, documentation, migration guide

## Next Steps

1. Create C# project structure
2. Implement core service with heartbeat
3. Add inventory collection
4. Build MSI installer
5. Test in enterprise environment
6. Document migration process

