# Desktop Support Agent Installer
# Run as Administrator

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiBaseUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$CompanyCode,
    
    [Parameter(Mandatory=$false)]
    [string]$CompanyId,
    
    [Parameter(Mandatory=$false)]
    [string]$InstallPath = "C:\Program Files\DesktopSupportAgent",
    
    [Parameter(Mandatory=$false)]
    [switch]$Silent,
    
    [Parameter(Mandatory=$false)]
    [switch]$ForceBypass,
    
    [Parameter(Mandatory=$false)]
    [switch]$AllowInsecureHttp
)

$ErrorActionPreference = "Stop"

# Function to write error and pause before exiting
function Write-ErrorAndExit {
    param([string]$Message, [int]$ExitCode = 1)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR: $Message" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    if (-not $Silent) {
        Write-Host "Press any key to exit..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    exit $ExitCode
}

# Function to write detailed error information
function Write-DetailedError {
    param([string]$Message, [object]$Exception)
    Write-Host ""
    Write-Host "ERROR DETAILS:" -ForegroundColor Red
    Write-Host "Message: $Message" -ForegroundColor Red
    if ($Exception) {
        Write-Host "Exception Type: $($Exception.GetType().FullName)" -ForegroundColor Red
        Write-Host "Exception Message: $($Exception.Message)" -ForegroundColor Red
        if ($Exception.InnerException) {
            Write-Host "Inner Exception: $($Exception.InnerException.Message)" -ForegroundColor Red
        }
        if ($Exception.Response) {
            Write-Host "HTTP Status: $($Exception.Response.StatusCode.value__)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-ErrorAndExit "This script must be run as Administrator. Please right-click and select 'Run as Administrator'."
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Desktop Support Agent Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Security: Validate HTTPS usage
if ($ApiBaseUrl -like "http://*" -and -not $AllowInsecureHttp) {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "SECURITY WARNING: HTTP detected!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "For security, HTTPS is required in production." -ForegroundColor Yellow
    Write-Host "Detected URL: $ApiBaseUrl" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To proceed with HTTP (NOT RECOMMENDED), use:" -ForegroundColor Yellow
    Write-Host "  -AllowInsecureHttp" -ForegroundColor White
    Write-Host ""
    Write-Host "Recommended: Use HTTPS URL instead" -ForegroundColor Cyan
    Write-Host "Example: https://yourdomain.com:3000/api" -ForegroundColor Cyan
    Write-Host ""
    Write-ErrorAndExit "Installation aborted: HTTP not allowed without -AllowInsecureHttp flag"
}

if ($ApiBaseUrl -like "http://*" -and $AllowInsecureHttp) {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "SECURITY WARNING: Using HTTP" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "WARNING: HTTP is insecure and should only be used for development/testing." -ForegroundColor Yellow
    Write-Host "Production deployments MUST use HTTPS." -ForegroundColor Yellow
    Write-Host ""
    if (-not $Silent) {
        Write-Host "Press any key to continue with HTTP (NOT RECOMMENDED)..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}

# Security: Execution Policy Bypass warning
if ($ForceBypass) {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "SECURITY WARNING: ExecutionPolicy Bypass" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "WARNING: -ForceBypass flag bypasses PowerShell execution policy." -ForegroundColor Yellow
    Write-Host "This is a security risk and should only be used:" -ForegroundColor Yellow
    Write-Host "  1. During initial deployment when scripts are not signed" -ForegroundColor Yellow
    Write-Host "  2. In controlled environments with proper security measures" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "RECOMMENDED: Sign scripts with code-signing certificate and use" -ForegroundColor Cyan
    Write-Host "  RemoteSigned or AllSigned execution policy instead." -ForegroundColor Cyan
    Write-Host ""
    if (-not $Silent) {
        Write-Host "Press any key to continue with Bypass (NOT RECOMMENDED)..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}

# Get device information
Write-Host "Collecting device information..." -ForegroundColor Yellow
$deviceId = (Get-WmiObject -Class Win32_ComputerSystemProduct).UUID
if (-not $deviceId) {
    $deviceId = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | 
        Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } | 
        Select-Object -First 1 | 
        ForEach-Object { $_.GetPhysicalAddress().ToString() }
}

$hostname = $env:COMPUTERNAME
$osVersion = (Get-CimInstance Win32_OperatingSystem).Version

Write-Host "Device ID: $deviceId" -ForegroundColor Green
Write-Host "Hostname: $hostname" -ForegroundColor Green
Write-Host "OS Version: $osVersion" -ForegroundColor Green
Write-Host ""

# Validate parameters
if (-not $CompanyCode -and -not $CompanyId) {
    Write-Error "Either CompanyCode or CompanyId must be provided"
    Write-Host "Usage: .\Install-Agent.ps1 -ApiBaseUrl 'https://yourdomain.com:3000/api' -CompanyCode '1234567812345678'" -ForegroundColor Yellow
    Write-Host "   or: .\Install-Agent.ps1 -ApiBaseUrl 'https://yourdomain.com:3000/api' -CompanyId '1'" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Optional flags:" -ForegroundColor Cyan
    Write-Host "  -Silent              : Run without user prompts" -ForegroundColor White
    Write-Host "  -ForceBypass         : Bypass execution policy (NOT RECOMMENDED)" -ForegroundColor White
    Write-Host "  -AllowInsecureHttp   : Allow HTTP (dev/test only, NOT RECOMMENDED)" -ForegroundColor White
    exit 1
}

# Register agent with server
Write-Host "Registering agent with server..." -ForegroundColor Yellow
try {
    $registerBody = @{
        device_id = $deviceId
        hostname = $hostname
        os_version = $osVersion
        agent_version = "1.0.0"
    }
    
    # Prefer CompanyCode over CompanyId
    if ($CompanyCode) {
        $registerBody.company_code = $CompanyCode
        Write-Host "Using Company Code: $CompanyCode" -ForegroundColor Cyan
    } elseif ($CompanyId) {
        $registerBody.company_id = $CompanyId
        Write-Host "Using Company ID: $CompanyId" -ForegroundColor Cyan
    }
    
    $registerBody = $registerBody | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/api/agent/register" `
        -Method Post `
        -Body $registerBody `
        -ContentType "application/json"

    $agentKey = $registerResponse.data.agent_key
    Write-Host "Agent registered successfully!" -ForegroundColor Green
    Write-Host "Agent Key: $agentKey" -ForegroundColor Green
} catch {
    Write-DetailedError "Failed to register agent with server" $_.Exception
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. API URL is correct: $ApiBaseUrl" -ForegroundColor Yellow
    Write-Host "  2. Company Code is correct: $CompanyCode" -ForegroundColor Yellow
    Write-Host "  3. Network connectivity to the server" -ForegroundColor Yellow
    Write-Host "  4. Server is running and accessible" -ForegroundColor Yellow
    Write-ErrorAndExit "Registration failed. See details above."
}

# Create installation directory with upgrade support
Write-Host "Creating installation directory..." -ForegroundColor Yellow
try {
    if (Test-Path $InstallPath) {
        Write-Host "Existing installation detected. Creating backup..." -ForegroundColor Yellow
        
        # Create backup directory with timestamp
        $backupPath = "$InstallPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        try {
            Copy-Item -Path $InstallPath -Destination $backupPath -Recurse -Force -ErrorAction Stop
            Write-Host "Backup created: $backupPath" -ForegroundColor Green
            
            # Keep only last 3 backups
            $oldBackups = Get-ChildItem -Path (Split-Path $InstallPath -Parent) -Filter "DesktopSupportAgent.backup.*" | 
                Sort-Object LastWriteTime -Descending | 
                Select-Object -Skip 3
            foreach ($oldBackup in $oldBackups) {
                Remove-Item -Path $oldBackup.FullName -Recurse -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Warning "Failed to create backup: $($_.Exception.Message). Continuing with upgrade..."
        }
        
        Write-Host "Removing existing installation..." -ForegroundColor Yellow
        Remove-Item -Path $InstallPath -Recurse -Force -ErrorAction Stop
    }
    New-Item -ItemType Directory -Path $InstallPath -Force -ErrorAction Stop | Out-Null
    Write-Host "Installation directory created: $InstallPath" -ForegroundColor Green
} catch {
    Write-DetailedError "Failed to create installation directory" $_.Exception
    Write-ErrorAndExit "Directory creation failed. Please check permissions."
}

# Copy agent script
Write-Host "Installing agent files..." -ForegroundColor Yellow
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentScript = Join-Path $scriptPath "..\DesktopSupportAgent.ps1"

if (-not (Test-Path $agentScript)) {
    Write-DetailedError "Agent script not found" $null
    Write-Host "Expected location: $agentScript" -ForegroundColor Red
    Write-Host "Current script path: $scriptPath" -ForegroundColor Yellow
    Write-ErrorAndExit "DesktopSupportAgent.ps1 not found. Please ensure all agent files are present."
}

try {
    Copy-Item $agentScript -Destination $InstallPath -Force
    Write-Host "Agent script copied successfully" -ForegroundColor Green
} catch {
    Write-DetailedError "Failed to copy agent script" $_.Exception
    Write-ErrorAndExit "File copy failed. See details above."
}

# Create agent configuration file
$configContent = @{
    ApiBaseUrl = $ApiBaseUrl
    AgentKey = $agentKey
    DeviceId = $deviceId
    PollInterval = 300000  # 5 minutes
    InventoryInterval = 86400000  # 24 hours
}

# Add CompanyCode or CompanyId to config
if ($CompanyCode) {
    $configContent.CompanyCode = $CompanyCode
} elseif ($CompanyId) {
    $configContent.CompanyId = $CompanyId
}

$configContent = $configContent | ConvertTo-Json -Depth 10

$configPath = Join-Path $InstallPath "config.json"
$configContent | Out-File -FilePath $configPath -Encoding UTF8

# Create Windows Service using Task Scheduler
Write-Host "Creating Windows service..." -ForegroundColor Yellow

$taskName = "DesktopSupportAgent"

# Build PowerShell arguments based on execution policy
if ($ForceBypass) {
    $psArguments = "-ExecutionPolicy Bypass -File `"$InstallPath\DesktopSupportAgent.ps1`""
    Write-Host "WARNING: Using ExecutionPolicy Bypass (not recommended for production)" -ForegroundColor Yellow
} else {
    # Use default execution policy (recommended: scripts should be signed)
    $psArguments = "-NoProfile -File `"$InstallPath\DesktopSupportAgent.ps1`""
    Write-Host "Using default execution policy (recommended: sign scripts for production)" -ForegroundColor Green
}

$taskAction = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument $psArguments `
    -WorkingDirectory $InstallPath

$taskTrigger = New-ScheduledTaskTrigger -AtStartup
$taskPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3

try {
    Register-ScheduledTask -TaskName $taskName `
        -Action $taskAction `
        -Trigger $taskTrigger `
        -Principal $taskPrincipal `
        -Settings $taskSettings `
        -Description "Desktop Support Agent - System Monitoring Service" `
        -Force -ErrorAction Stop | Out-Null
    
    Write-Host "Scheduled task created successfully" -ForegroundColor Green
    
    # Start the service
    Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
    Write-Host "Scheduled task started successfully" -ForegroundColor Green
} catch {
    Write-DetailedError "Failed to create or start scheduled task" $_.Exception
    Write-ErrorAndExit "Service creation failed. See details above."
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Installation completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Agent installed at: $InstallPath" -ForegroundColor Cyan
Write-Host "Service name: $taskName" -ForegroundColor Cyan
Write-Host ""
Write-Host "To check status, run:" -ForegroundColor Yellow
Write-Host "  Get-ScheduledTask -TaskName $taskName" -ForegroundColor White
Write-Host ""
Write-Host "To uninstall, run:" -ForegroundColor Yellow
Write-Host "  Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false" -ForegroundColor White

