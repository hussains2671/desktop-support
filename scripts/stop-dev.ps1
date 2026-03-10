# ============================================
# Stop Development Environment
# ============================================

Write-Host "Stopping services..." -ForegroundColor Yellow
docker-compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Services stopped" -ForegroundColor Green
} else {
    Write-Host "❌ Error stopping services" -ForegroundColor Red
}

