-- ============================================
-- Features Seeder
-- Desktop Support SaaS System
-- ============================================

INSERT INTO features (code, name, description, category, is_premium) VALUES
-- Inventory Features
('hardware_inventory', 'Hardware Inventory', 'Collect and track hardware components with detailed specifications', 'inventory', FALSE),
('software_inventory', 'Software Inventory', 'Track installed applications and versions', 'inventory', FALSE),
('network_inventory', 'Network Information', 'Network adapter and connectivity details', 'inventory', FALSE),

-- Monitoring Features
('event_logs', 'Event Log Monitoring', 'System and application event logs collection and analysis', 'monitoring', FALSE),
('performance_monitoring', 'Performance Monitoring', 'CPU, RAM, Disk usage tracking with historical data', 'monitoring', TRUE),
('real_time_monitoring', 'Real-time Monitoring', 'Live system metrics and dashboard', 'monitoring', TRUE),

-- Security Features
('security_status', 'Security Status', 'Antivirus, firewall, encryption status monitoring', 'security', TRUE),
('usb_tracking', 'USB Device Tracking', 'Monitor USB device connections for security', 'security', TRUE),

-- AI Features
('ai_insights', 'AI Insights', 'Gemini-powered log analysis and intelligent recommendations', 'ai', TRUE),
('predictive_maintenance', 'Predictive Maintenance', 'AI-based failure prediction and proactive alerts', 'ai', TRUE),
('automated_troubleshooting', 'Automated Troubleshooting', 'AI-generated troubleshooting steps and solutions', 'ai', TRUE),

-- Management Features
('remote_management', 'Remote Management', 'Remote command execution and system control', 'management', TRUE),
('automated_actions', 'Automated Actions', 'Automated responses to alerts and events', 'management', TRUE),
('ticket_system', 'Ticket System', 'Issue tracking and management system', 'management', FALSE),

-- Reporting Features
('advanced_reports', 'Advanced Reports', 'Custom reports and analytics with export options', 'reporting', TRUE),
('scheduled_reports', 'Scheduled Reports', 'Automated report generation and delivery', 'reporting', TRUE),
('export_data', 'Data Export', 'Export data to CSV, Excel, and PDF formats', 'reporting', FALSE)
ON CONFLICT (code) DO NOTHING;

-- Assign Features to Plans
-- Default Plan Features
INSERT INTO plan_features (plan_id, feature_id, is_enabled)
SELECT 1, id, TRUE FROM features WHERE code IN (
    'hardware_inventory', 'software_inventory', 'event_logs', 'ticket_system', 'export_data'
)
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- Moderate Plan Features (includes all default + more)
INSERT INTO plan_features (plan_id, feature_id, is_enabled)
SELECT 2, id, TRUE FROM features WHERE code IN (
    'hardware_inventory', 'software_inventory', 'network_inventory', 'event_logs',
    'performance_monitoring', 'security_status', 'ai_insights', 'ticket_system',
    'export_data', 'scheduled_reports'
)
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- Advanced Plan Features (all features)
INSERT INTO plan_features (plan_id, feature_id, is_enabled)
SELECT 3, id, TRUE FROM features
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- Custom Plan (no default features, admin assigns manually)
-- No features assigned by default

