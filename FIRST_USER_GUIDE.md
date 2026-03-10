# First User Registration Guide

## Overview

This guide walks you through creating your first company and user account in the Desktop Support SaaS system.

## Step-by-Step Registration

### Step 1: Access the Application

1. Open your web browser
2. Navigate to: **http://localhost:3001** (development) or your production URL
3. You should see the login page

### Step 2: Register New Account

1. Click **"Sign Up"** or **"Register"** button
2. Fill in the registration form:

   **Company Information:**
   - **Company Name**: Your organization name (e.g., "Acme Corporation")
   - This will create a new company in the system

   **Your Information:**
   - **Full Name**: Your full name
   - **Email**: Your email address (will be used for login)
   - **Password**: Strong password (min 8 characters, recommended 12+)
   - **Confirm Password**: Re-enter password

3. Click **"Sign Up"** or **"Create Account"**

### Step 3: Automatic Setup

Upon successful registration, the system automatically:

1. ✅ Creates a new **Company** record
2. ✅ Assigns **Default Plan** (trial/basic features)
3. ✅ Creates your **User** account
4. ✅ Assigns **Company Admin** role to you
5. ✅ Logs you in automatically

### Step 4: First Login

If not automatically logged in:

1. Go to login page
2. Enter your **Email** and **Password**
3. Click **"Sign In"**

### Step 5: Dashboard Access

After login, you'll see:

- **Dashboard**: Overview of your devices, alerts, and system status
- **Devices**: List of all managed devices
- **Inventory**: Hardware and software inventory
- **Event Logs**: System and application logs
- **AI Insights**: AI-powered recommendations
- **Alerts**: System alerts and notifications
- **Settings**: Company and user settings
- **Admin Panel**: (if you're admin) Manage plans, features, companies

## What You Get by Default

### Default Plan Features

- ✅ Device monitoring (up to 10 devices)
- ✅ Hardware inventory
- ✅ Software inventory
- ✅ Basic event log collection
- ✅ Performance monitoring
- ✅ Basic alerts

### Company Admin Permissions

- ✅ View all company devices
- ✅ Manage company settings
- ✅ Add/remove users
- ✅ View all reports
- ✅ Manage agent installations

## Next Steps After Registration

### 1. Install Agent on Windows Machines

See [AGENT_INSTALLATION_GUIDE.md](AGENT_INSTALLATION_GUIDE.md) for detailed instructions.

Quick install:
```powershell
cd agent\installer
.\Install-Agent.ps1 -ApiBaseUrl "http://localhost:3000/api" -CompanyId "1"
```

Replace `CompanyId` with your actual company ID (shown in dashboard).

### 2. Configure Gemini AI (Optional)

1. Get API key from: https://makersuite.google.com/app/apikey
2. Go to **Settings** > **AI Configuration**
3. Enter your Gemini API key
4. Save

This enables AI-powered log analysis and recommendations.

### 3. Upgrade Plan (If Needed)

If you need more features:

1. Go to **Admin Panel** > **Plans**
2. View available plans (Moderate, Advanced, Custom)
3. Select plan and upgrade
4. Features will be enabled automatically

### 4. Add More Users

1. Go to **Settings** > **Users**
2. Click **"Add User"**
3. Fill in user details
4. Assign role (User, Admin)
5. User will receive email invitation

## Understanding Your Company ID

Your **Company ID** is a unique identifier for your company. You'll need it for:

- Agent installation
- API calls
- Support requests

**Where to find it:**
- Dashboard (top right, company name)
- Settings > Company Information
- URL when viewing company details

## User Roles

### Company Admin
- Full access to company settings
- Can manage users
- Can view all devices and data
- Can upgrade plans

### User
- Can view assigned devices
- Can view reports
- Cannot modify settings
- Limited access

## Troubleshooting

### Registration Fails

1. **Email already exists**: Use a different email or reset password
2. **Weak password**: Use at least 8 characters with mix of letters, numbers, symbols
3. **Network error**: Check backend is running (http://localhost:3000/health)
4. **Validation errors**: Check all required fields are filled correctly

### Can't Login After Registration

1. Verify email and password are correct
2. Check if account is active (contact admin if needed)
3. Try password reset
4. Check backend logs for errors

### Company Not Created

1. Check backend logs for errors
2. Verify database connection
3. Check if company name is unique
4. Contact support with error details

## Security Best Practices

1. ✅ Use strong password (12+ characters, mixed case, numbers, symbols)
2. ✅ Enable 2FA if available
3. ✅ Don't share your login credentials
4. ✅ Log out when done
5. ✅ Keep agent keys secure
6. ✅ Use HTTPS in production

## Getting Help

If you encounter issues:

1. Check application logs
2. Review [SETUP_GUIDE.md](SETUP_GUIDE.md)
3. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) (if exists)
4. Contact support with:
   - Error message
   - Steps to reproduce
   - Browser console errors (F12)
   - Backend logs

## Quick Reference

| Action | URL/Command |
|--------|-------------|
| Login | http://localhost:3001/login |
| Register | http://localhost:3001/register |
| Dashboard | http://localhost:3001/dashboard |
| Settings | http://localhost:3001/settings |
| Admin Panel | http://localhost:3001/admin |
| Backend Health | http://localhost:3000/health |
| API Docs | http://localhost:3000/api/docs (if available) |

---

**Congratulations!** You've successfully set up your Desktop Support SaaS account. 🎉

Now proceed to install agents on your Windows machines to start monitoring and managing your devices.

