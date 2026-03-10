using System;
using System.Collections.Generic;
using System.Linq;
using System.Management;
using System.Threading.Tasks;
using Microsoft.Win32;

namespace DesktopSupportAgent;

public class InventoryCollector
{
    public async Task<object> GetHardwareInventoryAsync()
    {
        return await Task.Run(() =>
        {
            var hardware = new
            {
                system = GetSystemInfo(),
                cpu = GetCpuInfo(),
                ram = GetRamInfo(),
                storage = GetStorageInfo()
            };

            return hardware;
        });
    }

    public async Task<List<object>> GetSoftwareInventoryAsync()
    {
        return await Task.Run(() =>
        {
            var software = new List<object>();

            // Read from registry (same as PowerShell version)
            var uninstallKeys = new[]
            {
                @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
            };

            foreach (var keyPath in uninstallKeys)
            {
                using (var baseKey = Registry.LocalMachine.OpenSubKey(keyPath))
                {
                    if (baseKey == null) continue;

                    foreach (var subKeyName in baseKey.GetSubKeyNames())
                    {
                        using (var subKey = baseKey.OpenSubKey(subKeyName))
                        {
                            if (subKey == null) continue;

                            var displayName = subKey.GetValue("DisplayName")?.ToString();
                            if (string.IsNullOrEmpty(displayName)) continue;

                            // Skip system components
                            if (subKeyName.Contains("{")) continue;

                            var installDate = subKey.GetValue("InstallDate")?.ToString();
                            string? formattedDate = null;
                            if (!string.IsNullOrEmpty(installDate) && installDate.Length >= 8)
                            {
                                formattedDate = $"{installDate.Substring(0, 4)}-{installDate.Substring(4, 2)}-{installDate.Substring(6, 2)}";
                            }

                            software.Add(new
                            {
                                name = displayName,
                                version = subKey.GetValue("DisplayVersion")?.ToString(),
                                publisher = subKey.GetValue("Publisher")?.ToString(),
                                install_date = formattedDate,
                                install_location = subKey.GetValue("InstallLocation")?.ToString()
                            });
                        }
                    }
                }
            }

            // Remove duplicates
            return software
                .GroupBy(s => ((dynamic)s).name)
                .Select(g => g.First())
                .ToList();
        });
    }

    private object GetSystemInfo()
    {
        using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_OperatingSystem"))
        {
            foreach (ManagementObject obj in searcher.Get())
            {
                return new
                {
                    hostname = Environment.MachineName,
                    username = Environment.UserName,
                    os_name = obj["Caption"]?.ToString(),
                    os_version = obj["Version"]?.ToString(),
                    manufacturer = GetComputerSystemProperty("Manufacturer"),
                    model = GetComputerSystemProperty("Model"),
                    serial_number = GetBiosProperty("SerialNumber")
                };
            }
        }
        return new { };
    }

    private object GetCpuInfo()
    {
        using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Processor"))
        {
            foreach (ManagementObject obj in searcher.Get())
            {
                return new
                {
                    name = obj["Name"]?.ToString(),
                    manufacturer = obj["Manufacturer"]?.ToString(),
                    cores = obj["NumberOfCores"]?.ToString(),
                    threads = obj["NumberOfLogicalProcessors"]?.ToString()
                };
            }
        }
        return new { };
    }

    private List<object> GetRamInfo()
    {
        var ram = new List<object>();
        using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_PhysicalMemory"))
        {
            foreach (ManagementObject obj in searcher.Get())
            {
                ram.Add(new
                {
                    manufacturer = obj["Manufacturer"]?.ToString(),
                    part_number = obj["PartNumber"]?.ToString(),
                    serial_number = obj["SerialNumber"]?.ToString(),
                    capacity = obj["Capacity"]?.ToString(),
                    speed = obj["Speed"]?.ToString(),
                    type = GetRamType(obj["SMBIOSMemoryType"]?.ToString())
                });
            }
        }
        return ram;
    }

    private List<object> GetStorageInfo()
    {
        var storage = new List<object>();
        using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_DiskDrive"))
        {
            foreach (ManagementObject obj in searcher.Get())
            {
                var mediaType = obj["MediaType"]?.ToString() ?? "";
                storage.Add(new
                {
                    type = mediaType.Contains("SSD") ? "SSD" : "HDD",
                    manufacturer = obj["Manufacturer"]?.ToString(),
                    model = obj["Model"]?.ToString(),
                    serial_number = obj["SerialNumber"]?.ToString(),
                    size = obj["Size"]?.ToString(),
                    interface_type = obj["InterfaceType"]?.ToString()
                });
            }
        }
        return storage;
    }

    private string? GetComputerSystemProperty(string property)
    {
        using (var searcher = new ManagementObjectSearcher($"SELECT {property} FROM Win32_ComputerSystem"))
        {
            foreach (ManagementObject obj in searcher.Get())
            {
                return obj[property]?.ToString();
            }
        }
        return null;
    }

    private string? GetBiosProperty(string property)
    {
        using (var searcher = new ManagementObjectSearcher($"SELECT {property} FROM Win32_BIOS"))
        {
            foreach (ManagementObject obj in searcher.Get())
            {
                return obj[property]?.ToString();
            }
        }
        return null;
    }

    private string GetRamType(string? smbiosType)
    {
        return smbiosType switch
        {
            "20" => "DDR",
            "21" => "DDR2",
            "24" => "DDR3",
            "26" => "DDR4",
            "30" => "DDR5",
            _ => "Unknown"
        };
    }
}

