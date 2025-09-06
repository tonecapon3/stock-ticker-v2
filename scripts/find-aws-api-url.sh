#!/bin/bash

echo "🔍 AWS API URL Discovery Script"
echo "================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed."
    echo "📦 To install AWS CLI on macOS:"
    echo "   brew install awscli"
    echo "   # OR"
    echo "   curl 'https://awscli.amazonaws.com/AWSCLIV2.pkg' -o 'AWSCLIV2.pkg'"
    echo "   sudo installer -pkg AWSCLIV2.pkg -target /"
    echo ""
    echo "⚙️  After installation, configure with:"
    echo "   aws configure"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured."
    echo "⚙️  Run: aws configure"
    echo "   You'll need:"
    echo "   - AWS Access Key ID"
    echo "   - AWS Secret Access Key"
    echo "   - Default region (e.g., us-east-1)"
    exit 1
fi

echo "✅ AWS CLI is configured"
echo "👤 Current AWS identity:"
aws sts get-caller-identity --output table
echo ""

echo "🔍 Searching for API Gateway endpoints..."
echo ""

# Method 1: List API Gateway REST APIs
echo "📡 REST APIs:"
aws apigateway get-rest-apis --query 'items[*].[name,id]' --output table 2>/dev/null || echo "No REST APIs found or no permission"
echo ""

# Method 2: List API Gateway v2 APIs (HTTP APIs)
echo "🌐 HTTP APIs:"
aws apigatewayv2 get-apis --query 'Items[*].[Name,ApiId,ApiEndpoint]' --output table 2>/dev/null || echo "No HTTP APIs found or no permission"
echo ""

# Method 3: List Amplify apps
echo "🚀 Amplify Applications:"
aws amplify list-apps --query 'apps[*].[name,appId,defaultDomain]' --output table 2>/dev/null || echo "No Amplify apps found or no permission"
echo ""

# Method 4: List Lambda functions that might be APIs
echo "λ Lambda Functions (potential APIs):"
aws lambda list-functions --query 'Functions[*].[FunctionName,Runtime,LastModified]' --output table 2>/dev/null | head -20
echo ""

# Method 5: List CloudFormation stacks
echo "☁️  CloudFormation Stacks:"
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query 'StackSummaries[*].[StackName,StackStatus,CreationTime]' --output table 2>/dev/null | head -10
echo ""

echo "💡 Tips to find your API URL:"
echo "1. Look for API Gateway entries above"
echo "2. Check Amplify app domains"
echo "3. Look in CloudFormation stack outputs:"
echo "   aws cloudformation describe-stacks --stack-name YOUR_STACK_NAME --query 'Stacks[0].Outputs'"
echo ""
echo "4. If you have the API Gateway ID, get the URL:"
echo "   aws apigateway get-rest-api --rest-api-id YOUR_API_ID"
echo ""
echo "5. For HTTP API (v2):"
echo "   aws apigatewayv2 get-api --api-id YOUR_API_ID"
