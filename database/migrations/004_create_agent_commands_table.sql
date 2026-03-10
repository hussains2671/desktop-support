-- ============================================
-- Migration 004: Create agent_commands table
-- Phase 8: Remote Command Execution System
-- ============================================

BEGIN;

-- Create agent_commands table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_commands_agent ON agent_commands(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commands_company ON agent_commands(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_commands_status ON agent_commands(status);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created_at ON agent_commands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_commands_agent_status ON agent_commands(agent_id, status) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_agent_commands_company_status ON agent_commands(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created_by ON agent_commands(created_by);

COMMIT;

