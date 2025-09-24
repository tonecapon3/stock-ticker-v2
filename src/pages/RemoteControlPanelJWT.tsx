/**
 * JWT-Only Remote Control Panel
 * 
 * This is a dedicated Remote Control Panel that uses JWT authentication only,
 * completely independent of Clerk authentication.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, shouldUseApiServer } from '../lib/config';
import JWTAuthGuard from '../components/auth/JWTAuthGuard';
import { CURRENCIES, Currency, type CurrencyInfo } from '../lib/types';
import Tooltip from '../components/Tooltip';

interface Stock {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  volume: number;
  lastUpdated: string;
}

interface SystemControls {
  isPaused: boolean;
  updateIntervalMs: number;
  volatility: number;
  selectedCurrency: Currency;
  isEmergencyStopped: boolean;
  lastUpdated: string;
}

interface RemoteState {
  stocks: Stock[];
  controls: SystemControls | null;
  connectionStatus: 'disconnected' | 'connected' | 'connecting' | 'error';
  lastError: string | null;
  isLoading: boolean;
}

const RemoteControlPanelJWT: React.FC = () => {
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

  const API_BASE = `${getApiBaseUrl()}/api/remote`;

  // Get JWT token from localStorage
  const getToken = () => localStorage.getItem('remote-token');

  // API call helper with JWT token
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    try {
      const token = getToken();
      
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
        // Clear token and reload page to show login form
        localStorage.removeItem('remote-token');
        setTimeout(() => window.location.reload(), 2000);
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
  }, []);

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

  // Dedicated pause/resume functions
  const pauseSystem = async () => {
    try {
      const response = await apiCall('/controls/pause', {
        method: 'POST',
      });

      if (response.ok) {
        await fetchControls();
        return true;
      } else {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          lastError: data.error || 'Failed to pause system'
        }));
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  const resumeSystem = async () => {
    try {
      const response = await apiCall('/controls/resume', {
        method: 'POST',
      });

      if (response.ok) {
        await fetchControls();
        return true;
      } else {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          lastError: data.error || 'Failed to resume system'
        }));
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  const togglePause = async () => {
    if (state.controls?.isPaused) {
      return await resumeSystem();
    } else {
      return await pauseSystem();
    }
  };

  // Update speed handler
  const handleUpdateSpeed = (intervalMs: number) => {
    updateControls({ updateIntervalMs: intervalMs });
  };

  // Format update speed label
  const getSpeedLabel = (intervalMs: number): string => {
    if (intervalMs <= 100) return 'Ultra-Fast';
    if (intervalMs <= 500) return 'Very Fast';
    if (intervalMs <= 1000) return 'Fast';
    if (intervalMs <= 2000) return 'Normal';
    if (intervalMs <= 3000) return 'Slow';
    return 'Smooth';
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('remote-token');
    window.location.reload();
  };

  // Currency helper function
  const getCurrencyInfo = (currencyCode: string): CurrencyInfo & { flag: string } => {
    const currencies = {
      USD: { ...CURRENCIES.USD, flag: '🇺🇸' },
      EUR: { ...CURRENCIES.EUR, flag: '🇪🇺' },
      GBP: { ...CURRENCIES.GBP, flag: '🇬🇧' },
      JPY: { ...CURRENCIES.JPY, flag: '🇯🇵' },
      CAD: { ...CURRENCIES.CAD, flag: '🇨🇦' },
      CHF: { ...CURRENCIES.CHF, flag: '🇨🇭' },
      INR: { ...CURRENCIES.INR, flag: '🇮🇳' }
    };
    return currencies[currencyCode as keyof typeof currencies] || currencies.USD;
  };

  // Format price based on selected currency
  const formatPrice = (price: number, currency?: Currency) => {
    const selectedCurrency = currency || state.controls?.selectedCurrency || 'USD';
    const currencyInfo = getCurrencyInfo(selectedCurrency);
    
    switch (selectedCurrency) {
      case 'JPY':
        // Japanese Yen doesn't use decimal places
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

  // Stock editing handlers
  const startEditingStock = (stock: Stock) => {
    setEditingStock(stock.symbol);
    setEditPrice(stock.currentPrice.toString());
  };

  const saveStockEdit = async (symbol: string) => {
    const price = parseFloat(editPrice);
    if (!isNaN(price) && price > 0) {
      await updateStockPrice(symbol, price);
      setEditingStock(null);
    }
  };

  const cancelStockEdit = () => {
    setEditingStock(null);
    setEditPrice('');
  };

  // Initialize data and polling
  useEffect(() => {
    if (shouldUseApiServer()) {
      setState(prev => ({ ...prev, isLoading: true }));
      
      Promise.all([
        fetchStocks(),
        fetchControls()
      ]).finally(() => {
        setState(prev => ({ ...prev, isLoading: false }));
      });

      // Set up polling interval
      const interval = setInterval(() => {
        fetchStocks();
        fetchControls();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  // Clear errors after 5 seconds
  useEffect(() => {
    if (state.lastError) {
      const timeout = setTimeout(() => {
        setState(prev => ({ ...prev, lastError: null }));
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [state.lastError]);

  return (
    <JWTAuthGuard>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🎛️ Remote Control Panel</h1>
              <p className="text-gray-400 text-sm">JWT Authentication</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${{
                connected: 'bg-green-900 text-green-300',
                connecting: 'bg-yellow-900 text-yellow-300',
                disconnected: 'bg-gray-700 text-gray-300',
                error: 'bg-red-900 text-red-300',
              }[state.connectionStatus] || 'bg-gray-700 text-gray-300'}`}>
                <div className={`w-2 h-2 rounded-full ${{
                  connected: 'bg-green-400',
                  connecting: 'bg-yellow-400 animate-pulse',
                  disconnected: 'bg-gray-400',
                  error: 'bg-red-400',
                }[state.connectionStatus] || 'bg-gray-400'}`} />
                <span className="capitalize">{state.connectionStatus}</span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Error Display */}
        {state.lastError && (
          <div className="bg-red-900/50 border-l-4 border-red-500 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-red-400 mr-3">⚠️</span>
                <span className="text-red-100">{state.lastError}</span>
              </div>
              <button
                onClick={() => setState(prev => ({ ...prev, lastError: null }))}
                className="text-red-300 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {state.isLoading && (
          <div className="bg-blue-900/50 border-l-4 border-blue-500 p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-3"></div>
              <span className="text-blue-100">Loading data...</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="p-6 space-y-8">
          {/* Stock Management Section */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              📊 Stock Management
              <span className="ml-3 px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs">
                {state.stocks.length} stocks
              </span>
            </h2>

            {/* Stock List */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-right p-2">Change</th>
                    <th className="text-right p-2">Volume</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.stocks
                    .filter(stock => stock && stock.symbol && stock.name)
                    .map((stock) => (
                    <tr key={stock.symbol} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                      <td className="p-2 font-mono font-bold text-blue-300">{stock.symbol}</td>
                      <td className="p-2 text-gray-300">{stock.name}</td>
                      <td className="p-2 text-right">
                        {editingStock === stock.symbol ? (
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-right"
                            step="0.01"
                          />
                        ) : (
                          <span className="font-mono">
                            {formatPrice(stock.currentPrice ?? 0)}
                          </span>
                        )}
                      </td>
                      <td className={`p-2 text-right ${(stock.change ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <span className="font-mono">
                          {(stock.change ?? 0) >= 0 ? '+' : ''}{(stock.change ?? 0).toFixed(2)}
                        </span>
                        <span className="ml-1">
                          ({(stock.percentChange ?? 0) >= 0 ? '+' : ''}{(stock.percentChange ?? 0).toFixed(2)}%)
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono text-gray-400">
                        {(stock.volume ?? 0).toLocaleString()}
                      </td>
                      <td className="p-2 text-center">
                        {editingStock === stock.symbol ? (
                          <div className="flex justify-center space-x-1">
                            <button
                              onClick={() => saveStockEdit(stock.symbol)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelStockEdit}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center space-x-1">
                            <button
                              onClick={() => startEditingStock(stock)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteStock(stock.symbol)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add New Stock Form */}
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-lg font-medium mb-3">Add New Stock</h3>
              <form onSubmit={addNewStock} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Symbol (e.g. AAPL)"
                  value={addStockForm.symbol}
                  onChange={(e) => setAddStockForm(prev => ({ ...prev, symbol: e.target.value }))}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Company Name"
                  value={addStockForm.name}
                  onChange={(e) => setAddStockForm(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                  required
                />
                <input
                  type="number"
                  placeholder="Initial Price"
                  value={addStockForm.price}
                  onChange={(e) => setAddStockForm(prev => ({ ...prev, price: e.target.value }))}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                  step="0.01"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                >
                  Add Stock
                </button>
              </form>
            </div>

            {/* Bulk Operations */}
            <div className="border-t border-gray-700 pt-4 mt-4">
              <h3 className="text-lg font-medium mb-3">Bulk Operations</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => bulkUpdateStocks('simulate')}
                  className="tooltip px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  data-tooltip="Apply random market fluctuations to all stocks (±5% variation)"
                >
                  Simulate Market
                </button>
                <button
                  onClick={() => bulkUpdateStocks('bull')}
                  className="tooltip px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                  data-tooltip="Increase all stock prices by 20% to simulate a bull market"
                >
                  Bull Market (+)
                </button>
                <button
                  onClick={() => bulkUpdateStocks('bear')}
                  className="tooltip px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                  data-tooltip="Decrease all stock prices by 20% to simulate a bear market"
                >
                  Bear Market (-)
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to reset all ${state.stocks.length} stocks to their initial prices? This cannot be undone.`)) {
                      bulkUpdateStocks('reset');
                    }
                  }}
                  className="tooltip px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                  data-tooltip="Reset all stocks to their original prices when first added to the system"
                >
                  Reset to Initial
                </button>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="5.5"
                    value={bulkPercentage}
                    onChange={(e) => setBulkPercentage(e.target.value)}
                    className="w-20 px-2 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    step="0.1"
                  />
                  <span className="text-gray-400">%</span>
                  <button
                    onClick={() => bulkUpdateStocks('percentage', parseFloat(bulkPercentage))}
                    disabled={!bulkPercentage}
                    className="tooltip px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    data-tooltip="Apply the specified percentage change to all stock prices (positive or negative)"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* System Controls Section */}
          {state.controls && (
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">⚙️ System Controls</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    System Status
                  </label>
                  <button
                    onClick={togglePause}
                    className={`w-full px-4 py-2 rounded transition-colors ${
                      state.controls.isPaused 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-yellow-600 hover:bg-yellow-700'
                    }`}
                  >
                    {state.controls.isPaused ? '▶️ Resume System' : '⏸️ Pause System'}
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="block text-sm font-medium text-gray-300">
                      Update Speed
                    </label>
                    <Tooltip 
                      content="How fast stock prices refresh. Lower = faster updates, Higher = smoother performance."
                      position="top"
                    >
                      <div className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-blue-600 rounded-full cursor-help hover:bg-blue-500 transition-colors">
                        ?
                      </div>
                    </Tooltip>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      step="50"
                      value={state.controls.updateIntervalMs}
                      onChange={(e) => handleUpdateSpeed(parseInt(e.target.value))}
                      className="w-full update-speed-slider"
                    />
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Ultra Fast (0.1s)</span>
                      <span>{state.controls.updateIntervalMs}ms - {getSpeedLabel(state.controls.updateIntervalMs)}</span>
                      <span>Smooth (5.0s)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Volatility: {state.controls.volatility}%
                    </label>
                    <Tooltip 
                      content="How much prices can change. Lower = stable prices, Higher = dramatic swings."
                      position="top"
                    >
                      <div className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-blue-600 rounded-full cursor-help hover:bg-blue-500 transition-colors">
                        ?
                      </div>
                    </Tooltip>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={state.controls.volatility}
                    onChange={(e) => updateControls({ volatility: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Currency Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Currency
                  </label>
                  
                  {/* Currency Information Display */}
                  <div className="bg-gray-700 p-3 rounded-md border border-gray-600 mb-3">
                    <h4 className="text-base font-medium text-gray-300 mb-2">💱 Currency Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Currency:</span>
                        <span className="text-white font-medium">{getCurrencyInfo(state.controls.selectedCurrency).name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Symbol:</span>
                        <span className="text-white font-medium">{getCurrencyInfo(state.controls.selectedCurrency).symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Code:</span>
                        <span className="text-white font-medium">{state.controls.selectedCurrency}</span>
                      </div>
                    </div>
                  </div>
                  
                  <select
                    value={state.controls.selectedCurrency}
                    onChange={(e) => updateControls({ selectedCurrency: e.target.value as Currency })}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-white"
                  >
                    {Object.entries(CURRENCIES).map(([code, info]) => {
                      const currencyInfo = getCurrencyInfo(code);
                      return (
                        <option key={code} value={code}>
                          {currencyInfo.flag} {currencyInfo.symbol} {info.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </JWTAuthGuard>
  );
};

export default RemoteControlPanelJWT;
