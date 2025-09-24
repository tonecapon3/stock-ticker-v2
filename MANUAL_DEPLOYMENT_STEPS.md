# Manual Deployment Steps for Staging Instance

Since the automated script requires GitHub tokens, let's create the staging instance manually through the AWS Console. This is actually simpler and more reliable.

## 🚀 Step-by-Step Manual Deployment

### Step 1: Create New Amplify App via AWS Console

1. **Open AWS Amplify Console**: 
   - Go to: https://console.aws.amazon.com/amplify/
   - Make sure you're in the `us-east-1` region (same as your main instance)

2. **Click "Create new app"**

3. **Connect to GitHub**:
   - Choose "GitHub" as the source
   - Click "Connect branch"
   - Authorize AWS Amplify to access your GitHub account if prompted
   - Select repository: `tonecapon3/stock-ticker-v2`
   - Select branch: `staging` ✅ (this is key for session isolation)
   - Click "Next"

### Step 2: Configure Build Settings

1. **App Name**: `stock-ticker-staging`

2. **Build and test settings**:
   - Amplify will auto-detect your `amplify.yml` file
   - The staging branch configuration will be used automatically
   - Click "Next"

### Step 3: Add Environment Variables

In the "Environment variables" section, add these **session isolation variables**:

```
VITE_CLERK_PUBLISHABLE_KEY = pk_test_d29ya2FibGUtbWFydGluLTAuY2xlcmsuYWNjb3VudHMuZGV2JA
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_test_d29ya2FibGUtbWFydGluLTAuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY = sk_test_SThTzDsbXHbUr9wjn1srdFmnMXTrkeAxCu5gOif5uW
VITE_API_BASE_URL = https://stock-ticker-v2.onrender.com
VITE_INSTANCE_ID = staging
VITE_SESSION_DOMAIN = staging  
VITE_DEBUG_MODE = true
VITE_LOG_LEVEL = debug
VITE_ENFORCE_HTTPS = true
VITE_ENABLE_HSTS = true
VITE_ENABLE_CSP = true
NODE_ENV = production
```

**⚠️ CRITICAL**: The `VITE_INSTANCE_ID` and `VITE_SESSION_DOMAIN` variables are what ensure session isolation!

### Step 4: Review and Deploy

1. **Review all settings**
2. Click "Save and deploy"
3. **Wait for the build** (usually 3-5 minutes)

### Step 5: Get Your New URLs

Once deployed, you'll have:
- **Staging URL**: `https://staging.[NEW_APP_ID].amplifyapp.com`
- **App ID**: Will be shown in the Amplify Console

## 🔍 What to Expect

### Current Setup:
- **Production**: https://main.d7lc7dqjkvbj3.amplifyapp.com (VITE_INSTANCE_ID=production)
- **Staging**: https://staging.[NEW_APP_ID].amplifyapp.com (VITE_INSTANCE_ID=staging)

### Session Isolation Test:
1. Open both URLs in separate browser tabs
2. Sign in to production → Check staging (should be signed out)
3. Sign in to staging → Both can be authenticated simultaneously
4. Sign out of one → Other remains signed in

## 🛠️ Alternative: Quick AWS CLI Method

If you want to try CLI again with a simpler approach:

```bash
# Create the app (without GitHub token complications)
aws amplify create-app \
  --name "stock-ticker-staging" \
  --description "Staging instance with session isolation"

# Note the App ID from the output, then:
# 1. Go to AWS Console to connect the GitHub repository
# 2. Add environment variables manually
# 3. Deploy the staging branch
```

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ New Amplify app created with staging branch
- ✅ Environment variables set (especially VITE_INSTANCE_ID=staging)  
- ✅ Build completes successfully
- ✅ Staging URL is accessible
- ✅ Session isolation works (test with both URLs)
- ✅ Same Clerk authentication but separate sessions
- ✅ Same backend API connectivity

## 📞 Support

If you run into issues:
1. **Check build logs** in Amplify Console
2. **Verify environment variables** are set correctly
3. **Test the production instance** first to ensure it still works
4. **Check GitHub branch** is `staging` (not main)

The manual method through AWS Console is actually the most reliable approach for this setup!