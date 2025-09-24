#!/usr/bin/env node

/**
 * Production Authentication Test
 * 
 * This script tests the current production authentication flow 
 * to diagnose why 401 errors are still occurring.
 */

const API_BASE_URL = 'https://stock-ticker-v2.onrender.com';

async function testProductionAuth() {
  console.log('🔍 Testing Production Authentication');
  console.log('=====================================\n');

  try {
    // Step 1: Test the JWT bridge authentication endpoint
    console.log('1️⃣  Testing JWT Bridge Authentication...');
    
    const authResponse = await fetch(`${API_BASE_URL}/api/remote/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Production-Test/1.0'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'AdminSecure2025!@'
      })
    });

    console.log(`   Status: ${authResponse.status}`);
    console.log(`   Headers:`, Object.fromEntries(authResponse.headers.entries()));

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error(`   ❌ Auth failed: ${authResponse.statusText}`);
      console.error(`   Error body: ${errorText}`);
      return;
    }

    const authData = await authResponse.json();
    console.log(`   ✅ Auth successful: ${authData.success}`);
    console.log(`   🔑 Token present: ${!!authData.token}`);
    console.log(`   👤 User info:`, authData.user);
    console.log(`   🛡️  Auth method: ${authData.authMethod}`);
    console.log(`   📋 Session ID in response: ${authData.user?.sessionId || 'NOT PROVIDED'}`);

    if (!authData.token) {
      console.error('   ❌ No token received!');
      return;
    }

    // Step 2: Test API endpoints with the token
    const token = authData.token;
    
    console.log('\n2️⃣  Testing API endpoints with token...');
    
    // Test both endpoints that are failing in production
    const endpoints = [
      { name: 'Stocks', path: '/api/remote/stocks' },
      { name: 'Controls', path: '/api/remote/controls' }
    ];

    for (const endpoint of endpoints) {
      console.log(`\n   🧪 Testing ${endpoint.name} (${endpoint.path})`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint.path}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Production-Test/1.0'
        }
      });

      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ ${endpoint.name} success: ${data.success}`);
        if (endpoint.name === 'Stocks') {
          console.log(`   📈 Stock count: ${data.stocks?.length || 0}`);
        } else if (endpoint.name === 'Controls') {
          console.log(`   🎛️  Is paused: ${data.controls?.isPaused}`);
        }
      } else {
        const errorText = await response.text();
        console.error(`   ❌ ${endpoint.name} failed: ${response.statusText}`);
        console.error(`   Error: ${errorText}`);
      }
    }

    console.log('\n3️⃣  Headers that should work in production:');
    console.log(`   Authorization: Bearer ${token.substring(0, 30)}...`);
    console.log(`   Content-Type: application/json`);
    
    console.log('\n✅ Production authentication test completed!');

  } catch (error) {
    console.error('\n❌ Production test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testProductionAuth();