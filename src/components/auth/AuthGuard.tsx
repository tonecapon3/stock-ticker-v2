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
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback
}) => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  // Show loading while authentication state is being determined
  if (!isLoaded) {
    return <AuthLoading message="Checking authentication..." />;
  }

  // If not signed in, redirect to welcome page with return URL
  if (!isSignedIn) {
    return (
      <Navigate 
        to="/welcome" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // User is authenticated - all users have equal access
  return <>{children}</>;
};

/**
 * Legacy AdminGuard - now just wraps AuthGuard since all users have equal access
 */
export const AdminGuard: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  return (
    <AuthGuard fallback={fallback}>
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
