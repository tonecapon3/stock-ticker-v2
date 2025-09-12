/**
 * Authentication Method Selector Component
 * 
 * This component allows users to switch between different authentication methods
 * when multiple methods are available.
 */

import React from 'react';
import { AuthMethod } from '../../../auth/types';

interface AuthMethodInfo {
  name: string;
  icon: string;
  description: string;
  badge?: string;
}

interface AuthMethodSelectorProps {
  currentMethod: AuthMethod;
  availableMethods: AuthMethod[];
  onMethodChange: (method: AuthMethod) => void;
  disabled?: boolean;
  showDescriptions?: boolean;
}

const getMethodInfo = (method: AuthMethod): AuthMethodInfo => {
  switch (method) {
    case AuthMethod.JWT:
      return {
        name: 'Username & Password',
        icon: '🔑',
        description: 'Traditional username and password authentication',
        badge: 'Basic'
      };
    case AuthMethod.CLERK:
      return {
        name: 'Clerk Authentication',
        icon: '🛡️',
        description: 'Enterprise-grade secure authentication',
        badge: 'Secure'
      };
    case AuthMethod.AUTO:
      return {
        name: 'Auto Detection',
        icon: '🔄',
        description: 'Automatically choose the best available method',
        badge: 'Smart'
      };
    default:
      return {
        name: 'Authentication',
        icon: '🔐',
        description: 'Sign in to your account'
      };
  }
};

export const AuthMethodSelector: React.FC<AuthMethodSelectorProps> = ({
  currentMethod,
  availableMethods,
  onMethodChange,
  disabled = false,
  showDescriptions = true
}) => {
  if (availableMethods.length <= 1) {
    return null; // Don't show selector if only one method is available
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <h3 className="text-sm font-medium text-gray-300 mb-3">
        Authentication Method
      </h3>
      
      <div className="space-y-2">
        {availableMethods.map((method) => {
          const methodInfo = getMethodInfo(method);
          const isSelected = currentMethod === method;
          
          return (
            <button
              key={method}
              onClick={() => onMethodChange(method)}
              disabled={disabled || isSelected}
              className={`w-full text-left p-3 rounded-md transition-all duration-200 ${
                isSelected
                  ? 'bg-blue-600 text-white border border-blue-500 shadow-sm'
                  : disabled
                  ? 'bg-gray-700 text-gray-500 border border-gray-600 cursor-not-allowed'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{methodInfo.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium flex items-center space-x-2">
                      <span>{methodInfo.name}</span>
                      {methodInfo.badge && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isSelected
                            ? 'bg-blue-400/20 text-blue-100'
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          {methodInfo.badge}
                        </span>
                      )}
                    </div>
                    {showDescriptions && (
                      <div className={`text-xs mt-1 ${
                        isSelected ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {methodInfo.description}
                      </div>
                    )}
                  </div>
                </div>
                
                {isSelected && (
                  <div className="text-blue-200">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="mt-3 p-3 bg-blue-900/20 border border-blue-900/50 rounded-md">
        <div className="flex items-start space-x-2">
          <span className="text-blue-300 text-sm">ℹ️</span>
          <div className="text-xs text-blue-100">
            <p className="font-medium mb-1">About Authentication Methods</p>
            <p>
              Choose the authentication method that works best for your setup. 
              Clerk provides enhanced security features while JWT offers traditional username/password authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthMethodSelector;
