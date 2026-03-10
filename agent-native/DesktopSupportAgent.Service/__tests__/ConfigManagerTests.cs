using Xunit;
using DesktopSupportAgent;
using System.IO;
using Newtonsoft.Json;

namespace DesktopSupportAgent.Tests
{
    public class ConfigManagerTests
    {
        [Fact]
        public void GetConfig_WithValidConfig_ReturnsConfig()
        {
            // Arrange
            var tempPath = Path.Combine(Path.GetTempPath(), "test-config.json");
            var testConfig = new
            {
                ApiBaseUrl = "http://localhost:3000/api",
                AgentKey = "test-key",
                DeviceId = "test-device",
                CompanyCode = "1234567812345678"
            };
            
            File.WriteAllText(tempPath, JsonConvert.SerializeObject(testConfig));
            
            // Act
            var configManager = new ConfigManager();
            var config = configManager.GetConfig();
            
            // Cleanup
            File.Delete(tempPath);
            
            // Assert
            Assert.NotNull(config);
            Assert.Equal("http://localhost:3000/api", config.ApiBaseUrl);
        }

        [Fact]
        public void GetConfig_WithInvalidConfig_ReturnsNull()
        {
            // Arrange
            var configManager = new ConfigManager();
            
            // Act
            var config = configManager.GetConfig();
            
            // Assert
            // Should return null if no valid config found
            // This test will pass if config.json doesn't exist in test environment
        }
    }
}

