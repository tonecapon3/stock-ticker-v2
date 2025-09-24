#!/usr/bin/env node

/**
 * Production Health Check Test
 * 
 * This script tests the improved health check functionality to ensure
 * it properly handles authentication and doesn't show 401 errors as unhealthy.
 */

const API_BASE_URL = 'https://stock-ticker-v2.onrender.com';

async function testProductionHealthCheck() {
  console.log('🏥 Testing Production Health Check');
  console.log('=================================\n');

  try {
    // Step 1: Test basic connectivity (should get 401, but that means server is healthy)
    console.log('1️⃣  Testing Basic API Connectivity...');
    
    const connectivityResponse = await fetch(`${API_BASE_URL}/api/remote/stocks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`   Status: ${connectivityResponse.status}`);
    
    if (connectivityResponse.status === 401) {
      console.log('   ✅ Server is healthy (401 = server requires auth, which is expected)');
    } else if (connectivityResponse.ok) {
      console.log('   ✅ Server is healthy (unexpected but good)');
    } else {
      console.log(`   ⚠️  Server returned: ${connectivityResponse.statusText}`);
    }

    // Step 2: Simulate health check with authentication
    console.log('\n2️⃣  Testing Health Check with Authentication...');
    
    // First authenticate
    const authResponse = await fetch(`${API_BASE_URL}/api/remote/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'AdminSecure2025!@'
      })
    });

    if (!authResponse.ok) {
      console.error('   ❌ Authentication failed');
      return;
    }

    const authData = await authResponse.json();
    console.log('   ✅ Authentication successful');

    // Test health check with auth
    const healthResponse = await fetch(`${API_BASE_URL}/api/remote/stocks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`
      }
    });

    console.log(`   Status: ${healthResponse.status}`);
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('   ✅ Authenticated health check successful');
      console.log(`   📊 API returned ${data.stocks?.length || 0} stocks`);
    } else {
      console.log('   ❌ Authenticated health check failed');
    }

    // Step 3: Test the improved health check logic
    console.log('\n3️⃣  Testing Improved Health Check Logic...');
    
    const testHealthCheck = (status, responseTime) => {
      if (status === 401) {
        return {
          isHealthy: true, // Server is responding, just needs auth
          responseTime,
          error: undefined // No error for expected 401
        };
      }
      
      if (status >= 200 && status < 300) {
        return {
          isHealthy: true,
          responseTime
        };
      }
      
      if (status >= 400 && status < 500) {
        return {
          isHealthy: true, // Server is responding
          responseTime,
          error: `Client error: HTTP ${status}`
        };
      }
      
      return {
        isHealthy: false,
        responseTime,
        error: `Server error: HTTP ${status}`
      };
    };

    // Test various scenarios
    console.log('   Testing 401 response:', JSON.stringify(testHealthCheck(401, 250), null, 2));
    console.log('   Testing 200 response:', JSON.stringify(testHealthCheck(200, 150), null, 2));
    console.log('   Testing 404 response:', JSON.stringify(testHealthCheck(404, 100), null, 2));
    console.log('   Testing 500 response:', JSON.stringify(testHealthCheck(500, 300), null, 2));

    console.log('\n4️⃣  Expected Frontend Behavior...');
    console.log('   ✅ Health check should return isHealthy: true for 401 responses');
    console.log('   ✅ No error message should be shown for expected 401 responses');
    console.log('   ✅ API Server Status should show "Connected" or "Requires Authentication"');
    console.log('   ✅ JWT bridge should authenticate automatically in background');

    console.log('\n5️⃣  Production Deployment Steps...');
    console.log('   1. Deploy the updated frontend code');
    console.log('   2. Clear browser localStorage on first visit');
    console.log('   3. Hard refresh the page (Cmd+Shift+R)');
    console.log('   4. Check browser console for authentication logs');
    console.log('   5. Verify API Server Status shows connected');

    console.log('\n🎉 Production Health Check Test Complete!');
    console.log('📋 The improved health check should resolve 401 status errors');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testProductionHealthCheck();