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
import { shouldUseApiServer, buildApiUrl, API_ENDPOINTS, isDevelopment } from './config';
import { InterpolationEngine, InterpolatedPricePoint } from './interpolationEngine';
import { globalPerformanceMonitor, PerformanceMetrics } from './performanceMonitor';

// Enhanced state interface with interpolation support
interface EnhancedTickerState extends TickerState {
  // Performance and interpolation settings
  localUpdateInterval: number; // Fast local update interval
  apiSyncInterval: number; // Slower API sync interval
  isApiConnected: boolean; // API connection status
  interpolationEnabled: boolean; // Whether interpolation is enabled
  adaptiveUpdatesEnabled: boolean; // Whether adaptive updates are enabled
  performanceMetrics?: PerformanceMetrics; // Current performance metrics
}

// Enhanced context type with new capabilities
interface EnhancedTickerContextType extends TickerContextType {
  enhancedState: EnhancedTickerState;
  // Performance monitoring
  getPerformanceMetrics: () => PerformanceMetrics;
  toggleInterpolation: () => void;
  toggleAdaptiveUpdates: () => void;
  // Interpolation controls
  setLocalUpdateSpeed: (intervalMs: number) => ValidationResult;
  getInterpolationStatus: (symbol: string) => {
    isInterpolating: boolean;
    progress: number;
    step: number;
    totalSteps: number;
  };
}

// Create the enhanced context
export const EnhancedTickerContext = createContext<EnhancedTickerContextType | undefined>(undefined);

// Default enhanced state
const DEFAULT_LOCAL_UPDATE_INTERVAL = 375; // 375ms for smooth interpolation
const DEFAULT_API_SYNC_INTERVAL = 3000; // 3 seconds for API sync

const DEFAULT_ENHANCED_STOCKS: StockInfo[] = [
  {
    symbol: 'BNOX',
    name: 'Bane&Ox Inc.',
    currentPrice: 185.75,
    previousPrice: 185.75,
    initialPrice: 185.75,
    percentageChange: 0,
    lastUpdated: new Date(),
    priceHistory: [{ timestamp: new Date(), price: 185.75 }],
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    currentPrice: 176.30,
    previousPrice: 176.30,
    initialPrice: 176.30,
    percentageChange: 0,
    lastUpdated: new Date(),
    priceHistory: [{ timestamp: new Date(), price: 176.30 }],
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    currentPrice: 415.20,
    previousPrice: 415.20,
    initialPrice: 415.20,
    percentageChange: 0,
    lastUpdated: new Date(),
    priceHistory: [{ timestamp: new Date(), price: 415.20 }],
  },
];

