using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Microsoft.Extensions.Logging;

namespace DesktopSupportAgent;

public class FileTransferManager
{
    private readonly ApiClient _apiClient;
    private readonly ILogger<FileTransferManager>? _logger;
    private readonly HttpClient _httpClient;

    public FileTransferManager(ApiClient apiClient, ILogger<FileTransferManager>? logger = null)
    {
        _apiClient = apiClient;
        _logger = logger;
        _httpClient = new HttpClient();
        _httpClient.Timeout = TimeSpan.FromHours(1); // Long timeout for large files
    }

    public async Task<TransferResult> ReceiveFileAsync(int transferId, string filePath, long fileSize, AgentConfig config)
    {
        try
        {
            // Validate file path
            var validatedPath = ValidateFilePath(filePath);
            if (!validatedPath.Success)
            {
                _logger?.LogError($"File path validation failed: {validatedPath.Error}");
                return new TransferResult { Success = false, Error = validatedPath.Error };
            }

            // Ensure directory exists
            var directory = Path.GetDirectoryName(validatedPath.Path);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            // Get upload URL and token from backend
            var uploadInfo = await GetUploadInfoAsync(transferId, config);
            if (uploadInfo == null || string.IsNullOrEmpty(uploadInfo.UploadUrl))
            {
                return new TransferResult { Success = false, Error = "Failed to get upload information from server" };
            }

            // Wait for file upload from backend
            // The backend will POST the file to /api/file-transfer/upload
            // For now, we'll prepare the path and return success
            // The actual file will be received when backend sends it
            
            _logger?.LogInformation($"File upload prepared: {validatedPath.Path} (Transfer ID: {transferId})");
            return new TransferResult { Success = true, Path = validatedPath.Path, Size = fileSize };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error in ReceiveFileAsync for transfer {transferId}");
            return new TransferResult { Success = false, Error = ex.Message };
        }
    }

    public async Task<TransferResult> SendFileAsync(int transferId, string filePath, AgentConfig config)
    {
        try
        {
            // Validate file path
            var validatedPath = ValidateFilePath(filePath);
            if (!validatedPath.Success)
            {
                _logger?.LogError($"File path validation failed: {validatedPath.Error}");
                return new TransferResult { Success = false, Error = validatedPath.Error };
            }

            // Check if file exists
            if (!File.Exists(validatedPath.Path))
            {
                return new TransferResult { Success = false, Error = $"File not found: {validatedPath.Path}" };
            }

            var fileInfo = new FileInfo(validatedPath.Path);
            
            // Get download URL and token from backend
            var downloadInfo = await GetDownloadInfoAsync(transferId, config);
            if (downloadInfo == null || string.IsNullOrEmpty(downloadInfo.DownloadUrl))
            {
                return new TransferResult { Success = false, Error = "Failed to get download information from server" };
            }

            // Upload file to backend
            var uploadSuccess = await UploadFileToBackendAsync(validatedPath.Path, downloadInfo.DownloadUrl, downloadInfo.Token, config);
            
            if (!uploadSuccess)
            {
                return new TransferResult { Success = false, Error = "Failed to upload file to server" };
            }

            // Update transfer status
            await UpdateTransferStatusAsync(transferId, "completed", config);

            _logger?.LogInformation($"File uploaded successfully: {validatedPath.Path} (Transfer ID: {transferId}, Size: {fileInfo.Length})");
            return new TransferResult { Success = true, Path = validatedPath.Path, Size = fileInfo.Length };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error in SendFileAsync for transfer {transferId}");
            await UpdateTransferStatusAsync(transferId, "failed", config);
            return new TransferResult { Success = false, Error = ex.Message };
        }
    }

