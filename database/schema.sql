-- ============================================
-- Desktop Support SaaS System
-- Complete PostgreSQL Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    max_agents INTEGER DEFAULT 10,
    max_devices INTEGER DEFAULT 50,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FEATURES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS features (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PLAN FEATURES TABLE (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS plan_features (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, feature_id)
);

-- ============================================
-- COMPANIES TABLE (Tenants)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_code VARCHAR(16) UNIQUE,
    domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(100) UNIQUE,
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
    max_agents INTEGER DEFAULT 10,
    max_devices INTEGER DEFAULT 50,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_plan ON companies(plan_id);
CREATE INDEX idx_companies_code ON companies(company_code);

-- ============================================
-- COMPANY FEATURES TABLE (Overrides)
-- ============================================
CREATE TABLE IF NOT EXISTS company_features (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, feature_id)
);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'company_admin', 'technician', 'viewer')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, company_id)
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_company ON users(email, company_id);
CREATE INDEX idx_users_company_role ON users(company_id, role);

-- ============================================
-- AGENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    agent_key VARCHAR(255) NOT NULL UNIQUE,
    hostname VARCHAR(255),
    os_version VARCHAR(100),
    agent_version VARCHAR(50),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agents_company ON agents(company_id);
CREATE INDEX idx_agents_device ON agents(device_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_company_status ON agents(company_id, status);
CREATE INDEX idx_agents_last_heartbeat ON agents(last_heartbeat) WHERE status = 'online';

-- ============================================
-- AGENT COMMANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_commands (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    command_type VARCHAR(50) NOT NULL CHECK (command_type IN ('chkdsk', 'sfc', 'diskpart', 'powershell', 'cmd', 'custom')),
    command_text TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    result_output TEXT,
    result_error TEXT,
    exit_code INTEGER,
    execution_time_ms INTEGER,
    CONSTRAINT fk_agent_commands_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_agent_commands_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_agent_commands_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_agent_commands_agent ON agent_commands(agent_id);
CREATE INDEX idx_agent_commands_company ON agent_commands(company_id);
CREATE INDEX idx_agent_commands_status ON agent_commands(status);
CREATE INDEX idx_agent_commands_created_at ON agent_commands(created_at DESC);
CREATE INDEX idx_agent_commands_agent_status ON agent_commands(agent_id, status) WHERE status IN ('pending', 'running');
CREATE INDEX idx_agent_commands_company_status ON agent_commands(company_id, status, created_at DESC);
CREATE INDEX idx_agent_commands_created_by ON agent_commands(created_by);

-- ============================================
-- DEVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    device_id VARCHAR(255) NOT NULL,
    hostname VARCHAR(255),
    username VARCHAR(255),
    domain_name VARCHAR(255),
    os_name VARCHAR(100),
    os_version VARCHAR(100),
    os_build VARCHAR(50),
    os_architecture VARCHAR(20),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, device_id)
);

