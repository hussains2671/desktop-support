const { Agent, Device, Company } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { HardwareInventory, SoftwareInventory, EventLog, PerformanceMetric, Alert } = require('../models');
const { isFeatureEnabled } = require('../middleware/featureCheck');
const fs = require('fs');
const path = require('path');

// Agent registration
exports.register = async (req, res) => {
    try {
        const { device_id, hostname, os_version, agent_version, ip_address } = req.body;
        const companyId = req.companyId || req.body.company_id;
        const companyCode = req.body.company_code;

        if (!companyId && !companyCode) {
            return res.status(400).json({
                success: false,
                message: 'Company ID or Company Code required'
            });
        }

        let company;
        if (companyCode) {
            company = await Company.findOne({ where: { company_code: companyCode } });
        } else {
            company = await Company.findByPk(companyId);
        }

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        const companyIdForQuery = company.id;

        // Check agent limit
        const agentCount = await Agent.count({ where: { company_id: companyIdForQuery } });
        const maxAgents = company.max_agents || 100;

        if (agentCount >= maxAgents) {
            return res.status(403).json({
                success: false,
                message: 'Maximum agent limit reached'
            });
        }

        // Generate agent key
        const agentKey = crypto.randomBytes(32).toString('hex');

        // Find or create agent
        const [agent, created] = await Agent.findOrCreate({
            where: {
                company_id: companyIdForQuery,
                device_id: device_id
            },
            defaults: {
                agent_key: agentKey,
                hostname: hostname,
                os_version: os_version,
                agent_version: agent_version || '1.0.0',
                status: 'online',
                ip_address: ip_address,
                last_heartbeat: new Date()
            }
        });

        if (!created) {
            // Update existing agent
            agent.agent_key = agentKey;
            agent.hostname = hostname;
            agent.os_version = os_version;
            agent.agent_version = agent_version || '1.0.0';
            agent.status = 'online';
            agent.ip_address = ip_address;
            agent.last_heartbeat = new Date();
            await agent.save();
        }

        logger.info(`Agent registered: ${device_id} for company ${company.id} (code: ${company.company_code})`);

        res.status(201).json({
            success: true,
            message: 'Agent registered successfully',
            data: {
                agent_id: agent.id,
                agent_key: agent.agent_key,
                company_id: company.id,
                company_code: company.company_code
            }
        });
    } catch (error) {
        logger.error('Agent registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Agent heartbeat
exports.heartbeat = async (req, res) => {
    try {
        const agentKey = req.headers['x-agent-key'];
        const { device_id } = req.body;

        if (!agentKey) {
            return res.status(401).json({
                success: false,
                message: 'Agent key required'
            });
        }

        const agent = await Agent.findOne({
            where: { agent_key: agentKey, device_id: device_id },
            include: [{ model: Company }]
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        agent.last_heartbeat = new Date();
        agent.status = 'online';
        await agent.save();

        res.json({
            success: true,
            message: 'Heartbeat received'
        });
    } catch (error) {
        logger.error('Heartbeat error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Upload inventory
exports.uploadInventory = async (req, res) => {
    try {
        const agentKey = req.headers['x-agent-key'];
        const { device_id, hardware, software } = req.body;

        if (!agentKey) {
            return res.status(401).json({
                success: false,
                message: 'Agent key required'
            });
        }

        const agent = await Agent.findOne({
            where: { agent_key: agentKey, device_id: device_id }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Find or create device
        const [device, deviceCreated] = await Device.findOrCreate({
            where: {
                company_id: agent.company_id,
                device_id: device_id
            },
            defaults: {
                hostname: hardware?.system?.hostname || agent.hostname,
                os_name: hardware?.system?.os_name || '',
                os_version: hardware?.system?.os_version || agent.os_version,
                manufacturer: hardware?.system?.manufacturer || '',
                model: hardware?.system?.model || '',
                serial_number: hardware?.system?.serial_number || '',
                cpu_name: hardware?.cpu?.name || '',
                cpu_cores: hardware?.cpu?.cores || 0,
                ram_total_gb: hardware?.ram?.reduce((sum, r) => sum + (r.capacity / (1024 * 1024 * 1024)), 0) || 0,
                status: 'online'
            }
        });

        if (!deviceCreated) {
            device.hostname = hardware?.system?.hostname || device.hostname;
            device.os_name = hardware?.system?.os_name || device.os_name;
            device.os_version = hardware?.system?.os_version || device.os_version;
            device.manufacturer = hardware?.system?.manufacturer || device.manufacturer;
            device.model = hardware?.system?.model || device.model;
            device.serial_number = hardware?.system?.serial_number || device.serial_number;
            device.cpu_name = hardware?.cpu?.name || device.cpu_name;
            device.cpu_cores = hardware?.cpu?.cores || device.cpu_cores;
            device.ram_total_gb = hardware?.ram?.reduce((sum, r) => sum + (r.capacity / (1024 * 1024 * 1024)), 0) || device.ram_total_gb;
            device.status = 'online';
            device.last_seen = new Date();
            await device.save();
        }

        // Save hardware inventory
        if (hardware) {
            await HardwareInventory.create({
                device_id: device.id,
                inventory_data: hardware,
                inventory_type: 'hardware'
            });
        }

        // Save software inventory
        if (software && Array.isArray(software)) {
            await SoftwareInventory.bulkCreate(
                software.map(sw => ({
                    device_id: device.id,
                    name: sw.name || '',
                    version: sw.version || '',
                    publisher: sw.publisher || '',
                    install_date: sw.install_date || null,
                    install_location: sw.install_location || ''
                }))
            );
        }

        res.json({
            success: true,
            message: 'Inventory uploaded successfully'
        });
    } catch (error) {
        logger.error('Upload inventory error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Upload event logs
exports.uploadEventLogs = async (req, res) => {
    try {
        const agentKey = req.headers['x-agent-key'];
        const { device_id, logs } = req.body;

        if (!agentKey) {
            return res.status(401).json({
                success: false,
                message: 'Agent key required'
            });
        }

        const agent = await Agent.findOne({
            where: { agent_key: agentKey, device_id: device_id }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        const device = await Device.findOne({
            where: { company_id: agent.company_id, device_id: device_id }
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        if (logs && Array.isArray(logs)) {
            await EventLog.bulkCreate(
                logs.map(log => ({
                device_id: device.id,
                    log_type: log.log_type || 'application',
                    event_id: log.event_id || 0,
                level: log.level || 'information',
                    source: log.source || '',
                    message: log.message || '',
                    time_generated: log.time_generated ? new Date(log.time_generated) : new Date()
                }))
            );
                }

        res.json({
            success: true,
            message: 'Event logs uploaded successfully'
        });
    } catch (error) {
        logger.error('Upload event logs error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Upload performance metrics
exports.uploadPerformance = async (req, res) => {
    try {
        const agentKey = req.headers['x-agent-key'];
        const { device_id, metrics } = req.body;

        if (!agentKey) {
            return res.status(401).json({
                success: false,
                message: 'Agent key required'
            });
        }

        const agent = await Agent.findOne({
            where: { agent_key: agentKey, device_id: device_id }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        const device = await Device.findOne({
            where: { company_id: agent.company_id, device_id: device_id }
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        if (metrics) {
            await PerformanceMetric.create({
            device_id: device.id,
                cpu_usage: metrics.cpu_usage || 0,
                memory_usage: metrics.memory_usage || 0,
                memory_total_gb: metrics.memory_total_gb || 0,
                memory_available_gb: metrics.memory_available_gb || 0,
                disk_usage_c: metrics.disk_usage_c || 0,
                disk_free_c_gb: metrics.disk_free_c_gb || 0,
                disk_total_c_gb: metrics.disk_total_c_gb || 0,
                recorded_at: metrics.recorded_at ? new Date(metrics.recorded_at) : new Date()
        });

            // Update device status based on metrics
            if (metrics.cpu_usage > 90 || metrics.memory_usage > 90) {
                device.status = 'warning';
            } else {
                device.status = 'online';
            }
            device.last_seen = new Date();
            await device.save();
        }

        res.json({
            success: true,
            message: 'Performance metrics uploaded successfully'
        });
    } catch (error) {
        logger.error('Upload performance error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all agents for company
exports.getAllAgents = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const where = { company_id: companyId };
        if (search) {
            where[Op.or] = [
                { hostname: { [Op.iLike]: `%${search}%` } },
                { device_id: { [Op.iLike]: `%${search}%` } },
                { ip_address: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (status) {
            where.status = status;
        }

        const agents = await Agent.findAndCountAll({
            where,
            include: [{
                model: Device,
                as: 'Device',
                attributes: ['id', 'hostname', 'username', 'status'],
                required: false
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['last_heartbeat', 'DESC']]
        });

        // Remove sensitive data
        const agentsData = agents.rows.map(agent => {
            const agentData = agent.toJSON();
            delete agentData.agent_key;
            return agentData;
        });

        res.json({
            success: true,
            data: agentsData,
            pagination: {
                total: agents.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(agents.count / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Get all agents error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get agent details
exports.getAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const agent = await Agent.findOne({
            where: {
                id: parseInt(id),
                company_id: companyId
            },
            include: [{
                model: Device,
                as: 'Device',
                attributes: ['id', 'hostname', 'username', 'status', 'os_version', 'serial_number'],
                required: false
            }]
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        const agentData = agent.toJSON();
        // Only show partial agent key for security
        if (agentData.agent_key) {
            agentData.agent_key = agentData.agent_key.substring(0, 8) + '...';
        }

        res.json({
            success: true,
            data: agentData
        });
    } catch (error) {
        logger.error('Get agent error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update agent
exports.updateAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const { hostname, status, agent_version } = req.body;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const agent = await Agent.findOne({
            where: {
                id: parseInt(id),
                company_id: companyId
            }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        const updateData = {};
        if (hostname !== undefined) updateData.hostname = hostname;
        if (status !== undefined) updateData.status = status;
        if (agent_version !== undefined) updateData.agent_version = agent_version;

        await agent.update(updateData);

        const agentData = agent.toJSON();
        delete agentData.agent_key;

        logger.info(`Agent updated: ${id} by company ${companyId}`);

        res.json({
            success: true,
            message: 'Agent updated successfully',
            data: agentData
        });
    } catch (error) {
        logger.error('Update agent error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete agent
exports.deleteAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const agent = await Agent.findOne({
            where: {
                id: parseInt(id),
                company_id: companyId
            }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        await agent.destroy();

        logger.info(`Agent deleted: ${id} by company ${companyId}`);

        res.json({
            success: true,
            message: 'Agent deleted successfully'
        });
    } catch (error) {
        logger.error('Delete agent error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Revoke agent key
exports.revokeAgentKey = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const agent = await Agent.findOne({
            where: {
                id: parseInt(id),
                company_id: companyId
            }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Generate new key (effectively revoking old one)
        const newKey = crypto.randomBytes(32).toString('hex');
        agent.agent_key = newKey;
        agent.status = 'offline';
        await agent.save();

        logger.info(`Agent key revoked: ${id} by company ${companyId}`);

        res.json({
            success: true,
            message: 'Agent key revoked successfully',
            data: {
                agent_id: agent.id,
                new_agent_key: newKey
            }
        });
    } catch (error) {
        logger.error('Revoke agent key error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Rotate agent key
exports.rotateAgentKey = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const agent = await Agent.findOne({
            where: {
                id: parseInt(id),
                company_id: companyId
            }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Generate new key
        const newKey = crypto.randomBytes(32).toString('hex');
        agent.agent_key = newKey;
        await agent.save();

        logger.info(`Agent key rotated: ${id} by company ${companyId}`);

        res.json({
            success: true,
            message: 'Agent key rotated successfully',
            data: {
                agent_id: agent.id,
                new_agent_key: newKey
            }
        });
    } catch (error) {
        logger.error('Rotate agent key error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Download installer files
exports.downloadInstaller = async (req, res) => {
    try {
        const companyId = req.companyId || req.user?.company_id;
        const fileType = req.params.type; // 'ps1', 'bat', or 'all'
        
        if (!companyId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const company = await Company.findByPk(companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Detect protocol from request (HTTPS preferred)
        const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
        const host = req.get('host')?.replace(':3001', ':3000') || 'localhost:3000';
        const apiBaseUrl = process.env.API_BASE_URL || `${protocol}://${host}`;
        const apiUrl = `${apiBaseUrl}/api`;
        const companyCode = company.company_code;

        if (fileType === 'ps1') {
            // Generate PowerShell installer with pre-filled values
            const installerTemplate = `# Desktop Support Agent Installer
# Run as Administrator
# Pre-configured for Company: ${company.name}
# Company Code: ${companyCode}

param(
    [Parameter(Mandatory=$false)]
    [string]$InstallPath = "C:\\Program Files\\DesktopSupportAgent",
    
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

# Pre-configured values
$ApiBaseUrl = "${apiUrl}"
$CompanyCode = "${companyCode}"

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

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-ErrorAndExit "This script must be run as Administrator. Please right-click and select 'Run as Administrator'."
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Desktop Support Agent Installer" -ForegroundColor Cyan
Write-Host "Company: ${company.name}" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

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
Write-Host "Company Code: $CompanyCode" -ForegroundColor Cyan
Write-Host ""

# Register agent with server
Write-Host "Registering agent with server..." -ForegroundColor Yellow
try {
    $registerBody = @{
        device_id = $deviceId
        hostname = $hostname
        os_version = $osVersion
        agent_version = "1.0.0"
        company_code = $CompanyCode
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/api/agent/register" \`
        -Method Post \`
        -Body $registerBody \`
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

# Download agent script from server
Write-Host "Downloading agent script..." -ForegroundColor Yellow
$agentScriptUrl = "$ApiBaseUrl/agent/script"
try {
    $agentScript = Invoke-RestMethod -Uri $agentScriptUrl -Method Get
    $agentScriptPath = Join-Path $InstallPath "DesktopSupportAgent.ps1"
    $agentScript | Out-File -FilePath $agentScriptPath -Encoding UTF8
} catch {
    Write-Warning "Could not download agent script. Using embedded version."
    # Embedded agent script would go here if needed
}

# Create agent configuration file
$configContent = @{
    ApiBaseUrl = $ApiBaseUrl
    AgentKey = $agentKey
    DeviceId = $deviceId
    CompanyCode = $CompanyCode
    PollInterval = 300000
    InventoryInterval = 86400000
} | ConvertTo-Json -Depth 10

$configPath = Join-Path $InstallPath "config.json"
$configContent | Out-File -FilePath $configPath -Encoding UTF8

# Create Windows Service using Task Scheduler
Write-Host "Creating Windows service..." -ForegroundColor Yellow

$taskName = "DesktopSupportAgent"

# Build PowerShell arguments based on execution policy
if ($ForceBypass) {
    $psArguments = "-ExecutionPolicy Bypass -File \\\`"$InstallPath\\DesktopSupportAgent.ps1\\\`""
    Write-Host "WARNING: Using ExecutionPolicy Bypass (not recommended for production)" -ForegroundColor Yellow
} else {
    # Use default execution policy (recommended: scripts should be signed)
    $psArguments = "-NoProfile -File \\\`"$InstallPath\\DesktopSupportAgent.ps1\\\`""
    Write-Host "Using default execution policy (recommended: sign scripts for production)" -ForegroundColor Green
}

$taskAction = New-ScheduledTaskAction -Execute "PowerShell.exe" \`
    -Argument $psArguments \`
    -WorkingDirectory $InstallPath

$taskTrigger = New-ScheduledTaskTrigger -AtStartup
$taskPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3

try {
    Register-ScheduledTask -TaskName $taskName \`
        -Action $taskAction \`
        -Trigger $taskTrigger \`
        -Principal $taskPrincipal \`
        -Settings $taskSettings \`
        -Description "Desktop Support Agent - System Monitoring Service" \`
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
Write-Host "  Unregister-ScheduledTask -TaskName $taskName -Confirm:\`\$false" -ForegroundColor White
`;

            res.setHeader('Content-Type', 'application/x-powershell');
            res.setHeader('Content-Disposition', `attachment; filename="Install-Agent-${companyCode}.ps1"`);
            res.send(installerTemplate);
            return;
        }

        if (fileType === 'bat') {
            // Generate Batch file installer - Self-contained version
            // Downloads PowerShell script from server if not found locally
            const batTemplate = `@echo off
REM Desktop Support Agent - Easy Installer
REM Pre-configured for Company: ${company.name}
REM Company Code: ${companyCode}
REM Run this as Administrator

echo ========================================
echo Desktop Support Agent Installer
echo Company: ${company.name}
echo ========================================
echo.

REM Pre-configured values
set API_URL=${apiUrl}
set COMPANY_CODE=${companyCode}
set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%Install-Agent.ps1"
set TEMP_SCRIPT=%TEMP%\\Install-Agent-Temp-%RANDOM%.ps1

echo Using API URL: %API_URL%
echo Using Company Code: %COMPANY_CODE%
echo.

REM Check if URL is HTTP (warn user)
echo %API_URL% | findstr /i "http://" >nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo WARNING: HTTP detected!
    echo ========================================
    echo.
    echo HTTP is insecure. Use HTTPS in production.
    echo To proceed with HTTP (dev/test only), use -AllowInsecureHttp flag.
    echo.
    pause
)

REM Check if PowerShell script exists locally, if not download it
if not exist "%PS_SCRIPT%" (
    echo PowerShell script not found locally. Downloading from server...
    echo.
    
    REM Download PowerShell installer script from server (without ExecutionPolicy Bypass)
    powershell.exe -NoProfile -Command "try { $script = Invoke-RestMethod -Uri '${apiUrl}/agent/download/ps1' -Method Get; $script | Out-File -FilePath '%TEMP_SCRIPT%' -Encoding UTF8; Write-Host 'Downloaded successfully' } catch { Write-Host 'Failed to download: ' $_.Exception.Message -ForegroundColor Red; exit 1 }"
    
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to download PowerShell installer script from server.
        echo Please check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
    
    set "PS_SCRIPT=%TEMP_SCRIPT%"
    echo PowerShell script downloaded successfully.
    echo.
) else (
    echo Using local PowerShell script: %PS_SCRIPT%
    echo.
)

echo Installing agent...
echo.

REM Execute the PowerShell script WITHOUT ExecutionPolicy Bypass
REM Note: The PowerShell script is pre-configured with API URL and Company Code
REM If execution fails, user should sign scripts or adjust execution policy
powershell.exe -NoProfile -NoExit -File "%PS_SCRIPT%"

set EXIT_CODE=%ERRORLEVEL%

REM Clean up temporary script if we downloaded it
if "%PS_SCRIPT%"=="%TEMP_SCRIPT%" (
    if exist "%TEMP_SCRIPT%" del "%TEMP_SCRIPT%"
)

if %EXIT_CODE% EQU 0 (
    echo.
    echo ========================================
    echo Installation completed successfully!
    echo ========================================
    echo.
    pause
) else (
    echo.
    echo ========================================
    echo Installation failed with error code: %EXIT_CODE%
    echo ========================================
    echo.
    echo Please check the PowerShell window above for detailed error messages.
    echo.
    pause
    exit /b %EXIT_CODE%
)
`;

            res.setHeader('Content-Type', 'application/x-msdos-program');
            res.setHeader('Content-Disposition', `attachment; filename="Install-Agent-${companyCode}.bat"`);
            res.send(batTemplate);
            return;
        }

        // For 'all' or zip, we'll create a zip file
        // For now, return JSON with download links
        res.json({
            success: true,
            data: {
                ps1: `/api/agent/download/ps1`,
                bat: `/api/agent/download/bat`,
                company_code: companyCode,
                api_url: apiUrl
            }
        });

    } catch (error) {
        logger.error('Download installer error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.downloadAgentScript = async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, '../../agent/DesktopSupportAgent.ps1');
        
        if (!fs.existsSync(scriptPath)) {
            return res.status(404).json({
                success: false,
                message: 'Agent script not found'
            });
        }

        res.setHeader('Content-Type', 'application/x-powershell');
        res.setHeader('Content-Disposition', 'attachment; filename="DesktopSupportAgent.ps1"');
        res.sendFile(scriptPath);
    } catch (error) {
        logger.error('Download agent script error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get latest agent version (for auto-update)
exports.getLatestVersion = async (req, res) => {
    try {
        // Get agent key from header (optional, for logging)
        const agentKey = req.headers['x-agent-key'];
        
        // For now, return a static version
        // In production, this should be stored in database or config
        const latestVersion = {
            version: '2.0.0',
            download_url: process.env.AGENT_DOWNLOAD_URL || `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/agent/download/native`,
            is_mandatory: false,
            release_notes: 'Native Windows Service Agent v2.0.0'
        };

        res.json({
            success: true,
            data: latestVersion
        });
    } catch (error) {
        logger.error('Get latest version error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
