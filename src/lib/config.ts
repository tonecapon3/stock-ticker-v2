/**
 * Environment-based configuration for API endpoints
 */

// Get the API base URL based on environment
export const getApiBaseUrl = (): string => {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
  
  // Environment-based API URL routing
  let apiUrl: string;
  
  if (currentOrigin.includes('staging.dv565hju499c6.amplifyapp.com')) {
    // Staging environment
    apiUrl = 'https://stock-ticker-api-staging.onrender.com';
    console.log('🏢 Staging Environment: Using staging API');
  } else if (currentOrigin.includes('main.d7lc7dqjkvbj3.amplifyapp.com')) {
    // Production environment  
    apiUrl = 'https://stock-ticker-api-production.onrender.com';
    console.log('🏭 Production Environment: Using production API');
  } else if (currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')) {
    // Local development
    apiUrl = 'http://localhost:3001';
    console.log('🏠 Development Environment: Using local API');
  } else {
    // Fallback for unknown environments - use staging
    apiUrl = 'https://stock-ticker-api-staging.onrender.com';
    console.log('🔄 Unknown Environment: Falling back to staging API');
  }
  
  console.log('🌐 API URL Selected:', apiUrl);
  console.log('🔍 Environment Debug:', {
    CURRENT_ORIGIN: currentOrigin,
    API_URL: apiUrl,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_INSTANCE_ID: import.meta.env.VITE_INSTANCE_ID,
    MODE: import.meta.env.MODE
  });
  
  return apiUrl;
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
    const baseUrl = getApiBaseUrl();
    
    // Step 1: First, try to authenticate with the JWT bridge if not already authenticated
    let hasAuth = false;
    let headers = { 'Content-Type': 'application/json' };
    
    try {
      const { tokenStorage } = await import('../auth/utils/index');
      const { isJWTBridgeAuthenticated, authenticateWithJWTBridge } = await import('../auth/utils/clerkJwtBridge');
      
      // Check if we're already authenticated
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
      } else {
        // Try to authenticate for health check
        console.log('🔐 Health check: Attempting to authenticate...');
        const authResult = await authenticateWithJWTBridge('health-check');
        
        if (authResult.success && authResult.token) {
          headers = { ...headers, 'Authorization': `Bearer ${authResult.token}` };
          if (authResult.sessionId) {
            headers = { ...headers, 'X-Session-ID': authResult.sessionId };
          }
          hasAuth = true;
          console.log('✅ Health check: Authentication successful');
        }
      }
    } catch (authError) {
      console.log('⚠️ Health check: Authentication not available, testing connectivity only');
    }
    
    // Step 2: Test the API endpoint
    let healthUrl;
    if (hasAuth) {
      // Use stocks endpoint to test authenticated access
      healthUrl = `${baseUrl}/api/remote/stocks`;
    } else {
      // Just test basic connectivity by trying to get a 401 response (which means server is up)
      healthUrl = `${baseUrl}/api/remote/stocks`;
    }
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Handle different response scenarios
    if (response.status === 401) {
      // Server is healthy, just requires authentication (expected for unauthenticated requests)
      return {
        isHealthy: true,
        responseTime,
        error: hasAuth ? 'Authentication failed' : undefined // No error if we expected 401
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
    } else if (response.status >= 400 && response.status < 500) {
      // Client errors (4xx) usually mean server is up but there's an issue with the request
      return {
        isHealthy: true, // Server is responding
        responseTime,
        error: `Client error: HTTP ${response.status}`
      };
    } else {
      // Server errors (5xx) or other issues
      return {
        isHealthy: false,
        responseTime,
        error: `Server error: HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { isHealthy: false, responseTime, error: `Timeout after ${timeoutMs}ms` };
      }
      // Network errors usually mean server is down
      return { isHealthy: false, responseTime, error: `Connection failed: ${error.message}` };
    }
    
    return { isHealthy: false, responseTime, error: 'Unknown error occurred' };
  }
};
