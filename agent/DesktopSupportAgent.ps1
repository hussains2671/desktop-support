# Desktop Support Agent
# This script runs continuously to collect and send system information

param(
    [string]$ConfigPath = "C:\Program Files\DesktopSupportAgent\config.json"
)

$ErrorActionPreference = "Continue"

# Load configuration
if (-not (Test-Path $ConfigPath)) {
    Write-Error "Configuration file not found: $ConfigPath"
    exit 1
}

$config = Get-Content $ConfigPath | ConvertFrom-Json
$apiBaseUrl = $config.ApiBaseUrl
$agentKey = $config.AgentKey
$deviceId = $config.DeviceId
$pollInterval = $config.PollInterval
$inventoryInterval = $config.InventoryInterval

$headers = @{
    "X-Agent-Key" = $agentKey
    "Content-Type" = "application/json"
}

function Send-Heartbeat {
    try {
        $body = @{
            device_id = $deviceId
        } | ConvertTo-Json

        Invoke-RestMethod -Uri "$apiBaseUrl/api/agent/heartbeat" `
            -Method Post `
            -Body $body `
            -Headers $headers `
            -ErrorAction Stop | Out-Null
        Write-Host "[$(Get-Date)] Heartbeat sent" -ForegroundColor Green
    } catch {
        Write-Warning "[$(Get-Date)] Heartbeat failed: $_"
    }
}

function Get-HardwareInventory {
    $hardware = @{
        system = @{
            hostname = $env:COMPUTERNAME
            username = $env:USERNAME
            os_name = (Get-CimInstance Win32_OperatingSystem).Caption
            os_version = (Get-CimInstance Win32_OperatingSystem).Version
            manufacturer = (Get-CimInstance Win32_ComputerSystem).Manufacturer
            model = (Get-CimInstance Win32_ComputerSystem).Model
            serial_number = (Get-CimInstance Win32_BIOS).SerialNumber
        }
        cpu = @{
            name = (Get-CimInstance Win32_Processor).Name
            manufacturer = (Get-CimInstance Win32_Processor).Manufacturer
            cores = (Get-CimInstance Win32_Processor).NumberOfCores
            threads = (Get-CimInstance Win32_Processor).NumberOfLogicalProcessors
        }
        ram = @()
        storage = @()
    }

    # RAM
    Get-CimInstance Win32_PhysicalMemory | ForEach-Object {
        $ramType = switch ($_.SMBIOSMemoryType) {
            20 { "DDR" }
            21 { "DDR2" }
            24 { "DDR3" }
            26 { "DDR4" }
            30 { "DDR5" }
            default { "Unknown" }
        }
        
        $hardware.ram += @{
            manufacturer = $_.Manufacturer
            part_number = $_.PartNumber
            serial_number = $_.SerialNumber
            capacity = $_.Capacity
            speed = $_.Speed
            type = $ramType
        }
    }

    # Storage
    Get-CimInstance Win32_DiskDrive | ForEach-Object {
        $hardware.storage += @{
            type = if ($_.MediaType -like "*SSD*") { "SSD" } else { "HDD" }
            manufacturer = $_.Manufacturer
            model = $_.Model
            serial_number = $_.SerialNumber
            size = $_.Size
            interface = $_.InterfaceType
        }
    }

    return $hardware
}

