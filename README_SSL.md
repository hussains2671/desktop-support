# SSL/HTTPS Setup Guide

Complete guide for setting up HTTPS/SSL certificates for the Desktop Support application in both development and production environments.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Development Setup (mkcert)](#development-setup-mkcert)
4. [Production Setup (Let's Encrypt)](#production-setup-lets-encrypt)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)

---

## Overview

This application uses **Nginx as a reverse proxy** to handle HTTPS termination. All SSL/TLS configuration is done at the proxy layer, keeping the application code clean and environment-agnostic.

### Key Features

- ✅ **Development**: Uses `mkcert` for local SSL certificates (no browser warnings)
- ✅ **Production**: Uses Let's Encrypt for trusted certificates
- ✅ **WebSocket Support**: Full support for VNC remote desktop (`wss://`)
- ✅ **Easy Switching**: Environment-based configuration (no code changes)
- ✅ **Security**: Modern TLS configuration with strong ciphers

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Internet / LAN                  │
└──────────────┬──────────────────────────┘
               │ HTTPS (443) / WSS
               │
┌──────────────▼──────────────────────────┐
│      Nginx Reverse Proxy                │
│      (TLS Termination)                  │
│  - Dev: mkcert certs                    │
│  - Prod: Let's Encrypt                  │
└──────┬──────────────────┬───────────────┘
       │                  │
       │ HTTP             │ HTTP
       │                  │
┌──────▼──────┐   ┌───────▼────────┐
│  Frontend   │   │   Backend       │
│  (React)    │   │  (Express)      │
│  Port 3001 │   │  Port 3000      │
│             │   │  + WebSocket    │
└─────────────┘   └─────────────────┘
```

### Certificate Structure

```
certs/
├── dev/
│   ├── localhost.pem
│   ├── localhost-key.pem
│   ├── myapp.local.pem
│   └── myapp.local-key.pem
└── letsencrypt/          (Production - auto-generated)
    └── live/
        └── yourdomain.com/
            ├── fullchain.pem
            ├── privkey.pem
            └── chain.pem
```

### Current Certificate Domains

The development certificate includes:
- `localhost`
- `127.0.0.1`
- `10.73.77.58` (server IP)
- `ufomum-abdula.ufomoviez.com` (domain)
- `myapp.local` (optional)

---

## Development Setup (mkcert)

### Prerequisites

1. **Install mkcert**:

   **Windows (Chocolatey)**:
   ```powershell
   choco install mkcert
   ```

   **Windows (Scoop)**:
   ```powershell
   scoop install mkcert
   ```

   **Windows (Manual)**:
   - Download from [mkcert releases](https://github.com/FiloSottile/mkcert/releases)
   - Extract and add to PATH

   **Linux**:
   ```bash
   sudo apt install libnss3-tools
   wget -O mkcert https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64
   chmod +x mkcert
   sudo mv mkcert /usr/local/bin/
   ```

   **macOS**:
   ```bash
   brew install mkcert
   ```

2. **Install Local CA**:
   ```powershell
   # Windows PowerShell
   mkcert -install
   ```
   ```bash
   # Linux/macOS
   mkcert -install
   ```

   This installs a local Certificate Authority that your browser will trust.

### Step 1: Generate Development Certificates

**Windows (PowerShell)**:
```powershell
.\scripts\generate-dev-cert.ps1
```

**Linux/macOS (Bash)**:
```bash
chmod +x scripts/generate-dev-cert.sh
./scripts/generate-dev-cert.sh
```

This will create certificates in `certs/dev/` for:
- `localhost`
- `127.0.0.1`
- `myapp.local` (optional)

### Step 2: Start Application with HTTPS

**Windows (PowerShell)**:
```powershell
.\scripts\start-dev-https.ps1
```

**Linux/macOS (Bash)**:
```bash
chmod +x scripts/start-dev-https.sh
./scripts/start-dev-https.sh
```

Or manually:
```bash
export ENVIRONMENT=dev
export USE_HTTPS=true
docker-compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

### Step 3: Access Application

Access your application via any of these URLs:
- **Frontend**: https://localhost
- **API**: https://localhost/api
- **Health Check**: https://localhost/health

**Alternative Access URLs:**
- https://127.0.0.1
- https://10.73.77.58 (your IP address)
- https://ufomum-abdula.ufomoviez.com (your domain)
- https://myapp.local (if hosts file configured)

**Note**: You may see a browser warning on first access. Click "Advanced" → "Proceed to localhost" (this is normal for self-signed certs, but mkcert certs should be trusted automatically).

### Step 4: Trust Certificate on Other Devices (LAN Access)

To access from other devices on your network:

1. **Find CA certificate location**:
   ```powershell
   mkcert -CAROOT
   ```

2. **Copy rootCA.pem** to the other device

3. **Install on the device**:
   - **Windows**: Double-click `rootCA.pem` → Install Certificate → Local Machine → Place in "Trusted Root Certification Authorities"
   - **macOS**: Double-click `rootCA.pem` → Add to Keychain → Trust
   - **Linux**: Copy to `/usr/local/share/ca-certificates/` and run `sudo update-ca-certificates`

4. **Access via IP or domain**:
   - https://YOUR_IP (e.g., https://192.168.1.100)
   - Or add to hosts file: `YOUR_IP myapp.local` and use https://myapp.local

---

## Production Setup (Let's Encrypt)

### Prerequisites

1. **Domain name** pointing to your server
2. **Ports 80 and 443** open in firewall
3. **Docker and docker-compose** installed

### Step 1: Configure Environment Variables

Create/update `.env` file:

```env
# Domain Configuration
DOMAIN_NAME=yourdomain.com
CERTBOT_EMAIL=your-email@example.com

# API URLs (HTTPS)
API_BASE_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
VITE_API_BASE_URL=https://yourdomain.com/api

# Other production variables...
NODE_ENV=production
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_secure_jwt_secret
```

### Step 2: Initial Certificate Generation

**Option A: Using Certbot Container (Recommended)**

```bash
# Start nginx first (without SSL)
docker-compose -f docker-compose.prod.yml up -d nginx

# Generate certificate
docker-compose -f docker-compose.prod.yml -f docker-compose.prod-https.yml run --rm certbot

# Restart nginx with SSL
docker-compose -f docker-compose.prod.yml -f docker-compose.prod-https.yml up -d
```

**Option B: Manual Certbot Installation**

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be in /etc/letsencrypt/live/yourdomain.com/
```

### Step 3: Update Nginx Configuration

The production nginx config (`nginx/nginx.prod.conf`) should reference:

```nginx
ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;
```

### Step 4: Start Production Services

```bash
export ENVIRONMENT=prod
export DOMAIN_NAME=yourdomain.com
docker-compose -f docker-compose.prod.yml -f docker-compose.prod-https.yml up -d
```

### Step 5: Set Up Auto-Renewal

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

**Create renewal script** (`scripts/renew-cert.sh`):

```bash
#!/bin/bash
docker-compose -f docker-compose.prod.yml -f docker-compose.prod-https.yml exec certbot certbot renew
docker-compose -f docker-compose.prod.yml -f docker-compose.prod-https.yml restart nginx
```

**Add to crontab**:

```bash
# Renew certificates twice daily (Let's Encrypt recommends checking frequently)
0 0,12 * * * /path/to/scripts/renew-cert.sh >> /var/log/certbot-renew.log 2>&1
```

---

## Testing

### Development Testing

1. **Check HTTPS is working**:
   ```bash
   curl -k https://localhost/health
   # Should return: healthy
   ```

2. **Check API endpoint**:
   ```bash
   curl -k https://localhost/api/health
   ```

3. **Check WebSocket (VNC)**:
   - Open browser console
   - Create a remote session
   - Check WebSocket URL starts with `wss://`

4. **Browser Security Check**:
   - Open https://localhost
   - Check browser shows "Secure" (green lock icon)
   - No mixed content warnings

### Production Testing

1. **SSL Labs Test**:
   - Visit: https://www.ssllabs.com/ssltest/
   - Enter your domain
   - Should get A or A+ rating

2. **Certificate Check**:
   ```bash
   openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
   ```

3. **Test All Endpoints**:
   - Frontend: https://yourdomain.com
   - API: https://yourdomain.com/api/health
   - WebSocket: Create remote session and verify `wss://` connection

---

## Troubleshooting

### Issue: Browser Shows "Not Secure" Warning

**Development**:
- Ensure mkcert CA is installed: `mkcert -install`
- Clear browser cache
- Check certificate path in nginx config

**Production**:
- Verify certificate is valid: `openssl x509 -in cert.pem -text -noout`
- Check certificate chain is complete
- Ensure domain matches certificate

### Issue: WebSocket Connection Fails

1. **Check Nginx logs**:
   ```bash
   docker-compose logs nginx
   ```

2. **Verify WebSocket upgrade headers**:
   - Check `proxy_set_header Upgrade $http_upgrade;`
   - Check `proxy_set_header Connection "upgrade";`

3. **Check timeout settings**:
   - WebSocket timeout should be high (86400s for VNC)

4. **Verify protocol**:
   - Backend should generate `wss://` URLs when HTTPS is enabled
   - Check `backend/src/services/vncService.js`

### Issue: API Calls Fail with Mixed Content

- Ensure all API calls use HTTPS
- Check `frontend/src/services/api.js` uses `window.location.protocol`
- Verify `VITE_API_BASE_URL` uses `https://`

### Issue: Certificate Not Found

**Development**:
```bash
# Regenerate certificates
.\scripts\generate-dev-cert.ps1
```

**Production**:
```bash
# Regenerate Let's Encrypt certificate
docker-compose -f docker-compose.prod.yml -f docker-compose.prod-https.yml run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d yourdomain.com
```

### Issue: Port Already in Use

```bash
# Check what's using port 443
netstat -ano | findstr :443  # Windows
lsof -i :443                  # Linux/macOS

# Stop conflicting service or change port in docker-compose
```

---

## Security Best Practices

### 1. Certificate Security

- ✅ **Never commit private keys** to git (already in `.gitignore`)
- ✅ **Use strong passwords** for certificate storage (if encrypted)
- ✅ **Rotate certificates** regularly (Let's Encrypt auto-renews)

### 2. TLS Configuration

- ✅ **Use TLS 1.2+ only** (TLS 1.3 preferred)
- ✅ **Strong cipher suites** (configured in nginx)
- ✅ **HSTS enabled** (Strict-Transport-Security header)
- ✅ **OCSP Stapling** (production only)

### 3. Network Security

- ✅ **Firewall rules**: Only expose ports 80 and 443
- ✅ **Internal services**: Use Docker network (not exposed)
- ✅ **Rate limiting**: Configured in nginx for API and WebSocket

### 4. Application Security

- ✅ **HTTPS everywhere**: No HTTP endpoints in production
- ✅ **Secure cookies**: Use `Secure` and `HttpOnly` flags
- ✅ **CORS**: Properly configured for API
- ✅ **Content Security Policy**: Configured in nginx headers

### 5. Monitoring

- ✅ **Certificate expiry monitoring**: Set up alerts for Let's Encrypt renewal
- ✅ **SSL/TLS monitoring**: Use tools like SSL Labs or UptimeRobot
- ✅ **Log monitoring**: Monitor nginx access/error logs

---

## Quick Reference

### Development Commands

```powershell
# Generate certificates
.\scripts\generate-dev-cert.ps1

# Start with HTTPS
.\scripts\start-dev-https.ps1

# Stop services
docker-compose down

# View logs
docker-compose logs -f nginx
```

### Production Commands

```bash
# Start production with HTTPS
docker-compose -f docker-compose.prod.yml -f docker-compose.prod-https.yml up -d

# Renew certificates
docker-compose -f docker-compose.prod.yml -f docker-compose.prod-https.yml run --rm certbot renew

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -noout -dates
```

### Environment Variables

| Variable | Development | Production |
|----------|-------------|------------|
| `ENVIRONMENT` | `dev` | `prod` |
| `USE_HTTPS` | `true` | `true` |
| `API_BASE_URL` | `https://localhost` | `https://yourdomain.com` |
| `FRONTEND_URL` | `https://localhost` | `https://yourdomain.com` |
| `VITE_API_BASE_URL` | `https://localhost/api` | `https://yourdomain.com/api` |

---

## Additional Resources

- [mkcert Documentation](https://github.com/FiloSottile/mkcert)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review nginx logs: `docker-compose logs nginx`
3. Check backend logs: `docker-compose logs backend`
4. Verify certificate validity: `openssl x509 -in cert.pem -text -noout`

---

**Last Updated**: 2025-01-20
**Version**: 1.0

