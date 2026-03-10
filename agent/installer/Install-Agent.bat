@echo off
REM Desktop Support Agent - Easy Installer
REM Run this as Administrator

echo ========================================
echo Desktop Support Agent Installer
echo ========================================
echo.
echo SECURITY NOTICE:
echo - Use HTTPS URLs in production (not HTTP)
echo - Scripts should be signed for secure deployment
echo - ExecutionPolicy Bypass is NOT used by default
echo.

set /p API_URL="Enter API Base URL (e.g., https://yourdomain.com:3000/api): "
set /p COMPANY_CODE="Enter Company Code (16-digit): "

echo.
echo Installing agent...
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%Install-Agent.ps1"

REM Check if PowerShell script exists
if not exist "%PS_SCRIPT%" (
    echo ERROR: PowerShell script not found!
    echo Expected location: %PS_SCRIPT%
    echo.
    echo Please ensure Install-Agent.ps1 is in the same directory as this batch file.
    echo.
    pause
    exit /b 1
)

echo Using PowerShell script: %PS_SCRIPT%
echo.

REM Check if URL is HTTP (warn user)
echo %API_URL% | findstr /i "http://" >nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo WARNING: HTTP detected!
    echo ========================================
    echo.
    echo HTTP is insecure. Use HTTPS in production.
    echo To proceed with HTTP (dev/test only), the installer will prompt you.
    echo.
    pause
)

REM Execute PowerShell script WITHOUT ExecutionPolicy Bypass
REM If execution fails, user should sign scripts or adjust execution policy
powershell.exe -NoProfile -NoExit -File "%PS_SCRIPT%" -ApiBaseUrl "%API_URL%" -CompanyCode "%COMPANY_CODE%"

set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% EQU 0 (
    echo.
    echo ========================================
    echo Installation completed successfully!
    echo ========================================
    echo.
    pause
) else (
    echo.
    echo ========================================
    echo Installation failed with error code: %EXIT_CODE%
    echo ========================================
    echo.
    echo Please check the PowerShell window above for detailed error messages.
    echo.
    pause
    exit /b %EXIT_CODE%
)

