using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DesktopSupportAgent;

public class Program
{
    public static void Main(string[] args)
    {
        CreateHostBuilder(args).Build().Run();
    }

    public static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .UseWindowsService(options =>
            {
                options.ServiceName = "DesktopSupportAgent";
            })
            .ConfigureServices((context, services) =>
            {
                services.AddHostedService<AgentService>();
                services.AddSingleton<ConfigManager>(sp => 
                    new ConfigManager(sp.GetRequiredService<ILogger<ConfigManager>>()));
                services.AddSingleton<ApiClient>(sp => 
                    new ApiClient(sp.GetRequiredService<ILogger<ApiClient>>()));
                services.AddSingleton<InventoryCollector>();
                services.AddSingleton<PerformanceCollector>();
                services.AddSingleton<EventLogCollector>();
                services.AddSingleton<FileTransferManager>(sp => 
                    new FileTransferManager(
                        sp.GetRequiredService<ApiClient>(),
                        sp.GetRequiredService<ILogger<FileTransferManager>>()
                    ));
                services.AddSingleton<VncManager>();
                services.AddSingleton<UpdateManager>(sp => 
                    new UpdateManager(
                        sp.GetRequiredService<ApiClient>(),
                        sp.GetRequiredService<ILogger<UpdateManager>>()
                    ));
                services.AddSingleton<CommandExecutor>();
            })
            .ConfigureLogging(logging =>
            {
                logging.AddEventLog(settings =>
                {
                    settings.SourceName = "DesktopSupportAgent";
                    settings.LogName = "Application";
                });
                logging.AddConsole();
            });
}

