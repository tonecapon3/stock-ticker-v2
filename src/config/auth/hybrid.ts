import { AuthConfig, AuthMethod } from '../../auth/types';
import { getApiBaseUrl } from '../../lib/config';

// Environment variables
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 
                              import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Detect if Clerk is available
export const isClerkAvailable = (): boolean => {
  try {
    // Check if Clerk publishable key is configured
    const hasClerkKey = Boolean(CLERK_PUBLISHABLE_KEY);
    
    // Check if Clerk libraries are loaded (for runtime detection)
    const hasClerkLibrary = typeof window !== 'undefined' && 
                           window.Clerk !== undefined;
    
    // In development, we can be more lenient
    if (import.meta.env.DEV) {
      return hasClerkKey;
    }
    
    // In production, require both key and library
    return hasClerkKey && hasClerkLibrary;
  } catch (error) {
    console.warn('Error detecting Clerk availability:', error);
    return false;
  }
};

// Determine the best authentication method
export const determineAuthMethod = (preferredMethod: AuthMethod = 'auto'): AuthMethod => {
  if (preferredMethod !== 'auto') {
    return preferredMethod;
  }
  
  // Auto-detection logic
  const clerkAvailable = isClerkAvailable();
  
  // Prefer Clerk if available (more secure)
  if (clerkAvailable) {
    return 'clerk';
  }
  
  // Fallback to JWT
  return 'jwt';
};

// Default configuration
export const getHybridAuthConfig = (): AuthConfig => {
  const preferredMethod = (import.meta.env.VITE_AUTH_METHOD as AuthMethod) || 'auto';
  
  return {
    preferredMethod: determineAuthMethod(preferredMethod),
    enableFallback: import.meta.env.VITE_AUTH_ENABLE_FALLBACK !== 'false',
    jwtStorageKey: 'remote-token',
    clerkPublishableKey: CLERK_PUBLISHABLE_KEY,
    apiBaseUrl: getApiBaseUrl(),
  };
};

// Auth method configuration
export const AUTH_METHODS = {
  jwt: {
    name: 'JWT Authentication',
    description: 'Custom JWT-based authentication',
    loginEndpoint: '/api/remote/auth',
    verifyEndpoint: '/api/remote/auth',
    storageKey: 'remote-token',
  },
  clerk: {
    name: 'Clerk Authentication',
    description: 'Enterprise-grade authentication with Clerk',
    requiresClerkProvider: true,
    storageKey: 'clerk-db-jwt',
  },
} as const;

// Debug information
export const getAuthDebugInfo = () => {
  return {
    clerkKey: CLERK_PUBLISHABLE_KEY ? '***configured***' : 'not configured',
    clerkAvailable: isClerkAvailable(),
    preferredMethod: getHybridAuthConfig().preferredMethod,
    apiBaseUrl: getApiBaseUrl(),
    environment: import.meta.env.MODE,
    fallbackEnabled: getHybridAuthConfig().enableFallback,
  };
};
