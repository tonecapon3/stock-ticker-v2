// Maximum number of points to store in price history
export const MAX_HISTORY_POINTS = 30;

/**
 * Represents a single price data point with timestamp for historical tracking
 */
export interface PricePoint {
  timestamp: Date;
  price: number;
}

// Enhanced security constraints for the application
export const SECURITY_CONSTRAINTS = {
  // Stock symbols should be 1-5 uppercase letters
  STOCK_SYMBOL_PATTERN: /^[A-Z]{1,5}$/,
  // Stock name constraints
  STOCK_NAME_MAX_LENGTH: 50,
  STOCK_NAME_PATTERN: /^[A-Za-z0-9&\s\-.,]+$/,
  // Price constraints
  MIN_STOCK_PRICE: 0.01,
  MAX_STOCK_PRICE: 1000000, // $1M as a reasonable upper limit
  // Rate limiting (in milliseconds)
  MIN_UPDATE_INTERVAL: 100,
  MAX_PRICE_UPDATES_PER_MINUTE: 120, // 2 updates per second max
  THROTTLE_WINDOW_MS: 60000, // 1 minute window for rate limiting
  // UI security constraints
  DEBOUNCE_MS: 300, // Debounce time for UI interactions
  MAX_STOCKS_ALLOWED: 50, // Maximum number of stocks allowed
  // Memory monitoring
  MEMORY_CHECK_INTERVAL_MS: 10000, // Check memory usage every 10 seconds
  MAX_MEMORY_USAGE_MB: 100, // Maximum allowed memory usage
  // Error retry
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000, // Delay between retry attempts
  // LocalStorage
  STORAGE_PREFIX: 'secure_ticker_',
  STORAGE_ENCRYPTION_KEY: 'TICKER_STORAGE_KEY', // Should be environment variable in production
  // Maximum localStorage items
  MAX_STORAGE_ITEMS: 100,
};

/**
 * Result of validation operations
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Tracker for rate limiting
 */
export interface RateLimitTracker {
  lastUpdateTimestamp: number;
  updateCount: number;
  isRateLimited: boolean;
}

/**
 * Memory usage tracking interface
 */
export interface MemoryStats {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  lastChecked: number;
}

/**
 * Error retry tracking
 */
export interface RetryTracker {
  attempts: number;
  lastAttempt: number;
  operation: string;
}

/**
 * LocalStorage item interface with security metadata
 */
export interface SecureStorageItem<T> {
  data: T;
  timestamp: number;
  checksum: string; // For integrity verification
  version: number;
}

/**
 * Stock information interface
 */
export interface StockInfo {
  // Symbol must follow the pattern in SECURITY_CONSTRAINTS.STOCK_SYMBOL_PATTERN
  symbol: string;
  // Name must follow the pattern in SECURITY_CONSTRAINTS.STOCK_NAME_PATTERN
  name: string;
  // Prices must be between MIN_STOCK_PRICE and MAX_STOCK_PRICE
  currentPrice: number;
  previousPrice: number;
  percentageChange: number;
  lastUpdated: Date;
  priceHistory: PricePoint[];
}

/**
 * Application state for the ticker
 */
export interface TickerState {
  stocks: StockInfo[];
  // Must be at least SECURITY_CONSTRAINTS.MIN_UPDATE_INTERVAL
  updateIntervalMs: number;
  isPaused: boolean;
  selectedStock?: string;
  // Rate limiting state for security
  rateLimiters: {
    [key: string]: RateLimitTracker;
  };
  // New security enhancements
  memoryStats?: MemoryStats;
  retryTrackers: {
    [key: string]: RetryTracker;
  };
  lastDebouncedAction?: number;
}

/**
 * The state maintained by the ticker context
 */
export interface TickerContextType {
  tickerState: TickerState;
  setPrice: (symbol: string, price: number) => ValidationResult;
  updateSpeed: (intervalMs: number) => ValidationResult;
  togglePause: () => void;
  addStock: (symbol: string, name: string, initialPrice: number) => ValidationResult;
  removeStock: (symbol: string) => ValidationResult;
  selectStock: (symbol: string) => ValidationResult;
  getStockPriceHistory: (symbol: string) => PricePoint[];
  // Utility for validation (moved from just implementation to the public interface)
  validateInput: {
    stockSymbol: (symbol: string) => ValidationResult;
    stockName: (name: string) => ValidationResult;
    stockPrice: (price: number) => ValidationResult;
    updateInterval: (intervalMs: number) => ValidationResult;
  };
  // New security enhancement methods
  saveStateToStorage: () => ValidationResult;
  loadStateFromStorage: () => ValidationResult;
  getMemoryUsage: () => MemoryStats | undefined;
  maskSensitiveData: (data: string, type: 'symbol' | 'price') => string;
}

