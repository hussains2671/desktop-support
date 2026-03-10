# Remote Access Troubleshooting Guide

## Problem: Connection Refused When Accessing from Remote System

If you're getting `ERR_CONNECTION_REFUSED` errors when trying to login from a different system, this is because the frontend is trying to connect to `localhost:3000`, which only works when accessing from the same machine where the backend is running.

## Solution Options

### Option 1: Access Frontend Using Server IP/Hostname (Recommended)

**Instead of accessing via `localhost:3001`, use the server's IP address or hostname:**

- **Using Domain**: `http://UFOMUM-AbdulA.ufomoviez.com:3001`
- **Using Primary IP**: `http://10.73.77.58:3001`
- **Using Alternative IPs**: 
  - `http://192.168.86.22:3001`
  - `http://192.168.86.152:3001`

When you access the frontend using the server's IP/hostname, the API will automatically connect to the same hostname on port 3000.

### Option 2: Set Environment Variable

If you need to access via localhost but the backend is on a different machine, set the `VITE_API_BASE_URL` environment variable:

#### For Docker (docker-compose.yml)

1. Create or update `.env` file in the project root:
```env
VITE_API_BASE_URL=http://10.73.77.58:3000/api
# OR
VITE_API_BASE_URL=http://UFOMUM-AbdulA.ufomoviez.com:3000/api
```

2. Update `docker-compose.yml` (already done - it now uses `${VITE_API_BASE_URL}`)

3. Restart the frontend container:
```bash
docker-compose restart frontend
```

#### For Local Development (without Docker)

1. Create `.env` file in the `frontend` directory:
```env
VITE_API_BASE_URL=http://10.73.77.58:3000/api
```

2. Restart the Vite dev server:
```bash
cd frontend
npm run dev
```

### Option 3: Check Browser Console

The updated API service now logs the detected API URL in the browser console. Open Developer Tools (F12) and check the console for:
- `🌐 API Base URL: ...`
- `📍 Current Hostname: ...`
- `🔗 Full URL: ...`

This will help you verify which API URL is being used.

## Quick Fix Checklist

- [ ] Are you accessing the frontend using the server's IP/hostname (not localhost)?
- [ ] Is the backend running and accessible on port 3000?
- [ ] Can you access `http://SERVER_IP:3000/api/health` directly in your browser?
- [ ] Check browser console for API URL detection logs
- [ ] Verify firewall allows connections on ports 3000 and 3001

## Server Information

- **Domain**: `UFOMUM-AbdulA.ufomoviez.com`
- **Primary IP**: `10.73.77.58`
- **Alternative IPs**: `192.168.86.22`, `192.168.86.152`
- **Frontend Port**: `3001`
- **Backend API Port**: `3000`

## Testing Connection

Test if the backend is accessible from your remote system:

```bash
# Test backend health endpoint
curl http://10.73.77.58:3000/api/health

# Or in browser
http://10.73.77.58:3000/api/health
```

If this fails, the issue is network/firewall related, not the frontend configuration.