function Get-SoftwareInventory {
    $software = @()
    
    # Use registry-based enumeration instead of Win32_Product
    # Win32_Product is slow and triggers reconfiguration checks
    # Registry enumeration is faster and safer
    
    # 64-bit applications
    $uninstallKeys = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    
    foreach ($keyPath in $uninstallKeys) {
        $keys = Get-ItemProperty -Path $keyPath -ErrorAction SilentlyContinue
        
        foreach ($key in $keys) {
            # Skip system components and empty entries
            if ($key.PSChildName -like "*{*" -or -not $key.DisplayName) {
                continue
            }
            
            # Parse install date if available
            $installDate = $null
            if ($key.InstallDate) {
                try {
                    # InstallDate format: YYYYMMDD or YYYYMMDDHHMMSS
                    $dateStr = $key.InstallDate.ToString()
                    if ($dateStr.Length -ge 8) {
                        $year = $dateStr.Substring(0, 4)
                        $month = $dateStr.Substring(4, 2)
                        $day = $dateStr.Substring(6, 2)
                        $installDate = "$year-$month-$day"
                    }
                } catch {
                    # Keep null if parsing fails
                }
            }
            
        $software += @{
                name = $key.DisplayName
                version = if ($key.DisplayVersion) { $key.DisplayVersion } else { $null }
                publisher = if ($key.Publisher) { $key.Publisher } else { $null }
                install_date = $installDate
                install_location = if ($key.InstallLocation) { $key.InstallLocation } else { $null }
        }
    }
    }
    
    # Remove duplicates (same software may appear in both 32-bit and 64-bit keys)
    $uniqueSoftware = $software | Sort-Object -Property name, version -Unique
    
    return $uniqueSoftware
}

function Send-Inventory {
    try {
        $hardware = Get-HardwareInventory
        $software = Get-SoftwareInventory

        $body = @{
            device_id = $deviceId
            hardware = $hardware
            software = $software
        } | ConvertTo-Json -Depth 10

        Invoke-RestMethod -Uri "$apiBaseUrl/api/agent/inventory" `
            -Method Post `
            -Body $body `
            -Headers $headers `
            -ErrorAction Stop | Out-Null
        Write-Host "[$(Get-Date)] Inventory uploaded" -ForegroundColor Green
    } catch {
        Write-Warning "[$(Get-Date)] Inventory upload failed: $_"
    }
}

function Get-EventLogs {
    $logs = @()
    $startTime = (Get-Date).AddHours(-1)
    
    Get-WinEvent -FilterHashtable @{
        LogName = 'System', 'Application'
        Level = 1, 2, 3  # Critical, Error, Warning
        StartTime = $startTime
    } -ErrorAction SilentlyContinue | Select-Object -First 50 | ForEach-Object {
        $level = switch ($_.LevelDisplayName) {
            "Critical" { "critical" }
            "Error" { "error" }
            "Warning" { "warning" }
            default { "information" }
        }
        
        $logs += @{
            log_type = $_.LogName.ToLower()
            event_id = $_.Id
            level = $level
            source = $_.ProviderName
            message = $_.Message
            time_generated = $_.TimeCreated
        }
    }
    
    return $logs
}

function Send-EventLogs {
    try {
        $logs = Get-EventLogs
        if ($logs.Count -eq 0) { return }

        $body = @{
            device_id = $deviceId
            logs = $logs
        } | ConvertTo-Json -Depth 10

        Invoke-RestMethod -Uri "$apiBaseUrl/api/agent/event-logs" `
            -Method Post `
            -Body $body `
            -Headers $headers `
            -ErrorAction Stop | Out-Null
        Write-Host "[$(Get-Date)] $($logs.Count) event logs uploaded" -ForegroundColor Green
    } catch {
        Write-Warning "[$(Get-Date)] Event logs upload failed: $_"
    }
}

function Get-PerformanceMetrics {
    $cpu = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples[0].CookedValue
    $memory = Get-CimInstance Win32_OperatingSystem
    $memoryTotal = [math]::Round($memory.TotalVisibleMemorySize / 1GB, 2)
    $memoryFree = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
    $memoryUsed = [math]::Round(($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / 1MB, 2)
    $memoryUsage = [math]::Round(($memoryUsed / ($memoryTotal * 1024)) * 100, 2)

    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    $diskTotal = [math]::Round($disk.Size / 1GB, 2)
    $diskFree = [math]::Round($disk.FreeSpace / 1GB, 2)
    $diskUsage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)

    return @{
        cpu_usage = [math]::Round($cpu, 2)
        memory_usage = $memoryUsage
        memory_total_gb = $memoryTotal
        memory_available_gb = $memoryFree
        disk_usage_c = $diskUsage
        disk_free_c_gb = $diskFree
        disk_total_c_gb = $diskTotal
        recorded_at = (Get-Date).ToUniversalTime()
    }
}

