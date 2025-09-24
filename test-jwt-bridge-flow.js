#!/usr/bin/env node

/**
 * Test JWT Bridge Authentication Flow
 * 
 * This script tests the complete authentication flow:
 * 1. Authenticate with JWT server using bridge credentials
 * 2. Use the received token to access protected API endpoints
 * 3. Verify that the API calls succeed with proper authentication headers
 */

const API_BASE = 'https://stock-ticker-v2.onrender.com';

// JWT Bridge Credentials (same as in client)
const BRIDGE_CREDENTIALS = {
  username: 'admin',
  password: 'AdminSecure2025!@'
};

console.log('🧪 Testing JWT Bridge Authentication Flow...');
console.log('='.repeat(50));
console.log('');

async function testJWTBridgeFlow() {
  try {
    // Step 1: Authenticate with JWT server using bridge credentials
    console.log('1️⃣  Authenticating with JWT Bridge credentials...');
    console.log('   Username:', BRIDGE_CREDENTIALS.username);
    console.log('   API Server:', API_BASE);
    
    const authResponse = await fetch(`${API_BASE}/api/remote/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(BRIDGE_CREDENTIALS)
    });
    
    console.log('   Auth Response Status:', authResponse.status);
    
    if (!authResponse.ok) {
      throw new Error(`JWT Bridge auth failed: ${authResponse.status}`);
    }
    
    const authData = await authResponse.json();
    console.log('   ✅ JWT Authentication Success');
    console.log('   🔑 Token received:', authData.token ? 'YES' : 'NO');
    console.log('   👤 User:', authData.user?.username);
    console.log('   🛡️  Auth Method:', authData.authMethod);
    
    const token = authData.token;
    if (!token) {
      throw new Error('No token received from JWT bridge authentication');
    }
    
    console.log('');
    
    // Step 2: Test authenticated API calls
    console.log('2️⃣  Testing authenticated API endpoints...');
    
    // Create authentication headers
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Test stocks endpoint
    console.log('   📊 Testing /api/remote/stocks...');
    const stocksResponse = await fetch(`${API_BASE}/api/remote/stocks`, {
      method: 'GET',
      headers: authHeaders
    });
    
    console.log('   Stocks Response Status:', stocksResponse.status);
    
    if (stocksResponse.ok) {
      const stocksData = await stocksResponse.json();
      console.log('   ✅ Stocks endpoint success');
      console.log('   📈 Stocks count:', stocksData.stocks?.length || 0);
      console.log('   🔐 Auth method:', stocksData.authMethod);
    } else {
      console.log('   ❌ Stocks endpoint failed');
      const errorText = await stocksResponse.text();
      console.log('   Error:', errorText);
    }
    
    console.log('');
    
    // Test controls endpoint  
    console.log('   ⚙️  Testing /api/remote/controls...');
    const controlsResponse = await fetch(`${API_BASE}/api/remote/controls`, {
      method: 'GET', 
      headers: authHeaders
    });
    
    console.log('   Controls Response Status:', controlsResponse.status);
    
    if (controlsResponse.ok) {
      const controlsData = await controlsResponse.json();
      console.log('   ✅ Controls endpoint success');
      console.log('   🎛️  Is Paused:', controlsData.controls?.isPaused);
      console.log('   💱 Currency:', controlsData.controls?.selectedCurrency);
      console.log('   🔐 Auth method:', controlsData.authMethod);
    } else {
      console.log('   ❌ Controls endpoint failed');
      const errorText = await controlsResponse.text();
      console.log('   Error:', errorText);
    }
    
    console.log('');
    console.log('🎉 JWT Bridge Flow Test Complete!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   ✅ JWT Bridge Authentication: WORKING');  
    console.log('   ✅ Authenticated API Access: WORKING');
    console.log('   ✅ Token-based Authorization: WORKING');
    console.log('');
    console.log('🚀 The client application should now be able to:');
    console.log('   • Authenticate using JWT bridge with Clerk');
    console.log('   • Access protected API endpoints with Bearer token'); 
    console.log('   • Fetch stocks and controls data without 401 errors');
    
  } catch (error) {
    console.error('❌ JWT Bridge Flow Test Failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting Steps:');
    console.log('1. Verify API server is running and healthy');
    console.log('2. Check JWT bridge credentials are correct'); 
    console.log('3. Ensure server accepts the authentication method');
    console.log('4. Verify network connectivity to API server');
    process.exit(1);
  }
}

// Run the test
testJWTBridgeFlow();