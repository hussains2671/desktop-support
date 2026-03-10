# Desktop Support SaaS System - PostgreSQL Only Implementation Plan

## Database: PostgreSQL Only

### Updated Architecture:
```
Docker Stack:
├── Backend Container (Node.js + Express)
├── Frontend Container (React + Nginx)
├── PostgreSQL Container (Database)
└── Docker Compose (Orchestration)
```

## Key PostgreSQL Changes

### 1. Docker Compose - PostgreSQL
```yaml
db:
  image: postgres:15-alpine
  container_name: desktop_support_postgres
  environment:
    POSTGRES_DB: ${DB_NAME}
    POSTGRES_USER: ${DB_USER}
    POSTGRES_PASSWORD: ${DB_PASSWORD}
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
```

### 2. Sequelize Configuration
```javascript
// PostgreSQL dialect
dialect: 'postgres'
// Connection pool for PostgreSQL
pool: {
  max: 10,
  min: 0,
  acquire: 30000,
  idle: 10000
}
```

### 3. Database Schema
- All SQL syntax PostgreSQL compatible
- Use PostgreSQL data types (SERIAL, TEXT, JSONB, etc.)
- PostgreSQL-specific features (JSONB for metadata)
- Use PostgreSQL functions

### 4. Migration Scripts
- PostgreSQL-compatible SQL
- Use pg_dump for backups
- Use psql for initialization

## Updated Implementation Steps

### Phase 1: PostgreSQL Setup
1. Create PostgreSQL Docker service
2. Configure Sequelize for PostgreSQL
3. Create PostgreSQL schema (all tables)
4. PostgreSQL initialization scripts
5. Seed data for PostgreSQL

### Phase 2: Backend Configuration
- Update database.js for PostgreSQL
- PostgreSQL connection string
- Environment variables for PostgreSQL
- Migration scripts for PostgreSQL

### Phase 3: Database Schema
- Convert all MySQL syntax to PostgreSQL
- Use PostgreSQL data types
- JSONB for JSON columns
- Proper indexes for PostgreSQL

## PostgreSQL-Specific Features to Use

1. **JSONB** for metadata columns (faster queries)
2. **SERIAL** for auto-increment IDs
3. **TEXT** instead of VARCHAR
4. **TIMESTAMP WITH TIME ZONE** for dates
5. **ARRAY** types where applicable
6. **Full-text search** capabilities
7. **PostgreSQL functions** for complex queries

## Updated File Structure

```
database/
├── schema.sql              # PostgreSQL schema
├── init.sql                # PostgreSQL init script
├── migrations/              # PostgreSQL migrations
│   └── 001_initial.sql
└── seeders/                # PostgreSQL seed data
    ├── plans.sql
    ├── features.sql
    └── admin_user.sql
```

## Connection Details

### Development (.env)
```
DB_HOST=db
DB_PORT=5432
DB_NAME=desktop_support
DB_USER=postgres
DB_PASSWORD=postgres_password
DB_DIALECT=postgres
```

### Production (.env.production)
```
DB_HOST=db
DB_PORT=5432
DB_NAME=desktop_support_prod
DB_USER=desktop_user
DB_PASSWORD=strong_password
DB_DIALECT=postgres
```

## Backup & Restore

### Backup
```bash
docker-compose exec db pg_dump -U postgres desktop_support > backup.sql
```

### Restore
```bash
docker-compose exec -T db psql -U postgres desktop_support < backup.sql
```

## Security Requirements (CRITICAL)

### 1. Environment Variables
- **NEVER** commit .env files to version control
- Use strong passwords (min 32 characters)
- Generate JWT secret: `openssl rand -base64 32`
- Rotate secrets regularly

### 2. Database Security
- Enable SSL in production
- Use strong database passwords
- Limit database user permissions
- Regular security updates

### 3. Connection Security
- Remove port mapping in production
- Use internal Docker network only
- Enable firewall rules
- Monitor connection attempts

## Performance Optimization

### 1. Database Indexes
See `database/README.md` for critical indexes that MUST be added.

### 2. Connection Pooling
- Development: max 10 connections
- Production: max 20-50 connections (based on load
- Monitor connection usage

### 3. Query Optimization
- Use EXPLAIN ANALYZE for slow queries
- Enable PostgreSQL slow query log
- Regular query performance review

## Data Retention Strategy

### Critical Data (Keep Forever)
- Companies, Plans, Features
- Users, Agents, Devices
- Critical alerts and errors

### Time-Series Data (Retention Policy)
- Event Logs: 90 days (archive critical/error)
- Performance Metrics: 30 days (keep daily aggregates)
- AI Insights: 180 days

### Implementation
- Automated cleanup jobs
- Archive to cold storage
- Regular backup before deletion

