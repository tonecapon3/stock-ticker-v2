# Separate API Servers Setup

## Overview

This setup creates separate API servers for staging and production environments to ensure proper data isolation.

## Architecture

```
Staging Frontend (Amplify)  →  Staging API Server (Render)
Production Frontend (Amplify)  →  Production API Server (Render)
```

### Environments

- **Staging Frontend**: https://staging.dv565hju499c6.amplifyapp.com/
  - **Staging API**: https://stock-ticker-api-staging.onrender.com
- **Production Frontend**: https://main.d7lc7dqjkvbj3.amplifyapp.com/
  - **Production API**: https://stock-ticker-api-production.onrender.com

## Setup Instructions

### 1. Deploy Staging API Server

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:
   - **Name**: `stock-ticker-api-staging`
   - **Branch**: `staging`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:production`
   - **Instance Type**: `Free`

5. **Environment Variables** (copy from `render-staging.yaml`):
   ```
   NODE_ENV=staging
   PORT=10000
   CORS_ORIGIN=https://staging.dv565hju499c6.amplifyapp.com
   REMOTE_JWT_SECRET=[auto-generated]
   REMOTE_ADMIN_PASSWORD_HASH=$2b$10$8K1p.X2v3l2K9.o0/wE4xeD1vNxT7mB8qL5zK3rP2nM4cV6bH9tO6
   REMOTE_CONTROLLER_PASSWORD_HASH=$2b$10$9M2q.Y3w4m3L0.p1/xF5yfE2wOyU8nC9rM6aL4sQ3oN5dW7cI0uP7
   CLERK_SECRET_KEY=sk_test_SThTzDsbXHbUr9wjn1srdFmnMXTrkeAxCu5gOif5uW
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_d29ya2FibGUtbWFydGluLTAuY2xlcmsuYWNjb3VudHMuZGV2JA
   ```

### 2. Update Production API Server

1. Go to your existing Render service: `stock-ticker-v2`
2. Rename it to: `stock-ticker-api-production`
3. Update environment variables:
   ```
   NODE_ENV=production
   CORS_ORIGIN=https://main.d7lc7dqjkvbj3.amplifyapp.com
   ```

### 3. Deploy Changes

The `amplify.yml` has been updated to point to the new API URLs:
- **Production**: `https://stock-ticker-api-production.onrender.com`
- **Staging**: `https://stock-ticker-api-staging.onrender.com`

## Testing

After setup, verify isolation:

1. **Add a stock in staging** → Should only appear in staging
2. **Add a stock in production** → Should only appear in production
3. **Check API health endpoints**:
   - Staging: https://stock-ticker-api-staging.onrender.com/health
   - Production: https://stock-ticker-api-production.onrender.com/health

## Credentials

Both environments use the same login credentials:
- **Username**: `admin`
- **Password**: `AdminSecure2025!@`

But data will be completely separate between staging and production.

## Benefits

✅ **Data Isolation**: Staging tests won't affect production data
✅ **Environment Parity**: Both environments run identical code
✅ **Safe Testing**: Can test breaking changes in staging safely
✅ **Independent Scaling**: Can scale production and staging separately