# API Documentation - Phase 6 Security Enhancements

This document describes the new and updated API endpoints introduced in Phase 6.

---

## Authentication Endpoints

### 1. Register User (Updated)

**Endpoint:** `POST /api/auth/register`

**Changes:**
- Now enforces password complexity requirements
- Logs registration events to audit log

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@#",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Example Company"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "company_admin"
    },
    "company": {
      "id": 1,
      "name": "Example Company",
      "company_code": "1234567890123456"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Password does not meet requirements",
  "errors": [
    "Password must contain at least one uppercase letter",
    "Password must contain at least one number"
  ]
}
```

---

### 2. Login (Updated)

**Endpoint:** `POST /api/auth/login`

**Changes:**
- Implements account lockout after 5 failed attempts
- Generates refresh token
- Enhanced rate limiting (5 requests per 15 minutes)
- Logs login attempts to audit log

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@#"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "company_admin"
    },
    "company": {
      "id": 1,
      "name": "Example Company",
      "company_code": "1234567890123456",
      "plan": "default"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6..."
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**Response (Error - 423 - Account Locked):**
```json
{
  "success": false,
  "message": "Account is locked. Please try again in 30 minutes."
}
```

**Account Lockout:**
- After 5 failed login attempts, account is locked for 30 minutes
- Lock automatically expires after 30 minutes
- Failed attempts reset on successful login

---

### 3. Refresh Token (New)

**Endpoint:** `POST /api/auth/refresh`

**Description:** Refresh an access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid refresh token"
}
```

**Response (Error - 401 - Expired):**
```json
{
  "success": false,
  "message": "Refresh token has expired"
}
```

**Refresh Token Details:**
- Valid for 30 days
- Invalidated on logout or password change
- One refresh token per user (new login invalidates previous)

---

### 4. Logout (New)

**Endpoint:** `POST /api/auth/logout`

**Description:** Logout and invalidate refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Behavior:**
- Invalidates refresh token
- Logs logout event to audit log
- Access token remains valid until expiry (stateless)

---

### 5. Change Password (Updated)

**Endpoint:** `PUT /api/auth/password`

**Changes:**
- Now enforces password complexity requirements
- Invalidates refresh token on password change
- Logs password change to audit log

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "current_password": "OldPass123!@#",
  "new_password": "NewSecurePass123!@#"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Password does not meet requirements",
  "errors": [
    "Password must contain at least one special character"
  ]
}
```

---

## Rate Limiting

### General API Endpoints
- **Limit:** 100 requests per 15 minutes per IP
- **Applies to:** All `/api/*` endpoints

### Authentication Endpoints
- **Limit:** 5 requests per 15 minutes per IP
- **Applies to:** `/api/auth/login`, `/api/auth/register`
- **Behavior:** Skips successful requests (only counts failures)

**Rate Limit Response (429):**
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## Security Features

### Input Sanitization
All request inputs (body, query, params) are automatically sanitized:
- HTML tags removed
- JavaScript event handlers removed
- Dangerous protocols removed (javascript:)
- XSS attack vectors neutralized

### Security Headers
All responses include security headers via Helmet.js:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (in production)

### Audit Logging
All security-relevant events are logged:
- Login attempts (success/failure)
- Logout events
- Registration events
- Password changes
- Account lockouts
- Token refreshes

**Audit Log Fields:**
- User ID
- Company ID
- Action type
- IP address
- User agent
- Timestamp

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Invalid credentials or token |
| 403 | Forbidden - Account inactive or insufficient permissions |
| 423 | Locked - Account is locked due to failed attempts |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Testing Examples

### Test Password Complexity

```bash
# Weak password (should fail)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "weak",
    "first_name": "Test",
    "last_name": "User",
    "company_name": "Test Company"
  }'

# Strong password (should succeed)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "StrongPass123!@#",
    "first_name": "Test",
    "last_name": "User",
    "company_name": "Test Company"
  }'
```

### Test Account Lockout

```bash
# Attempt login 5 times with wrong password
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "user@example.com", "password": "wrong"}'
done

# 6th attempt should return 423 (Account Locked)
```

### Test Token Refresh

```bash
# 1. Login to get tokens
LOGIN_RESPONSE=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!@#"}')

REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.refreshToken')

# 2. Refresh access token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
```

### Test Logout

```bash
# Login first
LOGIN_RESPONSE=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!@#"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

## Frontend Integration

### Storing Tokens
```javascript
// On login
const { token, refreshToken } = response.data;
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', refreshToken);
```

### Using Refresh Token
```javascript
// When access token expires
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  if (response.ok) {
    const { token } = await response.json();
    localStorage.setItem('accessToken', token);
    return token;
  } else {
    // Refresh token expired, redirect to login
    localStorage.clear();
    window.location.href = '/login';
  }
}
```

### Password Validation
```javascript
// Client-side password validation (matches server requirements)
function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters long');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  return errors;
}
```

---

**Last Updated:** 2025-11-11  
**Phase:** Phase 6 - Security & Performance Enhancements

