using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace DesktopSupportAgent;

public class CommandExecutor
{
    private readonly ApiClient _apiClient;
    private readonly FileTransferManager _fileTransferManager;
    private readonly VncManager _vncManager;
    private const int MaxExecutionTimeMs = 1800000; // 30 minutes
    private const int MaxOutputSize = 1048576; // 1MB

    public CommandExecutor(ApiClient apiClient, FileTransferManager fileTransferManager, VncManager vncManager)
    {
        _apiClient = apiClient;
        _fileTransferManager = fileTransferManager;
        _vncManager = vncManager;
    }

    public async Task ExecuteCommandAsync(AgentCommand command, AgentConfig config)
    {
        var startTime = DateTime.UtcNow;
        var commandId = command.Id;
        var commandType = command.CommandType ?? "";
        var commandText = command.CommandText ?? "";
        var parameters = command.Parameters as JObject;

        // Report command started
        try
        {
            await _apiClient.PostAsync(
                $"{config.ApiBaseUrl}/api/commands/{commandId}/status",
                new { status = "running" },
                config.AgentKey);
        }
        catch { }

        string output = "";
        string errorOutput = "";
        int exitCode = 0;

        try
        {
            switch (commandType.ToLower())
            {
                case "chkdsk":
                    var chkdskResult = ExecuteChkdsk();
                    output = chkdskResult.output;
                    errorOutput = chkdskResult.error;
                    exitCode = chkdskResult.exitCode;
                    break;

                case "sfc":
                    var sfcResult = ExecuteSfc();
                    output = sfcResult.output;
                    errorOutput = sfcResult.error;
                    exitCode = sfcResult.exitCode;
                    break;

                case "diskpart":
                    var diskpartResult = ExecuteDiskpart(commandText);
                    output = diskpartResult.output;
                    errorOutput = diskpartResult.error;
                    exitCode = diskpartResult.exitCode;
                    break;

                case "cmd":
                    var cmdResult = ExecuteCmdCommand(commandText);
                    output = cmdResult.output;
                    errorOutput = cmdResult.error;
                    exitCode = cmdResult.exitCode;
                    break;

                case "custom":
                    var customResult = await ExecuteCustomCommand(commandText, parameters, config);
                    output = customResult.output;
                    errorOutput = customResult.error;
                    exitCode = customResult.exitCode;
                    break;

                default:
                    errorOutput = $"Unknown command type: {commandType}";
                    exitCode = 1;
                    break;
            }

            // Limit output size
            if (output.Length > MaxOutputSize)
            {
                output = output.Substring(0, MaxOutputSize) + "... [Output truncated]";
            }
            if (errorOutput.Length > MaxOutputSize)
            {
                errorOutput = errorOutput.Substring(0, MaxOutputSize) + "... [Error truncated]";
            }
        }
        catch (Exception ex)
        {
            errorOutput = ex.Message;
            exitCode = 1;
        }

        var executionTime = (DateTime.UtcNow - startTime).TotalMilliseconds;

        // Check for timeout
        if (executionTime > MaxExecutionTimeMs)
        {
            errorOutput = "Command execution exceeded maximum time limit (30 minutes)";
            exitCode = -1;
        }

        // Report command result
        try
        {
            await _apiClient.PostAsync(
                $"{config.ApiBaseUrl}/api/commands/{commandId}/status",
                new
                {
                    status = exitCode == 0 ? "completed" : "failed",
                    result_output = output,
                    result_error = errorOutput,
                    exit_code = exitCode,
                    execution_time_ms = (int)executionTime
                },
                config.AgentKey);
        }
        catch { }
    }

    private (string output, string error, int exitCode) ExecuteChkdsk()
    {
        try
        {
            var outputFile = Path.Combine(Path.GetTempPath(), $"chkdsk_output_{Guid.NewGuid()}.txt");
            var errorFile = Path.Combine(Path.GetTempPath(), $"chkdsk_error_{Guid.NewGuid()}.txt");

            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "chkdsk.exe",
                    Arguments = "C: /f /r",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                }
            };

            process.Start();
            var output = process.StandardOutput.ReadToEnd();
            var error = process.StandardError.ReadToEnd();
            process.WaitForExit();

