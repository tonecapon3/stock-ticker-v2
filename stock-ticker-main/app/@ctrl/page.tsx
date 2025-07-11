"use client";

import React, { useState, FormEvent, useEffect } from 'react';
import { useTickerContext } from '@/lib/context';
import { StockInfo, SECURITY_CONSTRAINTS, CurrencyCode } from '@/lib/types';

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
  const { stocks, updateIntervalMs, isPaused, currency } = tickerState;

  // State for the new stock form
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockName, setNewStockName] = useState('');
  const [newStockPrice, setNewStockPrice] = useState('');
  const [formError, setFormError] = useState('');

  // State for selected stock
  const [selectedStock, setSelectedStock] = useState<string>(stocks.length > 0 ? stocks[0].symbol : '');

  // Handle price change from slider or direct input
  const handlePriceChange = (value: number) => {
    if (selectedStock) {
      setPrice(selectedStock, value);
    }
  };

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

  // Get the currently selected stock object
  const currentStock = stocks.find(stock => stock.symbol === selectedStock);

  // Apply the dark select options styling when component mounts
  useEffect(() => {
    styleOptionsForDarkMode();
  }, []);

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
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-400">
            <span>Fast (500ms)</span>
            <span>{updateIntervalMs}ms</span>
            <span>Slow (5000ms)</span>
          </div>
        </div>
      </div>

      {/* Currency Selection Control */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-3">Currency Selection</h3>
        <div className="space-y-3">
          <label htmlFor="currency-select" className="block text-sm font-medium text-gray-300 mb-1">
            Select Currency
          </label>
          <select
            id="currency-select"
            value={currency}
            onChange={(e) => changeCurrency(e.target.value as CurrencyCode)}
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
            {SECURITY_CONSTRAINTS.ALLOWED_CURRENCIES.map(currencyCode => (
              <option key={currencyCode} value={currencyCode}>
                {currencyCode}
              </option>
            ))}
          </select>
          <div className="text-sm text-gray-400">
            <span>Currency used for displaying stock prices</span>
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
                <span className="text-lg font-bold text-blue-400">
                  {currency === 'USD' ? '$' : 
                   currency === 'EUR' ? '€' : 
                   currency === 'GBP' ? '£' : 
                   currency === 'JPY' ? '¥' : 
                   currency === 'CAD' ? 'C$' :
                   currency === 'INR' ? '₹' :
                   'Fr.'}
                  {currentStock.currentPrice.toFixed(2)}
                </span>
              </div>
              
              <div className="space-y-3">
                <input
                  type="range"
                  min={Math.max(0.01, currentStock.currentPrice * 0.5)}
                  max={currentStock.currentPrice * 1.5}
                  step="0.01"
                  value={currentStock.currentPrice}
                  onChange={(e) => handlePriceChange(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={currentStock.currentPrice}
                    onChange={(e) => handlePriceChange(parseFloat(e.target.value))}
                    className="w-28 p-2 border border-gray-700 rounded-md bg-black text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  <button
                    onClick={() => removeStock(currentStock.symbol)}
                    className="ml-auto text-sm px-3 py-1 bg-red-900 text-red-100 hover:bg-red-800 rounded-md transition-colors"
                  >
                    Remove Stock
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
              Initial Price ({
                currency === 'USD' ? '$' : 
                currency === 'EUR' ? '€' : 
                currency === 'GBP' ? '£' : 
                currency === 'JPY' ? '¥' : 
                currency === 'CAD' ? 'C$' :
                currency === 'INR' ? '₹' :
                'Fr.'
              })
            </label>
            <input
              id="price"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="150.00"
              value={newStockPrice}
              onChange={(e) => setNewStockPrice(e.target.value)}
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
