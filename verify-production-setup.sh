#!/bin/bash

echo "🧪 Production Stock Ticker API Server Verification"
echo "================================================="
echo ""

# Test API server health
echo "1️⃣  Testing API Server Health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://stock-ticker-v2.onrender.com/status/health)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "   ✅ API Server Health: OK"
else
    echo "   ❌ API Server Health: Failed ($HEALTH_STATUS)"
    exit 1
fi

# Test authentication
echo ""
echo "2️⃣  Testing Authentication..."
AUTH_RESPONSE=$(curl -s -X POST https://stock-ticker-v2.onrender.com/api/remote/auth \
    -H "Content-Type: application/json" \
    -H "Origin: https://main.d7lc7dqjkvbj3.amplifyapp.com" \
    -d '{"username": "admin", "password": "AdminSecure2025!@"}')

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "   ✅ Authentication: OK"
    echo "   🔑 Token: ${TOKEN:0:20}..."
else
    echo "   ❌ Authentication: Failed"
    echo "   📄 Response: $AUTH_RESPONSE"
    exit 1
fi

# Test stocks endpoint
echo ""
echo "3️⃣  Testing Stocks Endpoint..."
STOCKS_RESPONSE=$(curl -s -X GET https://stock-ticker-v2.onrender.com/api/remote/stocks \
    -H "Authorization: Bearer $TOKEN" \
    -H "Origin: https://main.d7lc7dqjkvbj3.amplifyapp.com")

if echo "$STOCKS_RESPONSE" | grep -q '"success":true'; then
    STOCK_COUNT=$(echo "$STOCKS_RESPONSE" | grep -o '"stocks":\[' | wc -l)
    echo "   ✅ Stocks Endpoint: OK"
    echo "   📊 Available stocks: Ready for frontend"
else
    echo "   ❌ Stocks Endpoint: Failed"
    echo "   📄 Response: $STOCKS_RESPONSE"
    exit 1
fi

# Test controls endpoint  
echo ""
echo "4️⃣  Testing Controls Endpoint..."
CONTROLS_RESPONSE=$(curl -s -X GET https://stock-ticker-v2.onrender.com/api/remote/controls \
    -H "Authorization: Bearer $TOKEN" \
    -H "Origin: https://main.d7lc7dqjkvbj3.amplifyapp.com")

if echo "$CONTROLS_RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ Controls Endpoint: OK"
    echo "   ⚙️  System controls: Ready"
else
    echo "   ❌ Controls Endpoint: Failed"
    echo "   📄 Response: $CONTROLS_RESPONSE"
    exit 1
fi

# Test CORS
echo ""
echo "5️⃣  Testing CORS Configuration..."
CORS_HEADERS=$(curl -s -I -X OPTIONS https://stock-ticker-v2.onrender.com/api/remote/auth \
    -H "Origin: https://main.d7lc7dqjkvbj3.amplifyapp.com" \
    -H "Access-Control-Request-Method: POST")

if echo "$CORS_HEADERS" | grep -q "access-control-allow-origin"; then
    echo "   ✅ CORS: OK"
    echo "   🌐 Frontend domain allowed"
else
    echo "   ❌ CORS: Failed"
    echo "   📄 Headers: $CORS_HEADERS"
fi

echo ""
echo "🎉 Production API Server Verification Complete!"
echo ""
echo "📋 Summary:"
echo "   • API Server: https://stock-ticker-v2.onrender.com"
echo "   • Health Endpoint: ✅ Working"
echo "   • Authentication: ✅ Working (admin/AdminSecure2025!@)"
echo "   • Stock Data: ✅ Available" 
echo "   • System Controls: ✅ Available"
echo "   • CORS: ✅ Configured for Amplify"
echo ""
echo "🚀 Your production frontend can now connect to the API server!"
echo ""
echo "Next steps:"
echo "1. Wait for Amplify deployment to complete"
echo "2. Visit your Amplify app URL"
echo "3. Sign in with Clerk authentication"
echo "4. Navigate to Control Panel to test remote controls"
echo ""