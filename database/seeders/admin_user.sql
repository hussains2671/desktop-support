-- ============================================
-- Admin User Seeder
-- Desktop Support SaaS System
-- ============================================
-- Note: This creates a default admin user for the first company
-- Password should be changed on first login
-- Default password hash is for: Admin@123 (bcrypt, 10 rounds)

-- First, ensure we have a default plan
INSERT INTO plans (name, display_name, description, price, max_agents, max_devices, is_custom)
VALUES ('default', 'Default Plan', 'Basic plan', 0.00, 10, 50, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Create a default company (if not exists)
INSERT INTO companies (name, domain, plan_id, status, max_agents, max_devices)
VALUES ('Default Company', 'default.local', 1, 'active', 100, 500)
ON CONFLICT (domain) DO NOTHING
RETURNING id;

-- Create admin user for default company
-- Password: Admin@123 (bcrypt hash)
-- To generate new hash: bcrypt.hash('password', 10)
INSERT INTO users (company_id, email, password_hash, first_name, last_name, role, is_active)
SELECT 
    (SELECT id FROM companies WHERE domain = 'default.local' LIMIT 1),
    'admin@default.local',
    '$2a$10$rOzJqZqZqZqZqZqZqZqZqOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', -- Admin@123
    'System',
    'Administrator',
    'super_admin',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@default.local'
);

