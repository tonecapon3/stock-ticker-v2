/**
 * Authentication types and interfaces for hybrid JWT + Clerk authentication system
 * 
 * This file defines the core types used throughout the hybrid authentication system
 */

// Authentication method enumeration
export enum AuthMethod {
  JWT = 'jwt',
  CLERK = 'clerk',
  AUTO = 'auto'
}

// Base user interface that works for both JWT and Clerk users
export interface BaseUser {
  id: string | number;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role: string;
  imageUrl?: string;
}

// JWT-specific user data (from token payload)
export interface JWTUser extends BaseUser {
  id: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Clerk-specific user data
export interface ClerkUser extends BaseUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;
  imageUrl?: string;
  role: string;
}

// Unified user type that can represent either JWT or Clerk user
export type UnifiedUser = JWTUser | ClerkUser;

// Authentication state interface
export interface AuthState {
  isLoaded: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UnifiedUser | null;
  token: string | null;
  authMethod: AuthMethod | null;
  error: string | null;
}

// Authentication configuration
export interface AuthConfig {
  preferredMethod: AuthMethod;
  enableJWT: boolean;
  enableClerk: boolean;
  allowMethodSwitching: boolean;
  autoFallback: boolean;
}

// Sign-in credentials for JWT authentication
export interface JWTCredentials {
  username: string;
  password: string;
}

// Authentication response interface
export interface AuthResponse {
  success: boolean;
  user?: UnifiedUser;
  token?: string;
  authMethod: AuthMethod;
  error?: string;
  details?: string;
}

// Authentication hook interface
export interface HybridAuthHook {
  // State
  isLoaded: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UnifiedUser | null;
  authMethod: AuthMethod | null;
  error: string | null;
  
  // Actions
  signInWithJWT: (credentials: JWTCredentials) => Promise<AuthResponse>;
  signInWithClerk: () => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  switchAuthMethod: (method: AuthMethod) => Promise<void>;
  getToken: () => Promise<string | null>;
  clearError: () => void;
  
  // Role-based access
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
}

// Authentication context value
export interface HybridAuthContextValue extends HybridAuthHook {
  config: AuthConfig;
}

// Type guards
export const isJWTUser = (user: UnifiedUser): user is JWTUser => {
  return typeof user.id === 'number' && 'username' in user;
};

export const isClerkUser = (user: UnifiedUser): user is ClerkUser => {
  return typeof user.id === 'string' && ('email' in user || 'firstName' in user);
};

// Authentication status constants
export const AUTH_STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error'
} as const;

export type AuthStatus = typeof AUTH_STATUS[keyof typeof AUTH_STATUS];

// Events that can be emitted by the authentication system
export enum AuthEvent {
  SIGN_IN = 'sign-in',
  SIGN_OUT = 'sign-out',
  TOKEN_REFRESH = 'token-refresh',
  METHOD_SWITCH = 'method-switch',
  ERROR = 'error'
}

// Event data interfaces
export interface AuthEventData {
  [AuthEvent.SIGN_IN]: { user: UnifiedUser; method: AuthMethod };
  [AuthEvent.SIGN_OUT]: { method: AuthMethod };
  [AuthEvent.TOKEN_REFRESH]: { method: AuthMethod };
  [AuthEvent.METHOD_SWITCH]: { from: AuthMethod; to: AuthMethod };
  [AuthEvent.ERROR]: { error: string; method: AuthMethod };
}

// Authentication Types for Hybrid JWT + Clerk System

export type AuthMethod = 'jwt' | 'clerk' | 'auto';

export interface User {
  id: string | number;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  imageUrl?: string;
}

export interface JWTUser {
  id: number;
  username: string;
  role: string;
}

export interface ClerkUser {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  method: AuthMethod;
  isClerkAvailable: boolean;
  lastError: string | null;
}

export interface AuthConfig {
  preferredMethod: AuthMethod;
  enableFallback: boolean;
  jwtStorageKey: string;
  clerkPublishableKey?: string;
  apiBaseUrl: string;
}

export interface AuthProvider {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: User | null;
  token: string | null;
  method: AuthMethod;
  signIn: (credentials: { username: string; password: string }) => Promise<boolean>;
  signOut: () => void;
  getAuthToken: () => Promise<string | null>;
  refreshAuth: () => Promise<void>;
}

export interface HybridAuthHookReturn {
  // Core state
  isLoaded: boolean;
  isSignedIn: boolean;
  user: User | null;
  method: AuthMethod;
  
  // Methods
  signIn: (credentials: { username: string; password: string }) => Promise<boolean>;
  signOut: () => void;
  getAuthToken: () => Promise<string | null>;
  refreshAuth: () => Promise<void>;
  
  // Utility
  switchAuthMethod: (method: AuthMethod) => Promise<void>;
  isMethodAvailable: (method: AuthMethod) => boolean;
  
  // Error handling
  lastError: string | null;
  clearError: () => void;
}
