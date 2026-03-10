using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

namespace DesktopSupportAgent;

public class EventLogCollector
{
    public async Task<List<object>> GetEventLogsAsync()
    {
        return await Task.Run(() =>
        {
            var logs = new List<object>();
            var startTime = DateTime.Now.AddHours(-1);

            try
            {
                var logNames = new[] { "System", "Application" };
                var levels = new[] { EventLogEntryType.Error, EventLogEntryType.Warning, EventLogEntryType.FailureAudit };

                foreach (var logName in logNames)
                {
                    using (var eventLog = new EventLog(logName))
                    {
                        var entries = eventLog.Entries.Cast<EventLogEntry>()
                            .Where(e => e.TimeGenerated >= startTime && levels.Contains(e.EntryType))
                            .OrderByDescending(e => e.TimeGenerated)
                            .Take(25)
                            .ToList();

                        foreach (var entry in entries)
                        {
                            logs.Add(new
                            {
                                log_type = logName.ToLower(),
                                event_id = entry.EventID,
                                level = entry.EntryType.ToString().ToLower(),
                                source = entry.Source,
                                message = entry.Message,
                                time_generated = entry.TimeGenerated
                            });
                        }
                    }
                }
            }
            catch (Exception)
            {
                // Log error silently
            }

            return logs;
        });
    }
}

