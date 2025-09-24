#!/usr/bin/env node

/**
 * Test Frontend Authentication Flow
 * 
 * This script simulates what your frontend should do:
 * 1. Authenticate with JWT bridge
 * 2. Get authentication token
 * 3. Make authenticated API calls
 */

const API_BASE_URL = 'https://stock-ticker-v2.onrender.com';

async function testFrontendAuthFlow() {
  console.log('🧪 Testing Frontend Authentication Flow');
  console.log('=====================================\n');

  try {
    // Step 1: Authenticate to get JWT token (same as your debug script)
    console.log('1️⃣  Authenticating with JWT bridge...');
    const authResponse = await fetch(`${API_BASE_URL}/api/remote/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'AdminSecure2025!@'
      })
    });

    if (!authResponse.ok) {
      console.error(`❌ Authentication failed: ${authResponse.status}`);
      return;
    }

    const authData = await authResponse.json();
    console.log(`✅ Authentication successful`);
    console.log(`🔑 Token received: ${authData.token ? 'Yes' : 'No'}`);

    if (!authData.token) {
      console.error('❌ No token in authentication response');
      return;
    }

    // Step 2: Store token (this is what your frontend should do)
    const token = authData.token;
    const sessionId = authData.user?.sessionId;
    
    console.log(`\n2️⃣  Token stored for frontend use`);
    console.log(`    Token length: ${token.length} characters`);
    console.log(`    Session ID: ${sessionId || 'N/A'}`);

    // Step 3: Make authenticated API calls (this is what's failing in your frontend)
    console.log('\n3️⃣  Making authenticated API calls...');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }

    // Test stocks endpoint
    console.log('    📊 Testing /api/remote/stocks...');
    const stocksResponse = await fetch(`${API_BASE_URL}/api/remote/stocks`, {
      method: 'GET',
      headers: headers
    });

    console.log(`       Status: ${stocksResponse.status}`);
    
    if (stocksResponse.ok) {
      const stocksData = await stocksResponse.json();
      console.log(`       ✅ Success! Found ${stocksData.stocks?.length || 0} stocks`);
    } else {
      console.error(`       ❌ Failed: ${stocksResponse.statusText}`);
      const errorText = await stocksResponse.text();
      console.error(`       Error: ${errorText}`);
    }

    // Step 4: Show what frontend needs to do
    console.log('\n4️⃣  Frontend Implementation Requirements:');
    console.log('    ✓ Store JWT token in frontend state/localStorage');
    console.log('    ✓ Include Authorization header in ALL API calls');
    console.log('    ✓ Include X-Session-ID header if available');
    console.log('    ✓ Refresh token when it expires');

    console.log('\n✅ Frontend authentication flow test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFrontendAuthFlow();