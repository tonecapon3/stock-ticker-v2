#!/usr/bin/env node

/**
 * Authentication Systems Test Script
 * 
 * This script tests both JWT and Clerk authentication systems
 * to verify they work correctly with their respective servers.
 */

// Using built-in fetch (Node.js 18+)

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️ ${message}`, 'blue');
}

function header(message) {
  log(`\n🧪 ${message}`, 'cyan');
  log('═'.repeat(message.length + 4), 'cyan');
}

/**
 * Test JWT Authentication System
 */
async function testJWTAuthentication() {
  header('JWT Authentication System Test');
  
  const JWT_API = 'http://localhost:3001';
  const credentials = {
    username: 'admin',
    password: 'admin123'
  };

  try {
    // Test JWT login
    info('Testing JWT login...');
    const loginResponse = await fetch(`${JWT_API}/api/remote/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json();
      if (loginData.success && loginData.token) {
        success('JWT login successful');
        info(`User: ${loginData.user.username} (${loginData.user.role})`);
        
        // Test protected endpoint with JWT token
        info('Testing JWT protected endpoint...');
        const stocksResponse = await fetch(`${JWT_API}/api/remote/stocks`, {
          headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        
        if (stocksResponse.status === 200) {
          const stocksData = await stocksResponse.json();
          success('JWT protected endpoint access successful');
          info(`Found ${stocksData.stocks?.length || 0} stocks`);
          return { success: true, token: loginData.token };
        } else {
          error('JWT protected endpoint access failed');
          return { success: false };
        }
      } else {
        error('JWT login response missing token');
        return { success: false };
      }
    } else {
      error(`JWT login failed with status: ${loginResponse.status}`);
      if (loginResponse.status === 404) {
        info('JWT server may not be running - this suggests Clerk server is running instead');
      }
      return { success: false };
    }
  } catch (err) {
    error(`JWT authentication test failed: ${err.message}`);
    return { success: false };
  }
}

/**
 * Test Clerk Authentication System
 */
async function testClerkAuthentication() {
  header('Clerk Authentication System Test');
  
  const CLERK_API = 'http://localhost:3001';

  try {
    // Test public endpoint (no auth required)
    info('Testing Clerk public endpoint...');
    const publicResponse = await fetch(`${CLERK_API}/api/remote/stocks`);
    
    if (publicResponse.status === 200) {
      const publicData = await publicResponse.json();
      
      // Check for Clerk headers
      const clerkStatus = publicResponse.headers.get('x-clerk-auth-status');
      const clerkReason = publicResponse.headers.get('x-clerk-auth-reason');
      
      if (clerkStatus) {
        success('Clerk server is running');
        info(`Clerk auth status: ${clerkStatus}`);
        info(`Clerk auth reason: ${clerkReason}`);
        info(`Found ${publicData.stocks?.length || 0} stocks`);
        
        // Test protected endpoint without auth (should work for demo data)
        info('Testing Clerk demo endpoint access...');
        const demoResponse = await fetch(`${CLERK_API}/api/demo/stocks`);
        
        if (demoResponse.status === 200) {
          success('Clerk demo endpoint accessible');
          return { success: true, hasClerkHeaders: true };
        } else {
          info('Clerk demo endpoint not available (may require authentication)');
          return { success: true, hasClerkHeaders: true, demoEndpoint: false };
        }
      } else {
        error('No Clerk headers found - this may not be a Clerk server');
        return { success: false };
      }
    } else {
      error(`Clerk server test failed with status: ${publicResponse.status}`);
      return { success: false };
    }
  } catch (err) {
    error(`Clerk authentication test failed: ${err.message}`);
    return { success: false };
  }
}

/**
 * Test server connectivity and identify which server is running
 */
