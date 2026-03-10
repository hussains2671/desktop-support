using Newtonsoft.Json;
using System;
using System.IO;
using Microsoft.Extensions.Logging;

namespace DesktopSupportAgent;

public class ConfigManager
{
    private AgentConfig? _config;
    private readonly string[] _configPaths;
    private readonly ILogger<ConfigManager>? _logger;

    public ConfigManager(ILogger<ConfigManager>? logger = null)
    {
        _logger = logger;
        
        // Try multiple paths: production path, current directory, user directory
        _configPaths = new[]
        {
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                "DesktopSupportAgent",
                "config.json"
            ),
            Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory,
                "config.json"
            ),
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "DesktopSupportAgent",
                "config.json"
            ),
            Path.Combine(
                Directory.GetCurrentDirectory(),
                "config.json"
            )
        };
    }

    public AgentConfig? GetConfig()
    {
        if (_config != null)
            return _config;

        foreach (var configPath in _configPaths)
        {
            try
            {
                if (File.Exists(configPath))
                {
                    _logger?.LogInformation($"Loading config from: {configPath}");
                    var json = File.ReadAllText(configPath);
                    _config = JsonConvert.DeserializeObject<AgentConfig>(json);
                    
                    // Validate required fields
                    if (_config != null && ValidateConfig(_config))
                    {
                        return _config;
                    }
                    else
                    {
                        _logger?.LogWarning($"Config file found but validation failed: {configPath}");
                        _config = null;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, $"Failed to load config from: {configPath}");
            }
        }

        _logger?.LogError("No valid config file found in any of the search paths");
        return null;
    }

    private bool ValidateConfig(AgentConfig config)
    {
        if (string.IsNullOrEmpty(config.ApiBaseUrl))
        {
            _logger?.LogError("Config validation failed: ApiBaseUrl is required");
            return false;
        }

        if (string.IsNullOrEmpty(config.AgentKey))
        {
            _logger?.LogError("Config validation failed: AgentKey is required");
            return false;
        }

        if (string.IsNullOrEmpty(config.DeviceId))
        {
            _logger?.LogError("Config validation failed: DeviceId is required");
            return false;
        }

        return true;
    }
}

public class AgentConfig
{
    [JsonProperty("ApiBaseUrl")]
    public string? ApiBaseUrl { get; set; }

    [JsonProperty("AgentKey")]
    public string? AgentKey { get; set; }

    [JsonProperty("DeviceId")]
    public string? DeviceId { get; set; }

    [JsonProperty("CompanyCode")]
    public string? CompanyCode { get; set; }

    [JsonProperty("PollInterval")]
    public int? PollInterval { get; set; }

    [JsonProperty("InventoryInterval")]
    public int? InventoryInterval { get; set; }

    [JsonProperty("AgentVersion")]
    public string? AgentVersion { get; set; }

    [JsonProperty("AgentType")]
    public string? AgentType { get; set; }
}

