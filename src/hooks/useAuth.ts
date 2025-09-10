/**
 * Custom authentication hooks and utilities using Clerk
 * 
 * This file provides convenient hooks and utilities for authentication
 * throughout the Stock Ticker application.
 */

import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/clerk-react';
import { useCallback } from 'react';

/**
 * Enhanced authentication hook that provides additional utilities
 * and consistent interface for the Stock Ticker app
 */
export const useAuth = () => {
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useClerkAuth();
  const { user } = useUser();
  const clerk = useClerk();

  // Sign out function with optional callback and better error handling
  const signOut = useCallback(
    async (callback?: () => void) => {
      try {
        await clerk.signOut();
        if (callback) {
          callback();
        }
      } catch (error) {
        console.error('Error during sign out:', error);
        
        // Try alternative sign-out method if the first one fails
        try {
          // Force clear session locally if network request fails
          localStorage.removeItem('__clerk_client_jwt');
          sessionStorage.clear();
          
          // Redirect to sign-in page manually
          if (typeof window !== 'undefined') {
            window.location.href = '/sign-in';
          }
        } catch (fallbackError) {
          console.error('Fallback sign-out also failed:', fallbackError);
          // As a last resort, reload the page
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }
        
        if (callback) {
          callback();
        }
      }
    },
    [clerk]
  );

  // Get authentication token for API calls
  const getAuthToken = useCallback(async () => {
    try {
      if (!isSignedIn) return null;
      return await getToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }, [getToken, isSignedIn]);

  // Check if user has specific role (if using Clerk's organization features)
  const hasRole = useCallback(
    (role: string) => {
      if (!user) return false;
      // This would need to be implemented based on your role structure
      // For now, we'll check if the user has admin in their metadata
      const userRole = user.publicMetadata?.role as string;
      return userRole === role;
    },
    [user]
  );

  // Check if user is admin (helper function)
  const isAdmin = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  // User display information
  const userInfo = {
    id: userId,
    email: user?.primaryEmailAddress?.emailAddress,
    firstName: user?.firstName,
    lastName: user?.lastName,
    fullName: user?.fullName,
    username: user?.username,
    imageUrl: user?.imageUrl,
    role: user?.publicMetadata?.role as string || 'user',
  };

  return {
    // Loading and authentication state
    isLoaded,
    isSignedIn,
    isLoading: !isLoaded,
    
    // User information
    user,
    userInfo,
    userId,
    sessionId,
    
    // Authentication actions
    signOut,
    getAuthToken,
    
    // Role-based access
    hasRole,
    isAdmin,
    
    // Clerk instance (for advanced usage)
    clerk,
  };
};

/**
 * Hook for authentication state only (lighter version)
 */
export const useAuthState = () => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  
  return {
    isLoaded,
    isSignedIn,
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn,
  };
};

/**
 * Hook for user information only
 */
export const useUserInfo = () => {
  const { user } = useUser();
  const { userId } = useClerkAuth();
  
  if (!user) {
    return {
      isLoaded: false,
      user: null,
      userInfo: null,
    };
  }

  const userInfo = {
    id: userId,
    email: user.primaryEmailAddress?.emailAddress,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    username: user.username,
    imageUrl: user.imageUrl,
    role: user.publicMetadata?.role as string || 'user',
  };

  return {
    isLoaded: true,
    user,
    userInfo,
  };
};

/**
 * Authentication status constants
 */
export const AUTH_STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
} as const;

export type AuthStatus = typeof AUTH_STATUS[keyof typeof AUTH_STATUS];

/**
 * Get current authentication status
 */
export const getAuthStatus = (isLoaded: boolean, isSignedIn: boolean): AuthStatus => {
  if (!isLoaded) return AUTH_STATUS.LOADING;
  return isSignedIn ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.UNAUTHENTICATED;
};
