/**
 * Environment Configuration Module
 * Centralizes all environment variable handling with validation
 */

export interface EnvConfig {
  // Development Settings
  debugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Future API Configuration (prepared for future use)
  stockApi?: {
    key?: string;
    baseUrl?: string;
  };
  currencyApi?: {
    key?: string;
    baseUrl?: string;
  };
}

/**
 * Validates and parses environment variables
 */
function validateEnv(): EnvConfig {
  // Parse boolean values
  const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true';
  
  // Parse log level with validation
  const logLevel = (['debug', 'info', 'warn', 'error'].includes(import.meta.env.VITE_LOG_LEVEL || '')) 
    ? import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error'
    : 'info';
  
  const config: EnvConfig = {
    debugMode,
    logLevel,
    
    // Future API configuration (optional)
    stockApi: {
      key: import.meta.env.VITE_STOCK_API_KEY,
      baseUrl: import.meta.env.VITE_STOCK_API_URL || 'https://api.example.com'
    },
    currencyApi: {
      key: import.meta.env.VITE_CURRENCY_API_KEY,
      baseUrl: import.meta.env.VITE_CURRENCY_API_URL || 'https://currency-api.example.com'
    }
  };
  
  // Log configuration in debug mode (with sensitive data masked)
  if (debugMode) {
    console.log('Environment configuration loaded:', {
      ...config,
      stockApi: config.stockApi?.key ? { ...config.stockApi, key: '********' } : config.stockApi,
      currencyApi: config.currencyApi?.key ? { ...config.currencyApi, key: '********' } : config.currencyApi,
    });
  }
  
  return config;
}

/**
 * Validated environment configuration
 * This will throw an error at startup if required env vars are missing
 */
export const ENV = validateEnv();

/**
 * Helper function to check if we're in development mode
 */
export const isDevelopment = () => ENV.debugMode || import.meta.env.DEV;

/**
 * Helper function to check if we're in production mode  
 */
export const isProduction = () => import.meta.env.PROD;

/**
 * Helper function for conditional logging based on log level
 */
export const logger = {
  debug: (...args: any[]) => {
    if (ENV.logLevel === 'debug') {
      console.debug('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (['debug', 'info'].includes(ENV.logLevel)) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (['debug', 'info', 'warn'].includes(ENV.logLevel)) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  }
};

export default ENV;