CREATE INDEX idx_devices_company ON devices(company_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_company_status ON devices(company_id, status);
CREATE INDEX idx_devices_hostname ON devices(hostname);
CREATE INDEX idx_devices_agent_id ON devices(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_devices_last_seen ON devices(last_seen DESC);

-- ============================================
-- HARDWARE INVENTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS hardware_inventory (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL CHECK (component_type IN ('cpu', 'ram', 'hdd', 'ssd', 'gpu', 'display', 'keyboard', 'touchpad', 'motherboard', 'battery', 'network_adapter')),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    part_number VARCHAR(255),
    capacity VARCHAR(50),
    type VARCHAR(100),
    interface VARCHAR(100),
    health_status VARCHAR(50),
    firmware_version VARCHAR(100),
    additional_data JSONB,
    detected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hardware_device ON hardware_inventory(device_id);
CREATE INDEX idx_hardware_component ON hardware_inventory(component_type);
CREATE INDEX idx_hardware_device_type ON hardware_inventory(device_id, component_type);
CREATE INDEX idx_hardware_serial ON hardware_inventory(serial_number) WHERE serial_number IS NOT NULL;

-- ============================================
-- SOFTWARE INVENTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS software_inventory (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(100),
    publisher VARCHAR(255),
    install_date TIMESTAMP WITH TIME ZONE,
    install_location VARCHAR(500),
    size_bytes BIGINT,
    is_system BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_software_device ON software_inventory(device_id);
CREATE INDEX idx_software_name ON software_inventory(name);

-- ============================================
-- EVENT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    log_type VARCHAR(20) NOT NULL CHECK (log_type IN ('system', 'application', 'security', 'hardware', 'custom')),
    event_id INTEGER,
    level VARCHAR(20) NOT NULL CHECK (level IN ('critical', 'error', 'warning', 'information', 'verbose')),
    source VARCHAR(255),
    message TEXT,
    category VARCHAR(100),
    user_name VARCHAR(255),
    computer_name VARCHAR(255),
    time_generated TIMESTAMP WITH TIME ZONE NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_logs_device ON event_logs(device_id);
CREATE INDEX idx_event_logs_type_level ON event_logs(log_type, level);
CREATE INDEX idx_event_logs_time ON event_logs(time_generated DESC);
CREATE INDEX idx_event_logs_level ON event_logs(level);
CREATE INDEX idx_event_logs_device_time ON event_logs(device_id, time_generated DESC);
CREATE INDEX idx_event_logs_level_critical ON event_logs(level) WHERE level IN ('critical', 'error');

-- ============================================
-- PERFORMANCE METRICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    memory_total_gb DECIMAL(10,2),
    memory_available_gb DECIMAL(10,2),
    disk_usage_c DECIMAL(5,2),
    disk_free_c_gb DECIMAL(10,2),
    disk_total_c_gb DECIMAL(10,2),
    network_sent_mb DECIMAL(10,2),
    network_received_mb DECIMAL(10,2),
    temperature_cpu DECIMAL(5,2),
    uptime_seconds BIGINT,
    boot_time TIMESTAMP WITH TIME ZONE,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_performance_device ON performance_metrics(device_id);
CREATE INDEX idx_performance_recorded ON performance_metrics(recorded_at DESC);
CREATE INDEX idx_performance_device_recorded ON performance_metrics(device_id, recorded_at DESC);

-- ============================================
-- NETWORK INFO TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS network_info (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    adapter_name VARCHAR(255),
    adapter_type VARCHAR(100),
    mac_address VARCHAR(17),
    ip_address VARCHAR(45),
    subnet_mask VARCHAR(45),
    gateway VARCHAR(45),
    dns_servers VARCHAR(500),
    is_dhcp_enabled BOOLEAN,
    connection_status VARCHAR(50),
    speed_mbps INTEGER,
    detected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_network_device ON network_info(device_id);

-- ============================================
-- SECURITY STATUS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS security_status (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
    antivirus_status VARCHAR(50),
    antivirus_name VARCHAR(255),
    antivirus_last_scan TIMESTAMP WITH TIME ZONE,
    firewall_status VARCHAR(50),
    bitlocker_status VARCHAR(50),
    windows_defender_enabled BOOLEAN,
    last_security_update TIMESTAMP WITH TIME ZONE,
    checked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'closed')),
    acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_company ON alerts(company_id);
CREATE INDEX idx_alerts_device ON alerts(device_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_company_status ON alerts(company_id, status);
CREATE INDEX idx_alerts_severity_critical ON alerts(severity) WHERE severity IN ('critical', 'high');
CREATE INDEX idx_alerts_device_status ON alerts(device_id, status) WHERE device_id IS NOT NULL;
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- ============================================
-- AI INSIGHTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_insights (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    insight_type VARCHAR(100),
    title VARCHAR(255),
    summary TEXT,
    analysis TEXT,
    recommendations JSONB,
    confidence_score DECIMAL(5,2),
    related_log_ids JSONB,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'applied', 'dismissed')),
    created_by_ai BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_insights_company ON ai_insights(company_id);
CREATE INDEX idx_ai_insights_device ON ai_insights(device_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_ai_insights_status ON ai_insights(status);
CREATE INDEX idx_ai_insights_company_device ON ai_insights(company_id, device_id) WHERE device_id IS NOT NULL;

-- ============================================
-- TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    category VARCHAR(100),
    related_alert_id BIGINT REFERENCES alerts(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_company ON tickets(company_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_company_status ON tickets(company_id, status);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================
-- AGENT CONFIGURATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_configurations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, config_key)
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================
-- REMOTE SESSIONS TABLE
-- Phase 9: Remote Desktop & Control
-- ============================================
CREATE TABLE IF NOT EXISTS remote_sessions (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    session_type VARCHAR(20) DEFAULT 'vnc' CHECK (session_type IN ('vnc', 'rdp', 'ssh')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'timeout', 'error')),
    connection_string TEXT,
    vnc_password VARCHAR(255),
    vnc_port INTEGER,
    websocket_url TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_remote_sessions_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_remote_sessions_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_remote_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_remote_sessions_agent ON remote_sessions(agent_id);
CREATE INDEX idx_remote_sessions_company ON remote_sessions(company_id);
CREATE INDEX idx_remote_sessions_user ON remote_sessions(user_id);
CREATE INDEX idx_remote_sessions_status ON remote_sessions(status);
CREATE INDEX idx_remote_sessions_company_status ON remote_sessions(company_id, status);
CREATE INDEX idx_remote_sessions_started_at ON remote_sessions(started_at DESC);
CREATE INDEX idx_remote_sessions_active ON remote_sessions(agent_id, status) WHERE status = 'active';

-- ============================================
-- FILE TRANSFERS TABLE
-- Phase 9: Remote Desktop & Control
-- ============================================
CREATE TABLE IF NOT EXISTS file_transfers (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('upload', 'download')),
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_file_transfers_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_file_transfers_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_file_transfers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_file_transfers_agent ON file_transfers(agent_id);
CREATE INDEX idx_file_transfers_company ON file_transfers(company_id);
CREATE INDEX idx_file_transfers_user ON file_transfers(user_id);
CREATE INDEX idx_file_transfers_status ON file_transfers(status);
CREATE INDEX idx_file_transfers_direction ON file_transfers(direction);
CREATE INDEX idx_file_transfers_company_status ON file_transfers(company_id, status);
CREATE INDEX idx_file_transfers_started_at ON file_transfers(started_at DESC);
CREATE INDEX idx_file_transfers_active ON file_transfers(agent_id, status) WHERE status IN ('pending', 'in_progress');

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hardware_inventory_updated_at BEFORE UPDATE ON hardware_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_software_inventory_updated_at BEFORE UPDATE ON software_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_network_info_updated_at BEFORE UPDATE ON network_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_status_updated_at BEFORE UPDATE ON security_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON ai_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_features_updated_at BEFORE UPDATE ON company_features
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_configurations_updated_at BEFORE UPDATE ON agent_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remote_sessions_updated_at BEFORE UPDATE ON remote_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_transfers_updated_at BEFORE UPDATE ON file_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SCHEMA COMPLETE
-- ============================================

