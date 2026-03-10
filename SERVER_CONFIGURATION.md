# Server Configuration Guide

## Server Information

- **Domain**: `UFOMUM-AbdulA.ufomoviez.com`
- **Primary IP**: `10.73.77.58`
- **Secondary IPs**: `192.168.86.22`, `192.168.86.152`

## Configuration

### Environment Variables

The system uses the following environment variables for server configuration:

```env
# Server Domain (used for URLs)
SERVER_DOMAIN=UFOMUM-AbdulA.ufomoviez.com

# API Base URL
API_BASE_URL=http://UFOMUM-AbdulA.ufomoviez.com:3000

# Frontend URL
FRONTEND_URL=http://UFOMUM-AbdulA.ufomoviez.com:3001

# Frontend API URL (for Vite)
VITE_API_BASE_URL=http://UFOMUM-AbdulA.ufomoviez.com:3000/api
```

### Setup

1. **Run Setup Script**:
   ```powershell
   .\scripts\setup-env.ps1
   ```

2. **When Prompted**, enter:
   - Server Domain: `UFOMUM-AbdulA.ufomoviez.com` (or press Enter for default)
   - Or use IP: `10.73.77.58`

3. **The script will automatically**:
   - Generate API URLs based on domain/IP
   - Create `.env` file with correct configuration
   - Set up all necessary environment variables

## Access URLs

### Using Domain Name
- **Frontend**: http://UFOMUM-AbdulA.ufomoviez.com:3001
- **Backend API**: http://UFOMUM-AbdulA.ufomoviez.com:3000
- **API Endpoint**: http://UFOMUM-AbdulA.ufomoviez.com:3000/api

### Using Primary IP
- **Frontend**: http://10.73.77.58:3001
- **Backend API**: http://10.73.77.58:3000
- **API Endpoint**: http://10.73.77.58:3000/api

### Alternative IPs
- **IP 2**: http://192.168.86.22:3001 (Frontend), http://192.168.86.22:3000 (Backend)
- **IP 3**: http://192.168.86.152:3001 (Frontend), http://192.168.86.152:3000 (Backend)

## Agent Installation

When installing agents on Windows machines, use the domain or IP:

### Using Domain:
```powershell
.\Install-Agent.ps1 -ApiBaseUrl "http://UFOMUM-AbdulA.ufomoviez.com:3000/api" -CompanyCode "YOUR_COMPANY_CODE"
```

### Using IP:
```powershell
.\Install-Agent.ps1 -ApiBaseUrl "http://10.73.77.58:3000/api" -CompanyCode "YOUR_COMPANY_CODE"
```

## Docker Configuration

### Port Mapping

The `docker-compose.yml` maps:
- **Backend**: Port 3000
- **Frontend**: Port 3001
- **Database**: Port 5432

### Network Access

Ensure the server is accessible from:
- The domain/IP addresses listed above
- Ports 3000, 3001, and 5432 are open (if needed externally)

## Production Considerations

### HTTPS Setup (Recommended)

For production, consider:
1. Setting up SSL/TLS certificates
2. Using HTTPS instead of HTTP
3. Updating environment variables:
   ```env
   API_BASE_URL=https://UFOMUM-AbdulA.ufomoviez.com:3000
   FRONTEND_URL=https://UFOMUM-AbdulA.ufomoviez.com:3001
   VITE_API_BASE_URL=https://UFOMUM-AbdulA.ufomoviez.com:3000/api
   ```

### Firewall Configuration

Ensure firewall allows:
- **Inbound**: Ports 3000, 3001 (and 5432 if external DB access needed)
- **Outbound**: All necessary ports for agent communication

### DNS Configuration

If using domain name:
- Ensure DNS points to the correct IP address(es)
- Consider setting up A record for `UFOMUM-AbdulA.ufomoviez.com`

## Troubleshooting

### Cannot Access from Network

1. **Check Firewall**: Ensure ports are open
2. **Check Docker**: Verify containers are running: `docker-compose ps`
3. **Check Network**: Verify server is accessible: `ping UFOMUM-AbdulA.ufomoviez.com`
4. **Check Ports**: Verify ports are not blocked: `netstat -an | findstr "3000 3001"`

### Agent Cannot Connect

1. **Verify API URL**: Check agent config.json has correct API URL
2. **Network Access**: Ensure agent machine can reach server
3. **Firewall**: Check if agent machine firewall allows outbound connections
4. **Test Connection**: Try accessing API from agent machine browser

### Domain Not Resolving

1. **Use IP Instead**: Temporarily use IP address for configuration
2. **Check DNS**: Verify DNS settings
3. **Hosts File**: Add entry to hosts file if needed:
   ```
   10.73.77.58    UFOMUM-AbdulA.ufomoviez.com
   ```

## Quick Reference

| Service | Domain URL | IP URL |
|---------|-----------|--------|
| Frontend | http://UFOMUM-AbdulA.ufomoviez.com:3001 | http://10.73.77.58:3001 |
| Backend | http://UFOMUM-AbdulA.ufomoviez.com:3000 | http://10.73.77.58:3000 |
| API | http://UFOMUM-AbdulA.ufomoviez.com:3000/api | http://10.73.77.58:3000/api |

---

**Note**: Update `.env` file if you need to change server configuration. Restart services after changes:
```powershell
docker-compose restart
```

