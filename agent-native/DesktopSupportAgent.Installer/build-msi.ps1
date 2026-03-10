# Build MSI Installer Script for Desktop Support Agent
# Requires: WiX Toolset v3.11+ installed

param(
    [string]$Configuration = "Release",
    [string]$OutputPath = ".\bin\$Configuration"
)

Write-Host "Building Desktop Support Agent MSI Installer..." -ForegroundColor Green

# Check if WiX is installed
$wixPath = Get-Command "candle.exe" -ErrorAction SilentlyContinue
if (-not $wixPath) {
    Write-Host "ERROR: WiX Toolset not found!" -ForegroundColor Red
    Write-Host "Please install WiX Toolset from: https://wixtoolset.org/releases/" -ForegroundColor Yellow
    exit 1
}

# Build the service project first
Write-Host "Building service project..." -ForegroundColor Cyan
$servicePath = "..\DesktopSupportAgent.Service"
Push-Location $servicePath

dotnet build -c $Configuration
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Service build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

dotnet publish -c $Configuration -o "publish"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Service publish failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# Create output directory
New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null

# Compile WiX source
Write-Host "Compiling WiX source..." -ForegroundColor Cyan
$wixSource = "Product.wxs"
$wixObj = "$OutputPath\Product.wixobj"

& candle.exe -out $wixObj $wixSource
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: WiX compilation failed!" -ForegroundColor Red
    exit 1
}

# Link WiX object
Write-Host "Linking MSI..." -ForegroundColor Cyan
$msiPath = "$OutputPath\DesktopSupportAgent.msi"

& light.exe -out $msiPath $wixObj
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: MSI linking failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nMSI Installer built successfully!" -ForegroundColor Green
Write-Host "Output: $msiPath" -ForegroundColor Cyan
Write-Host "`nTo install silently:" -ForegroundColor Yellow
Write-Host "  msiexec /i `"$msiPath`" /quiet /norestart" -ForegroundColor White

