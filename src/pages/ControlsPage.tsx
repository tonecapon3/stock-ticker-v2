import React, { useState, FormEvent, useEffect } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { useTickerContext } from '../lib/context';
import { StockInfo, Currency, CURRENCIES, formatPrice } from '../lib/types';
import { shouldUseApiServer, buildApiUrl, API_ENDPOINTS } from '../lib/config';

// Add global style for select dropdowns
// This is needed because select option styling is not consistently supported across browsers
const styleOptionsForDarkMode = () => {
  // Create a style element if it doesn't exist
  if (!document.getElementById('dark-select-options')) {
    const style = document.createElement('style');
    style.id = 'dark-select-options';
    style.innerHTML = `
      select option {
        background-color: black;
        color: white;
      }
      select option:hover, select option:focus {
        background-color: #1f2937;
      }
      
      /* Custom slider styling for dark mode */
      input[type=range] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 8px;
        background: #374151; /* gray-700 */
        border-radius: 5px;
        outline: none;
      }
      
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: #3b82f6; /* blue-500 */
        border-radius: 50%;
        cursor: pointer;
      }
      
      input[type=range]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #3b82f6; /* blue-500 */
        border-radius: 50%;
        cursor: pointer;
        border: none;
      }
      
      input[type=range]::-webkit-slider-runnable-track {
        height: 8px;
        background: #374151; /* gray-700 */
        border-radius: 5px;
      }
      
      input[type=range]::-moz-range-track {
        height: 8px;
        background: #374151; /* gray-700 */
        border-radius: 5px;
      }
    `;
    document.head.appendChild(style);
  }
};

