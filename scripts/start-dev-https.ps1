# PowerShell Script to Start Development Environment with HTTPS
# This script starts docker-compose with HTTPS enabled

param(
    [switch]$SkipCertCheck = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Development Environment (HTTPS)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if certificates exist
$certsDir = Join-Path $PSScriptRoot "..\certs\dev"
$certPath = Join-Path $certsDir "localhost.pem"
$keyPath = Join-Path $certsDir "localhost-key.pem"

if (-not $SkipCertCheck) {
    if (-not (Test-Path $certPath) -or -not (Test-Path $keyPath)) {
        Write-Host "[WARNING] SSL certificates not found!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Generating certificates..." -ForegroundColor Yellow
        & "$PSScriptRoot\generate-dev-cert.ps1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to generate certificates" -ForegroundColor Red
            exit 1
        }
        Write-Host ""
    } else {
        Write-Host "[OK] SSL certificates found" -ForegroundColor Green
    }
} else {
    Write-Host "[WARNING] Skipping certificate check" -ForegroundColor Yellow
}

# Check if docker-compose is available
Write-Host ""
Write-Host "Checking Docker..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: docker-compose is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Docker and docker-compose found" -ForegroundColor Green

# Set environment variable for HTTPS mode
$env:ENVIRONMENT = "dev"
$env:USE_HTTPS = "true"

Write-Host ""
Write-Host "Starting services with HTTPS..." -ForegroundColor Yellow
Write-Host ""

# Change to project root
$projectRoot = Join-Path $PSScriptRoot ".."
Set-Location $projectRoot

# Start docker-compose with HTTPS configuration
docker-compose -f docker-compose.yml -f docker-compose.https.yml up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Services started successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access your application:" -ForegroundColor Cyan
    Write-Host "  Frontend: https://localhost" -ForegroundColor White
    Write-Host "  API:      https://localhost/api" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: You may see a browser warning about the certificate." -ForegroundColor Yellow
    Write-Host "This is normal for development certificates. Click 'Advanced' and 'Proceed'." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To view logs:" -ForegroundColor Cyan
    Write-Host "  docker-compose logs -f" -ForegroundColor White
    Write-Host ""
    Write-Host "To stop services:" -ForegroundColor Cyan
    Write-Host "  docker-compose down" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to start services" -ForegroundColor Red
    Write-Host "Check the logs: docker-compose logs" -ForegroundColor Yellow
    exit 1
}

