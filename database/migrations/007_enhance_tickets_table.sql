-- Phase 10: Enhance Tickets Table and Add Related Tables
-- Migration: 007_enhance_tickets_table.sql

-- Note: Run this migration with: sequelize db:migrate

-- Enhance tickets table with additional fields
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50) UNIQUE NOT NULL DEFAULT 'TICKET-' || CURRENT_TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_id INTEGER;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS customer_id INTEGER;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS feedback_comments TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_company_assigned ON tickets(company_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_resolved_at ON tickets(resolved_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_company ON tickets(company_id);

-- Create ticket_comments table (for threaded communication)
CREATE TABLE IF NOT EXISTS ticket_comments (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachment_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_user ON ticket_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created ON ticket_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_company ON ticket_comments(company_id);

-- Create ticket_history table (audit trail)
CREATE TABLE IF NOT EXISTS ticket_history (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  change_type VARCHAR(50) NOT NULL,
  old_value VARCHAR(255),
  new_value VARCHAR(255),
  changed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_created ON ticket_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_history_company ON ticket_history(company_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_type ON ticket_history(change_type);
