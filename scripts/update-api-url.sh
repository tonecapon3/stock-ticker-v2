#!/bin/bash

echo "🔧 Update Production API URL Script"
echo "==================================="
echo ""

# Check if API URL is provided
if [ "$#" -ne 1 ]; then
    echo "❌ Usage: $0 <api-url>"
    echo ""
    echo "Examples:"
    echo "  $0 https://abc123.execute-api.us-east-1.amazonaws.com/prod"
    echo "  $0 https://your-api-server.railway.app"
    echo "  $0 https://api.yourdomain.com"
    echo ""
    echo "💡 To find your API URL, run: ./scripts/find-aws-api-url.sh"
    exit 1
fi

API_URL="$1"

# Validate URL format
if [[ ! "$API_URL" =~ ^https?:// ]]; then
    echo "❌ Error: API URL must start with http:// or https://"
    echo "   You provided: $API_URL"
    exit 1
fi

# Remove trailing slash if present
API_URL="${API_URL%/}"

echo "🎯 API URL to configure: $API_URL"
echo ""

# Backup current .env.production
if [ -f ".env.production" ]; then
    cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
    echo "💾 Backed up current .env.production"
fi

# Update .env.production
if [ -f ".env.production" ]; then
    # Update existing file
    sed -i.bak "s|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=$API_URL|g" .env.production
    echo "✅ Updated existing .env.production"
else
    # Create new file
    cat > .env.production << EOF
# ============================================================
# FRONTEND PRODUCTION ENVIRONMENT VARIABLES
# ============================================================
# These variables are used by Vite during production builds
# Variables prefixed with VITE_ are exposed to the browser
# ============================================================

# API Configuration
VITE_API_BASE_URL=$API_URL

# Access Control
VITE_ACCESS_CODE=SecureProd2024!StockTicker

# Session Management
VITE_SESSION_TIMEOUT=7200000
VITE_MAX_LOGIN_ATTEMPTS=3

# Production Settings
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error

# Security Settings
VITE_ENFORCE_HTTPS=true
VITE_ENABLE_HSTS=true
VITE_ENABLE_CSP=true
EOF
    echo "✅ Created new .env.production"
fi

echo ""
echo "📋 Current .env.production configuration:"
echo "----------------------------------------"
grep "VITE_API_BASE_URL" .env.production
echo ""

echo "🧪 Testing API URL connectivity..."
if command -v curl &> /dev/null; then
    # Test the API URL
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/api/remote/status/health" -X POST 2>/dev/null || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ API server is reachable and healthy!"
    elif [ "$HTTP_STATUS" = "000" ]; then
        echo "⚠️  Could not connect to API server (network error or timeout)"
        echo "   This might be normal if the API server isn't deployed yet"
    else
        echo "⚠️  API server responded with HTTP $HTTP_STATUS"
        echo "   This might be normal if the health endpoint doesn't exist yet"
    fi
else
    echo "⚠️  curl not available, skipping connectivity test"
fi

echo ""
echo "🚀 Next steps:"
echo "1. Review the configuration above"
echo "2. Make sure your API server is deployed to: $API_URL"
echo "3. Update your API server's CORS origins to include your frontend domain"
echo "4. Build your frontend: npm run build:production"
echo "5. Deploy your frontend to your hosting platform"
echo ""
echo "🔧 To test the configuration locally:"
echo "   npm run build:production"
echo "   npm run preview"
echo ""