            return (output, error, process.ExitCode);
        }
        catch (Exception ex)
        {
            return ("", ex.Message, 1);
        }
    }

    private (string output, string error, int exitCode) ExecuteSfc()
    {
        try
        {
            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "sfc.exe",
                    Arguments = "/scannow",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                }
            };

            process.Start();
            var output = process.StandardOutput.ReadToEnd();
            var error = process.StandardError.ReadToEnd();
            process.WaitForExit();

            return (output, error, process.ExitCode);
        }
        catch (Exception ex)
        {
            return ("", ex.Message, 1);
        }
    }

    private (string output, string error, int exitCode) ExecuteDiskpart(string scriptContent)
    {
        try
        {
            var scriptPath = Path.Combine(Path.GetTempPath(), $"diskpart_script_{Guid.NewGuid()}.txt");
            File.WriteAllText(scriptPath, scriptContent, Encoding.ASCII);

            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "diskpart.exe",
                    Arguments = $"/s {scriptPath}",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                }
            };

            process.Start();
            var output = process.StandardOutput.ReadToEnd();
            var error = process.StandardError.ReadToEnd();
            process.WaitForExit();

            // Clean up script file
            try { File.Delete(scriptPath); } catch { }

            return (output, error, process.ExitCode);
        }
        catch (Exception ex)
        {
            return ("", ex.Message, 1);
        }
    }

    private (string output, string error, int exitCode) ExecuteCmdCommand(string commandText)
    {
        try
        {
            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c {commandText}",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                }
            };

            process.Start();
            var output = process.StandardOutput.ReadToEnd();
            var error = process.StandardError.ReadToEnd();
            process.WaitForExit();

            return (output, error, process.ExitCode);
        }
        catch (Exception ex)
        {
            return ("", ex.Message, 1);
        }
    }

    private async Task<(string output, string error, int exitCode)> ExecuteCustomCommand(string commandText, JObject? parameters, AgentConfig config)
    {
        if (commandText == "start_vnc")
        {
            var port = parameters?["port"]?.Value<int>() ?? 5900;
            var password = parameters?["password"]?.Value<string>() ?? "";
            var result = await _vncManager.StartVncServerAsync(port, password);
            return (result.Success ? $"VNC server started on port {port}" : "", result.Error ?? "", result.Success ? 0 : 1);
        }
        else if (commandText == "stop_vnc")
        {
            var port = parameters?["port"]?.Value<int>() ?? 5900;
            var result = await _vncManager.StopVncServerAsync(port);
            return (result.Success ? $"VNC server stopped on port {port}" : "", result.Error ?? "", result.Success ? 0 : 1);
        }
        else if (commandText == "file_upload")
        {
            var transferId = parameters?["transfer_id"]?.Value<int>() ?? 0;
            var filePath = parameters?["file_path"]?.Value<string>() ?? "";
            var fileSize = parameters?["file_size"]?.Value<long>() ?? 0;
            var result = await _fileTransferManager.ReceiveFileAsync(transferId, filePath, fileSize, config);
            return (result.Success ? $"File upload prepared: {filePath}" : "", result.Error ?? "", result.Success ? 0 : 1);
        }
        else if (commandText == "file_download")
        {
            var transferId = parameters?["transfer_id"]?.Value<int>() ?? 0;
            var filePath = parameters?["file_path"]?.Value<string>() ?? "";
            var result = await _fileTransferManager.SendFileAsync(transferId, filePath, config);
            return (result.Success ? $"File prepared for download: {filePath}" : "", result.Error ?? "", result.Success ? 0 : 1);
        }
        else if (commandText == "file_list")
        {
            var path = parameters?["path"]?.Value<string>() ?? @"C:\Users\Public\Documents";
            var result = await _fileTransferManager.GetFileListAsync(path);
            if (result.Success && result.Files != null)
            {
                var json = Newtonsoft.Json.JsonConvert.SerializeObject(result.Files);
                return (json, "", 0);
            }
            return ("", result.Error ?? "", 1);
        }
        else
        {
            // Execute as regular command
            return ExecuteCmdCommand(commandText);
        }
    }
}

