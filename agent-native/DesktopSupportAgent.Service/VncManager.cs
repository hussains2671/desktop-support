using System;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;
using System.Threading.Tasks;
using Microsoft.Win32;

namespace DesktopSupportAgent;

public class VncManager
{
    private const string VncServiceName = "tvnserver";
    private const string VncPath = @"C:\Program Files\TightVNC\WinVNC.exe";
    private const string VncRegistryPath = @"SOFTWARE\TightVNC\Server";

    public async Task<VncResult> StartVncServerAsync(int port, string password)
    {
        return await Task.Run(() =>
        {
            try
            {
                // Check if VNC is installed
                if (!IsTightVncInstalled())
                {
                    return new VncResult
                    {
                        Success = false,
                        Error = "TightVNC is not installed. Please install TightVNC Server first."
                    };
                }

                // Configure VNC server via registry
                try
                {
                    using (var key = Registry.LocalMachine.OpenSubKey(VncRegistryPath, true))
                    {
                        if (key != null)
                        {
                            key.SetValue("RfbPort", port, RegistryValueKind.DWord);
                            key.SetValue("QueryAcceptOnTimeout", 0, RegistryValueKind.DWord);
                        }
                    }
                }
                catch (Exception ex)
                {
                    return new VncResult
                    {
                        Success = false,
                        Error = $"Failed to configure VNC: {ex.Message}"
                    };
                }

                // Start VNC service
                try
                {
                    using (var service = new ServiceController(VncServiceName))
                    {
                        if (service.Status != ServiceControllerStatus.Running)
                        {
                            service.Start();
                            service.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(30));
                        }
                    }
                }
                catch (Exception ex)
                {
                    return new VncResult
                    {
                        Success = false,
                        Error = $"Failed to start VNC service: {ex.Message}"
                    };
                }

                return new VncResult
                {
                    Success = true,
                    Port = port
                };
            }
            catch (Exception ex)
            {
                return new VncResult
                {
                    Success = false,
                    Error = ex.Message
                };
            }
        });
    }

    public async Task<VncResult> StopVncServerAsync(int port)
    {
        return await Task.Run(() =>
        {
            try
            {
                using (var service = new ServiceController(VncServiceName))
                {
                    if (service.Status == ServiceControllerStatus.Running)
                    {
                        service.Stop();
                        service.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(30));
                    }
                }

                return new VncResult
                {
                    Success = true
                };
            }
            catch (Exception ex)
            {
                return new VncResult
                {
                    Success = false,
                    Error = ex.Message
                };
            }
        });
    }

    public async Task<VncStatusResult> GetVncServerStatusAsync()
    {
        return await Task.Run(() =>
        {
            try
            {
                using (var service = new ServiceController(VncServiceName))
                {
                    int? port = null;

                    try
                    {
                        using (var key = Registry.LocalMachine.OpenSubKey(VncRegistryPath))
                        {
                            if (key != null)
                            {
                                var portValue = key.GetValue("RfbPort");
                                if (portValue != null)
                                {
                                    port = Convert.ToInt32(portValue);
                                }
                            }
                        }
                    }
                    catch { }

                    return new VncStatusResult
                    {
                        Success = true,
                        Running = service.Status == ServiceControllerStatus.Running,
                        Port = port
                    };
                }
            }
            catch
            {
                return new VncStatusResult
                {
                    Success = false,
                    Running = false,
                    Error = "VNC service not found"
                };
            }
        });
    }

    private bool IsTightVncInstalled()
    {
        return File.Exists(VncPath);
    }
}

public class VncResult
{
    public bool Success { get; set; }
    public int? Port { get; set; }
    public string? Error { get; set; }
}

public class VncStatusResult
{
    public bool Success { get; set; }
    public bool Running { get; set; }
    public int? Port { get; set; }
    public string? Error { get; set; }
}

