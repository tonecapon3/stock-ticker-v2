/**
 * Clerk JWT Bridge Hook
 * 
 * This hook automatically bridges Clerk authentication to JWT authentication
 * when a user logs in with Clerk, enabling seamless API access.
 */

import { useEffect, useState, useRef } from 'react';
import { useAuth } from './useAuth';
import { authenticateWithJWTBridge, clearJWTBridge, isJWTBridgeAuthenticated } from '../auth/utils/clerkJwtBridge';

interface BridgeState {
  isBridging: boolean;
  isBridged: boolean;
  error: string | null;
}

export const useJWTAuth = () => {
  const { isSignedIn, isLoaded, user, getToken } = useAuth();
  const [bridgeState, setBridgeState] = useState<BridgeState>({
    isBridging: false,
    isBridged: false,
    error: null
  });
  
  // Ref to prevent multiple simultaneous authentication attempts
  const isAuthenticatingRef = useRef(false);

  // Bridge auth to JWT server (for both Clerk users and anonymous users)
  useEffect(() => {
    const bridgeAuthentication = async () => {
      // Wait for Clerk to load before proceeding
      if (!isLoaded) {
        return;
      }
      
      // If user signed out from Clerk, clear any existing bridge
      if (!isSignedIn && isJWTBridgeAuthenticated()) {
        clearJWTBridge();
        setBridgeState({
          isBridging: false,
          isBridged: false,
          error: null
        });
        // Don't return here - we still want to re-establish JWT auth for anonymous access
      }

      // Skip if already bridged
      if (isJWTBridgeAuthenticated()) {
        setBridgeState(prev => ({
          ...prev,
          isBridged: true,
          error: null
        }));
        return;
      }
      
      // Prevent multiple simultaneous authentication attempts
      if (isAuthenticatingRef.current) {
        console.log('🔄 Authentication already in progress, skipping...');
        return;
      }
      
      // Mark authentication as in progress
      isAuthenticatingRef.current = true;

      // Start bridging process
      setBridgeState(prev => ({
        ...prev,
        isBridging: true,
        error: null
      }));

      try {
        if (isSignedIn && user) {
          console.log(`🔗 Bridging Clerk user ${user.firstName || user.username} to JWT server...`);
        } else {
          console.log('🔗 Authenticating anonymous user with JWT server...');
        }
        
        // Get Clerk token if available
        const clerkToken = isSignedIn ? await getToken() : undefined;
        
        // Bridge to JWT server
        const bridgeResult = await authenticateWithJWTBridge(
          user?.id || 'anonymous', 
          clerkToken || undefined
        );
        
        if (bridgeResult.success) {
          setBridgeState({
            isBridging: false,
            isBridged: true,
            error: null
          });
          if (isSignedIn) {
            console.log('✅ Clerk-JWT bridge established successfully');
          } else {
            console.log('✅ Anonymous JWT authentication established successfully');
          }
        } else {
          setBridgeState({
            isBridging: false,
            isBridged: false,
            error: bridgeResult.error || 'Bridge authentication failed'
          });
        }
      } catch (error) {
        console.error('❌ Failed to authenticate with JWT server:', error);
        setBridgeState({
          isBridging: false,
          isBridged: false,
          error: error instanceof Error ? error.message : 'Unknown authentication error'
        });
      } finally {
        // Always reset authentication flag
        isAuthenticatingRef.current = false;
      }
    };

    bridgeAuthentication();
  }, [isLoaded, isSignedIn, user, getToken]);

  // Auto-retry bridge on error after delay
  useEffect(() => {
    if (bridgeState.error && isSignedIn && isLoaded) {
      const retryTimer = setTimeout(() => {
        setBridgeState(prev => ({
          ...prev,
          error: null
        }));
      }, 5000); // Retry after 5 seconds

      return () => clearTimeout(retryTimer);
    }
  }, [bridgeState.error, isSignedIn, isLoaded]);

  return {
    isBridging: bridgeState.isBridging,
    isBridged: bridgeState.isBridged,
    bridgeError: bridgeState.error,
    // API is ready when JWT bridge is successfully established
    // (works for both Clerk users and anonymous users)
    isReadyForAPI: bridgeState.isBridged && !bridgeState.error
  };
};

// Backward compatibility export
export const useClerkJWTBridge = useJWTAuth;
