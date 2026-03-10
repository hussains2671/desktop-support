# Aaditech Solution Desktop Support

A comprehensive multi-tenant SaaS platform for desktop support management with hardware/software inventory, event log monitoring, AI-powered insights, and real-time alerts.

## Features

- **Multi-Tenant Architecture**: Support for multiple companies with plan-based features
- **Hardware Inventory**: Complete hardware component tracking (CPU, RAM, Storage, Display, etc.)
- **Software Inventory**: Installed applications tracking
- **Event Log Monitoring**: System and application event logs collection
- **Performance Monitoring**: Real-time CPU, Memory, Disk metrics
- **AI-Powered Insights**: Gemini AI integration for log analysis and recommendations
- **Alert System**: Automated alerts for critical issues
- **Windows Agent**: Lightweight PowerShell agent (with native C#/.NET option for enterprise environments)
- **Plan-Based Features**: Flexible feature management (Default, Moderate, Advanced, Custom)

## Tech Stack

- **Backend**: Node.js, Express.js, Sequelize ORM
- **Frontend**: React, Vite, Tailwind CSS, Zustand
- **Database**: PostgreSQL
- **AI**: Google Gemini API
- **Deployment**: Docker, Docker Compose
- **Agent**: PowerShell (Windows) / Native C#/.NET Windows Service (Enterprise-ready)
- **HTTPS/SSL**: Nginx reverse proxy with mkcert (dev) / Let's Encrypt (prod)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL (or use Docker)

### 1. Clone Repository

```bash
git clone <repository-url>
cd Desktop_Support
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Generate secrets:
# JWT_SECRET: openssl rand -base64 32
# DB_PASSWORD: openssl rand -base64 24
```

### 3. Start with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access Application

**HTTP (Development - Default):**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Database: localhost:5432

**HTTPS (Recommended - Secure):**
See `QUICK_START_HTTPS.md` for HTTPS setup instructions.

Once HTTPS is configured, access via:
- https://localhost
- https://127.0.0.1
- https://10.73.77.58 (your IP)
- https://ufomum-abdula.ufomoviez.com (your domain)

## Project Structure

```
Desktop_Support/
├── backend/              # Node.js backend API
├── frontend/             # React frontend
├── agent/                # Windows PowerShell agent
├── database/             # Database schemas and migrations
├── docker-compose.yml    # Development Docker setup
└── docs/                 # Documentation
```

## Development

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Agent Installation

### Windows

#### Option 1: PowerShell Agent (Standard)

1. Run PowerShell as Administrator
2. Execute installer:
```powershell
# Production (HTTPS required)
.\agent\installer\Install-Agent.ps1 -ApiBaseUrl "https://yourdomain.com:3000/api" -CompanyCode "YOUR_16_DIGIT_CODE"

# Development/Testing (HTTP - requires flag)
.\agent\installer\Install-Agent.ps1 -ApiBaseUrl "http://localhost:3000/api" -CompanyCode "YOUR_16_DIGIT_CODE" -AllowInsecureHttp
```

**Installation Flags:**
- `-Silent`: Run without user prompts (for automated deployments)
- `-ForceBypass`: Bypass execution policy (NOT RECOMMENDED - use code signing instead)
- `-AllowInsecureHttp`: Allow HTTP connections (dev/test only, NOT RECOMMENDED for production)

#### Option 2: Native Windows Service (Enterprise) ⭐ **PRODUCTION READY**

For environments where PowerShell is blocked or restricted:

1. **Quick Start**: See [Native Agent README](agent-native/README.md)
2. **Deployment**: See [Deployment Guide](agent-native/DEPLOYMENT_GUIDE.md)
3. **Architecture**: See [Native Agent Architecture](docs/NATIVE_AGENT_ARCHITECTURE.md)

**Status**: ✅ **Complete and Production Ready**

**Benefits:**
- ✅ No PowerShell dependency - Works even if PowerShell is completely blocked
- ✅ No ExecutionPolicy issues
- ✅ Better performance (compiled code, lower memory)
- ✅ Enterprise-ready (MSI installer, code signing support)
- ✅ 100% backend compatible (same APIs, same features)
- ✅ Auto-update support
- ✅ All features: Inventory, Commands, File Transfer, VNC

**Perfect for**: Enterprise customers with PowerShell restrictions

## Documentation

### HTTPS/SSL Setup
- **[Quick Start HTTPS](QUICK_START_HTTPS.md)** - Get HTTPS running in 5 minutes
- **[Complete SSL Guide](README_SSL.md)** - Full SSL/HTTPS setup guide
- **[Current Status](CURRENT_STATUS.md)** - Current system status
- **[Testing Guide](TESTING_CHECKLIST.md)** - Comprehensive testing checklist
- **[Documentation Index](HTTPS_DOCUMENTATION_INDEX.md)** - All HTTPS documentation

### Other Documentation
- [Database Setup](database/README.md)
- [Security Checklist](SECURITY_CHECKLIST.md)
- [PostgreSQL Plan](PLAN_POSTGRESQL.md)

## Security

**IMPORTANT**: Before production deployment:

1. **HTTPS Only**: Use HTTPS for all API communication (HTTP blocked by default)
2. **Code Signing**: Sign PowerShell scripts with code-signing certificate (recommended)
3. **Execution Policy**: Use RemoteSigned/AllSigned instead of Bypass
4. **Change Defaults**: Change all default passwords and secrets
5. **Generate Secrets**: Generate strong JWT secret: `openssl rand -base64 32`
6. **Enable SSL/TLS**: Configure proper SSL certificates
7. **Review Security**: Review [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)

### Recent Security Improvements

- ✅ HTTPS enforcement (HTTP blocked by default)
- ✅ ExecutionPolicy Bypass removed from default installer
- ✅ Registry-based software inventory (replaces slow Win32_Product)
- ✅ Hardened path validation (prevents path traversal attacks)
- ✅ Upgrade support with automatic backups
- ✅ Silent installation mode for automated deployments
- ✅ Native Windows Service option (no PowerShell dependency)

See [AGENT_INSTALLATION_GUIDE.md](AGENT_INSTALLATION_GUIDE.md) for detailed security considerations.

## License

MIT

## Support

For issues and questions, please refer to the documentation or create an issue.

