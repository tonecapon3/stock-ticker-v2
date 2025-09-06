/**
 * Environment Configuration Module
 * Centralizes all environment variable handling with validation
 */

export interface EnvConfig {
  // Access Control
  accessCode: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  
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
  const accessCode = import.meta.env.VITE_ACCESS_CODE;
  
  // Critical validation - access code is required
  if (!accessCode) {
    console.error('❌ VITE_ACCESS_CODE environment variable is missing!');
    console.error('📋 For development: Check your .env.local file');
    console.error('📋 For production: Set VITE_ACCESS_CODE in your hosting environment');
    console.error('🔧 Example: VITE_ACCESS_CODE=YourSecureCode2024!');
    
    throw new Error(
      'VITE_ACCESS_CODE environment variable is required. ' +
      'Please set this in your environment configuration.'
    );
  }
  
  // Parse optional numeric values with defaults
  const sessionTimeout = parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '3600000');
  const maxLoginAttempts = parseInt(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS || '5');
  
  // Parse boolean values
  const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true';
  
  // Parse log level with validation
  const logLevel = (['debug', 'info', 'warn', 'error'].includes(import.meta.env.VITE_LOG_LEVEL)) 
    ? import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error'
    : 'info';
  
  // Validate numeric ranges
  if (sessionTimeout < 60000) { // Minimum 1 minute
    console.warn('Session timeout is very low (< 1 minute). Using default.');
  }
  
  if (maxLoginAttempts < 1 || maxLoginAttempts > 10) {
    console.warn('Max login attempts should be between 1-10. Using default.');
  }
  
  const config: EnvConfig = {
    accessCode,
    sessionTimeout: Math.max(sessionTimeout, 60000), // Ensure minimum 1 minute
    maxLoginAttempts: Math.max(1, Math.min(maxLoginAttempts, 10)), // Clamp between 1-10
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
      accessCode: config.accessCode ? '********' : 'NOT_SET',
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
