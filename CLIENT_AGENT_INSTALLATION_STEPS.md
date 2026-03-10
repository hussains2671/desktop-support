# Client Agent Installation Steps - Hindi/English Guide

## 📋 Prerequisites (Zarurat)

- ✅ Windows 10/11 ya Windows Server 2016+
- ✅ PowerShell 5.1+ (Windows me already hota hai)
- ✅ Administrator privileges (Admin rights)
- ✅ Network access to server (Server se connection)

## 🎯 Step 1: Company Code Nikaalein

### Method 1: Settings Page Se (Easiest)

1. Dashboard me login karein
2. Left sidebar me **Settings** par click karein
3. **Company Information** section me **Company Code (16-digit)** dekhen
4. Copy button par click karein (ya manually copy karein)
5. Format: `XXXX XXXX XXXX XXXX` (16 digits)

**Example**: `4395 7003 4820 0825`

### Method 2: Browser Console Se

1. Dashboard me F12 press karein
2. Console tab kholen
3. Ye command run karein:
   ```javascript
   JSON.parse(localStorage.getItem('auth-storage')).company.company_code
   ```

## 📦 Step 2: Agent Files Client Machine Par Copy Karein

### Option A: Network Share Se

1. Server se `agent` folder ko network share par copy karein
2. Client machine se network share access karein
3. `agent` folder ko local drive par copy karein (e.g., `C:\Temp\agent`)

### Option B: USB/External Drive Se

1. Server se `agent` folder ko USB drive par copy karein
2. USB drive ko client machine me lagayein
3. `agent` folder ko local drive par copy karein

### Option C: Direct Download (Agar Available Ho)

1. Client machine me browser kholen
2. Server URL se agent files download karein
3. Extract karein

## 🚀 Step 3: Agent Install Karein

### Method 1: PowerShell Script (Recommended) ⭐

1. **PowerShell as Administrator kholen**:
   - Start Menu me "PowerShell" search karein
   - Right-click karein → "Run as Administrator"

2. **Agent folder me navigate karein**:
   ```powershell
   cd "C:\Temp\agent\installer"
   ```
   (Ya jahan bhi aapne files copy ki hain)

3. **Installation command run karein**:
   
   **Production (HTTPS - Recommended)**:
   ```powershell
   .\Install-Agent.ps1 -ApiBaseUrl "https://UFOMUM-AbdulA.ufomoviez.com:3000/api" -CompanyCode "YOUR_16_DIGIT_CODE"
   ```
   
   **Development/Testing (HTTP - NOT RECOMMENDED)**:
   ```powershell
   .\Install-Agent.ps1 -ApiBaseUrl "http://UFOMUM-AbdulA.ufomoviez.com:3000/api" -CompanyCode "YOUR_16_DIGIT_CODE" -AllowInsecureHttp
   ```
   
   **IP se (Agar domain kaam nahi kare - HTTP with flag)**:
   ```powershell
   .\Install-Agent.ps1 -ApiBaseUrl "http://10.73.77.58:3000/api" -CompanyCode "YOUR_16_DIGIT_CODE" -AllowInsecureHttp
   ```
   
   **Example** (agar Company Code `4395700348200825` hai):
   ```powershell
   # Production (HTTPS)
   .\Install-Agent.ps1 -ApiBaseUrl "https://UFOMUM-AbdulA.ufomoviez.com:3000/api" -CompanyCode "4395700348200825"
   
   # Development (HTTP - requires -AllowInsecureHttp)
   .\Install-Agent.ps1 -ApiBaseUrl "http://UFOMUM-AbdulA.ufomoviez.com:3000/api" -CompanyCode "4395700348200825" -AllowInsecureHttp
   ```
   
   **Note**: Production me HTTPS use karein. HTTP sirf development/testing ke liye hai aur `-AllowInsecureHttp` flag ke saath hi kaam karega.

4. **Installation process dekhen**:
   - Device information collect hoga
   - Server se registration hoga
   - Agent files install honge
   - Windows service create hoga

### Method 2: Batch File (Easy for Non-Technical Users)

