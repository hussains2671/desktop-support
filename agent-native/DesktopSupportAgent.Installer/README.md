# Desktop Support Agent - MSI Installer

## Overview

This is a WiX-based MSI installer for the Desktop Support Agent Windows Service.

## Prerequisites

- WiX Toolset v3.11 or later
- Visual Studio 2019 or later (with WiX extension)
- .NET 6.0 SDK

## Building the Installer

### Option 1: Visual Studio

1. Open `DesktopSupportAgent.Installer.sln` in Visual Studio
2. Build in Release mode
3. MSI file will be generated in `bin\Release\`

### Option 2: Command Line

```bash
# Install WiX Toolset first
# Download from: https://wixtoolset.org/releases/

# Build MSI
msbuild DesktopSupportAgent.Installer.sln /p:Configuration=Release
```

## Installation

The MSI installer will:
- Install the agent service executable
- Create Windows Service
- Set up configuration file
- Register with backend (if Company Code provided)
- Create Start Menu shortcuts
- Add uninstaller

## Silent Installation

```cmd
msiexec /i DesktopSupportAgent.msi /quiet /norestart COMPANY_CODE="YOUR_CODE" API_URL="https://yourdomain.com:3000/api"
```

## Uninstallation

```cmd
msiexec /x DesktopSupportAgent.msi /quiet
```

## Customization

Edit `Product.wxs` to customize:
- Installation directory
- Service name
- Company information
- Features

## Notes

- Requires Administrator privileges
- Service runs as Local System account
- Configuration file location: `C:\Program Files\DesktopSupportAgent\config.json`