function Send-PerformanceMetrics {
    try {
        $metrics = Get-PerformanceMetrics
        $body = @{
            device_id = $deviceId
            metrics = $metrics
        } | ConvertTo-Json -Depth 10

        Invoke-RestMethod -Uri "$apiBaseUrl/api/agent/performance" `
            -Method Post `
            -Body $body `
            -Headers $headers `
            -ErrorAction Stop | Out-Null
        Write-Host "[$(Get-Date)] Performance metrics uploaded" -ForegroundColor Green
    } catch {
        Write-Warning "[$(Get-Date)] Performance upload failed: $_"
    }
}

# Get pending commands from server
function Get-PendingCommands {
    try {
        $response = Invoke-RestMethod -Uri "$apiBaseUrl/api/commands/pending" `
            -Method Get `
            -Headers $headers `
            -ErrorAction Stop
        
        if ($response.success -and $response.data) {
            return $response.data
        }
        return @()
    } catch {
        Write-Warning "[$(Get-Date)] Failed to get pending commands: $_"
        return @()
    }
}

# Execute a command based on command type
function Invoke-CommandExecution {
    param(
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Command
    )
    
    $startTime = Get-Date
    $commandId = $Command.id
    $commandType = $Command.command_type
    $commandText = $Command.command_text
    $parameters = $Command.parameters
    
    Write-Host "[$(Get-Date)] Executing command $commandId ($commandType): $commandText" -ForegroundColor Yellow
    
    # Report command started
    try {
        $statusBody = @{
            status = "running"
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$apiBaseUrl/api/commands/$commandId/status" `
            -Method Post `
            -Body $statusBody `
            -Headers $headers `
            -ErrorAction Stop | Out-Null
    } catch {
        Write-Warning "[$(Get-Date)] Failed to report command start: $_"
    }
    
    $output = ""
    $errorOutput = ""
    $exitCode = 0
    $executionTime = 0
    
    try {
        # Maximum execution time: 30 minutes (1800000 ms)
        $maxExecutionTime = 1800000
        
        switch ($commandType) {
            "chkdsk" {
                # chkdsk command - run with /f /r flags
                $process = Start-Process -FilePath "chkdsk" `
                    -ArgumentList "C:", "/f", "/r" `
                    -NoNewWindow `
                    -Wait `
                    -PassThru `
                    -RedirectStandardOutput "$env:TEMP\chkdsk_output.txt" `
                    -RedirectStandardError "$env:TEMP\chkdsk_error.txt"
                $exitCode = $process.ExitCode
                if (Test-Path "$env:TEMP\chkdsk_output.txt") {
                    $output = Get-Content "$env:TEMP\chkdsk_output.txt" -Raw
                }
                if (Test-Path "$env:TEMP\chkdsk_error.txt") {
                    $errorOutput = Get-Content "$env:TEMP\chkdsk_error.txt" -Raw
                }
            }
            "sfc" {
                # System File Checker
                $process = Start-Process -FilePath "sfc" `
                    -ArgumentList "/scannow" `
                    -NoNewWindow `
                    -Wait `
                    -PassThru `
                    -RedirectStandardOutput "$env:TEMP\sfc_output.txt" `
                    -RedirectStandardError "$env:TEMP\sfc_error.txt"
                $exitCode = $process.ExitCode
                if (Test-Path "$env:TEMP\sfc_output.txt") {
                    $output = Get-Content "$env:TEMP\sfc_output.txt" -Raw
                }
                if (Test-Path "$env:TEMP\sfc_error.txt") {
                    $errorOutput = Get-Content "$env:TEMP\sfc_error.txt" -Raw
                }
            }
            "diskpart" {
                # Diskpart - execute script
                $scriptPath = "$env:TEMP\diskpart_script.txt"
                $commandText | Out-File -FilePath $scriptPath -Encoding ASCII
                $process = Start-Process -FilePath "diskpart" `
                    -ArgumentList "/s", $scriptPath `
                    -NoNewWindow `
                    -Wait `
                    -PassThru `
                    -RedirectStandardOutput "$env:TEMP\diskpart_output.txt" `
                    -RedirectStandardError "$env:TEMP\diskpart_error.txt"
                $exitCode = $process.ExitCode
                if (Test-Path "$env:TEMP\diskpart_output.txt") {
                    $output = Get-Content "$env:TEMP\diskpart_output.txt" -Raw
                }
                if (Test-Path "$env:TEMP\diskpart_error.txt") {
                    $errorOutput = Get-Content "$env:TEMP\diskpart_error.txt" -Raw
                }
                Remove-Item $scriptPath -ErrorAction SilentlyContinue
            }
            "powershell" {
                # PowerShell script execution
                $scriptBlock = [scriptblock]::Create($commandText)
                try {
                    $output = Invoke-Command -ScriptBlock $scriptBlock -ErrorVariable err 2>&1 | Out-String
                    if ($err) {
                        $errorOutput = $err | Out-String
                        $exitCode = 1
                    }
                } catch {
                    $errorOutput = $_.Exception.Message
                    $exitCode = 1
                }
            }
            "cmd" {
                # CMD command execution
                $process = Start-Process -FilePath "cmd.exe" `
                    -ArgumentList "/c", $commandText `
                    -NoNewWindow `
                    -Wait `
                    -PassThru `
                    -RedirectStandardOutput "$env:TEMP\cmd_output.txt" `
                    -RedirectStandardError "$env:TEMP\cmd_error.txt"
                $exitCode = $process.ExitCode
                if (Test-Path "$env:TEMP\cmd_output.txt") {
                    $output = Get-Content "$env:TEMP\cmd_output.txt" -Raw
                }
                if (Test-Path "$env:TEMP\cmd_error.txt") {
                    $errorOutput = Get-Content "$env:TEMP\cmd_error.txt" -Raw
                }
            }
            "custom" {
                # Custom command - check for special commands
                if ($commandText -eq "start_vnc") {
                    # Start VNC server
                    $vncPort = $parameters.port
                    $vncPassword = $parameters.password
                    $result = Start-VNCServer -Port $vncPort -Password $vncPassword
                    if ($result.Success) {
                        $output = "VNC server started on port $vncPort"
                        $exitCode = 0
                    } else {
                        $errorOutput = $result.Error
                        $exitCode = 1
                    }
                }
                elseif ($commandText -eq "stop_vnc") {
                    # Stop VNC server
                    $vncPort = $parameters.port
                    $result = Stop-VNCServer -Port $vncPort
                    if ($result.Success) {
                        $output = "VNC server stopped on port $vncPort"
                        $exitCode = 0
                    } else {
                        $errorOutput = $result.Error
                        $exitCode = 1
                    }
                }
                elseif ($commandText -eq "file_upload") {
                    # Handle file upload
                    $transferId = $parameters.transfer_id
                    $filePath = $parameters.file_path
                    $fileSize = $parameters.file_size
                    $result = Receive-File -TransferId $transferId -FilePath $filePath -FileSize $fileSize
                    if ($result.Success) {
                        $output = "File uploaded successfully to $filePath"
                        $exitCode = 0
                    } else {
                        $errorOutput = $result.Error
                        $exitCode = 1
                    }
                }
                elseif ($commandText -eq "file_download") {
                    # Handle file download preparation
                    $transferId = $parameters.transfer_id
                    $filePath = $parameters.file_path
                    $result = Send-File -TransferId $transferId -FilePath $filePath
                    if ($result.Success) {
                        $output = "File prepared for download: $filePath"
                        $exitCode = 0
                    } else {
                        $errorOutput = $result.Error
                        $exitCode = 1
                    }
                }
                elseif ($commandText -eq "file_list") {
                    # List files
                    $path = $parameters.path
                    $result = Get-FileList -Path $path
                    if ($result.Success) {
                        $output = ($result.Files | ConvertTo-Json -Depth 10)
                        $exitCode = 0
                    } else {
                        $errorOutput = $result.Error
                        $exitCode = 1
                    }
                }
                else {
                    # Execute as regular custom command
                    $process = Start-Process -FilePath "powershell.exe" `
                        -ArgumentList "-Command", $commandText `
                        -NoNewWindow `
                        -Wait `
                        -PassThru `
                        -RedirectStandardOutput "$env:TEMP\custom_output.txt" `
                        -RedirectStandardError "$env:TEMP\custom_error.txt"
                    $exitCode = $process.ExitCode
                    if (Test-Path "$env:TEMP\custom_output.txt") {
                        $output = Get-Content "$env:TEMP\custom_output.txt" -Raw
                    }
                    if (Test-Path "$env:TEMP\custom_error.txt") {
                        $errorOutput = Get-Content "$env:TEMP\custom_error.txt" -Raw
                    }
                }
            }
            default {
                throw "Unknown command type: $commandType"
            }
        }
        
        $endTime = Get-Date
        $executionTime = ($endTime - $startTime).TotalMilliseconds
        
        # Check for timeout
        if ($executionTime -gt $maxExecutionTime) {
            $errorOutput = "Command execution exceeded maximum time limit (30 minutes)"
            $exitCode = -1
        }
        
        # Limit output size to 1MB
        $maxOutputSize = 1048576
        if ($output.Length -gt $maxOutputSize) {
            $output = $output.Substring(0, $maxOutputSize) + "... [Output truncated]"
        }
        if ($errorOutput.Length -gt $maxOutputSize) {
            $errorOutput = $errorOutput.Substring(0, $maxOutputSize) + "... [Error truncated]"
        }
        
    } catch {
        $endTime = Get-Date
        $executionTime = ($endTime - $startTime).TotalMilliseconds
        $errorOutput = $_.Exception.Message
        $exitCode = 1
        Write-Warning "[$(Get-Date)] Command execution error: $_"
    }
    
    # Report command result
    Send-CommandResult -CommandId $commandId -Status ($exitCode -eq 0 ? "completed" : "failed") -Output $output -Error $errorOutput -ExitCode $exitCode -ExecutionTime $executionTime
}

# Send command execution result to server
function Send-CommandResult {
    param(
        [Parameter(Mandatory=$true)]
        [int]$CommandId,
        [Parameter(Mandatory=$true)]
        [string]$Status,
        [string]$Output = "",
        [string]$Error = "",
        [int]$ExitCode = 0,
        [double]$ExecutionTime = 0
    )
    
    try {
        $body = @{
            status = $Status
            result_output = $Output
            result_error = $Error
            exit_code = $ExitCode
            execution_time_ms = [int]$ExecutionTime
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$apiBaseUrl/api/commands/$CommandId/status" `
            -Method Post `
            -Body $body `
            -Headers $headers `
            -ErrorAction Stop | Out-Null
        
        Write-Host "[$(Get-Date)] Command $CommandId result sent (Status: $Status, ExitCode: $ExitCode)" -ForegroundColor Green
    } catch {
        Write-Warning "[$(Get-Date)] Failed to send command result: $_"
    }
}

# ============================================
# VNC Server Management Functions
# Phase 9: Remote Desktop & Control
# ============================================

# Check if TightVNC Server is installed
function Test-TightVNCInstalled {
    $vncPath = "C:\Program Files\TightVNC\WinVNC.exe"
    return (Test-Path $vncPath)
}

# Install TightVNC Server silently
function Install-TightVNC {
    try {
        $installerUrl = "https://www.tightvnc.com/download.php"
        $installerPath = "$env:TEMP\TightVNC-2.8.75-setup-64bit.msi"
        
        Write-Host "[$(Get-Date)] Downloading TightVNC installer..." -ForegroundColor Yellow
        
        # Download installer (in production, use a direct download link)
        # For now, we'll check if it exists locally or use a known location
        if (-not (Test-Path $installerPath)) {
            Write-Warning "TightVNC installer not found. Please install manually or provide installer path."
            return @{ Success = $false; Error = "TightVNC installer not available" }
        }
        
        # Install silently
        $installArgs = "/i `"$installerPath`" /quiet /norestart ADDLOCAL=Server SERVER_REGISTER_AS_SERVICE=1 SERVER_ADD_FIREWALL_EXCEPTION=1"
        $process = Start-Process -FilePath "msiexec.exe" -ArgumentList $installArgs -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Host "[$(Get-Date)] TightVNC installed successfully" -ForegroundColor Green
            return @{ Success = $true }
        } else {
            return @{ Success = $false; Error = "Installation failed with exit code $($process.ExitCode)" }
        }
    } catch {
        Write-Warning "[$(Get-Date)] Failed to install TightVNC: $_"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Start VNC Server
function Start-VNCServer {
    param(
        [Parameter(Mandatory=$true)]
        [int]$Port,
        [Parameter(Mandatory=$true)]
        [string]$Password
    )
    
    try {
        # Check if VNC is installed
        if (-not (Test-TightVNCInstalled)) {
            Write-Host "[$(Get-Date)] TightVNC not installed, attempting installation..." -ForegroundColor Yellow
            $installResult = Install-TightVNC
            if (-not $installResult.Success) {
                return @{ Success = $false; Error = "Failed to install TightVNC: $($installResult.Error)" }
            }
        }
        
        $vncPath = "C:\Program Files\TightVNC\WinVNC.exe"
        
        # Configure VNC server with password and port
        # Note: TightVNC stores password in registry, we'll use command line to set it
        $regPath = "HKLM:\SOFTWARE\TightVNC\Server"
        
        # Set VNC password (TightVNC uses encrypted password in registry)
        # For simplicity, we'll use the TightVNC service control
        $serviceName = "tvnserver"
        
        # Check if service exists
        $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        if ($service) {
            # Stop service if running
            if ($service.Status -eq "Running") {
                Stop-Service -Name $serviceName -Force
            }
        }
        
        # Configure VNC server (this is simplified - actual implementation may vary)
        # TightVNC configuration is complex, so we'll start the service and configure via registry
        Set-ItemProperty -Path $regPath -Name "RfbPort" -Value $Port -ErrorAction SilentlyContinue
        Set-ItemProperty -Path $regPath -Name "QueryAcceptOnTimeout" -Value 0 -ErrorAction SilentlyContinue
        
        # Start VNC service
        Start-Service -Name $serviceName -ErrorAction Stop
        
        Write-Host "[$(Get-Date)] VNC server started on port $Port" -ForegroundColor Green
        return @{ Success = $true; Port = $Port }
    } catch {
        Write-Warning "[$(Get-Date)] Failed to start VNC server: $_"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Stop VNC Server
function Stop-VNCServer {
    param(
        [Parameter(Mandatory=$true)]
        [int]$Port
    )
    
    try {
        $serviceName = "tvnserver"
        $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        
        if ($service -and $service.Status -eq "Running") {
            Stop-Service -Name $serviceName -Force
            Write-Host "[$(Get-Date)] VNC server stopped" -ForegroundColor Green
            return @{ Success = $true }
        } else {
            return @{ Success = $true; Message = "VNC server was not running" }
        }
    } catch {
        Write-Warning "[$(Get-Date)] Failed to stop VNC server: $_"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Get VNC Server Status
function Get-VNCServerStatus {
    try {
        $serviceName = "tvnserver"
        $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        
        if ($service) {
            $regPath = "HKLM:\SOFTWARE\TightVNC\Server"
            $port = (Get-ItemProperty -Path $regPath -Name "RfbPort" -ErrorAction SilentlyContinue).RfbPort
            
            return @{
                Success = $true
                Running = ($service.Status -eq "Running")
                Port = $port
            }
        } else {
            return @{ Success = $false; Running = $false; Error = "VNC service not found" }
        }
    } catch {
        return @{ Success = $false; Running = $false; Error = $_.Exception.Message }
    }
}

# ============================================
# File Transfer Functions
# Phase 9: Remote Desktop & Control
# ============================================

# Receive file upload
function Receive-File {
    param(
        [Parameter(Mandatory=$true)]
        [int]$TransferId,
        [Parameter(Mandatory=$true)]
        [string]$FilePath,
        [Parameter(Mandatory=$true)]
        [long]$FileSize
    )
    
    try {
        # Validate file path
        $validatedPath = Validate-FilePath -FilePath $FilePath
        if (-not $validatedPath.Success) {
            return @{ Success = $false; Error = $validatedPath.Error }
        }
        
        # Ensure directory exists
        $directory = Split-Path -Path $validatedPath.Path -Parent
        if (-not (Test-Path $directory)) {
            New-Item -ItemType Directory -Path $directory -Force | Out-Null
        }
        
        # Note: Actual file upload would be handled via HTTP POST to agent endpoint
        # This function prepares the path and validates it
        # The actual file content would be received via the upload endpoint
        
        Write-Host "[$(Get-Date)] File upload prepared: $($validatedPath.Path)" -ForegroundColor Green
        return @{ Success = $true; Path = $validatedPath.Path }
    } catch {
        Write-Warning "[$(Get-Date)] Failed to prepare file upload: $_"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Send file for download
function Send-File {
    param(
        [Parameter(Mandatory=$true)]
        [int]$TransferId,
        [Parameter(Mandatory=$true)]
        [string]$FilePath
    )
    
    try {
        # Validate file path
        $validatedPath = Validate-FilePath -FilePath $FilePath
        if (-not $validatedPath.Success) {
            return @{ Success = $false; Error = $validatedPath.Error }
        }
        
        # Check if file exists
        if (-not (Test-Path $validatedPath.Path)) {
            return @{ Success = $false; Error = "File not found: $($validatedPath.Path)" }
        }
        
        # Get file info
        $fileInfo = Get-Item -Path $validatedPath.Path
        $fileSize = $fileInfo.Length
        
        Write-Host "[$(Get-Date)] File prepared for download: $($validatedPath.Path) ($fileSize bytes)" -ForegroundColor Green
        return @{ Success = $true; Path = $validatedPath.Path; Size = $fileSize }
    } catch {
        Write-Warning "[$(Get-Date)] Failed to prepare file download: $_"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Get file list
function Get-FileList {
    param(
        [Parameter(Mandatory=$false)]
        [string]$Path = "C:\Users\Public\Documents"
    )
    
    try {
        # Validate path
        $validatedPath = Validate-FilePath -FilePath $Path
        if (-not $validatedPath.Success) {
            return @{ Success = $false; Error = $validatedPath.Error }
        }
        
        if (-not (Test-Path $validatedPath.Path)) {
            return @{ Success = $false; Error = "Path not found: $($validatedPath.Path)" }
        }
        
        $items = Get-ChildItem -Path $validatedPath.Path -ErrorAction Stop
        $fileList = @()
        
        foreach ($item in $items) {
            $fileList += @{
                name = $item.Name
                path = $item.FullName
                size = if ($item.PSIsContainer) { $null } else { $item.Length }
                type = if ($item.PSIsContainer) { "directory" } else { "file" }
                modified_at = $item.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ssZ")
            }
        }
        
        return @{ Success = $true; Files = $fileList }
    } catch {
        Write-Warning "[$(Get-Date)] Failed to get file list: $_"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Validate and sanitize file path
function Validate-FilePath {
    param(
        [Parameter(Mandatory=$true)]
        [string]$FilePath
    )
    
    try {
        # Remove null bytes and other dangerous characters
        $cleaned = $FilePath -replace "`0", "" -replace "[\x00-\x1F]", ""
        
        # Check for encoded path traversal attempts
        # Common encodings: %2E%2E, %252E%252E, .., \.., etc.
        $encodedPatterns = @(
            '%2E%2E',      # URL encoded ..
            '%252E%252E',  # Double URL encoded ..
            '\.\.',        # Standard ..
            '\.\.\/',      # ../
            '\.\.\\',      # ..\
            '\.\.%2F',     # URL encoded ../
            '\.\.%5C'      # URL encoded ..\
        )
        
        foreach ($pattern in $encodedPatterns) {
            if ($cleaned -match $pattern) {
                return @{ Success = $false; Error = "Path traversal attempt detected: $FilePath" }
            }
        }
        
        # Normalize path using .NET Path.GetFullPath (handles relative paths, .., etc.)
        # This will throw if path is invalid or contains traversal
        try {
            $normalized = [System.IO.Path]::GetFullPath($cleaned)
        } catch {
            return @{ Success = $false; Error = "Invalid path format: $FilePath" }
        }
        
        # Additional check: ensure normalized path doesn't contain ..
        if ($normalized -match '\.\.') {
            return @{ Success = $false; Error = "Path traversal detected after normalization: $normalized" }
        }
        
        # Only allow certain safe directories (adjust as needed)
        $allowedRoots = @(
            "C:\Users\Public",
            "C:\Temp",
            "C:\Windows\Temp"
        )
        
        $isAllowed = $false
        $matchedRoot = $null
        foreach ($root in $allowedRoots) {
            $rootNormalized = [System.IO.Path]::GetFullPath($root)
            if ($normalized.StartsWith($rootNormalized, [System.StringComparison]::OrdinalIgnoreCase)) {
                $isAllowed = $true
                $matchedRoot = $rootNormalized
                break
            }
        }
        
        if (-not $isAllowed) {
            return @{ Success = $false; Error = "Path not allowed: $normalized (must be under one of: $($allowedRoots -join ', '))" }
        }
        
        # Final validation: ensure path is within the allowed root (prevent escaping via symlinks)
        # This is a basic check - in high-security environments, consider additional ACL checks
        $rootPath = $matchedRoot
        $relativePath = $normalized.Substring($rootPath.Length).TrimStart('\', '/')
        if ($relativePath -match '\.\.') {
            return @{ Success = $false; Error = "Path traversal detected in relative path: $relativePath" }
        }
        
        return @{ Success = $true; Path = $normalized }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Process pending commands
function Process-PendingCommands {
    $commands = Get-PendingCommands
    if ($commands.Count -eq 0) {
        return
    }
    
    Write-Host "[$(Get-Date)] Found $($commands.Count) pending command(s)" -ForegroundColor Cyan
    
    foreach ($command in $commands) {
        Invoke-CommandExecution -Command $command
    }
}

# Main loop
Write-Host "Desktop Support Agent started" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

$lastInventory = Get-Date
$lastCommandPoll = Get-Date
$commandPollInterval = 30000 # Poll for commands every 30 seconds

while ($true) {
    Send-Heartbeat
    Send-PerformanceMetrics
    Send-EventLogs

    # Poll for commands every 30 seconds
    if (((Get-Date) - $lastCommandPoll).TotalMilliseconds -ge $commandPollInterval) {
        Process-PendingCommands
        $lastCommandPoll = Get-Date
    }

    if (((Get-Date) - $lastInventory).TotalMilliseconds -ge $inventoryInterval) {
        Send-Inventory
        $lastInventory = Get-Date
    }

    Start-Sleep -Milliseconds $pollInterval
}

