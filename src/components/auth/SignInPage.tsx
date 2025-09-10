/**
 * Sign In Page Component
 * 
 * Provides a sign-in interface using Clerk's SignIn component
 * with custom styling to match the Stock Ticker app theme
 */

import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

const SignInPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📈</div>
          <h1 className="text-3xl font-bold text-white mb-2">Stock Ticker</h1>
          <p className="text-gray-400">Sign in to access your dashboard</p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="flex justify-center">
          <SignIn 
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
            signUpUrl="/sign-up"
          />
        </div>

        {/* Additional Links */}
        <div className="mt-8 text-center">
          <div className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link 
              to="/sign-up" 
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign up here
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

        {/* Features Preview */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-white mb-4">What you'll get access to:</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="bg-gray-800 p-3 rounded-md border border-gray-700">
              <div className="text-blue-400 mb-1">📊 Real-time Stock Monitoring</div>
              <div className="text-gray-400">Track your favorite stocks with live updates</div>
            </div>
            <div className="bg-gray-800 p-3 rounded-md border border-gray-700">
              <div className="text-green-400 mb-1">⚙️ Control Panel Access</div>
              <div className="text-gray-400">Manage prices, settings, and configurations</div>
            </div>
            <div className="bg-gray-800 p-3 rounded-md border border-gray-700">
              <div className="text-purple-400 mb-1">🔒 Secure Dashboard</div>
              <div className="text-gray-400">Protected access to your personal portfolio</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
