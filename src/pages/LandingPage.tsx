import React from 'react';
import { Link } from 'react-router-dom';
import { useSecurity } from '../hooks/useSecurity';
import SecurityWarning from '../components/SecurityWarning';

export default function LandingPage() {
  const securityState = useSecurity();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Security Warning Banner */}
      <SecurityWarning securityState={securityState} />
      
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-md">
        <div className="container mx-auto py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">📈 X-Force Range Stock Ticker</h1>
              <span className="text-blue-200 text-sm">Stock Market Simulation Tool</span>
            </div>
            
            {/* Authentication Links */}
            <div className="flex items-center space-x-4">
              <Link 
                to="/sign-in" 
                className="text-blue-200 hover:text-white transition-colors px-3 py-1 rounded"
              >
                Sign In
              </Link>
              <Link 
                to="/sign-up" 
                className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="text-6xl mb-6">📈</div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            X-Force Range Stock Ticker
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Monitor stock prices, manage your stock portfolio, and control market simulations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/sign-up"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
            >
              Start Monitoring
            </Link>
            <Link 
              to="/sign-in"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-3">Real-time Monitoring</h3>
            <p className="text-gray-400">
              Track stock prices with live updates and comprehensive price history charts.
            </p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-center">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-xl font-semibold text-white mb-3">Control Panel</h3>
            <p className="text-gray-400">
              Advanced controls for managing stock simulations, volatility settings, and market conditions.
            </p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-white mb-3">Secure Access</h3>
            <p className="text-gray-400">
              Protected user accounts with secure authentication and personalized portfolio management.
            </p>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <Link 
            to="/sign-up"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
          >
            Create Your Account
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-16">
        <div className="container mx-auto py-6 px-6 text-center text-gray-400">
          <p>© {new Date().getFullYear()} X-Force Range Stock Ticker</p>
        </div>
      </footer>
    </div>
  );
}