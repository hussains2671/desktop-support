-- ============================================
-- CRITICAL DATABASE INDEXES
-- Desktop Support SaaS System
-- ============================================
-- 
-- IMPORTANT: Run these indexes after creating tables
-- These indexes are critical for performance at scale
-- ============================================

-- ============================================
-- EVENT LOGS INDEXES (CRITICAL - Millions of rows)
-- ============================================

-- Primary lookup: device + time range queries
CREATE INDEX IF NOT EXISTS idx_event_logs_device_time 
ON event_logs(device_id, time_generated DESC);

-- Filter by severity (critical/error logs)
CREATE INDEX IF NOT EXISTS idx_event_logs_level 
ON event_logs(level) 
WHERE level IN ('critical', 'error');

-- Filter by log type and level
CREATE INDEX IF NOT EXISTS idx_event_logs_type_level 
ON event_logs(log_type, level);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_event_logs_time_generated 
ON event_logs(time_generated DESC);

-- ============================================
-- PERFORMANCE METRICS INDEXES (CRITICAL - Time-series)
-- ============================================

-- Primary lookup: device + time range
CREATE INDEX IF NOT EXISTS idx_performance_device_recorded 
ON performance_metrics(device_id, recorded_at DESC);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_performance_recorded_at 
ON performance_metrics(recorded_at DESC);

-- ============================================
-- DEVICES INDEXES (HIGH PRIORITY - Frequent lookups)
-- ============================================

-- Company + status filtering
CREATE INDEX IF NOT EXISTS idx_devices_company_status 
ON devices(company_id, status);

-- Hostname search
CREATE INDEX IF NOT EXISTS idx_devices_hostname 
ON devices(hostname);

-- Agent relationship
CREATE INDEX IF NOT EXISTS idx_devices_agent_id 
ON devices(agent_id) 
WHERE agent_id IS NOT NULL;

-- Last seen queries
CREATE INDEX IF NOT EXISTS idx_devices_last_seen 
ON devices(last_seen DESC);

-- ============================================
-- ALERTS INDEXES (HIGH PRIORITY - Filtering)
-- ============================================

-- Company + status filtering
CREATE INDEX IF NOT EXISTS idx_alerts_company_status 
ON alerts(company_id, status);

-- Critical/High severity alerts
CREATE INDEX IF NOT EXISTS idx_alerts_severity 
ON alerts(severity) 
WHERE severity IN ('critical', 'high');

-- Device alerts
CREATE INDEX IF NOT EXISTS idx_alerts_device_status 
ON alerts(device_id, status) 
WHERE device_id IS NOT NULL;

-- Recent alerts
CREATE INDEX IF NOT EXISTS idx_alerts_created_at 
ON alerts(created_at DESC);

-- Alert type filtering
CREATE INDEX IF NOT EXISTS idx_alerts_type 
ON alerts(alert_type);

-- ============================================
-- HARDWARE INVENTORY INDEXES (MEDIUM PRIORITY)
-- ============================================

-- Device + component type lookup
CREATE INDEX IF NOT EXISTS idx_hardware_device_type 
ON hardware_inventory(device_id, component_type);

-- Serial number lookup
CREATE INDEX IF NOT EXISTS idx_hardware_serial 
ON hardware_inventory(serial_number) 
WHERE serial_number IS NOT NULL;

-- ============================================
-- SOFTWARE INVENTORY INDEXES (MEDIUM PRIORITY)
-- ============================================

-- Device software lookup
CREATE INDEX IF NOT EXISTS idx_software_device 
ON software_inventory(device_id);

-- Software name search
CREATE INDEX IF NOT EXISTS idx_software_name 
ON software_inventory(name);

-- ============================================
-- USERS INDEXES (HIGH PRIORITY - Authentication)
-- ============================================

-- Email + company lookup (login queries)
CREATE INDEX IF NOT EXISTS idx_users_email_company 
ON users(email, company_id);

-- Company + role filtering
CREATE INDEX IF NOT EXISTS idx_users_company_role 
ON users(company_id, role);

-- ============================================
-- AGENTS INDEXES (MEDIUM PRIORITY - Monitoring)
-- ============================================

-- Company + status filtering
CREATE INDEX IF NOT EXISTS idx_agents_company_status 
ON agents(company_id, status);

-- Heartbeat monitoring (online agents)
CREATE INDEX IF NOT EXISTS idx_agents_last_heartbeat 
ON agents(last_heartbeat) 
WHERE status = 'online';

-- Device ID lookup
CREATE INDEX IF NOT EXISTS idx_agents_device_id 
ON agents(device_id);

-- ============================================
-- AI INSIGHTS INDEXES (MEDIUM PRIORITY)
-- ============================================

-- Company + device insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_company_device 
ON ai_insights(company_id, device_id) 
WHERE device_id IS NOT NULL;

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_ai_insights_status 
ON ai_insights(status);

-- Recent insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at 
ON ai_insights(created_at DESC);

-- ============================================
-- TICKETS INDEXES (MEDIUM PRIORITY)
-- ============================================

-- Company + status filtering
CREATE INDEX IF NOT EXISTS idx_tickets_company_status 
ON tickets(company_id, status);

-- Priority filtering
CREATE INDEX IF NOT EXISTS idx_tickets_priority 
ON tickets(priority);

-- Assigned user
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to 
ON tickets(assigned_to) 
WHERE assigned_to IS NOT NULL;

-- ============================================
-- NETWORK INFO INDEXES (LOW PRIORITY)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_network_device 
ON network_info(device_id);

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. Partial indexes (WHERE clauses) are used for filtered queries
-- 2. DESC order for time-based columns (most recent first)
-- 3. Composite indexes match common query patterns
-- 4. Monitor index usage: SELECT * FROM pg_stat_user_indexes;
-- 5. Rebuild indexes periodically: REINDEX INDEX index_name;
-- 
-- ============================================

