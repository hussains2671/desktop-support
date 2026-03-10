using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace DesktopSupportAgent;

public class UpdateManager
{
    private readonly ApiClient _apiClient;
    private readonly ILogger<UpdateManager> _logger;
    private const string VersionFile = "agent-version.json";
    private const string UpdateTempDir = "updates";

    public UpdateManager(ApiClient apiClient, ILogger<UpdateManager> logger)
    {
        _apiClient = apiClient;
        _logger = logger;
    }

    public async Task<UpdateCheckResult> CheckForUpdatesAsync(AgentConfig config)
    {
        try
        {
            var currentVersion = GetCurrentVersion();
            var latestVersion = await GetLatestVersionAsync(config);

            if (latestVersion == null)
            {
                return new UpdateCheckResult
                {
                    HasUpdate = false,
                    Error = "Failed to get latest version from server"
                };
            }

            if (IsNewerVersion(latestVersion.Version, currentVersion))
            {
                return new UpdateCheckResult
                {
                    HasUpdate = true,
                    CurrentVersion = currentVersion,
                    LatestVersion = latestVersion.Version,
                    DownloadUrl = latestVersion.DownloadUrl,
                    IsMandatory = latestVersion.IsMandatory ?? false,
                    ReleaseNotes = latestVersion.ReleaseNotes
                };
            }

            return new UpdateCheckResult
            {
                HasUpdate = false,
                CurrentVersion = currentVersion
            };
        }
        catch (Exception ex)
        {
            return new UpdateCheckResult
            {
                HasUpdate = false,
                Error = ex.Message
            };
        }
    }

    public async Task<UpdateResult> DownloadAndInstallUpdateAsync(string downloadUrl, string version, AgentConfig config)
    {
        try
        {
            var installPath = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location) ?? 
                             @"C:\Program Files\DesktopSupportAgent";
            var updateDir = Path.Combine(installPath, UpdateTempDir);
            var updateFile = Path.Combine(updateDir, $"agent-{version}.exe");

            // Create update directory
            if (!Directory.Exists(updateDir))
            {
                Directory.CreateDirectory(updateDir);
            }

            // Download update
            _logger?.LogInformation($"Downloading update {version} from {downloadUrl}");
            await DownloadFileAsync(downloadUrl, updateFile, config.AgentKey);

            // Verify file exists
            if (!File.Exists(updateFile))
            {
                return new UpdateResult
                {
                    Success = false,
                    Error = "Downloaded file not found"
                };
            }

            // Install update (side-by-side)
            var newVersionDir = Path.Combine(installPath, version);
            if (!Directory.Exists(newVersionDir))
            {
                Directory.CreateDirectory(newVersionDir);
            }

            // Extract/copy files to new version directory
            // For MSI, we would run msiexec /i
            // For EXE, we would extract or run installer
            // For now, we'll copy the executable
            var newExePath = Path.Combine(newVersionDir, "DesktopSupportAgent.exe");
            File.Copy(updateFile, newExePath, true);

            // Update version file
            SaveVersion(version, newExePath);

            // Schedule service restart with new version
            ScheduleServiceUpdate(newExePath);

            return new UpdateResult
            {
                Success = true,
                NewVersion = version,
                NewPath = newExePath
            };
        }
        catch (Exception ex)
        {
            return new UpdateResult
            {
                Success = false,
                Error = ex.Message
            };
        }
    }

    private string GetCurrentVersion()
    {
        try
        {
            var installPath = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location) ?? 
                             @"C:\Program Files\DesktopSupportAgent";
            var versionFile = Path.Combine(installPath, VersionFile);

            if (File.Exists(versionFile))
            {
                var versionInfo = JsonConvert.DeserializeObject<VersionInfo>(File.ReadAllText(versionFile));
                return versionInfo?.Version ?? "2.0.0";
            }

            // Get version from assembly
            var assembly = System.Reflection.Assembly.GetExecutingAssembly();
            var version = assembly.GetName().Version;
            return version?.ToString() ?? "2.0.0";
        }
        catch
        {
            return "2.0.0";
        }
    }

    private void SaveVersion(string version, string exePath)
    {
        try
        {
            var installPath = Path.GetDirectoryName(exePath);
            var versionFile = Path.Combine(installPath ?? "", VersionFile);

            var versionInfo = new VersionInfo
            {
                Version = version,
                InstallPath = exePath,
                InstalledAt = DateTime.UtcNow
            };

            File.WriteAllText(versionFile, JsonConvert.SerializeObject(versionInfo, Formatting.Indented));
        }
        catch { }
    }

    private async Task<VersionInfo?> GetLatestVersionAsync(AgentConfig config)
    {
        try
        {
            var response = await _apiClient.GetAsync<ApiResponse<VersionInfo>>(
                $"{config.ApiBaseUrl}/api/agent/versions/latest",
                config.AgentKey);

            return response?.Data;
        }
        catch
        {
            return null;
        }
    }

    private async Task DownloadFileAsync(string url, string filePath, string? agentKey)
    {
        using (var httpClient = new HttpClient())
        {
            if (!string.IsNullOrEmpty(agentKey))
            {
                httpClient.DefaultRequestHeaders.Add("X-Agent-Key", agentKey);
            }

            var response = await httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await response.Content.CopyToAsync(fileStream);
            }
        }
    }

    private bool IsNewerVersion(string newVersion, string currentVersion)
    {
        try
        {
            var newVer = new Version(newVersion);
            var currentVer = new Version(currentVersion);
            return newVer > currentVer;
        }
        catch
        {
            return false;
        }
    }

    private void ScheduleServiceUpdate(string newExePath)
    {
        try
        {
            _logger?.LogInformation($"Scheduling service update. New executable: {newExePath}");
            
            var installPath = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location) ?? 
                             @"C:\Program Files\DesktopSupportAgent";
            var updateScript = Path.Combine(installPath, "update-service.bat");
            
            // Create batch script to update service
            var scriptContent = $@"@echo off
REM Desktop Support Agent Update Script
REM Generated automatically - DO NOT EDIT

echo Stopping DesktopSupportAgent service...
net stop DesktopSupportAgent
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Service stop returned error code %ERRORLEVEL%
)

