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
    
    const cleanUrl = apiUrl.replace(/\/+$/, ''); // Remove trailing slashes
    if (import.meta.env.DEV) {
      console.log(`🌐 API server configured: ${cleanUrl}`);
    }
    return cleanUrl;
  }
  
  // Check if we're in local development without API URL configured
  const isLocalDevelopment = (import.meta.env.DEV || 
                             window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1') && 
                            !apiUrl;
  
  if (isLocalDevelopment) {
    // Development mode with no API URL configured: use local server
    console.log('🏠 Development mode: using local API server');
    return 'http://localhost:3001';
  } else {
    // Production without API URL - use production default
    const productionDefault = 'https://stock-ticker-v2.onrender.com';
    console.log(`🏭 Production mode: using default API server: ${productionDefault}`);
    console.log('💡 Set VITE_API_BASE_URL to override this default.');
    return productionDefault;
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

// API Health Check with JWT bridge support
export const checkApiHealth = async (timeoutMs: number = 5000): Promise<{isHealthy: boolean, error?: string, responseTime?: number}> => {
  if (!shouldUseApiServer()) {
    return { isHealthy: false, error: 'API server not configured' };
  }
  
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    // First try a simple health check without authentication
    const baseUrl = getApiBaseUrl();
    let healthUrl;
    let headers = { 'Content-Type': 'application/json' };
    
    // Try to get JWT headers if available
    let hasAuth = false;
    try {
      const { tokenStorage } = await import('../auth/utils/index');
      const { isJWTBridgeAuthenticated } = await import('../auth/utils/clerkJwtBridge');
      
      if (isJWTBridgeAuthenticated()) {
        const token = tokenStorage.getAccessToken();
        const sessionId = tokenStorage.getSessionId();
        
        if (token) {
          headers = { ...headers, 'Authorization': `Bearer ${token}` };
          hasAuth = true;
        }
        
        if (sessionId) {
          headers = { ...headers, 'X-Session-ID': sessionId };
        }
      }
    } catch (authError) {
      // Auth utils not available, continue without auth headers
      if (import.meta.env.DEV) {
        console.log('Auth utils not available for health check');
      }
    }
    
    // Use authenticated endpoint if we have auth, otherwise try stocks endpoint
    if (hasAuth) {
      healthUrl = `${baseUrl}/api/remote/stocks`;
    } else {
      // Try the base API endpoint for a simple connectivity test
      healthUrl = `${baseUrl}/api/remote/status`;
    }
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // If we get a 401, the server is healthy but we need authentication
    if (response.status === 401) {
      return {
        isHealthy: true, // Server is responding, just needs auth
        responseTime,
        error: 'API server healthy but requires authentication'
      };
    }
    
    if (response.ok) {
      try {
        const data = await response.json();
        return {
          isHealthy: data.success !== false,
          responseTime,
          error: data.success === false ? data.error || 'API returned error' : undefined
        };
      } catch (jsonError) {
        // Response was OK but not JSON, still consider healthy
        return {
          isHealthy: true,
          responseTime
        };
      }
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
