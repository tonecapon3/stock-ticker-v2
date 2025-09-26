import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// DEBUG VERSION v0.1.6 - Add logging to find bulk operations
console.log('🚀 Stock Ticker v0.1.6 - DEBUG: Find why bulk operations are called');
import { ClerkProvider } from '@clerk/clerk-react'
import { clerkConfig } from './config/clerk'

// Error boundary component for Clerk initialization errors
class ClerkErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Clerk Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="max-w-md w-full bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Authentication Error</h2>
            <p className="text-gray-300 mb-4">
              There was an error initializing authentication. Please check your Clerk configuration.
            </p>
            <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded mb-4">
              <strong>Error:</strong> {this.state.error?.message}
            </div>
            <div className="text-xs text-gray-500">
              <p>Make sure your VITE_CLERK_PUBLISHABLE_KEY is set correctly in your .env.local file.</p>
              <p>See CLERK_SETUP.md for detailed instructions.</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkErrorBoundary>
      <ClerkProvider
        publishableKey={clerkConfig.publishableKey}
        appearance={clerkConfig.appearance}
        localization={clerkConfig.localization}
      >
        <App />
      </ClerkProvider>
    </ClerkErrorBoundary>
  </React.StrictMode>,
)
// Build timestamp: 1758904507150510000
