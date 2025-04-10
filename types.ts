// Constants
export const MAX_HISTORY_POINTS = 100;
export const SECURITY_CONSTRAINTS = {
  maxSymbolLength: 10,
  maxNameLength: 100,
  maxPriceValue: 1000000,
  minUpdateIntervalMs: 1000,
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD']
};

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Validation functions
export function validateStockSymbol(symbol: string): boolean {
  return symbol && 
         typeof symbol === 'string' && 
         symbol.length > 0 && 
         symbol.length <= SECURITY_CONSTRAINTS.maxSymbolLength &&
         /^[A-Z0-9.]+$/.test(symbol);
}

export function validateStockName(name: string): boolean {
  return name && 
         typeof name === 'string' && 
         name.length > 0 && 
         name.length <= SECURITY_CONSTRAINTS.maxNameLength;
}

export function validateStockPrice(price: number): boolean {
  return typeof price === 'number' && 
         !isNaN(price) && 
         price >= 0 && 
         price <= SECURITY_CONSTRAINTS.maxPriceValue;
}

export function validateUpdateInterval(intervalMs: number): boolean {
  return typeof intervalMs === 'number' && 
         !isNaN(intervalMs) && 
         intervalMs >= SECURITY_CONSTRAINTS.minUpdateIntervalMs;
}

export function validateCurrency(currency: string): ValidationResult {
  if (!currency || typeof currency !== 'string') {
    return { isValid: false, error: 'Currency must be a non-empty string' };
  }
  
  if (!SECURITY_CONSTRAINTS.supportedCurrencies.includes(currency)) {
    return { isValid: false, error: `Currency must be one of ${SECURITY_CONSTRAINTS.supportedCurrencies.join(', ')}` };
  }
  
  return { isValid: true };
}

// Utility functions
export function sanitizeStockSymbol(symbol: string): string {
  return symbol.toUpperCase().trim().substring(0, SECURITY_CONSTRAINTS.maxSymbolLength);
}

export function sanitizeStockName(name: string): string {
  return name.trim().substring(0, SECURITY_CONSTRAINTS.maxNameLength);
}

export function checkRateLimit(requests: number, timeWindowMs: number, maxRequests: number): boolean {
  return requests <= maxRequests;
}

export function getMemoryUsage(): { rss: number, heapTotal: number, heapUsed: number } {
  // In browser environment, return mock data
  if (typeof process === 'undefined') {
    return { rss: 0, heapTotal: 0, heapUsed: 0 };
  }
  // In Node.js environment
  return process.memoryUsage();
}
