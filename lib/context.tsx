"use client";

import React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, ErrorInfo } from 'react';
import { 
  StockInfo, 
  TickerContextType, 
  TickerState, 
  PricePoint, 
  MAX_HISTORY_POINTS,
  ValidationResult,
  RateLimitTracker,
  SECURITY_CONSTRAINTS,
  validateStockSymbol,
  validateStockName,
  validateStockPrice,
  validateUpdateInterval,
  sanitizeStockSymbol,
  sanitizeStockName,
  checkRateLimit,
  getMemoryUsage,
  MemoryStats,
} from './types';

// Secure storage response type definition
interface SecureStorageResponse<T> {
  result: ValidationResult;
  data?: T;
}

/**
 * Check if memory usage is within limits
 */
function checkMemoryUsage(memStats: MemoryStats): ValidationResult {
  try {
    const memoryLimitMB = SECURITY_CONSTRAINTS.MAX_MEMORY_USAGE_MB;
    if (memStats.usedJSHeapSize > memoryLimitMB * 1024 * 1024) {
      return {
        isValid: false,
        errorMessage: `Memory usage (${Math.round(memStats.usedJSHeapSize / (1024 * 1024))}MB) exceeds limit (${memoryLimitMB}MB)`
      };
    }
    return { isValid: true };
  } catch (err) {
    console.error('Error checking memory usage:', err);
    return {
      isValid: false,
      errorMessage: `Failed to check memory: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Save data to secure localStorage with encryption
 */
function saveToSecureStorage<T>(key: string, data: T): ValidationResult {
  try {
    // Basic validation
    if (!key || typeof key !== 'string') {
      return { isValid: false, errorMessage: 'Invalid storage key' };
    }
    
    // Convert data to string
    const dataString = JSON.stringify(data);
    
    // In a real app, we'd encrypt this data before storing
    // For this example, we'll just base64 encode it
    const encodedData = btoa(dataString);
    
    // Save to localStorage with a prefix for identification
    localStorage.setItem(`secure_ticker_${key}`, encodedData);
    
    return { isValid: true };
  } catch (err) {
    console.error('Failed to save to secure storage:', err);
    return {
      isValid: false,
      errorMessage: `Storage error: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Load data from secure localStorage with decryption
 */
function loadFromSecureStorage<T>(key: string): SecureStorageResponse<T> {
  try {
    // Basic validation
    if (!key || typeof key !== 'string') {
      return {
        result: { isValid: false, errorMessage: 'Invalid storage key' }
      };
    }
    
    // Get from localStorage
    const encodedData = localStorage.getItem(`secure_ticker_${key}`);
    
    // Handle missing data
    if (!encodedData) {
      return {
        result: { isValid: false, errorMessage: 'No data found in storage' }
      };
    }
    
    // In a real app, we'd decrypt this data
    // For this example, we'll just base64 decode it
    const dataString = atob(encodedData);
    
    // Parse the JSON data
    const data = JSON.parse(dataString) as T;
    
    return {
      result: { isValid: true },
      data
    };
  } catch (err) {
    console.error('Failed to load from secure storage:', err);
    return {
      result: {
        isValid: false,
        errorMessage: `Storage error: ${err instanceof Error ? err.message : String(err)}`
      }
    };
  }
}

/**
 * Mask sensitive data for logging and display
 */
function maskSensitiveData(data: any): any {
  if (!data) return data;
  
  if (typeof data === 'object') {
    const maskedData = { ...data };
    
    // Mask sensitive fields
    const sensitiveFields = ['password', 'token', 'api_key', 'apiKey', 'secret'];
    for (const field of sensitiveFields) {
      if (field in maskedData) {
        maskedData[field] = '********';
      }
    }
    
    // Recursively mask nested objects
    for (const key in maskedData) {
      if (typeof maskedData[key] === 'object' && maskedData[key] !== null) {
        maskedData[key] = maskSensitiveData(maskedData[key]);
      }
    }
    
    return maskedData;
  }
  
  return data;
}

// Create the context with a default undefined value
export const TickerContext = createContext<TickerContextType | undefined>(undefined);

// Default stock ticker configuration
const DEFAULT_UPDATE_INTERVAL = 2000; // 2 seconds
const DEFAULT_STOCKS: StockInfo[] = [
  {
    symbol: 'BNOX',
    name: 'Bane&Ox',
    currentPrice: 185.75,
    previousPrice: 185.75,
    percentageChange: 0,
    lastUpdated: new Date(),
    priceHistory: [{ timestamp: new Date(), price: 185.75 }],
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    currentPrice: 176.30,
    previousPrice: 176.30,
    percentageChange: 0,
    lastUpdated: new Date(),
    priceHistory: [{ timestamp: new Date(), price: 176.30 }],
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    currentPrice: 415.20,
    previousPrice: 415.20,
    percentageChange: 0,
    lastUpdated: new Date(),
    priceHistory: [{ timestamp: new Date(), price: 415.20 }],
  },
];

/**
 * Error boundary component for catching and displaying errors
 */
class TickerErrorBoundary extends React.Component<
  { children: ReactNode; onError: (error: Error, errorInfo: ErrorInfo) => void },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: ReactNode; onError: (error: Error, errorInfo: ErrorInfo) => void }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error and notify parent
    console.error('Ticker error:', error, errorInfo);
    this.props.onError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ticker-error">
          <h3>Something went wrong with the stock ticker.</h3>
          <p>{this.state.errorMessage}</p>
          <button onClick={() => this.setState({ hasError: false })}>Try Again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Provider component for the context
export const TickerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State for handling errors
  const [error, setError] = useState<string | null>(null);
  
  // Initialize state with default values
  const [tickerState, setTickerState] = useState<TickerState>({
    stocks: DEFAULT_STOCKS,
    updateIntervalMs: DEFAULT_UPDATE_INTERVAL,
    isPaused: false,
    selectedStock: DEFAULT_STOCKS[0]?.symbol, // Default to first stock
    rateLimiters: {}, // Initialize empty rate limiters
    retryTrackers: {}, // Initialize empty retry trackers
    memoryStats: getMemoryUsage(), // Initial memory stats (might be undefined)
    lastDebouncedAction: Date.now(), // Initialize debounce timestamp
  });
  // Keep a local reference of rate limiters to avoid state update issues
  const rateLimitersRef = useRef<{[key: string]: RateLimitTracker}>(tickerState.rateLimiters);
  
  // Track update intervals for cleanup
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  
  // Error handling for the error boundary
  const handleError = useCallback((error: Error, errorInfo: ErrorInfo) => {
    console.error('Ticker error boundary caught error:', error, errorInfo);
    setError(`Error in ticker: ${error.message}`);
    
    // Pause ticker on severe errors
    if (!tickerState.isPaused) {
      setTickerState(prev => ({
        ...prev,
        isPaused: true
      }));
    }
  }, [tickerState.isPaused]);

  /**
   * Safely update ticker state with error handling
   */
  const safelyUpdateState = useCallback((
    updateFn: (prevState: TickerState) => TickerState
  ): void => {
    try {
      setTickerState(prevState => {
        try {
          return updateFn(prevState);
        } catch (err) {
          console.error('Error updating ticker state:', err);
          setError(`Error updating ticker: ${err instanceof Error ? err.message : String(err)}`);
          return prevState; // Return unchanged state on error
        }
      });
    } catch (err) {
      console.error('Critical error in state update:', err);
      setError(`Critical error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  /**
   * Get or initialize a rate limiter for a specific action
   */
  const getRateLimiter = useCallback((action: string): RateLimitTracker => {
    // Check if we already have this rate limiter in our ref
    if (!rateLimitersRef.current[action]) {
      // Initialize a new rate limiter
      rateLimitersRef.current[action] = {
        lastUpdateTimestamp: Date.now(),
        updateCount: 0,
        isRateLimited: false
      };
      
      // Update state to persist the rate limiter
      safelyUpdateState(prevState => ({
        ...prevState,
        rateLimiters: {
          ...prevState.rateLimiters,
          [action]: rateLimitersRef.current[action]
        }
      }));
    }
    
    return rateLimitersRef.current[action];
  }, [safelyUpdateState]);

  /**
   * Validation utilities - exposed to consumers
   */
  const validateInput = {
    stockSymbol: validateStockSymbol,
    stockName: validateStockName,
    stockPrice: validateStockPrice,
    updateInterval: validateUpdateInterval,
  };

  /**
   * Set price for a specific stock and update its price history
   * with validation and rate limiting
   */
  const setPrice = useCallback((symbol: string, price: number): ValidationResult => {
    try {
      // Sanitize and validate input
      const sanitizedSymbol = sanitizeStockSymbol(symbol);
      const symbolValidation = validateStockSymbol(sanitizedSymbol);
      if (!symbolValidation.isValid) {
        return symbolValidation;
      }
      
      const priceValidation = validateStockPrice(price);
      if (!priceValidation.isValid) {
        return priceValidation;
      }
      
      // Check rate limiting for price updates
      const rateLimiter = getRateLimiter(`setPrice-${sanitizedSymbol}`);
      const rateLimitCheck = checkRateLimit(rateLimiter);
      if (!rateLimitCheck.isValid) {
        return rateLimitCheck;
      }
      
      // Stock exists check
      const stockExists = tickerState.stocks.some(s => s.symbol === sanitizedSymbol);
      if (!stockExists) {
        return {
          isValid: false,
          errorMessage: `Stock with symbol ${sanitizedSymbol} does not exist`
        };
      }
      
      // Update the state with the new price
      safelyUpdateState(prevState => {
        const updatedStocks = prevState.stocks.map((stock) => {
          if (stock.symbol === sanitizedSymbol) {
            const previousPrice = stock.currentPrice;
            const percentageChange = ((price - previousPrice) / previousPrice) * 100;
            const timestamp = new Date();
            
            // Add the new price to history, keeping only MAX_HISTORY_POINTS
            const newPricePoint: PricePoint = { timestamp, price };
            const updatedHistory = [...stock.priceHistory, newPricePoint];
            
            if (updatedHistory.length > MAX_HISTORY_POINTS) {
              updatedHistory.shift(); // Remove oldest point if exceeding max
            }
            
            return {
              ...stock,
              previousPrice,
              currentPrice: price,
              percentageChange,
              lastUpdated: timestamp,
              priceHistory: updatedHistory,
            };
          }
          return stock;
        });
        
        return {
          ...prevState,
          stocks: updatedStocks,
        };
      });
      
      return { isValid: true };
    } catch (err) {
      console.error('Error setting price:', err);
      setError(`Error setting price: ${err instanceof Error ? err.message : String(err)}`);
      return { 
        isValid: false, 
        errorMessage: `Internal error setting price: ${err instanceof Error ? err.message : String(err)}` 
      };
    }
  }, [tickerState.stocks, getRateLimiter, safelyUpdateState]);

  /**
   * Update speed of price updates with validation
   */
  const updateSpeed = useCallback((intervalMs: number): ValidationResult => {
    try {
      // Validate interval
      const intervalValidation = validateUpdateInterval(intervalMs);
      if (!intervalValidation.isValid) {
        return intervalValidation;
      }
      
      // Check rate limiting for update speed changes
      const rateLimiter = getRateLimiter('updateSpeed');
      const rateLimitCheck = checkRateLimit(rateLimiter, 10, 60000); // More restrictive: only 10 changes per minute
      if (!rateLimitCheck.isValid) {
        return rateLimitCheck;
      }
      
      // Update interval
      safelyUpdateState(prevState => ({
        ...prevState,
        updateIntervalMs: intervalMs,
      }));
      
      return { isValid: true };
    } catch (err) {
      console.error('Error updating speed:', err);
      setError(`Error updating speed: ${err instanceof Error ? err.message : String(err)}`);
      return { 
        isValid: false, 
        errorMessage: `Internal error updating speed: ${err instanceof Error ? err.message : String(err)}` 
      };
    }
  }, [getRateLimiter, safelyUpdateState]);

  /**
   * Toggle pause state for real-time updates
   */
  const togglePause = useCallback(() => {
    try {
      safelyUpdateState(prevState => ({
        ...prevState,
        isPaused: !prevState.isPaused,
      }));
    } catch (err) {
      console.error('Error toggling pause state:', err);
      setError(`Error toggling pause: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [safelyUpdateState]);

  /**
   * Add a new stock to the ticker with initial price history
   * with validation and sanitation
   */
  const addStock = useCallback((symbol: string, name: string, initialPrice: number): ValidationResult => {
    try {
      // Sanitize and validate inputs
      const sanitizedSymbol = sanitizeStockSymbol(symbol);
      const sanitizedName = sanitizeStockName(name);
      
      const symbolValidation = validateStockSymbol(sanitizedSymbol);
      if (!symbolValidation.isValid) {
        return symbolValidation;
      }
      
      const nameValidation = validateStockName(sanitizedName);
      if (!nameValidation.isValid) {
        return nameValidation;
      }
      
      const priceValidation = validateStockPrice(initialPrice);
      if (!priceValidation.isValid) {
        return priceValidation;
      }
      
      // Check rate limiting for adding stocks
      const rateLimiter = getRateLimiter('addStock');
      const rateLimitCheck = checkRateLimit(rateLimiter, 20, 60000); // 20 new stocks per minute max
      if (!rateLimitCheck.isValid) {
        return rateLimitCheck;
      }
      
      // Check for duplicate stock
      const stockExists = tickerState.stocks.some(s => s.symbol === sanitizedSymbol);
      if (stockExists) {
        return {
          isValid: false,
          errorMessage: `Stock with symbol ${sanitizedSymbol} already exists`
        };
      }
      
      // Create new stock
      const timestamp = new Date();
      const newStock: StockInfo = {
        symbol: sanitizedSymbol,
        name: sanitizedName,
        currentPrice: initialPrice,
        previousPrice: initialPrice,
        percentageChange: 0,
        lastUpdated: timestamp,
        priceHistory: [{ timestamp, price: initialPrice }],
      };
      
      // Update state
      safelyUpdateState(prevState => ({
        ...prevState,
        stocks: [...prevState.stocks, newStock],
        // If this is the first stock, select it automatically
        selectedStock: prevState.selectedStock || sanitizedSymbol,
      }));
      
      return { isValid: true };
    } catch (err) {
      console.error('Error adding stock:', err);
      setError(`Error adding stock: ${err instanceof Error ? err.message : String(err)}`);
      return { 
        isValid: false, 
        errorMessage: `Internal error adding stock: ${err instanceof Error ? err.message : String(err)}` 
      };
    }
  }, [tickerState.stocks, getRateLimiter, safelyUpdateState]);

  /**
   * Remove a stock from the ticker with validation
   */
  const removeStock = useCallback((symbol: string): ValidationResult => {
    try {
      // Sanitize and validate input
      const sanitizedSymbol = sanitizeStockSymbol(symbol);
      const symbolValidation = validateStockSymbol(sanitizedSymbol);
      if (!symbolValidation.isValid) {
        return symbolValidation;
      }
      
      // Check if stock exists
      const stockExists = tickerState.stocks.some(s => s.symbol === sanitizedSymbol);
      if (!stockExists) {
        return {
          isValid: false,
          errorMessage: `Stock with symbol ${sanitizedSymbol} does not exist`
        };
      }
      
      // Check rate limiting for removing stocks
      const rateLimiter = getRateLimiter('removeStock');
      const rateLimitCheck = checkRateLimit(rateLimiter, 20, 60000); // 20 removals per minute max
      if (!rateLimitCheck.isValid) {
        return rateLimitCheck;
      }
      
      // Update state
      safelyUpdateState(prevState => {
        // Get filtered stocks
        const filteredStocks = prevState.stocks.filter(stock => stock.symbol !== sanitizedSymbol);
        
        // If we're removing the currently selected stock, select another one if available
        let newSelectedStock = prevState.selectedStock;
        if (prevState.selectedStock === sanitizedSymbol) {
          newSelectedStock = filteredStocks.length > 0 ? filteredStocks[0].symbol : undefined;
        }
        
        return {
          ...prevState,
          stocks: filteredStocks,
          selectedStock: newSelectedStock,
        };
      });
      
      return { isValid: true };
    } catch (err) {
      console.error('Error removing stock:', err);
      setError(`Error removing stock: ${err instanceof Error ? err.message : String(err)}`);
      return { 
        isValid: false, 
        errorMessage: `Internal error removing stock: ${err instanceof Error ? err.message : String(err)}` 
      };
    }
  }, [tickerState.stocks, getRateLimiter, safelyUpdateState]);

  /**
   * Select a stock for detailed viewing in the graph
   * with validation
   */
  const selectStock = useCallback((symbol: string): ValidationResult => {
    try {
      // Sanitize and validate input
      const sanitizedSymbol = sanitizeStockSymbol(symbol);
      const symbolValidation = validateStockSymbol(sanitizedSymbol);
      if (!symbolValidation.isValid) {
        return symbolValidation;
      }
      
      // Check if stock exists
      const stockExists = tickerState.stocks.some(s => s.symbol === sanitizedSymbol);
      if (!stockExists) {
        return {
          isValid: false,
          errorMessage: `Stock with symbol ${sanitizedSymbol} does not exist`
        };
      }
      
      // Check rate limiting for selecting stocks (less restrictive)
      const rateLimiter = getRateLimiter('selectStock');
      const rateLimitCheck = checkRateLimit(rateLimiter, 60, 60000); // 60 selections per minute
      if (!rateLimitCheck.isValid) {
        return rateLimitCheck;
      }
      
      // Update state
      safelyUpdateState(prevState => ({
        ...prevState,
        selectedStock: sanitizedSymbol,
      }));
      
      return { isValid: true };
    } catch (err) {
      console.error('Error selecting stock:', err);
      setError(`Error selecting stock: ${err instanceof Error ? err.message : String(err)}`);
      return { 
        isValid: false, 
        errorMessage: `Internal error selecting stock: ${err instanceof Error ? err.message : String(err)}` 
      };
    }
  }, [tickerState.stocks, getRateLimiter, safelyUpdateState]);

  /**
   * Get price history for a specific stock with safety checks
   */
  const getStockPriceHistory = useCallback((symbol: string): PricePoint[] => {
    try {
      // Sanitize input
      const sanitizedSymbol = sanitizeStockSymbol(symbol);
      if (!sanitizedSymbol) {
        console.warn('Invalid symbol provided to getStockPriceHistory');
        return [];
      }
      
      // Find stock with safety checks
      const stock = tickerState.stocks.find(s => s.symbol === sanitizedSymbol);
      if (!stock) {
        console.warn(`Stock not found: ${sanitizedSymbol}`);
        return [];
      }
      
      // Return a copy of the price history to prevent accidental mutations
      return [...stock.priceHistory];
    } catch (err) {
      console.error('Error getting stock price history:', err);
      setError(`Error getting price history: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }, [tickerState.stocks]);

  /**
   * Memory usage monitoring effect
   */
  useEffect(() => {
    // Set up memory monitoring interval
    const memoryCheckIntervalId = setInterval(() => {
      try {
        const memoryStats = getMemoryUsage();
        
        if (memoryStats) {
          // Check memory usage and pause if exceeding limits
          const memCheck = checkMemoryUsage(memoryStats);
          
          if (!memCheck.isValid && !tickerState.isPaused) {
            console.warn(memCheck.errorMessage);
            setError(`Memory warning: ${memCheck.errorMessage}`);
            
            // Auto-pause on high memory usage
            safelyUpdateState(prevState => ({
              ...prevState,
              isPaused: true,
              memoryStats
            }));
          } else {
            // Just update memory stats
            safelyUpdateState(prevState => ({
              ...prevState,
              memoryStats
            }));
          }
        }
      } catch (err) {
        console.error('Error monitoring memory:', err);
      }
    }, SECURITY_CONSTRAINTS.MEMORY_CHECK_INTERVAL_MS);
    
    // Clean up interval
    return () => {
      clearInterval(memoryCheckIntervalId);
    };
  }, [tickerState.isPaused, safelyUpdateState, setError]);

  /**
   * Effect to update prices randomly on an interval
   * with proper cleanup
   */
  useEffect(() => {
    // Skip setting up interval if paused
    if (tickerState.isPaused) {
      // Clear any existing interval on pause
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }
    
    const updatePrices = () => {
      try {
        safelyUpdateState(prevState => {
          // Skip updates if paused (double-check)
          if (prevState.isPaused) return prevState;

          // Update each stock with a small random price fluctuation
          const updatedStocks = prevState.stocks.map((stock) => {
            // Generate a random fluctuation between -2% and +2%
            const fluctuationPercent = (Math.random() * 4) - 2;
            const fluctuation = stock.currentPrice * (fluctuationPercent / 100);
            const newPrice = Math.max(SECURITY_CONSTRAINTS.MIN_STOCK_PRICE, 
                             Math.min(SECURITY_CONSTRAINTS.MAX_STOCK_PRICE, 
                                    stock.currentPrice + fluctuation));
            
            const percentageChange = ((newPrice - stock.previousPrice) / stock.previousPrice) * 100;
            const timestamp = new Date();
            
            // Add the new price to history, keeping only MAX_HISTORY_POINTS
            const newPricePoint: PricePoint = { timestamp, price: newPrice };
            const updatedHistory = [...stock.priceHistory, newPricePoint];
            
            if (updatedHistory.length > MAX_HISTORY_POINTS) {
              updatedHistory.shift(); // Remove oldest point if exceeding max
            }
            
            return {
              ...stock,
              previousPrice: stock.currentPrice,
              currentPrice: newPrice,
              percentageChange,
              lastUpdated: timestamp,
              priceHistory: updatedHistory,
            };
          });

          return {
            ...prevState,
            stocks: updatedStocks,
          };
        });
      } catch (err) {
        console.error('Error in auto price update:', err);
        setError(`Error in auto update: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    // Set up the interval for auto-updates
    intervalIdRef.current = setInterval(updatePrices, tickerState.updateIntervalMs);

    // Clear the interval when the component unmounts or when dependencies change
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [tickerState.updateIntervalMs, tickerState.isPaused, safelyUpdateState]);

  /**
   * Retry mechanism for operations that might fail
   */
  const retryOperation = useCallback<
    <T>(operation: string, fn: () => T, maxAttempts?: number) => { result: T | undefined; error?: string }
  >(function <T>(operation: string, fn: () => T, maxAttempts = SECURITY_CONSTRAINTS.MAX_RETRY_ATTEMPTS) {
    try {
      // Get or initialize retry tracker
      const now = Date.now();
      let retryTracker = tickerState.retryTrackers[operation];
      
      if (!retryTracker) {
        retryTracker = {
          attempts: 0,
          lastAttempt: now,
          operation
        };
        
        // Update retry trackers state
        safelyUpdateState(prevState => ({
          ...prevState,
          retryTrackers: {
            ...prevState.retryTrackers,
            [operation]: retryTracker
          }
        }));
      }
      
      // If we've exceeded max attempts, reset and return error
      if (retryTracker.attempts >= maxAttempts) {
        // Reset after a delay
        if (now - retryTracker.lastAttempt > SECURITY_CONSTRAINTS.RETRY_DELAY_MS * 2) {
          retryTracker.attempts = 0;
        } else {
          return { 
            result: undefined, 
            error: `Maximum retry attempts (${maxAttempts}) exceeded for ${operation}`
          };
        }
      }
      
      // Increment attempts
      retryTracker.attempts++;
      retryTracker.lastAttempt = now;
      
      // Update retry tracker state
      safelyUpdateState(prevState => ({
        ...prevState,
        retryTrackers: {
          ...prevState.retryTrackers,
          [operation]: retryTracker
        }
      }));
      
      // Attempt operation
      return { result: fn() };
    } catch (err) {
      console.error(`Error in operation ${operation}:`, err);
      return { 
        result: undefined, 
        error: `Operation failed: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }, [tickerState.retryTrackers, safelyUpdateState]);

  /**
   * Save state to secure localStorage
   */
  const saveStateToStorage = useCallback((): ValidationResult => {
    try {
      // Create a safe version of state (exclude some properties)
      const stateToSave = {
        stocks: tickerState.stocks,
        updateIntervalMs: tickerState.updateIntervalMs,
        isPaused: tickerState.isPaused,
        selectedStock: tickerState.selectedStock
      };
      
      // Save to secure storage
      return saveToSecureStorage('tickerState', stateToSave);
    } catch (err) {
      console.error('Error saving state to storage:', err);
      setError(`Error saving state: ${err instanceof Error ? err.message : String(err)}`);
      return {
        isValid: false,
        errorMessage: `Failed to save state: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }, [tickerState, setError]);

  /**
   * Load state from secure localStorage
   */
  const loadStateFromStorage = useCallback((): ValidationResult => {
    try {
      // Load from secure storage
      const { result, data } = loadFromSecureStorage<Partial<TickerState>>('tickerState');
      
      if (!result.isValid || !data) {
        return result;
      }
      
      // Update state with loaded data, preserving other properties
      safelyUpdateState(prevState => ({
        ...prevState,
        ...data,
        // Always preserve these for security
        rateLimiters: prevState.rateLimiters,
        retryTrackers: prevState.retryTrackers,
        memoryStats: getMemoryUsage() || prevState.memoryStats,
      }));
      
      return { isValid: true };
    } catch (err) {
      console.error('Error loading state from storage:', err);
      setError(`Error loading state: ${err instanceof Error ? err.message : String(err)}`);
      return {
        isValid: false,
        errorMessage: `Failed to load state: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }, [safelyUpdateState, setError]);

  /**
   * Get current memory usage stats
   */
  const getMemoryUsageStats = useCallback((): MemoryStats | undefined => {
    // Try to get fresh stats
    const freshStats = getMemoryUsage();
    
    // Return fresh stats or cached stats
    return freshStats || tickerState.memoryStats;
  }, [tickerState.memoryStats]);

  // The value that will be provided to consumers of the context
  const contextValue: TickerContextType = {
    tickerState,
    setPrice,
    updateSpeed,
    togglePause,
    addStock,
    removeStock,
    selectStock,
    getStockPriceHistory,
    validateInput, // Expose validation utilities
    saveStateToStorage,
    loadStateFromStorage,
    getMemoryUsage: getMemoryUsageStats,
    maskSensitiveData,
  };

  return (
    <TickerErrorBoundary onError={handleError}>
      {error && (
        <div className="ticker-error-notification">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      <TickerContext.Provider value={contextValue}>
        {children}
      </TickerContext.Provider>
    </TickerErrorBoundary>
  );
};

/**
 * Custom hook to use the ticker context with error handling
 */
export const useTickerContext = (): TickerContextType => {
  const context = useContext(TickerContext);
  
  if (context === undefined) {
    throw new Error('useTickerContext must be used within a TickerProvider');
  }
  
  return context;
};
