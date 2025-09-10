/**
 * Clerk Authentication Configuration
 * 
 * This file contains the configuration for Clerk authentication service.
 * Make sure to set your VITE_CLERK_PUBLISHABLE_KEY in your .env file.
 * Get your keys from https://dashboard.clerk.com/
 */

// Validate environment variables
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Check if we're using placeholder keys
const isPlaceholderKey = publishableKey === 'pk_test_your-actual-publishable-key-here' || 
                        publishableKey === 'pk_test_your-publishable-key-here';

if (!publishableKey) {
  throw new Error(
    'Missing Clerk Publishable Key. Please add VITE_CLERK_PUBLISHABLE_KEY to your .env.local file.'
  );
}

if (isPlaceholderKey) {
  throw new Error(
    'Please replace the placeholder Clerk Publishable Key with your actual key from https://dashboard.clerk.com/'
  );
}

// Clerk configuration object
export const clerkConfig = {
  publishableKey,
  // Add afterSignOutUrl to handle sign-out redirects properly
  afterSignOutUrl: '/sign-in',
  // Add error handling options
  onSignOutFailure: (error: Error) => {
    console.error('Clerk sign-out failed:', error);
    // Fallback: redirect to sign-in page
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
  },
  appearance: {
    // You can customize the appearance here
    // See: https://clerk.com/docs/customization/overview
    variables: {
      colorPrimary: '#3B82F6', // Blue color to match your app theme
      colorBackground: '#1F2937', // Dark background to match your app
      colorInputBackground: '#374151',
      colorInputText: '#F9FAFB',
      colorText: '#F9FAFB',
    },
    elements: {
      rootBox: 'mx-auto max-w-md',
      card: 'bg-gray-800 shadow-xl border border-gray-700',
      headerTitle: 'text-white',
      headerSubtitle: 'text-gray-300',
      socialButtonsIconButton: 'border-gray-600 hover:border-gray-500',
      formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
      footerActionText: 'text-gray-300',
      footerActionLink: 'text-blue-400 hover:text-blue-300',
      identityPreviewEditButton: 'text-blue-400 hover:text-blue-300',
      formFieldInput: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
      formFieldLabel: 'text-gray-300',
    },
  },
  // Additional Clerk options
  localization: {
    // You can add custom text here
    signIn: {
      start: {
        title: 'Sign in to Stock Ticker',
        subtitle: 'Access your stock portfolio dashboard',
      },
    },
    signUp: {
      start: {
        title: 'Create your Stock Ticker account',
        subtitle: 'Get started with real-time stock monitoring',
      },
    },
  },
};

// Export the publishable key for direct use if needed
export { publishableKey };

// Helper function to check if we're in development mode
export const isDevelopment = import.meta.env.MODE === 'development';

// Default redirect URLs
export const redirectUrls = {
  signIn: '/',
  signUp: '/',
  afterSignIn: '/',
  afterSignUp: '/',
};
