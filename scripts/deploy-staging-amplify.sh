#!/bin/bash

# Deploy Staging Amplify Instance with Session Isolation
# This script creates a new Amplify app for the staging branch

set -e

echo "🚀 Creating new AWS Amplify instance for staging deployment..."

# Load staging environment configuration
if [ -f ".env.amplify.staging" ]; then
    echo "📋 Loading staging environment configuration..."
    source .env.amplify.staging
else
    echo "❌ .env.amplify.staging file not found!"
    echo "Please copy .env.amplify.staging.template and configure it with your values."
    exit 1
fi

# Check AWS authentication
if [ "$USE_SSO" = "true" ]; then
    echo "🔐 Using AWS SSO authentication..."
    if ! aws sts get-caller-identity --profile $AWS_PROFILE > /dev/null 2>&1; then
        echo "❌ AWS SSO not authenticated. Please run:"
        echo "aws sso login --profile $AWS_PROFILE"
        exit 1
    fi
    AWS_PROFILE_FLAG="--profile $AWS_PROFILE"
else
    echo "🔐 Using AWS Access Keys..."
    AWS_PROFILE_FLAG=""
fi

# Create new Amplify application
echo "📱 Creating new Amplify application..."
NEW_APP_JSON=$(aws amplify create-app $AWS_PROFILE_FLAG \
    --name "stock-ticker-staging" \
    --description "Stock Ticker Staging Instance with Session Isolation" \
    --repository "https://github.com/tonecapon3/stock-ticker-v2" \
    --platform WEB \
    --environment-variables '{"NODE_ENV":"production","VITE_ENFORCE_HTTPS":"true","VITE_ENABLE_HSTS":"true","VITE_ENABLE_CSP":"true","VITE_INSTANCE_ID":"staging","VITE_SESSION_DOMAIN":"staging"}' \
    --enable-branch-auto-build)

# Extract the new App ID
NEW_APP_ID=$(echo $NEW_APP_JSON | jq -r '.app.appId')
echo "✅ Created new Amplify app with ID: $NEW_APP_ID"

# Update the staging environment file with the new App ID
sed -i.bak "s/AMPLIFY_APP_ID=your_new_app_id_here/AMPLIFY_APP_ID=$NEW_APP_ID/" .env.amplify.staging
echo "📝 Updated .env.amplify.staging with new App ID"

# Create staging branch deployment
echo "🌿 Creating staging branch deployment..."
aws amplify create-branch $AWS_PROFILE_FLAG \
    --app-id $NEW_APP_ID \
    --branch-name staging \
    --description "Staging environment with session isolation" \
    --enable-auto-build \
    --environment-variables "{\"VITE_CLERK_PUBLISHABLE_KEY\":\"$VITE_CLERK_PUBLISHABLE_KEY\",\"NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\":\"$VITE_CLERK_PUBLISHABLE_KEY\",\"CLERK_SECRET_KEY\":\"$CLERK_SECRET_KEY\",\"VITE_API_BASE_URL\":\"$VITE_API_BASE_URL\",\"VITE_DEBUG_MODE\":\"$VITE_DEBUG_MODE\",\"VITE_LOG_LEVEL\":\"$VITE_LOG_LEVEL\",\"VITE_INSTANCE_ID\":\"$VITE_INSTANCE_ID\",\"VITE_SESSION_DOMAIN\":\"$VITE_SESSION_DOMAIN\",\"VITE_ENFORCE_HTTPS\":\"$VITE_ENFORCE_HTTPS\",\"VITE_ENABLE_HSTS\":\"$VITE_ENABLE_HSTS\",\"VITE_ENABLE_CSP\":\"$VITE_ENABLE_CSP\"}"

echo "✅ Created staging branch deployment"

# Start build and deployment
echo "🔨 Starting initial deployment..."
BUILD_JSON=$(aws amplify start-job $AWS_PROFILE_FLAG \
    --app-id $NEW_APP_ID \
    --branch-name staging \
    --job-type RELEASE)

BUILD_ID=$(echo $BUILD_JSON | jq -r '.jobSummary.jobId')
echo "🚀 Build started with ID: $BUILD_ID"

# Get the staging URL
STAGING_URL="https://staging.$NEW_APP_ID.amplifyapp.com"
echo ""
echo "🎉 Staging instance created successfully!"
echo ""
echo "📊 Instance Details:"
echo "   Main Instance URL:    https://main.d7lc7dqjkvbj3.amplifyapp.com"
echo "   Staging Instance URL: $STAGING_URL"
echo "   App ID:              $NEW_APP_ID"
echo "   Branch:              staging"
echo ""
echo "🔒 Session Isolation:"
echo "   ✅ Instances use different VITE_INSTANCE_ID values"
echo "   ✅ Instances use different VITE_SESSION_DOMAIN values"  
echo "   ✅ localStorage keys are prefixed per instance"
echo "   ✅ Users can switch between instances without session conflicts"
echo ""
echo "⏳ Build Status:"
echo "   Monitor at: https://console.aws.amazon.com/amplify/home#$NEW_APP_ID"
echo "   Build ID: $BUILD_ID"
echo ""
echo "🔄 To monitor the build progress:"
echo "aws amplify get-job $AWS_PROFILE_FLAG --app-id $NEW_APP_ID --branch-name staging --job-id $BUILD_ID"