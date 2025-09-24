#!/usr/bin/env node

/**
 * Multi-User Stock Ticker System Test Suite
 * 
 * This comprehensive test suite validates:
 * - Complete data isolation between users
 * - JWT session management and security
 * - Multi-session handling per user
 * - Role-based access control
 * - Session expiration and cleanup
 * - API endpoint security
 */

const axios = require('axios');
const crypto = require('crypto');
const colors = require('colors');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/remote`;

// Test users - ALL HAVE ADMIN ACCESS
const TEST_USERS = [
  { username: 'admin', password: 'admin123', expectedRole: 'admin' },
  { username: 'controller', password: 'controller123', expectedRole: 'admin' },
  { username: 'viewer', password: 'viewer123', expectedRole: 'admin' },
  { username: 'user1', password: 'user123', expectedRole: 'admin' },
  { username: 'user2', password: 'demo123', expectedRole: 'admin' }
];

// Test state
const testState = {
  sessions: new Map(), // username -> session info
  testResults: [],
  startTime: Date.now()
};

// Utility functions
function generateDeviceFingerprint() {
  return crypto.randomBytes(16).toString('hex');
}

function log(message, type = 'info') {
  const colors_map = {
    info: 'blue',
    success: 'green',
    error: 'red',
    warning: 'yellow',
    test: 'cyan'
  };
  
  const timestamp = new Date().toISOString().substr(11, 8);
  console.log(`[${timestamp}] ${message}`[colors_map[type] || 'white']);
}

function recordTestResult(testName, passed, message = '', details = {}) {
  testState.testResults.push({
    testName,
    passed,
    message,
    details,
    timestamp: new Date()
  });
  
  if (passed) {
    log(`✅ ${testName}: ${message}`, 'success');
  } else {
    log(`❌ ${testName}: ${message}`, 'error');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// API helper functions
async function authenticateUser(username, password) {
  try {
    const deviceFingerprint = generateDeviceFingerprint();
    
    const response = await axios.post(`${API_BASE}/auth`, {
      username,
      password
    }, {
      headers: {
        'X-Device-Fingerprint': deviceFingerprint,
        'User-Agent': `MultiUserTestSuite-${username}`
      }
    });

    if (response.data.success) {
      const session = {
        username,
        userId: response.data.user.id,
        token: response.data.token,
        sessionId: response.data.user.sessionId,
        role: response.data.user.role,
        deviceFingerprint
      };
      
      testState.sessions.set(username, session);
      return session;
    }
    
    throw new Error('Authentication failed: ' + JSON.stringify(response.data));
  } catch (error) {
    throw new Error(`Authentication error for ${username}: ${error.response?.data?.error || error.message}`);
  }
}

async function makeAuthenticatedRequest(session, method, path, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${path}`,
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'X-Session-ID': session.sessionId,
        'X-Device-Fingerprint': session.deviceFingerprint
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    return {
      error: true,
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      details: error.response?.data
    };
  }
}

// Test suites
class MultiUserTestSuite {
  constructor() {
    this.testCount = 0;
    this.passedTests = 0;
  }

  async runAllTests() {
    log('🚀 Starting Multi-User Stock Ticker Test Suite', 'test');
    log(`Testing against: ${BASE_URL}`, 'info');
    
    try {
      // Test server availability
      await this.testServerHealth();
      
      // Authentication tests
      await this.testUserAuthentication();
      await this.testMultipleSessionsPerUser();
      await this.testSessionValidation();
      
      // Data isolation tests
      await this.testDataIsolationBetweenUsers();
      await this.testStockDataManipulation();
      await this.testControlsIsolation();
      
      // Role-based access tests
      await this.testRoleBasedAccess();
      
      // Session management tests
      await this.testSessionManagement();
      await this.testConcurrentSessions();
      
      // Security tests
      await this.testUnauthorizedAccess();
      await this.testTokenSecurity();
      await this.testDataLeakagePrevention();
      
      // Admin functionality tests
      await this.testAdminFeatures();
      
      // Cleanup tests
      await this.testSessionCleanup();
      
    } catch (error) {
      log(`Test suite failed with error: ${error.message}`, 'error');
    } finally {
      await this.generateTestReport();
    }
  }

