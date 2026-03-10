-- ============================================
-- Migration 006: Create file_transfers table
-- Phase 9: Remote Desktop & Control
-- ============================================

BEGIN;

-- Create file_transfers table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_transfers_agent ON file_transfers(agent_id);
CREATE INDEX IF NOT EXISTS idx_file_transfers_company ON file_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_file_transfers_user ON file_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_file_transfers_status ON file_transfers(status);
CREATE INDEX IF NOT EXISTS idx_file_transfers_direction ON file_transfers(direction);
CREATE INDEX IF NOT EXISTS idx_file_transfers_company_status ON file_transfers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_file_transfers_started_at ON file_transfers(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_transfers_active ON file_transfers(agent_id, status) WHERE status IN ('pending', 'in_progress');

COMMIT;

