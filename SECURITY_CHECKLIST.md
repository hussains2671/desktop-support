# Security Checklist - Desktop Support SaaS System

## 🔴 CRITICAL - Must Fix Before Production

### 1. Environment Variables & Secrets
- [ ] Remove all default passwords from docker-compose.yml
- [ ] Create .env file with strong passwords (min 32 chars)
- [ ] Generate JWT secret: `openssl rand -base64 32`
- [ ] Never commit .env files to version control
- [ ] Add .env to .gitignore
- [ ] Use secrets management (Docker secrets, Vault, etc.) in production

### 2. Database Security
- [ ] Change default PostgreSQL password
- [ ] Enable SSL/TLS for database connections
- [ ] Set DB_SSL_REJECT_UNAUTHORIZED=true in production
- [ ] Remove database port mapping in production
- [ ] Use internal Docker network only
- [ ] Limit database user permissions (least privilege)
- [ ] Enable PostgreSQL audit logging

### 3. Authentication & Authorization
- [ ] Implement strong JWT secret (min 32 characters)
- [ ] Set appropriate JWT expiry (7 days recommended)
- [ ] Implement token refresh mechanism
- [ ] Add rate limiting on login endpoints
- [ ] Implement password complexity requirements
- [ ] Add account lockout after failed attempts
- [ ] Use bcrypt with appropriate salt rounds (10+)

### 4. Input Validation
- [ ] Add Joi/Yup validation for all API endpoints
- [ ] Sanitize all user inputs
- [ ] Validate agent data before database insertion
- [ ] Implement XSS protection
- [ ] Use parameterized queries (Sequelize does this, but verify)
- [ ] Validate file uploads (if any)

### 5. API Security
- [ ] Implement rate limiting (express-rate-limit)
- [ ] Add CORS configuration (specific origins only)
- [ ] Validate agent keys on all agent endpoints
- [ ] Implement request size limits
- [ ] Add API versioning
- [x] **HTTPS Only**: Use HTTPS for all API communication in production (HTTP blocked by default)
- [x] **HTTPS Detection**: Backend automatically detects and prefers HTTPS URLs

### 6. Data Encryption
- [ ] Enable PostgreSQL encryption at rest
- [ ] Encrypt sensitive fields (passwords, tokens)
- [ ] Use HTTPS for all communications
- [ ] Implement certificate pinning for agents
- [ ] Encrypt backups

## 🟡 HIGH PRIORITY - Fix Soon

### 7. Monitoring & Logging
- [ ] Implement structured logging (Winston/Pino)
- [ ] Log all authentication attempts
- [ ] Log all admin actions (audit trail)
- [ ] Monitor failed login attempts
- [ ] Set up error tracking (Sentry)
- [ ] Monitor database slow queries

### 8. Backup & Recovery
- [ ] Implement automated daily backups
- [ ] Test backup restoration process
- [ ] Store backups in secure location
- [ ] Encrypt backups
- [ ] Document disaster recovery plan
- [ ] Set backup retention policy (30 days minimum)

### 9. Agent Security
- [x] **HTTPS Enforcement**: HTTP blocked by default, requires explicit `-AllowInsecureHttp` flag
- [x] **ExecutionPolicy Security**: Removed default Bypass, added guarded `-ForceBypass` flag with warnings
- [x] **Code Signing**: Documented code-signing requirements for production
- [x] **Registry-Based Inventory**: Replaced slow/risky Win32_Product with registry enumeration
- [x] **Path Validation**: Hardened path validation to prevent path traversal attacks
- [x] **Upgrade Safety**: Automatic backup before upgrades, keeps last 3 backups
- [x] **Silent Installation**: Silent mode for automated deployments without user interaction
- [ ] Implement certificate-based agent authentication (mTLS)
- [ ] Add agent key rotation mechanism
- [ ] Validate all agent data before processing
- [ ] Implement agent revocation
- [ ] Rate limit agent endpoints
- [ ] Monitor agent behavior for anomalies
- [ ] **Native Agent Option**: Deploy C#/.NET Windows Service for environments where PowerShell is blocked

