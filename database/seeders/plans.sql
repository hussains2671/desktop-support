-- ============================================
-- Default Plans Seeder
-- Desktop Support SaaS System
-- ============================================

INSERT INTO plans (name, display_name, description, price, max_agents, max_devices, is_custom) VALUES
('default', 'Default Plan', 'Basic monitoring and inventory features for small teams', 0.00, 10, 50, FALSE),
('moderate', 'Moderate Plan', 'Enhanced features with AI insights and advanced monitoring', 49.99, 50, 200, FALSE),
('advanced', 'Advanced Plan', 'Full feature access with priority support and unlimited resources', 149.99, 200, 1000, FALSE),
('custom', 'Custom Plan', 'Tailored features and limits based on your needs', 0.00, 0, 0, TRUE)
ON CONFLICT (name) DO NOTHING;

