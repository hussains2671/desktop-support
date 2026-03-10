# Security Features Guide - Phase 6

This guide explains all security features implemented in Phase 6 and how to use them.

---

## 🔐 Password Complexity Requirements

### Requirements
Passwords must meet all of the following criteria:
- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ At least one special character (!@#$%^&*()_+-=[]{}|;':",./<>?)

### Where Applied
- User registration (`/api/auth/register`)
- Password change (`/api/auth/password`)
- Admin password reset (`/api/admin/users/:id/reset-password`)

### Example Valid Passwords
- `SecurePass123!`
- `MyP@ssw0rd`
- `Test123!@#`
- `Complex#Pass1`

### Example Invalid Passwords
- `password` (no uppercase, number, or special char)
- `PASSWORD123` (no lowercase or special char)
- `Password` (no number or special char)
- `Pass123` (too short, no special char)

### Frontend Validation
You can validate passwords on the frontend before submission:

```javascript
import passwordValidator from './utils/passwordValidator';

const validation = passwordValidator.validate(password);
if (!validation.isValid) {
  // Show errors: validation.errors
  console.log(validation.errors);
}
```

---

## 🔒 Account Lockout

### How It Works
- After **5 failed login attempts**, the account is automatically locked
- Lock duration: **30 minutes**
- Lock automatically expires after 30 minutes
- Failed attempts reset on successful login

### User Experience
1. User attempts login with wrong password
2. Failed attempt counter increments
3. After 5 failed attempts, account is locked
4. User receives message: "Account is locked. Please try again in X minutes."
5. After 30 minutes, account automatically unlocks

### Admin Actions
Admins can manually unlock accounts by resetting the lock:

```sql
-- Unlock a user account
UPDATE users 
SET 
    failed_login_attempts = 0,
    locked_until = NULL
WHERE email = 'user@example.com';
```

### Monitoring
Check locked accounts:

```sql
-- View locked accounts
SELECT 
    id,
    email,
    failed_login_attempts,
    locked_until,
    EXTRACT(EPOCH FROM (locked_until - NOW()))/60 as minutes_remaining
FROM users
WHERE locked_until > NOW();
```

---

## 🔑 Token Refresh Mechanism

### Overview
- **Access Token:** Short-lived (7 days), used for API requests
- **Refresh Token:** Long-lived (30 days), used to get new access tokens

### How It Works
1. User logs in → receives both access token and refresh token
2. Access token expires → use refresh token to get new access token
3. Refresh token expires → user must login again

### Token Lifecycle

```
Login
  ↓
[Access Token (7 days)] + [Refresh Token (30 days)]
  ↓
Access Token Expires
  ↓
Use Refresh Token → Get New Access Token
  ↓
Refresh Token Expires (30 days)
  ↓
Must Login Again
```

### When Tokens Are Invalidated
- User logs out
- User changes password
- Refresh token expires (30 days)
- User account is deactivated

### Best Practices
1. **Store tokens securely:**
   - Use `httpOnly` cookies (recommended) or `localStorage`
   - Never expose tokens in URLs or logs

2. **Refresh before expiry:**
   - Check token expiry before making requests
   - Refresh proactively (e.g., when < 1 day remaining)

3. **Handle refresh failures:**
   - If refresh fails, redirect to login
   - Clear all stored tokens

### Frontend Implementation

```javascript
// Check if token is about to expire
function isTokenExpiringSoon(token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  const expiry = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  return (expiry - now) < oneDay;
}

// Refresh token if needed
async function ensureValidToken() {
  let token = localStorage.getItem('accessToken');
  
  if (!token || isTokenExpiringSoon(token)) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      token = await refreshAccessToken(refreshToken);
    } else {
      // No refresh token, redirect to login
      window.location.href = '/login';
    }
  }
  
  return token;
}
```

---

## 🛡️ Rate Limiting

### Limits

#### General API Endpoints
- **Limit:** 100 requests per 15 minutes per IP
- **Applies to:** All `/api/*` endpoints (except auth)

#### Authentication Endpoints
- **Limit:** 5 requests per 15 minutes per IP
- **Applies to:** `/api/auth/login`, `/api/auth/register`
- **Behavior:** Only counts failed requests (successful logins don't count)

### Rate Limit Headers
Responses include rate limit information:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1636543200
```

### Handling Rate Limits
When rate limit is exceeded:
1. User receives 429 status code
2. Message: "Too many requests from this IP, please try again later."
3. Wait until reset time before retrying

### Frontend Handling

```javascript
async function makeRequest(url, options) {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const waitTime = resetTime * 1000 - Date.now();
      
      // Show user-friendly message
      showError(`Too many requests. Please wait ${Math.ceil(waitTime/1000)} seconds.`);
      
      // Optionally retry after wait time
      setTimeout(() => makeRequest(url, options), waitTime);
    }
    
    return response;
  } catch (error) {
    // Handle error
  }
}
```

---

## 🧹 Input Sanitization

### What Gets Sanitized
All user inputs are automatically sanitized:
- Request body
- Query parameters
- URL parameters

### What Gets Removed
- HTML tags: `<script>`, `<img>`, etc.
- JavaScript event handlers: `onclick`, `onerror`, etc.
- Dangerous protocols: `javascript:`, `data:`, etc.
- XSS attack vectors

### Example

**Input:**
```json
{
  "name": "<script>alert('XSS')</script>John",
  "email": "user@example.com"
}
```

**After Sanitization:**
```json
{
  "name": "John",
  "email": "user@example.com"
}
```

### What's Safe
- Plain text
- Numbers
- Valid email addresses
- Valid URLs (without dangerous protocols)

---

## 📝 Audit Logging

### What Gets Logged
All security-relevant events are logged to the `audit_logs` table:

1. **Authentication Events:**
   - Login success
   - Login failure
   - Logout
   - Registration
   - Token refresh

2. **Security Events:**
   - Account lockout
   - Password change
   - Failed login attempts

3. **User Management Events:**
   - User creation
   - User update
   - User deletion
   - User activation/deactivation

### Audit Log Fields
- `user_id` - User who performed the action
- `company_id` - Company context
- `action` - Action type (e.g., "auth.login_success")
- `entity_type` - Entity type (e.g., "user")
- `entity_id` - Entity ID
- `ip_address` - Client IP address
- `user_agent` - Browser/client information
- `old_values` - Previous values (JSONB)
- `new_values` - New values (JSONB)
- `created_at` - Timestamp

### Querying Audit Logs

```sql
-- View recent security events
SELECT 
    action,
    user_id,
    ip_address,
    created_at
