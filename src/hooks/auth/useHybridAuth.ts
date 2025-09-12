/**
 * Hybrid authentication hook that manages both JWT and Clerk authentication
 * 
 * This hook provides a unified interface for authentication that can work with
 * either JWT tokens or Clerk authentication, with automatic fallback capabilities.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import {
  AuthMethod,
  UnifiedUser,
  JWTCredentials,
  AuthResponse,
  AuthState,
  HybridAuthHook
} from '../../auth/types';
import {
  tokenStorage,
  jwtUtils,
  userUtils,
  envUtils,
  apiUtils,
  debugUtils
} from '../../auth/utils';
import { getAuthConfig, getMethodPriority } from '../../config/auth';

/**
 * Main hybrid authentication hook
 */
export const useHybridAuth = (): HybridAuthHook => {
  // Get configuration
  const config = getAuthConfig();
  const methodPriority = getMethodPriority(config);

  // Clerk hooks (only if Clerk is available)
  const clerkAuth = config.enableClerk ? useClerkAuth() : null;
  const clerkUser = config.enableClerk ? useUser() : null;

  // Local state
  const [authState, setAuthState] = useState<AuthState>({
    isLoaded: false,
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
    authMethod: null,
    error: null
  });

  // Track initialization
  const initializationAttempted = useRef(false);
  const currentMethod = useRef<AuthMethod | null>(null);

  /**
   * Update authentication state
   */
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
    debugUtils.logAuthState({ ...authState, ...updates }, 'HYBRID_AUTH');
  }, [authState]);

  /**
   * Clear authentication state
   */
  const clearAuthState = useCallback(() => {
    tokenStorage.clearAll();
    currentMethod.current = null;
    updateAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      authMethod: null,
      error: null,
      isLoading: false
    });
  }, [updateAuthState]);

  /**
   * Set authentication error
   */
  const setAuthError = useCallback((error: string) => {
    updateAuthState({ error, isLoading: false });
  }, [updateAuthState]);

  /**
   * Clear authentication error
   */
  const clearError = useCallback(() => {
    updateAuthState({ error: null });
  }, [updateAuthState]);

  /**
   * Initialize authentication from stored data
   */
  const initializeAuth = useCallback(async () => {
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    updateAuthState({ isLoading: true, error: null });

    // Try to restore from stored authentication method
    const storedMethod = tokenStorage.getAuthMethod();
    const storedToken = tokenStorage.getJWTToken();
    const storedUser = tokenStorage.getUserData();

    // Check Clerk authentication first (if available and loaded)
    if (config.enableClerk && clerkAuth?.isLoaded && clerkAuth?.isSignedIn && clerkUser?.user) {
      try {
        const token = await clerkAuth.getToken();
        const user = userUtils.clerkToUnified(clerkUser.user, clerkUser.user.publicMetadata);
        
        tokenStorage.setAuthMethod(AuthMethod.CLERK);
        tokenStorage.setUserData(user);
        currentMethod.current = AuthMethod.CLERK;
        
        updateAuthState({
          isLoaded: true,
          isAuthenticated: true,
          user,
          token,
          authMethod: AuthMethod.CLERK,
          isLoading: false,
          error: null
        });
        return;
      } catch (error) {
        console.error('Failed to initialize Clerk auth:', error);
      }
    }

    // Check JWT authentication if token exists
    if (config.enableJWT && storedToken && storedUser) {
      // Verify token is not expired
      if (!jwtUtils.isTokenExpired(storedToken)) {
        try {
          // Verify token with server
          const response = await apiUtils.authenticatedFetch('/auth', {}, storedToken);
          const authResponse = await apiUtils.handleAuthResponse(response);
          
          if (authResponse.success && authResponse.user) {
            currentMethod.current = AuthMethod.JWT;
            updateAuthState({
              isLoaded: true,
              isAuthenticated: true,
              user: authResponse.user,
              token: storedToken,
              authMethod: AuthMethod.JWT,
              isLoading: false,
              error: null
            });
            return;
          }
        } catch (error) {
          console.error('JWT token validation failed:', error);
        }
      }
      
      // Clean up invalid JWT data
      tokenStorage.removeJWTToken();
      tokenStorage.clearAll();
    }

    // No valid authentication found
    updateAuthState({
      isLoaded: true,
      isAuthenticated: false,
      user: null,
      token: null,
      authMethod: null,
      isLoading: false,
      error: null
    });
  }, [config, clerkAuth, clerkUser, updateAuthState]);

  /**
   * Sign in with JWT credentials
   */
  const signInWithJWT = useCallback(async (credentials: JWTCredentials): Promise<AuthResponse> => {
    if (!config.enableJWT) {
      return {
        success: false,
        authMethod: AuthMethod.JWT,
        error: 'JWT authentication is not enabled'
      };
    }

    updateAuthState({ isLoading: true, error: null });

    try {
      const response = await apiUtils.authenticatedFetch('/auth', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      const authResponse = await apiUtils.handleAuthResponse(response);

      if (authResponse.success && authResponse.user && authResponse.token) {
        // Store JWT data
        tokenStorage.setJWTToken(authResponse.token);
        tokenStorage.setAuthMethod(AuthMethod.JWT);
        tokenStorage.setUserData(authResponse.user);
        currentMethod.current = AuthMethod.JWT;

        updateAuthState({
          isAuthenticated: true,
          user: authResponse.user,
          token: authResponse.token,
          authMethod: AuthMethod.JWT,
          isLoading: false,
          error: null
        });

        return authResponse;
      } else {
        updateAuthState({
          isLoading: false,
          error: authResponse.error || 'JWT sign-in failed'
        });
        return authResponse;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'JWT sign-in failed';
      updateAuthState({
        isLoading: false,
        error: errorMsg
      });

      return {
        success: false,
        authMethod: AuthMethod.JWT,
        error: errorMsg
      };
    }
  }, [config.enableJWT, updateAuthState]);

  /**
   * Sign in with Clerk (redirect to Clerk sign-in)
   */
  const signInWithClerk = useCallback(async (): Promise<AuthResponse> => {
    if (!config.enableClerk || !clerkAuth) {
      return {
        success: false,
        authMethod: AuthMethod.CLERK,
        error: 'Clerk authentication is not available'
      };
    }

    try {
      // Redirect to Clerk sign-in page
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in';
      }

      return {
        success: true,
        authMethod: AuthMethod.CLERK
      };
    } catch (error) {
      return {
        success: false,
        authMethod: AuthMethod.CLERK,
        error: error instanceof Error ? error.message : 'Clerk sign-in failed'
      };
    }
  }, [config.enableClerk, clerkAuth]);

  /**
   * Sign out from current authentication method
   */
  const signOut = useCallback(async (): Promise<void> => {
    updateAuthState({ isLoading: true });

    try {
      // Sign out from Clerk if currently using Clerk
      if (authState.authMethod === AuthMethod.CLERK && clerkAuth?.signOut) {
        await clerkAuth.signOut();
      }

      // Clear all local data
      clearAuthState();
    } catch (error) {
      console.error('Sign-out error:', error);
      // Clear state anyway
      clearAuthState();
    }
  }, [authState.authMethod, clerkAuth, clearAuthState, updateAuthState]);

  /**
   * Switch authentication method
   */
  const switchAuthMethod = useCallback(async (method: AuthMethod): Promise<void> => {
    if (!config.allowMethodSwitching) {
      throw new Error('Method switching is not allowed');
    }

    if (currentMethod.current === method) {
      return; // Already using this method
    }

    // Sign out from current method first
    if (authState.isAuthenticated) {
      await signOut();
    }

    // Update preferred method and reinitialize
    currentMethod.current = method;
    tokenStorage.setAuthMethod(method);
    
    // Let the component handle re-authentication with the new method
    updateAuthState({ authMethod: method, error: null });
  }, [config.allowMethodSwitching, authState.isAuthenticated, signOut, updateAuthState]);

  /**
   * Get current authentication token
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!authState.isAuthenticated) {
      return null;
    }

    if (authState.authMethod === AuthMethod.CLERK && clerkAuth?.getToken) {
      try {
        return await clerkAuth.getToken();
      } catch (error) {
        console.error('Failed to get Clerk token:', error);
        return null;
      }
    }

    if (authState.authMethod === AuthMethod.JWT && authState.token) {
      // Check if JWT token is still valid
      if (jwtUtils.isTokenExpired(authState.token)) {
        console.warn('JWT token has expired');
        return null;
      }
      return authState.token;
    }

    return null;
  }, [authState.isAuthenticated, authState.authMethod, authState.token, clerkAuth]);

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((role: string): boolean => {
    return authState.user ? userUtils.hasRole(authState.user, role) : false;
  }, [authState.user]);

  /**
   * Check if user is admin
   */
  const isAdmin = useCallback((): boolean => {
    return authState.user ? userUtils.isAdmin(authState.user) : false;
  }, [authState.user]);

  // Initialize authentication on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Handle Clerk authentication state changes
  useEffect(() => {
    if (!config.enableClerk || !clerkAuth) return;

    if (clerkAuth.isLoaded) {
      if (clerkAuth.isSignedIn && clerkUser?.user && currentMethod.current !== AuthMethod.JWT) {
        // User signed in with Clerk
        const user = userUtils.clerkToUnified(clerkUser.user, clerkUser.user.publicMetadata);
        tokenStorage.setAuthMethod(AuthMethod.CLERK);
        tokenStorage.setUserData(user);
        currentMethod.current = AuthMethod.CLERK;

        clerkAuth.getToken().then(token => {
          updateAuthState({
            isLoaded: true,
            isAuthenticated: true,
            user,
            token,
            authMethod: AuthMethod.CLERK,
            isLoading: false,
            error: null
          });
        }).catch(error => {
          console.error('Failed to get Clerk token:', error);
          setAuthError('Failed to get authentication token');
        });
      } else if (!clerkAuth.isSignedIn && authState.authMethod === AuthMethod.CLERK) {
        // User signed out from Clerk
        clearAuthState();
      }

      if (!authState.isLoaded) {
        updateAuthState({ isLoaded: true, isLoading: false });
      }
    }
  }, [config.enableClerk, clerkAuth, clerkUser, authState.authMethod, authState.isLoaded, updateAuthState, clearAuthState, setAuthError]);

  // Log availability on mount (development only)
  useEffect(() => {
    debugUtils.logAvailability();
  }, []);

  return {
    // State
    isLoaded: authState.isLoaded,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    user: authState.user,
    authMethod: authState.authMethod,
    error: authState.error,

    // Actions
    signInWithJWT,
    signInWithClerk,
    signOut,
    switchAuthMethod,
    getToken,
    clearError,

    // Role-based access
    hasRole,
    isAdmin
  };
};
