# ============================================
# Environment Setup Script
# Desktop Support SaaS System
# ============================================
# This script generates .env file with secure random secrets

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env already exists
if (Test-Path ".env") {
    $overwrite = Read-Host ".env file already exists. Overwrite? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Setup cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "Generating secure secrets..." -ForegroundColor Yellow

# Generate secrets
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider

# JWT Secret (32 bytes)
$jwtBytes = New-Object byte[] 32
$rng.GetBytes($jwtBytes)
$JWT_SECRET = [Convert]::ToBase64String($jwtBytes)

# Database Password (24 bytes)
$dbBytes = New-Object byte[] 24
$rng.GetBytes($dbBytes)
$DB_PASSWORD = [Convert]::ToBase64String($dbBytes)

Write-Host "Secrets generated successfully!" -ForegroundColor Green
Write-Host ""

# Prompt for Gemini API Key
Write-Host "Gemini AI Configuration:" -ForegroundColor Cyan
$GEMINI_API_KEY = Read-Host "Enter Gemini API Key (or press Enter to skip)"
if ([string]::IsNullOrWhiteSpace($GEMINI_API_KEY)) {
    $GEMINI_API_KEY = ""
    Write-Host "Gemini API key not set. AI features will be disabled." -ForegroundColor Yellow
}

# Prompt for Server Configuration
Write-Host ""
Write-Host "Server Configuration:" -ForegroundColor Cyan
$SERVER_DOMAIN = Read-Host "Enter Server Domain/IP (e.g., UFOMUM-AbdulA.ufomoviez.com or 10.73.77.58) [default: UFOMUM-AbdulA.ufomoviez.com]"
if ([string]::IsNullOrWhiteSpace($SERVER_DOMAIN)) {
    $SERVER_DOMAIN = "UFOMUM-AbdulA.ufomoviez.com"
}

# Determine if using HTTP or HTTPS (use HTTP for IPs, HTTPS for domains)
$USE_HTTPS = $false
if ($SERVER_DOMAIN -match '^https?://') {
    $API_BASE_URL = $SERVER_DOMAIN
    $FRONTEND_URL = $SERVER_DOMAIN
} elseif ($SERVER_DOMAIN -match '^\d+\.\d+\.\d+\.\d+$') {
    # IP address - use HTTP
    $API_BASE_URL = "http://$SERVER_DOMAIN:3000"
    $FRONTEND_URL = "http://$SERVER_DOMAIN:3001"
    $VITE_API_BASE_URL = "http://$SERVER_DOMAIN:3000/api"
} else {
    # Domain name - use HTTP (change to HTTPS in production)
    $API_BASE_URL = "http://$SERVER_DOMAIN:3000"
    $FRONTEND_URL = "http://$SERVER_DOMAIN:3001"
    $VITE_API_BASE_URL = "http://$SERVER_DOMAIN:3000/api"
}

Write-Host "API Base URL: $API_BASE_URL" -ForegroundColor Green
Write-Host "Frontend URL: $FRONTEND_URL" -ForegroundColor Green

# Create .env file
$envContent = @"
# ============================================
# Desktop Support SaaS System - Environment Variables
# ============================================
# Generated on: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# SECURITY: Keep this file secure and never commit to version control!
# ============================================

# ============================================
# Database Configuration (PostgreSQL)
# ============================================
DB_HOST=db
DB_PORT=5432
DB_NAME=desktop_support
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
DB_DIALECT=postgres

# Database Connection Pool
DB_POOL_MAX=10
DB_POOL_MIN=2

# Database SSL (Development - false, Production - true)
DB_SSL_REJECT_UNAUTHORIZED=false

# ============================================
# JWT Authentication
# ============================================
JWT_SECRET=$JWT_SECRET
JWT_EXPIRY=7d

# ============================================
# Gemini AI Configuration
# ============================================
GEMINI_API_KEY=$GEMINI_API_KEY

# ============================================
# Application URLs
# ============================================
API_BASE_URL=$API_BASE_URL
FRONTEND_URL=$FRONTEND_URL

# ============================================
# Node Environment
# ============================================
NODE_ENV=development

# ============================================
# Frontend API URL (for Vite)
# ============================================
VITE_API_BASE_URL=$VITE_API_BASE_URL

# ============================================
# Server Information
# ============================================
SERVER_DOMAIN=$SERVER_DOMAIN
# Available IP Addresses: 10.73.77.58, 192.168.86.22, 192.168.86.152
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ".env file created successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Generated Secrets:" -ForegroundColor Cyan
Write-Host "  JWT Secret: $JWT_SECRET" -ForegroundColor Gray
Write-Host "  DB Password: $DB_PASSWORD" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Install Docker Desktop (if not installed)" -ForegroundColor White
Write-Host "  2. Run: docker-compose up -d" -ForegroundColor White
Write-Host "  3. Access frontend at: $FRONTEND_URL" -ForegroundColor White
Write-Host ""
Write-Host "Server Information:" -ForegroundColor Cyan
Write-Host "  Domain: $SERVER_DOMAIN" -ForegroundColor Gray
Write-Host "  Available IPs: 10.73.77.58, 192.168.86.22, 192.168.86.152" -ForegroundColor Gray
Write-Host ""