// Sanitization utilities to prevent XSS and other injection attacks
export function sanitizeStockSymbol(symbol: string): string {
  // Only allow uppercase letters, max 5 characters
  return symbol.trim().toUpperCase().replace(/[^A-Z]/g, '').substring(0, 5);
}

export function sanitizeStockName(name: string): string {
  // Remove potentially dangerous characters and limit length
  return name.trim()
    .replace(/[^A-Za-z0-9&\s\-.,]/g, '')
    .substring(0, SECURITY_CONSTRAINTS.STOCK_NAME_MAX_LENGTH);
}

// Input validation functions
export function validateStockSymbol(symbol: string): ValidationResult {
  if (!symbol || typeof symbol !== 'string') {
    return { isValid: false, errorMessage: 'Stock symbol is required' };
  }
  
  if (!SECURITY_CONSTRAINTS.STOCK_SYMBOL_PATTERN.test(symbol)) {
    return { 
      isValid: false, 
      errorMessage: 'Stock symbol must be 1-5 uppercase letters' 
    };
  }
  
  return { isValid: true };
}

export function validateStockName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, errorMessage: 'Stock name is required' };
  }
  
  if (name.length > SECURITY_CONSTRAINTS.STOCK_NAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      errorMessage: `Stock name cannot exceed ${SECURITY_CONSTRAINTS.STOCK_NAME_MAX_LENGTH} characters` 
    };
  }
  
  if (!SECURITY_CONSTRAINTS.STOCK_NAME_PATTERN.test(name)) {
    return { 
      isValid: false, 
      errorMessage: 'Stock name contains invalid characters' 
    };
  }
  
  return { isValid: true };
}

export function validateStockPrice(price: number): ValidationResult {
  if (typeof price !== 'number' || isNaN(price)) {
    return { isValid: false, errorMessage: 'Price must be a valid number' };
  }
  
  if (price < SECURITY_CONSTRAINTS.MIN_STOCK_PRICE) {
    return { 
      isValid: false, 
      errorMessage: `Price cannot be less than ${SECURITY_CONSTRAINTS.MIN_STOCK_PRICE}` 
    };
  }
  
  if (price > SECURITY_CONSTRAINTS.MAX_STOCK_PRICE) {
    return { 
      isValid: false, 
      errorMessage: `Price cannot exceed ${SECURITY_CONSTRAINTS.MAX_STOCK_PRICE}` 
    };
  }
  
  return { isValid: true };
}

export function validateUpdateInterval(intervalMs: number): ValidationResult {
  if (typeof intervalMs !== 'number' || isNaN(intervalMs)) {
    return { isValid: false, errorMessage: 'Update interval must be a valid number' };
  }
  
  if (intervalMs < SECURITY_CONSTRAINTS.MIN_UPDATE_INTERVAL) {
    return { 
      isValid: false, 
      errorMessage: `Update interval cannot be less than ${SECURITY_CONSTRAINTS.MIN_UPDATE_INTERVAL}ms` 
    };
  }
  
  return { isValid: true };
}

// Rate limiting utility
export function checkRateLimit(
  rateLimiter: RateLimitTracker,
  maxUpdates: number = SECURITY_CONSTRAINTS.MAX_PRICE_UPDATES_PER_MINUTE,
  windowMs: number = SECURITY_CONSTRAINTS.THROTTLE_WINDOW_MS
): ValidationResult {
  const now = Date.now();
  
  // Reset counter if window has elapsed
  if (now - rateLimiter.lastUpdateTimestamp > windowMs) {
    rateLimiter.updateCount = 0;
    rateLimiter.isRateLimited = false;
    rateLimiter.lastUpdateTimestamp = now;
  }
  
  // Check if rate limited
  if (rateLimiter.isRateLimited) {
    return {
      isValid: false,
      errorMessage: `Rate limit exceeded. Please try again later.`
    };
  }
  
  // Check if would exceed rate limit
  if (rateLimiter.updateCount >= maxUpdates) {
    rateLimiter.isRateLimited = true;
    return {
      isValid: false,
      errorMessage: `Rate limit of ${maxUpdates} updates per ${windowMs/1000} seconds exceeded.`
    };
  }
  
  // Increment counter
  rateLimiter.updateCount++;
  rateLimiter.lastUpdateTimestamp = now;
  
  return { isValid: true };
}

/**
 * Debounce utility to prevent rapid firing of functions
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = SECURITY_CONSTRAINTS.DEBOUNCE_MS
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

/**
 * Memory monitoring utilities
 */
