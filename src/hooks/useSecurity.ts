import { useEffect, useState } from 'react';
import { 
  useHttpsEnforcement, 
  setSecurityHeaders, 
  getSecurityStatus,
  logSecurityEvent,
  SecurityConfig,
  DEFAULT_SECURITY_CONFIG 
} from '../utils/security';

export interface SecurityState {
  isSecure: boolean;
  protocol: string;
  warnings: string[];
  isLoading: boolean;
}

/**
 * Custom hook for managing application security
 * Handles HTTPS enforcement, security headers, and status monitoring
 */
export function useSecurity(config: SecurityConfig = DEFAULT_SECURITY_CONFIG) {
  const [securityState, setSecurityState] = useState<SecurityState>({
    isSecure: true,
    protocol: 'unknown',
    warnings: [],
    isLoading: true,
  });

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    try {
      // Enforce HTTPS redirection
      useHttpsEnforcement(config);

      // Set security headers
      setSecurityHeaders(config);

      // Get initial security status
      const status = getSecurityStatus();
      setSecurityState({
        ...status,
        isLoading: false,
      });

      // Log security initialization
      logSecurityEvent('security_initialized', {
        config,
        status,
      });

      // Monitor for protocol changes (rare but possible)
      const handleLocationChange = () => {
        const newStatus = getSecurityStatus();
        setSecurityState(prev => ({
          ...prev,
          ...newStatus,
        }));

        if (!newStatus.isSecure && import.meta.env.PROD) {
          logSecurityEvent('insecure_connection_detected', newStatus);
        }
      };

      // Listen for popstate events (back/forward navigation)
      window.addEventListener('popstate', handleLocationChange);

      return () => {
        window.removeEventListener('popstate', handleLocationChange);
      };
    } catch (error) {
      console.error('Security initialization failed:', error);
      logSecurityEvent('security_init_error', { error: error.message });
      
      setSecurityState({
        isSecure: false,
        protocol: 'unknown',
        warnings: ['Security initialization failed'],
        isLoading: false,
      });
    }
  }, [config]);

  return securityState;
}

/**
 * Hook for checking if sensitive operations should be allowed
 */
export function useSecureContext(): {
  isSecureContext: boolean;
  canPerformSensitiveOperations: boolean;
  securityWarnings: string[];
} {
  const securityState = useSecurity();
  
  const isSecureContext = securityState.isSecure && typeof window !== 'undefined' && window.isSecureContext;
  const canPerformSensitiveOperations = isSecureContext && !securityState.warnings.length;

  const securityWarnings = [
    ...securityState.warnings,
    ...(isSecureContext ? [] : ['Secure context required for sensitive operations']),
  ];

  return {
    isSecureContext,
    canPerformSensitiveOperations,
    securityWarnings,
  };
}