export default function ControlsPage() {
  const { signOut } = useClerk();
  const { tickerState, setPrice, updateSpeed, togglePause, addStock, removeStock, changeCurrency } = useTickerContext();
  const { stocks, updateIntervalMs, isPaused, selectedCurrency } = tickerState;

  // Hydration state to prevent SSR mismatch
  const [isHydrated, setIsHydrated] = useState(false);

  // State for the new stock form
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockName, setNewStockName] = useState('');
  const [newStockPrice, setNewStockPrice] = useState('');
  const [formError, setFormError] = useState('');

  // State for selected stock
  const [selectedStock, setSelectedStock] = useState<string>('');
  
  // State for price adjustment input
  const [tempPrice, setTempPrice] = useState<string>('');
  const [priceError, setPriceError] = useState('');
  const [percentageChange, setPercentageChange] = useState<number>(0);
  
  // State for individual stock prices (for bulk update mode)
  const [individualStockPrices, setIndividualStockPrices] = useState<{[symbol: string]: string}>({});

  // API Server status management
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking' | 'restarting'>('checking');
  const [serverInfo, setServerInfo] = useState<{
    uptime?: string;
    port?: number;
    lastCheck?: Date;
    error?: string;
  }>({});
  const [restartError, setRestartError] = useState('');
  const [restartSuccess, setRestartSuccess] = useState(false);

  // Get the currently selected stock object (moved before useEffects)
  const currentStock = stocks.find(stock => stock.symbol === selectedStock);

  // Handle percentage change price submission
  const handlePercentageSubmit = () => {
    setPriceError('');
    
    if (!selectedStock) {
      setPriceError('No stock selected');
      return;
    }
    
    if (percentageChange === 0) {
      setPriceError('Please adjust the percentage slider');
      return;
    }
    
    if (selectedStock === 'ALL_STOCKS') {
      // Apply percentage change to all stocks
      let hasError = false;
      let errorMessage = '';
      
      stocks.forEach(stock => {
        const finalPrice = stock.currentPrice * (1 + percentageChange / 100);
        
        if (finalPrice < 0.01 || finalPrice > 1000000) {
          hasError = true;
          errorMessage = `Price for ${stock.symbol} would be out of range ($0.01 - $1,000,000)`;
          return;
        }
        
        const result = setPrice(stock.symbol, finalPrice);
        if (!result.isValid && result.errorMessage) {
          hasError = true;
          errorMessage = result.errorMessage;
          return;
        }
      });
      
      if (hasError) {
        setPriceError(errorMessage);
        return;
      }
    } else {
      // Apply to individual stock
      if (!currentStock) {
        setPriceError('No stock selected');
        return;
      }
      
      const finalPrice = currentStock.currentPrice * (1 + percentageChange / 100);
      
      if (finalPrice < 0.01 || finalPrice > 1000000) {
        setPriceError('Price must be between $0.01 and $1,000,000');
        return;
      }
      
      const result = setPrice(selectedStock, finalPrice);
      if (!result.isValid && result.errorMessage) {
        setPriceError(result.errorMessage);
        return;
      }
    }
    
    setPriceError('');
    setPercentageChange(0); // Reset percentage change after successful update
  };

  // Handle exact price submission
  const handleExactPriceSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPriceError('');
    
    if (!selectedStock) {
      setPriceError('No stock selected');
      return;
    }
    
    if (!tempPrice.trim()) {
      setPriceError('Please enter a price');
      return;
    }
    
    const finalPrice = parseFloat(tempPrice);
    if (isNaN(finalPrice) || finalPrice <= 0) {
      setPriceError('Price must be a positive number');
      return;
    }
    
    if (finalPrice < 0.01 || finalPrice > 1000000) {
      setPriceError('Price must be between $0.01 and $1,000,000');
      return;
    }
    
    if (selectedStock === 'ALL_STOCKS') {
      // Apply same price to all stocks
      let hasError = false;
      let errorMessage = '';
      
      stocks.forEach(stock => {
        const result = setPrice(stock.symbol, finalPrice);
        if (!result.isValid && result.errorMessage) {
          hasError = true;
          errorMessage = result.errorMessage;
          return;
        }
      });
      
      if (hasError) {
        setPriceError(errorMessage);
        return;
      }
    } else {
      // Apply to individual stock
      if (!currentStock) {
        setPriceError('No stock selected');
        return;
      }
      
      const result = setPrice(selectedStock, finalPrice);
      if (!result.isValid && result.errorMessage) {
        setPriceError(result.errorMessage);
        return;
      }
    }
    
    setPriceError('');
  };

  // Hydration effect to prevent SSR mismatch
  useEffect(() => {
    setIsHydrated(true);
    // Initialize selectedStock after hydration
    if (stocks.length > 0 && !selectedStock) {
      setSelectedStock(stocks[0].symbol);
    }
  }, [stocks, selectedStock]);

  // Update tempPrice only when selected stock changes, not when price updates
  useEffect(() => {
    if (selectedStock === 'ALL_STOCKS' && isHydrated) {
      // Clear inputs for ALL_STOCKS mode
      setTempPrice('');
      setPriceError('');
      setPercentageChange(0);
    } else if (currentStock && isHydrated) {
      setTempPrice(currentStock.currentPrice.toString());
      setPriceError('');
      setPercentageChange(0); // Reset percentage change when stock changes
    }
  }, [selectedStock, isHydrated]); // Only depend on selectedStock, not currentStock

  // Handle adding a new stock
  const handleAddStock = (e: FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!newStockSymbol.trim() || !newStockName.trim() || !newStockPrice.trim()) {
      setFormError('All fields are required');
      return;
    }

    const price = parseFloat(newStockPrice);
    if (isNaN(price) || price <= 0) {
      setFormError('Price must be a positive number');
      return;
    }

    // Check if stock symbol already exists
    if (stocks.some(stock => stock.symbol === newStockSymbol.toUpperCase())) {
      setFormError('Stock symbol already exists');
      return;
    }

    // Add the new stock
    addStock(newStockSymbol.toUpperCase(), newStockName, price);

    // Reset form
    setNewStockSymbol('');
    setNewStockName('');
    setNewStockPrice('');
    setFormError('');
    
    // Select the newly added stock
    setSelectedStock(newStockSymbol.toUpperCase());
  };

  // Apply the dark select options styling when component mounts
  useEffect(() => {
    styleOptionsForDarkMode();
  }, []);

  // Check API server status periodically
  useEffect(() => {
    const checkServerStatus = async () => {
      // Skip API server status check in production if no API server is configured
      if (!shouldUseApiServer()) {
        setServerStatus('offline');
        setServerInfo({
          lastCheck: new Date(),
          error: 'API server disabled in production environment'
        });
        return;
      }
      
      try {
        setServerStatus('checking');
        const apiUrl = buildApiUrl(API_ENDPOINTS.STOCKS);
        const response = await fetch(apiUrl, {
          method: 'GET',
          timeout: 5000,
        });
        
        if (response.ok) {
          const data = await response.json();
          setServerStatus('online');
          setServerInfo({
            port: 3001,
            lastCheck: new Date(),
            uptime: 'Running'
          });
        } else {
          throw new Error(`Server responded with status ${response.status}`);
        }
      } catch (error) {
        setServerStatus('offline');
        setServerInfo({
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Connection failed'
        });
      }
    };

    // Check immediately and then every 30 seconds
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle server restart
  const handleRestartServer = async () => {
    // Confirm the action since it will disconnect all users
    if (!confirm('Are you sure you want to restart the API server? This will temporarily disconnect all users and restart the server.')) {
      return;
    }
    
    setRestartError('');
    setRestartSuccess(false);
    setServerStatus('restarting');
    
    try {
      console.log('🔄 Initiating server restart...');
      
      // Create a simple auth token for admin access
      // In production, you would get this from a proper login system
      const adminCredentials = {
        username: 'admin',
        password: 'password' // This should come from environment variables in production
      };
      
      // First, authenticate to get a valid token
      let authToken = null;
      try {
        const authUrl = buildApiUrl(API_ENDPOINTS.AUTH);
        const authResponse = await fetch(authUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adminCredentials)
        });
        
        if (authResponse.ok) {
          const authData = await authResponse.json();
          if (authData.success && authData.token) {
            authToken = authData.token;
            console.log('✅ Successfully authenticated for server restart');
          } else {
            throw new Error('Authentication failed - invalid credentials');
          }
        } else {
          throw new Error(`Authentication failed - server responded with ${authResponse.status}`);
        }
      } catch (authError) {
        console.error('❌ Authentication error:', authError);
        setRestartError(`Authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}. Please ensure the API server is running and accessible.`);
        setServerStatus('offline');
        return;
      }
      
      // Now send the restart command with proper authentication
      try {
        const restartUrl = buildApiUrl(API_ENDPOINTS.RESTART);
        const restartResponse = await fetch(restartUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (restartResponse.ok) {
          const restartData = await restartResponse.json();
          console.log('✅ Server restart command sent successfully:', restartData);
          setRestartSuccess(true);
          
          // The server will now restart, so we need to wait and then check status
          console.log('⏳ Waiting for server to restart...');
          
          // Wait 3 seconds for server to shut down and restart
          setTimeout(() => {
            console.log('🔍 Checking server status after restart...');
            setServerStatus('checking');
            
            // Start polling to check if server is back online
            let pollAttempts = 0;
            const maxPollAttempts = 20; // 20 attempts over 40 seconds
            
            const pollServerStatus = async () => {
              pollAttempts++;
              
              try {
                const statusUrl = buildApiUrl(API_ENDPOINTS.STOCKS);
                const statusResponse = await fetch(statusUrl, {
                  method: 'GET',
                  timeout: 5000
                });
                
                if (statusResponse.ok) {
                  console.log('✅ Server is back online!');
                  setServerStatus('online');
                  setServerInfo({
                    port: 3001,
                    lastCheck: new Date(),
                    uptime: 'Recently restarted'
                  });
                  setRestartSuccess(true);
                  
                  // Clear success message after 10 seconds
                  setTimeout(() => {
                    setRestartSuccess(false);
                  }, 10000);
                } else {
                  throw new Error('Server not ready yet');
                }
              } catch (pollError) {
                if (pollAttempts < maxPollAttempts) {
                  console.log(`⏳ Server not ready yet, attempt ${pollAttempts}/${maxPollAttempts}. Trying again in 2 seconds...`);
                  setTimeout(pollServerStatus, 2000);
                } else {
                  console.error('❌ Server restart timed out');
                  setRestartError('Server restart timed out. The server may have failed to restart. Please check manually or restart using "npm run server:managed" in the terminal.');
                  setServerStatus('offline');
                }
              }
            };
            
            // Start polling after a short delay
            setTimeout(pollServerStatus, 2000);
          }, 3000);
          
        } else {
          const errorData = await restartResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Server responded with status ${restartResponse.status}`);
        }
      } catch (restartError) {
        console.error('❌ Restart command failed:', restartError);
        setRestartError(`Restart command failed: ${restartError instanceof Error ? restartError.message : 'Unknown error'}`);
        setServerStatus('offline');
      }
      
    } catch (error) {
      console.error('❌ Server restart failed:', error);
      setRestartError(`Server restart failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try restarting manually using "npm run server:managed" in the terminal.`);
      setServerStatus('offline');
    }
  };

  // Show loading state until hydrated to prevent SSR mismatch
  if (!isHydrated) {
    return (
      <div className="space-y-8 text-white">
        <div>
          <h2 className="text-xl font-semibold mb-4">Control Panel</h2>
          <p className="text-sm text-gray-400 mb-6">Loading controls...</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-3"></div>
          <div className="h-8 bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white">
      <div>
        <h2 className="text-xl font-semibold mb-4">Control Panel</h2>
        <p className="text-sm text-gray-400 mb-6">Adjust stock prices, update speed, and manage displayed stocks.</p>
      </div>

      {/* API Server Status & Control */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <span>🖥️ API Server Status</span>
          <div className={`inline-block w-3 h-3 rounded-full ${
            serverStatus === 'online' ? 'bg-green-400 animate-pulse' :
            serverStatus === 'offline' ? 'bg-red-400' :
            serverStatus === 'checking' ? 'bg-yellow-400 animate-pulse' :
            'bg-orange-400 animate-spin'
          }`}></div>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-md border border-gray-700">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-medium text-gray-300">Status:</span>
                <span className={`text-sm font-bold ${
                  serverStatus === 'online' ? 'text-green-400' :
                  serverStatus === 'offline' ? 'text-red-400' :
                  serverStatus === 'checking' ? 'text-yellow-400' :
                  'text-orange-400'
                }`}>
                  {serverStatus === 'online' ? '🟢 Online' :
                   serverStatus === 'offline' ? '🔴 Offline' :
                   serverStatus === 'checking' ? '🟡 Checking...' :
                   '🟠 Restarting...'}
                </span>
              </div>
              
              {serverInfo.port && (
                <div className="text-xs text-gray-400 mb-1">
                  Port: {serverInfo.port} | Last checked: {serverInfo.lastCheck?.toLocaleTimeString()}
                </div>
              )}
              
              {serverInfo.error && (
                <div className="text-xs text-red-400">
                  Error: {serverInfo.error}
                </div>
              )}
              
              {serverInfo.uptime && serverStatus === 'online' && (
                <div className="text-xs text-green-400">
                  {serverInfo.uptime}
                </div>
              )}
            </div>
            
            <button
              onClick={handleRestartServer}
              disabled={serverStatus === 'restarting'}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                serverStatus === 'restarting'
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              {serverStatus === 'restarting' ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  Restarting...
                </span>
              ) : (
                '🔄 Restart Server'
              )}
            </button>
          </div>
          
          {restartError && (
            <div className="p-3 bg-red-900 text-red-100 text-sm rounded-md border border-red-700">
              <div className="font-medium mb-1">⚠️ Restart Failed</div>
              <div>{restartError}</div>
            </div>
          )}
          
          {restartSuccess && (
            <div className="p-3 bg-green-900 text-green-100 text-sm rounded-md border border-green-700">
              <div className="font-medium mb-1">✅ Server Restart Successful</div>
              <div className="space-y-1">
                <div>✓ Authentication successful</div>
                <div>✓ Restart command sent to server</div>
                <div>✓ Server is back online and responding</div>
                <div className="text-xs text-green-300 mt-2">The API server has been successfully restarted using the managed process.</div>
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-400 p-2 bg-gray-800 rounded border border-gray-700">
            <div className="font-medium mb-1 text-blue-400">💡 Server Management:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Green: API server is running and responding</li>
              <li>Red: Server is offline or not responding</li>
              <li>Yellow: Checking server status...</li>
              <li>Orange: Server is restarting</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Update Speed Control */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-3">Update Speed</h3>
        <div className="space-y-3">
          <input
            type="range"
            min="100"
            max="5000"
            step="50"
            value={updateIntervalMs}
            onChange={(e) => updateSpeed(parseInt(e.target.value))}
            className="w-full update-speed-slider"
          />
          <div className="flex justify-between text-sm text-gray-400">
            <span>Ultra Fast (0.1s)</span>
            <span>{updateIntervalMs}ms</span>
            <span>Smooth (5.0s)</span>
          </div>
        </div>
      </div>

      {/* Play/Pause Control */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-3">Ticker Control</h3>
        <button
          onClick={togglePause}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            isPaused 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-yellow-500 hover:bg-yellow-600 text-white'
          } transition-colors`}
        >
          {isPaused ? 'Resume Updates' : 'Pause Updates'}
        </button>
      </div>

      {/* Price Adjustment */}
      {stocks.length > 0 && (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <h3 className="font-medium mb-3">Adjust Stock Price</h3>
          
          <div className="mb-3">
            <label htmlFor="stock-select" className="block text-sm font-medium text-gray-300 mb-1">
              Select Stock
            </label>
            <select
              id="stock-select"
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="w-full p-2 border border-gray-700 rounded-md bg-black text-white"
              style={{ 
                WebkitAppearance: 'none',
                MozAppearence: 'none',
                appearance: 'none',
backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.7rem top 50%',
                backgroundSize: '0.65rem auto'
              }}
            >
              <option value="ALL_STOCKS" className="font-bold text-purple-300">
                🎯 ALL STOCKS - Bulk Price Update
              </option>
              <option disabled>────────────────────</option>
              {stocks.map(stock => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.name}
                </option>
              ))}
            </select>
          </div>

          {selectedStock === 'ALL_STOCKS' ? (
            <>
              <div className="flex items-center gap-4 mb-4 bg-purple-900 p-3 rounded-md border border-purple-700">
                <span className="text-sm font-medium text-purple-200">🎯 Bulk Update Mode:</span>
                <span className="text-lg font-bold text-purple-300">Apply changes to all {stocks.length} stocks</span>
              </div>
              
              <div className="space-y-4">
                {priceError && (
                  <div className="p-2 bg-red-900 text-red-100 text-sm rounded-md">
                    {priceError}
                  </div>
                )}
                
                <div className="bg-purple-800 p-3 rounded-md border border-purple-600 text-sm text-purple-100">
                  <p className="mb-2"><strong>Bulk Update Options:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>Individual Prices:</strong> Set specific prices for each stock individually</li>
                    <li><strong>Percentage:</strong> Apply the same percentage change to all stocks</li>
                    <li><strong>Set Same Price:</strong> Set all stocks to the same exact price</li>
                  </ul>
                </div>
                
          {/* Individual Stock Prices */}
          <div className="p-3 bg-purple-800 rounded-md border border-purple-600">
            {stocks.map(stock => (
              <div key={stock.symbol} className="flex items-center gap-3 mb-2">
                <span className="flex-1 text-sm font-medium text-purple-200">{stock.symbol} - {stock.name}</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={individualStockPrices[stock.symbol] || ''}
                  onChange={(e) => setIndividualStockPrices(prev => ({ ...prev, [stock.symbol]: e.target.value }))}
                  placeholder="Enter price..."
                  className="w-1/2 p-2 border border-purple-600 rounded-md bg-black text-white focus:ring-1 focus:ring-purple-500"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                let hasError = false;
                let errorMessage = '';

                Object.entries(individualStockPrices).forEach(([symbol, price]) => {
                  const parsedPrice = parseFloat(price);
                  if (isNaN(parsedPrice) || parsedPrice <= 0) {
                    hasError = true;
                    errorMessage = `Invalid price for ${symbol}`;
                    return;
                  }

                  const result = setPrice(symbol, parsedPrice);
                  if (!result.isValid && result.errorMessage) {
                    hasError = true;
                    errorMessage = result.errorMessage;
                    return;
                  }
                });
                
                if (hasError) {
                  setPriceError(errorMessage);
                  return;
                }

                setPriceError('');
                setIndividualStockPrices({});
              }}
              className="mt-4 px-4 py-2 text-white rounded-md transition-colors font-medium text-sm"
              style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#15803d'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#16a34a'}
            >
              Set All Prices
            </button>
          </div>

          {/* Percentage Change for All Stocks */}
                <div className="space-y-3 p-3 bg-purple-800 rounded-md border border-purple-600">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-purple-200">Percentage Change (All Stocks)</label>
                    <span className={`text-sm font-bold ${
                      percentageChange > 0 ? 'text-green-400' : 
                      percentageChange < 0 ? 'text-red-400' : 'text-purple-300'
                    }`}>
                      {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="0.5"
                    value={percentageChange}
                    onChange={(e) => {
                      setPercentageChange(parseFloat(e.target.value));
                      // Clear tempPrice when using percentage slider
                      if (parseFloat(e.target.value) !== 0) {
                        setTempPrice('');
                      }
                    }}
                    className="w-full"
                  />
                  
                  <div className="flex justify-between text-xs text-purple-400">
                    <span>-50%</span>
                    <span>0%</span>
                    <span>+50%</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    {percentageChange !== 0 && (
                      <div className="text-xs text-purple-200 bg-purple-700 p-2 rounded flex-1">
                        Preview: All stocks will change by {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handlePercentageSubmit}
                      disabled={percentageChange === 0}
                      className={`px-4 py-2 rounded-md transition-colors font-medium text-sm ${
                        percentageChange === 0 
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      Apply to All Stocks
                    </button>
                  </div>
                </div>
                
                <div className="text-center text-sm text-purple-400">OR</div>
                
                <form onSubmit={handleExactPriceSubmit} className="p-3 bg-purple-800 rounded-md border border-purple-600">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label htmlFor="price-input" className="block text-xs font-medium text-purple-300 mb-1">
                        Set Same Price for All Stocks
                      </label>
                      <input
                        id="price-input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={tempPrice}
                        onChange={(e) => {
                          setTempPrice(e.target.value);
                          // Reset percentage when user types in price input
                          if (e.target.value.trim()) {
                            setPercentageChange(0);
                          }
                        }}
                        placeholder="Enter price for all stocks..."
                        className="w-full p-2 border border-purple-600 rounded-md bg-black text-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors font-medium text-sm"
                    >
                      Set All Prices
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : currentStock && (
            <>
              <div className="flex items-center gap-4 mb-4 bg-gray-800 p-3 rounded-md border border-gray-700">
                <span className="text-sm font-medium text-gray-300">Current Price: </span>
                <span className="text-lg font-bold text-blue-400">{formatPrice(currentStock.currentPrice, selectedCurrency)}</span>
              </div>
              
              <div className="space-y-4">
                {priceError && (
                  <div className="p-2 bg-red-900 text-red-100 text-sm rounded-md">
                    {priceError}
                  </div>
                )}
                
                {/* Percentage Change Slider */}
                <div className="space-y-3 p-3 bg-gray-800 rounded-md border border-gray-600">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Percentage Change</label>
                    <span className={`text-sm font-bold ${
                      percentageChange > 0 ? 'text-green-400' : 
                      percentageChange < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="0.5"
                    value={percentageChange}
                    onChange={(e) => {
                      setPercentageChange(parseFloat(e.target.value));
                      // Clear tempPrice when using percentage slider
                      if (parseFloat(e.target.value) !== 0 && currentStock) {
                        setTempPrice(currentStock.currentPrice.toString());
                      }
                    }}
                    className="w-full"
                  />
                  
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>-50%</span>
                    <span>0%</span>
                    <span>+50%</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    {percentageChange !== 0 && (
                      <div className="text-xs text-gray-400 bg-gray-700 p-2 rounded flex-1">
                        Preview: {formatPrice(currentStock.currentPrice * (1 + percentageChange / 100), selectedCurrency)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handlePercentageSubmit}
                      disabled={percentageChange === 0}
                      className={`px-4 py-2 rounded-md transition-colors font-medium text-sm ${
                        percentageChange === 0 
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
Apply Percentage Change
                    </button>
                  </div>
                </div>
                
                <div className="text-center text-sm text-gray-400">OR</div>
                
                <form onSubmit={handleExactPriceSubmit} className="p-3 bg-gray-800 rounded-md border border-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label htmlFor="price-input" className="block text-xs font-medium text-gray-400 mb-1">
                        Enter Exact Price
                      </label>
                      <input
                        id="price-input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={tempPrice}
                        onChange={(e) => {
                          setTempPrice(e.target.value);
                          // Reset percentage when user types in price input
                          if (e.target.value.trim()) {
                            setPercentageChange(0);
                          }
                        }}
                        placeholder="Enter exact price..."
                        className="w-full p-2 border border-gray-700 rounded-md bg-black text-white focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium text-sm"
                    >
                      Apply Price
                    </button>
                  </div>
                </form>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeStock(currentStock.symbol)}
                    className="px-3 py-2 bg-red-900 text-red-100 hover:bg-red-800 rounded-md transition-colors text-sm"
                  >
                    Remove Stock
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Currency Selection */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-3">Currency Settings</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-4 mb-4 bg-gray-800 p-3 rounded-md border border-gray-700">
            <span className="text-sm font-medium text-gray-300">Current Currency:</span>
            <span className="text-lg font-bold text-green-400">
              {CURRENCIES[selectedCurrency].symbol} {CURRENCIES[selectedCurrency].name}
            </span>
          </div>
          
          <div>
            <label htmlFor="currency-select" className="block text-sm font-medium text-gray-300 mb-1">
              Select Currency
            </label>
            <select
              id="currency-select"
              value={selectedCurrency}
              onChange={async (e) => {
                const newCurrency = e.target.value as Currency;
                
                // First update local currency for immediate UI feedback
                const localResult = changeCurrency(newCurrency);
                if (!localResult.isValid && localResult.errorMessage) {
                  console.error('Local currency change failed:', localResult.errorMessage);
                  return;
                }
                
                // Then sync with remote API server (only in development)
                if (shouldUseApiServer()) {
                  try {
                    console.log('🌍 Syncing currency change to remote API:', newCurrency);
                    const controlsUrl = buildApiUrl(API_ENDPOINTS.CONTROLS);
                    const response = await fetch(controlsUrl, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer dummy-token-for-now' // TODO: Use real auth
                      },
                      body: JSON.stringify({
                        selectedCurrency: newCurrency
                      })
                    });
                  
                  if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Currency successfully synced to remote API:', data);
                    } else {
                      console.warn('⚠️ Failed to sync currency to remote API:', response.status);
                      // Continue with local change even if remote sync fails
                    }
                  } catch (err) {
                    console.warn('⚠️ Could not sync currency to remote API:', err);
                    // Continue with local change even if remote sync fails
                  }
                } else {
                  console.log('🏭 Production mode: API server disabled, skipping currency sync');
                }
              }}
              className="w-full p-2 border border-gray-700 rounded-md bg-black text-white"
              style={{ 
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.7rem top 50%',
                backgroundSize: '0.65rem auto'
              }}
            >
              {Object.entries(CURRENCIES).map(([code, currencyInfo]) => (
                <option key={code} value={code}>
                  {currencyInfo.symbol} {currencyInfo.name} ({code})
                </option>
              ))}
            </select>
          </div>
          
          <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
            <p className="mb-1"><strong>Note:</strong> Changing currency will convert all stock prices and historical data.</p>
            <p>Supported currencies: USD, EUR, GBP, JPY, CAD, INR, CHF</p>
          </div>
        </div>
      </div>

      {/* Add New Stock */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-3">Add New Stock</h3>
        
        <form onSubmit={handleAddStock} className="space-y-3">
          {formError && (
            <div className="p-2 bg-red-900 text-red-100 text-sm rounded-md">
              {formError}
            </div>
          )}
          
          <div>
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-300 mb-1">
              Symbol
            </label>
            <input
              id="symbol"
              type="text"
              placeholder="AAPL"
              value={newStockSymbol}
              onChange={(e) => setNewStockSymbol(e.target.value)}
              className="w-full p-2 border border-gray-700 rounded-md bg-black text-white"
            />
          </div>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              Company Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Apple Inc."
              value={newStockName}
              onChange={(e) => setNewStockName(e.target.value)}
              className="w-full p-2 border border-gray-700 rounded-md bg-black text-white"
            />
          </div>
          
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">
              Initial Price ($)
            </label>
            <input
              id="price"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="150.00"
              value={newStockPrice}
              onChange={(e) => {
                const value = e.target.value;
                // If there's a decimal point, limit to 2 decimal places
                if (value.includes('.')) {
                  const parts = value.split('.');
                  if (parts[1] && parts[1].length > 2) {
                    return; // Don't update if more than 2 decimal places
                  }
                }
                setNewStockPrice(value);
              }}
              onBlur={(e) => {
                // Format to 2 decimal places on blur if it's a valid number
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                  setNewStockPrice(value.toFixed(2));
                }
              }}
              className="w-full p-2 border border-gray-700 rounded-md bg-black text-white"
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-md"
          >
            Add Stock
          </button>
        </form>
      </div>

      {/* Debug Tools */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-3">🔧 Debug Tools</h3>
        <div className="space-y-3">
          <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded mb-3">
            <p className="mb-1"><strong>Test API Connection:</strong> Manually test the connection to the remote API server.</p>
            <p>Check the browser console (F12 → Console) for detailed debug messages after clicking the test button.</p>
          </div>
          <button
            onClick={async () => {
              console.log('🧪 Manual API sync test triggered from Control Panel');
              
              if (!shouldUseApiServer()) {
                alert('API Test SKIPPED ⚠️\n\nAPI server is disabled in production environment.\n\nThe application is running in local-only mode.');
                return;
              }
              
              try {
                const apiUrl = buildApiUrl(API_ENDPOINTS.STOCKS);
                const response = await fetch(apiUrl, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });
                
                console.log('🧪 Manual test - API Response:', response.status);
                const data = await response.json();
                console.log('🧪 Manual test - API Data:', data);
                
                const message = `API Test Result: ${data.success ? 'SUCCESS ✅' : 'FAILED ❌'}\n\nDetails:\n- Status Code: ${response.status}\n- Stocks Found: ${data.stocks?.length || 0}\n- Server Response: ${data.success ? 'OK' : 'Error'}\n\nCheck console for full debug info.`;
                alert(message);
              } catch (err) {
                console.error('🧪 Manual API test failed:', err);
                alert(`API Test FAILED ❌\n\nError: ${err}\n\nCheck console for details.`);
              }
            }}
            className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors font-medium"
          >
            🧪 Test API Sync Manually
          </button>
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-3">👤 Account Management</h3>
        <div className="space-y-3">
          <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded mb-3">
            <p>Sign out of your account and return to the login screen.</p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full py-2 px-4 text-white rounded-md transition-colors shadow-md font-medium bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

    </div>
  );
}
