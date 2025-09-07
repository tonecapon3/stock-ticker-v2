# 🚂 Railway API Server Deployment Guide

## Step 1: Push Changes to GitHub

First, let's commit the Railway configuration files:

```bash
git add railway.json Procfile
git commit -m "Add Railway deployment configuration"
git push origin main
```

## Step 2: Sign Up for Railway

1. **Go to Railway**: https://railway.app
2. **Sign up with GitHub**: Click "Login with GitHub"
3. **Authorize Railway**: Give it access to your GitHub repositories

## Step 3: Create New Project

1. **Click "New Project"**
2. **Select "Deploy from GitHub repo"**
3. **Choose your repository**: `CyberRangers/stock-ticker-v2`
4. **Railway will automatically detect**: Node.js project and start deploying

## Step 4: Configure Environment Variables

After deployment starts, you need to set these environment variables:

1. **Go to your project** in Railway dashboard
2. **Click on your service** (should be named after your repo)
3. **Go to "Variables" tab**
4. **Add these variables**:

```bash
NODE_ENV=production
REMOTE_JWT_SECRET=G747l1L8iCQqIT7v28eXvtQuD+Ryv7rDkx2aX909BaQ=
REMOTE_API_KEY=VX/In0jzS8VW+qrA8FORVIeGu6AvJiSg
REMOTE_ALLOWED_ORIGINS=https://staging.d49gw0148cutm.amplifyapp.com
REMOTE_HOST=0.0.0.0
REMOTE_ADMIN_USERNAME=admin
REMOTE_ADMIN_PASSWORD_HASH=$2b$12$akdfS2nE1SHIxUKwZqKmKuLPBm2xvyZwjE2jnkI784laVe4H/rCCK
REMOTE_CONTROLLER_USERNAME=controller
REMOTE_CONTROLLER_PASSWORD_HASH=$2b$12$lMAtgZ9OkwhEbbsySFi4JOW5YyoJw4FuwwYionMsqe2LrGjVVsJhO
```

## Step 5: Get Your API URL

1. **After deployment completes**, you'll see a URL like:
   - `https://your-project-name-production-xxx.up.railway.app`
2. **Copy this URL** - this is your deployed API server!

## Step 6: Test Your API

Open your API URL in browser:
```
https://your-project-name-production-xxx.up.railway.app/api/remote/status/health
```

You should see a JSON response indicating the API is working.

## Step 7: Update Frontend Configuration

Run this command with your Railway URL:
```bash
./scripts/update-api-url.sh https://your-project-name-production-xxx.up.railway.app
```

## Step 8: Rebuild and Deploy Frontend

```bash
npm run build:production
# Then redeploy to AWS Amplify
```

## Troubleshooting

### Deployment Failed
- Check the "Logs" tab in Railway dashboard
- Make sure all environment variables are set
- Verify your GitHub repo has the latest changes

### API Not Responding
- Check Railway logs for errors
- Verify environment variables are set correctly
- Test health endpoint: `/api/remote/status/health`

### CORS Still Blocked
- Make sure `REMOTE_ALLOWED_ORIGINS` includes your frontend URL
- Redeploy after changing environment variables

## Railway Features

- **Automatic SSL**: Your API will have HTTPS automatically
- **Custom Domain**: You can add your own domain later
- **Auto-Deploy**: Pushes to main branch auto-deploy
- **Logs**: Real-time logs in the dashboard
- **Metrics**: CPU, memory usage monitoring
