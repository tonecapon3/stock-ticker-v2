"use client";

import React, { useEffect, useState } from 'react';
import { StockInfo } from '@/lib/types';

interface StockTickerProps {
  stock: StockInfo;
}

export function StockTicker({ stock }: StockTickerProps) {
  // Local state to track animation effects
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevPrice, setPrevPrice] = useState(stock.currentPrice);

  // Set up animation effect when price changes
  useEffect(() => {
    if (prevPrice !== stock.currentPrice) {
      setIsAnimating(true);
      setPrevPrice(stock.currentPrice);
      
      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 1000); // Match this with your CSS transition duration
      
      return () => clearTimeout(timer);
    }
  }, [stock.currentPrice, prevPrice]);

  // Determine color based on price change
  const priceChangeColor = stock.percentageChange > 0 
    ? 'text-green-600' 
    : stock.percentageChange < 0 
      ? 'text-red-600' 
      : 'text-gray-600';
  
  // Animation class
  const animationClass = isAnimating 
    ? (stock.percentageChange >= 0 ? 'animate-price-up' : 'animate-price-down')
    : '';

  return (
    <div className="py-4 border-b last:border-b-0">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">{stock.name}</h3>
          <p className="text-sm text-gray-500">{stock.symbol}</p>
          <p className="text-xs text-gray-400">
            Last updated: {stock.lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        
        <div className={`text-right ${priceChangeColor} ${animationClass}`}>
          <p className="text-xl font-bold">
            ${stock.currentPrice.toFixed(2)}
          </p>
          
          <p className="text-sm flex items-center justify-end">
            {stock.percentageChange > 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : stock.percentageChange < 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : null}
            {stock.percentageChange > 0 ? '+' : ''}
            {stock.percentageChange.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}

// Component to display a list of stock tickers
export function StockTickerList({ stocks }: { stocks: StockInfo[] }) {
  return (
    <div className="divide-y">
      {stocks.map((stock) => (
        <StockTicker key={stock.symbol} stock={stock} />
      ))}
      
      {stocks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No stocks available. Add some stocks to get started.</p>
        </div>
      )}
    </div>
  );
}