    private async Task<UploadInfo?> GetUploadInfoAsync(int transferId, AgentConfig config)
    {
        try
        {
            var response = await _apiClient.GetAsync<ApiResponse<UploadInfo>>(
                $"{config.ApiBaseUrl}/api/file-transfer/status/{transferId}",
                config.AgentKey);

            if (response != null && response.Success)
            {
                // Extract upload URL from transfer metadata
                var transfer = response.Data;
                if (transfer != null && transfer.Metadata != null)
                {
                    var token = transfer.Metadata.ContainsKey("upload_token") 
                        ? transfer.Metadata["upload_token"]?.ToString() 
                        : null;
                    
                    if (!string.IsNullOrEmpty(token))
                    {
                        return new UploadInfo
                        {
                            UploadUrl = $"{config.ApiBaseUrl}/api/file-transfer/upload?token={token}&transfer_id={transferId}",
                            Token = token
                        };
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Failed to get upload info for transfer {transferId}");
        }
        return null;
    }

    private async Task<DownloadInfo?> GetDownloadInfoAsync(int transferId, AgentConfig config)
    {
        try
        {
            var response = await _apiClient.GetAsync<ApiResponse<TransferInfo>>(
                $"{config.ApiBaseUrl}/api/file-transfer/status/{transferId}",
                config.AgentKey);

            if (response != null && response.Success)
            {
                var transfer = response.Data;
                if (transfer != null && transfer.Metadata != null)
                {
                    var token = transfer.Metadata.ContainsKey("download_token") 
                        ? transfer.Metadata["download_token"]?.ToString() 
                        : null;
                    
                    if (!string.IsNullOrEmpty(token))
                    {
                        return new DownloadInfo
                        {
                            DownloadUrl = $"{config.ApiBaseUrl}/api/file-transfer/download/{transferId}?token={token}",
                            Token = token
                        };
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Failed to get download info for transfer {transferId}");
        }
        return null;
    }

    private async Task<bool> UploadFileToBackendAsync(string filePath, string uploadUrl, string token, AgentConfig config)
    {
        try
        {
            using (var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read))
            using (var content = new MultipartFormDataContent())
            {
                var fileContent = new StreamContent(fileStream);
                fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
                fileContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
                {
                    Name = "file",
                    FileName = Path.GetFileName(filePath)
                };

                content.Add(fileContent, "file", Path.GetFileName(filePath));

                var request = new HttpRequestMessage(HttpMethod.Post, uploadUrl)
                {
                    Content = content
                };

                if (!string.IsNullOrEmpty(config.AgentKey))
                {
                    request.Headers.Add("X-Agent-Key", config.AgentKey);
                }

                var response = await _httpClient.SendAsync(request);
                return response.IsSuccessStatusCode;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Failed to upload file to backend: {filePath}");
            return false;
        }
    }

    private async Task UpdateTransferStatusAsync(int transferId, string status, AgentConfig config)
    {
        try
        {
            await _apiClient.PostAsync(
                $"{config.ApiBaseUrl}/api/file-transfer/{transferId}/status",
                new { status = status },
                config.AgentKey);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, $"Failed to update transfer status for {transferId}");
        }
    }

    public async Task<FileListResult> GetFileListAsync(string path)
    {
        try
        {
            // Validate path
            var validatedPath = ValidateFilePath(path);
            if (!validatedPath.Success)
            {
                return new FileListResult { Success = false, Error = validatedPath.Error };
            }

            if (!Directory.Exists(validatedPath.Path))
            {
                return new FileListResult { Success = false, Error = $"Path not found: {validatedPath.Path}" };
            }

            var items = Directory.GetFileSystemEntries(validatedPath.Path);
            var fileList = new List<FileItem>();

            foreach (var item in items)
            {
                try
                {
                    var fileInfo = new System.IO.FileInfo(item);
                    var isDirectory = (File.GetAttributes(item) & FileAttributes.Directory) == FileAttributes.Directory;

                    fileList.Add(new FileItem
                    {
                        name = Path.GetFileName(item),
                        path = item,
                        size = isDirectory ? null : fileInfo.Length,
                        type = isDirectory ? "directory" : "file",
                        modified_at = fileInfo.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ssZ")
                    });
                }
                catch
                {
                    // Skip items that can't be accessed
                }
            }

            return new FileListResult { Success = true, Files = fileList };
        }
        catch (Exception ex)
        {
            return new FileListResult { Success = false, Error = ex.Message };
        }
    }

    private (bool Success, string Path, string? Error) ValidateFilePath(string filePath)
    {
        try
        {
            // Remove null bytes and dangerous characters
            var cleaned = filePath.Replace("\0", "").Replace("\x00", "");

            // Check for encoded path traversal attempts
            var encodedPatterns = new[]
            {
                "%2E%2E",      // URL encoded ..
                "%252E%252E",  // Double URL encoded ..
                "..",          // Standard ..
                "../",         // ../
                "..\\",        // ..\
                "..%2F",       // URL encoded ../
                "..%5C"        // URL encoded ..\
            };

            foreach (var pattern in encodedPatterns)
            {
                if (cleaned.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                {
                    return (false, "", $"Path traversal attempt detected: {filePath}");
                }
            }

            // Normalize path
            string normalized;
            try
            {
                normalized = Path.GetFullPath(cleaned);
            }
            catch
            {
                return (false, "", $"Invalid path format: {filePath}");
            }

            // Additional check: ensure normalized path doesn't contain ..
            if (normalized.Contains(".."))
            {
                return (false, "", $"Path traversal detected after normalization: {normalized}");
            }

            // Only allow certain safe directories
            var allowedRoots = new[]
            {
                @"C:\Users\Public",
                @"C:\Temp",
                @"C:\Windows\Temp"
            };

            var isAllowed = false;
            string? matchedRoot = null;

            foreach (var root in allowedRoots)
            {
                var rootNormalized = Path.GetFullPath(root);
                if (normalized.StartsWith(rootNormalized, StringComparison.OrdinalIgnoreCase))
                {
                    isAllowed = true;
                    matchedRoot = rootNormalized;
                    break;
                }
            }

            if (!isAllowed)
            {
                return (false, "", $"Path not allowed: {normalized} (must be under one of: {string.Join(", ", allowedRoots)})");
            }

            // Final validation: ensure path is within the allowed root
            if (matchedRoot != null)
            {
                var relativePath = normalized.Substring(matchedRoot.Length).TrimStart('\\', '/');
                if (relativePath.Contains(".."))
                {
                    return (false, "", $"Path traversal detected in relative path: {relativePath}");
                }
            }

            return (true, normalized, null);
        }
        catch (Exception ex)
        {
            return (false, "", ex.Message);
        }
    }
}

public class TransferResult
{
    public bool Success { get; set; }
    public string? Path { get; set; }
    public long? Size { get; set; }
    public string? Error { get; set; }
}

public class FileListResult
{
    public bool Success { get; set; }
    public List<FileItem>? Files { get; set; }
    public string? Error { get; set; }
}

public class FileItem
{
    public string name { get; set; } = "";
    public string path { get; set; } = "";
    public long? size { get; set; }
    public string type { get; set; } = "";
    public string modified_at { get; set; } = "";
}

internal class UploadInfo
{
    public string UploadUrl { get; set; } = "";
    public string Token { get; set; } = "";
}

internal class DownloadInfo
{
    public string DownloadUrl { get; set; } = "";
    public string Token { get; set; } = "";
}

internal class TransferInfo
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("metadata")]
    public Dictionary<string, object>? Metadata { get; set; }
}

