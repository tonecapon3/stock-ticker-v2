/**
 * Authentication Guard Component
 * 
 * Protects routes that require authentication by redirecting
 * unauthenticated users to the sign-in page
 */

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthLoading from './AuthLoading';
import { Navigate, useLocation } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAdmin?: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback,
  requireAdmin = false 
}) => {
  const { isLoaded, isSignedIn, isAdmin } = useAuth();
  const location = useLocation();

  // Show loading while authentication state is being determined
  if (!isLoaded) {
    return <AuthLoading message="Checking authentication..." />;
  }

  // If not signed in, redirect to sign-in page with return URL
  if (!isSignedIn) {
    return (
      <Navigate 
        to="/sign-in" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // If admin access is required but user is not admin
  if (requireAdmin && !isAdmin()) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
          <div className="text-red-400 text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-300 mb-4">
            You don't have permission to access this resource. Admin access is required.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
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

/**
 * Simple wrapper for admin-only content
 */
export const AdminGuard: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="text-center text-gray-400">
        <div className="text-2xl mb-2">🔒</div>
        <p>Admin access required</p>
      </div>
    </div>
  )
}) => {
  return (
    <AuthGuard requireAdmin={true} fallback={fallback}>
      {children}
    </AuthGuard>
  );
};

/**
 * Component that shows different content based on authentication status
 */
export const ConditionalAuth: React.FC<{
  authenticated: React.ReactNode;
  unauthenticated: React.ReactNode;
  loading?: React.ReactNode;
}> = ({ authenticated, unauthenticated, loading }) => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return loading ? <>{loading}</> : <AuthLoading showLogo={false} />;
  }

  return isSignedIn ? <>{authenticated}</> : <>{unauthenticated}</>;
};

export default AuthGuard;
