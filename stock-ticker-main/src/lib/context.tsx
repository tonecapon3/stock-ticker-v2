"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StockInfo, TickerContextType, TickerState } from './types';

// Create the context with a default undefined value
export const TickerContext = createContext<TickerContextType | undefined>(undefined);

// Default stock ticker configuration
const DEFAULT_UPDATE_INTERVAL = 2000; // 2 seconds
const DEFAULT_STOCKS: StockInfo[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    currentPrice: 185.75,
    previousPrice: 185.75,
    percentageChange: 0,
    lastUpdated: new Date(),
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    currentPrice: 176.30,
    previousPrice: 176.30,
    percentageChange: 0,
    lastUpdated: new Date(),
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    currentPrice: 415.20,
    previousPrice: 415.20,
    percentageChange: 0,
    lastUpdated: new Date(),
  },
];

interface TickerProviderProps {
  children: ReactNode;
}

export const TickerProvider = ({ children }: TickerProviderProps) => {
  // Initialize state with default values
  const [tickerState, setTickerState] = useState<TickerState>({
    stocks: DEFAULT_STOCKS,
    updateIntervalMs: DEFAULT_UPDATE_INTERVAL,
    isPaused: false,
  });

  // Set price for a specific stock
  const setPrice = (symbol: string, price: number) => {
    if (price < 0) return; // Prevent negative prices
    
    setTickerState((prevState) => {
      const updatedStocks = prevState.stocks.map((stock) => {
        if (stock.symbol === symbol) {
          const previousPrice = stock.currentPrice;
          const percentageChange = ((price - previousPrice) / previousPrice) * 100;
          
          return {
            ...stock,
            previousPrice,
            currentPrice: price,
            percentageChange,
            lastUpdated: new Date(),
          };
        }
        return stock;
      });
      
      return {
        ...prevState,
        stocks: updatedStocks,
      };
    });
  };

  // Update the refresh interval
  const updateSpeed = (intervalMs: number) => {
    if (intervalMs < 100) return; // Minimum update interval
    
    setTickerState((prevState) => ({
      ...prevState,
      updateIntervalMs: intervalMs,
    }));
  };

  // Toggle pause state
  const togglePause = () => {
    setTickerState((prevState) => ({
      ...prevState,
      isPaused: !prevState.isPaused,
    }));
  };

  // Add a new stock to the ticker
  const addStock = (symbol: string, name: string, initialPrice: number) => {
    if (initialPrice < 0) return; // Prevent negative prices
    
    const newStock: StockInfo = {
      symbol,
      name,
      currentPrice: initialPrice,
      previousPrice: initialPrice,
      percentageChange: 0,
      lastUpdated: new Date(),
    };
    
    setTickerState((prevState) => ({
      ...prevState,
      stocks: [...prevState.stocks, newStock],
    }));
  };

  // Remove a stock from the ticker
  const removeStock = (symbol: string) => {
    setTickerState((prevState) => ({
      ...prevState,
      stocks: prevState.stocks.filter((stock) => stock.symbol !== symbol),
    }));
  };

  // Set up automatic price fluctuations based on update interval
  useEffect(() => {
    if (tickerState.isPaused) return;

    const intervalId = setInterval(() => {
      setTickerState((prevState) => {
        // Skip updates if paused
        if (prevState.isPaused) return prevState;

        // Update each stock with a small random price fluctuation
        const updatedStocks = prevState.stocks.map((stock) => {
          // Generate a random fluctuation between -2% and +2%
          const fluctuationPercent = (Math.random() * 4) - 2;
          const fluctuation = stock.currentPrice * (fluctuationPercent / 100);
          const newPrice = Math.max(0.01, stock.currentPrice + fluctuation);
          
          const percentageChange = ((newPrice - stock.previousPrice) / stock.previousPrice) * 100;
          
          return {
            ...stock,
            previousPrice: stock.currentPrice,
            currentPrice: newPrice,
            percentageChange,
            lastUpdated: new Date(),
          };
        });

        return {
          ...prevState,
          stocks: updatedStocks,
        };
      });
    }, tickerState.updateIntervalMs);

    // Clear the interval when the component unmounts or when dependencies change
    return () => clearInterval(intervalId);
  }, [tickerState.updateIntervalMs, tickerState.isPaused]);

  // The value that will be provided to consumers of the context
  const contextValue: TickerContextType = {
    tickerState,
    setPrice,
    updateSpeed,
    togglePause,
    addStock,
    removeStock,
  };

  return (
    <TickerContext.Provider value={contextValue}>
      {children}
    </TickerContext.Provider>
  );
};

// Custom hook to use the ticker context
export const useTickerContext = () => {
  const context = useContext(TickerContext);
  
  if (context === undefined) {
    throw new Error('useTickerContext must be used within a TickerProvider');
  }
  
  return context;
};
