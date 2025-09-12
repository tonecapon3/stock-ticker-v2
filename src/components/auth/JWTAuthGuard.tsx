/**
 * JWT Authentication Guard Component
 * 
 * This component provides JWT-only authentication for the Remote Control Panel.
 * It does not depend on Clerk and manages its own JWT token state.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, shouldUseApiServer } from '../../lib/config';

interface JWTUser {
  id: string;
  username: string;
  role: string;
  email?: string;
}

interface JWTAuthState {
  user: JWTUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastError: string | null;
}

interface JWTAuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireRole?: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

const JWTAuthGuard: React.FC<JWTAuthGuardProps> = ({ 
  children, 
  fallback,
  requireRole 
}) => {
  const [state, setState] = useState<JWTAuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    lastError: null,
  });

  const [loginForm, setLoginForm] = useState<LoginCredentials>({ 
    username: '', 
    password: '' 
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const API_BASE = `${getApiBaseUrl()}/api/remote`;

  // Initialize token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('remote-token');
    if (savedToken) {
      verifyToken(savedToken);
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Verify token with server
  const verifyToken = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          user: data.user,
          token,
          isAuthenticated: true,
          isLoading: false,
          lastError: null,
        }));
        return true;
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('remote-token');
        setState(prev => ({
          ...prev,
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          lastError: null,
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        lastError: 'Connection failed',
      }));
      return false;
    }
  }, [API_BASE]);

  // Login function
  const login = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setState(prev => ({ ...prev, lastError: null }));

    try {
      const response = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('remote-token', data.token);
        setState(prev => ({
          ...prev,
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          lastError: null,
        }));
        setLoginForm({ username: '', password: '' });
      } else {
        setState(prev => ({
          ...prev,
          lastError: data.error || 'Login failed',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: 'Connection failed',
      }));
    } finally {
      setIsLoggingIn(false);
    }
  }, [loginForm, API_BASE]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('remote-token');
    setState(prev => ({
      ...prev,
      user: null,
      token: null,
      isAuthenticated: false,
      lastError: null,
    }));
  }, []);

  // Check if API server is available
  if (!shouldUseApiServer()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🏭</div>
            <h1 className="text-3xl font-bold text-white mb-4">Production Mode</h1>
            <p className="text-gray-400 mb-6">
              The Remote Control Panel is not available in production environment.
            </p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">ℹ️ Information</h2>
            <div className="text-sm text-gray-300 space-y-2">
              <p>• The application is running in local-only mode</p>
              <p>• API server connectivity is disabled</p>
              <p>• Stock data updates are handled locally</p>
              <p>• All remote control features are unavailable</p>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            To enable remote controls, configure VITE_API_BASE_URL environment variable.
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-white text-lg">Loading authentication...</div>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!state.isAuthenticated) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="text-4xl mb-4">🔑</div>
            <h2 className="text-3xl font-extrabold text-white">Remote Control Panel</h2>
            <p className="mt-2 text-sm text-gray-400">Sign in with your credentials</p>
          </div>

          {/* Error Display */}
          {state.lastError && (
            <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm">{state.lastError}</span>
                <button
                  onClick={() => setState(prev => ({ ...prev, lastError: null }))}
                  className="text-red-300 hover:text-white ml-4"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Login Form */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <form onSubmit={login} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={loginForm.username}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your username"
                    disabled={isLoggingIn}
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || !loginForm.username || !loginForm.password}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Enter your credentials to access the remote control panel
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check role-based access if required
  if (requireRole && (!state.user || state.user.role !== requireRole)) {
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
              <p>Required role: <span className="font-mono text-blue-400">{requireRole}</span></p>
              <p>Your role: <span className="font-mono text-yellow-400">{state.user?.role || 'none'}</span></p>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
};

export default JWTAuthGuard;
