-- ============================================
-- Migration 005: Create remote_sessions table
-- Phase 9: Remote Desktop & Control
-- ============================================

BEGIN;

-- Create remote_sessions table
CREATE TABLE IF NOT EXISTS remote_sessions (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    session_type VARCHAR(20) DEFAULT 'vnc' CHECK (session_type IN ('vnc', 'rdp', 'ssh')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'timeout', 'error')),
    connection_string TEXT,
    vnc_password VARCHAR(255), -- Encrypted, temporary
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_remote_sessions_agent ON remote_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_company ON remote_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_user ON remote_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_status ON remote_sessions(status);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_company_status ON remote_sessions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_started_at ON remote_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_active ON remote_sessions(agent_id, status) WHERE status = 'active';

COMMIT;

