using System;
using System.Diagnostics;
using System.Management;
using System.Threading.Tasks;

namespace DesktopSupportAgent;

public class PerformanceCollector
{
    public async Task<object> GetPerformanceMetricsAsync()
    {
        return await Task.Run(() =>
        {
            try
            {
                // CPU Usage
                var cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                cpuCounter.NextValue(); // First call returns 0, need to wait
                System.Threading.Thread.Sleep(1000);
                var cpuUsage = Math.Round(cpuCounter.NextValue(), 2);

                // Memory
                using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_OperatingSystem"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        var totalMemory = Convert.ToUInt64(obj["TotalVisibleMemorySize"]);
                        var freeMemory = Convert.ToUInt64(obj["FreePhysicalMemory"]);
                        var usedMemory = totalMemory - freeMemory;

                        var totalMemoryGB = Math.Round(totalMemory / (1024.0 * 1024.0), 2);
                        var freeMemoryGB = Math.Round(freeMemory / (1024.0 * 1024.0), 2);
                        var memoryUsage = Math.Round((usedMemory / (double)totalMemory) * 100, 2);

                        // Disk
                        using (var diskSearcher = new ManagementObjectSearcher("SELECT * FROM Win32_LogicalDisk WHERE DeviceID='C:'"))
                        {
                            foreach (ManagementObject disk in diskSearcher.Get())
                            {
                                var diskSize = Convert.ToUInt64(disk["Size"]);
                                var diskFree = Convert.ToUInt64(disk["FreeSpace"]);
                                var diskUsed = diskSize - diskFree;

                                var diskTotalGB = Math.Round(diskSize / (1024.0 * 1024.0 * 1024.0), 2);
                                var diskFreeGB = Math.Round(diskFree / (1024.0 * 1024.0 * 1024.0), 2);
                                var diskUsage = Math.Round((diskUsed / (double)diskSize) * 100, 2);

                                return new
                                {
                                    cpu_usage = cpuUsage,
                                    memory_usage = memoryUsage,
                                    memory_total_gb = totalMemoryGB,
                                    memory_available_gb = freeMemoryGB,
                                    disk_usage_c = diskUsage,
                                    disk_free_c_gb = diskFreeGB,
                                    disk_total_c_gb = diskTotalGB,
                                    recorded_at = DateTime.UtcNow
                                };
                            }
                        }
                    }
                }
            }
            catch (Exception)
            {
                // Return default values on error
            }

            return new
            {
                cpu_usage = 0.0,
                memory_usage = 0.0,
                memory_total_gb = 0.0,
                memory_available_gb = 0.0,
                disk_usage_c = 0.0,
                disk_free_c_gb = 0.0,
                disk_total_c_gb = 0.0,
                recorded_at = DateTime.UtcNow
            };
        });
    }
}

