# Database Setup - PostgreSQL

## Overview
This project uses PostgreSQL as the database. All schemas, migrations, and seeders are PostgreSQL-compatible.

## Quick Start

### Using Docker Compose
```bash
# Start database
docker-compose up -d db

# Access PostgreSQL
docker-compose exec db psql -U postgres -d desktop_support
```

## Database Files

- `schema.sql` - Complete database schema (PostgreSQL)
- `init.sql` - Initialization script (runs on first container start)
- `migrations/` - Database migration scripts
- `seeders/` - Seed data scripts

## PostgreSQL Commands

### Connect to Database
```bash
docker-compose exec db psql -U postgres -d desktop_support
```

### Backup Database
```bash
docker-compose exec db pg_dump -U postgres desktop_support > backup.sql
```

### Restore Database
```bash
docker-compose exec -T db psql -U postgres desktop_support < backup.sql
```

### Run Migrations
```bash
# Using Sequelize CLI
docker-compose exec backend npx sequelize-cli db:migrate

# Or manually
docker-compose exec -T db psql -U postgres desktop_support < database/migrations/001_initial.sql
```

### Seed Data
```bash
# Using Sequelize CLI
docker-compose exec backend npx sequelize-cli db:seed:all

# Or manually
docker-compose exec -T db psql -U postgres desktop_support < database/seeders/plans.sql
```

## PostgreSQL Features Used

1. **JSONB** - For metadata and additional_data columns
2. **SERIAL** - For auto-increment primary keys
3. **TEXT** - For variable-length text fields
4. **TIMESTAMP WITH TIME ZONE** - For date/time fields
5. **ARRAY** - For array data types where applicable
6. **Full-text search** - For search functionality

## Critical Database Indexes

**IMPORTANT**: These indexes are critical for performance. Add them to your schema:

```sql
-- Event Logs (will have millions of rows - CRITICAL)
CREATE INDEX idx_event_logs_device_time ON event_logs(device_id, time_generated DESC);
CREATE INDEX idx_event_logs_level ON event_logs(level) WHERE level IN ('critical', 'error');
CREATE INDEX idx_event_logs_type_level ON event_logs(log_type, level);

-- Performance Metrics (time-series data - CRITICAL)
CREATE INDEX idx_performance_device_recorded ON performance_metrics(device_id, recorded_at DESC);
CREATE INDEX idx_performance_recorded_at ON performance_metrics(recorded_at DESC);

-- Devices (frequent lookups - HIGH PRIORITY)
CREATE INDEX idx_devices_company_status ON devices(company_id, status);
CREATE INDEX idx_devices_hostname ON devices(hostname);
CREATE INDEX idx_devices_agent_id ON devices(agent_id) WHERE agent_id IS NOT NULL;

-- Alerts (filtering - HIGH PRIORITY)
CREATE INDEX idx_alerts_company_status ON alerts(company_id, status);
CREATE INDEX idx_alerts_severity ON alerts(severity) WHERE severity IN ('critical', 'high');
CREATE INDEX idx_alerts_device_status ON alerts(device_id, status) WHERE device_id IS NOT NULL;
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- Hardware Inventory (lookups - MEDIUM PRIORITY)
CREATE INDEX idx_hardware_device_type ON hardware_inventory(device_id, component_type);
CREATE INDEX idx_hardware_serial ON hardware_inventory(serial_number) WHERE serial_number IS NOT NULL;

-- Software Inventory (search - MEDIUM PRIORITY)
CREATE INDEX idx_software_device ON software_inventory(device_id);
CREATE INDEX idx_software_name ON software_inventory(name);

-- Users (authentication - HIGH PRIORITY)
CREATE INDEX idx_users_email_company ON users(email, company_id);
CREATE INDEX idx_users_company_role ON users(company_id, role);

-- Agents (heartbeat monitoring - MEDIUM PRIORITY)
CREATE INDEX idx_agents_company_status ON agents(company_id, status);
CREATE INDEX idx_agents_last_heartbeat ON agents(last_heartbeat) WHERE status = 'online';
```

## Data Retention Policy

**CRITICAL**: Implement data retention to prevent database bloat:

```sql
-- Archive event logs older than 90 days
DELETE FROM event_logs 
WHERE time_generated < NOW() - INTERVAL '90 days'
AND level NOT IN ('critical', 'error');

-- Archive performance metrics older than 30 days (keep daily aggregates)
DELETE FROM performance_metrics 
WHERE recorded_at < NOW() - INTERVAL '30 days';

-- Consider partitioning large tables by date
-- Example: Partition event_logs by month
```

## Security Best Practices

1. **Never use default passwords** - Always set strong passwords in .env
2. **Enable SSL in production** - Set DB_SSL_REJECT_UNAUTHORIZED=true
3. **Use connection pooling** - Configure appropriate pool size
4. **Regular backups** - Automated daily backups with retention
5. **Monitor slow queries** - Enable PostgreSQL slow query log
6. **Limit database access** - Use least privilege principle
7. **Encrypt sensitive data** - Use PostgreSQL encryption or application-level encryption

## Connection String Format

```
postgresql://username:password@host:port/database
```

Example:
```
postgresql://postgres:postgres_password@db:5432/desktop_support
```

