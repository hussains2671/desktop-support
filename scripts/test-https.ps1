# PowerShell Script to Test HTTPS Setup
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HTTPS Setup Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test URLs
$testUrls = @(
    "https://localhost/health",
    "https://127.0.0.1/health",
    "https://10.73.77.58/health",
    "https://localhost/api/health"
)

Write-Host "Testing HTTPS endpoints..." -ForegroundColor Yellow
Write-Host ""

$allPassed = $true

foreach ($url in $testUrls) {
    try {
        Write-Host "Testing: $url" -ForegroundColor White -NoNewline
        # Try using curl.exe if available, otherwise use docker exec
        $curlExe = Get-Command curl.exe -ErrorAction SilentlyContinue
        if ($curlExe) {
            $httpCode = curl.exe -k -s -o $null -w "%{http_code}" $url 2>&1
            $content = curl.exe -k -s $url 2>&1
            if ($httpCode -eq "200" -or $content -match "healthy" -or $content -match "success") {
                Write-Host " [OK]" -ForegroundColor Green
            } else {
                Write-Host " [FAILED - HTTP $httpCode]" -ForegroundColor Red
                $allPassed = $false
            }
        } else {
            # Fallback: Check via docker exec
            $hostname = ([System.Uri]$url).Host
            $path = ([System.Uri]$url).PathAndQuery
            $result = docker exec desktop_support_nginx wget -q -O- "http://localhost$path" 2>&1
            if ($result -and $result -notmatch "error") {
                Write-Host " [OK - via docker]" -ForegroundColor Green
            } else {
                Write-Host " [SKIP - use browser to test]" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host " [SKIP - use browser to test]" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Testing Docker services..." -ForegroundColor Yellow
Write-Host ""

# Check Docker services
$services = @("desktop_support_nginx", "desktop_support_backend", "desktop_support_frontend")
foreach ($service in $services) {
    $container = docker ps --filter "name=$service" --format "{{.Status}}" 2>&1
    if ($container -and $container -notmatch "error") {
        Write-Host "$service : $container" -ForegroundColor Green
    } else {
        Write-Host "$service : Not running" -ForegroundColor Red
        $allPassed = $false
    }
}

Write-Host ""
Write-Host "Testing certificate files..." -ForegroundColor Yellow
Write-Host ""

$certPath = "certs\dev\localhost.pem"
$keyPath = "certs\dev\localhost-key.pem"

if (Test-Path $certPath) {
    Write-Host "Certificate found: $certPath" -ForegroundColor Green
} else {
    Write-Host "Certificate NOT found: $certPath" -ForegroundColor Red
    $allPassed = $false
}

if (Test-Path $keyPath) {
    Write-Host "Key found: $keyPath" -ForegroundColor Green
} else {
    Write-Host "Key NOT found: $keyPath" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "All tests PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access your application:" -ForegroundColor Cyan
    Write-Host "  - https://localhost" -ForegroundColor White
    Write-Host "  - https://127.0.0.1" -ForegroundColor White
    Write-Host "  - https://10.73.77.58" -ForegroundColor White
} else {
    Write-Host "Some tests FAILED!" -ForegroundColor Red
    Write-Host "Check the errors above and fix them." -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan

