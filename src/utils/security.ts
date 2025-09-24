/**
 * Security utilities for HTTPS enforcement and browser security
 */

export interface SecurityConfig {
  enforceHttps: boolean;
  enableHSTS: boolean;
  hstsMaxAge: number;
  enableCSP: boolean;
  reportViolations: boolean;
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enforceHttps: import.meta.env.PROD, // Only enforce in production
  enableHSTS: import.meta.env.PROD,
  hstsMaxAge: 31536000, // 1 year in seconds
  enableCSP: import.meta.env.VITE_ENABLE_CSP !== 'false', // Allow disabling CSP via env var
  reportViolations: import.meta.env.DEV,
};

/**
 * HTTPS Enforcement Hook
 * Redirects to HTTPS if accessed via HTTP in production
 */
export function useHttpsEnforcement(config: SecurityConfig = DEFAULT_SECURITY_CONFIG): void {
  if (!config.enforceHttps) return;

  // Check if we're running in a browser environment
  if (typeof window === 'undefined') return;

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  // Don't enforce HTTPS for localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return;
  }

  // Redirect to HTTPS if currently on HTTP
  if (protocol === 'http:') {
    const httpsUrl = window.location.href.replace('http://', 'https://');
    console.warn('Redirecting to HTTPS for security:', httpsUrl);
    window.location.replace(httpsUrl);
  }
}

/**
 * Set security headers programmatically
 * Note: Some headers are better set at server/CDN level
 */
export function setSecurityHeaders(config: SecurityConfig = DEFAULT_SECURITY_CONFIG): void {
  if (typeof document === 'undefined') return;

  // Set HSTS header via meta tag (limited effectiveness, better done server-side)
  if (config.enableHSTS && window.location.protocol === 'https:') {
    const hstsHeader = `max-age=${config.hstsMaxAge}; includeSubDomains; preload`;
    
    // Add meta tag for documentation (actual HSTS must be server-side)
    const metaHSTS = document.createElement('meta');
    metaHSTS.httpEquiv = 'Strict-Transport-Security';
    metaHSTS.content = hstsHeader;
    document.head.appendChild(metaHSTS);
  }

  // Content Security Policy
  if (config.enableCSP) {
    // Remove any existing CSP meta tags first
    const existingCSP = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    existingCSP.forEach(tag => tag.remove());
    
    // In development, be more permissive or allow disabling CSP entirely
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_CSP === 'false') {
      console.log('[SECURITY] CSP disabled in development mode');
      return;
    }
    
    const cspPolicy = generateCSPPolicy(config.reportViolations);
    console.log('[SECURITY] Applying CSP policy:', cspPolicy);
    
    if (import.meta.env.DEV) {
      console.log('[SECURITY] Development mode - CSP allows Clerk and localhost connections');
    }
    
    const metaCSP = document.createElement('meta');
    metaCSP.httpEquiv = 'Content-Security-Policy';
    metaCSP.content = cspPolicy;
    document.head.appendChild(metaCSP);
  } else {
    console.log('[SECURITY] CSP is disabled');
  }

  // Additional security meta tags
  addSecurityMetaTags();
}

/**
 * Generate Content Security Policy
 */
function generateCSPPolicy(reportViolations: boolean): string {
  // Allow connections to localhost API server in development
  const isDevelopment = import.meta.env.DEV;
  const connectSrc = isDevelopment 
    ? "connect-src 'self' https: http://localhost:* ws://localhost:* wss://localhost:* https://clerk.com https://*.clerk.accounts.dev https://*.clerk.dev" 
    : "connect-src 'self' https: https://clerk.com https://*.clerk.accounts.dev https://*.clerk.dev";

  // Allow Clerk-related domains for script loading
  const scriptSrc = isDevelopment
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.accounts.dev https://*.clerk.dev"
    : "script-src 'self' 'unsafe-inline' https://clerk.com https://*.clerk.accounts.dev https://*.clerk.dev";

  const policies = [
    "default-src 'self'",
    scriptSrc, // Updated to allow Clerk scripts
    "style-src 'self' 'unsafe-inline' https://clerk.com https://*.clerk.accounts.dev https://*.clerk.dev", // Allow Clerk styles
    "img-src 'self' data: https:",
    "font-src 'self' data: https:",
    connectSrc,
    "frame-src 'self' https://clerk.com https://*.clerk.accounts.dev https://*.clerk.dev", // Allow Clerk frames
    "base-uri 'self'",
    "form-action 'self' https://clerk.com https://*.clerk.accounts.dev https://*.clerk.dev", // Allow Clerk form actions
  ];

  // Note: report-uri and frame-ancestors are ignored in meta tags, so we don't add them
  // These should be set via HTTP headers on the server instead

  return policies.join('; ');
}

/**
 * Add additional security meta tags
 */
function addSecurityMetaTags(): void {
  const securityTags = [
    { httpEquiv: 'X-Content-Type-Options', content: 'nosniff' },
    { httpEquiv: 'X-Frame-Options', content: 'DENY' },
    { httpEquiv: 'X-XSS-Protection', content: '1; mode=block' },
    { httpEquiv: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
    { httpEquiv: 'Permissions-Policy', content: 'camera=(), microphone=(), geolocation=()' },
  ];

  securityTags.forEach(({ httpEquiv, content }) => {
    const existing = document.querySelector(`meta[http-equiv="${httpEquiv}"]`);
    if (!existing) {
      const meta = document.createElement('meta');
      meta.httpEquiv = httpEquiv;
      meta.content = content;
      document.head.appendChild(meta);
    }
  });
}

/**
 * Check if the current connection is secure
 */
export function isSecureConnection(): boolean {
  if (typeof window === 'undefined') return true; // Assume secure in SSR

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  // Localhost is considered secure for development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  return protocol === 'https:';
}

/**
 * Security status checker
 */
export function getSecurityStatus(): {
  isSecure: boolean;
  protocol: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const isSecure = isSecureConnection();
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'unknown';

  if (!isSecure && import.meta.env.PROD) {
    warnings.push('Connection is not secure. HTTPS is required for production.');
  }

  if (typeof window !== 'undefined' && !window.crypto?.subtle) {
    warnings.push('Web Crypto API not available. Some security features may be limited.');
  }

  return {
    isSecure,
    protocol,
    warnings,
  };
}

/**
 * Enhanced error logging for security events
 */
export function logSecurityEvent(event: string, details?: any): void {
  const timestamp = new Date().toISOString();
  const securityLog = {
    timestamp,
    event,
    details,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
  };

  console.warn('[SECURITY]', securityLog);

  // In production, you might want to send this to a logging service
  if (import.meta.env.PROD) {
    // Example: send to logging service
    // fetch('/api/security-log', { method: 'POST', body: JSON.stringify(securityLog) });
  }
}