timeout /t 2 /nobreak >nul

echo Updating service binary...
copy /Y ""{newExePath}"" ""{Path.Combine(installPath, "DesktopSupportAgent.exe")}""
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to copy new executable
    exit /b 1
)

echo Starting DesktopSupportAgent service...
net start DesktopSupportAgent
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to start service
    exit /b 1
)

echo Service updated successfully!
del ""%~f0""
";

            File.WriteAllText(updateScript, scriptContent);
            
            // Schedule task to run update script
            var taskName = "DesktopSupportAgentUpdate";
            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "schtasks.exe",
                    Arguments = $"/Create /TN \"{taskName}\" /TR \"{updateScript}\" /SC ONCE /ST {DateTime.Now.AddSeconds(10):HH:mm} /F /RU SYSTEM",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                }
            };
            
            process.Start();
            process.WaitForExit();
            
            if (process.ExitCode == 0)
            {
                _logger?.LogInformation("Service update scheduled successfully");
            }
            else
            {
                var error = process.StandardError.ReadToEnd();
                _logger?.LogWarning($"Failed to schedule update task: {error}");
                
                // Fallback: Try to update immediately if running as administrator
                try
                {
                    UpdateServiceImmediately(newExePath, installPath);
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Failed to update service immediately");
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to schedule service update");
        }
    }

    private void UpdateServiceImmediately(string newExePath, string installPath)
    {
        try
        {
            _logger?.LogInformation("Attempting immediate service update...");
            
            // Stop service
            var stopProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "net.exe",
                    Arguments = "stop DesktopSupportAgent",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true
                }
            };
            stopProcess.Start();
            stopProcess.WaitForExit();
            
            System.Threading.Thread.Sleep(2000);
            
            // Copy new executable
            var targetPath = Path.Combine(installPath, "DesktopSupportAgent.exe");
            File.Copy(newExePath, targetPath, true);
            
            // Start service
            var startProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "net.exe",
                    Arguments = "start DesktopSupportAgent",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true
                }
            };
            startProcess.Start();
            startProcess.WaitForExit();
            
            _logger?.LogInformation("Service updated successfully");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to update service immediately");
            throw;
        }
    }
}

public class UpdateCheckResult
{
    public bool HasUpdate { get; set; }
    public string? CurrentVersion { get; set; }
    public string? LatestVersion { get; set; }
    public string? DownloadUrl { get; set; }
    public bool IsMandatory { get; set; }
    public string? ReleaseNotes { get; set; }
    public string? Error { get; set; }
}

public class UpdateResult
{
    public bool Success { get; set; }
    public string? NewVersion { get; set; }
    public string? NewPath { get; set; }
    public string? Error { get; set; }
}

public class VersionInfo
{
    [JsonProperty("version")]
    public string Version { get; set; } = "";

    [JsonProperty("download_url")]
    public string? DownloadUrl { get; set; }

    [JsonProperty("is_mandatory")]
    public bool? IsMandatory { get; set; }

    [JsonProperty("release_notes")]
    public string? ReleaseNotes { get; set; }

    [JsonProperty("install_path")]
    public string? InstallPath { get; set; }

    [JsonProperty("installed_at")]
    public DateTime? InstalledAt { get; set; }
}