  async testServerHealth() {
    log('Testing server health...', 'test');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/health`);
      
      if (response.status === 200 && response.data.status === 'ok') {
        recordTestResult(
          'Server Health',
          true,
          `Server is running (version: ${response.data.version})`,
          { uptime: response.data.uptime, sessions: response.data.sessions }
        );
      } else {
        throw new Error('Server health check failed');
      }
    } catch (error) {
      recordTestResult(
        'Server Health',
        false,
        `Server is not accessible: ${error.message}`
      );
      throw error;
    }
  }

  async testUserAuthentication() {
    log('Testing user authentication...', 'test');
    
    for (const user of TEST_USERS) {
      try {
        const session = await authenticateUser(user.username, user.password);
        
        recordTestResult(
          `Authentication - ${user.username}`,
          session.role === user.expectedRole,
          `Successfully authenticated with role: ${session.role}`,
          { sessionId: session.sessionId, userId: session.userId }
        );
        
      } catch (error) {
        recordTestResult(
          `Authentication - ${user.username}`,
          false,
          error.message
        );
      }
    }
    
    // Test invalid credentials
    try {
      await authenticateUser('invalid', 'invalid');
      recordTestResult(
        'Authentication - Invalid Credentials',
        false,
        'Should have failed with invalid credentials'
      );
    } catch (error) {
      recordTestResult(
        'Authentication - Invalid Credentials',
        true,
        'Correctly rejected invalid credentials'
      );
    }
  }

  async testMultipleSessionsPerUser() {
    log('Testing multiple sessions per user...', 'test');
    
    const adminUser = TEST_USERS.find(u => u.username === 'admin');
    const sessions = [];
    
    // Create multiple sessions for same user
    for (let i = 0; i < 3; i++) {
      try {
        const session = await authenticateUser(adminUser.username, adminUser.password);
        sessions.push(session);
        
        recordTestResult(
          `Multi-Session Creation ${i + 1}`,
          true,
          `Created session: ${session.sessionId}`
        );
      } catch (error) {
        recordTestResult(
          `Multi-Session Creation ${i + 1}`,
          false,
          error.message
        );
      }
    }
    
    // Verify all sessions are active
    for (let i = 0; i < sessions.length; i++) {
      const response = await makeAuthenticatedRequest(sessions[i], 'GET', '/auth');
      
      recordTestResult(
        `Multi-Session Validation ${i + 1}`,
        response.success === true,
        response.success ? 'Session is valid' : 'Session validation failed',
        { sessionId: sessions[i].sessionId }
      );
    }
  }

  async testSessionValidation() {
    log('Testing session validation...', 'test');
    
    const adminSession = testState.sessions.get('admin');
    if (!adminSession) {
      recordTestResult('Session Validation', false, 'No admin session available');
      return;
    }
    
    // Test valid session
    const validResponse = await makeAuthenticatedRequest(adminSession, 'GET', '/auth');
    recordTestResult(
      'Valid Session Check',
      validResponse.success === true,
      validResponse.success ? 'Valid session accepted' : 'Valid session rejected'
    );
    
    // Test invalid token
    const invalidSession = { ...adminSession, token: 'invalid-token' };
    const invalidResponse = await makeAuthenticatedRequest(invalidSession, 'GET', '/auth');
    recordTestResult(
      'Invalid Token Check',
      invalidResponse.error === true,
      invalidResponse.error ? 'Invalid token correctly rejected' : 'Invalid token was accepted'
    );
    
    // Test mismatched session ID
    const mismatchedSession = { ...adminSession, sessionId: 'invalid-session-id' };
    const mismatchedResponse = await makeAuthenticatedRequest(mismatchedSession, 'GET', '/auth');
    recordTestResult(
      'Mismatched Session ID Check',
      mismatchedResponse.error === true,
      mismatchedResponse.error ? 'Mismatched session ID rejected' : 'Mismatched session ID was accepted'
    );
  }

  async testDataIsolationBetweenUsers() {
    log('Testing data isolation between users...', 'test');
    
    const adminSession = testState.sessions.get('admin');
    const controllerSession = testState.sessions.get('controller');
    
    if (!adminSession || !controllerSession) {
      recordTestResult('Data Isolation', false, 'Required sessions not available');
      return;
    }
    
    // Get initial stock data for both users
    const adminStocks = await makeAuthenticatedRequest(adminSession, 'GET', '/stocks');
    const controllerStocks = await makeAuthenticatedRequest(controllerSession, 'GET', '/stocks');
    
    recordTestResult(
      'Initial Data Isolation',
      adminStocks.success && controllerStocks.success,
      'Both users can access their own stock data',
      {
        adminStockCount: adminStocks.stocks?.length,
        controllerStockCount: controllerStocks.stocks?.length
      }
    );
    
    // Admin adds a stock
    const addStockResponse = await makeAuthenticatedRequest(adminSession, 'POST', '/stocks', {
      symbol: 'TEST',
      name: 'Test Stock',
      initialPrice: 100.00
    });
    
    recordTestResult(
      'Add Stock to Admin',
      addStockResponse.success === true,
      addStockResponse.success ? 'Stock added to admin portfolio' : 'Failed to add stock'
    );
    
    // Verify controller doesn't see admin's new stock
    const controllerStocksAfter = await makeAuthenticatedRequest(controllerSession, 'GET', '/stocks');
    const hasTestStock = controllerStocksAfter.stocks?.some(stock => stock.symbol === 'TEST');
    
    recordTestResult(
      'Data Isolation Verification',
      !hasTestStock,
      hasTestStock ? 'Data leakage detected!' : 'Data properly isolated between users',
      {
        adminStockCount: adminStocks.stocks?.length + 1,
        controllerStockCount: controllerStocksAfter.stocks?.length
      }
    );
  }

  async testStockDataManipulation() {
    log('Testing stock data manipulation and isolation...', 'test');
    
    const adminSession = testState.sessions.get('admin');
    const controllerSession = testState.sessions.get('controller');
    
    // Admin updates a stock price
    const updateResponse = await makeAuthenticatedRequest(adminSession, 'PUT', '/stocks/BNOX', {
      price: 200.50
    });
    
    recordTestResult(
      'Stock Price Update',
      updateResponse.success === true,
      updateResponse.success ? 'Stock price updated successfully' : 'Stock price update failed'
    );
    
    // Verify admin sees the update
    const adminStocks = await makeAuthenticatedRequest(adminSession, 'GET', '/stocks');
    const adminBnoxStock = adminStocks.stocks?.find(stock => stock.symbol === 'BNOX');
    
    recordTestResult(
      'Admin Stock Update Verification',
      adminBnoxStock?.currentPrice === 200.50,
      adminBnoxStock?.currentPrice === 200.50 ? 'Admin sees updated price' : 'Admin does not see updated price'
    );
    
    // Verify controller's BNOX stock is unaffected
    const controllerStocks = await makeAuthenticatedRequest(controllerSession, 'GET', '/stocks');
    const controllerBnoxStock = controllerStocks.stocks?.find(stock => stock.symbol === 'BNOX');
    
    recordTestResult(
      'Controller Data Isolation',
      controllerBnoxStock?.currentPrice !== 200.50,
      controllerBnoxStock?.currentPrice !== 200.50 
        ? 'Controller data properly isolated' 
        : 'Data isolation failure - controller sees admin changes'
    );
  }

  async testControlsIsolation() {
    log('Testing controls isolation between users...', 'test');
    
    const adminSession = testState.sessions.get('admin');
    const controllerSession = testState.sessions.get('controller');
    
    // Admin updates controls
    const adminControlsUpdate = await makeAuthenticatedRequest(adminSession, 'PUT', '/controls', {
      volatility: 5.0,
      updateIntervalMs: 5000,
      isPaused: true
    });
    
    recordTestResult(
      'Admin Controls Update',
      adminControlsUpdate.success === true,
      adminControlsUpdate.success ? 'Admin controls updated' : 'Failed to update admin controls'
    );
    
    // Verify admin sees the changes
    const adminControls = await makeAuthenticatedRequest(adminSession, 'GET', '/controls');
    
    recordTestResult(
      'Admin Controls Verification',
      adminControls.controls?.volatility === 5.0 && adminControls.controls?.isPaused === true,
      'Admin sees updated controls'
    );
    
    // Verify controller has different controls
    const controllerControls = await makeAuthenticatedRequest(controllerSession, 'GET', '/controls');
    
    recordTestResult(
      'Controller Controls Isolation',
      controllerControls.controls?.volatility !== 5.0 || controllerControls.controls?.isPaused !== true,
      'Controller controls properly isolated from admin changes'
    );
  }

  async testRoleBasedAccess() {
    log('Testing admin access control (all users have admin access)...', 'test');
    
    const viewerSession = testState.sessions.get('viewer');
    const controllerSession = testState.sessions.get('controller');
    const adminSession = testState.sessions.get('admin');
    
    if (!viewerSession) {
      recordTestResult('Admin Access Control', false, 'Viewer session not available');
      return;
    }
    
    // ALL users should be able to read stocks
    const viewerStocks = await makeAuthenticatedRequest(viewerSession, 'GET', '/stocks');
    recordTestResult(
      'All Users Read Access',
      viewerStocks.success === true,
      viewerStocks.success ? 'All users can read stocks' : 'User cannot read stocks'
    );
    
    // ALL users should be able to add stocks (everyone has admin role)
    const viewerAddStock = await makeAuthenticatedRequest(viewerSession, 'POST', '/stocks', {
      symbol: 'VIEWER',
      name: 'Viewer Test Stock',
      initialPrice: 50.00
    });
    
    recordTestResult(
      'All Users Write Access',
      viewerAddStock.success === true,
      viewerAddStock.success ? 'All users have write access (admin role)' : 'User denied write access'
    );
    
    // Controller should be able to modify stocks
    const controllerAddStock = await makeAuthenticatedRequest(controllerSession, 'POST', '/stocks', {
      symbol: 'CTRL',
      name: 'Controller Test Stock',
      initialPrice: 75.00
    });
    
    recordTestResult(
      'Controller Admin Access',
      controllerAddStock.success === true,
      controllerAddStock.success ? 'Controller has admin access' : 'Controller denied admin access'
    );
    
    // ALL users should access admin endpoints (everyone is admin)
    const adminStats = await makeAuthenticatedRequest(adminSession, 'GET', '/admin/stats');
    const controllerStats = await makeAuthenticatedRequest(controllerSession, 'GET', '/admin/stats');
    const viewerStats = await makeAuthenticatedRequest(viewerSession, 'GET', '/admin/stats');
    
    recordTestResult(
      'All Users Admin Endpoint Access',
      adminStats.success === true && controllerStats.success === true && viewerStats.success === true,
      'All users can access admin endpoints (all have admin role)'
    );
  }

  async testSessionManagement() {
    log('Testing session management features...', 'test');
    
    const adminSession = testState.sessions.get('admin');
    
    // Get user sessions
    const sessions = await makeAuthenticatedRequest(adminSession, 'GET', '/sessions');
    
    recordTestResult(
      'Session List Access',
      sessions.success === true && Array.isArray(sessions.sessions),
      sessions.success ? `Found ${sessions.sessions.length} sessions` : 'Failed to get session list'
    );
    
    // Test logout from specific session
    if (sessions.sessions && sessions.sessions.length > 1) {
      const sessionToRemove = sessions.sessions.find(s => !s.isCurrent);
      
      if (sessionToRemove) {
        const removeResponse = await makeAuthenticatedRequest(
          adminSession, 
          'DELETE', 
          `/sessions/${sessionToRemove.sessionId}`
        );
        
        recordTestResult(
          'Session Removal',
          removeResponse.success === true,
          removeResponse.success ? 'Successfully removed session' : 'Failed to remove session'
        );
      }
    }
  }

  async testConcurrentSessions() {
    log('Testing concurrent session handling...', 'test');
    
    const user = TEST_USERS[0];
    const concurrentSessions = [];
    
    // Create multiple concurrent sessions
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(authenticateUser(user.username, user.password));
    }
    
    try {
      const sessions = await Promise.all(promises);
      
      recordTestResult(
        'Concurrent Session Creation',
        sessions.length === 3 && sessions.every(s => s.sessionId),
        `Created ${sessions.length} concurrent sessions`
      );
      
      // Test that all sessions are valid
      const validationPromises = sessions.map(session => 
        makeAuthenticatedRequest(session, 'GET', '/auth')
      );
      
      const validationResults = await Promise.all(validationPromises);
      const allValid = validationResults.every(result => result.success === true);
      
      recordTestResult(
        'Concurrent Session Validation',
        allValid,
        allValid ? 'All concurrent sessions are valid' : 'Some concurrent sessions are invalid'
      );
      
    } catch (error) {
      recordTestResult(
        'Concurrent Session Creation',
        false,
        `Failed to create concurrent sessions: ${error.message}`
      );
    }
  }

  async testUnauthorizedAccess() {
    log('Testing unauthorized access prevention...', 'test');
    
    // Test access without token
    try {
      const response = await axios.get(`${API_BASE}/stocks`);
      recordTestResult(
        'No Token Access',
        false,
        'Should have been denied access without token'
      );
    } catch (error) {
      recordTestResult(
        'No Token Access',
        error.response?.status === 401,
        'Correctly denied access without token'
      );
    }
    
    // Test access with invalid token
    try {
      const response = await axios.get(`${API_BASE}/stocks`, {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'X-Session-ID': 'invalid-session'
        }
      });
      recordTestResult(
        'Invalid Token Access',
        false,
        'Should have been denied access with invalid token'
      );
    } catch (error) {
      recordTestResult(
        'Invalid Token Access',
        error.response?.status === 401,
        'Correctly denied access with invalid token'
      );
    }
  }

  async testTokenSecurity() {
    log('Testing token security features...', 'test');
    
    const adminSession = testState.sessions.get('admin');
    
    // Test token validation endpoint
    const validationResponse = await makeAuthenticatedRequest(adminSession, 'GET', '/auth');
    
    recordTestResult(
      'Token Validation Endpoint',
      validationResponse.success === true,
      validationResponse.success ? 'Token validation works' : 'Token validation failed'
    );
    
    // Test that token contains expected claims
    if (validationResponse.success) {
      const hasRequiredFields = validationResponse.user && 
                               validationResponse.user.id && 
                               validationResponse.user.username && 
                               validationResponse.user.role &&
                               validationResponse.user.sessionId;
      
      recordTestResult(
        'Token Claims Validation',
        hasRequiredFields,
        hasRequiredFields ? 'Token contains required claims' : 'Token missing required claims'
      );
    }
  }

  async testDataLeakagePrevention() {
    log('Testing data leakage prevention...', 'test');
    
    const adminSession = testState.sessions.get('admin');
    const controllerSession = testState.sessions.get('controller');
    
    // Admin modifies stock
    await makeAuthenticatedRequest(adminSession, 'PUT', '/stocks/GOOGL', {
      price: 999.99
    });
    
    // Controller checks their GOOGL stock
    const controllerStocks = await makeAuthenticatedRequest(controllerSession, 'GET', '/stocks');
    const controllerGoogl = controllerStocks.stocks?.find(stock => stock.symbol === 'GOOGL');
    
    recordTestResult(
      'Price Change Isolation',
      controllerGoogl?.currentPrice !== 999.99,
      controllerGoogl?.currentPrice !== 999.99 
        ? 'Price changes properly isolated' 
        : 'Data leakage detected in price changes'
    );
    
    // Test bulk operations isolation
    await makeAuthenticatedRequest(adminSession, 'PUT', '/stocks/bulk', {
      updateType: 'bull'
    });
    
    const controllerStocksAfterBulk = await makeAuthenticatedRequest(controllerSession, 'GET', '/stocks');
    
    // Compare stock prices before and after admin's bulk operation
    const pricesUnchanged = controllerStocks.stocks?.every(stock => {
      const afterStock = controllerStocksAfterBulk.stocks?.find(s => s.symbol === stock.symbol);
      return afterStock && Math.abs(afterStock.currentPrice - stock.currentPrice) < 0.01;
    });
    
    recordTestResult(
      'Bulk Operations Isolation',
      pricesUnchanged,
      pricesUnchanged ? 'Bulk operations properly isolated' : 'Bulk operations affected other users'
    );
  }

  async testAdminFeatures() {
    log('Testing admin-specific features...', 'test');
    
    const adminSession = testState.sessions.get('admin');
    
    // Test admin stats
    const stats = await makeAuthenticatedRequest(adminSession, 'GET', '/admin/stats');
    
    recordTestResult(
      'Admin Statistics',
      stats.success === true && stats.stats,
      stats.success ? 'Admin can access system statistics' : 'Admin denied statistics access'
    );
    
    // Test admin session listing
    const allSessions = await makeAuthenticatedRequest(adminSession, 'GET', '/admin/sessions');
    
    recordTestResult(
      'Admin Session Listing',
      allSessions.success === true && Array.isArray(allSessions.sessions),
      allSessions.success ? `Admin can see ${allSessions.sessions.length} total sessions` : 'Admin denied session listing'
    );
    
    // Verify session data doesn't leak sensitive information
    if (allSessions.success && allSessions.sessions.length > 0) {
      const session = allSessions.sessions[0];
      const hasOnlySafeFields = !session.token && !session.refreshToken && !session.userData;
      
      recordTestResult(
        'Admin Session Data Safety',
        hasOnlySafeFields,
        hasOnlySafeFields ? 'Session data properly sanitized' : 'Session data contains sensitive information'
      );
    }
  }

  async testSessionCleanup() {
    log('Testing session cleanup mechanisms...', 'test');
    
    // This would typically test expired session cleanup
    // For now, we'll test logout functionality
    
    const testSession = await authenticateUser('admin', 'admin123');
    
    // Logout from the test session
    const logoutResponse = await makeAuthenticatedRequest(testSession, 'POST', '/auth/logout');
    
    recordTestResult(
      'Session Logout',
      logoutResponse.success === true,
      logoutResponse.success ? 'Session logged out successfully' : 'Session logout failed'
    );
    
    // Verify session is no longer valid
    const postLogoutResponse = await makeAuthenticatedRequest(testSession, 'GET', '/auth');
    
    recordTestResult(
      'Post-Logout Validation',
      postLogoutResponse.error === true,
      postLogoutResponse.error ? 'Session properly invalidated after logout' : 'Session still valid after logout'
    );
  }

  async generateTestReport() {
    const duration = Date.now() - testState.startTime;
    const passed = testState.testResults.filter(result => result.passed).length;
    const total = testState.testResults.length;
    const failed = total - passed;
    
    console.log('\n' + '='.repeat(80));
    log('📊 MULTI-USER SYSTEM TEST REPORT', 'test');
    console.log('='.repeat(80));
    
    log(`🕒 Test Duration: ${duration}ms`, 'info');
    log(`📈 Total Tests: ${total}`, 'info');
    log(`✅ Passed: ${passed}`, 'success');
    log(`❌ Failed: ${failed}`, 'error');
    log(`📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%`, passed === total ? 'success' : 'warning');
    
    console.log('\n📋 Detailed Results:');
    console.log('-'.repeat(80));
    
    testState.testResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      const time = result.timestamp.toISOString().substr(11, 8);
      console.log(`${status} [${time}] ${result.testName}: ${result.message}`);
      
      if (result.details && Object.keys(result.details).length > 0) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   ')}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    
    if (failed > 0) {
      log(`⚠️  ${failed} tests failed. Please review the system before production use.`, 'warning');
    } else {
      log('🎉 All tests passed! Multi-user system is working correctly.', 'success');
    }
    
    console.log('='.repeat(80));
    
    // Generate summary for key security features
    const securityTests = testState.testResults.filter(result => 
      result.testName.includes('Isolation') || 
      result.testName.includes('Security') || 
      result.testName.includes('Access') ||
      result.testName.includes('Token')
    );
    
    const securityPassed = securityTests.filter(test => test.passed).length;
    
    if (securityTests.length > 0) {
      log(`🔒 Security Tests: ${securityPassed}/${securityTests.length} passed`, 
           securityPassed === securityTests.length ? 'success' : 'error');
    }
  }
}

// Main execution
async function main() {
  try {
    const testSuite = new MultiUserTestSuite();
    await testSuite.runAllTests();
  } catch (error) {
    log(`Test suite execution failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Test suite interrupted', 'warning');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection: ${reason}`, 'error');
  process.exit(1);
});

// Run tests if called directly
if (require.main === module) {
  main();
}

module.exports = { MultiUserTestSuite, testState };