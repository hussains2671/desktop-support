# Phase 6 Security Features Test Script

Write-Host "=== Phase 6 Security Features Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Password Validation (Weak Password)
Write-Host "Test 1: Password Validation (Weak Password)" -ForegroundColor Yellow
$body = @{
    email = "test_weak@example.com"
    password = "weak"
    first_name = "Test"
    last_name = "User"
    company_name = "Test Company"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "  FAILED: Weak password was accepted!" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  PASSED: Weak password rejected - $($errorResponse.message)" -ForegroundColor Green
}
Write-Host ""

# Test 2: Password Validation (Strong Password)
Write-Host "Test 2: Password Validation (Strong Password)" -ForegroundColor Yellow
$body = @{
    email = "test_strong@example.com"
    password = "StrongPass123!@#"
    first_name = "Test"
    last_name = "User"
    company_name = "Test Company"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "  PASSED: Strong password accepted" -ForegroundColor Green
    $testEmail = "test_strong@example.com"
    $testPassword = "StrongPass123!@#"
} catch {
    Write-Host "  FAILED: Strong password rejected - $($_.Exception.Message)" -ForegroundColor Red
    exit
}
Write-Host ""

# Test 3: Login with Refresh Token
Write-Host "Test 3: Login with Refresh Token" -ForegroundColor Yellow
$body = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    if ($response.data.refreshToken) {
        Write-Host "  PASSED: Refresh token generated" -ForegroundColor Green
        $refreshToken = $response.data.refreshToken
        $accessToken = $response.data.token
    } else {
        Write-Host "  FAILED: No refresh token in response" -ForegroundColor Red
    }
} catch {
    Write-Host "  FAILED: Login failed - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Account Lockout (5 failed attempts)
Write-Host "Test 4: Account Lockout (5 failed attempts)" -ForegroundColor Yellow
$wrongBody = @{
    email = $testEmail
    password = "wrongpassword"
} | ConvertTo-Json

$locked = $false
for ($i = 1; $i -le 6; $i++) {
    Write-Host "  Attempt $i..." -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $wrongBody -ContentType "application/json" -ErrorAction Stop
        Write-Host " (unexpected success)" -ForegroundColor Red
    } catch {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($errorResponse.message -like "*locked*") {
            Write-Host " (LOCKED after $i attempts)" -ForegroundColor Green
            $locked = $true
            break
        } else {
            Write-Host " (failed)" -ForegroundColor Gray
        }
    }
    Start-Sleep -Milliseconds 500
}

if ($locked) {
    Write-Host "  PASSED: Account locked after 5 failed attempts" -ForegroundColor Green
} else {
    Write-Host "  FAILED: Account not locked after 5 attempts" -ForegroundColor Red
}
Write-Host ""

# Test 5: Refresh Token Endpoint
Write-Host "Test 5: Refresh Token Endpoint" -ForegroundColor Yellow
if ($refreshToken) {
    $refreshBody = @{
        refreshToken = $refreshToken
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/refresh" -Method Post -Body $refreshBody -ContentType "application/json"
        if ($response.data.token) {
            Write-Host "  PASSED: Token refreshed successfully" -ForegroundColor Green
        } else {
            Write-Host "  FAILED: No token in refresh response" -ForegroundColor Red
        }
    } catch {
        Write-Host "  FAILED: Refresh failed - $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  SKIPPED: No refresh token available" -ForegroundColor Yellow
}
Write-Host ""

# Test 6: Logout
Write-Host "Test 6: Logout" -ForegroundColor Yellow
if ($accessToken) {
    $headers = @{
        "Authorization" = "Bearer $accessToken"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/logout" -Method Post -Headers $headers -ContentType "application/json"
        Write-Host "  PASSED: Logout successful" -ForegroundColor Green
    } catch {
        Write-Host "  FAILED: Logout failed - $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  SKIPPED: No access token available" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=== Test Complete ===" -ForegroundColor Cyan

