/**
 * Environment-based configuration for API endpoints
 */

// Get the API base URL based on environment
export const getApiBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  
  // If API URL is explicitly configured, use it (prioritize environment variable)
  if (apiUrl && 
      apiUrl.trim() !== '' && 
      (apiUrl.startsWith('https://') || apiUrl.startsWith('http://'))) {
    
    console.log(`🌐 API server configured: ${apiUrl.replace(/\/+$/, '')}`);
    return apiUrl.replace(/\/+$/, ''); // Remove trailing slashes
  }
  
  // Check if we're in local development without API URL configured
  const isLocalDevelopment = (import.meta.env.DEV || 
                             window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1') && 
                            !apiUrl;
  
  if (isLocalDevelopment) {
    // Development mode with no API URL configured: use local server
    console.log('🏠 Development mode: using local API server');
    return 'http://localhost:3003';
  } else {
    // No API server configured
    console.warn('⚠️ API server not configured. Using local-only mode.');
    console.warn('💡 Set VITE_API_BASE_URL to your deployed API server URL.');
    return '';
  }
};

// API endpoint configurations
export const API_ENDPOINTS = {
  STOCKS: '/api/remote/stocks',
  CONTROLS: '/api/remote/controls',
  AUTH: '/api/remote/auth',
  STATUS: '/api/remote/status',
  RESTART: '/api/remote/restart'
} as const;

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('API server not configured for production environment');
  }
  return `${baseUrl}${endpoint}`;
};

// Check if API server should be used
export const shouldUseApiServer = (): boolean => {
  return getApiBaseUrl() !== '';
};

// Development flag
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV || 
         window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
};

// API Health Check
export const checkApiHealth = async (timeoutMs: number = 5000): Promise<{isHealthy: boolean, error?: string, responseTime?: number}> => {
  if (!shouldUseApiServer()) {
    return { isHealthy: false, error: 'API server not configured' };
  }
  
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const healthUrl = buildApiUrl('/status/health');
    const response = await fetch(healthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return {
        isHealthy: data.health === 'healthy',
        responseTime,
        error: data.health !== 'healthy' ? 'API server unhealthy' : undefined
      };
    } else {
      return {
        isHealthy: false,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { isHealthy: false, responseTime, error: `Timeout after ${timeoutMs}ms` };
      }
      return { isHealthy: false, responseTime, error: error.message };
    }
    
    return { isHealthy: false, responseTime, error: 'Unknown error occurred' };
  }
};
