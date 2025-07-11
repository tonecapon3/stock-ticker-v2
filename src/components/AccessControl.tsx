import React, { useState, useEffect } from 'react';

interface AccessControlProps {
  children: React.ReactNode;
}

const ACCESS_CODE = 'Cyb3rR@ngers!0324';

export default function AccessControl({ children }: AccessControlProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already authenticated from sessionStorage
  useEffect(() => {
    const authStatus = sessionStorage.getItem('stock_ticker_auth');
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue === ACCESS_CODE) {
      setIsAuthenticated(true);
      // Store authentication in sessionStorage (expires when browser closes)
      sessionStorage.setItem('stock_ticker_auth', 'authenticated');
    } else {
      // Clear input on wrong code
      setInputValue('');
      // Optional: Add visual feedback for wrong code
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
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center mb-8">
            {/* Simple logo/icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
          </div>
          
          <div>
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder=""
              autoComplete="off"
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
          >
            Enter
          </button>
        </form>
        
        {/* Subtle hint without giving away the code */}
        <div className="text-center mt-8">
          <div className="w-2 h-2 bg-gray-600 rounded-full mx-auto animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
