/**
 * Sign Up Page Component
 * 
 * Provides a sign-up interface using Clerk's SignUp component
 * with custom styling to match the Stock Ticker app theme
 */

import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

const SignUpPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📈</div>
          <h1 className="text-3xl font-bold text-white mb-2">Join Stock Ticker</h1>
          <p className="text-gray-400">Create your account to get started</p>
        </div>

        {/* Clerk Sign Up Component */}
        <div className="flex justify-center">
          <SignUp 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-gray-800 shadow-xl border border-gray-700",
                headerTitle: "text-white text-2xl",
                headerSubtitle: "text-gray-300",
                socialButtonsIconButton: "border-gray-600 hover:border-gray-500",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                footerActionText: "text-gray-300",
                footerActionLink: "text-blue-400 hover:text-blue-300",
                formFieldInput: "bg-gray-700 border-gray-600 text-white placeholder-gray-400",
                formFieldLabel: "text-gray-300",
                identityPreviewEditButton: "text-blue-400 hover:text-blue-300",
                formHeaderTitle: "text-white",
                formHeaderSubtitle: "text-gray-300",
              },
              variables: {
                colorPrimary: "#3B82F6",
                colorBackground: "#1F2937",
                colorInputBackground: "#374151",
                colorInputText: "#F9FAFB",
                colorText: "#F9FAFB",
              },
            }}
            redirectUrl="/"
            signInUrl="/sign-in"
          />
        </div>

        {/* Additional Links */}
        <div className="mt-8 text-center">
          <div className="text-sm text-gray-400">
            Already have an account?{' '}
            <Link 
              to="/sign-in" 
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign in here
            </Link>
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            <Link 
              to="/" 
              className="hover:text-gray-400"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mt-12 bg-blue-900/20 border border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">🎉 Welcome to Stock Ticker!</h3>
          <div className="text-sm text-gray-300 space-y-2">
            <p>By creating an account, you'll get access to:</p>
            <ul className="list-disc ml-5 space-y-1 text-gray-400">
              <li>Real-time stock price monitoring</li>
              <li>Personalized portfolio dashboard</li>
              <li>Advanced control panel features</li>
              <li>Secure data storage and sync</li>
              <li>Custom alerts and notifications</li>
            </ul>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <span>🔒</span>
              <span>Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>⚡</span>
              <span>Fast</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>🔄</span>
              <span>Real-time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
