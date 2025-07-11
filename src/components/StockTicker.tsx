import React, { useEffect, useRef, useState } from 'react';
import { StockInfo, formatPrice } from '../lib/types';
import { useTickerContext } from '../lib/context';

// Utility function to format price changes
const formatPriceChange = (percentageChange: number): string => {
  return `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(2)}%`;
};

// Get appropriate classes for price changes - colors, animation, etc.
const getPriceChangeClasses = (percentageChange: number): string => {
  if (percentageChange > 0) {
    return 'text-green-400 group-hover:text-green-300';
  } else if (percentageChange < 0) {
    return 'text-red-400 group-hover:text-red-300';
  }
  return 'text-gray-400 group-hover:text-gray-300';
};

// Get price color based on comparison with initial price
const getPriceColorBasedOnInitial = (currentPrice: number, initialPrice: number): string => {
  if (currentPrice >= initialPrice) {
    return 'text-green-400'; // Green if equal or higher than initial price
  } else {
    return 'text-red-400'; // Red if lower than initial price
  }
};

// Calculate time since the last update
const getTimeSinceUpdate = (lastUpdated: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
  
  if (diffInSeconds < 5) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  return `${diffInMinutes}m ago`;
};

type StockTickerItemProps = {
  stock: StockInfo;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
};

// Component for individual stock item in the list
const StockTickerItem: React.FC<StockTickerItemProps> = ({ stock, isSelected, onSelect }) => {
  const { tickerState } = useTickerContext();
  const { symbol, name, currentPrice, percentageChange, lastUpdated } = stock;
  const priceRef = useRef<HTMLSpanElement>(null);
  const [prevPrice, setPrevPrice] = useState<number>(currentPrice);
  
  // Effect to animate price changes
  useEffect(() => {
    if (prevPrice !== currentPrice) {
      // Add flash animation when price changes
      if (priceRef.current) {
        priceRef.current.classList.add('animate-flash');
        
        // Remove animation class after animation completes
        setTimeout(() => {
          if (priceRef.current) {
            priceRef.current.classList.remove('animate-flash');
          }
        }, 1000);
      }
      
      setPrevPrice(currentPrice);
    }
  }, [currentPrice, prevPrice]);
  
  return (
    <div 
      className={`
        group p-3 rounded-lg transition-all duration-200 ease-in-out 
        hover:bg-gray-800 cursor-pointer border
        ${isSelected ? 'border-blue-500 bg-blue-900 hover:bg-blue-800' : 'border-transparent'}
      `}
      onClick={() => onSelect(symbol)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(symbol);
          e.preventDefault();
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
    >
      <div className="flex justify-between items-center">
        <div>
          <div className={`font-medium ${symbol === 'B&O' ? 'text-yellow-400' : 'text-white'}`}>{symbol}</div>
          <div className="text-sm text-gray-400 truncate max-w-[180px]">{name}</div>
        </div>
        
        <div className="text-right">
          <span className={`font-semibold block ${getPriceColorBasedOnInitial(stock.currentPrice, stock.initialPrice)}`} ref={priceRef}>
            {formatPrice(currentPrice, tickerState.selectedCurrency)}
          </span>
          
          <div className={`flex items-center text-sm ${getPriceChangeClasses(percentageChange)}`}>
            {percentageChange > 0 ? (
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : percentageChange < 0 ? (
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <span className="w-3 h-3 mr-1 inline-block">—</span>
            )}
            <span>{formatPriceChange(percentageChange)}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-1 text-xs text-gray-500 text-right">
        {getTimeSinceUpdate(lastUpdated)}
      </div>
    </div>
  );
};

interface StockTickerListProps {
  stocks: StockInfo[];
}

// Main stock ticker list component
export const StockTickerList: React.FC<StockTickerListProps> = ({ stocks }) => {
  const { tickerState, selectStock } = useTickerContext();
  const { selectedStock } = tickerState;
  
  // If no stocks are provided, show a message
  if (!stocks || stocks.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400">
        No stocks available
      </div>
    );
  }

  const handleKeyNavigation = (event: React.KeyboardEvent, currentIndex: number) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      
      const nextIndex = event.key === 'ArrowDown' 
        ? (currentIndex + 1) % stocks.length 
        : (currentIndex - 1 + stocks.length) % stocks.length;
      
      const nextSymbol = stocks[nextIndex].symbol;
      selectStock(nextSymbol);
      
      // Focus the next element
      const elements = document.querySelectorAll('[role="button"]');
      if (elements[nextIndex]) {
        (elements[nextIndex] as HTMLElement).focus();
      }
    }
  };
  
  return (
    <div 
      className="space-y-2 max-h-[500px] overflow-y-auto pr-1"
      role="listbox"
      aria-label="Stock ticker list"
    >
      {stocks.map((stock, index) => (
        <div key={stock.symbol} onKeyDown={(e) => handleKeyNavigation(e, index)}>
          <StockTickerItem 
            stock={stock} 
            isSelected={selectedStock === stock.symbol}
            onSelect={selectStock}
          />
        </div>
      ))}
    </div>
  );
};

// Add to global.css - this will be used for price change animations
// @keyframes flash {
//   0%, 100% { background-color: transparent; }
//   50% { background-color: rgba(59, 130, 246, 0.2); }
// }
// 
// .animate-flash {
//   animation: flash 1s ease-in-out;
// }
