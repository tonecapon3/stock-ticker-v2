/**
 * Hybrid Authentication Guard Component
 * 
 * This component guards routes and shows appropriate authentication UI based on
 * the current authentication state and available methods.
 */

import React from 'react';
import { useHybridAuth } from '../../../hooks/auth/useHybridAuth';
import { AuthMethod } from '../../../auth/types';
import { HybridSignIn } from './HybridSignIn';
import AuthLoading from '../AuthLoading';

interface HybridAuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredRole?: string;
  loadingMessage?: string;
}

export const HybridAuthGuard: React.FC<HybridAuthGuardProps> = ({
  children,
  fallback,
  requiredRole,
  loadingMessage = 'Loading authentication...'
}) => {
  const {
    isLoaded,
    isAuthenticated,
    isLoading,
    user,
    authMethod,
    error,
    hasRole
  } = useHybridAuth();

  // Show loading while authentication is initializing
  if (!isLoaded || isLoading) {
    return (
      <AuthLoading 
        message={loadingMessage}
        showSpinner={true}
      />
    );
  }

  // Show error state if there's a critical error
  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-3xl font-bold text-white mb-4">Authentication Error</h1>
            <p className="text-gray-400 mb-6">
              There was a problem with the authentication system.
            </p>
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-900/50 rounded-md p-3">
              {error}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show sign-in if not authenticated
  if (!isAuthenticated) {
    return fallback || <HybridSignIn />;
  }

  // Check role-based access if required
  if (requiredRole && (!user || !hasRole(requiredRole))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-gray-400 mb-6">
              You don't have permission to access this resource.
            </p>
            <div className="text-sm text-gray-300 space-y-2">
              <p>Required role: <span className="font-mono text-blue-400">{requiredRole}</span></p>
              <p>Your role: <span className="font-mono text-yellow-400">{user?.role || 'none'}</span></p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
};

export default HybridAuthGuard;
