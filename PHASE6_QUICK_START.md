# Phase 6 Quick Start Guide

## 🚀 Quick Steps to Apply Phase 6 Changes

### Step 1: Run Database Migration

**Using Docker Compose (Recommended):**
```powershell
docker-compose exec -T db psql -U postgres -d desktop_support < database\migrations\003_add_security_fields.sql
```

**Or using psql directly:**
```powershell
psql -U postgres -d desktop_support -f database\migrations\003_add_security_fields.sql
```

### Step 2: Verify Migration

```powershell
# Connect to database
docker-compose exec db psql -U postgres -d desktop_support

# Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('failed_login_attempts', 'locked_until', 'refresh_token', 'refresh_token_expires_at');
```

### Step 3: Restart Backend

```powershell
# Stop and restart backend
docker-compose restart backend

# Or if running locally
cd backend
npm run dev
```

### Step 4: Test New Features

**Test Password Validation:**
```powershell
# This should fail (weak password)
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{\"email\":\"test@test.com\",\"password\":\"weak\",\"first_name\":\"Test\",\"last_name\":\"User\",\"company_name\":\"Test Co\"}'

# This should succeed (strong password)
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{\"email\":\"test@test.com\",\"password\":\"StrongPass123!@#\",\"first_name\":\"Test\",\"last_name\":\"User\",\"company_name\":\"Test Co\"}'
```

**Test Login (should return refresh token):**
```powershell
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"test@test.com\",\"password\":\"StrongPass123!@#\"}'
```

---

## 📚 Documentation Files

1. **MIGRATION_GUIDE_PHASE6.md** - Detailed migration instructions
2. **API_DOCUMENTATION_PHASE6.md** - Complete API documentation
3. **SECURITY_FEATURES_GUIDE.md** - Security features explanation
4. **PHASE_6_COMPLETION_REPORT.md** - Implementation details

---

## ✅ Checklist

- [ ] Database migration executed
- [ ] New columns verified in users table
- [ ] Backend restarted
- [ ] Password validation working
- [ ] Login returns refresh token
- [ ] Account lockout working (test with 5 failed attempts)
- [ ] Refresh token endpoint working
- [ ] Logout working

---

## 🆘 Troubleshooting

**Migration fails?**
- Check database connection
- Verify you have ALTER TABLE permissions
- Check if columns already exist (migration uses IF NOT EXISTS)

**Backend won't start?**
- Check database connection
- Verify migration was successful
- Check logs: `docker-compose logs backend`

**Password validation not working?**
- Verify backend code is updated
- Check server logs for errors
- Test with curl/Postman

---

**Need Help?** See detailed guides:
- Migration: `MIGRATION_GUIDE_PHASE6.md`
- API: `API_DOCUMENTATION_PHASE6.md`
- Security: `SECURITY_FEATURES_GUIDE.md`

