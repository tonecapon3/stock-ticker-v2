# Stock Ticker - Team Production URLs & Configuration

## 🌍 Current Production Deployments

### Frontend (AWS Amplify)
- **Production URL**: `https://main.d7lc7dqjkvbj3.amplifyapp.com`
- **Staging URL**: `https://staging.dv565hju499c6.amplifyapp.com`
- **Platform**: AWS Amplify
- **Status**: ✅ Active
- **Session Isolation**: ✅ Configured (separate instances)
- **Last Updated**: September 2024

### Backend API (Render)
- **Production URL**: `https://stock-ticker-v2.onrender.com`
- **Platform**: Render
- **Status**: ✅ Active
- **API Endpoints**:
  - Stocks: `https://stock-ticker-v2.onrender.com/api/remote/stocks`
  - Controls: `https://stock-ticker-v2.onrender.com/api/remote/controls`
  - Health: `https://stock-ticker-v2.onrender.com/status/health`

## 🔧 Required Environment Variables for Team

### For Local Development (.env.local)
```bash
# Copy these exact values for local development
REMOTE_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://main.d7lc7dqjkvbj3.amplifyapp.com
VITE_API_BASE_URL=http://localhost:3002
```

### For Production API Server (Render Environment Variables)
```bash
# Must be set in Render dashboard
# IMPORTANT: Add your staging URL to fix CORS errors
REMOTE_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://main.d7lc7dqjkvbj3.amplifyapp.com,https://staging.dv565hju499c6.amplifyapp.com
NODE_ENV=production
```

### For Production Frontend (Amplify Environment Variables)
```bash
# Must be set in Amplify dashboard
VITE_API_BASE_URL=https://stock-ticker-v2.onrender.com
VITE_ACCESS_CODE=SecureProd2024!StockTicker
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
```

## 🚨 CORS Configuration Critical Notes

### The Problem
The error "API server is Offline Error: Failed to fetch" occurs when:
1. The frontend tries to connect from `https://main.d7lc7dqjkvbj3.amplifyapp.com`
2. But the API server's `REMOTE_ALLOWED_ORIGINS` doesn't include this URL
3. Browser blocks the request due to CORS policy

### The Solution
**Always ensure the frontend URL is included in `REMOTE_ALLOWED_ORIGINS`:**

1. **Local Development**: Already included in `.env.local`
2. **Production**: Must be set in **Render dashboard** environment variables

### Testing CORS Configuration
```bash
# Test if CORS is working for production frontend
curl -H "Origin: https://main.d7lc7dqjkvbj3.amplifyapp.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://stock-ticker-v2.onrender.com/api/remote/stocks -v

# Should return 204 with access-control-allow-origin header
```

## 📋 Team Checklist for New Deployments

### When Deploying Frontend to New URL
- [ ] Update `REMOTE_ALLOWED_ORIGINS` in Render API server
- [ ] Update this documentation file
- [ ] Update `.env.example`
- [ ] Test CORS configuration
- [ ] Redeploy API server
- [ ] Verify production app works

### When Setting Up Local Development
- [ ] Copy `.env.example` to `.env.local`
- [ ] Use exact values from this file
- [ ] Start local API server first (`npm run dev:server`)
- [ ] Start local frontend (`npm run dev`)
- [ ] Verify local app connects to local API

## 🔍 Quick Debugging Commands

### Check if Production API is Running
```bash
curl -s https://stock-ticker-v2.onrender.com/api/remote/stocks | jq .
```

### Check if Production Frontend is Accessible
```bash
curl -I https://main.d7lc7dqjkvbj3.amplifyapp.com
```

### Test Full Production Flow
1. Open `https://main.d7lc7dqjkvbj3.amplifyapp.com`
2. Check browser console for API connection messages
3. Look for "API server is Online" status in controls panel

## 👥 Team Members Access

### Render Dashboard (API Server)
- Access needed to update `REMOTE_ALLOWED_ORIGINS`
- Contact project admin for access

### AWS Amplify Dashboard (Frontend)
- Access needed to update build environment variables
- Contact project admin for access

## 📞 Emergency Contacts

### If Production is Down
1. Check Render service status
2. Check Amplify build status
3. Verify environment variables are set correctly
4. Check this documentation for correct URLs

### If CORS Errors Appear
1. Verify `REMOTE_ALLOWED_ORIGINS` includes frontend URL
2. Check that both HTTP and HTTPS are handled correctly
3. Restart API server after environment variable changes

---

**⚠️ Important**: Always update this file when production URLs change!
**📅 Last Updated**: September 8, 2024
**👤 Updated By**: Team Setup Documentation
