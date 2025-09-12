import { AuthMethod, User, JWTUser, ClerkUser } from '../types';
import { isClerkAvailable } from '../../config/auth/hybrid';

// User conversion utilities
export const convertJWTUser = (jwtUser: JWTUser): User => ({
  id: jwtUser.id,
  username: jwtUser.username,
  role: jwtUser.role,
});

export const convertClerkUser = (clerkUser: any): User => ({
  id: clerkUser.id,
  username: clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0],
  email: clerkUser.primaryEmailAddress?.emailAddress,
  firstName: clerkUser.firstName,
  lastName: clerkUser.lastName,
  imageUrl: clerkUser.imageUrl,
  role: clerkUser.publicMetadata?.role || 'user',
});

// Token validation utilities
export const isValidJWTToken = (token: string): boolean => {
  if (!token) return false;
  
  try {
    // Basic JWT format validation (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Try to decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export const isValidClerkToken = async (): Promise<boolean> => {
  if (!isClerkAvailable()) return false;
  
  try {
    // Use dynamic import to avoid errors when Clerk is not available
    const { useAuth } = await import('@clerk/clerk-react');
    
    // This would need to be called within a React component
    // For now, we'll just check if Clerk is loaded
    return typeof window !== 'undefined' && window.Clerk?.loaded === true;
  } catch (error) {
    return false;
  }
};

// Method availability detection
export const getAvailableAuthMethods = (): AuthMethod[] => {
  const methods: AuthMethod[] = [];
  
  // JWT is always available (fallback method)
  methods.push('jwt');
  
  // Check if Clerk is available
  if (isClerkAvailable()) {
    methods.push('clerk');
  }
  
  return methods;
};

export const isAuthMethodAvailable = (method: AuthMethod): boolean => {
  switch (method) {
    case 'jwt':
      return true; // Always available
    case 'clerk':
      return isClerkAvailable();
    case 'auto':
      return true; // Auto-detection is always available
    default:
      return false;
  }
};

// Storage utilities
export const getStoredJWTToken = (): string | null => {
  try {
    return localStorage.getItem('remote-token');
  } catch (error) {
    console.warn('Error reading JWT token from storage:', error);
    return null;
  }
};

export const setStoredJWTToken = (token: string): void => {
  try {
    localStorage.setItem('remote-token', token);
  } catch (error) {
    console.warn('Error storing JWT token:', error);
  }
};

export const removeStoredJWTToken = (): void => {
  try {
    localStorage.removeItem('remote-token');
  } catch (error) {
    console.warn('Error removing JWT token:', error);
  }
};

// Environment detection
export const getAuthEnvironment = () => {
  return {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    hasApiServer: Boolean(import.meta.env.VITE_API_BASE_URL),
    clerkKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? 'configured' : 'not configured',
    availableMethods: getAvailableAuthMethods(),
  };
};

// Debug utilities
export const debugAuthState = (authMethod: AuthMethod, user: User | null, token: string | null) => {
  if (!import.meta.env.DEV) return;
  
  console.log('🔐 Auth Debug State:', {
    method: authMethod,
    user: user ? { id: user.id, username: user.username, role: user.role } : null,
    hasToken: Boolean(token),
    tokenValid: token ? (authMethod === 'jwt' ? isValidJWTToken(token) : 'clerk-token') : false,
    environment: getAuthEnvironment(),
    timestamp: new Date().toISOString(),
  });
};
