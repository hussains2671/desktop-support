# Security Improvements Summary

## Overview

This document summarizes all security improvements implemented to address PowerShell execution policy issues, HTTPS enforcement, and enterprise deployment concerns.

## Changes Implemented

### 1. Install-Agent.ps1 (agent/installer/Install-Agent.ps1)

**Security Enhancements:**
- ✅ Added `-Silent` flag for automated deployments (no user prompts)
- ✅ Added `-ForceBypass` flag (guarded, with security warnings)
- ✅ Added `-AllowInsecureHttp` flag (dev/test only, with warnings)
- ✅ HTTPS enforcement (HTTP blocked by default)
- ✅ Upgrade support with automatic backup (keeps last 3 backups)
- ✅ Conditional ReadKey (skipped in silent mode)
- ✅ ExecutionPolicy Bypass removed from default (conditional with `-ForceBypass`)

**Before:**
```powershell
# Always used ExecutionPolicy Bypass
-Argument "-ExecutionPolicy Bypass -File ..."
```

**After:**
```powershell
# Conditional - only with -ForceBypass flag
if ($ForceBypass) {
    $psArguments = "-ExecutionPolicy Bypass -File ..."
} else {
    $psArguments = "-NoProfile -File ..."  # Recommended
}
```

### 2. Install-Agent.bat (agent/installer/Install-Agent.bat)

**Security Enhancements:**
- ✅ Removed ExecutionPolicy Bypass from default execution
- ✅ Added security warnings about HTTPS and code signing
- ✅ HTTP detection with warning message
- ✅ Uses `-NoProfile` instead of `-ExecutionPolicy Bypass`

**Before:**
```batch
powershell.exe -ExecutionPolicy Bypass -NoExit -File ...
```

**After:**
```batch
powershell.exe -NoProfile -NoExit -File ...
```

### 3. DesktopSupportAgent.ps1 (agent/DesktopSupportAgent.ps1)

**Security Enhancements:**
- ✅ Replaced `Win32_Product` with registry-based software inventory
  - Faster performance
  - No reconfiguration triggers
  - Same data structure
- ✅ Hardened path validation
  - Detects encoded path traversal (`%2E%2E`, `%252E%252E`, etc.)
  - Multiple validation layers
  - Robust normalization with `Path.GetFullPath`
  - Clear error messages

**Before:**
```powershell
Get-CimInstance Win32_Product | ForEach-Object { ... }
```

**After:**
```powershell
# Registry-based enumeration (faster, safer)
$uninstallKeys = @(
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
)
```

### 4. Backend downloadInstaller (backend/src/controllers/agentController.js)

**Security Enhancements:**
- ✅ HTTPS detection from request (prefers HTTPS)
- ✅ Added `-Silent`, `-ForceBypass`, `-AllowInsecureHttp` flags to generated installer
- ✅ HTTPS enforcement in generated installer template
- ✅ Upgrade support with backup in generated installer
- ✅ Conditional ExecutionPolicy Bypass (only with `-ForceBypass`)
- ✅ Removed ExecutionPolicy Bypass from batch file template

