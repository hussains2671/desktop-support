# PowerShell Script to Generate Development SSL Certificates using mkcert
param(
    [string]$Domain = "localhost",
    [string[]]$AdditionalDomains = @("myapp.local", "127.0.0.1", "10.73.77.58", "ufomum-abdula.ufomoviez.com")
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Development SSL Certificate Generator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if mkcert is installed
Write-Host "Checking for mkcert installation..." -ForegroundColor Yellow
$mkcertPath = Get-Command mkcert -ErrorAction SilentlyContinue

if (-not $mkcertPath) {
    Write-Host "ERROR: mkcert is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install mkcert first:" -ForegroundColor Yellow
    Write-Host "  Windows (Chocolatey): choco install mkcert" -ForegroundColor White
    Write-Host "  Windows (Scoop): scoop install mkcert" -ForegroundColor White
    Write-Host "  Windows (Manual): Download from https://github.com/FiloSottile/mkcert/releases" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation, run: mkcert -install" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] mkcert found at: $($mkcertPath.Source)" -ForegroundColor Green
Write-Host ""

# Check if local CA is installed
Write-Host "Checking if local CA is installed..." -ForegroundColor Yellow
$caInstalled = $false
$ErrorActionPreference = 'SilentlyContinue'
$caResult = mkcert -CAROOT 2>&1
$ErrorActionPreference = 'Continue'

if ($LASTEXITCODE -eq 0) {
    if ($caResult) {
        $caInstalled = $true
        Write-Host "Local CA is installed" -ForegroundColor Green
        Write-Host "  CA Root: $caResult" -ForegroundColor Gray
    }
}

if (-not $caInstalled) {
    Write-Host "Local CA might not be installed" -ForegroundColor Yellow
}

if (-not $caInstalled) {
    Write-Host ""
    Write-Host "Installing local CA..." -ForegroundColor Yellow
    mkcert -install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install local CA" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Local CA installed successfully" -ForegroundColor Green
}

Write-Host ""

# Create certs directory structure
$certsDir = Join-Path $PSScriptRoot "..\certs\dev"
$certsDir = Resolve-Path $certsDir -ErrorAction SilentlyContinue
if (-not $certsDir) {
    $certsDir = Join-Path (Split-Path $PSScriptRoot -Parent) "certs\dev"
    New-Item -ItemType Directory -Path $certsDir -Force | Out-Null
}
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir -Force | Out-Null
    Write-Host "[OK] Created directory: $certsDir" -ForegroundColor Green
}

# Generate certificate for localhost
Write-Host "Generating SSL certificate for: $Domain" -ForegroundColor Yellow
$domains = @($Domain) + $AdditionalDomains

$certPath = Join-Path $certsDir "$Domain.pem"
$keyPath = Join-Path $certsDir "$Domain-key.pem"

# Remove old certificates if they exist
if (Test-Path $certPath) {
    Remove-Item $certPath -Force
    Write-Host "  Removed old certificate" -ForegroundColor Gray
}
if (Test-Path $keyPath) {
    Remove-Item $keyPath -Force
    Write-Host "  Removed old key" -ForegroundColor Gray
}

# Generate certificate
Push-Location $certsDir
& mkcert -cert-file "$Domain.pem" -key-file "$Domain-key.pem" $domains

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Certificate generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Certificate files:" -ForegroundColor Cyan
    Write-Host "  Certificate: $certPath" -ForegroundColor White
    Write-Host "  Private Key: $keyPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Domains covered:" -ForegroundColor Cyan
    foreach ($d in $domains) {
        Write-Host "  - $d" -ForegroundColor White
    }
} else {
    Write-Host "ERROR: Failed to generate certificate" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Generate certificate for custom domain (myapp.local)
if ($AdditionalDomains -contains "myapp.local") {
    Write-Host ""
    Write-Host "Generating SSL certificate for: myapp.local" -ForegroundColor Yellow
    $customCertPath = Join-Path $certsDir "myapp.local.pem"
    $customKeyPath = Join-Path $certsDir "myapp.local-key.pem"
    
    if (Test-Path $customCertPath) {
        Remove-Item $customCertPath -Force
    }
    if (Test-Path $customKeyPath) {
        Remove-Item $customKeyPath -Force
    }
    
    Push-Location $certsDir
    mkcert -cert-file "myapp.local.pem" -key-file "myapp.local-key.pem" "myapp.local" "*.local"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Custom domain certificate generated!" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Failed to generate custom domain certificate" -ForegroundColor Yellow
    }
    Pop-Location
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Certificate generation complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update your hosts file (optional for myapp.local):" -ForegroundColor White
Write-Host "   Add: 127.0.0.1 myapp.local" -ForegroundColor Gray
Write-Host "2. Start the application with HTTPS:" -ForegroundColor White
Write-Host "   .\scripts\start-dev-https.ps1" -ForegroundColor Gray
Write-Host "3. Access the app at: https://localhost" -ForegroundColor White
Write-Host ""