1. **Command Prompt as Administrator kholen**:
   - Start Menu me "cmd" search karein
   - Right-click → "Run as Administrator"

2. **Agent folder me navigate karein**:
   ```cmd
   cd "C:\Temp\agent\installer"
   ```

3. **Batch file run karein**:
   ```cmd
   Install-Agent.bat
   ```

4. **Prompts me enter karein**:
   - **API Base URL**: 
     - **Production**: `https://UFOMUM-AbdulA.ufomoviez.com:3000/api` (HTTPS recommended)
     - **Development**: `http://UFOMUM-AbdulA.ufomoviez.com:3000/api` (HTTP - requires `-AllowInsecureHttp` flag)
     - Ya IP: `http://10.73.77.58:3000/api` (with `-AllowInsecureHttp` flag)
   - **Company Code**: Apna 16-digit code (spaces ke bina)
     - Example: `4395700348200825`
   
   **Security Note**: Production me HTTPS use karein. HTTP insecure hai aur sirf development/testing ke liye hai.

## ✅ Step 4: Installation Verify Karein

### Check Service Status

PowerShell me:
```powershell
Get-ScheduledTask -TaskName "DesktopSupportAgent"
```

Expected output:
```
TaskName         State
--------         -----
DesktopSupportAgent Running
```

### Check Installation Directory

```powershell
dir "C:\Program Files\DesktopSupportAgent"
```

Files dikhne chahiye:
- `DesktopSupportAgent.ps1`
- `config.json`

### Check Config File

```powershell
Get-Content "C:\Program Files\DesktopSupportAgent\config.json"
```

Verify karein:
- ✅ `ApiBaseUrl` correct hai
- ✅ `CompanyCode` correct hai
- ✅ `AgentKey` present hai

## 🔍 Step 5: Dashboard Me Verify Karein

1. Server dashboard me login karein
2. **Devices** page par jayein
3. Naya device dikhna chahiye:
   - Hostname: Client machine ka naam
   - Status: Online (green)
   - Last Seen: Abhi ka time

## 📝 Complete Example

### Full Installation Command Example

```powershell
# Step 1: PowerShell as Admin kholen
# Step 2: Navigate karein
cd "C:\Temp\agent\installer"

# Step 3: Install karein (Company Code: 4395700348200825)
.\Install-Agent.ps1 -ApiBaseUrl "http://UFOMUM-AbdulA.ufomoviez.com:3000/api" -CompanyCode "4395700348200825"
```

### Expected Output

```
========================================
Desktop Support Agent Installer
========================================

Collecting device information...
Device ID: 12345678-1234-1234-1234-123456789ABC
Hostname: CLIENT-PC-01
OS Version: 10.0.19045

Using Company Code: 4395700348200825
Registering agent with server...
Agent registered successfully!
Agent Key: abc123def456...

Creating installation directory...
Installing agent files...
Creating Windows service...

========================================
Installation completed successfully!
========================================

Agent installed at: C:\Program Files\DesktopSupportAgent
Service name: DesktopSupportAgent
```

## 🛠️ Troubleshooting

### Issue: "Company not found"

**Solution**: 
- Company Code verify karein (exactly 16 digits, no spaces)
- Settings page se correct code copy karein

### Issue: "Cannot connect to server"

**Solution**:
1. Network connectivity check karein:
   ```powershell
   Test-NetConnection -ComputerName UFOMUM-AbdulA.ufomoviez.com -Port 3000
   ```
2. Firewall check karein (outbound connections allow honi chahiye)
3. IP address try karein agar domain kaam nahi kare:
   ```powershell
   # Production (HTTPS)
   .\Install-Agent.ps1 -ApiBaseUrl "https://10.73.77.58:3000/api" -CompanyCode "YOUR_CODE"
   
   # Development (HTTP - requires flag)
   .\Install-Agent.ps1 -ApiBaseUrl "http://10.73.77.58:3000/api" -CompanyCode "YOUR_CODE" -AllowInsecureHttp
   ```

### Issue: "Access Denied" ya "Permission Denied"

