import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TickerProvider } from './lib/context';
import { TabContent } from './components/TabContent';
import TickerPage from './pages/TickerPage';
import ControlsPage from './pages/ControlsPage';
import HomePage from './pages/HomePage';
import RemoteControlPanel from './pages/RemoteControlPanel';
import RemoteControlPanelClerk from './pages/RemoteControlPanelClerk';
import { useSecurity } from './hooks/useSecurity';
import SecurityWarning from './components/SecurityWarning';

// Authentication components
import SignInPage from './components/auth/SignInPage';
import SignUpPage from './components/auth/SignUpPage';
import UserProfilePage, { CompactUserButton, UserInfoDisplay } from './components/auth/UserProfile';
import AuthGuard from './components/auth/AuthGuard';
import AuthLoading from './components/auth/AuthLoading';
import { useAuth } from './hooks/useAuth';

function App() {
  return (
    <Router>
      <Routes>
        {/* Authentication Routes - Public */}
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        
        {/* User Profile Route - Protected */}
        <Route 
          path="/profile" 
          element={
            <AuthGuard>
              <UserProfilePage />
            </AuthGuard>
          } 
        />
        
        {/* Remote Control Panel Route - Protected */}
        <Route 
          path="/remote" 
          element={
            <AuthGuard>
              <RemoteControlPanelClerk />
            </AuthGuard>
          } 
        />
        
        {/* Main Application Route - Protected */}
        <Route 
          path="/" 
          element={
            <AuthGuard>
              <MainApp />
            </AuthGuard>
          } 
        />
        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

// Separate component for the main app
function MainApp() {
  const securityState = useSecurity();
  const { isLoaded } = useAuth();

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
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold">📈 Stock Ticker</h1>
                  <span className="text-blue-200 text-sm">Real-time market monitoring</span>
                </div>
                
                {/* User Navigation */}
                <div className="flex items-center space-x-4">
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
