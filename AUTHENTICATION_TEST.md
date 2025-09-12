# Authentication Separation Test Guide

## Overview
This document outlines how to test the separated authentication system:
- **Main Stock Page (/)**: Uses Clerk authentication
- **Remote Control Panel (/remote)**: Uses JWT authentication

## Test Setup

### Prerequisites
1. Frontend running on: `http://localhost:3001/`
2. Backend running on: `http://localhost:3003/`
3. Clerk environment variables configured
4. JWT credentials configured in backend

### Test Credentials (JWT - for Remote Control Panel)
- **Admin User**: username: `admin` (full access)
- **Controller User**: username: `controller` (control access)
- **Passwords**: As configured in your environment variables

## Testing Instructions

### 1. Test Main Stock Page (Clerk Authentication)

#### Steps:
1. Navigate to: `http://localhost:3001/`
2. Should be redirected to Clerk sign-in page (`/sign-in`)
3. Use Clerk authentication (sign-up/sign-in)
4. After successful authentication, should access main stock ticker page
5. Should see:
   - Header with "📈 Stock Ticker"
   - User info display (from Clerk)
   - Tabbed layout with ticker and controls
   - User profile button

#### Expected Behavior:
- ✅ Clerk authentication required
- ✅ No JWT token dependency
- ✅ Clerk user profile accessible
- ✅ Sign-out through Clerk

### 2. Test Remote Control Panel (JWT Authentication)

#### Steps:
1. Navigate to: `http://localhost:3001/remote`
2. Should see JWT login form (not Clerk)
3. Enter JWT credentials:
   - Username: `admin`
   - Password: [your configured admin password]
4. After successful authentication, should access remote control panel
5. Should see:
   - Header with "🎛️ Remote Control Panel"
   - "JWT Authentication" label
   - Stock management interface
   - System controls
   - Connection status indicator

#### Expected Behavior:
- ✅ JWT authentication required
- ✅ No Clerk dependency
- ✅ Local login form (not Clerk UI)
- ✅ JWT token stored in localStorage
- ✅ Sign-out clears JWT token

### 3. Test Authentication Independence

#### Cross-Authentication Test:
1. Sign in to main page with Clerk
2. Navigate to `/remote` - should still see JWT login form
3. Sign in to remote panel with JWT
4. Navigate to `/` - should still have Clerk session
5. Sign out from main page - should not affect JWT session
6. Sign out from remote panel - should not affect Clerk session

#### Expected Behavior:
- ✅ Clerk and JWT sessions are completely independent
- ✅ Signing out of one doesn't affect the other
- ✅ Each route uses its own authentication method
- ✅ No cross-contamination of authentication states

## Verification Checklist

### Main Stock Page (`/`)
- [ ] Redirects to Clerk sign-in when unauthenticated
- [ ] Uses Clerk UI components for authentication
- [ ] Stores Clerk session data
- [ ] User profile shows Clerk user information
- [ ] Sign-out uses Clerk sign-out
- [ ] No JWT token required or used

### Remote Control Panel (`/remote`)
- [ ] Shows custom JWT login form when unauthenticated
- [ ] Does not use any Clerk components
- [ ] Stores JWT token in localStorage
- [ ] API calls use JWT Bearer token
- [ ] Sign-out clears JWT token and reloads page
- [ ] No Clerk session required or used

### Independence
- [ ] Can be signed into one without affecting the other
- [ ] Can sign out of one without affecting the other
- [ ] Authentication states are completely separate
- [ ] JWT token expiration doesn't affect Clerk session
- [ ] Clerk session expiration doesn't affect JWT token

## Troubleshooting

### Common Issues
1. **Build errors**: Ensure all import paths are correct
2. **Port conflicts**: Make sure frontend (3001) and backend (3003) are available
3. **Clerk not loading**: Check VITE_CLERK_PUBLISHABLE_KEY
4. **JWT login fails**: Verify admin/controller passwords in environment
5. **API calls fail**: Check VITE_API_BASE_URL configuration

### Environment Variables Required
```bash
# Clerk (for main page)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# JWT (for remote panel)
JWT_SECRET=your-secret-key
ADMIN_PASSWORD=your-admin-password
CONTROLLER_PASSWORD=your-controller-password

# API Configuration
VITE_API_BASE_URL=http://localhost:3003
```

## Success Criteria
- [x] Build completes without errors
- [x] Frontend and backend servers start successfully
- [ ] Main page uses Clerk authentication exclusively
- [ ] Remote control panel uses JWT authentication exclusively
- [ ] Both authentication systems work independently
- [ ] No cross-interference between authentication methods
- [ ] User experience is seamless on both routes
