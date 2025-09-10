# AWS Amplify Environment Variables Deployment Guide

This document outlines multiple methods to deploy environment variables to AWS Amplify **without using the console**.

## 🚀 Available Methods

### 1. Amplify Configuration File (`amplify.yml`)
✅ **Recommended for most use cases**

Environment variables are defined directly in your `amplify.yml` file and deployed automatically with your code.

**Pros:**
- Version controlled with your code
- Automatic deployment on code changes
- Branch-specific configuration supported

**Usage:**
```bash
git add amplify.yml
git commit -m "Update environment variables"
git push origin main
```

### 2. Node.js Deployment Script
✅ **Best for dynamic deployments**

Use the included Node.js script for programmatic deployment.

**Setup:**
```bash
# Install dependencies
npm install @aws-sdk/client-amplify

# Configure environment variables
cp .env.amplify.example .env.amplify
# Edit .env.amplify with your values

# Deploy environment variables
npm run deploy:env
```

### 3. AWS CLI Commands
✅ **Best for one-off deployments**

**Prerequisites:**
```bash
# Install AWS CLI
brew install awscli

# Configure AWS CLI
aws configure
```

**Deploy Variables:**
```bash
# Update app-level environment variables
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --environment-variables VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx,VITE_API_BASE_URL=https://api.example.com

# Update branch-specific environment variables
aws amplify update-branch \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --environment-variables NODE_ENV=production,VITE_DEBUG_MODE=false
```

### 4. GitHub Actions Workflow
✅ **Best for CI/CD integration**

The included GitHub Actions workflow (`.github/workflows/deploy-env-vars.yml`) automatically deploys environment variables on code changes.

**Setup:**
1. Add these secrets to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AMPLIFY_APP_ID`
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_API_BASE_URL`

2. Push changes to trigger deployment:
```bash
git push origin main
```

### 5. Terraform (Infrastructure as Code)
✅ **Best for complex infrastructure**

```hcl
resource "aws_amplify_app" "stock_ticker" {
  name = "stock-ticker"
  
  environment_variables = {
    "VITE_CLERK_PUBLISHABLE_KEY" = var.clerk_publishable_key
    "VITE_API_BASE_URL"          = var.api_base_url
  }
}
```

## 🔧 Environment Variables Configuration

### Required Variables
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_... # Clerk authentication key
```

### Optional Variables
```bash
VITE_API_BASE_URL=https://api.example.com    # API server URL
VITE_DEBUG_MODE=false                        # Debug mode toggle
VITE_LOG_LEVEL=warn                          # Logging level
VITE_ENFORCE_HTTPS=true                      # HTTPS enforcement
VITE_ENABLE_HSTS=true                        # HSTS headers
VITE_ENABLE_CSP=true                         # Content Security Policy
NODE_ENV=production                          # Node environment
```

## 📊 Deployment Commands

```bash
# Deploy using Node.js script
npm run deploy:env

# Deploy using Amplify alias
npm run amplify:env

# Manual AWS CLI deployment
aws amplify update-app --app-id YOUR_APP_ID --environment-variables KEY=VALUE

# Trigger rebuild after variable changes
aws amplify start-job --app-id YOUR_APP_ID --branch-name main --job-type RELEASE
```

## 🔐 Security Best Practices

1. **Never commit sensitive keys** to version control
2. **Use environment-specific variables** for different branches
3. **Store secrets in GitHub Secrets** or AWS Secrets Manager
4. **Rotate keys regularly**
5. **Use least-privilege AWS IAM policies**

## 📝 Getting Your Amplify App ID

```bash
# List all Amplify apps
aws amplify list-apps

# Get specific app details
aws amplify get-app --app-id YOUR_APP_ID
```

## 🚨 Troubleshooting

### Common Issues:

1. **"App not found" error**
   - Verify your `AMPLIFY_APP_ID` is correct
   - Ensure AWS credentials have proper permissions

2. **"Access denied" error**
   - Check AWS IAM permissions
   - Verify AWS region matches your app's region

3. **Variables not taking effect**
   - Trigger a new build after updating variables
   - Check branch-specific vs app-level variable precedence

### Verify Deployment:
```bash
# Check current environment variables
aws amplify get-app --app-id YOUR_APP_ID --query 'app.environmentVariables'

# Check branch-specific variables
aws amplify get-branch --app-id YOUR_APP_ID --branch-name main --query 'branch.environmentVariables'
```

## 📞 Support

If you encounter issues with environment variable deployment, check:
1. AWS IAM permissions
2. Amplify app ID and region
3. Environment variable names (must start with `VITE_` for client-side access)
4. Build logs in Amplify console for variable resolution issues
