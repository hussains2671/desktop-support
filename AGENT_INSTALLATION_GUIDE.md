# Agent Installation Guide - Windows

## Overview

The Desktop Support Agent is a PowerShell-based service that runs on Windows machines to collect hardware/software inventory, monitor performance, and send data to the backend API.

## Prerequisites

- Windows 10/11 or Windows Server 2016+
- PowerShell 5.1+ (included with Windows)
- Administrator privileges
- Network access to backend API

## Installation Methods

### Method 1: Automated Installer (Recommended)

#### Step 1: Download Agent Files

Copy the `agent` folder to the target Windows machine:
- `DesktopSupportAgent.ps1` - Main agent script
- `installer/Install-Agent.ps1` - Installer script
- `installer/Install-Agent.bat` - Batch wrapper

#### Step 2: Run Installer

**Option A: PowerShell Script (Recommended)**

```powershell
# Run PowerShell as Administrator
cd agent\installer

# Production (HTTPS required)
.\Install-Agent.ps1 -ApiBaseUrl "https://yourdomain.com:3000/api" -CompanyCode "YOUR_16_DIGIT_CODE"

# Silent installation (for automated deployments)
.\Install-Agent.ps1 -ApiBaseUrl "https://yourdomain.com:3000/api" -CompanyCode "YOUR_16_DIGIT_CODE" -Silent

# Development/Testing only (HTTP - NOT RECOMMENDED)
.\Install-Agent.ps1 -ApiBaseUrl "http://localhost:3000/api" -CompanyCode "YOUR_16_DIGIT_CODE" -AllowInsecureHttp
```

**Option B: Batch File**

```cmd
# Run Command Prompt as Administrator
cd agent\installer
Install-Agent.bat
```

When prompted:
- **API Base URL**: 
  - **Production**: Use HTTPS (e.g., `https://yourdomain.com:3000/api`)
  - **Development**: HTTP allowed with `-AllowInsecureHttp` flag (NOT RECOMMENDED for production)
- **Company Code**: Your 16-digit Company Code from Settings page

**Installation Flags:**
- `-Silent`: Run without user prompts (for automated deployments)
- `-ForceBypass`: Bypass PowerShell execution policy (NOT RECOMMENDED - use code signing instead)
- `-AllowInsecureHttp`: Allow HTTP connections (dev/test only, NOT RECOMMENDED for production)

#### Step 3: Verify Installation

```powershell
# Check service status
Get-Service DesktopSupportAgent

# View service logs
Get-EventLog -LogName Application -Source "DesktopSupportAgent" -Newest 10
```

### Method 2: Manual Installation

#### Step 1: Create Configuration File

Create `C:\Program Files\DesktopSupportAgent\config.json`:

```json
{
  "ApiBaseUrl": "https://yourdomain.com:3000/api",
  "CompanyCode": "1234567812345678",
  "AgentKey": "your-agent-key-from-dashboard",
  "DeviceId": "your-device-id",
  "PollInterval": 300000,
  "InventoryInterval": 86400000
}
```

**Note**: Always use HTTPS URLs in production. HTTP is only for development/testing.

#### Step 2: Copy Agent Script

Copy `DesktopSupportAgent.ps1` to:
`C:\Program Files\DesktopSupportAgent\DesktopSupportAgent.ps1`

#### Step 3: Create Windows Service

```powershell
# Run as Administrator
$serviceName = "DesktopSupportAgent"
$scriptPath = "C:\Program Files\DesktopSupportAgent\DesktopSupportAgent.ps1"

# Create service using NSSM (Non-Sucking Service Manager)
# Download NSSM from: https://nssm.cc/download

# RECOMMENDED: Use default execution policy (scripts should be signed)
nssm install $serviceName "powershell.exe" "-NoProfile -File `"$scriptPath`""
nssm set $serviceName AppDirectory "C:\Program Files\DesktopSupportAgent"
nssm set $serviceName Start SERVICE_AUTO_START
nssm start $serviceName

