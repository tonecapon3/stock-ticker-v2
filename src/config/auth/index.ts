/**
 * Authentication configuration for hybrid JWT + Clerk authentication system
 * 
 * This file provides configuration management for the hybrid authentication system,
 * including method preferences, availability detection, and runtime configuration.
 */

import { AuthMethod, AuthConfig } from '../../auth/types';
import { envUtils } from '../../auth/utils';

/**
 * Default authentication configuration
 */
const DEFAULT_AUTH_CONFIG: AuthConfig = {
  preferredMethod: AuthMethod.AUTO,
  enableJWT: true,
  enableClerk: true,
  allowMethodSwitching: true,
  autoFallback: true
};

/**
 * Get authentication configuration from environment and defaults
 */
export const getAuthConfig = (): AuthConfig => {
  const availableMethods = envUtils.getAvailableMethods();
  
  // Determine preferred method based on availability and environment
  let preferredMethod = AuthMethod.AUTO;
  
  // Check for explicit preference in environment variables
  const envPreference = import.meta.env.VITE_AUTH_PREFERRED_METHOD as AuthMethod;
  if (envPreference && Object.values(AuthMethod).includes(envPreference)) {
    preferredMethod = envPreference;
  } else {
    // Auto-determine based on availability
    if (availableMethods.includes(AuthMethod.CLERK) && availableMethods.includes(AuthMethod.JWT)) {
      preferredMethod = AuthMethod.CLERK; // Prefer Clerk if both are available
    } else if (availableMethods.includes(AuthMethod.CLERK)) {
      preferredMethod = AuthMethod.CLERK;
    } else if (availableMethods.includes(AuthMethod.JWT)) {
      preferredMethod = AuthMethod.JWT;
    }
  }

  return {
    preferredMethod,
    enableJWT: availableMethods.includes(AuthMethod.JWT),
    enableClerk: availableMethods.includes(AuthMethod.CLERK),
    allowMethodSwitching: availableMethods.length > 1,
    autoFallback: import.meta.env.VITE_AUTH_AUTO_FALLBACK !== 'false'
  };
};

/**
 * Auth method priority order for fallback
 */
export const getMethodPriority = (config: AuthConfig): AuthMethod[] => {
  const priority: AuthMethod[] = [];

  if (config.preferredMethod === AuthMethod.CLERK && config.enableClerk) {
    priority.push(AuthMethod.CLERK);
    if (config.enableJWT && config.autoFallback) {
      priority.push(AuthMethod.JWT);
    }
  } else if (config.preferredMethod === AuthMethod.JWT && config.enableJWT) {
    priority.push(AuthMethod.JWT);
    if (config.enableClerk && config.autoFallback) {
      priority.push(AuthMethod.CLERK);
    }
  } else if (config.preferredMethod === AuthMethod.AUTO) {
    // Auto mode: try both methods with Clerk preferred
    if (config.enableClerk) {
      priority.push(AuthMethod.CLERK);
    }
    if (config.enableJWT) {
      priority.push(AuthMethod.JWT);
    }
  }

  return priority;
};

/**
 * Check if authentication method is available and configured
 */
export const isMethodAvailable = (method: AuthMethod): boolean => {
  switch (method) {
    case AuthMethod.JWT:
      return envUtils.isJWTEnabled();
    case AuthMethod.CLERK:
      return envUtils.isClerkAvailable();
    case AuthMethod.AUTO:
      return envUtils.isJWTEnabled() || envUtils.isClerkAvailable();
    default:
      return false;
  }
};

/**
 * Get configuration status for debugging
 */
export const getConfigStatus = () => {
  const config = getAuthConfig();
  const availableMethods = envUtils.getAvailableMethods();
  
  return {
    config,
    availableMethods,
    methodPriority: getMethodPriority(config),
    environment: {
      isDev: import.meta.env.DEV,
      apiBaseUrl: envUtils.getApiBaseUrl(),
      clerkKey: Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    },
    capabilities: {
      canSwitchMethods: config.allowMethodSwitching,
      hasAutoFallback: config.autoFallback,
      multipleMethodsAvailable: availableMethods.length > 1
    }
  };
};

/**
 * Validate authentication configuration
 */
export const validateConfig = (config: AuthConfig): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check if at least one method is enabled
  if (!config.enableJWT && !config.enableClerk) {
    errors.push('At least one authentication method must be enabled');
  }

  // Check if preferred method is available
  if (!isMethodAvailable(config.preferredMethod)) {
    errors.push(`Preferred method '${config.preferredMethod}' is not available or configured`);
  }

  // Check method switching configuration
  if (config.allowMethodSwitching && envUtils.getAvailableMethods().length <= 1) {
    errors.push('Method switching is enabled but only one method is available');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Runtime configuration that can be updated
 */
class RuntimeAuthConfig {
  private config: AuthConfig;

  constructor() {
    this.config = getAuthConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (runtime only, not persistent)
   */
  updateConfig(updates: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config = getAuthConfig();
  }

  /**
   * Get method priority for current config
   */
  getMethodPriority(): AuthMethod[] {
    return getMethodPriority(this.config);
  }

  /**
   * Check if method switching is allowed
   */
  canSwitchMethods(): boolean {
    return this.config.allowMethodSwitching && envUtils.getAvailableMethods().length > 1;
  }

  /**
   * Check if auto-fallback is enabled
   */
  hasAutoFallback(): boolean {
    return this.config.autoFallback;
  }
}

/**
 * Global runtime configuration instance
 */
export const runtimeConfig = new RuntimeAuthConfig();

/**
 * Environment-specific configurations
 */
export const ENV_CONFIGS = {
  development: {
    preferredMethod: AuthMethod.AUTO,
    allowMethodSwitching: true,
    autoFallback: true,
    enableJWT: true,
    enableClerk: true
  } as Partial<AuthConfig>,

  production: {
    preferredMethod: AuthMethod.CLERK,
    allowMethodSwitching: false,
    autoFallback: true,
    enableJWT: false,
    enableClerk: true
  } as Partial<AuthConfig>,

  testing: {
    preferredMethod: AuthMethod.JWT,
    allowMethodSwitching: false,
    autoFallback: false,
    enableJWT: true,
    enableClerk: false
  } as Partial<AuthConfig>
};

/**
 * Get environment-specific configuration
 */
export const getEnvConfig = (env: string = import.meta.env.NODE_ENV || 'development'): Partial<AuthConfig> => {
  return ENV_CONFIGS[env as keyof typeof ENV_CONFIGS] || ENV_CONFIGS.development;
};

/**
 * Merge environment config with base config
 */
export const getMergedConfig = (): AuthConfig => {
  const baseConfig = getAuthConfig();
  const envConfig = getEnvConfig();
  
  return {
    ...baseConfig,
    ...envConfig
  };
};

/**
 * Debug logging for configuration
 */
export const logConfig = (): void => {
  if (import.meta.env.DEV) {
    console.log('🔧 Auth Configuration:', getConfigStatus());
  }
};
