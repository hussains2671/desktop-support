# Quick Start Guide - Desktop Support SaaS System

## 🚀 5-Minute Setup

### Step 1: Install Docker Desktop

Download and install from: https://www.docker.com/products/docker-desktop

### Step 2: Generate Environment File

```powershell
# Run PowerShell as Administrator
.\scripts\setup-env.ps1
```

Enter your Gemini API key when prompted (or press Enter to skip).

### Step 3: Start Services

```powershell
.\scripts\start-dev.ps1
```

Wait 2-3 minutes for services to start.

### Step 4: Access Application

Open browser: **http://localhost:3001**

### Step 5: Register Account

1. Click "Sign up"
2. Enter company name, your details, email, password
3. Click "Sign Up"
4. You're in! 🎉

## 📋 What's Running?

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Database**: PostgreSQL on port 5432

## 🔧 Useful Commands

```powershell
# View logs
.\scripts\view-logs.ps1

# Stop services
.\scripts\stop-dev.ps1

# Restart services
docker-compose restart
```

## 🖥️ Install Agent on Windows

```powershell
# Run as Administrator
cd agent\installer
.\Install-Agent.ps1 -ApiBaseUrl "http://localhost:3000/api" -CompanyId "1"
```

Replace `CompanyId` with your actual company ID from the dashboard.

## ❓ Need Help?

- Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions
- View logs: `docker-compose logs -f`
- Check service status: `docker-compose ps`

## ✅ Verification

1. Backend health: http://localhost:3000/health
2. Frontend loads: http://localhost:3001
3. Can register/login: ✅
4. Agent can connect: ✅

You're all set! 🎉

