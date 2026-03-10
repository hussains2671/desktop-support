# Phase 6 Migration Guide

## Running the Security Fields Migration

This guide will help you apply the Phase 6 security enhancements to your database.

---

## Prerequisites

- PostgreSQL database is running
- Database connection is configured
- You have database admin access

---

## Step 1: Backup Your Database (Recommended)

**Before running any migration, always backup your database!**

### Using Docker Compose:
```bash
docker-compose exec db pg_dump -U postgres desktop_support > backup_before_phase6_$(date +%Y%m%d_%H%M%S).sql
```

### Manual Backup:
```bash
pg_dump -U postgres -d desktop_support > backup_before_phase6_$(date +%Y%m%d_%H%M%S).sql
```

---

## Step 2: Run the Migration

### Option A: Using Docker Compose (Recommended)

```bash
# Run migration directly
docker-compose exec -T db psql -U postgres -d desktop_support < database/migrations/003_add_security_fields.sql
```

### Option B: Using psql Directly

```bash
# Connect to database
psql -U postgres -d desktop_support

# Then run the migration
\i database/migrations/003_add_security_fields.sql

# Or from command line
psql -U postgres -d desktop_support -f database/migrations/003_add_security_fields.sql
```

### Option C: Using Sequelize CLI (if configured)

```bash
# From backend directory
cd backend
npm run migrate
```

---

## Step 3: Verify Migration

### Check if columns were added:

```sql
-- Connect to database
docker-compose exec db psql -U postgres -d desktop_support

-- Check users table structure
\d users

-- Or query directly
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('failed_login_attempts', 'locked_until', 'refresh_token', 'refresh_token_expires_at');
```

### Expected Output:
You should see these new columns:
- `failed_login_attempts` (integer, default 0)
- `locked_until` (timestamp with time zone, nullable)
- `refresh_token` (text, nullable)
- `refresh_token_expires_at` (timestamp with time zone, nullable)

### Check if indexes were created:

```sql
-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND indexname IN ('idx_users_refresh_token', 'idx_users_locked_until');
```

---

## Step 4: Update Existing Users (Optional)

If you have existing users, you may want to initialize the new fields:

```sql
-- Set default values for existing users (if needed)
UPDATE users 
SET 
    failed_login_attempts = 0,
    locked_until = NULL,
    refresh_token = NULL,
    refresh_token_expires_at = NULL
WHERE failed_login_attempts IS NULL;
```

**Note:** The migration uses `IF NOT EXISTS` and `DEFAULT` values, so existing users should already have the correct defaults. This step is only needed if you want to explicitly set values.

---

## Step 5: Test the Migration

### Test 1: Verify Backend Can Access New Fields

```bash
# Start your backend server
cd backend
npm run dev

# The server should start without errors
# Check logs for any database connection issues
```

### Test 2: Test User Registration

```bash
# Register a new user (should work with password validation)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "first_name": "Test",
    "last_name": "User",
    "company_name": "Test Company"
  }'
```

### Test 3: Test Login (should generate refresh token)

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# Response should include both "token" and "refreshToken"
```

---

## Troubleshooting

### Error: Column already exists
**Solution:** The migration uses `IF NOT EXISTS`, so this shouldn't happen. If it does, the columns are already added - you can skip the migration.

### Error: Permission denied
**Solution:** Ensure you're using a user with ALTER TABLE permissions:
```sql
-- Grant permissions (if needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

### Error: Table 'users' does not exist
**Solution:** Run the initial schema first:
```bash
docker-compose exec -T db psql -U postgres -d desktop_support < database/schema.sql
```

### Migration partially applied
**Solution:** Check which columns exist, then manually add missing ones:
```sql
-- Check existing columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';

-- Add missing columns manually if needed
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
-- ... etc
```

---

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Remove columns (WARNING: This will delete data!)
ALTER TABLE users 
DROP COLUMN IF EXISTS failed_login_attempts,
DROP COLUMN IF EXISTS locked_until,
DROP COLUMN IF EXISTS refresh_token,
DROP COLUMN IF EXISTS refresh_token_expires_at;

-- Remove indexes
DROP INDEX IF EXISTS idx_users_refresh_token;
DROP INDEX IF EXISTS idx_users_locked_until;
```

**Or restore from backup:**
```bash
# Restore from backup
docker-compose exec -T db psql -U postgres -d desktop_support < backup_before_phase6_YYYYMMDD_HHMMSS.sql
```

---

## Post-Migration Checklist

- [ ] Migration executed successfully
- [ ] All columns added to users table
- [ ] Indexes created
- [ ] Backend server starts without errors
- [ ] User registration works with password validation
- [ ] Login generates refresh tokens
- [ ] Account lockout works (test with 5 failed attempts)
- [ ] Refresh token endpoint works
- [ ] Logout invalidates refresh token

---

## Next Steps

After successful migration:

1. **Test Security Features:**
   - Test password complexity requirements
   - Test account lockout (5 failed attempts)
   - Test token refresh mechanism
   - Test logout functionality

2. **Update Frontend:**
   - Update login to handle refresh tokens
   - Implement token refresh logic
   - Update password change forms with validation

3. **Monitor:**
   - Check audit logs for security events
   - Monitor failed login attempts
   - Review locked accounts

---

**Migration File:** `database/migrations/003_add_security_fields.sql`  
**Date:** 2025-11-11  
**Phase:** Phase 6 - Security & Performance Enhancements