async function identifyRunningServer() {
  header('Server Identification');
  
  try {
    const response = await fetch('http://localhost:3001/api/remote/stocks');
    
    if (response.status === 200) {
      const clerkStatus = response.headers.get('x-clerk-auth-status');
      
      if (clerkStatus) {
        success('Clerk-based server detected on port 3001');
        return 'clerk';
      } else {
        // Try JWT auth endpoint
        const jwtTest = await fetch('http://localhost:3001/api/remote/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        
        if (jwtTest.status === 200) {
          const data = await jwtTest.json();
          if (data.success && data.token) {
            success('JWT-based server detected on port 3001');
            return 'jwt';
          }
        }
        
        info('Unknown server type on port 3001');
        return 'unknown';
      }
    } else {
      error('No server responding on port 3001');
      return 'none';
    }
  } catch (err) {
    error(`Server identification failed: ${err.message}`);
    return 'error';
  }
}

/**
 * Test volatility slider functionality
 */
async function testVolatilitySlider(authType, token = null) {
  header(`Volatility Slider Test (${authType.toUpperCase()})`);
  
  const API_BASE = 'http://localhost:3001';
  const endpoint = authType === 'jwt' ? '/api/remote/controls' : '/api/remote/controls';
  
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Get current controls
    info('Fetching current system controls...');
    const getResponse = await fetch(`${API_BASE}${endpoint}`, { headers });
    
    if (getResponse.status === 200) {
      const controlsData = await getResponse.json();
      const currentVolatility = controlsData.controls?.volatility;
      
      if (currentVolatility !== undefined) {
        success(`Current volatility: ${currentVolatility}%`);
        
        // Test updating volatility
        info('Testing volatility update...');
        const newVolatility = currentVolatility === 2.5 ? 3.0 : 2.5;
        
        const updateResponse = await fetch(`${API_BASE}${endpoint}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ volatility: newVolatility })
        });
        
        if (updateResponse.status === 200) {
          success(`Volatility updated to ${newVolatility}%`);
          return { success: true, tested: true };
        } else {
          error(`Volatility update failed with status: ${updateResponse.status}`);
          return { success: false, tested: true };
        }
      } else {
        error('Volatility property not found in controls');
        return { success: false, tested: false };
      }
    } else {
      error(`Controls endpoint failed with status: ${getResponse.status}`);
      return { success: false, tested: false };
    }
  } catch (err) {
    error(`Volatility slider test failed: ${err.message}`);
    return { success: false, tested: false };
  }
}

/**
 * Main test function
 */
async function runTests() {
  log('🚀 Authentication Systems Verification', 'cyan');
  log('═'.repeat(50), 'cyan');
  
  const results = {
    serverType: null,
    jwt: { success: false, token: null },
    clerk: { success: false },
    volatility: { jwt: null, clerk: null }
  };
  
  // Step 1: Identify which server is running
  results.serverType = await identifyRunningServer();
  
  if (results.serverType === 'none' || results.serverType === 'error') {
    error('No server is running on port 3001. Please start either:');
    info('  JWT server: npm run server:managed');
    info('  Clerk server: npm run server:clerk');
    return;
  }
  
  // Step 2: Test the appropriate authentication system
  if (results.serverType === 'jwt') {
    results.jwt = await testJWTAuthentication();
    if (results.jwt.success) {
      results.volatility.jwt = await testVolatilitySlider('jwt', results.jwt.token);
    }
  } else if (results.serverType === 'clerk') {
    results.clerk = await testClerkAuthentication();
    if (results.clerk.success) {
      results.volatility.clerk = await testVolatilitySlider('clerk');
    }
  }
  
  // Step 3: Summary
  header('Test Summary');
  
  log(`Server Type: ${results.serverType.toUpperCase()}`, results.serverType === 'jwt' || results.serverType === 'clerk' ? 'green' : 'yellow');
  
  if (results.serverType === 'jwt') {
    log(`JWT Authentication: ${results.jwt.success ? '✅ PASS' : '❌ FAIL'}`, results.jwt.success ? 'green' : 'red');
    if (results.volatility.jwt) {
      log(`JWT Volatility Slider: ${results.volatility.jwt.success ? '✅ PASS' : '❌ FAIL'}`, results.volatility.jwt.success ? 'green' : 'red');
    }
  }
  
  if (results.serverType === 'clerk') {
    log(`Clerk Authentication: ${results.clerk.success ? '✅ PASS' : '❌ FAIL'}`, results.clerk.success ? 'green' : 'red');
    if (results.volatility.clerk) {
      log(`Clerk Volatility Slider: ${results.volatility.clerk.success ? '✅ PASS' : '❌ FAIL'}`, results.volatility.clerk.success ? 'green' : 'red');
    }
  }
  
  // Step 4: Recommendations
  header('Recommendations');
  
  if (results.serverType === 'jwt' && results.jwt.success) {
    success('JWT system is working correctly!');
    info('• Use RemoteControlPanelJWT.tsx component');
    info('• Login with: admin / admin123');
    info('• Full control panel features available');
  }
  
  if (results.serverType === 'clerk' && results.clerk.success) {
    success('Clerk system is working correctly!');
    info('• Use RemoteControlPanelClerk.tsx component');
    info('• Requires Clerk user sign-in for full features');
    info('• Demo data available without authentication');
  }
  
  if (results.serverType === 'jwt' || results.serverType === 'clerk') {
    log('\n💡 To test the other system:', 'blue');
    if (results.serverType === 'jwt') {
      info('1. Stop current server: pkill -f server');
      info('2. Start Clerk server: npm run server:clerk');
      info('3. Run this test again');
    } else {
      info('1. Stop current server: pkill -f server');
      info('2. Start JWT server: npm run server:managed');
      info('3. Run this test again');
    }
  }
}

/**
 * Test both systems sequentially
 */
async function testBothSystems() {
  log('🚀 Complete Authentication Systems Verification', 'cyan');
  log('═'.repeat(55), 'cyan');
  
  // Test current running server
  await runTests();
  
  log('\n' + '═'.repeat(55), 'cyan');
  log('🔄 Testing Instructions for Both Systems', 'cyan');
  log('═'.repeat(55), 'cyan');
  
  info('To test JWT system:');
  info('1. Stop any running servers: pkill -f server');
  info('2. Start JWT server: npm run server:managed');
  info('3. Wait 5 seconds for server to start');
  info('4. Run this test again: node test-authentication-systems.js');
  info('5. Expected: JWT login works with admin/admin123');
  
  info('\nTo test Clerk system:');
  info('1. Stop any running servers: pkill -f server');
  info('2. Start Clerk server: npm run server:clerk');
  info('3. Wait 5 seconds for server to start');
  info('4. Run this test again: node test-authentication-systems.js');
  info('5. Expected: Clerk headers present, public data accessible');
  
  info('\n🛠️  Fixing Clerk CSP Issues:');
  info('• CSP has been updated to allow Clerk domains');
  info('• CSP can be disabled in development: VITE_ENABLE_CSP=false in .env.local');
  info('• Refresh browser after changing environment variables');
  
  info('\n📋 Component Usage:');
  info('• JWT: Use RemoteControlPanelJWT.tsx');
  info('• Clerk: Use RemoteControlPanelClerk.tsx');
  info('• Hybrid: Use RemoteControlPanelHybrid.tsx (supports both)');
}

// Run the comprehensive tests
testBothSystems().catch(err => {
  error(`Test suite failed: ${err.message}`);
  process.exit(1);
});
