# ============================================
# Docker Installation Check Script
# ============================================

Write-Host "Checking Docker installation..." -ForegroundColor Cyan
Write-Host ""

# Check Docker
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker installed: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Host "❌ Docker is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor White
    Write-Host "  2. Install Docker Desktop for Windows" -ForegroundColor White
    Write-Host "  3. Restart your computer after installation" -ForegroundColor White
    Write-Host "  4. Run this script again to verify" -ForegroundColor White
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker-compose --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker Compose installed: $composeVersion" -ForegroundColor Green
    } else {
        # Try docker compose (v2)
        $composeV2 = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker Compose (v2) installed: $composeV2" -ForegroundColor Green
        } else {
            throw "Docker Compose not found"
        }
    }
} catch {
    Write-Host "❌ Docker Compose is not installed!" -ForegroundColor Red
    Write-Host "Docker Compose should be included with Docker Desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    docker ps 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker daemon is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker daemon is not running!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Cannot connect to Docker daemon!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ All Docker requirements met!" -ForegroundColor Green
Write-Host "You can now run: docker-compose up -d" -ForegroundColor Cyan

