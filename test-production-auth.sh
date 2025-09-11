#!/bin/bash

# Test Production API Authentication
# Run this script after updating Render environment variables

API_URL="https://stock-ticker-v2.onrender.com"

echo "🔍 Testing Production API Authentication..."
echo "=========================================="
echo ""

echo "Step 1: Testing login endpoint..."
echo "--------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/remote/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  -w "%{http_code}")

HTTP_CODE="${LOGIN_RESPONSE: -3}"
BODY="${LOGIN_RESPONSE%???}"

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ Login successful!"
  
  # Extract token from response
  TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | sed 's/"token":"//g' | sed 's/"//g')
  
  if [ ! -z "$TOKEN" ]; then
    echo ""
    echo "Step 2: Testing token verification..."
    echo "-----------------------------------"
    
    VERIFY_RESPONSE=$(curl -s -X GET $API_URL/api/remote/auth \
      -H "Authorization: Bearer $TOKEN" \
      -w "%{http_code}")
    
    VERIFY_CODE="${VERIFY_RESPONSE: -3}"
    VERIFY_BODY="${VERIFY_RESPONSE%???}"
    
    echo "HTTP Status: $VERIFY_CODE"
    echo "Response: $VERIFY_BODY"
    
    if [ "$VERIFY_CODE" -eq 200 ]; then
      echo "✅ Token verification successful!"
      echo ""
      echo "🎉 AUTHENTICATION FIX CONFIRMED!"
      echo "================================="
      echo "✅ The production API is now working correctly"
      echo "✅ Frontend authentication should now work"
      echo "✅ No more 403 Forbidden errors expected"
      echo ""
      echo "Login credentials:"
      echo "- Username: admin"
      echo "- Password: admin123"
    else
      echo "❌ Token verification failed"
      echo "Check Render environment variables"
    fi
  else
    echo "❌ Could not extract token from response"
  fi
else
  echo "❌ Login failed"
  echo "Common causes:"
  echo "1. Environment variables not set in Render"
  echo "2. Service still deploying (wait 2-3 minutes)"
  echo "3. Wrong credentials (should be admin/admin123)"
fi

echo ""
echo "If the test fails, follow the RENDER_FIX_GUIDE.md instructions"
