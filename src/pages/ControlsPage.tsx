import React, { useState, FormEvent, useEffect } from 'react';
import { useTickerContext } from '../lib/context';
import { StockInfo, Currency, CURRENCIES, formatPrice } from '../lib/types';

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

  // Get the currently selected stock object (moved before useEffects)
  const currentStock = stocks.find(stock => stock.symbol === selectedStock);

  // Handle price change from slider (immediate update)
  const handleSliderChange = (value: number) => {
    if (selectedStock) {
      setPrice(selectedStock, value);
      // Don't update tempPrice from slider to keep input field independent
    }
  };

  // Handle submit button for price adjustment
  const handlePriceSubmit = (e: FormEvent) => {
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
    
    const price = parseFloat(tempPrice);
    if (isNaN(price) || price <= 0) {
      setPriceError('Price must be a positive number');
      return;
    }
    
    if (price < 0.01 || price > 1000000) {
      setPriceError('Price must be between $0.01 and $1,000,000');
      return;
    }
    
    const result = setPrice(selectedStock, price);
    if (!result.isValid && result.errorMessage) {
      setPriceError(result.errorMessage);
      return;
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
    if (currentStock && isHydrated) {
      setTempPrice(currentStock.currentPrice.toString());
      setPriceError('');
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

      {/* Update Speed Control */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-3">Update Speed</h3>
        <div className="space-y-3">
          <input
            type="range"
            min="500"
            max="5000"
            step="100"
            value={updateIntervalMs}
            onChange={(e) => updateSpeed(parseInt(e.target.value))}
            className="w-full update-speed-slider"
          />
          <div className="flex justify-between text-sm text-gray-400">
            <span>Fast (500ms)</span>
            <span>{updateIntervalMs}ms</span>
            <span>Slow (5000ms)</span>
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
                MozAppearance: 'none',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.7rem top 50%',
                backgroundSize: '0.65rem auto'
              }}
            >
              {stocks.map(stock => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.name}
                </option>
              ))}
            </select>
          </div>

          {currentStock && (
            <>
              <div className="flex items-center gap-4 mb-4 bg-gray-800 p-3 rounded-md border border-gray-700">
                <span className="text-sm font-medium text-gray-300">Current Price: </span>
                <span className="text-lg font-bold text-blue-400">{formatPrice(currentStock.currentPrice, selectedCurrency)}</span>
              </div>
              
              <form onSubmit={handlePriceSubmit} className="space-y-3">
                {priceError && (
                  <div className="p-2 bg-red-900 text-red-100 text-sm rounded-md">
                    {priceError}
                  </div>
                )}
                
                <input
                  type="range"
                  min={Math.max(0.01, currentStock.currentPrice * 0.5)}
                  max={currentStock.currentPrice * 1.5}
                  step="0.01"
                  value={currentStock.currentPrice}
                  onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                  className="w-full"
                />
                
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label htmlFor="price-input" className="block text-xs font-medium text-gray-400 mb-1">
                      Enter New Price
                    </label>
                    <input
                      id="price-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={tempPrice}
                      onChange={(e) => setTempPrice(e.target.value)}
                      placeholder="Enter price..."
                      className="w-full p-2 border border-gray-700 rounded-md bg-black text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium text-sm"
                  >
                    Apply Price
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => removeStock(currentStock.symbol)}
                    className="px-3 py-2 bg-red-900 text-red-100 hover:bg-red-800 rounded-md transition-colors text-sm"
                  >
                    Remove
                  </button>
                </div>
              </form>
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
              onChange={(e) => {
                const newCurrency = e.target.value as Currency;
                const result = changeCurrency(newCurrency);
                if (!result.isValid && result.errorMessage) {
                  console.error('Currency change failed:', result.errorMessage);
                  // You could add a toast notification here
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
    </div>
  );
}
