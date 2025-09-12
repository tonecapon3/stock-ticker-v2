# Hybrid JWT + Clerk Authentication System

This document describes the complete hybrid authentication system that supports both JWT and Clerk authentication methods with automatic fallback capabilities.

## 🌟 Features

- **Dual Authentication Methods**: Support for both JWT and Clerk authentication
- **Automatic Fallback**: Seamless switching between authentication methods
- **Unified API**: Single interface for both authentication types
- **Role-Based Access Control**: Works with both JWT and Clerk roles
- **Method Switching**: Users can switch between authentication methods
- **Token Management**: Unified token handling and validation
- **Environment Detection**: Automatic detection of available methods

## 📁 File Structure

```
src/
├── auth/
│   ├── types/index.ts              # Type definitions for hybrid auth
│   └── utils/index.ts              # Utilities for token handling and conversion
├── config/
│   └── auth/index.ts               # Authentication configuration management
├── hooks/
│   └── auth/useHybridAuth.ts       # Main hybrid authentication hook
├── components/
│   └── auth/
│       └── hybrid/
│           ├── HybridAuthGuard.tsx      # Route protection component
│           ├── HybridSignIn.tsx         # Unified sign-in component
│           └── AuthMethodSelector.tsx   # Method selection component
├── pages/
│   └── RemoteControlPanelHybrid.tsx     # Hybrid remote control panel
└── scripts/
    └── auth/
        └── test-hybrid-auth.cjs         # Testing script
```

## 🔧 Setup Instructions

### 1. Environment Variables

Create or update your `.env.local` file with the following variables:

```bash
# API Server Configuration
VITE_API_BASE_URL=http://localhost:3001

# JWT Authentication (Optional)
REMOTE_JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters
REMOTE_ADMIN_USERNAME=admin
REMOTE_ADMIN_PASSWORD_HASH=$2a$10$your-bcrypt-hashed-password
REMOTE_CONTROLLER_USERNAME=controller
REMOTE_CONTROLLER_PASSWORD_HASH=$2a$10$your-bcrypt-hashed-password

# Clerk Authentication (Optional)
CLERK_SECRET_KEY=sk_live_your-clerk-secret-key
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your-clerk-publishable-key

# Hybrid Configuration
VITE_AUTH_PREFERRED_METHOD=auto  # Options: jwt, clerk, auto
VITE_AUTH_AUTO_FALLBACK=true
```

### 2. Install Dependencies

Make sure you have all required dependencies installed:

```bash
npm install @clerk/clerk-react @clerk/express jsonwebtoken bcryptjs
```

### 3. Start the Hybrid Server

```bash
node server-hybrid-fixed.cjs
```

### 4. Test the Implementation

Run the test suite to validate the setup:

```bash
node scripts/auth/test-hybrid-auth.cjs
```

### 5. Update Your Routes

Replace your existing remote control routes with the hybrid version:

```tsx
import RemoteControlPanelHybrid from './pages/RemoteControlPanelHybrid';

// In your router configuration
<Route path="/remote-control" component={RemoteControlPanelHybrid} />
```

## 🚀 Usage Examples

### Basic Implementation

```tsx
import React from 'react';
import { useHybridAuth } from '../hooks/auth/useHybridAuth';
import { HybridAuthGuard } from '../components/auth/hybrid/HybridAuthGuard';

function MyProtectedComponent() {
  return (
    <HybridAuthGuard requiredRole="admin">
      <div>Protected content here</div>
    </HybridAuthGuard>
  );
}

function MyComponent() {
  const { 
    user, 
    authMethod, 
    signInWithJWT, 
    signInWithClerk, 
    signOut 
  } = useHybridAuth();

  const handleJWTLogin = async () => {
    const result = await signInWithJWT({
      username: 'admin',
      password: 'password'
    });
    
    if (result.success) {
      console.log('JWT login successful');
    }
  };

  const handleClerkLogin = async () => {
    const result = await signInWithClerk();
    if (result.success) {
      console.log('Clerk login initiated');
    }
  };

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome {user.username || user.firstName}!</p>
          <p>Auth method: {authMethod}</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <div>
          <button onClick={handleJWTLogin}>Sign in with JWT</button>
          <button onClick={handleClerkLogin}>Sign in with Clerk</button>
        </div>
      )}
    </div>
  );
}
```

### API Integration

```tsx
import { useHybridAuth } from '../hooks/auth/useHybridAuth';
import { apiUtils } from '../auth/utils';

function useApiClient() {
  const { getToken, authMethod } = useHybridAuth();

  const makeApiCall = async (endpoint, options = {}) => {
    const token = await getToken();
    
    return await apiUtils.authenticatedFetch(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, token, authMethod);
  };

  return { makeApiCall };
}
```

## 🔐 Authentication Methods

### JWT Authentication

- **Traditional**: Username and password authentication
- **Token-based**: Uses JSON Web Tokens for session management
- **Local Storage**: Tokens stored in browser localStorage
- **Server Validation**: Tokens validated on each request

### Clerk Authentication

- **Enterprise-grade**: Clerk's secure authentication platform
- **OAuth Support**: Google, GitHub, and other OAuth providers
- **MFA Support**: Multi-factor authentication built-in
- **Session Management**: Automatic token refresh and management

