# HTTPS/SSL Testing Checklist

Complete testing checklist for HTTPS/SSL implementation. Check off each item as you test.

## 📋 Pre-Testing Setup

- [ ] mkcert installed and local CA installed
- [ ] Certificates generated (`scripts/generate-dev-cert.ps1`)
- [ ] Docker and docker-compose installed and running
- [ ] All services stopped (clean slate)

---

## 🔧 Phase 1: Certificate Generation Testing

### Development Certificates

- [ ] Run `generate-dev-cert.ps1` successfully
- [ ] Certificates created in `certs/dev/`
- [ ] Files exist: `localhost.pem`, `localhost-key.pem`
- [ ] Certificate is valid (check with `openssl x509 -in certs/dev/localhost.pem -text -noout`)
- [ ] Browser trusts certificate (no warnings on first access)

### Certificate Content Verification

- [ ] Certificate includes `localhost`
- [ ] Certificate includes `127.0.0.1`
- [ ] Certificate includes `10.73.77.58` (server IP)
- [ ] Certificate includes `ufomum-abdula.ufomoviez.com` (domain)
- [ ] Certificate includes `myapp.local` (if generated)
- [ ] Private key is secure (not world-readable)

---

## 🚀 Phase 2: Service Startup Testing

### Docker Compose Startup

- [ ] Run `start-dev-https.ps1` successfully
- [ ] All containers start: `docker-compose ps`
- [ ] Nginx container is running
- [ ] Backend container is running
- [ ] Frontend container is running
- [ ] Database container is running
- [ ] Redis container is running

### Health Checks

- [ ] Nginx health check passes: `docker-compose exec nginx wget -q -O- http://localhost/health`
- [ ] Backend health check: `curl -k https://localhost/api/health`
- [ ] All services show as "healthy" in `docker-compose ps`

### Logs Verification

- [ ] No errors in nginx logs: `docker-compose logs nginx`
- [ ] No errors in backend logs: `docker-compose logs backend`
- [ ] No errors in frontend logs: `docker-compose logs frontend`
- [ ] SSL certificate loaded successfully (check nginx logs)

---

## 🌐 Phase 3: HTTPS Access Testing

### Browser Access

- [ ] https://localhost loads frontend
- [ ] https://127.0.0.1 loads frontend
- [ ] https://10.73.77.58 loads frontend (IP access)
- [ ] https://ufomum-abdula.ufomoviez.com loads frontend (domain access)
- [ ] Browser shows "Secure" (green lock icon)
- [ ] No "Not Secure" warnings
- [ ] No certificate errors
- [ ] Page loads completely (no mixed content)

### HTTP Redirect

- [ ] http://localhost redirects to https://localhost
- [ ] Redirect is 301 (permanent)
- [ ] No redirect loops

### API Endpoints

- [ ] https://localhost/api/health returns 200
- [ ] https://127.0.0.1/api/health returns 200
- [ ] https://10.73.77.58/api/health returns 200
- [ ] https://ufomum-abdula.ufomoviez.com/api/health returns 200
- [ ] https://localhost/api returns expected response
- [ ] API responses use HTTPS
- [ ] No CORS errors in browser console

### Network Tab Verification

- [ ] All requests use HTTPS (check browser DevTools Network tab)
- [ ] No mixed content warnings
- [ ] All resources load over HTTPS
- [ ] WebSocket connections use `wss://`

---

## 🔐 Phase 4: Authentication & API Testing

### Login Flow

- [ ] Login page loads: https://localhost/login
- [ ] Can submit login form
- [ ] Login API call uses HTTPS
- [ ] Authentication token received
- [ ] Redirected to dashboard after login
- [ ] Token stored in localStorage

### API Calls

- [ ] All API calls use HTTPS
- [ ] Authorization header included in requests
- [ ] API responses are correct
- [ ] Error handling works (401, 403, 500)
- [ ] No CORS errors

### Protected Routes

- [ ] Can access protected pages
- [ ] Unauthorized access redirects to login
- [ ] Session persists across page refreshes

---

## 🖥️ Phase 5: WebSocket (VNC) Testing

### Remote Session Creation

- [ ] Can create remote session
- [ ] Session created successfully
- [ ] WebSocket URL uses `wss://` (not `ws://`)
- [ ] WebSocket URL format: `wss://localhost/websockify?token=...&session=...`

### VNC Connection

- [ ] WebSocket connection establishes
- [ ] No connection errors in console
- [ ] VNC canvas displays
- [ ] Remote desktop visible
- [ ] Connection status shows "Connected"

### VNC Functionality

- [ ] Can interact with remote desktop (mouse, keyboard)
- [ ] Screen updates correctly
- [ ] Connection stays alive (test for 5+ minutes)
- [ ] Can disconnect cleanly
- [ ] Reconnection works

### WebSocket Through Nginx

- [ ] WebSocket upgrade successful (check nginx logs)
- [ ] No timeout errors
- [ ] Long-lived connection works (24 hour timeout)
- [ ] Multiple concurrent connections work

---

## 🌍 Phase 6: LAN Access Testing

### From Another Device

- [ ] Access https://YOUR_IP from another device
- [ ] Certificate trusted (or warning acceptable for testing)
- [ ] Frontend loads correctly
- [ ] API calls work
- [ ] Login works
- [ ] VNC connections work

### Certificate Trust

