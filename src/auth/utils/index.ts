/**
 * Authentication utilities for hybrid JWT + Clerk authentication system
 * 
 * This file provides utility functions for token validation, storage, 
 * and conversion between different user formats.
 */

import { 
  AuthMethod, 
  UnifiedUser, 
  JWTUser, 
  ClerkUser, 
  isJWTUser, 
  isClerkUser,
  AuthResponse 
} from '../types';

// JWT token storage key
const JWT_TOKEN_KEY = 'hybrid-auth-jwt-token';
const AUTH_METHOD_KEY = 'hybrid-auth-method';
const USER_DATA_KEY = 'hybrid-auth-user-data';

/**
 * Token storage utilities
 */
export const tokenStorage = {
  /**
   * Store JWT token in localStorage
   */
  setJWTToken: (token: string): void => {
    try {
      localStorage.setItem(JWT_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store JWT token:', error);
    }
  },

  /**
   * Get JWT token from localStorage
   */
  getJWTToken: (): string | null => {
    try {
      return localStorage.getItem(JWT_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve JWT token:', error);
      return null;
    }
  },

  /**
   * Remove JWT token from localStorage
   */
  removeJWTToken: (): void => {
    try {
      localStorage.removeItem(JWT_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove JWT token:', error);
    }
  },

  /**
   * Store authentication method
   */
  setAuthMethod: (method: AuthMethod): void => {
    try {
      localStorage.setItem(AUTH_METHOD_KEY, method);
    } catch (error) {
      console.error('Failed to store auth method:', error);
    }
  },

  /**
   * Get stored authentication method
   */
  getAuthMethod: (): AuthMethod | null => {
    try {
      const method = localStorage.getItem(AUTH_METHOD_KEY);
      return method as AuthMethod || null;
    } catch (error) {
      console.error('Failed to retrieve auth method:', error);
      return null;
    }
  },

  /**
   * Store user data (for JWT users when offline)
   */
  setUserData: (user: UnifiedUser): void => {
    try {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  },

  /**
   * Get stored user data
   */
  getUserData: (): UnifiedUser | null => {
    try {
      const userData = localStorage.getItem(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  },

  /**
   * Clear all stored authentication data
   */
  clearAll: (): void => {
    try {
      localStorage.removeItem(JWT_TOKEN_KEY);
      localStorage.removeItem(AUTH_METHOD_KEY);
      localStorage.removeItem(USER_DATA_KEY);
    } catch (error) {
      console.error('Failed to clear auth storage:', error);
    }
  }
};

/**
 * JWT token validation utilities
 */
export const jwtUtils = {
  /**
   * Decode JWT token (without verification - for client-side parsing only)
   */
  decodeToken: (token: string): any => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to decode JWT token:', error);
      return null;
    }
  },

  /**
   * Check if JWT token is expired (client-side check only)
   */
  isTokenExpired: (token: string): boolean => {
    try {
      const decoded = jwtUtils.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      console.error('Failed to check token expiration:', error);
      return true;
    }
  },

  /**
   * Get token expiration time
   */
  getTokenExpiration: (token: string): Date | null => {
    try {
      const decoded = jwtUtils.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch (error) {
      console.error('Failed to get token expiration:', error);
      return null;
    }
  },

  /**
   * Extract user data from JWT token
   */
  getUserFromToken: (token: string): JWTUser | null => {
    try {
      const decoded = jwtUtils.decodeToken(token);
      if (!decoded) {
        return null;
      }

      return {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role || 'user',
        iat: decoded.iat,
        exp: decoded.exp
      };
    } catch (error) {
      console.error('Failed to extract user from token:', error);
      return null;
    }
  }
};

/**
 * User conversion utilities
 */
export const userUtils = {
  /**
   * Convert Clerk user to unified user format
   */
  clerkToUnified: (clerkUser: any, publicMetadata?: any): ClerkUser => {
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      fullName: clerkUser.fullName,
      username: clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0],
      imageUrl: clerkUser.imageUrl,
      role: publicMetadata?.role || clerkUser.publicMetadata?.role || 'user'
    };
  },

  /**
   * Convert JWT payload to unified user format
   */
  jwtToUnified: (jwtPayload: any): JWTUser => {
    return {
      id: jwtPayload.id,
      username: jwtPayload.username,
      role: jwtPayload.role || 'user',
      iat: jwtPayload.iat,
      exp: jwtPayload.exp
    };
  },

  /**
   * Get display name for any user type
   */
  getDisplayName: (user: UnifiedUser): string => {
    if (isClerkUser(user)) {
      return user.fullName || 
             `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
             user.username || 
             user.email?.split('@')[0] || 
             'Unknown User';
    } else if (isJWTUser(user)) {
      return user.username || 'Unknown User';
    }
    return 'Unknown User';
  },

  /**
   * Get user identifier (email or username)
   */
  getUserIdentifier: (user: UnifiedUser): string => {
    if (isClerkUser(user)) {
      return user.email || user.username || user.id.toString();
    } else if (isJWTUser(user)) {
      return user.username || user.id.toString();
    }
    return user.id.toString();
  },

  /**
   * Check if user has specific role
   */
  hasRole: (user: UnifiedUser, role: string): boolean => {
    return user.role === role || user.role === 'admin';
  },

  /**
   * Check if user is admin
   */
  isAdmin: (user: UnifiedUser): boolean => {
    return user.role === 'admin';
  }
};

/**
 * Environment and availability detection utilities
 */
export const envUtils = {
  /**
   * Check if Clerk is available and configured
   */
  isClerkAvailable: (): boolean => {
    try {
      // Check if Clerk publishable key is configured
      const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 
                      import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
      
      // Check if Clerk is imported and available in the environment
      return Boolean(clerkKey && typeof window !== 'undefined');
    } catch (error) {
      console.error('Error checking Clerk availability:', error);
      return false;
    }
  },

  /**
   * Check if JWT authentication is enabled
   */
  isJWTEnabled: (): boolean => {
    try {
      // Check if API server is available for JWT authentication
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      return Boolean(apiBaseUrl);
    } catch (error) {
      console.error('Error checking JWT availability:', error);
      return false;
    }
  },

  /**
   * Get API base URL for JWT authentication
   */
  getApiBaseUrl: (): string => {
    return import.meta.env.VITE_API_BASE_URL || '';
  },

  /**
   * Determine available authentication methods
   */
  getAvailableMethods: (): AuthMethod[] => {
    const methods: AuthMethod[] = [];
    
    if (envUtils.isJWTEnabled()) {
      methods.push(AuthMethod.JWT);
    }
    
    if (envUtils.isClerkAvailable()) {
      methods.push(AuthMethod.CLERK);
    }

    return methods;
  }
};

/**
 * API utilities for hybrid authentication
 */
export const apiUtils = {
  /**
   * Make authenticated API call with hybrid token support
   */
  authenticatedFetch: async (
    endpoint: string, 
    options: RequestInit = {}, 
    token?: string,
    authMethod?: AuthMethod
  ): Promise<Response> => {
    const apiBaseUrl = envUtils.getApiBaseUrl();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${apiBaseUrl}/api/remote${endpoint}`, {
      ...options,
      headers,
    });
  },

  /**
   * Handle API response and authentication errors
   */
  handleAuthResponse: async (response: Response): Promise<AuthResponse> => {
    try {
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          authMethod: data.authMethod || AuthMethod.JWT,
          error: data.error || 'Authentication failed',
          details: data.details
        };
      }

      return {
        success: true,
        user: data.user,
        token: data.token,
        authMethod: data.authMethod || AuthMethod.JWT
      };
    } catch (error) {
      return {
        success: false,
        authMethod: AuthMethod.JWT,
        error: 'Failed to process authentication response',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Development and debugging utilities
 */
export const debugUtils = {
  /**
   * Log authentication state for debugging
   */
  logAuthState: (state: any, prefix = 'AUTH'): void => {
    if (import.meta.env.DEV) {
      console.log(`🔍 ${prefix}:`, {
        ...state,
        token: state.token ? `${state.token.substring(0, 10)}...` : null
      });
    }
  },

  /**
   * Log authentication method availability
   */
  logAvailability: (): void => {
    if (import.meta.env.DEV) {
      console.log('🔐 Auth Methods Availability:', {
        jwt: envUtils.isJWTEnabled(),
        clerk: envUtils.isClerkAvailable(),
        available: envUtils.getAvailableMethods(),
        apiUrl: envUtils.getApiBaseUrl()
      });
    }
  }
};
