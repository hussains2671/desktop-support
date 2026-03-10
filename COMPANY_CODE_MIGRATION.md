# Company Code Migration Guide

## Overview

The system now uses a **16-digit Company Code** format instead of simple integer IDs. This provides better identification and follows the format:

**Format: STATE (4 digits) + COUNTRY (4 digits) + RANDOM (8 digits)**

**Example: `1234 5678 12345678`**

## What Changed

### 1. Database Schema
- Added `company_code` field (VARCHAR(16), UNIQUE) to `companies` table
- Migration file: `database/migrations/002_add_company_code.sql`

### 2. Backend Changes
- **Company Model**: Added `company_code` field
- **Registration**: Automatically generates unique 16-digit code on company creation
- **Agent Registration**: Now accepts both `company_code` and `company_id` (backward compatible)
- **API Responses**: Include `company_code` in all company-related responses

### 3. Frontend Changes
- **Settings Page**: Displays formatted Company Code prominently
- Shows both Company Code (for agent installation) and Internal ID (for reference)

### 4. Agent Installation
- **Install-Agent.ps1**: Updated to accept `-CompanyCode` parameter
- **Install-Agent.bat**: Updated to prompt for Company Code
- **config.json**: Stores CompanyCode instead of CompanyId

## Migration Steps

### For Existing Databases

1. **Run Migration**:
   ```sql
   -- Run the migration script
   \i database/migrations/002_add_company_code.sql
   ```

   Or via Docker:
   ```bash
   docker-compose exec db psql -U postgres -d desktop_support -f /docker-entrypoint-initdb.d/../migrations/002_add_company_code.sql
   ```

2. **Verify Migration**:
   ```sql
   SELECT id, name, company_code FROM companies;
   ```

### For New Installations

No migration needed! New companies will automatically get a 16-digit code.

## Usage

### Agent Installation

**New Method (Recommended)**:
```powershell
.\Install-Agent.ps1 -ApiBaseUrl "http://localhost:3000/api" -CompanyCode "1234567812345678"
```

**Old Method (Still Supported)**:
```powershell
.\Install-Agent.ps1 -ApiBaseUrl "http://localhost:3000/api" -CompanyId "1"
```

### Finding Your Company Code

1. **Settings Page**: 
   - Login to dashboard
   - Go to Settings
   - Company Code is displayed prominently with copy button

2. **Browser Console**:
   ```javascript
   JSON.parse(localStorage.getItem('auth-storage')).company.company_code
   ```

3. **API**:
   ```bash
   GET /api/auth/profile
   ```

## Format Details

- **Total Length**: 16 digits
- **State Code**: First 4 digits (randomly generated)
- **Country Code**: Next 4 digits (randomly generated)
- **Random**: Last 8 digits (randomly generated)
- **Uniqueness**: Enforced at database level
- **Display Format**: `XXXX XXXX XXXX XXXX` (spaces for readability)

## Backward Compatibility

- ✅ Agent registration accepts both `company_code` and `company_id`
- ✅ Existing agents with `company_id` will continue to work
- ✅ API responses include both `id` and `company_code`
- ✅ Internal database still uses integer `id` for foreign keys

## Benefits

1. **Better Identification**: 16-digit codes are easier to share and remember
2. **Scalability**: Can support millions of companies
3. **Format Structure**: STATE + COUNTRY + RANDOM provides logical grouping
4. **User-Friendly**: Formatted display (XXXX XXXX XXXX XXXX) is easier to read
5. **Security**: Harder to guess than sequential IDs

## Troubleshooting

### Company Code Not Generated

If a new company doesn't get a code:
1. Check backend logs for errors
2. Verify database migration ran successfully
3. Check if `company_code` column exists: `\d companies`

### Agent Installation Fails

If agent installation fails:
1. Verify Company Code is exactly 16 digits (no spaces)
2. Check API endpoint is accessible
3. Verify company exists: `SELECT * FROM companies WHERE company_code = 'YOUR_CODE'`

### Migration Issues

If migration fails:
1. Check PostgreSQL version (requires 9.5+)
2. Verify you have write permissions
3. Check for existing `company_code` column conflicts

## API Changes

### Registration Response
```json
{
  "success": true,
  "data": {
    "company": {
      "id": 1,
      "name": "My Company",
      "company_code": "1234567812345678"
    }
  }
}
```

### Agent Registration
```json
// Request (new)
{
  "device_id": "...",
  "company_code": "1234567812345678"
}

// Request (old - still works)
{
  "device_id": "...",
  "company_id": 1
}
```

## Next Steps

1. ✅ Run migration for existing databases
2. ✅ Update agent installation scripts on client machines
3. ✅ Inform users about new Company Code format
4. ✅ Update documentation with Company Code examples

---

**Note**: The internal integer `id` is still used for database relationships. The `company_code` is for external identification and agent installation.

