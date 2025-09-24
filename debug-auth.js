#!/usr/bin/env node

/**
 * Debug Authentication Script
 * 
 * This script helps debug authentication issues by testing the JWT bridge
 * and API calls with detailed logging.
 */

// Using built-in fetch (Node 18+)
const API_BASE_URL = 'https://stock-ticker-v2.onrender.com';

async function debugAuthentication() {
  console.log('🔍 Authentication Debug Tool');
  console.log('============================\n');

  try {
    // Step 1: Test JWT Bridge Authentication
    console.log('1️⃣  Testing JWT Bridge Authentication...');
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

    console.log(`   Auth Status: ${authResponse.status}`);
    
    if (!authResponse.ok) {
      console.error(`   ❌ Auth failed: ${authResponse.statusText}`);
      return;
    }

    const authData = await authResponse.json();
    console.log(`   ✅ Auth success: ${authData.success}`);
    console.log(`   🔑 Token length: ${authData.token ? authData.token.length : 'N/A'}`);
    console.log(`   📋 Session ID: ${authData.user?.sessionId || 'N/A'}`);

    if (!authData.success || !authData.token) {
      console.error('   ❌ Missing token in auth response');
      return;
    }

    // Step 2: Test API calls with authentication
    const token = authData.token;
    const sessionId = authData.user.sessionId;

    console.log('\n2️⃣  Testing authenticated API calls...');
    
    // Test stocks endpoint
    console.log('   📊 Testing /api/remote/stocks...');
    const stocksResponse = await fetch(`${API_BASE_URL}/api/remote/stocks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Session-ID': sessionId
      }
    });

    console.log(`   Stocks Status: ${stocksResponse.status}`);
    
    if (stocksResponse.ok) {
      const stocksData = await stocksResponse.json();
      console.log(`   ✅ Stocks success: ${stocksData.success}`);
      console.log(`   📈 Stock count: ${stocksData.stocks?.length || 0}`);
    } else {
      console.error(`   ❌ Stocks failed: ${stocksResponse.statusText}`);
      const errorText = await stocksResponse.text();
      console.error(`   Error details: ${errorText}`);
    }

    // Test controls endpoint
    console.log('   ⚙️  Testing /api/remote/controls...');
    const controlsResponse = await fetch(`${API_BASE_URL}/api/remote/controls`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Session-ID': sessionId
      }
    });

    console.log(`   Controls Status: ${controlsResponse.status}`);
    
    if (controlsResponse.ok) {
      const controlsData = await controlsResponse.json();
      console.log(`   ✅ Controls success: ${controlsData.success}`);
      console.log(`   🎛️  Is Paused: ${controlsData.controls?.isPaused}`);
    } else {
      console.error(`   ❌ Controls failed: ${controlsResponse.statusText}`);
      const errorText = await controlsResponse.text();
      console.error(`   Error details: ${errorText}`);
    }

    // Step 3: Test headers that frontend should use
    console.log('\n3️⃣  Frontend should use these headers:');
    console.log(`   Authorization: Bearer ${token.substring(0, 20)}...`);
    console.log(`   X-Session-ID: ${sessionId}`);
    console.log(`   Content-Type: application/json`);

    console.log('\n✅ Authentication debug completed!');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugAuthentication();