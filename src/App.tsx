import React from 'react';
import { TickerProvider } from './lib/context';
import AccessControl from './components/AccessControl';
import { TabContent } from './components/TabContent';
import TickerPage from './pages/TickerPage';
import ControlsPage from './pages/ControlsPage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <AccessControl>
      <TickerProvider>
        <div className="min-h-screen bg-gray-900">
          {/* Header section */}
          <header className="bg-blue-800 text-white shadow-md">
            <div className="container mx-auto py-4 px-6">
              <h1 className="text-2xl font-bold">Stock Ticker</h1>
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
    </AccessControl>
  );
}

export default App;
