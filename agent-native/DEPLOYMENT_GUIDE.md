# Native Agent Deployment Guide - Enterprise Customers

## Overview

This guide is for deploying the **Native C#/.NET Windows Service Agent** to enterprise customers where PowerShell is blocked.

## Prerequisites

- Windows 10/11 or Windows Server 2016+
- .NET 6.0 Runtime (or include in installer)
- Administrator privileges
- Network access to backend API (HTTPS)

## Deployment Methods

### Method 1: MSI Installer (Recommended for Enterprise)

#### Step 1: Build MSI

```bash
# Install WiX Toolset first
# Download from: https://wixtoolset.org/releases/

# Build MSI
cd agent-native/DesktopSupportAgent.Installer
msbuild DesktopSupportAgent.Installer.sln /p:Configuration=Release
```

#### Step 2: Deploy via SCCM/MECM

1. Import MSI to SCCM/MECM
2. Create deployment package
3. Deploy to target collections
4. Silent installation configured automatically

#### Step 3: Silent Installation

```cmd
msiexec /i DesktopSupportAgent.msi /quiet /norestart COMPANY_CODE="YOUR_CODE" API_URL="https://yourdomain.com:3000/api"
```

### Method 2: Manual Installation

#### Step 1: Build Service

```bash
cd agent-native/DesktopSupportAgent.Service
dotnet publish -c Release -o publish
```

#### Step 2: Copy Files

```cmd
xcopy /E /I publish "C:\Program Files\DesktopSupportAgent"
```

#### Step 3: Create Configuration

Create `C:\Program Files\DesktopSupportAgent\config.json`:

```json
{
  "ApiBaseUrl": "https://yourdomain.com:3000/api",
  "AgentKey": "your-agent-key-from-dashboard",
  "DeviceId": "device-uuid",
  "CompanyCode": "1234567812345678",
  "PollInterval": 300000,
  "InventoryInterval": 86400000,
  "AgentVersion": "2.0.0",
  "AgentType": "native"
}
```

#### Step 4: Install Service

```cmd
sc.exe create DesktopSupportAgent binPath="C:\Program Files\DesktopSupportAgent\DesktopSupportAgent.exe" start=auto
sc.exe start DesktopSupportAgent
```

### Method 3: Group Policy Deployment

1. Create GPO for agent deployment
2. Copy MSI to network share
3. Create startup script:
   ```cmd
   msiexec /i \\server\share\DesktopSupportAgent.msi /quiet COMPANY_CODE="YOUR_CODE" API_URL="https://yourdomain.com:3000/api"
   ```
4. Apply to target OUs

## Verification

### Check Service Status

```cmd
sc.exe query DesktopSupportAgent
```

Expected output:
```
SERVICE_NAME: DesktopSupportAgent
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 4  RUNNING
```

### Check Logs

```powershell
# Event Viewer
Get-EventLog -LogName Application -Source "DesktopSupportAgent" -Newest 10
```

### Verify in Dashboard

1. Login to dashboard
2. Go to Devices page
3. Verify device appears with status "Online"
4. Check agent type shows "native"

## Troubleshooting

### Service Won't Start

1. Check configuration file exists and is valid JSON
2. Check logs in Event Viewer
3. Verify network connectivity to backend
4. Check firewall rules allow outbound HTTPS

### Agent Not Connecting

1. Verify API URL is correct (HTTPS required)
2. Check Company Code is correct
3. Verify agent key is valid
4. Test network connectivity:
   ```cmd
   Test-NetConnection -ComputerName yourdomain.com -Port 3000
   ```

### Update Issues

1. Check update endpoint is accessible
2. Verify version file exists
3. Check update directory permissions
4. Review update logs in Event Viewer

## Migration from PowerShell Agent

If you have existing PowerShell agents and want to migrate:

1. **Install native agent** on same machine (different service name)
2. **Use same config.json** (just add `AgentType: "native"`)
3. **Uninstall PowerShell agent** scheduled task
4. **Native agent** will continue using same backend APIs

## Security Considerations

- ✅ **No PowerShell Required** - Works even if PowerShell is completely blocked
- ✅ **Code Signing** - Sign executable with standard Windows certificates
- ✅ **HTTPS Only** - All communication over HTTPS
- ✅ **Service Account** - Runs as Local System (or dedicated service account)
- ✅ **Path Validation** - Prevents path traversal attacks

## Support

For issues:
1. Check Event Viewer logs
2. Verify configuration file
3. Test network connectivity
4. Review backend logs
5. Contact support with error details

