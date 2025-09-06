# 🔍 How to Find Your AWS API Server URL

## Method 1: AWS Console (Recommended - No CLI needed)

### Option A: API Gateway Console
1. **Login to AWS Console**: https://console.aws.amazon.com/
2. **Go to API Gateway**: Search for "API Gateway" in the services
3. **Find your API**:
   - Look for REST APIs or HTTP APIs
   - Your API might be named something like "stock-ticker-api" or similar
4. **Get the URL**:
   - Click on your API name
   - Look for "Invoke URL" or "API endpoint"
   - Copy the full URL (e.g., `https://abc123def.execute-api.us-east-1.amazonaws.com/prod`)

### Option B: AWS Amplify Console
1. **Go to Amplify**: https://console.aws.amazon.com/amplify/
2. **Find your backend**:
   - Look for backend environments or API services
   - Your API URL might be listed in the environment details
3. **Check Environment Variables**:
   - If you deployed through Amplify, the API URL might be in environment variables

### Option C: Lambda Console
1. **Go to Lambda**: https://console.aws.amazon.com/lambda/
2. **Find your functions**: Look for functions related to your stock ticker
3. **Check triggers**: Functions with API Gateway triggers will show the API URL

### Option D: CloudFormation Console
1. **Go to CloudFormation**: https://console.aws.amazon.com/cloudformation/
2. **Find your stack**: Look for stacks related to your deployment
3. **Check Outputs tab**: The API URL is often in the stack outputs

## Method 2: Using AWS CLI (if available)

### Install AWS CLI
```bash
# macOS
brew install awscli

# Alternative for macOS
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

### Configure AWS CLI
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key  
# Enter your default region (e.g., us-east-1)
# Enter output format (json)
```

### Find API URLs
```bash
# Run our discovery script
./scripts/find-aws-api-url.sh

# Or manually:
# List API Gateway REST APIs
aws apigateway get-rest-apis

# List API Gateway HTTP APIs
aws apigatewayv2 get-apis

# List Amplify apps
aws amplify list-apps
```

## Method 3: Common AWS API URL Patterns

AWS API URLs typically follow these patterns:

### API Gateway REST API:
```
https://{api-id}.execute-api.{region}.amazonaws.com/{stage}
```
**Example**: `https://abc123def.execute-api.us-east-1.amazonaws.com/prod`

### API Gateway HTTP API:
```
https://{api-id}.execute-api.{region}.amazonaws.com/
```
**Example**: `https://xyz789abc.execute-api.us-west-2.amazonaws.com`

### Lambda Function URL:
```
https://{url-id}.lambda-url.{region}.on.aws/
```
**Example**: `https://abcd1234-efgh-5678-ijkl-9012mnop3456.lambda-url.us-east-1.on.aws`

## Method 4: Check Your Deployment Logs

If you deployed recently, check your deployment logs for:
- "API Gateway endpoint created"
- "Invoke URL"
- "API endpoint"
- Any URLs that look like the patterns above

## Method 5: Network Tab Method

1. **Open your current deployment** (if working partially)
2. **Open browser Developer Tools** (F12)
3. **Go to Network tab**
4. **Try to use a feature** that makes API calls
5. **Look for failed requests** - the URL will show where it's trying to connect

## 🔧 Once You Find Your API URL

### Step 1: Test the URL
Open your browser and try to access:
```
https://your-api-url.com/api/remote/status/health
```

### Step 2: Update Your Environment
Run our update script:
```bash
./scripts/update-api-url.sh https://your-api-url.com
```

### Step 3: Manual Update (if script doesn't work)
Edit `.env.production`:
```bash
VITE_API_BASE_URL=https://your-api-url.com
```

## 🚨 Common Issues & Solutions

### Issue: "Unable to find API"
- **Check different AWS regions** - your API might be in a different region
- **Look in all AWS services** - Lambda, API Gateway, Amplify, etc.
- **Check if deployment completed** - the API might still be deploying

### Issue: "Access denied in AWS Console"
- **Check your AWS permissions** - you need read access to API Gateway, Lambda, etc.
- **Ask whoever deployed it** - they should have the URL information

### Issue: "API URL doesn't work"
- **Check HTTPS vs HTTP** - AWS typically uses HTTPS
- **Verify the path** - make sure `/api/remote` is correct
- **Check if API server is running** - it might be stopped or crashed

### Issue: "Multiple APIs found"
- **Look for naming patterns** - APIs related to "stock", "ticker", etc.
- **Check creation dates** - newer APIs are probably the ones you want
- **Test each URL** - try accessing the health endpoint

## 📋 Quick Reference

### What you're looking for:
- URL starting with `https://`
- Contains `amazonaws.com` or your custom domain
- Responds to `/api/remote/stocks` or `/api/remote/status/health`
- Created around the time you deployed your backend

### Common locations:
1. API Gateway → Your API → Stages → Invoke URL
2. Lambda → Your function → Configuration → Function URL
3. Amplify → Your app → Backend environments
4. CloudFormation → Your stack → Outputs

### Test commands:
```bash
# Test if URL is working
curl -X POST https://your-api-url/api/remote/status/health

# Test CORS
curl -H "Origin: https://your-frontend-domain.com" \
     -X OPTIONS \
     https://your-api-url/api/remote/stocks
```
