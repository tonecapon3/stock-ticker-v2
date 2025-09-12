/**
 * Hybrid Sign-In Component
 * 
 * This component provides a unified sign-in interface that can handle both
 * JWT and Clerk authentication methods, with method selection and fallback.
 */

import React, { useState, useCallback } from 'react';
import { SignIn } from '@clerk/clerk-react';
import { useHybridAuth } from '../../../hooks/auth/useHybridAuth';
import { AuthMethod, JWTCredentials } from '../../../auth/types';
import { envUtils } from '../../../auth/utils';
import { getAuthConfig } from '../../../config/auth';

interface HybridSignInProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  allowMethodSwitching?: boolean;
  title?: string;
  subtitle?: string;
}

export const HybridSignIn: React.FC<HybridSignInProps> = ({
  onSuccess,
  onError,
  allowMethodSwitching = true,
  title = 'Sign In',
  subtitle = 'Access your account'
}) => {
  const {
    signInWithJWT,
    signInWithClerk,
    switchAuthMethod,
    authMethod,
    error,
    isLoading,
    clearError
  } = useHybridAuth();

  const config = getAuthConfig();
  const availableMethods = envUtils.getAvailableMethods();

  // Form state for JWT sign-in
  const [credentials, setCredentials] = useState<JWTCredentials>({
    username: '',
    password: ''
  });

  // Current selected method for sign-in
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod>(
    authMethod || config.preferredMethod || availableMethods[0] || AuthMethod.JWT
  );

  /**
   * Handle JWT form submission
   */
  const handleJWTSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!credentials.username || !credentials.password) {
      return;
    }

    try {
      const response = await signInWithJWT(credentials);
      if (response.success) {
        onSuccess?.();
      } else {
        onError?.(response.error || 'Sign-in failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Sign-in failed';
      onError?.(errorMsg);
    }
  }, [credentials, signInWithJWT, clearError, onSuccess, onError]);

  /**
   * Handle Clerk sign-in
   */
  const handleClerkSignIn = useCallback(async () => {
    clearError();
    
    try {
      const response = await signInWithClerk();
      if (response.success) {
        // Clerk will redirect to sign-in page
        onSuccess?.();
      } else {
        onError?.(response.error || 'Clerk sign-in failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Clerk sign-in failed';
      onError?.(errorMsg);
    }
  }, [signInWithClerk, clearError, onSuccess, onError]);

  /**
   * Switch authentication method
   */
  const handleMethodSwitch = useCallback(async (method: AuthMethod) => {
    if (method === selectedMethod) return;

    try {
      await switchAuthMethod(method);
      setSelectedMethod(method);
      clearError();
    } catch (error) {
      console.error('Method switch failed:', error);
    }
  }, [selectedMethod, switchAuthMethod, clearError]);

  /**
   * Get method display information
   */
  const getMethodInfo = (method: AuthMethod) => {
    switch (method) {
      case AuthMethod.JWT:
        return {
          name: 'Username & Password',
          icon: '🔑',
          description: 'Sign in with your username and password'
        };
      case AuthMethod.CLERK:
        return {
          name: 'Clerk Authentication',
          icon: '🛡️',
          description: 'Sign in with secure Clerk authentication'
        };
      default:
        return {
          name: 'Authentication',
          icon: '🔐',
          description: 'Sign in to your account'
        };
    }
  };

  const currentMethodInfo = getMethodInfo(selectedMethod);

  // Show Clerk UI if using Clerk method
  if (selectedMethod === AuthMethod.CLERK && config.enableClerk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="text-4xl mb-4">🛡️</div>
            <h2 className="text-3xl font-extrabold text-white">{title}</h2>
            <p className="mt-2 text-sm text-gray-400">Enterprise-grade authentication</p>
          </div>

          {/* Method Selector */}
          {allowMethodSwitching && config.allowMethodSwitching && availableMethods.length > 1 && (
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Switch Method</h3>
              <div className="space-y-2">
                {availableMethods.map((method) => {
                  const methodInfo = getMethodInfo(method);
                  return (
                    <button
                      key={method}
                      onClick={() => handleMethodSwitch(method)}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        selectedMethod === method
                          ? 'bg-blue-600 text-white border border-blue-500'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{methodInfo.icon}</span>
                        <div>
                          <div className="font-medium">{methodInfo.name}</div>
                          <div className="text-xs opacity-75">{methodInfo.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clerk Sign-In */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <SignIn 
              appearance={{
                baseTheme: 'dark',
                variables: {
                  colorPrimary: '#3b82f6',
                  colorBackground: '#1f2937',
                  colorInputBackground: '#374151',
                  colorInputText: '#f3f4f6',
                  colorText: '#f3f4f6',
                }
              }}
              redirectUrl="/remote-control"
            />
          </div>
        </div>
      </div>
    );
  }

  // JWT Authentication Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-4">{currentMethodInfo.icon}</div>
          <h2 className="text-3xl font-extrabold text-white">{title}</h2>
          <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
        </div>

        {/* Method Selector */}
        {allowMethodSwitching && config.allowMethodSwitching && availableMethods.length > 1 && (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Authentication Method</h3>
            <div className="space-y-2">
              {availableMethods.map((method) => {
                const methodInfo = getMethodInfo(method);
                return (
                  <button
                    key={method}
                    onClick={() => handleMethodSwitch(method)}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      selectedMethod === method
                        ? 'bg-blue-600 text-white border border-blue-500'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{methodInfo.icon}</span>
                      <div>
                        <div className="font-medium">{methodInfo.name}</div>
                        <div className="text-xs opacity-75">{methodInfo.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm">{error}</span>
              <button
                onClick={clearError}
                className="text-red-300 hover:text-white ml-4"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* JWT Sign-In Form */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <form onSubmit={handleJWTSubmit} className="space-y-6">
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
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your username"
                  disabled={isLoading}
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
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !credentials.username || !credentials.password}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
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
};

export default HybridSignIn;
