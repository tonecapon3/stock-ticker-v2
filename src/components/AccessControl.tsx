import React, { useState, useEffect } from 'react';
import { ENV, logger } from '../config/env';

interface AccessControlProps {
  children: React.ReactNode;
}

const ACCESS_CODE = ENV.accessCode;
const SESSION_TIMEOUT = ENV.sessionTimeout;
const MAX_LOGIN_ATTEMPTS = ENV.maxLoginAttempts;

/**
 * Logout by clearing the session storage
 */
export function logout() {
  sessionStorage.removeItem('stock_ticker_auth');
  sessionStorage.removeItem('stock_ticker_auth_time');
  location.reload(); // Refresh to reflect logout
}

export default function AccessControl({ children }: AccessControlProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Check if user is already authenticated from sessionStorage
  useEffect(() => {
    const authStatus = sessionStorage.getItem('stock_ticker_auth');
    const authTimestamp = sessionStorage.getItem('stock_ticker_auth_time');
    
    if (authStatus === 'authenticated' && authTimestamp) {
      const elapsed = Date.now() - parseInt(authTimestamp);
      if (elapsed < SESSION_TIMEOUT) {
        setIsAuthenticated(true);
        logger.debug('User session restored from storage');
      } else {
        // Session expired, clear storage
        sessionStorage.removeItem('stock_ticker_auth');
        sessionStorage.removeItem('stock_ticker_auth_time');
        logger.info('User session expired, cleared storage');
      }
    }
    
    // Load failed attempts from storage
    const storedAttempts = localStorage.getItem('stock_ticker_failed_attempts');
    if (storedAttempts) {
      const attempts = parseInt(storedAttempts);
      setFailedAttempts(attempts);
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        setIsLocked(true);
        logger.warn('Access locked due to too many failed attempts');
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if locked out
    if (isLocked) {
      logger.warn('Login attempt while locked out');
      return;
    }
    
    if (inputValue === ACCESS_CODE) {
      setIsAuthenticated(true);
      setFailedAttempts(0);
      setIsLocked(false);
      
      // Store authentication with timestamp
      const timestamp = Date.now().toString();
      sessionStorage.setItem('stock_ticker_auth', 'authenticated');
      sessionStorage.setItem('stock_ticker_auth_time', timestamp);
      
      // Clear any stored failed attempts
      localStorage.removeItem('stock_ticker_failed_attempts');
      
      logger.info('User successfully authenticated');
    } else {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
      // Store failed attempts count
      localStorage.setItem('stock_ticker_failed_attempts', newFailedAttempts.toString());
      
      // Lock out after max attempts
      if (newFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
        setIsLocked(true);
        logger.warn(`Access locked after ${MAX_LOGIN_ATTEMPTS} failed attempts`);
      } else {
        logger.warn(`Failed login attempt ${newFailedAttempts}/${MAX_LOGIN_ATTEMPTS}`);
      }
      
      // Clear input on wrong code
      setInputValue('');
      
      // Add visual feedback for wrong code
      const input = document.querySelector('input');
      if (input) {
        input.style.borderColor = 'rgb(239, 68, 68)'; // red-500
        setTimeout(() => {
          input.style.borderColor = 'rgb(75, 85, 99)'; // gray-600
        }, 1000);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  // Show loading state briefly to prevent flash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // If authenticated, show the main app
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show access control page
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo and Title */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg 
                      className="w-8 h-8 text-white" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" 
                      />
                    </svg>
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur opacity-30 animate-pulse"></div>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Stock Ticker</h1>
              <p className="text-gray-400 text-sm">Enter access code to continue</p>
            </div>
          
            {/* Input Section */}
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLocked}
                  className={`w-full px-4 py-4 bg-gray-900/70 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 backdrop-blur-sm ${
                    isLocked 
                      ? 'border-red-500/50 focus:ring-red-500/50 opacity-50 cursor-not-allowed' 
                      : 'border-gray-600/50 focus:ring-blue-500/50 hover:border-gray-500/50'
                  }`}
                  placeholder={isLocked ? "Access locked - clear browser data to reset" : "Enter access code"}
                  autoComplete="off"
                  autoFocus={!isLocked}
                />
                {!isLocked && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Status Messages */}
              {failedAttempts > 0 && !isLocked && (
                <div className="flex items-center justify-center space-x-2 text-xs text-red-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>{failedAttempts}/{MAX_LOGIN_ATTEMPTS} incorrect attempts</span>
                </div>
              )}
              
              {isLocked && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-red-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6V7a4 4 0 118 0m-8 8h8m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V9z" />
                    </svg>
                    <div>
                      <div className="font-medium text-sm">Access Temporarily Locked</div>
                      <div className="text-xs text-red-300">Too many failed attempts. Clear browser data to reset.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLocked || !inputValue}
              className={`w-full py-4 px-6 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${
                isLocked
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
                  : inputValue
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg focus:ring-blue-500/50 transform hover:scale-[1.02]'
                  : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
              }`}
            >
              {isLocked ? (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6V7a4 4 0 118 0m-8 8h8m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V9z" />
                  </svg>
                  <span>Locked</span>
                </span>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <span>Access Stock Ticker</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </form>
          
          {/* Additional Info */}
          <div className="mt-6 text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Secure access required</span>
            </div>
            
            {/* Development helper - only show in development mode */}
            {import.meta.env.DEV && (
              <div className="text-xs text-gray-600 bg-gray-800/30 rounded px-2 py-1">
                🔧 Dev: Access code is from VITE_ACCESS_CODE env var
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
