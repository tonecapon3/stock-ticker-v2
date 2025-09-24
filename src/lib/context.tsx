/* Cache bust: 1758754196880 */
"use client";

import React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, ErrorInfo } from 'react';
import { logger } from '../config/env';
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
  Currency,
  validateCurrency,
  convertCurrency,
  CURRENCY_RATES,
} from './types';
import { shouldUseApiServer, buildApiUrl, API_ENDPOINTS, isDevelopment, checkApiHealth } from './config';
import { generateMultipleStockHistories, generateRealisticPriceChange, updatePriceHistory } from '../utils/dataGenerator';
import { tokenStorage } from '../auth/utils/index';
import { authenticateWithJWTBridge, isJWTBridgeAuthenticated, getJWTBridgeHeaders, clearJWTBridge } from '../auth/utils/clerkJwtBridge';
import { useAuth } from '../hooks/useAuth';
import { useClerkJWTBridge } from '../hooks/useClerkJWTBridge';

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
    logger.error('Error checking memory usage:', err);
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

/**
 * Get JWT authentication headers for API requests
 * Supports both direct JWT auth and Clerk-bridged JWT auth
 */
function getJWTAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Check if we have JWT bridge authentication (for Clerk users)
  if (isJWTBridgeAuthenticated()) {
    console.log('🔗 Using JWT bridge headers for authentication');
    return getJWTBridgeHeaders();
  }
  
  // Fallback to direct JWT token storage
  const token = tokenStorage.getJWTToken() || tokenStorage.getAccessToken();
  const sessionId = tokenStorage.getSessionId();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('🔑 Using direct JWT token for authentication:', `Bearer ${token.substring(0, 20)}...`);
  } else {
    console.warn('⚠️ No JWT token available - API calls will fail with 401');
  }
  
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
    console.log('📋 Using session ID:', sessionId);
  }
  
  return headers;
}

// Create the context with a default undefined value
export const TickerContext = createContext<TickerContextType | undefined>(undefined);

// Default stock ticker configuration
const DEFAULT_UPDATE_INTERVAL = 1000; // 1 second for smoother updates