# ALTERNATIVE (NOT RECOMMENDED): If scripts are not signed and you must bypass policy
# Only use this if you cannot sign scripts and understand the security implications
# nssm install $serviceName "powershell.exe" "-ExecutionPolicy Bypass -File `"$scriptPath`""
```

## Configuration

### Configuration File Location

`C:\Program Files\DesktopSupportAgent\config.json`

### Configuration Options

```json
{
  "ApiBaseUrl": "https://yourdomain.com:3000/api",  // Backend API URL (HTTPS required in production)
  "CompanyCode": "1234567812345678",                // 16-digit Company Code
  "AgentKey": "your-secret-key",                    // Agent authentication key
  "DeviceId": "device-unique-id",                   // Device identifier
  "PollInterval": 300000,                           // Poll interval (milliseconds, 5 min)
  "InventoryInterval": 86400000                     // Inventory interval (milliseconds, 24 hours)
}
```

### Update Configuration

1. Edit `config.json`
2. Restart service:
   ```powershell
   Restart-Service DesktopSupportAgent
   ```

## Agent Registration

### Automatic Registration

The agent automatically registers with the backend on first run using:
- Company Code (16-digit) or Company ID
- Agent Key (generated during installation)
- Machine hostname
- Windows username
- Device UUID

### Manual Registration

If automatic registration fails:

1. Get Agent Key from dashboard (Settings > Agents)
2. Update `config.json` with agent key
3. Restart service

## Service Management

### Start Service

```powershell
Start-Service DesktopSupportAgent
```

### Stop Service

```powershell
Stop-Service DesktopSupportAgent
```

### Restart Service

```powershell
Restart-Service DesktopSupportAgent
```

### Check Status

```powershell
Get-Service DesktopSupportAgent
```

### View Logs

```powershell
# Application Event Log
Get-EventLog -LogName Application -Source "DesktopSupportAgent" -Newest 50

# Real-time log monitoring
Get-EventLog -LogName Application -Source "DesktopSupportAgent" -Newest 10 -Wait
```

## Uninstallation

### Method 1: Using Installer

```powershell
# Run as Administrator
cd agent\installer
.\Install-Agent.ps1 -Uninstall
```

### Method 2: Manual Uninstall

```powershell
# Stop and remove service
Stop-Service DesktopSupportAgent
Remove-Service DesktopSupportAgent

# Remove files
Remove-Item "C:\Program Files\DesktopSupportAgent" -Recurse -Force