## ⚙️ Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_AUTH_PREFERRED_METHOD` | Preferred authentication method | `auto` | No |
| `VITE_AUTH_AUTO_FALLBACK` | Enable automatic fallback | `true` | No |
| `VITE_API_BASE_URL` | API server URL | - | Yes |
| `CLERK_SECRET_KEY` | Clerk server secret key | - | For Clerk |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk client key | - | For Clerk |
| `REMOTE_JWT_SECRET` | JWT signing secret | - | For JWT |

### Runtime Configuration

```tsx
import { getAuthConfig, runtimeConfig } from '../config/auth';

// Get current configuration
const config = getAuthConfig();

// Update configuration at runtime
runtimeConfig.updateConfig({
  preferredMethod: AuthMethod.CLERK,
  allowMethodSwitching: false
});
```

## 🛡️ Security Considerations

### JWT Security
- Use strong secrets (at least 32 characters)
- Implement token expiration
- Store tokens securely
- Validate tokens on each request

### Clerk Security
- Use environment-specific keys
- Configure proper redirect URLs
- Implement proper role management
- Regular security audits

### General Security
- Use HTTPS in production
- Implement CORS properly
- Regular dependency updates
- Monitor authentication logs

## 🧪 Testing

### Run the Test Suite

```bash
node scripts/auth/test-hybrid-auth.cjs
```

### Manual Testing Checklist

- [ ] JWT authentication works
- [ ] Clerk authentication works
- [ ] Method switching works
- [ ] Fallback mechanisms work
- [ ] Role-based access control works
- [ ] Token refresh works
- [ ] Sign-out works properly
- [ ] Protected routes work
- [ ] API integration works

## 🚀 Deployment

### Development
1. Set up environment variables in `.env.local`
2. Start the hybrid server
3. Start the frontend development server
4. Test both authentication methods

### Production
1. Configure environment variables on your hosting platform
2. Deploy the hybrid server separately
3. Build and deploy the frontend
4. Test with production Clerk keys
5. Monitor authentication logs

## 📊 Monitoring and Analytics

### Authentication Events
- Sign-in attempts
- Method switching
- Authentication failures
- Token refresh events

### Metrics to Track
- Authentication success rate
- Method usage distribution
- Fallback trigger frequency
- User session duration

## 🆘 Troubleshooting

### Common Issues

**"Authentication methods not available"**
- Check environment variables
- Verify API server is running
- Check network connectivity

**"JWT authentication failed"**
- Verify JWT secret is configured
- Check token expiration
- Validate user credentials

**"Clerk authentication failed"**
- Check Clerk keys are correct
- Verify redirect URLs
- Check Clerk dashboard configuration

**"Method switching not working"**
- Ensure `allowMethodSwitching` is enabled
- Check multiple methods are available
- Verify configuration setup

### Debug Mode

Enable debug logging in development:

```tsx
import { debugUtils } from '../auth/utils';

// Log authentication state
debugUtils.logAuthState(authState);

// Log method availability
debugUtils.logAvailability();
```

## 📝 API Reference

### Hooks

#### `useHybridAuth()`

Main authentication hook providing unified interface.

**Returns:**
```tsx
{
  isLoaded: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UnifiedUser | null;
  authMethod: AuthMethod | null;
  error: string | null;
  signInWithJWT: (credentials: JWTCredentials) => Promise<AuthResponse>;
  signInWithClerk: () => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  switchAuthMethod: (method: AuthMethod) => Promise<void>;
  getToken: () => Promise<string | null>;
  clearError: () => void;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
}
```

### Components

#### `<HybridAuthGuard>`

Route protection component with authentication requirement.

**Props:**
```tsx
{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredRole?: string;
  loadingMessage?: string;
}
```

#### `<HybridSignIn>`

Unified sign-in component supporting both authentication methods.

**Props:**
```tsx
{
  onSuccess?: () => void;
  onError?: (error: string) => void;
  allowMethodSwitching?: boolean;
  title?: string;
  subtitle?: string;
}
```

### Utilities

#### `tokenStorage`

Token and data storage utilities for JWT authentication.

#### `jwtUtils`

JWT token validation and parsing utilities.

#### `userUtils`

User data conversion and manipulation utilities.

#### `envUtils`

Environment detection and configuration utilities.

#### `apiUtils`

API integration utilities for hybrid authentication.

## 🔄 Migration Guide

### From JWT-only to Hybrid

1. Install Clerk dependencies
2. Add Clerk environment variables
3. Update components to use `useHybridAuth`
4. Replace authentication guards with `HybridAuthGuard`
5. Update API calls to use hybrid utilities
6. Test both authentication methods

### From Clerk-only to Hybrid

1. Add JWT server setup
2. Add JWT environment variables
3. Update components to use `useHybridAuth`
4. Add JWT credentials management
5. Update API calls to support both methods
6. Test fallback mechanisms

## 📚 Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [JWT.io - JWT Debugger](https://jwt.io/)
- [React Authentication Best Practices](https://reactjs.org/docs/authentication.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

## 📄 License

This hybrid authentication system is part of the Stock Ticker application and follows the same license terms.

---

## 🎉 Congratulations!

You now have a complete hybrid authentication system that provides:

- **Flexibility**: Support for both JWT and Clerk authentication
- **Reliability**: Automatic fallback mechanisms
- **Security**: Enterprise-grade security features
- **Usability**: Seamless user experience
- **Maintainability**: Well-structured and documented code

The system is production-ready and can be deployed with confidence. Remember to test thoroughly in your specific environment and monitor authentication metrics in production.

Happy coding! 🚀