// Generate fake price histories for default stocks
const defaultStockData = [
  { symbol: 'BNOX', name: 'Bane&Ox Inc.', basePrice: 185.75 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 176.30 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', basePrice: 415.20 },
];

// Generate historical data for all stocks
const stockHistories = generateMultipleStockHistories(defaultStockData);

const DEFAULT_STOCKS: StockInfo[] = defaultStockData.map(stock => {
  const priceHistory = stockHistories[stock.symbol];
  // Get the most recent price from the generated history
  const mostRecentPrice = priceHistory[priceHistory.length - 1].price;
  
  return {
    symbol: stock.symbol,
    name: stock.name,
    currentPrice: mostRecentPrice,
    previousPrice: priceHistory.length > 1 ? priceHistory[priceHistory.length - 2].price : mostRecentPrice,
    initialPrice: stock.basePrice,
    percentChange: ((mostRecentPrice - stock.basePrice) / stock.basePrice) * 100,
    lastUpdated: new Date(),
    priceHistory: priceHistory,
  };
});

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
  // Get Clerk auth state
  const { isSignedIn } = useAuth();
  
  // Initialize Clerk-JWT bridge for API authentication
  const { isBridging, isBridged, bridgeError, isReadyForAPI } = useClerkJWTBridge();
  
  // State for handling errors
  const [error, setError] = useState<string | null>(null);
  
  // Initialize state with default values
  const [tickerState, setTickerState] = useState<TickerState>({
    stocks: DEFAULT_STOCKS,
    updateIntervalMs: DEFAULT_UPDATE_INTERVAL,
    isPaused: false,
    selectedStock: DEFAULT_STOCKS[0]?.symbol, // Default to first stock
    selectedCurrency: 'USD', // Default currency
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
   * Set price for a specific stock with validation and rate limiting
   */
  const setPrice = useCallback((symbol: string, price: number): ValidationResult => {
    try {
      
      // Regular single stock price update
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
            const percentChange = ((price - previousPrice) / previousPrice) * 100;
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
              percentChange,
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
        initialPrice: initialPrice,
        percentChange: 0,
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
   * Change the selected currency with validation
   */
  const changeCurrency = useCallback((currency: Currency): ValidationResult => {
    try {
      // Validate currency
      const currencyValidation = validateCurrency(currency);
      if (!currencyValidation.isValid) {
        return currencyValidation;
      }
      
      // Check rate limiting for currency changes
      const rateLimiter = getRateLimiter('changeCurrency');
      const rateLimitCheck = checkRateLimit(rateLimiter, 30, 60000); // 30 currency changes per minute max
      if (!rateLimitCheck.isValid) {
        return rateLimitCheck;
      }
      
      // Convert all stock prices to the new currency
      safelyUpdateState(prevState => {
        const convertedStocks = prevState.stocks.map((stock) => {
          // Convert current, previous, and initial prices
          const convertedCurrentPrice = convertCurrency(stock.currentPrice, prevState.selectedCurrency, currency);
          const convertedPreviousPrice = convertCurrency(stock.previousPrice, prevState.selectedCurrency, currency);
          const convertedInitialPrice = convertCurrency(stock.initialPrice, prevState.selectedCurrency, currency);
          
          // Convert price history
          const convertedHistory = stock.priceHistory.map(point => ({
            ...point,
            price: convertCurrency(point.price, prevState.selectedCurrency, currency)
          }));
          
          return {
            ...stock,
            currentPrice: convertedCurrentPrice,
            previousPrice: convertedPreviousPrice,
            initialPrice: convertedInitialPrice,
            priceHistory: convertedHistory,
            // Recalculate percentage change in the new currency
            percentChange: convertedPreviousPrice > 0 
              ? ((convertedCurrentPrice - convertedPreviousPrice) / convertedPreviousPrice) * 100
              : 0
          };
        });
        
        return {
          ...prevState,
          selectedCurrency: currency,
          stocks: convertedStocks
        };
      });
      
      return { isValid: true };
    } catch (err) {
      console.error('Error changing currency:', err);
      setError(`Error changing currency: ${err instanceof Error ? err.message : String(err)}`);
      return { 
        isValid: false, 
        errorMessage: `Internal error changing currency: ${err instanceof Error ? err.message : String(err)}` 
      };
    }
  }, [tickerState.selectedCurrency, tickerState.stocks, getRateLimiter, safelyUpdateState]);

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
   * Fetch stocks from API server
   */
  const fetchStocksFromAPI = useCallback(async (): Promise<void> => {
    // Skip API calls if no API server is configured
    if (!shouldUseApiServer()) {
      console.log('🏭 API server disabled, using local data only');
      return;
    }
    
    console.log('🔄 Attempting to fetch stocks from API...');
    try {
      const apiUrl = buildApiUrl(API_ENDPOINTS.STOCKS);
      const headers = getJWTAuthHeaders();
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
      });
      
      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        // If API is not available, continue with local data
        console.warn('⚠️ API server not available, using local stock data');
        return;
      }
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('⚠️ API server returned non-JSON response, using local stock data');
        return;
      }
      
      let data;
      try {
        data = await response.json();
        console.log('📊 Received data from API:', data);
      } catch (jsonError) {
        console.warn('⚠️ Failed to parse API JSON response:', jsonError);
        return;
      }
      
      if (data.success && data.stocks) {
        console.log('✅ Merging API data with local state intelligently');
        safelyUpdateState(prevState => {
          console.log('📈 Previous stocks:', prevState.stocks.length);
          
          // Start with API stocks as the authoritative source
          const mergedStocks: any[] = [];
          
          // Process each API stock and merge with local data if available
          data.stocks.forEach((apiStock: any) => {
            // Find corresponding local stock
            const localStock = prevState.stocks.find(s => s.symbol === apiStock.symbol);
            
            if (!localStock) {
              // New stock from API - add it
              console.log(`📊 Adding new stock from API: ${apiStock.symbol}`);
              mergedStocks.push({
                ...apiStock,
                lastUpdated: new Date(apiStock.lastUpdated),
                priceHistory: apiStock.priceHistory.map((point: any) => ({
                  ...point,
                  timestamp: new Date(point.timestamp)
                }))
              });
              return;
            }
            
            // Convert API timestamps
            const apiPriceHistory = apiStock.priceHistory.map((point: any) => ({
              ...point,
              timestamp: new Date(point.timestamp)
            }));
            
            // If API has richer data (more points), use it
            // Otherwise, preserve local rich data and just update current price
            let finalPriceHistory;
            if (apiPriceHistory.length >= localStock.priceHistory.length) {
              // API has equal or more data points, use API data
              console.log(`📊 ${localStock.symbol}: Using API data (${apiPriceHistory.length} points)`);
              finalPriceHistory = apiPriceHistory;
            } else {
              // Local data is richer, merge intelligently
              console.log(`📊 ${localStock.symbol}: Merging API current price with local history`);
              
              // Update local history with API's current price if it's newer
              const apiLastUpdate = new Date(apiStock.lastUpdated);
              const localLastUpdate = localStock.lastUpdated;
              
              if (apiLastUpdate > localLastUpdate) {
                // API has newer data, add the new price point
                finalPriceHistory = updatePriceHistory(
                  localStock.priceHistory,
                  apiStock.currentPrice,
                  MAX_HISTORY_POINTS
                );
              } else {
                // Keep local data as it's more recent
                finalPriceHistory = localStock.priceHistory;
              }
            }
            
            // Add merged stock data
            mergedStocks.push({
              ...localStock,
              currentPrice: apiStock.currentPrice,
              previousPrice: apiStock.previousPrice,
              percentChange: apiStock.percentChange, // Fixed: API returns percentChange not percentageChange
              lastUpdated: new Date(apiStock.lastUpdated),
              priceHistory: finalPriceHistory
            });
          });
          
          // Check for removed stocks
          const removedStocks = prevState.stocks.filter(localStock => 
            !data.stocks.find((apiStock: any) => apiStock.symbol === localStock.symbol)
          );
          
          if (removedStocks.length > 0) {
            console.log(`🗑️ Stocks removed from API:`, removedStocks.map(s => s.symbol).join(', '));
          }
          
          // Check if the currently selected stock was removed
          let newSelectedStock = prevState.selectedStock;
          if (newSelectedStock && removedStocks.find(s => s.symbol === newSelectedStock)) {
            // Selected stock was removed, select the first available stock or null
            newSelectedStock = mergedStocks.length > 0 ? mergedStocks[0].symbol : null;
            console.log(`📌 Selected stock was removed, switching to: ${newSelectedStock || 'none'}`);
          }
          
          console.log('📈 Merged stocks:', mergedStocks.length);
          
          return {
            ...prevState,
            stocks: mergedStocks,
            selectedStock: newSelectedStock
          };
        });
        console.log('✅ Intelligent merge completed successfully');
      } else {
        console.warn('⚠️ API response missing success or stocks data');
      }
    } catch (err) {
      // Silently continue with local data if API is unavailable
      console.error('❌ Could not fetch from API, using local data:', err);
    }
  }, [safelyUpdateState]);
  
  /**
   * Fetch controls from API server
   */
  const fetchControlsFromAPI = useCallback(async (): Promise<void> => {
    // Skip API calls if no API server is configured
    if (!shouldUseApiServer()) {
      console.log('🏭 API server disabled, using local controls only');
      return;
    }
    
    console.log('🔄 Attempting to fetch controls from API...');
    try {
      const apiUrl = buildApiUrl(API_ENDPOINTS.CONTROLS);
      const headers = getJWTAuthHeaders();
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
      });
      
      console.log('📡 Controls API Response status:', response.status);
      
      if (!response.ok) {
        // If API is not available, continue with local data
        console.warn('⚠️ Controls API server not available, using local control data');
        return;
      }
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('⚠️ Controls API server returned non-JSON response, using local control data');
        return;
      }
      
      let data;
      try {
        data = await response.json();
        console.log('📊 Received controls data from API:', data);
      } catch (jsonError) {
        console.warn('⚠️ Failed to parse controls API JSON response:', jsonError);
        return;
      }
      
      if (data.success && data.controls) {
        console.log('✅ Updating local state with API control data');
        safelyUpdateState(prevState => {
          const newPaused = data.controls.isPaused;
          const newCurrency = data.controls.selectedCurrency;
          const newInterval = data.controls.updateIntervalMs;
          
          console.log(`🎛️ Syncing controls - Paused: ${prevState.isPaused} → ${newPaused}, Currency: ${prevState.selectedCurrency} → ${newCurrency}`);
          
          return {
            ...prevState,
            isPaused: newPaused,
            selectedCurrency: newCurrency,
            updateIntervalMs: newInterval
          };
        });
        console.log('✅ Control state updated successfully');
      } else {
        console.warn('⚠️ API response missing success or controls data');
      }
    } catch (err) {
      // Silently continue with local data if API is unavailable
      console.error('❌ Could not fetch controls from API, using local data:', err);
    }
  }, [safelyUpdateState]);

  /**
   * Effect to sync with API server periodically
   * Waits for Clerk-JWT bridge to be ready before syncing
   */
  useEffect(() => {
    console.log('🔄 Setting up API sync...');
    console.log('🔗 JWT Bridge Status:', { isBridging, isBridged, isReadyForAPI, bridgeError });
    
    // Wait for JWT bridge to be ready if API server is configured
    if (shouldUseApiServer() && !isReadyForAPI) {
      if (isBridging) {
        console.log('⏳ Waiting for JWT bridge authentication to complete...');
        return;
      }
      if (bridgeError) {
        console.error('❌ JWT bridge error:', bridgeError);
        console.warn('💡 Application will run in local-only mode due to auth error');
        return;
      }
      // If not bridging and not ready, skip for now
      return;
    }
    
    // Check API health first
    const initializeApiSync = async () => {
      if (shouldUseApiServer()) {
        console.log('🌡️ Checking API server health...');
        const healthCheck = await checkApiHealth(3000);
        
        if (healthCheck.isHealthy) {
          console.log(`✅ API server is healthy (${healthCheck.responseTime}ms response time)`);
        } else {
          console.warn(`⚠️ API server health check failed: ${healthCheck.error}`);
          console.warn('💡 Application will run in local-only mode');
          return;
        }
      }
      
      // Initial fetch from API (will gracefully fail if unhealthy)
      if (isReadyForAPI) {
        console.log('🚀 JWT bridge is ready, starting API sync...');
        fetchStocksFromAPI();
        fetchControlsFromAPI();
      }
    };
    
    initializeApiSync();
    
    // Set up periodic sync with API server only if authenticated
    let apiSyncInterval: NodeJS.Timeout | null = null;
    if (isReadyForAPI) {
      apiSyncInterval = setInterval(() => {
        console.log('⏰ Periodic API sync triggered (authenticated)');
        fetchStocksFromAPI();
        fetchControlsFromAPI();
      }, 5000); // Sync every 5 seconds to reduce server load
    }
    
    return () => {
      if (apiSyncInterval) {
        console.log('🛑 Cleaning up API sync interval');
        clearInterval(apiSyncInterval);
      }
    };
  }, [fetchStocksFromAPI, fetchControlsFromAPI, isBridging, isBridged, isReadyForAPI, bridgeError]);

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
          
          // Check if API server is available and providing data
          const isApiActive = shouldUseApiServer();
          
          // If API is active, reduce local update frequency to avoid conflicts
          if (isApiActive) {
            // Only update occasionally when API is active (let API drive updates)
            const shouldSkipUpdate = Math.random() > 0.3; // Skip 70% of local updates
            if (shouldSkipUpdate) {
              console.log('🔄 Skipping local update - letting API drive changes');
              return prevState;
            }
          }

          console.log(`💫 Performing ${isApiActive ? 'supplemental' : 'primary'} local price update`);
          
          // Update each stock with realistic price fluctuation
          const updatedStocks = prevState.stocks.map((stock) => {
            // Use smaller changes when API is active
            const maxChange = isApiActive ? 0.5 : 2; // Smaller changes when API is active
            const newPrice = generateRealisticPriceChange(stock.currentPrice, maxChange);
            
            // Ensure price stays within security constraints
            const constrainedPrice = Math.max(SECURITY_CONSTRAINTS.MIN_STOCK_PRICE, 
                                     Math.min(SECURITY_CONSTRAINTS.MAX_STOCK_PRICE, newPrice));
            
            const percentChange = ((constrainedPrice - stock.initialPrice) / stock.initialPrice) * 100;
            const timestamp = new Date();
            
            // Update price history using the utility function
            const updatedHistory = updatePriceHistory(stock.priceHistory, constrainedPrice, MAX_HISTORY_POINTS);
            
            return {
              ...stock,
              previousPrice: stock.currentPrice,
              currentPrice: constrainedPrice,
              percentChange,
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
    changeCurrency,
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