FROM audit_logs
WHERE action LIKE 'security.%'
ORDER BY created_at DESC
LIMIT 100;

-- View failed login attempts
SELECT 
    action,
    new_values->>'email' as email,
    ip_address,
    created_at
FROM audit_logs
WHERE action = 'security.login_failed'
ORDER BY created_at DESC;

-- View account lockouts
SELECT 
    action,
    user_id,
    new_values->>'email' as email,
    new_values->>'failedAttempts' as attempts,
    created_at
FROM audit_logs
WHERE action = 'security.account_locked'
ORDER BY created_at DESC;
```

### Monitoring Recommendations
1. **Set up alerts** for:
   - Multiple failed login attempts from same IP
   - Account lockouts
   - Unusual authentication patterns

2. **Regular reviews:**
   - Review audit logs weekly
   - Check for suspicious activity
   - Monitor failed login patterns

---

## 🔍 Security Best Practices

### For Users
1. **Use strong passwords:**
   - Follow complexity requirements
   - Don't reuse passwords
   - Change passwords regularly

2. **Protect your account:**
   - Don't share credentials
   - Logout when done
   - Report suspicious activity

### For Administrators
1. **Monitor security events:**
   - Review audit logs regularly
   - Check for locked accounts
   - Monitor failed login attempts

2. **User management:**
   - Deactivate unused accounts
   - Reset passwords when needed
   - Unlock accounts when appropriate

3. **System security:**
   - Keep system updated
   - Use strong database passwords
   - Enable HTTPS in production
   - Regular security audits

### For Developers
1. **Token handling:**
   - Store tokens securely
   - Never log tokens
   - Implement proper refresh logic

2. **Input validation:**
   - Always validate on server
   - Sanitize all inputs
   - Use parameterized queries

3. **Error handling:**
   - Don't expose sensitive info in errors
   - Log security events
   - Monitor for anomalies

---

## 🚨 Security Incident Response

### If Account is Locked
1. Wait 30 minutes for automatic unlock
2. Or contact administrator for manual unlock
3. Verify account security after unlock

### If Suspicious Activity Detected
1. Change password immediately
2. Review recent activity in audit logs
3. Contact administrator
4. Consider deactivating account temporarily

### If Token is Compromised
1. Logout immediately (invalidates refresh token)
2. Change password (invalidates all tokens)
3. Review audit logs for unauthorized access
4. Report incident to administrator

---

**Last Updated:** 2025-11-11  
**Phase:** Phase 6 - Security & Performance Enhancements