**Solution**:
- PowerShell/CMD ko **Administrator** ke taur par run karein
- Right-click → "Run as Administrator"

### Issue: Service Start Nahi Ho Raha

**Solution**:
1. Service manually start karein:
   ```powershell
   Start-ScheduledTask -TaskName "DesktopSupportAgent"
   ```
2. Logs check karein:
   ```powershell
   Get-EventLog -LogName Application -Source "DesktopSupportAgent" -Newest 10
   ```

## 📋 Quick Reference

### Server URLs

| Type | URL (Production - HTTPS) | URL (Development - HTTP) |
|------|---------------------------|---------------------------|
| **Domain** | `https://UFOMUM-AbdulA.ufomoviez.com/api` | `http://UFOMUM-AbdulA.ufomoviez.com:3000/api` (with `-AllowInsecureHttp`) |
| **Primary IP** | `https://10.73.77.58/api` | `http://10.73.77.58:3000/api` (with `-AllowInsecureHttp`) |
| **Secondary IP 1** | `https://192.168.86.22/api` | `http://192.168.86.22:3000/api` (with `-AllowInsecureHttp`) |
| **Secondary IP 2** | `https://192.168.86.152/api` | `http://192.168.86.152:3000/api` (with `-AllowInsecureHttp`) |

**Note**: HTTPS URLs use standard port 443 (no port number needed). HTTP URLs use port 3000 for direct backend access.

### Installation Commands

**Production (HTTPS - Recommended)**:
```powershell
.\Install-Agent.ps1 -ApiBaseUrl "https://UFOMUM-AbdulA.ufomoviez.com/api" -CompanyCode "YOUR_CODE"
```

**Development/Testing (HTTP - NOT RECOMMENDED)**:
```powershell
.\Install-Agent.ps1 -ApiBaseUrl "http://UFOMUM-AbdulA.ufomoviez.com:3000/api" -CompanyCode "YOUR_CODE" -AllowInsecureHttp
```

**IP se (Development only)**:
```powershell
.\Install-Agent.ps1 -ApiBaseUrl "http://10.73.77.58:3000/api" -CompanyCode "YOUR_CODE" -AllowInsecureHttp
```

**Silent Installation (Automated deployments)**:
```powershell
.\Install-Agent.ps1 -ApiBaseUrl "https://UFOMUM-AbdulA.ufomoviez.com:3000/api" -CompanyCode "YOUR_CODE" -Silent
```

### Useful Commands

```powershell
# Service status
Get-ScheduledTask -TaskName "DesktopSupportAgent"

# Service start
Start-ScheduledTask -TaskName "DesktopSupportAgent"

# Service stop
Stop-ScheduledTask -TaskName "DesktopSupportAgent"

# Service restart
Restart-ScheduledTask -TaskName "DesktopSupportAgent"

# Uninstall
Unregister-ScheduledTask -TaskName "DesktopSupportAgent" -Confirm:$false
```

## ✅ Checklist

Installation se pehle:
- [ ] Company Code mil gaya (Settings page se)
- [ ] Agent files client machine par copy ho gaye
- [ ] PowerShell/CMD Administrator mode me hai
- [ ] Network connectivity hai (server se connection)

Installation ke baad:
- [ ] Service running hai
- [ ] Config file correct hai
- [ ] Dashboard me device dikh raha hai
- [ ] Device status "Online" hai

## 🎉 Success!

Agar sab kuch theek hai, to:
- ✅ Agent install ho gaya
- ✅ Service running hai
- ✅ Dashboard me device dikh raha hai
- ✅ Data collection start ho gaya

Agent ab automatically:
- Hardware inventory collect karega
- Software inventory collect karega
- Performance metrics send karega
- Event logs send karega
- Heartbeat send karega (every 5 minutes)

---

**Need Help?** 
- Check logs: `Get-EventLog -LogName Application -Source "DesktopSupportAgent"`
- Verify config: `Get-Content "C:\Program Files\DesktopSupportAgent\config.json"`
- Check dashboard: Server me Devices page par jayein

