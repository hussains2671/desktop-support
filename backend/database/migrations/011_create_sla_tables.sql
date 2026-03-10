-- Phase 11: SLA Management System Database Migration
-- Created: March 10, 2026
-- Purpose: Create SLA, SLA Breach, and SLA Metric tables

-- Drop tables if exist (for fresh migration)
DROP TABLE IF EXISTS sla_metrics CASCADE;
DROP TABLE IF EXISTS sla_breaches CASCADE;
DROP TABLE IF EXISTS slas CASCADE;

-- Create SLA table
CREATE TABLE IF NOT EXISTS slas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority_level VARCHAR(50),
    first_response_hours INT NOT NULL DEFAULT 4,
    resolution_hours INT NOT NULL DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);

-- Create SLA Breach table
CREATE TABLE IF NOT EXISTS sla_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sla_id UUID NOT NULL REFERENCES slas(id),
    breach_type VARCHAR(50) NOT NULL DEFAULT 'resolution',
    target_time TIMESTAMP NOT NULL,
    breach_at TIMESTAMP NOT NULL,
    minutes_over INT NOT NULL,
    escalated BOOLEAN DEFAULT false,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create SLA Metrics table
CREATE TABLE IF NOT EXISTS sla_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_tickets INT DEFAULT 0,
    sla_compliant INT DEFAULT 0,
    sla_breached INT DEFAULT 0,
    compliance_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX idx_slas_company_id ON slas(company_id);
CREATE INDEX idx_slas_is_active ON slas(is_active);
CREATE INDEX idx_sla_breaches_ticket_id ON sla_breaches(ticket_id);
CREATE INDEX idx_sla_breaches_sla_id ON sla_breaches(sla_id);
CREATE INDEX idx_sla_breaches_breach_at ON sla_breaches(breach_at);
CREATE INDEX idx_sla_metrics_company_id ON sla_metrics(company_id);
CREATE INDEX idx_sla_metrics_period ON sla_metrics(period_start, period_end);

-- Verify tables created
SELECT 
    table_name 
FROM 
    information_schema.tables 
WHERE 
    table_name IN ('slas', 'sla_breaches', 'sla_metrics') 
    AND table_schema = 'public'
ORDER BY 
    table_name;
