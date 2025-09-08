# Stock Ticker - Production Deployment Guide

This guide helps you deploy the Stock Ticker application to production with both frontend and backend components.

## Overview

The Stock Ticker application consists of:
- **Frontend**: React app built with Vite (served as static files)
- **Backend**: Node.js Express API server

## Prerequisites

- Node.js 18+ installed
- Access to a hosting platform (Heroku, Railway, DigitalOcean, AWS, etc.)
- Domain name or hosting URL

## Step 1: Deploy the API Server (Backend)

### Option A: Deploy to Railway (Recommended)

1. **Create account**: Go to [railway.app](https://railway.app)
2. **Create new project**: Click "New Project" → "Deploy from GitHub repo"
3. **Select repository**: Choose your stock-ticker repository
4. **Configure environment variables** in Railway dashboard:
   ```
   NODE_ENV=production
   REMOTE_ALLOWED_ORIGINS=https://yourdomain.com,https://staging.d49gw0148cutm.amplifyapp.com
   REMOTE_JWT_SECRET=G747l1L8iCQqIT7v28eXvtQuD+Ryv7rDkx2aX909BaQ=
   REMOTE_API_KEY=VX/In0jzS8VW+qrA8FORVIeGu6AvJiSg
   REMOTE_PORT=3002
   REMOTE_HOST=0.0.0.0
   REMOTE_ADMIN_USERNAME=admin
   REMOTE_ADMIN_PASSWORD_HASH=$2b$12$akdfS2nE1SHIxUKwZqKmKuLPBm2xvyZwjE2jnkI784laVe4H/rCCK
   REMOTE_CONTROLLER_USERNAME=controller
   REMOTE_CONTROLLER_PASSWORD_HASH=$2b$12$lMAtgZ9OkwhEbbsySFi4JOW5YyoJw4FuwwYionMsqe2LrGjVVsJhO
   ```
5. **Set start command**: `npm run server:production`
6. **Deploy**: Railway will automatically deploy your API server

### Option B: Deploy to Heroku

1. **Install Heroku CLI**: `brew install heroku/brew/heroku`
2. **Login**: `heroku login`
3. **Create app**: `heroku create your-app-name-api`
4. **Set environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set REMOTE_ALLOWED_ORIGINS=https://yourdomain.com
   heroku config:set REMOTE_JWT_SECRET=G747l1L8iCQqIT7v28eXvtQuD+Ryv7rDkx2aX909BaQ=
   heroku config:set REMOTE_API_KEY=VX/In0jzS8VW+qrA8FORVIeGu6AvJiSg
   # ... add all other variables
   ```
5. **Deploy**: `git push heroku main`

## Step 2: Configure Frontend for Production

1. **Update API URL**: Edit `.env.production.frontend`
   ```
   VITE_API_BASE_URL=https://your-deployed-api-server.railway.app
   ```

2. **Build for production**:
   ```bash
   npm run build:production
   ```

## Step 3: Deploy Frontend

### Option A: Deploy to AWS Amplify

1. **Go to AWS Amplify Console**
2. **Connect repository**: Choose your GitHub repository
3. **Configure build settings**:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build:production
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
   ```
4. **Add environment variables** in Amplify console:
   ```
   VITE_API_BASE_URL=https://your-api-server.railway.app
   VITE_ACCESS_CODE=SecureProd2024!StockTicker
   VITE_DEBUG_MODE=false
   ```

### Option B: Deploy to Netlify

1. **Connect to Netlify**
2. **Build command**: `npm run build:production`
3. **Publish directory**: `dist`
4. **Add environment variables** in Netlify dashboard

## Step 4: Update CORS Configuration

Once you have your frontend URL, update the API server's CORS configuration:

1. **Add frontend URL to REMOTE_ALLOWED_ORIGINS**:
   ```
   REMOTE_ALLOWED_ORIGINS=https://your-frontend-domain.com,https://staging.d49gw0148cutm.amplifyapp.com
   ```

2. **Redeploy API server** with updated environment variables

## Step 5: Test Production Deployment

1. **Visit your frontend URL**
2. **Check browser console** for any API connection errors
3. **Test Remote Control Panel** functionality
4. **Verify stock data updates** are working

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure frontend URL is in REMOTE_ALLOWED_ORIGINS
2. **API Not Found**: Check VITE_API_BASE_URL is correct
3. **Build Failures**: Check all environment variables are set
4. **API Server 500 Errors**: Check server logs for missing environment variables

### Environment Variable Checklist

**Frontend (.env.production.frontend):**
- ✅ VITE_API_BASE_URL
- ✅ VITE_ACCESS_CODE
- ✅ VITE_DEBUG_MODE=false

**Backend (hosting platform environment variables):**
- ✅ NODE_ENV=production
- ✅ REMOTE_ALLOWED_ORIGINS
- ✅ REMOTE_JWT_SECRET
- ✅ REMOTE_API_KEY
- ✅ REMOTE_ADMIN_PASSWORD_HASH
- ✅ REMOTE_CONTROLLER_PASSWORD_HASH

## Security Notes

- Never commit `.env.production` files to version control
- Use strong, unique passwords for production
- Regularly rotate JWT secrets and API keys
- Enable HTTPS for both frontend and backend
- Monitor API logs for suspicious activity

## Local Production Testing

To test production builds locally:

```bash
# Start API server in production mode
npm run server:production

# Build frontend for production (in another terminal)
npm run build:production

# Serve production build
npm run preview
```