### 10. Network Security
- [ ] Configure firewall rules
- [ ] Use internal networks for database
- [ ] Implement DDoS protection
- [ ] Use WAF (Web Application Firewall) if available
- [ ] Monitor network traffic

## 🟢 MEDIUM PRIORITY - Plan For

### 11. Code Security
- [ ] Regular dependency updates
- [ ] Scan for vulnerabilities (npm audit)
- [ ] Implement code review process
- [ ] Use TypeScript for type safety
- [ ] Add unit tests for security-critical paths

### 12. Compliance
- [ ] Implement GDPR compliance (data deletion, export)
- [ ] Add privacy policy
- [ ] Implement audit logging
- [ ] Document data retention policies
- [ ] Add user consent management

## Agent Installation Security

### PowerShell Agent Security

**✅ Implemented:**
- HTTPS enforcement (HTTP requires `-AllowInsecureHttp` flag)
- ExecutionPolicy Bypass removed from default installer
- Guarded `-ForceBypass` flag with security warnings
- Silent installation mode for automated deployments
- Registry-based software inventory (replaces Win32_Product)
- Hardened path validation (prevents path traversal)
- Automatic backup before upgrades

**Recommended for Production:**
1. **Code Signing**: Sign all PowerShell scripts with code-signing certificate
   ```powershell
   Set-AuthenticodeSignature -FilePath "DesktopSupportAgent.ps1" -Certificate (Get-ChildItem -Path Cert:\LocalMachine\My\<thumbprint>)
   ```

2. **Execution Policy**: Set to RemoteSigned or AllSigned via Group Policy
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
   ```

3. **HTTPS Only**: Always use HTTPS URLs, never HTTP in production
   ```powershell
   .\Install-Agent.ps1 -ApiBaseUrl "https://yourdomain.com:3000/api" -CompanyCode "YOUR_CODE"
   ```

4. **Native Agent**: For enterprise environments where PowerShell is blocked, use native C#/.NET Windows Service
   - See [Native Agent Architecture](docs/NATIVE_AGENT_ARCHITECTURE.md)
   - No PowerShell dependency
   - Works even if PowerShell is completely blocked

### Installation Flags

**Safe Flags:**
- `-Silent`: Run without user prompts (for automated deployments)
- `-AllowInsecureHttp`: Allow HTTP (dev/test only, NOT for production)

**Use with Caution:**
- `-ForceBypass`: Bypass execution policy (NOT RECOMMENDED - use code signing instead)

## Quick Security Commands

### Generate Strong Secrets
```bash
# JWT Secret
openssl rand -base64 32

# Database Password
openssl rand -base64 24

# Agent Key
openssl rand -hex 32
```

### Check for Vulnerabilities
```bash
# Backend dependencies
cd backend && npm audit

# Frontend dependencies
cd frontend && npm audit

# Docker images
docker scout cves postgres:15-alpine
```

### Security Testing
```bash
# SQL Injection testing
# Use tools like sqlmap (ethical testing only)

# XSS testing
# Test all input fields

# Authentication testing
# Test brute force protection
```

## Production Deployment Security

### Pre-Deployment Checklist
- [ ] All default credentials removed
- [ ] Strong passwords set
- [ ] SSL certificates configured
- [ ] Firewall rules set
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Error tracking enabled
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Security headers configured (Helmet)

### Post-Deployment Monitoring
- [ ] Monitor failed login attempts
- [ ] Monitor database connections
- [ ] Monitor API response times
- [ ] Monitor error rates
- [ ] Review security logs daily
- [ ] Regular security audits

## Incident Response Plan

1. **Detection**: Monitor logs and alerts
2. **Containment**: Isolate affected systems
3. **Eradication**: Remove threat
4. **Recovery**: Restore from backups if needed
5. **Lessons Learned**: Document and improve

## Regular Security Tasks

### Weekly
- Review error logs
- Check for failed login attempts
- Review security alerts

### Monthly
- Update dependencies
- Review access logs
- Security audit
- Backup restoration test

### Quarterly
- Full security audit
- Penetration testing
- Review and update security policies
- Training and awareness

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security](https://docs.docker.com/engine/security/)

