using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace DesktopSupportAgent;

public class AgentService : BackgroundService
{
    private readonly ILogger<AgentService> _logger;
    private readonly ConfigManager _configManager;
    private readonly ApiClient _apiClient;
    private readonly InventoryCollector _inventoryCollector;
    private readonly PerformanceCollector _performanceCollector;
    private readonly EventLogCollector _eventLogCollector;
    private readonly CommandExecutor _commandExecutor;
    private readonly FileTransferManager _fileTransferManager;
    private readonly VncManager _vncManager;
    private readonly UpdateManager _updateManager;

    public AgentService(
        ILogger<AgentService> logger,
        ConfigManager configManager,
        ApiClient apiClient,
        InventoryCollector inventoryCollector,
        PerformanceCollector performanceCollector,
        EventLogCollector eventLogCollector,
        FileTransferManager fileTransferManager,
        VncManager vncManager,
        CommandExecutor commandExecutor,
        UpdateManager updateManager)
    {
        _logger = logger;
        _configManager = configManager;
        _apiClient = apiClient;
        _inventoryCollector = inventoryCollector;
        _performanceCollector = performanceCollector;
        _eventLogCollector = eventLogCollector;
        _fileTransferManager = fileTransferManager;
        _vncManager = vncManager;
        _commandExecutor = commandExecutor;
        _updateManager = updateManager;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Desktop Support Agent Service started");

        try
        {
            var config = _configManager.GetConfig();
            if (config == null)
            {
                _logger.LogError("Failed to load configuration. Service will stop.");
                return;
            }

            _logger.LogInformation($"Agent Type: Native (.NET)");
            _logger.LogInformation($"Agent Version: {config.AgentVersion ?? "2.0.0"}");
            _logger.LogInformation($"API Base URL: {config.ApiBaseUrl}");
            _logger.LogInformation($"Device ID: {config.DeviceId}");

            var pollInterval = TimeSpan.FromMilliseconds(config.PollInterval ?? 300000); // 5 minutes default
            var inventoryInterval = TimeSpan.FromMilliseconds(config.InventoryInterval ?? 86400000); // 24 hours default

            DateTime lastHeartbeat = DateTime.MinValue;
            DateTime lastInventory = DateTime.MinValue;
            DateTime lastPerformance = DateTime.MinValue;
            DateTime lastEventLogs = DateTime.MinValue;
            DateTime lastCommandCheck = DateTime.MinValue;
            DateTime lastUpdateCheck = DateTime.MinValue;

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var now = DateTime.UtcNow;

                    // Send heartbeat every poll interval
                    if (now - lastHeartbeat >= pollInterval)
                    {
                        await SendHeartbeatAsync(config);
                        lastHeartbeat = now;
                    }

                    // Send performance metrics every poll interval
                    if (now - lastPerformance >= pollInterval)
                    {
                        await SendPerformanceMetricsAsync(config);
                        lastPerformance = now;
                    }

                    // Send event logs every poll interval
                    if (now - lastEventLogs >= pollInterval)
                    {
                        await SendEventLogsAsync(config);
                        lastEventLogs = now;
                    }

                    // Send inventory every inventory interval
                    if (now - lastInventory >= inventoryInterval)
                    {
                        await SendInventoryAsync(config);
                        lastInventory = now;
                    }

                    // Check for pending commands every 30 seconds
                    if (now - lastCommandCheck >= TimeSpan.FromSeconds(30))
                    {
                        await ProcessPendingCommandsAsync(config);
                        lastCommandCheck = now;
                    }

                    // Check for updates every hour
                    if (now - lastUpdateCheck >= TimeSpan.FromHours(1))
                    {
                        await CheckForUpdatesAsync(config);
                        lastUpdateCheck = now;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in main agent loop");
                }

                // Sleep for 1 second before next iteration
                await Task.Delay(1000, stoppingToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "Fatal error in agent service");
            throw;
        }
        finally
        {
            _logger.LogInformation("Desktop Support Agent Service stopped");
        }
    }

    private async Task SendHeartbeatAsync(AgentConfig config)
    {
        try
        {
            var body = new
            {
                device_id = config.DeviceId
            };

            await _apiClient.PostAsync($"{config.ApiBaseUrl}/api/agent/heartbeat", body, config.AgentKey);
            _logger.LogDebug("Heartbeat sent successfully");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send heartbeat");
        }
    }

    private async Task SendInventoryAsync(AgentConfig config)
    {
        try
        {
            var hardware = await _inventoryCollector.GetHardwareInventoryAsync();
            var software = await _inventoryCollector.GetSoftwareInventoryAsync();

            var body = new
            {
                device_id = config.DeviceId,
                hardware = hardware,
                software = software
            };

            await _apiClient.PostAsync($"{config.ApiBaseUrl}/api/agent/inventory", body, config.AgentKey);
            _logger.LogInformation("Inventory sent successfully");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send inventory");
        }
    }

    private async Task SendPerformanceMetricsAsync(AgentConfig config)
    {
        try
        {
            var metrics = await _performanceCollector.GetPerformanceMetricsAsync();

            var body = new
            {
                device_id = config.DeviceId,
                metrics = metrics
            };

            await _apiClient.PostAsync($"{config.ApiBaseUrl}/api/agent/performance", body, config.AgentKey);
            _logger.LogDebug("Performance metrics sent successfully");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send performance metrics");
        }
    }

    private async Task SendEventLogsAsync(AgentConfig config)
    {
        try
        {
            var logs = await _eventLogCollector.GetEventLogsAsync();

            if (logs.Count == 0)
                return;

            var body = new
            {
                device_id = config.DeviceId,
                logs = logs
            };

            await _apiClient.PostAsync($"{config.ApiBaseUrl}/api/agent/event-logs", body, config.AgentKey);
            _logger.LogDebug($"Event logs sent successfully ({logs.Count} logs)");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send event logs");
        }
    }

    private async Task ProcessPendingCommandsAsync(AgentConfig config)
    {
        try
        {
            var commands = await _apiClient.GetAsync<List<AgentCommand>>(
                $"{config.ApiBaseUrl}/api/commands/pending",
                config.AgentKey);

            if (commands == null || commands.Count == 0)
                return;

            _logger.LogInformation($"Found {commands.Count} pending command(s)");

            foreach (var command in commands)
            {
                await _commandExecutor.ExecuteCommandAsync(command, config);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to process pending commands");
        }
    }

    private async Task CheckForUpdatesAsync(AgentConfig config)
    {
        try
        {
            var updateCheck = await _updateManager.CheckForUpdatesAsync(config);
            
            if (updateCheck.HasUpdate)
            {
                _logger.LogInformation($"Update available: {updateCheck.CurrentVersion} -> {updateCheck.LatestVersion}");
                
                if (updateCheck.IsMandatory || updateCheck.DownloadUrl != null)
                {
                    _logger.LogInformation("Downloading and installing update...");
                    var updateResult = await _updateManager.DownloadAndInstallUpdateAsync(
                        updateCheck.DownloadUrl ?? "",
                        updateCheck.LatestVersion ?? "",
                        config);

                    if (updateResult.Success)
                    {
                        _logger.LogInformation($"Update installed successfully: {updateResult.NewVersion}");
                        // Service will restart with new version
                    }
                    else
                    {
                        _logger.LogWarning($"Update failed: {updateResult.Error}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to check for updates");
        }
    }
}

