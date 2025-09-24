# Dual AWS Amplify Instance Setup with Session Isolation

This guide documents the complete setup for running two separate AWS Amplify instances of the Stock Ticker application using the same git repository and Clerk authentication, but with complete session isolation.

## 🎯 Overview

- **Main Instance**: Production environment (main branch)
- **Staging Instance**: Staging/testing environment (staging branch)
- **Session Isolation**: Users can switch between instances without sharing authentication sessions
- **Same Backend**: Both instances use the same Render.com API backend
- **Same Clerk App**: Both instances use the same Clerk authentication application

## 📊 Current Setup

### Instance 1 (Production)
- **URL**: https://main.d7lc7dqjkvbj3.amplifyapp.com
- **App ID**: d7lc7dqjkvbj3
- **Branch**: main
- **Instance ID**: production
- **Session Domain**: main

### Instance 2 (Staging)
- **URL**: Will be generated after deployment
- **App ID**: Will be generated after deployment
- **Branch**: staging  
- **Instance ID**: staging
- **Session Domain**: staging

## 🔒 Session Isolation Mechanism

### How It Works
1. **Instance-specific Storage Keys**: Each instance uses different localStorage keys
   - Production: `clerk-session-production`
   - Staging: `clerk-session-staging`

2. **Environment Variables**: Each branch has unique identifiers
   - `VITE_INSTANCE_ID`: Differentiates between instances
   - `VITE_SESSION_DOMAIN`: Creates separate session domains

3. **Clerk Configuration**: Modified to use instance-specific storage
   ```typescript
   storageKey: `clerk-session-${instanceId}`
   sessionDomain: sessionDomain
   ```

### What This Achieves
- ✅ Users can be logged in to both instances simultaneously
- ✅ Signing out of one instance doesn't affect the other
- ✅ Session data never crosses between instances
- ✅ Each instance maintains its own authentication state

## 🚀 Deployment Commands

### Prerequisites
```bash
# Ensure AWS CLI is installed and configured
aws --version

# For SSO authentication (recommended):
aws configure sso
aws sso login --profile default

# Alternative: Configure access keys in .env.amplify.staging
```

### Deploy New Staging Instance
```bash
# 1. Switch to staging branch (already done)
git checkout staging

# 2. Configure staging environment (edit with your values)
cp .env.amplify.staging.template .env.amplify.staging
# Edit .env.amplify.staging with your AWS credentials

# 3. Run deployment script
./scripts/deploy-staging-amplify.sh

# 4. Monitor deployment
# URLs will be provided in script output
```

### Manual AWS CLI Commands (Alternative)
```bash
# Create new Amplify app
aws amplify create-app \
  --name "stock-ticker-staging" \
  --description "Stock Ticker Staging Instance with Session Isolation" \
  --repository "https://github.com/tonecapon3/stock-ticker-v2" \
  --platform WEB \
  --environment-variables \
    NODE_ENV=production \
    VITE_INSTANCE_ID=staging \
    VITE_SESSION_DOMAIN=staging

# Create staging branch
aws amplify create-branch \
  --app-id YOUR_NEW_APP_ID \
  --branch-name staging \
  --description "Staging environment with session isolation" \
  --enable-auto-build \
  --environment-variables \
    VITE_CLERK_PUBLISHABLE_KEY=pk_test_d29ya2FibGUtbWFydGluLTAuY2xlcmsuYWNjb3VudHMuZGV2JA \
    VITE_INSTANCE_ID=staging \
    VITE_SESSION_DOMAIN=staging

# Start deployment
aws amplify start-job \
  --app-id YOUR_NEW_APP_ID \
  --branch-name staging \
  --job-type RELEASE
```

## 🔧 Environment Variables Comparison

| Variable | Production (main) | Staging (staging) |
|----------|------------------|-------------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | pk_test_d29ya2FibGUtbWFydGluLTAuY2xlcmsuYWNjb3VudHMuZGV2JA | Same (shared Clerk app) |
| `VITE_API_BASE_URL` | https://stock-ticker-v2.onrender.com | Same (shared backend) |
| `VITE_INSTANCE_ID` | production | staging |
| `VITE_SESSION_DOMAIN` | main | staging |
| `VITE_DEBUG_MODE` | false | true |
| `VITE_LOG_LEVEL` | warn | debug |

## 🧪 Testing Session Isolation

### Test Steps
1. **Open both instances** in separate browser tabs
2. **Sign in to production instance** with your Clerk account
3. **Check staging instance** - should show as signed out
4. **Sign in to staging instance** - should work independently
5. **Sign out of one instance** - other should remain signed in
6. **Check browser storage** - should see separate keys for each instance

### Expected Behavior
- **localStorage keys**:
  - Production: `clerk-session-production`, `production_*`
  - Staging: `clerk-session-staging`, `staging_*`
- **Independent sessions**: Each instance maintains its own auth state
- **No cross-contamination**: Actions in one don't affect the other

## 📱 Usage Scenarios

### Production Instance (main)
- **Purpose**: Live application for end users
- **URL**: https://main.d7lc7dqjkvbj3.amplifyapp.com  
- **Features**: Production configuration, optimized performance
- **Logging**: Minimal (warn level)

### Staging Instance (staging)
- **Purpose**: Testing, development, previews
- **URL**: Will be provided after deployment
- **Features**: Debug mode enabled, verbose logging
- **Logging**: Detailed (debug level)

## 🔄 Maintenance & Updates

### Updating Both Instances
```bash
# Update main branch (production)
git checkout main
# Make your changes
git add -A && git commit -m "Your changes"
git push origin main

# Update staging branch
git checkout staging
git merge main  # Merge production changes
# Make staging-specific changes if needed
git push origin staging
```

### Emergency Rollback
```bash
# Rollback production
git checkout main
git revert HEAD
git push origin main

# Rollback staging  
git checkout staging
git revert HEAD
git push origin staging
```

## 🛠️ Troubleshooting

### Session Isolation Not Working
1. **Check environment variables** in Amplify Console
2. **Verify VITE_INSTANCE_ID** is different for each instance
3. **Clear browser storage** and test again
4. **Check browser console** for session storage keys

### Build Failures
1. **Check amplify.yml** syntax
2. **Verify environment variables** are set correctly
3. **Check build logs** in Amplify Console
4. **Ensure Node.js version** compatibility

### Authentication Issues
1. **Verify Clerk keys** are correctly set
2. **Check CORS settings** in Clerk dashboard
3. **Ensure API backend** is accessible from both instances
4. **Test Clerk dashboard** connectivity

## 📞 Support Resources

- **AWS Amplify Console**: https://console.aws.amazon.com/amplify/
- **Clerk Dashboard**: https://dashboard.clerk.com/
- **Repository**: https://github.com/tonecapon3/stock-ticker-v2
- **Backend API**: https://stock-ticker-v2.onrender.com

## ✅ Deployment Checklist

Before going live with staging instance:

- [ ] AWS CLI configured and authenticated
- [ ] Staging branch created and pushed to GitHub
- [ ] .env.amplify.staging configured with correct values
- [ ] Deployment script executed successfully
- [ ] Both instances accessible via their URLs
- [ ] Session isolation tested and working
- [ ] Authentication flow tested on both instances
- [ ] API connectivity verified for both instances
- [ ] Documentation updated with new instance URLs

---

## 🎉 Success!

Once deployed, you'll have:
- **Two independent Amplify instances** sharing the same codebase
- **Complete session isolation** between instances
- **Same Clerk authentication** but separate sessions
- **Shared backend API** for consistent data
- **Easy switching** between instances without conflicts