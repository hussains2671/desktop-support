# Desktop Support SaaS System - Setup Guide

## Prerequisites

1. **Docker Desktop** - Download and install from [docker.com](https://www.docker.com/products/docker-desktop)
2. **Node.js 18+** (optional, for local development without Docker)
3. **PowerShell** (for Windows setup scripts)

## Quick Setup (Automated)

### Step 1: Generate Environment File

Run the setup script to generate `.env` file with secure secrets:

```powershell
# Run as Administrator (recommended)
.\scripts\setup-env.ps1
```

This will:
- Generate secure JWT secret
- Generate secure database password
- Prompt for Gemini API key (optional)
- Create `.env` file

### Step 2: Check Docker Installation

```powershell
.\scripts\check-docker.ps1
```

This verifies Docker and Docker Compose are installed and running.

### Step 3: Start Services

```powershell
.\scripts\start-dev.ps1
```

This will:
- Build Docker images
- Start all containers
- Initialize database
- Run seed data

### Step 4: Access Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Manual Setup

### 1. Create .env File

Copy `.env.example` to `.env` and update values:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set:
- `DB_PASSWORD` - Strong password (min 24 chars)
- `JWT_SECRET` - Strong secret (min 32 chars)
- `GEMINI_API_KEY` - Your Gemini API key (optional)

**Generate Secrets (PowerShell):**
```powershell
# JWT Secret (32 bytes)
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Database Password (24 bytes)
$bytes = New-Object byte[] 24
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

### 2. Start Docker Services

```powershell
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Verify Services

```powershell
# Check running containers
docker-compose ps

# Check backend health
Invoke-RestMethod http://localhost:3000/health

# Check database connection
docker-compose exec db psql -U postgres -d desktop_support -c "SELECT version();"
```

## First Time Setup

### 1. Register First User

1. Open http://localhost:3001
2. Click "Sign up"
3. Fill in:
   - Company Name
   - Your Name
   - Email
   - Password
4. Click "Sign Up"

This creates:
- A new company (trial status)
- First user (company_admin role)
- Default plan assignment

### 2. Login

1. Use the email/password you just created
2. You'll be redirected to Dashboard

### 3. Install Agent on Windows Machine

#### Option A: Using Installer Script

```powershell
# Run as Administrator
cd agent\installer
.\Install-Agent.ps1 -ApiBaseUrl "http://localhost:3000/api" -CompanyId "1"
```

#### Option B: Using Batch File

```cmd
# Run as Administrator
cd agent\installer
Install-Agent.bat
```

When prompted:
- API Base URL: `http://localhost:3000/api` (or your server URL)
- Company ID: `1` (or your company ID from dashboard)

## Database Setup

### Automatic (Recommended)

Database schema and seed data are automatically applied when PostgreSQL container starts for the first time.

### Manual Setup

If you need to run manually:

```powershell
# Connect to database
docker-compose exec db psql -U postgres -d desktop_support

# Or run SQL files manually
docker-compose exec -T db psql -U postgres -d desktop_support < database/schema.sql
docker-compose exec -T db psql -U postgres -d desktop_support < database/seeders/plans.sql
docker-compose exec -T db psql -U postgres -d desktop_support < database/seeders/features.sql
```

## Troubleshooting

### Docker Not Starting

1. Ensure Docker Desktop is running
2. Check Docker Desktop settings
3. Restart Docker Desktop
4. Check Windows WSL 2 is enabled (if using WSL 2 backend)

### Database Connection Failed

1. Check database container is running:
   ```powershell
   docker-compose ps db
   ```

2. Check database logs:
   ```powershell
   docker-compose logs db
   ```

3. Verify .env file has correct database credentials

### Backend Not Starting

1. Check backend logs:
   ```powershell
   docker-compose logs backend
   ```

2. Verify environment variables in .env
3. Check if database is ready:
   ```powershell
   docker-compose exec db pg_isready -U postgres
   ```

### Frontend Not Loading

1. Check frontend logs:
   ```powershell
   docker-compose logs frontend
   ```

2. Verify VITE_API_BASE_URL in .env
3. Check browser console for errors

### Agent Not Connecting

1. Verify agent key is correct
2. Check API URL is accessible from agent machine
3. Check backend logs for agent registration attempts
4. Verify company ID is correct

## Useful Commands

### View Logs

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Restart Services

```powershell
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Database Operations

```powershell
# Connect to database
docker-compose exec db psql -U postgres -d desktop_support

# Backup database
docker-compose exec db pg_dump -U postgres desktop_support > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres desktop_support < backup.sql
```

### Clean Start

```powershell
# Stop and remove containers, volumes
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

## Next Steps

1. ✅ Environment setup complete
2. ✅ Services running
3. ✅ First user registered
4. ⏭️ Install agents on Windows machines
5. ⏭️ Configure Gemini API key for AI features
6. ⏭️ Customize plans and features
7. ⏭️ Set up monitoring and alerts

## Production Deployment

Before deploying to production:

1. Review [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
2. Change all default passwords
3. Enable SSL/TLS
4. Set `NODE_ENV=production`
5. Use production database credentials
6. Configure proper firewall rules
7. Set up automated backups
8. Enable monitoring

See [PLAN_POSTGRESQL.md](PLAN_POSTGRESQL.md) for production deployment details.