// Enhanced provider component
export const EnhancedTickerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);
  
  // Initialize enhanced state
  const [enhancedState, setEnhancedState] = useState<EnhancedTickerState>({
    stocks: DEFAULT_ENHANCED_STOCKS,
    updateIntervalMs: DEFAULT_LOCAL_UPDATE_INTERVAL, // This becomes the local update interval
    isPaused: false,
    selectedStock: DEFAULT_ENHANCED_STOCKS[0]?.symbol,
    selectedCurrency: 'USD',
    rateLimiters: {},
    retryTrackers: {},
    memoryStats: getMemoryUsage(),
    lastDebouncedAction: Date.now(),
    // Enhanced properties
    localUpdateInterval: DEFAULT_LOCAL_UPDATE_INTERVAL,
    apiSyncInterval: DEFAULT_API_SYNC_INTERVAL,
    isApiConnected: false,
    interpolationEnabled: true,
    adaptiveUpdatesEnabled: true,
    performanceMetrics: globalPerformanceMonitor.getMetrics(),
  });

  // Interpolation engine
  const interpolationEngine = useRef(new InterpolationEngine());
  
  // Track intervals
  const localUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const apiSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const performanceMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rateLimitersRef = useRef<{[key: string]: RateLimitTracker}>(enhancedState.rateLimiters);

  // Safely update state
  const safelyUpdateState = useCallback((
    updateFn: (prevState: EnhancedTickerState) => EnhancedTickerState
  ): void => {
    try {
      setEnhancedState(prevState => {
        try {
          return updateFn(prevState);
        } catch (err) {
          console.error('Error updating enhanced ticker state:', err);
          setError(`Error updating ticker: ${err instanceof Error ? err.message : String(err)}`);
          return prevState;
        }
      });
    } catch (err) {
      console.error('Critical error in enhanced state update:', err);
      setError(`Critical error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  // Get or initialize a rate limiter
  const getRateLimiter = useCallback((action: string): RateLimitTracker => {
    if (!rateLimitersRef.current[action]) {
      rateLimitersRef.current[action] = {
        lastUpdateTimestamp: Date.now(),
        updateCount: 0,
        isRateLimited: false
      };
      
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

  // Enhanced local price update with interpolation
  const updateLocalPrices = useCallback(() => {
    const startTime = performance.now();
    
    try {
      safelyUpdateState(prevState => {
        if (prevState.isPaused) return prevState;

        const updatedStocks = prevState.stocks.map((stock) => {
          let newPricePoint: InterpolatedPricePoint;

          if (prevState.interpolationEnabled && prevState.isApiConnected) {
            // Use interpolation when API is connected
            newPricePoint = interpolationEngine.current.getInterpolatedPrice(stock.symbol);
          } else {
            // Use local generation when offline or interpolation disabled
            newPricePoint = interpolationEngine.current.generateLocalPrice(stock.symbol, stock.currentPrice);
          }

          const newPrice = Math.max(SECURITY_CONSTRAINTS.MIN_STOCK_PRICE, 
                          Math.min(SECURITY_CONSTRAINTS.MAX_STOCK_PRICE, newPricePoint.price));
          
          const percentageChange = ((newPrice - stock.previousPrice) / stock.previousPrice) * 100;
          const timestamp = newPricePoint.timestamp;
          
          // Add to price history
          const updatedHistory = [...stock.priceHistory, { timestamp, price: newPrice }];
          if (updatedHistory.length > MAX_HISTORY_POINTS) {
            updatedHistory.shift();
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

      // Record performance metrics
      globalPerformanceMonitor.recordUpdateTime(startTime);
    } catch (err) {
      console.error('Error in local price update:', err);
      setError(`Error in local update: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [safelyUpdateState]);

  // API sync function
  const syncWithAPI = useCallback(async (): Promise<void> => {
    if (!shouldUseApiServer()) {
      safelyUpdateState(prevState => ({ ...prevState, isApiConnected: false }));
      return;
    }

    try {
      const stocksUrl = buildApiUrl(API_ENDPOINTS.STOCKS);
      const controlsUrl = buildApiUrl(API_ENDPOINTS.CONTROLS);

      // Add timeout and better error handling
      const fetchWithTimeout = async (url: string, timeout = 5000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };

      // Fetch both stocks and controls with timeout
      const [stocksResponse, controlsResponse] = await Promise.allSettled([
        fetchWithTimeout(stocksUrl),
        fetchWithTimeout(controlsUrl)
      ]);

      let hasValidConnection = false;
      let newState = { ...enhancedState };

      // Handle stocks response
      if (stocksResponse.status === 'fulfilled' && stocksResponse.value.ok) {
        try {
          const contentType = stocksResponse.value.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const stocksData = await stocksResponse.value.json();
            
            if (stocksData.success && stocksData.stocks) {
              hasValidConnection = true;
              const apiStocks = stocksData.stocks.map((apiStock: any) => ({
                ...apiStock,
                lastUpdated: new Date(apiStock.lastUpdated),
                priceHistory: apiStock.priceHistory.map((point: any) => ({
                  ...point,
                  timestamp: new Date(point.timestamp)
                }))
              }));

              // Set interpolation targets for each stock
              apiStocks.forEach((apiStock: StockInfo) => {
                interpolationEngine.current.setApiPrice(apiStock.symbol, apiStock.currentPrice);
              });

              newState.stocks = apiStocks;
            }
          }
        } catch (jsonError) {
          console.warn('Failed to parse stocks JSON response:', jsonError);
        }
      }

      // Handle controls response
      if (controlsResponse.status === 'fulfilled' && controlsResponse.value.ok) {
        try {
          const contentType = controlsResponse.value.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const controlsData = await controlsResponse.value.json();
            
            if (controlsData.success && controlsData.controls) {
              hasValidConnection = true;
              newState.isPaused = controlsData.controls.isPaused;
              newState.selectedCurrency = controlsData.controls.selectedCurrency;
              newState.apiSyncInterval = controlsData.controls.updateIntervalMs;
            }
          }
        } catch (jsonError) {
          console.warn('Failed to parse controls JSON response:', jsonError);
        }
      }

      // Update connection status
      newState.isApiConnected = hasValidConnection;
      safelyUpdateState(() => newState);
      
      if (!hasValidConnection) {
        console.log('🔴 API server not available, using local data only');
      } else {
        console.log('🟢 API server connected successfully');
      }
      
    } catch (err) {
      console.log('🔴 API server connection failed, using local data only:', err instanceof Error ? err.message : String(err));
      safelyUpdateState(prevState => ({ ...prevState, isApiConnected: false }));
    }
  }, [safelyUpdateState, enhancedState]);

  // Performance monitoring and adaptation
  const updatePerformanceAndAdapt = useCallback(() => {
    const metrics = globalPerformanceMonitor.getMetrics();
    
    safelyUpdateState(prevState => {
      const newState = { ...prevState, performanceMetrics: metrics };
      
      if (prevState.adaptiveUpdatesEnabled) {
        const adaptiveSettings = globalPerformanceMonitor.getAdaptiveSettings();
        
        // Update interpolation engine configuration
        interpolationEngine.current.updateConfig({
          steps: adaptiveSettings.interpolationSteps,
          microFluctuationEnabled: adaptiveSettings.enableMicroFluctuations,
          noiseReduction: adaptiveSettings.enableSmoothing,
        });

        // Update local update interval
        newState.localUpdateInterval = adaptiveSettings.updateInterval;
      }
      
      return newState;
    });
  }, [safelyUpdateState]);

  // Start performance monitoring
  useEffect(() => {
    globalPerformanceMonitor.startMonitoring();
    
    // Set up performance monitoring interval
    performanceMonitorIntervalRef.current = setInterval(updatePerformanceAndAdapt, 2000); // Every 2 seconds
    
    return () => {
      globalPerformanceMonitor.stopMonitoring();
      if (performanceMonitorIntervalRef.current) {
        clearInterval(performanceMonitorIntervalRef.current);
        performanceMonitorIntervalRef.current = null;
      }
    };
  }, [updatePerformanceAndAdapt]);

  // Local update loop effect
  useEffect(() => {
    if (enhancedState.isPaused) {
      if (localUpdateIntervalRef.current) {
        clearInterval(localUpdateIntervalRef.current);
        localUpdateIntervalRef.current = null;
      }
      return;
    }

    localUpdateIntervalRef.current = setInterval(updateLocalPrices, enhancedState.localUpdateInterval);

    return () => {
      if (localUpdateIntervalRef.current) {
        clearInterval(localUpdateIntervalRef.current);
        localUpdateIntervalRef.current = null;
      }
    };
  }, [enhancedState.localUpdateInterval, enhancedState.isPaused, updateLocalPrices]);

  // API sync loop effect
  useEffect(() => {
    // Initial sync
    syncWithAPI();
    
    // Set up periodic sync
    apiSyncIntervalRef.current = setInterval(syncWithAPI, enhancedState.apiSyncInterval);

    return () => {
      if (apiSyncIntervalRef.current) {
        clearInterval(apiSyncIntervalRef.current);
        apiSyncIntervalRef.current = null;
      }
    };
  }, [enhancedState.apiSyncInterval, syncWithAPI]);

  // Enhanced context methods
  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    return globalPerformanceMonitor.getMetrics();
  }, []);

  const toggleInterpolation = useCallback(() => {
    safelyUpdateState(prevState => ({
      ...prevState,
      interpolationEnabled: !prevState.interpolationEnabled
    }));
  }, [safelyUpdateState]);

  const toggleAdaptiveUpdates = useCallback(() => {
    safelyUpdateState(prevState => ({
      ...prevState,
      adaptiveUpdatesEnabled: !prevState.adaptiveUpdatesEnabled
    }));
  }, [safelyUpdateState]);

  const setLocalUpdateSpeed = useCallback((intervalMs: number): ValidationResult => {
    const intervalValidation = validateUpdateInterval(intervalMs);
    if (!intervalValidation.isValid) {
      return intervalValidation;
    }

    const rateLimiter = getRateLimiter('setLocalUpdateSpeed');
    const rateLimitCheck = checkRateLimit(rateLimiter, 10, 60000);
    if (!rateLimitCheck.isValid) {
      return rateLimitCheck;
    }

    safelyUpdateState(prevState => ({
      ...prevState,
      localUpdateInterval: intervalMs,
    }));

    return { isValid: true };
  }, [getRateLimiter, safelyUpdateState]);

  const getInterpolationStatus = useCallback((symbol: string) => {
    return interpolationEngine.current.getInterpolationStatus(symbol);
  }, []);

  // Wrap the original context methods to work with enhanced state
  const setPrice = useCallback((symbol: string, price: number): ValidationResult => {
    // Implementation similar to original, but adapted for enhanced state
    const sanitizedSymbol = sanitizeStockSymbol(symbol);
    const symbolValidation = validateStockSymbol(sanitizedSymbol);
    if (!symbolValidation.isValid) return symbolValidation;
    
    const priceValidation = validateStockPrice(price);
    if (!priceValidation.isValid) return priceValidation;
    
    const rateLimiter = getRateLimiter(`setPrice-${sanitizedSymbol}`);
    const rateLimitCheck = checkRateLimit(rateLimiter);
    if (!rateLimitCheck.isValid) return rateLimitCheck;
    
    const stockExists = enhancedState.stocks.some(s => s.symbol === sanitizedSymbol);
    if (!stockExists) {
      return { isValid: false, errorMessage: `Stock with symbol ${sanitizedSymbol} does not exist` };
    }
    
    // Set interpolation target
    interpolationEngine.current.setApiPrice(sanitizedSymbol, price);
    
    return { isValid: true };
  }, [enhancedState.stocks, getRateLimiter]);

  // Create the enhanced context value by extending the original context interface
  const contextValue: EnhancedTickerContextType = {
    // Map enhanced state to original ticker state interface
    tickerState: {
      stocks: enhancedState.stocks,
      updateIntervalMs: enhancedState.localUpdateInterval,
      isPaused: enhancedState.isPaused,
      selectedStock: enhancedState.selectedStock,
      selectedCurrency: enhancedState.selectedCurrency,
      rateLimiters: enhancedState.rateLimiters,
      retryTrackers: enhancedState.retryTrackers,
      memoryStats: enhancedState.memoryStats,
      lastDebouncedAction: enhancedState.lastDebouncedAction,
    },
    enhancedState,
    
    // Enhanced methods
    getPerformanceMetrics,
    toggleInterpolation,
    toggleAdaptiveUpdates,
    setLocalUpdateSpeed,
    getInterpolationStatus,
    
    // Original methods (simplified implementations for brevity)
    setPrice,
    updateSpeed: (intervalMs: number) => setLocalUpdateSpeed(intervalMs),
    togglePause: () => {
      safelyUpdateState(prevState => ({ ...prevState, isPaused: !prevState.isPaused }));
    },
    addStock: () => ({ isValid: false, errorMessage: 'Not implemented in enhanced context' }),
    removeStock: () => ({ isValid: false, errorMessage: 'Not implemented in enhanced context' }),
    selectStock: (symbol: string) => {
      safelyUpdateState(prevState => ({ ...prevState, selectedStock: symbol }));
      return { isValid: true };
    },
    getStockPriceHistory: (symbol: string) => {
      const stock = enhancedState.stocks.find(s => s.symbol === symbol);
      return stock ? [...stock.priceHistory] : [];
    },
    changeCurrency: () => ({ isValid: false, errorMessage: 'Not implemented in enhanced context' }),
    validateInput: {
      stockSymbol: validateStockSymbol,
      stockName: validateStockName,
      stockPrice: validateStockPrice,
      updateInterval: validateUpdateInterval,
    },
    saveStateToStorage: () => ({ isValid: false, errorMessage: 'Not implemented in enhanced context' }),
    loadStateFromStorage: () => ({ isValid: false, errorMessage: 'Not implemented in enhanced context' }),
    getMemoryUsage: () => getMemoryUsage(),
    maskSensitiveData: (data: any) => data, // Simplified implementation
  };

  return (
    <EnhancedTickerContext.Provider value={contextValue}>
      {error && (
        <div className="ticker-error-notification">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      {children}
    </EnhancedTickerContext.Provider>
  );
};

// Custom hook to use the enhanced context
export const useEnhancedTickerContext = (): EnhancedTickerContextType => {
  const context = useContext(EnhancedTickerContext);
  
  if (context === undefined) {
    throw new Error('useEnhancedTickerContext must be used within an EnhancedTickerProvider');
  }
  
  return context;
};
