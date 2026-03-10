using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace DesktopSupportAgent;

public class ApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ApiClient>? _logger;

    public ApiClient(ILogger<ApiClient>? logger = null)
    {
        _logger = logger;
        _httpClient = new HttpClient();
        _httpClient.Timeout = TimeSpan.FromMinutes(5);
    }

    public async Task<T?> GetAsync<T>(string url, string? agentKey = null)
    {
        try
        {
            _logger?.LogDebug($"GET request to: {url}");
            
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            
            if (!string.IsNullOrEmpty(agentKey))
            {
                request.Headers.Add("X-Agent-Key", agentKey);
            }

            var response = await _httpClient.SendAsync(request);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger?.LogWarning($"GET request failed: {url} - Status: {response.StatusCode}, Response: {errorContent}");
                response.EnsureSuccessStatusCode();
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<ApiResponse<T>>(content);

            if (result == null || !result.Success)
            {
                _logger?.LogWarning($"GET request returned unsuccessful response: {url} - Message: {result?.Message}");
            }

            return result?.Data;
        }
        catch (HttpRequestException ex)
        {
            _logger?.LogError(ex, $"HTTP error in GET request to: {url}");
            return default(T);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error in GET request to: {url}");
            return default(T);
        }
    }

    public async Task PostAsync<T>(string url, T body, string? agentKey = null)
    {
        try
        {
            _logger?.LogDebug($"POST request to: {url}");
            
            var json = JsonConvert.SerializeObject(body);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };

            if (!string.IsNullOrEmpty(agentKey))
            {
                request.Headers.Add("X-Agent-Key", agentKey);
            }

            var response = await _httpClient.SendAsync(request);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger?.LogWarning($"POST request failed: {url} - Status: {response.StatusCode}, Response: {errorContent}");
                response.EnsureSuccessStatusCode();
            }
            
            _logger?.LogDebug($"POST request successful: {url}");
        }
        catch (HttpRequestException ex)
        {
            _logger?.LogError(ex, $"HTTP error in POST request to: {url}");
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error in POST request to: {url}");
            throw;
        }
    }
}

public class ApiResponse<T>
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("data")]
    public T? Data { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }
}

public class AgentCommand
{
    [JsonProperty("id")]
    public int Id { get; set; }

    [JsonProperty("command_type")]
    public string? CommandType { get; set; }

    [JsonProperty("command_text")]
    public string? CommandText { get; set; }

    [JsonProperty("parameters")]
    public JObject? Parameters { get; set; }
}