**Before:**
```javascript
const apiBaseUrl = `http://${req.get('host')}...`;
// Hardcoded ExecutionPolicy Bypass
-Argument "-ExecutionPolicy Bypass -File ..."
```

**After:**
```javascript
const protocol = req.protocol === 'https' ? 'https' : 'http';
const apiBaseUrl = `${protocol}://${host}`;
// Conditional ExecutionPolicy
if ($ForceBypass) { ... } else { ... }
```

### 5. Documentation Updates

**AGENT_INSTALLATION_GUIDE.md:**
- ✅ Updated all examples to use HTTPS
- ✅ Documented new flags (`-Silent`, `-ForceBypass`, `-AllowInsecureHttp`)
- ✅ Added security warnings and best practices
- ✅ Updated NSSM examples (removed default Bypass)
- ✅ Added code-signing instructions

**CLIENT_AGENT_INSTALLATION_STEPS.md:**
- ✅ Updated all examples to use HTTPS
- ✅ Added security notes about HTTP usage
- ✅ Documented new installation flags

**README.md:**
- ✅ Updated agent description (PowerShell + Native option)
- ✅ Added security improvements section
- ✅ Updated installation examples with HTTPS

**SECURITY_CHECKLIST.md:**
- ✅ Added agent security section with all improvements
- ✅ Documented code-signing requirements
- ✅ Added native agent option for enterprise environments

## Security Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| HTTPS Enforcement | ✅ Implemented | HTTP blocked by default, requires `-AllowInsecureHttp` flag |
| ExecutionPolicy Bypass | ✅ Removed | No longer default, requires `-ForceBypass` flag with warnings |
| Silent Installation | ✅ Implemented | `-Silent` flag for automated deployments |
| Upgrade Support | ✅ Implemented | Automatic backup before upgrade (keeps last 3) |
| Registry Inventory | ✅ Implemented | Replaced Win32_Product with registry enumeration |
| Path Validation | ✅ Hardened | Multi-layer validation, prevents path traversal |
| Code Signing Docs | ✅ Documented | Instructions for signing scripts |
| Native Agent Option | ✅ Designed | C#/.NET Windows Service for enterprise environments |

## Migration Guide

### For Existing Installations

1. **No Action Required**: Existing installations continue to work
2. **Optional Upgrade**: Can upgrade to new installer for security improvements
3. **Backward Compatible**: All changes are backward compatible

### For New Installations

1. **Use HTTPS**: Always use HTTPS URLs in production
   ```powershell
   .\Install-Agent.ps1 -ApiBaseUrl "https://yourdomain.com:3000/api" -CompanyCode "YOUR_CODE"
   ```

2. **Code Signing (Recommended)**: Sign scripts for production
   ```powershell
   Set-AuthenticodeSignature -FilePath "DesktopSupportAgent.ps1" -Certificate (Get-ChildItem -Path Cert:\LocalMachine\My\<thumbprint>)
   ```

3. **Execution Policy**: Set to RemoteSigned or AllSigned
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
   ```

4. **Avoid Bypass**: Don't use `-ForceBypass` unless absolutely necessary

## Enterprise Deployment

### PowerShell Blocked Environments

If PowerShell is blocked or restricted in your enterprise:

1. **Option 1**: Use code-signed scripts with proper execution policy
2. **Option 2**: Deploy native C#/.NET Windows Service
   - See [Native Agent Architecture](NATIVE_AGENT_ARCHITECTURE.md)
   - No PowerShell dependency
   - Works even if PowerShell is completely blocked
   - 100% backend compatible

## Testing Checklist

- [x] HTTPS enforcement works (HTTP blocked without flag)
- [x] ExecutionPolicy Bypass removed from default
- [x] Silent mode works (no user prompts)
- [x] Upgrade creates backup
- [x] Registry inventory works (faster than Win32_Product)
- [x] Path validation prevents traversal attacks
- [x] Backend generates correct installer template
- [x] All documentation updated

## Breaking Changes

**None** - All changes are backward compatible. Existing installations continue to work.

## Next Steps

1. ✅ All security improvements implemented
2. ✅ All documentation updated
3. ⏭️ Consider implementing native C#/.NET agent for enterprise customers
4. ⏭️ Add agent key rotation mechanism
5. ⏭️ Implement certificate-based authentication (mTLS)

## References

- [AGENT_INSTALLATION_GUIDE.md](../AGENT_INSTALLATION_GUIDE.md)
- [CLIENT_AGENT_INSTALLATION_STEPS.md](../CLIENT_AGENT_INSTALLATION_STEPS.md)
- [SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md)
- [Native Agent Architecture](NATIVE_AGENT_ARCHITECTURE.md)

