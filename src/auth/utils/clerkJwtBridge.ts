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
      
      // Generate a session ID if not provided by server
      const sessionId = data.user?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('jwt_session_id', sessionId);
      
      if (data.refreshToken) {
        localStorage.setItem('jwt_refresh_token', data.refreshToken);
      }
      
      console.log('✅ JWT Bridge authentication successful');
      return {
        success: true,
        token: data.token,
        sessionId: sessionId
      };
    } else {
      throw new Error(data.error || 'JWT Bridge authentication failed');
    }
  } catch (error) {
    console.error('❌ JWT Bridge authentication failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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
  console.log('🧹 JWT Bridge authentication cleared');
}

/**
 * Check if JWT bridge is authenticated
 */
export function isJWTBridgeAuthenticated(): boolean {
  const token = tokenStorage.getJWTToken();
  const sessionId = localStorage.getItem('jwt_session_id');
  return !!(token && sessionId);
}

/**
 * Get JWT bridge authentication headers
 */
export function getJWTBridgeHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const token = tokenStorage.getJWTToken();
  const sessionId = localStorage.getItem('jwt_session_id');
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }
  
  return headers;
}
