/**
 * Authentication Loading Component
 * 
 * Shows a loading state while Clerk authentication is initializing
 */

import React from 'react';

interface AuthLoadingProps {
  message?: string;
  showLogo?: boolean;
}

export const AuthLoading: React.FC<AuthLoadingProps> = ({
  message = 'Loading authentication...',
  showLogo = true,
}) => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {showLogo && (
          <div className="mb-8">
            <div className="text-6xl mb-4">📈</div>
            <h1 className="text-3xl font-bold text-white mb-2">Stock Ticker</h1>
            <p className="text-gray-400">Real-time market monitoring</p>
          </div>
        )}
        
        <div className="flex flex-col items-center space-y-4">
          {/* Spinning loader */}
          <div className="relative">
            <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-blue-400 rounded-full animate-spin animate-reverse" style={{ animationDelay: '0.2s' }}></div>
          </div>
          
          <div className="text-white font-medium">{message}</div>
          <div className="text-sm text-gray-400">Please wait a moment...</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact loading component for smaller areas
 */
export const AuthLoadingCompact: React.FC<{ message?: string }> = ({
  message = 'Loading...',
}) => {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-sm text-gray-400">{message}</div>
      </div>
    </div>
  );
};

export default AuthLoading;
