# Stock Ticker API Communication Guide

## 🚀 Production API Configuration

### Quick Setup Checklist

**Frontend Environment Variables** (Set in your hosting platform):
```bash
VITE_API_BASE_URL=https://your-api-server.railway.app
VITE_ACCESS_CODE=YourProductionPassword2024!
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
```

**Backend Environment Variables** (Set where your API server is deployed):
```bash
NODE_ENV=production
REMOTE_ALLOWED_ORIGINS=https://your-frontend-domain.com,https://staging.d7mi4rttj0a8.amplifyapp.com
REMOTE_JWT_SECRET=your-production-jwt-secret
REMOTE_API_KEY=your-production-api-key
REMOTE_PORT=3002
```

## 🔧 Troubleshooting API Communication Issues

### Issue: "API server not configured for production environment"

**Cause**: `VITE_API_BASE_URL` is not set or points to localhost in production.

**Solution**:
1. Set `VITE_API_BASE_URL` to your deployed API server URL
2. Ensure it starts with `https://` or `http://`
3. Remove any trailing slashes
4. Rebuild your frontend application

### Issue: CORS Errors

**Cause**: Your frontend domain is not in the API server's allowed origins.

**Solution**:
1. Add your frontend URL to `REMOTE_ALLOWED_ORIGINS`
2. Include both www and non-www versions if applicable
3. Restart your API server

### Issue: API Health Check Failures

**Symptoms**:
- Console shows "API server health check failed"
- App falls back to local-only mode

**Debugging Steps**:
1. Check if API server is running: `curl https://your-api-server.com/api/remote/status/health`
2. Verify CORS headers in response
3. Check API server logs for errors
4. Ensure API server has all required environment variables

## 📊 API Communication Flow

### Development Mode
```
Frontend (localhost:3000) → API Server (localhost:3002)
✅ Direct connection
✅ Immediate feedback
✅ Full remote control features
```

### Production Mode
```
Frontend (your-domain.com) → API Server (deployed-url.com)
⚠️ Requires proper CORS configuration
⚠️ Requires environment variables
⚠️ Network latency considerations
```

## 🛡️ Fallback Behavior

The application is designed to work in three modes:

### 1. Full API Mode
- ✅ API server is healthy and reachable
- ✅ Real-time data synchronization
- ✅ Remote control panel available
- ✅ Shared state across sessions

### 2. Local-Only Mode
- ⚠️ API server not configured or unreachable
- ✅ Application still functions
- ✅ Local price generation and updates
- ❌ No remote control features
- ❌ No cross-session synchronization

### 3. Mixed Mode
- ⚠️ API server partially working
- ✅ Graceful degradation
- ✅ Local data supplements API data
- ⚠️ Some features may be limited

## 🔍 Debugging Tools

### Browser Console Messages
- `🌐 Production API server configured` - API URL detected
- `✅ API server is healthy` - Health check passed
- `⚠️ API server health check failed` - Connection issues
- `🏭 API server disabled, using local data only` - Fallback mode

### API Endpoints for Testing
```bash
# Health check
POST https://your-api-server.com/api/remote/status/health

# Get stocks (no auth required)
GET https://your-api-server.com/api/remote/stocks

# Get controls (no auth required)
GET https://your-api-server.com/api/remote/controls

# Test CORS
curl -H "Origin: https://your-frontend-domain.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://your-api-server.com/api/remote/stocks
```

## ⚡ Performance Optimization

### API Sync Intervals
- **Health Check**: On startup (3 second timeout)
- **Data Sync**: Every 5 seconds
- **Local Updates**: Every 1-2 seconds when API active
- **Retry Logic**: Built-in exponential backoff

### Network Considerations
- API calls have proper timeout handling
- Graceful fallback to local data
- Reduced sync frequency when API is active
- Intelligent data merging (API + local)

## 🚨 Common Production Issues

### 1. Mixed Content (HTTP/HTTPS)
**Problem**: Frontend served over HTTPS trying to connect to HTTP API
**Solution**: Ensure API server uses HTTPS in production

### 2. Environment Variables Not Set
**Problem**: Build-time variables missing or incorrect
**Solution**: Set all VITE_ variables before building frontend

### 3. CORS Misconfiguration
**Problem**: Backend doesn't allow frontend domain
**Solution**: Update REMOTE_ALLOWED_ORIGINS with all frontend URLs

### 4. API Server Downtime
**Problem**: API server unavailable or crashed
**Solution**: App automatically falls back to local mode

## 📈 Monitoring & Alerting

### Key Metrics to Monitor
- API response times
- Error rates on API endpoints
- CORS rejection rates
- Health check success rates

### Log Messages to Watch
- `❌ Could not fetch from API`
- `⚠️ API server not available`
- `🏭 Production mode: API server disabled`

## 🔧 Quick Fixes

### Reset API Connection
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Test API Connectivity
```javascript
// In browser console
fetch('https://your-api-server.com/api/remote/status/health', {
  method: 'POST'
}).then(r => r.json()).then(console.log);
```

### Check Environment Variables
```javascript
// In browser console (development only)
console.log({
  API_URL: import.meta.env.VITE_API_BASE_URL,
  ACCESS_CODE: import.meta.env.VITE_ACCESS_CODE ? '***SET***' : 'NOT_SET',
  DEBUG: import.meta.env.VITE_DEBUG_MODE
});
```
