# Redis Setup Verification Guide

**Date:** 2025-11-11  
**Status:** ✅ Redis Package Installed

---

## ✅ Installation Status

The `redis` package (v4.6.10) has been successfully installed in the backend.

---

## 📋 Next Steps

### 1. Start Docker Services

```powershell
# From project root
docker-compose up -d
```

This will start:
- PostgreSQL database
- **Redis cache** (new)
- Backend service
- Frontend service

### 2. Verify Redis Container

```powershell
# Check if Redis container is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping
# Should return: PONG
```

### 3. Verify Backend Connection

Check backend logs for Redis connection status:

```powershell
# View backend logs
docker-compose logs backend | Select-String -Pattern "Redis"
```

**Expected output:**
```
✅ Redis cache connected
```

**If Redis is unavailable:**
```
⚠️  Redis cache not available (continuing without cache)
```

### 4. Test Caching

Make a request to a cached endpoint and check headers:

```powershell
# Example: Get inventory stats (cached for 5 minutes)
$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN"
}
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/inventory/stats" -Headers $headers
$response.Headers["X-Cache"]
# First request: MISS
# Subsequent requests (within 5 min): HIT
```

---

## 🔍 Troubleshooting

### Issue: Redis Container Not Starting

**Check:**
```powershell
docker-compose logs redis
```

**Common causes:**
- Port 6379 already in use
- Docker not running
- Insufficient resources

**Solution:**
```powershell
# Stop and remove container
docker-compose down redis

# Start again
docker-compose up -d redis

# Check status
docker-compose ps redis
```

### Issue: Backend Can't Connect to Redis

**Check:**
1. Redis container is running: `docker-compose ps redis`
2. Backend can reach Redis: `docker-compose exec backend ping redis`
3. Environment variables: `docker-compose exec backend env | Select-String -Pattern "REDIS"`

**Solution:**
- Ensure both services are on the same Docker network
- Check `REDIS_HOST` environment variable (should be `redis` in Docker)

### Issue: Cache Not Working

**Symptoms:**
- Always getting `X-Cache: MISS`
- No performance improvement

**Check:**
1. Verify Redis is connected (check backend logs)
2. Check cache keys in Redis:
   ```powershell
   docker-compose exec redis redis-cli keys "cache:*"
   ```
3. Verify middleware is applied (check route files)

---

## 📊 Verification Checklist

- [ ] Redis package installed (`redis@4.6.10`)
- [ ] Redis container running (`docker-compose ps redis`)
- [ ] Redis responding to ping (`redis-cli ping` returns `PONG`)
- [ ] Backend logs show "✅ Redis cache connected"
- [ ] Cache headers present in API responses (`X-Cache: HIT/MISS`)
- [ ] Cache keys visible in Redis (`redis-cli keys "cache:*"`)

---

## 🎯 Expected Behavior

### First Request (Cache Miss)
```
GET /api/inventory/stats
Response Headers:
  X-Cache: MISS
Response Time: ~200-500ms (database query)
```

### Subsequent Requests (Cache Hit)
```
GET /api/inventory/stats
Response Headers:
  X-Cache: HIT
Response Time: ~10-50ms (from cache)
```

### After TTL Expires (Cache Miss Again)
```
GET /api/inventory/stats
Response Headers:
  X-Cache: MISS
Response Time: ~200-500ms (database query, cache refreshed)
```

---

## 📝 Notes

1. **Deprecation Warnings:** The npm warnings are from dependencies and don't affect functionality. They can be addressed in future updates.

2. **Security Vulnerability:** The moderate vulnerability is likely in a dev dependency. Run `npm audit` in the backend directory to see details. Most can be safely ignored for now.

3. **Cache TTLs:** Different endpoints have different cache durations:
   - Stats: 5 minutes
   - Reports: 5 minutes
   - Device lists: 1 minute
   - Real-time data: 1 minute

4. **Graceful Degradation:** If Redis is unavailable, the application continues to work without caching.

---

**Last Updated:** 2025-11-11  
**Status:** Ready for Testing

