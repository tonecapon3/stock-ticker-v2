# Amplify Environment Variables Setup

This guide explains how to configure environment variables in AWS Amplify for the Stock Ticker application.

## Required Environment Variables

### Clerk Authentication
- `VITE_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key from the dashboard
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Same as above (for compatibility)

### API Configuration
- `VITE_API_BASE_URL`: URL of your deployed API server (if using one)
- `VITE_ACCESS_CODE`: Access code for the application

### Security Settings
- `VITE_ENFORCE_HTTPS`: Set to `true` for production
- `VITE_ENABLE_HSTS`: Set to `true` for production
- `VITE_ENABLE_CSP`: Set to `true` for production

### Session Configuration
- `VITE_SESSION_TIMEOUT`: Session timeout in milliseconds
- `VITE_MAX_LOGIN_ATTEMPTS`: Maximum login attempts allowed

### Debug Settings
- `VITE_DEBUG_MODE`: Set to `false` for production
- `VITE_LOG_LEVEL`: Set to `error` for production

## How to Set Environment Variables in Amplify

1. Open the AWS Amplify Console
2. Navigate to your Stock Ticker app
3. Go to "App settings" → "Environment variables"
4. Add each variable with its corresponding value
5. Save the configuration
6. Trigger a new deployment

## Values to Use

Copy these values into your Amplify environment variables:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_d29ya2FibGUtbWFydGluLTAuY2xlcmsuYWNjb3VudHMuZGV2JA
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_d29ya2FibGUtbWFydGluLTAuY2xlcmsuYWNjb3VudHMuZGV2JA
VITE_ACCESS_CODE=SecureProd2024!StockTicker
VITE_SESSION_TIMEOUT=7200000
VITE_MAX_LOGIN_ATTEMPTS=3
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
VITE_ENFORCE_HTTPS=true
VITE_ENABLE_HSTS=true
VITE_ENABLE_CSP=true
```

## Testing

After setting up the environment variables and deploying:

1. Visit your Amplify app URL
2. Test sign-in functionality
3. Test the Remote Control Panel (if API server is configured)
4. Verify sign-out works without errors

## Troubleshooting

- If sign-out fails with network errors, check that Clerk keys are correctly set
- If the app shows authentication errors, verify the publishable key is correct
- If the Remote Control Panel doesn't work, ensure API_BASE_URL is set (or leave empty to disable)
