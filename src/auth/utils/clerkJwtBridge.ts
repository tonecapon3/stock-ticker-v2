/**
 * Clerk to JWT Bridge
 * 
 * This utility bridges Clerk authentication with our JWT server by automatically
 * logging into the JWT server using predefined credentials when a Clerk user is authenticated.
 */

import { tokenStorage } from './index';
import { shouldUseApiServer, getApiBaseUrl } from '../../lib/config';

// JWT server credentials for Clerk users
// In a real app, you'd want a more sophisticated mapping
const JWT_BRIDGE_CREDENTIALS = {
  username: 'admin', // Default JWT username for Clerk users
  password: 'AdminSecure2025!@' // Updated JWT password for Clerk users
};

interface BridgeAuthResponse {
  success: boolean;
  error?: string;
  token?: string;
  sessionId?: string;
}

/**
 * Authenticate with JWT server using bridge credentials
 */
export async function authenticateWithJWTBridge(
  clerkUserId?: string,
  clerkToken?: string
): Promise<BridgeAuthResponse> {
  try {
    // Check if API server is available
    if (!shouldUseApiServer()) {
      console.log('🔇 API server not configured, skipping JWT bridge');
      return {
        success: false,
        error: 'API server not configured for JWT bridge'
      };
    }
    
    const apiBaseUrl = getApiBaseUrl();
    console.log('🌉 Starting JWT server authentication...');
    console.log('🔑 Using credentials:', { username: JWT_BRIDGE_CREDENTIALS.username });
    console.log('🌐 API server:', apiBaseUrl);
    
    // Make JWT authentication request to your server
    const response = await fetch(`${apiBaseUrl}/api/remote/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JWT_BRIDGE_CREDENTIALS)
    });
    
    console.log('📡 JWT auth response status:', response.status);

    if (!response.ok) {
      throw new Error(`JWT Bridge auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📄 JWT auth response data:', { success: data.success, hasToken: !!data.token, hasSessionId: !!data.user?.sessionId });

    if (data.success && data.token) {
      // Store JWT credentials for API calls using correct method names
      tokenStorage.setJWTToken(data.token);
      tokenStorage.setAccessToken(data.token); // Also store as access token for compatibility
      
      // Generate a session ID if not provided by server
      const sessionId = data.user?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      tokenStorage.setSessionId(sessionId);
      
      if (data.refreshToken) {
        localStorage.setItem('jwt_refresh_token', data.refreshToken);
      }
      
      // Store authentication method and timestamp
      tokenStorage.setAuthMethod('jwt');
      localStorage.setItem('jwt_bridge_authenticated_at', Date.now().toString());
      
      console.log('✅ JWT Bridge authentication successful');
      console.log('🔑 Token stored:', data.token.substring(0, 20) + '...');
      console.log('📋 Session ID:', sessionId);
      
      return {
        success: true,
        token: data.token,
        sessionId: sessionId
      };
    } else {
      const errorMessage = data.error || 'JWT Bridge authentication failed';
      console.error('❌ JWT Bridge auth failed:', errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ JWT Bridge authentication failed:', errorMessage);
    
    // Detect CORS/Network errors and provide helpful messaging
    const isCorsError = errorMessage.includes('NetworkError') || 
                       errorMessage.includes('Failed to fetch') ||
                       errorMessage.includes('CORS') ||
                       errorMessage.includes('blocked');
    
    if (isCorsError) {
      console.log('🚨 CORS Error Detected!');
      console.log('🔧 The API server needs to allow this domain in CORS configuration.');
      console.log('🌐 Current domain:', typeof window !== 'undefined' ? window.location.origin : 'unknown');
      console.log('🔄 App will continue in local-only mode.');
      console.log('💡 To fix: Update REMOTE_ALLOWED_ORIGINS in your API server.');
    }
    
    return {
      success: false,
      error: errorMessage,
      isCorsError: isCorsError
    };
  }
}

/**
 * Clear JWT bridge authentication
 */
export function clearJWTBridge(): void {
  tokenStorage.removeJWTToken();
  localStorage.removeItem('jwt_session_id');
  localStorage.removeItem('jwt_refresh_token');
  localStorage.removeItem('jwt_bridge_authenticated_at');
  tokenStorage.clearAll(); // Clear all auth-related storage
  console.log('🧹 JWT Bridge authentication cleared');
}

/**
 * Check if JWT bridge is authenticated
 */
export function isJWTBridgeAuthenticated(): boolean {
  const token = tokenStorage.getJWTToken() || tokenStorage.getAccessToken();
  const sessionId = tokenStorage.getSessionId();
  const authenticatedAt = localStorage.getItem('jwt_bridge_authenticated_at');
  
  if (!token || !sessionId) {
    return false;
  }
  
  // Check if authentication is not too old (24 hours)
  if (authenticatedAt) {
    const authTime = parseInt(authenticatedAt);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (now - authTime > maxAge) {
      console.log('🕑 JWT bridge authentication expired, clearing...');
      clearJWTBridge();
      return false;
    }
  }
  
  return true;
}

/**
 * Get JWT bridge authentication headers
 */
export function getJWTBridgeHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const token = tokenStorage.getJWTToken() || tokenStorage.getAccessToken();
  const sessionId = tokenStorage.getSessionId();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('🔑 Adding Authorization header:', `Bearer ${token.substring(0, 20)}...`);
  } else {
    console.warn('⚠️ No JWT token available for authentication headers');
  }
  
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
    console.log('📋 Adding Session ID header:', sessionId);
  } else {
    console.warn('⚠️ No session ID available for authentication headers');
  }
  
  return headers;
}
