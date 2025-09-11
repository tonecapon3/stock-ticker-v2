# 🔒 Render Environment Fix Guide - Authentication Issue

## ❌ Current Problem
The production API server at `https://stock-ticker-v2.onrender.com` is returning:
```
❌ Authentication failed: {"error": "Invalid token"}
Status: 403 Forbidden
```

**Root Cause**: Missing environment variables on Render deployment.

## ✅ Solution: Update Render Environment Variables

### Step 1: Access Render Dashboard
1. Go to https://render.com/dashboard
2. Find your service: **stock-ticker-api** 
3. Click on the service name
4. Go to **Environment** tab

### Step 2: Add/Update Environment Variables

Set the following environment variables in your Render dashboard:

```bash
# Security Configuration
REMOTE_JWT_SECRET=oYtPIVztV0AiMtZ/0vfP0xHNncfv1a9MldBg/8YEzOg=
REMOTE_API_KEY=V2q2TPZ+hAGhiZcFhfdwW9K11YDocRH5

# User Authentication
REMOTE_ADMIN_USERNAME=admin
REMOTE_ADMIN_PASSWORD_HASH=$2b$10$ddssXRBxF6uTZp5x4Xlw5uuIKzd70AbFu.1WtJmH4L9/XOHTge7lC
REMOTE_CONTROLLER_USERNAME=controller
REMOTE_CONTROLLER_PASSWORD_HASH=$2b$10$cusPiSTKwaBBFfrf.NWrbuaDYhyn5MPXZsa0PU6yDl78oCYaEcqG.

# CORS Configuration  
REMOTE_ALLOWED_ORIGINS=https://main.d7lc7dqjkvbj3.amplifyapp.com,https://d7lc7dqjkvbj3.amplifyapp.com

# Runtime Configuration
NODE_ENV=production
```

### Step 3: Deploy Changes
1. Click **Save Changes** in Render dashboard
2. The service will automatically redeploy
3. Wait for deployment to complete (2-3 minutes)

### Step 4: Verify Fix
After deployment completes, test authentication:

```bash
# Test 1: Get authentication token
curl -X POST https://stock-ticker-v2.onrender.com/api/remote/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Expected: {"success":true,"token":"...","user":{...}}

# Test 2: Verify token
curl -X GET https://stock-ticker-v2.onrender.com/api/remote/auth \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: {"authenticated":true,"user":{...}}
```

## 🔐 Login Credentials (Production)

After applying this fix, use these credentials:

- **Admin User**: 
  - Username: `admin`
  - Password: `admin123`

- **Controller User**:
  - Username: `controller` 
  - Password: `controller123`

## ⚠️ Security Notes

1. **Passwords**: Change these default passwords after confirming the fix works
2. **Secrets**: These are strong, randomly generated secrets safe for production
3. **CORS**: Configured for your AWS Amplify domain
4. **HTTPS**: Enforced in production environment

## 📋 Environment Variables Summary

| Variable | Purpose | Status |
|----------|---------|--------|
| `REMOTE_JWT_SECRET` | JWT token signing | ✅ Strong 32-byte secret |
| `REMOTE_API_KEY` | API security key | ✅ Strong 24-byte key |
| `REMOTE_ADMIN_PASSWORD_HASH` | Admin password | ✅ Bcrypt hashed |
| `REMOTE_CONTROLLER_PASSWORD_HASH` | Controller password | ✅ Bcrypt hashed |
| `REMOTE_ALLOWED_ORIGINS` | CORS origins | ✅ AWS Amplify domains |
| `NODE_ENV` | Environment | ✅ production |

## 🚀 Expected Result

After applying this fix:
- ✅ Authentication will work properly
- ✅ Frontend can connect to API
- ✅ JWT tokens will be valid
- ✅ User login will succeed
- ✅ No more 403 Forbidden errors

## 🔄 Alternative: Use Render CLI

If you prefer command line:

```bash
# Install Render CLI (if not installed)
npm install -g @render/cli

# Set environment variables
render env set REMOTE_JWT_SECRET="oYtPIVztV0AiMtZ/0vfP0xHNncfv1a9MldBg/8YEzOg="
render env set REMOTE_API_KEY="V2q2TPZ+hAGhiZcFhfdwW9K11YDocRH5"
# ... continue with other variables
```

## 📞 Support

If you encounter issues:
1. Check Render logs for any startup errors
2. Ensure all environment variables are set correctly
3. Verify the deployment completed successfully
4. Test the API endpoints as shown above

**This fix addresses the core authentication issue causing the 403 Forbidden errors.**
