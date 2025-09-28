import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { TickerProvider } from './lib/context';
import { TabContent } from './components/TabContent';
import TickerPage from './pages/TickerPage';
import ControlsPage from './pages/ControlsPage';
import HomePage from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import RemoteControlPanelJWT from './pages/RemoteControlPanelJWT';
import { useSecurity } from './hooks/useSecurity';
import SecurityWarning from './components/SecurityWarning';

// Authentication components
import SignInPage from './components/auth/SignInPage';
import SignUpPage from './components/auth/SignUpPage';
import UserProfilePage, { CompactUserButton, UserInfoDisplay } from './components/auth/UserProfile';
import AuthGuard from './components/auth/AuthGuard';
import AuthLoading from './components/auth/AuthLoading';
import BridgeStatus from './components/auth/BridgeStatus';
import { useAuth } from './hooks/useAuth';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        
        {/* Remote Control Panel Route - Independent JWT Authentication */}
        <Route path="/remote" element={<RemoteControlPanelJWT />} />
        
        {/* Protected Routes - Require Clerk Authentication */}
        <Route 
          path="/" 
          element={
            <AuthGuard>
              <MainApp />
            </AuthGuard>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <AuthGuard>
              <UserProfilePage />
            </AuthGuard>
          } 
        />
        
        {/* Fallback Route - Redirect unauthenticated users to welcome page */}
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </Router>
  );
}

// Separate component for the main app
function MainApp() {
  const securityState = useSecurity();
  const { isLoaded, isSignedIn } = useAuth();

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return <AuthLoading message="Loading application..." />;
  }

  return (
    <TickerProvider>
        <div className="min-h-screen bg-gray-900">
          {/* Security Warning Banner */}
          <SecurityWarning securityState={securityState} />
          {/* Header section */}
          <header className="bg-blue-800 text-white shadow-md">
            <div className="container mx-auto py-4 px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-bold">📈 Stock Ticker</h1>
                    <span className="text-blue-200 text-sm">Stock Simulation Monitoring Tool</span>
                  </div>
                  
                  {/* Navigation Menu */}
                  <nav className="flex space-x-4">
                    <Link 
                      to="/" 
                      className="text-blue-200 hover:text-white transition-colors px-3 py-1 rounded"
                    >
                      Dashboard
                    </Link>
                    <a 
                      href="/remote" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-200 hover:text-white transition-colors px-3 py-1 rounded"
                    >
                      Remote Control Panel
                    </a>
                  </nav>
                </div>
                
                {/* User Navigation - Always show authenticated user (AuthGuard ensures this) */}
                <div className="flex items-center space-x-4">
                  {/* Bridge Status for Clerk users */}
                  <BridgeStatus className="mr-2" />
                  
                  {/* Authenticated user - show profile info */}
                  <UserInfoDisplay />
                  <div className="border-l border-blue-600 pl-4">
                    <CompactUserButton />
                  </div>
                </div>
              </div>
            </div>
          </header>
          
          {/* Main content */}
          <main className="container mx-auto p-6">
            {/* Tabbed layout for ticker and controls */}
            <TabContent 
              ticker={<TickerPage />} 
              controls={<ControlsPage />} 
            />
            
            {/* Default home content */}
            <HomePage />
          </main>
          
          
          {/* Footer section */}
          <footer className="bg-gray-800 border-t border-gray-700 mt-12">
            <div className="container mx-auto py-4 px-6 text-center text-gray-400">
              <p>© {new Date().getFullYear()} Stock Ticker</p>
            </div>
          </footer>
        </div>
      </TickerProvider>
  );
}

export default App;