# Remove scheduled task (if used)
Unregister-ScheduledTask -TaskName "DesktopSupportAgent" -Confirm:$false
```

## Troubleshooting

### Service Won't Start

1. Check PowerShell execution policy:
   ```powershell
   Get-ExecutionPolicy
   ```
   
   **Recommended**: Sign scripts with code-signing certificate and set policy to `RemoteSigned` or `AllSigned`:
   ```powershell
   # Sign script (requires code-signing certificate)
   Set-AuthenticodeSignature -FilePath "C:\Program Files\DesktopSupportAgent\DesktopSupportAgent.ps1" -Certificate (Get-ChildItem -Path Cert:\LocalMachine\My\<thumbprint>)
   
   # Set execution policy (via Group Policy recommended for enterprises)
   Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
   ```
   
   **NOT RECOMMENDED**: If you must bypass policy temporarily (use `-ForceBypass` flag during installation only):
   ```powershell
   # This is a security risk - only for initial deployment
   # Better solution: Sign scripts and use proper execution policy
   ```

2. Check service logs:
   ```powershell
   Get-EventLog -LogName Application -Source "DesktopSupportAgent" -Newest 20
   ```

3. Verify configuration file exists and is valid JSON

4. Check if scheduled task exists:
   ```powershell
   Get-ScheduledTask -TaskName "DesktopSupportAgent"
   ```

### Agent Not Connecting to Backend

1. Verify API URL is correct and accessible:
   ```powershell
   Test-NetConnection -ComputerName your-backend-url -Port 3000
   ```

2. Check firewall rules allow outbound connections

3. Verify company ID and agent key are correct

4. Check backend logs for connection attempts

### No Data Appearing in Dashboard

1. Verify agent is running:
   ```powershell
   Get-Service DesktopSupportAgent
   ```

2. Check agent logs for errors

3. Verify agent is registered in dashboard

4. Check backend API is receiving data (view backend logs)

### Permission Errors

1. Ensure service runs as Local System or Administrator account

2. Check file permissions on agent directory

3. Verify PowerShell execution policy allows script execution

## Security Considerations

### Critical Security Requirements

1. **HTTPS Only**: 
   - **MUST** use HTTPS for API communication in production
   - HTTP is blocked by default - use `-AllowInsecureHttp` only for development/testing
   - Installer will warn and require explicit flag for HTTP connections

2. **Execution Policy**:
   - **DO NOT** use `-ExecutionPolicy Bypass` in production
   - **RECOMMENDED**: Sign PowerShell scripts with code-signing certificate
   - Set execution policy to `RemoteSigned` or `AllSigned` via Group Policy
   - Use `-ForceBypass` flag only during initial deployment if scripts are not signed (with explicit warning)

3. **Agent Key**: 
   - Keep agent key secure, treat like a password
   - Rotate keys periodically
   - Store securely (Windows DPAPI recommended)

4. **Firewall**: 
   - Only allow outbound connections to backend API
   - Restrict to specific IP/DNS and ports

5. **Service Account**: 
   - Use dedicated service account with minimal privileges
   - Avoid running as SYSTEM when possible

6. **Logging**: 
   - Review logs regularly for suspicious activity
   - Monitor agent registration and authentication

7. **Code Signing** (Recommended for Production):
   ```powershell
   # Obtain code-signing certificate (internal CA or commercial)
   # Sign agent scripts
   Set-AuthenticodeSignature -FilePath "DesktopSupportAgent.ps1" -Certificate (Get-ChildItem -Path Cert:\LocalMachine\My\<thumbprint>)
   Set-AuthenticodeSignature -FilePath "Install-Agent.ps1" -Certificate (Get-ChildItem -Path Cert:\LocalMachine\My\<thumbprint>)
   
   # Set execution policy via Group Policy (recommended for enterprises)
   # Or manually: Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
   ```

### Security Best Practices

- **Never** use `-ExecutionPolicy Bypass` in production without understanding risks
- **Always** use HTTPS in production environments
- **Sign** all PowerShell scripts before deployment
- **Rotate** agent keys regularly
- **Monitor** agent connections and registration attempts
- **Limit** file transfer to safe directories only
- **Review** agent logs for anomalies

## Bulk Deployment

### Using Group Policy (Active Directory)

1. Create GPO for agent deployment
2. Copy agent files to network share
3. Create startup script to install agent
4. Apply to target OUs

### Using PowerShell Remoting

```powershell
# Install on multiple machines (use HTTPS and Silent mode)
$computers = @("PC1", "PC2", "PC3")
$script = { 
    .\Install-Agent.ps1 -ApiBaseUrl "https://yourdomain.com:3000/api" -CompanyId 1 -Silent 
}

Invoke-Command -ComputerName $computers -ScriptBlock $script -Credential (Get-Credential)
```

**Note**: For bulk deployments:
- Use `-Silent` flag to avoid interactive prompts
- Use HTTPS URLs (never HTTP in production)
- Consider signing scripts and using proper execution policy instead of `-ForceBypass`

### Using SCCM/MECM

1. Package agent files
2. Create deployment package
3. Deploy to target collections

## Monitoring

### Check Agent Health

```powershell
# Service status
Get-Service DesktopSupportAgent | Select-Object Status, StartType

# Last heartbeat (check dashboard)
# Last data collection (check agent logs)
```

### Performance Impact

The agent is designed to be lightweight:
- CPU: < 1% average
- Memory: ~50-100 MB
- Network: Minimal (only when sending data)
- Disk: Minimal (only log files)

## Support

For issues or questions:
1. Check agent logs
2. Check backend logs
3. Verify network connectivity
4. Review configuration file
5. Contact support with error details