export function getMemoryUsage(): MemoryStats | undefined {
  try {
    if (typeof performance === 'undefined' || 
        !performance.memory) {
      return undefined;
    }
    
    const memory = performance.memory as {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
    
    return {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
      lastChecked: Date.now()
    };
  } catch (err) {
    console.warn('Memory statistics not available:', err);
    return undefined;
  }
}

export function checkMemoryUsage(memoryStats?: MemoryStats): ValidationResult {
  if (!memoryStats) {
    return { isValid: true }; // Can't check, assume valid
  }
  
  const usedMB = memoryStats.usedJSHeapSize / (1024 * 1024);
  
  if (usedMB > SECURITY_CONSTRAINTS.MAX_MEMORY_USAGE_MB) {
    return {
      isValid: false,
      errorMessage: `Memory usage exceeds limit: ${Math.round(usedMB)}MB used of ${SECURITY_CONSTRAINTS.MAX_MEMORY_USAGE_MB}MB limit`
    };
  }
  
  return { isValid: true };
}

/**
 * Secure storage utilities with encryption
 */
export function generateChecksum(data: string): string {
  // Simple implementation - in production use a proper hashing algorithm
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

export function encryptData(data: string): string {
  // Simple XOR encryption - in production use a proper encryption library
  const key = SECURITY_CONSTRAINTS.STORAGE_ENCRYPTION_KEY;
  let result = '';
  
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  
  // Convert to base64 for safe storage
  return btoa(result);
}

export function decryptData(encryptedData: string): string {
  try {
    // Convert from base64
    const data = atob(encryptedData);
    const key = SECURITY_CONSTRAINTS.STORAGE_ENCRYPTION_KEY;
    let result = '';
    
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    
    return result;
  } catch (err) {
    console.error('Error decrypting data:', err);
    return '';
  }
}

export function saveToSecureStorage<T>(key: string, data: T): ValidationResult {
  try {
    // Convert data to string
    const dataString = JSON.stringify(data);
    
    // Create secure item with metadata
    const secureItem: SecureStorageItem<T> = {
      data,
      timestamp: Date.now(),
      checksum: generateChecksum(dataString),
      version: 1
    };
    
    // Encrypt and store
    const encryptedData = encryptData(JSON.stringify(secureItem));
    localStorage.setItem(
      `${SECURITY_CONSTRAINTS.STORAGE_PREFIX}${key}`,
      encryptedData
    );
    
    return { isValid: true };
  } catch (err) {
    return {
      isValid: false,
      errorMessage: `Failed to save data: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

export function loadFromSecureStorage<T>(key: string): { result: ValidationResult; data?: T } {
  try {
    // Get encrypted data
    const encryptedData = localStorage.getItem(
      `${SECURITY_CONSTRAINTS.STORAGE_PREFIX}${key}`
    );
    
    if (!encryptedData) {
      return {
        result: {
          isValid: false,
          errorMessage: `No data found for key: ${key}`
        }
      };
    }
    
    // Decrypt data
    const decryptedData = decryptData(encryptedData);
    
    if (!decryptedData) {
      return {
        result: {
          isValid: false,
          errorMessage: 'Failed to decrypt data'
        }
      };
    }
    
    // Parse secure item
    const secureItem = JSON.parse(decryptedData) as SecureStorageItem<T>;
    
    // Verify checksum
    const dataString = JSON.stringify(secureItem.data);
    const currentChecksum = generateChecksum(dataString);
    
    if (currentChecksum !== secureItem.checksum) {
      return {
        result: {
          isValid: false,
          errorMessage: 'Data integrity check failed'
        }
      };
    }
    
    return {
      result: { isValid: true },
      data: secureItem.data
    };
  } catch (err) {
    return {
      result: {
        isValid: false,
        errorMessage: `Failed to load data: ${err instanceof Error ? err.message : String(err)}`
      }
    };
  }
}

/**
 * Input masking utilities for sensitive data
 */
export function maskSensitiveData(data: string, type: 'symbol' | 'price'): string {
  if (!data) return '';
  
  switch (type) {
    case 'symbol':
      // Show only first and last character if longer than 2 chars
      if (data.length <= 2) return data;
      return `${data.charAt(0)}${'*'.repeat(data.length - 2)}${data.charAt(data.length - 1)}`;
      
    case 'price':
      // Format as currency but mask the exact amount
      const price = parseFloat(data);
      if (isNaN(price)) return data;
      
      if (price < 10) {
        return '$*.**'; // Very small amounts
      } else if (price < 100) {
        return '$**.**'; // Small amounts
      } else if (price < 1000) {
        return '$***.**'; // Medium amounts
      } else if (price < 10000) {
        return '$*,***.**'; // Large amounts
      } else {
        return '$**,***.**'; // Very large amounts
      }
      
    default:
      return data;
  }
}
