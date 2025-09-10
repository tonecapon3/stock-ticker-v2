import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { shouldUseApiServer, getApiBaseUrl } from '../lib/config';
import AuthLoading from '../components/auth/AuthLoading';

// API Base URL
const API_BASE = shouldUseApiServer() ? `${getApiBaseUrl()}/api/remote` : '';

interface Stock {
  symbol: string;
  name: string;
  currentPrice: number;
  previousPrice: number;
  initialPrice: number;
  percentageChange: number;
  lastUpdated: string;
  priceHistory: Array<{ timestamp: string; price: number }>;
}

interface SystemControls {
  isPaused: boolean;
  updateIntervalMs: number;
  selectedCurrency: string;
  lastUpdated: string;
  isEmergencyStopped: boolean;
}

interface RemoteState {
  stocks: Stock[];
  controls: SystemControls | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError: string | null;
  isLoading: boolean;
}

const RemoteControlPanelClerk: React.FC = () => {
  const { isLoaded, isSignedIn, getAuthToken, userInfo, signOut } = useAuth();
  
  // Check if API server is available
  if (!shouldUseApiServer()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🏥</div>
            <h1 className="text-3xl font-bold text-white mb-4">Remote Control Unavailable</h1>
            <p className="text-gray-400 mb-6">
              The Remote Control Panel requires an API server connection, which is not configured in this environment.
            </p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">ℹ️ Environment Information</h2>
            <div className="text-sm text-gray-300 space-y-2">
              <p>• This deployment runs in frontend-only mode</p>
              <p>• No backend API server is available</p>
              <p>• Stock data updates are simulated locally</p>
              <p>• Remote control features require a separate backend deployment</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
            >
              📈 View Stock Ticker
            </a>
            
            <div className="text-xs text-gray-500">
              <p>For development: Set VITE_API_BASE_URL environment variable</p>
              <p>For production: Deploy the API server component separately</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [state, setState] = useState<RemoteState>({
    stocks: [],
    controls: null,
    connectionStatus: 'disconnected',
    lastError: null,
    isLoading: false,
  });

  // Form states
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [addStockForm, setAddStockForm] = useState({ symbol: '', name: '', price: '' });
  const [bulkPercentage, setBulkPercentage] = useState<string>('');

  // Show loading while authentication is initializing
  if (!isLoaded) {
    return <AuthLoading message="Loading authentication..." />;
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-white mb-4">Authentication Required</h1>
            <p className="text-gray-400 mb-6">
              Please sign in to access the Remote Control Panel.
            </p>
          </div>
          <a
            href="/sign-in"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // API call helper with Clerk token
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    try {
      const token = await getAuthToken();
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (response.status === 401) {
        setState(prev => ({
          ...prev,
          lastError: 'Authentication expired. Please sign in again.',
          connectionStatus: 'error'
        }));
        setTimeout(() => signOut(), 2000);
        throw new Error('Authentication expired');
      }

      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        lastError: error instanceof Error ? error.message : 'Request failed'
      }));
      throw error;
    }
  }, [getAuthToken, signOut]);

  // Fetch stocks
  const fetchStocks = async () => {
    try {
      const response = await apiCall('/stocks');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setState(prev => ({
          ...prev,
          stocks: data.stocks,
          connectionStatus: 'connected',
          lastError: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          lastError: data.error || 'Failed to fetch stocks'
        }));
      }
    } catch (error) {
      // Error already handled in apiCall
    }
  };

  // Fetch controls
  const fetchControls = async () => {
    try {
      const response = await apiCall('/controls');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setState(prev => ({
          ...prev,
          controls: data.controls,
          connectionStatus: 'connected',
          lastError: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          lastError: data.error || 'Failed to fetch controls'
        }));
      }
    } catch (error) {
      // Error already handled in apiCall
    }
  };

  // Update stock price
  const updateStockPrice = async (symbol: string, price: number) => {
    try {
      const response = await apiCall(`/stocks/${symbol}`, {
        method: 'PUT',
        body: JSON.stringify({ price }),
      });

      if (response.ok) {
        await fetchStocks();
        return true;
      } else {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          lastError: data.error || 'Failed to update stock'
        }));
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  // Bulk update stocks
  const bulkUpdateStocks = async (updateType: string, percentage?: number) => {
    try {
      const response = await apiCall('/stocks/bulk', {
        method: 'PUT',
        body: JSON.stringify({ updateType, percentage }),
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, lastError: null }));
        await fetchStocks();
        return { success: true, data };
      } else {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          lastError: data.error || 'Failed to perform bulk update'
        }));
        return { success: false, error: data.error };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to perform bulk update';
      setState(prev => ({ ...prev, lastError: errorMsg }));
      return { success: false, error: errorMsg };
    }
  };

  // Add new stock
  const addNewStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await apiCall('/stocks', {
        method: 'POST',
        body: JSON.stringify({
          symbol: addStockForm.symbol.toUpperCase(),
          name: addStockForm.name,
          initialPrice: parseFloat(addStockForm.price),
        }),
      });

      if (response.ok) {
        await fetchStocks();
        setAddStockForm({ symbol: '', name: '', price: '' });
        return true;
      } else {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          lastError: data.error || 'Failed to add stock'
        }));
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  // Remove stock
  const deleteStock = async (symbol: string) => {
    if (!confirm(`Are you sure you want to remove ${symbol} from the panel?`)) return false;

    try {
      const response = await apiCall(`/stocks/${symbol}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchStocks();
        setState(prev => ({
          ...prev,
          lastError: null
        }));
        return true;
      } else {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          lastError: data.error || 'Failed to remove stock'
        }));
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove stock';
      setState(prev => ({ ...prev, lastError: errorMsg }));
      return false;
    }
  };

  // Update system controls
  const updateControls = async (updates: Partial<SystemControls>) => {
    try {
      const response = await apiCall('/controls', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await fetchControls();
        return true;
      } else {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          lastError: data.error || 'Failed to update controls'
        }));
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  // Restart server (admin only)
  const restartServer = async () => {
    if (!confirm('Are you sure you want to restart the API server? This will disconnect all users temporarily.')) {
      return false;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await apiCall('/restart', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          lastError: null,
          connectionStatus: 'connecting',
          isLoading: false
        }));
        alert(`API server restart initiated successfully. The API server will restart shortly.`);
        setTimeout(() => {
          signOut();
        }, 2000);
        return true;
      } else {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          lastError: data.error || 'Failed to restart API server',
          isLoading: false
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
      return false;
    }
  };

  // Start editing stock
  const startEditingStock = (stock: Stock) => {
    setEditingStock(stock.symbol);
    setEditPrice(stock.currentPrice.toString());
  };

  // Save stock edit
  const saveStockEdit = async (symbol: string) => {
    const price = parseFloat(editPrice);
    if (!isNaN(price) && price > 0) {
      await updateStockPrice(symbol, price);
      setEditingStock(null);
    }
  };

  // Cancel stock edit
  const cancelStockEdit = () => {
    setEditingStock(null);
    setEditPrice('');
  };

  // Fetch data on component mount and set up polling
  useEffect(() => {
    if (isSignedIn && shouldUseApiServer()) {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Initial data fetch
      Promise.all([
        fetchStocks(),
        fetchControls()
      ]).finally(() => {
        setState(prev => ({ ...prev, isLoading: false }));
      });

      const interval = setInterval(() => {
        fetchStocks();
        fetchControls();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isSignedIn]);

  // Clear errors after 5 seconds
  useEffect(() => {
    if (state.lastError) {
      const timeout = setTimeout(() => {
        setState(prev => ({ ...prev, lastError: null }));
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [state.lastError]);

  // Utility functions
  const formatPrice = (price: number, currency?: string) => {
    const currencyCode = currency || state.controls?.selectedCurrency || 'USD';
    const currencyInfo = getCurrencyInfo(currencyCode);
    
    switch (currencyCode) {
      case 'JPY':
        return `${currencyInfo.symbol}${Math.round(price).toLocaleString()}`;
      case 'EUR':
      case 'GBP':
      case 'CAD':
      case 'INR':
      case 'CHF':
        return `${currencyInfo.symbol}${price.toFixed(2)}`;
      case 'USD':
      default:
        return `${currencyInfo.symbol}${price.toFixed(2)}`;
    }
  };

  const formatPercentage = (percentage: number) => `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;

  const getCurrencyInfo = (code: string) => {
    const currencies = {
      USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
      EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
      GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
      JPY: { name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
      CAD: { name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
      CHF: { name: 'Swiss Franc', symbol: 'Fr.', flag: '🇨🇭' },
      INR: { name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
    };
    return currencies[code as keyof typeof currencies] || currencies.USD;
  };

  // Connection status indicator
  const ConnectionStatus: React.FC<{ status: string }> = ({ status }) => {
    const statusColors = {
      connected: 'bg-green-500',
      connecting: 'bg-yellow-500',
      disconnected: 'bg-gray-500',
      error: 'bg-red-500',
    };

    return (
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${statusColors[status as keyof typeof statusColors]}`} />
        <span className="text-sm capitalize">{status}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Remote Control Panel</h1>
              <p className="text-gray-400">Stock Ticker Remote Management</p>
            </div>
            
            <div className="flex items-center space-x-6">
              <ConnectionStatus status={state.connectionStatus} />
              <div className="flex items-center space-x-4">
                <span className="text-sm">
                  {userInfo.fullName || userInfo.username} ({userInfo.role})
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stocks Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">
                Live Stocks ({state.stocks.length})
              </h3>
              
              {state.stocks.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No stocks available</p>
              ) : (
                <div className="space-y-3">
                  {state.stocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded-md"
                    >
                      <div>
                        <div className="font-semibold">{stock.symbol}</div>
                        <div className="text-sm text-gray-400 flex items-center space-x-2">
                          <span>{stock.name}</span>
                          {state.controls?.isPaused && (
                            <span className="text-yellow-400" title="System is paused">
                              ⏸️
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {editingStock === stock.symbol ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              step="0.01"
                              className="w-20 px-2 py-1 bg-gray-600 text-white rounded text-sm"
                              onKeyPress={(e) => e.key === 'Enter' && saveStockEdit(stock.symbol)}
                            />
                            <button
                              onClick={() => saveStockEdit(stock.symbol)}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelStockEdit}
                              className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-right">
                              <div className="font-semibold">{formatPrice(stock.currentPrice)}</div>
                              <div className={`text-sm ${stock.percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatPercentage(stock.percentageChange)}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditingStock(stock)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteStock(stock.symbol)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                title={`Remove ${stock.symbol} from the panel`}
                              >
                                Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Stock */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Add New Stock</h3>
              <form onSubmit={addNewStock} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Symbol (e.g., AAPL)"
                    value={addStockForm.symbol}
                    onChange={(e) => setAddStockForm(prev => ({ ...prev, symbol: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                    maxLength={5}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={addStockForm.name}
                    onChange={(e) => setAddStockForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Initial Price"
                    value={addStockForm.price}
                    onChange={(e) => setAddStockForm(prev => ({ ...prev, price: e.target.value }))}
                    step="0.01"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  Add Stock
                </button>
              </form>
            </div>

            {/* Bulk Price Updates */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Bulk Price Updates</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Percentage Change
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Enter percentage (e.g., 5 or -10)"
                      value={bulkPercentage}
                      onChange={(e) => setBulkPercentage(e.target.value)}
                      step="0.1"
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md text-sm"
                    />
                    <button
                      onClick={() => {
                        const pct = parseFloat(bulkPercentage);
                        if (!isNaN(pct)) {
                          bulkUpdateStocks('percentage', pct);
                          setBulkPercentage('');
                        }
                      }}
                      disabled={!bulkPercentage || isNaN(parseFloat(bulkPercentage))}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Apply Change
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => bulkUpdateStocks('random')}
                    className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Random Fluctuation
                  </button>
                  <button
                    onClick={() => bulkUpdateStocks('reset')}
                    className="py-2 px-3 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Reset to Initial
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => bulkUpdateStocks('market_crash')}
                    className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    📉 Market Crash (-20%)
                  </button>
                  <button
                    onClick={() => bulkUpdateStocks('market_boom')}
                    className="py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    📈 Market Boom (+20%)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="space-y-4">
            {/* System Status */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              {state.controls ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={state.controls.isPaused ? 'text-yellow-400' : 'text-green-400'}>
                      {state.controls.isPaused ? 'Paused' : 'Running'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Update Interval:</span>
                    <span>{(state.controls.updateIntervalMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Currency:</span>
                    <span>{state.controls.selectedCurrency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Emergency Stop:</span>
                    <span className={state.controls.isEmergencyStopped ? 'text-red-400' : 'text-gray-400'}>
                      {state.controls.isEmergencyStopped ? 'ACTIVE' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ) : (
                <div>Loading controls...</div>
              )}
            </div>

            {/* Currency Settings */}
            {state.controls && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">💱 Currency Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Selected Currency: {getCurrencyInfo(state.controls.selectedCurrency).flag}{' '}
                      {getCurrencyInfo(state.controls.selectedCurrency).symbol}
                    </label>
                    <select
                      value={state.controls.selectedCurrency}
                      onChange={(e) => updateControls({ selectedCurrency: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">🇺🇸 USD - US Dollar ($)</option>
                      <option value="EUR">🇪🇺 EUR - Euro (€)</option>
                      <option value="GBP">🇬🇧 GBP - British Pound (£)</option>
                      <option value="JPY">🇯🇵 JPY - Japanese Yen (¥)</option>
                      <option value="CAD">🇨🇦 CAD - Canadian Dollar (C$)</option>
                      <option value="CHF">🇨🇭 CHF - Swiss Franc (Fr.)</option>
                      <option value="INR">🇮🇳 INR - Indian Rupee (₹)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {state.controls && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">⚡ Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => updateControls({ isPaused: !state.controls!.isPaused })}
                    className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                      state.controls.isPaused
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    }`}
                  >
                    {state.controls.isPaused ? 'Resume System' : 'Pause System'}
                  </button>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Update Speed: {(state.controls.updateIntervalMs / 1000).toFixed(1)}s
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      step="50"
                      value={state.controls.updateIntervalMs}
                      onChange={(e) => updateControls({ updateIntervalMs: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Ultra Fast (0.1s)</span>
                      <span>Smooth (5.0s)</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-600">
                    <div className="bg-orange-900 p-3 rounded-md border border-orange-700 mb-3">
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-300">⚠️</span>
                        <div className="text-xs text-orange-100">
                          <p className="font-medium mb-1">System Action</p>
                          <p>API server restart will disconnect all users temporarily.</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={restartServer}
                      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                    >
                      🔄 RESTART API SERVER
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Error Toast */}
      {state.lastError && (
        <div className="fixed top-4 right-4 bg-red-900 border border-red-500 text-red-100 px-4 py-3 rounded-md shadow-lg z-50">
          <div className="flex items-center justify-between">
            <span>{state.lastError}</span>
            <button
              onClick={() => setState(prev => ({ ...prev, lastError: null }))}
              className="ml-4 text-red-300 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-white">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoteControlPanelClerk;
