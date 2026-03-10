# ============================================
# View Docker Logs
# ============================================

param(
    [string]$Service = ""
)

if ($Service) {
    Write-Host "Viewing logs for: $Service" -ForegroundColor Cyan
    docker-compose logs -f $Service
} else {
    Write-Host "Viewing all logs (Ctrl+C to exit)" -ForegroundColor Cyan
    docker-compose logs -f
}

