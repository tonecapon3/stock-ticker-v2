/**
 * Bridge Status Component
 * 
 * Shows the status of the Clerk-JWT authentication bridge
 */

import React from 'react';
import { useClerkJWTBridge } from '../../hooks/useClerkJWTBridge';
import { useAuth } from '../../hooks/useAuth';

interface BridgeStatusProps {
  showWhenReady?: boolean;
  className?: string;
}

export const BridgeStatus: React.FC<BridgeStatusProps> = ({ 
  showWhenReady = false,
  className = ""
}) => {
  const { isSignedIn } = useAuth();
  const { isBridging, isBridged, bridgeError, isReadyForAPI } = useClerkJWTBridge();

  // Don't show anything if user is not signed in with Clerk
  if (!isSignedIn) {
    return null;
  }

  // Don't show anything if bridge is ready and showWhenReady is false
  if (isReadyForAPI && !showWhenReady) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {isBridging && (
        <div className="flex items-center space-x-2 text-yellow-400 text-sm">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Connecting to API server...</span>
        </div>
      )}

      {bridgeError && (
        <div className="flex items-center space-x-2 text-red-400 text-sm">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>API connection failed</span>
        </div>
      )}

      {isReadyForAPI && showWhenReady && (
        <div className="flex items-center space-x-2 text-green-400 text-sm">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Connected to API server</span>
        </div>
      )}
    </div>
  );
};

export default BridgeStatus;