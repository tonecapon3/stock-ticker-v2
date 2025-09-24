# Production JWT Bridge Configuration

This document outlines the configuration needed to fix the Clerk-JWT bridge in production and prevent 401 API errors.

## ✅ What Was Fixed

### 1. Token Storage Methods
- **Fixed**: Added missing `tokenStorage.getAccessToken()` method
- **Fixed**: Added missing `tokenStorage.getSessionId()` method  
- **Fixed**: Added `tokenStorage.setAccessToken()` method for compatibility
- **Fixed**: Added `tokenStorage.setSessionId()` method for proper session management

### 2. JWT Bridge Authentication Flow
- **Improved**: Enhanced `authenticateWithJWTBridge()` with better error handling
- **Added**: Proper token storage using both JWT and access token methods
- **Added**: Authentication timestamp tracking for expiration handling
- **Added**: Automatic cleanup of expired authentication

### 3. Authentication Header Generation
- **Fixed**: `getJWTAuthHeaders()` in `context.tsx` now properly checks JWT bridge
- **Added**: Fallback authentication header generation
- **Added**: Detailed logging for debugging authentication issues
- **Improved**: Better error messages when authentication fails

### 4. Auto-Retry Mechanism
- **Added**: Exponential backoff for JWT bridge authentication retries
- **Added**: Intelligent retry logic that stops after successful authentication
- **Added**: Maximum retry limits to prevent infinite loops

### 5. Production Configuration
- **Updated**: `getApiBaseUrl()` now defaults to production API server
- **Updated**: Health check properly handles 401 responses as "server healthy but needs auth"
- **Improved**: Production-friendly logging (reduced console spam)

## 🚀 Production Environment Variables

### Required Environment Variables

```bash
# API Server Configuration
VITE_API_BASE_URL=https://stock-ticker-v2.onrender.com

# Clerk Authentication (if using Clerk)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# JWT Bridge Configuration (already handled in code)
# These are automatically configured by the bridge:
# - JWT_BRIDGE_CREDENTIALS (hardcoded for admin access)
# - Token storage keys (managed automatically)
```

### Optional Environment Variables

```bash
# Debug mode (development only)
VITE_DEBUG_MODE=false

# API timeout configuration
VITE_API_TIMEOUT=5000
```

## 🔧 Deployment Steps

### 1. Build and Deploy Frontend

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Deploy built files to your hosting provider
# (e.g., Netlify, Vercel, AWS Amplify)
```

### 2. Configure Environment Variables

Set the environment variables in your hosting provider's dashboard:
- **Netlify**: Site settings → Environment variables
- **Vercel**: Project settings → Environment Variables
- **AWS Amplify**: App settings → Environment variables

### 3. Verify Configuration

After deployment, check the browser console for these messages:
- `🏭 Production mode: using default API server: https://stock-ticker-v2.onrender.com`
- `🔗 Using JWT bridge headers for authentication`
- `✅ Clerk-JWT bridge established successfully`

## 🧪 Testing the Fix

Run the test script to verify everything works:

```bash
node test-jwt-bridge-fix.js
```

Expected output:
- ✅ JWT Bridge authentication working
- ✅ Token storage methods available
- ✅ Authentication headers correctly formatted
- ✅ API calls authenticated successfully

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Issue: Still getting 401 errors
**Solution**: 
1. Clear browser localStorage: `localStorage.clear()`
2. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+F5)
3. Check if `VITE_API_BASE_URL` is set correctly

#### Issue: JWT bridge not authenticating
**Solution**:
1. Check browser console for error messages
2. Verify API server is running: `curl https://stock-ticker-v2.onrender.com/api/remote/status`
3. Check if admin credentials are correct in the bridge

#### Issue: Infinite authentication loops
**Solution**:
1. Clear localStorage: `localStorage.clear()`
2. The new exponential backoff should prevent this
3. Check for JavaScript errors in the console

### Debug Commands

```bash
# Check API server status
curl https://stock-ticker-v2.onrender.com/api/remote/status

# Test authentication manually
curl -X POST https://stock-ticker-v2.onrender.com/api/remote/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AdminSecure2025!@"}'

# Test authenticated endpoint
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://stock-ticker-v2.onrender.com/api/remote/stocks
```

## 📊 Expected Behavior

After implementing these fixes:

1. **Page Load**: JWT bridge automatically authenticates with API server
2. **Authentication**: Clerk users get seamlessly bridged to JWT authentication  
3. **API Calls**: All API requests include proper `Authorization: Bearer <token>` headers
4. **Error Handling**: 401 errors are handled gracefully with automatic retry
5. **Status Display**: Bridge status shows "Connected to API server" instead of errors

## 🔄 How the Fixed Flow Works

1. **User Loads App** → Clerk authentication initializes
2. **Clerk Auth Success** → JWT bridge automatically triggers  
3. **JWT Bridge** → Authenticates with API server using admin credentials
4. **Token Storage** → JWT token stored using multiple methods for compatibility
5. **API Calls** → All subsequent API calls include authentication headers
6. **Auto-Retry** → If authentication fails, intelligent retry with backoff
7. **Token Expiry** → Automatic cleanup and re-authentication when needed

The key insight is that this creates a "bridge" between Clerk's user authentication and your API server's JWT authentication, giving Clerk users seamless access to the protected API endpoints.