/**
 * Environment-based configuration for API endpoints
 */

// Get the API base URL based on environment
export const getApiBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  
  // Debug: Log all environment variables for troubleshooting
  console.log('🔧 Environment Debug:', {
    VITE_API_BASE_URL: apiUrl,
    VITE_INSTANCE_ID: import.meta.env.VITE_INSTANCE_ID,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD
  });
  
  // If API URL is explicitly configured, use it (prioritize environment variable)
  if (apiUrl && 
      apiUrl.trim() !== '' && 
      (apiUrl.startsWith('https://') || apiUrl.startsWith('http://')))
    
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
    // Production without API URL - use working staging server as default
    const productionDefault = 'https://stock-ticker-api-staging.onrender.com';
    console.log('🚨 FALLBACK: VITE_API_BASE_URL not configured properly!');
    console.log('🔧 API URL value:', apiUrl);
    console.log(`🏭 Using hardcoded fallback: ${productionDefault}`);
    console.log('💡 Set VITE_API_BASE_URL in Amplify environment to override this.');
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