- [ ] mkcert CA installed on remote device
- [ ] Certificate trusted (no warnings)
- [ ] Or warning is acceptable for development

### Network Configuration

- [ ] Firewall allows port 443
- [ ] Router forwards port 443 (if needed)
- [ ] Can access from mobile device
- [ ] Can access from another PC

---

## 🔒 Phase 7: Security Testing

### TLS Configuration

- [ ] Only TLS 1.2+ allowed (test with `openssl s_client`)
- [ ] Strong ciphers only
- [ ] No weak protocols (SSL 2.0, 3.0, TLS 1.0, 1.1)

### Security Headers

- [ ] HSTS header present: `Strict-Transport-Security`
- [ ] X-Frame-Options header present
- [ ] X-Content-Type-Options header present
- [ ] Content-Security-Policy header present
- [ ] Referrer-Policy header present

### SSL Labs Test (Production)

- [ ] Run SSL Labs test: https://www.ssllabs.com/ssltest/
- [ ] Rating is A or A+
- [ ] No critical issues
- [ ] Certificate chain complete
- [ ] OCSP stapling enabled (production)

### Rate Limiting

- [ ] API rate limiting works (test with multiple rapid requests)
- [ ] WebSocket rate limiting works
- [ ] Appropriate error messages for rate limits

---

## 🧪 Phase 8: Regression Testing

### Existing Features

- [ ] User authentication works
- [ ] User registration works (if applicable)
- [ ] Dashboard loads correctly
- [ ] Agent management works
- [ ] Agent list displays
- [ ] Agent details view works
- [ ] Remote desktop works (tested above)
- [ ] File transfer works (if applicable)
- [ ] Command execution works (if applicable)
- [ ] Reports generate correctly
- [ ] Settings page works
- [ ] Logout works

### Browser Compatibility

- [ ] Chrome: All features work
- [ ] Firefox: All features work
- [ ] Edge: All features work
- [ ] Safari: All features work (if applicable)

### Mobile Testing

- [ ] Mobile browser access works
- [ ] Responsive design works
- [ ] Touch interactions work
- [ ] Mobile VNC works (if applicable)

---

## 📊 Phase 9: Performance Testing

### Load Times

- [ ] Initial page load < 3 seconds
- [ ] API responses < 500ms
- [ ] WebSocket connection < 2 seconds
- [ ] No performance degradation vs HTTP

### Resource Usage

- [ ] CPU usage acceptable
- [ ] Memory usage acceptable
- [ ] Network usage acceptable
- [ ] No memory leaks

---

## 🐛 Phase 10: Error Handling Testing

### Certificate Errors

- [ ] Handles expired certificates gracefully
- [ ] Handles invalid certificates gracefully
- [ ] Error messages are user-friendly

### Connection Errors

- [ ] Handles network errors gracefully
- [ ] Handles timeout errors gracefully
- [ ] Handles WebSocket errors gracefully
- [ ] Error recovery works

### API Errors

- [ ] 401 errors handled (redirect to login)
- [ ] 403 errors handled (show message)
- [ ] 500 errors handled (show message)
- [ ] Network errors handled

---

## 📝 Phase 11: Documentation Testing

### Setup Instructions

- [ ] Follow `README_SSL.md` setup steps
- [ ] All commands work as documented
- [ ] All examples are correct
- [ ] Troubleshooting section helpful

### Agent Installation

- [ ] Follow `CLIENT_AGENT_INSTALLATION_STEPS.md`
- [ ] HTTPS URLs work for agents
- [ ] Installation successful
- [ ] Agent connects to server

---

## 🔄 Phase 12: Production Readiness (Production Only)

### Let's Encrypt Certificate

- [ ] Certificate obtained successfully
- [ ] Certificate valid for domain
- [ ] Certificate chain complete
- [ ] Certificate expires in 90 days (check)

### Production Deployment

- [ ] Production compose starts successfully
- [ ] All services healthy
- [ ] HTTPS works on production domain
- [ ] SSL Labs test passes (A or A+)

### Auto-Renewal

- [ ] Renewal script works
- [ ] Cron job configured
- [ ] Renewal doesn't break service
- [ ] Monitoring alerts configured

---

## ✅ Final Verification

### Complete System Test

- [ ] Full user workflow works (login → dashboard → remote desktop → logout)
- [ ] All features work as before HTTPS
- [ ] No regressions introduced
- [ ] Performance acceptable
- [ ] Security improved

### Sign-Off

- [ ] All critical tests passed
- [ ] No blocking issues
- [ ] Ready for production (if applicable)
- [ ] Documentation complete

---

## 📞 Issues Found

Document any issues found during testing:

1. **Issue**: 
   - **Severity**: [Critical/High/Medium/Low]
   - **Status**: [Open/Fixed/Deferred]
   - **Notes**: 

2. **Issue**: 
   - **Severity**: [Critical/High/Medium/Low]
   - **Status**: [Open/Fixed/Deferred]
   - **Notes**: 

---

## 📊 Test Results Summary

- **Total Tests**: 
- **Passed**: 
- **Failed**: 
- **Blocked**: 
- **Pass Rate**: %

**Overall Status**: [✅ Pass / ⚠️ Pass with Issues / ❌ Fail]

**Ready for Production**: [ ] Yes [ ] No

**Notes**: 

---

**Test Date**: _______________
**Tester**: _______________
**Environment**: [Development / Staging / Production]

