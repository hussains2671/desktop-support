# Desktop Support Agent (.NET) - Installation Guide

**Document Version:** 1.0  
**Last Updated:** March 10, 2026  

---

## System Requirements

- **OS:** Windows 10/11 or Windows Server 2019+
- **.NET Runtime:** .NET 6.0 or higher
- **Memory:** Minimum 256MB RAM
- **Network:** HTTPS/TLS 1.2+
- **Admin Rights:** Required for service installation

---

## Pre-Installation Checklist

- [ ] Download agent installer (.msi) from releases
- [ ] Obtain API Key from platform admin dashboard
- [ ] Note API endpoint (e.g., https://api.yourapp.com)
- [ ] Verify Windows Firewall allows outbound HTTPS (port 443)
- [ ] Prepare service account credentials (optional but recommended)

---

## Installation Steps

### Step 1: Download Agent

```bash
# Option A: Download from releases page
https://releases.yourdomain.com/agent/latest/DesktopSupportAgent.msi

# Option B: Build from source (if you have source code)
cd agent-native
dotnet publish -c Release -o ./publish
msbuild DesktopSupportAgent.Service.csproj /p:Configuration=Release
```

---

### Step 2: Create Configuration File

**Location:** `C:\Program Files\DesktopSupportAgent\config.json`

Create the file with content:

```json
{
  "api": {
    "baseUrl": "https://api.yourdomain.com",
    "timeout": 30000,
    "retryAttempts": 3,
    "retryDelay": 5000
  },
  "agent": {
    "id": "AGENT-001",
    "key": "sk_live_your_agent_key_from_platform",
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
      "interval": 300000
    }
  },
  "vncServer": {
    "enabled": true,
    "port": 5900,
    "password": "strong_vnc_password_16_chars_min"
  },
  "updates": {
    "enabled": true,
    "checkInterval": 3600000,
    "autoInstall": false
  },
  "logging": {
    "level": "info",
    "directory": "C:\\ProgramData\\DesktopSupportAgent\\logs"
  }
}
```

---

### Step 3: Run Installer

#### Option A: GUI Installation

```bash
# Double-click the .msi file
DesktopSupportAgent-2.0.0.msi
```

#### Option B: Silent Installation (Command Prompt - Admin)

```powershell
msiexec.exe /i DesktopSupportAgent-2.0.0.msi /quiet /norestart
```

#### Option C: PowerShell Installation

```powershell
Start-Process msiexec.exe -ArgumentList '/i DesktopSupportAgent-2.0.0.msi /quiet' -Wait
```

---

### Step 4: Verify Installation

```powershell
# Check if service is installed and running
Get-Service -Name DesktopSupportAgent

# Expected output:
# Status   Name                DisplayName
# ------   ----                -----------
# Running  DesktopSupportAgent Desktop Support Agent Service
```

---

### Step 5: Verify Configuration

```powershell
# Check if config file exists
Test-Path "C:\Program Files\DesktopSupportAgent\config.json"

# Check logs for errors
Get-Content "C:\ProgramData\DesktopSupportAgent\logs\agent.log" -Tail 50

# Test API connectivity
Test-NetConnection -ComputerName api.yourdomain.com -Port 443
```

---

### Step 6: Register Agent in Management Console

1. Open Management Console: `https://yourdomain.com/admin`
2. Navigate to **Agents** section
3. Click **+ Add Agent**
4. Fill in details matching your config.json:
   - **Agent ID:** AGENT-001
   - **Name:** Desktop-01
   - **Location:** Mumbai - Office
5. Click **Generate Key**
6. Copy the generated API key
7. Update config.json with the new key:
   ```json
   "key": "sk_live_XXXXXXXXXXXXXXXX"
   ```
8. Restart service:
   ```powershell
   Restart-Service -Name DesktopSupportAgent -Force
   ```

---

## Troubleshooting

### Issue: Service Won't Start

**Error:** Service starts then stops, or doesn't appear in Services

**Solutions:**

```powershell
# 1. Check system event log for errors
Get-EventLog -LogName System -Source Service* -Newest 10

# 2. Check application event log
Get-EventLog -LogName Application -Newest 10

# 3. Check agent logs
Get-Content "C:\ProgramData\DesktopSupportAgent\logs\agent.log" | Select-String "Error" -Context 2

# 4. Try running service directly (not as service) for debugging
CD "C:\Program Files\DesktopSupportAgent"
.\DesktopSupportAgent.Service.exe
# Look for error messages in console

# 5. Verify config.json syntax
# Use online JSON validator or:
# In PowerShell: $json = Get-Content config.json | ConvertFrom-Json
```

### Issue: API Connection Failed

**Error:** `Failed to connect to api.yourdomain.com`

**Solutions:**

```powershell
# 1. Test network connectivity
Test-NetConnection -ComputerName api.yourdomain.com -Port 443 -DetailedInfo

# 2. Verify agent key is correct
# Compare key in config.json with key in management console

# 3. Check if API is accessible from this machine
# Try from browser or curl:
curl https://api.yourdomain.com/api/health

# 4. Check firewall rules
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*agent*"} | Format-Table

# 5. Add firewall exception for agent
netsh advfirewall firewall add rule name="DesktopSupportAgent" dir=out action=allow protocol=tcp remoteport=443 enable=yes
```

### Issue: VNC Not Working

**Error:** Cannot connect to VNC port 5900

**Solutions:**

```powershell
# 1. Check if VNC port is listening
netstat -an | findstr ":5900"

# 2. Check firewall for VNC
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*VNC*"}

# 3. Allow VNC through firewall
netsh advfirewall firewall add rule name="VNC" dir=in action=allow protocol=tcp localport=5900 enable=yes

# 4. Verify VNC password is set in config.json
# Should be 16+ characters

# 5. Restart service after config changes
Restart-Service -Name DesktopSupportAgent -Force
```

### Issue: Service Crashes After Update

**Error:** Service stops running after automated update

**Solutions:**

```powershell
# 1. Check if update completed successfully
Get-Content "C:\ProgramData\DesktopSupportAgent\logs\agent.log" | Select-String "update" -i

# 2. Manually start service
Start-Service -Name DesktopSupportAgent

# 3. Check for .NET runtime errors
Get-EventLog -LogName Application -Source ".NET Runtime" | Select-Object -First 10

# 4. Reinstall agent if corrupted
msiexec.exe /x DesktopSupportAgent-2.0.0.msi /quiet
msiexec.exe /i DesktopSupportAgent-2.0.0.msi /quiet
```

---

## Uninstallation

### Option A: Control Panel

```
Settings → Apps → Apps & features → Desktop Support Agent → Uninstall
```

### Option B: Command Prompt (Admin)

```cmd
msiexec.exe /x DesktopSupportAgent-2.0.0.msi /quiet
```

### Option C: PowerShell (Admin)

```powershell
Get-WmiObject -Class Win32_Product -Filter "Name='Desktop Support Agent'" | Remove-WmiObject

# Or using msi:
msiexec.exe /x DesktopSupportAgent-2.0.0.msi /quiet
```

---

## Upgrade Process

```powershell
# 1. Stop the service
Stop-Service -Name DesktopSupportAgent -Force

# 2. Backup current config.json
Copy-Item "C:\Program Files\DesktopSupportAgent\config.json" "C:\Program Files\DesktopSupportAgent\config.json.backup"

# 3. Run new installer
msiexec.exe /i DesktopSupportAgent-2.1.0.msi /quiet /norestart

# 4. Config.json is preserved automatically

# 5. Start the service
Start-Service -Name DesktopSupportAgent

# 6. Verify upgrade succeeded
Get-Service -Name DesktopSupportAgent
```

---

## Security Best Practices

- [ ] Use strong VNC password (16+ characters, mixed case, numbers, symbols)
- [ ] Restrict firewall access to management network only
- [ ] Rotate API keys quarterly
- [ ] Update agent immediately after critical security patches
- [ ] Monitor agent logs regularly for suspicious activity
- [ ] Use service account instead of ADMIN for service identity
- [ ] Enable Windows Defender for real-time protection
- [ ] Keep Windows and .NET runtime updated

---

## Advanced Configuration

### Custom Log Directory

Edit `config.json`:

```json
"logging": {
  "directory": "D:\\Logs\\DesktopSupportAgent"
}
```

### Proxy Configuration

If you have a proxy, edit `config.json`:

```json
"api": {
  "proxy": "http://proxy.yourdomain.com:8080"
}
```

### Disable Auto-Update

Edit `config.json`:

```json
"updates": {
  "enabled": false
}
```

---

## Support & Help

For issues or questions:

- **Documentation:** https://docs.yourdomain.com/agent
- **Support Email:** support@yourdomain.com
- **Emergency:** +91-XXX-XXX-XXXX

When contacting support, provide:
1. Agent logs (`C:\ProgramData\DesktopSupportAgent\logs\*.log`)
2. config.json (mask sensitive data like API key)
3. Windows version
4. .NET version (`dotnet --version`)
5. Exact error message

---

**Installation Guide Complete**
