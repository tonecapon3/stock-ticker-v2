/**
 * Authentication Components Index
 * 
 * Exports all authentication-related components for easy importing
 */

// Main authentication components
export { default as SignInPage } from './SignInPage';
export { default as SignUpPage } from './SignUpPage';
export { default as AuthGuard, AdminGuard, ConditionalAuth } from './AuthGuard';
export { default as UserProfilePage, CompactUserButton, UserInfoDisplay } from './UserProfile';
export { default as AuthLoading, AuthLoadingCompact } from './AuthLoading';

// Custom authentication hook
export { useAuth, useAuthState, useUserInfo, AUTH_STATUS, getAuthStatus } from '../../hooks/useAuth';

// Types
export type { AuthStatus } from '../../hooks/useAuth';
