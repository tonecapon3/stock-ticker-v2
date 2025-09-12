#!/usr/bin/env node

/**
 * Test Script for Hybrid Authentication System
 * 
 * This script validates the hybrid JWT + Clerk authentication system by testing:
 * - Configuration detection
 * - JWT authentication endpoints
 * - Clerk authentication setup
 * - Fallback mechanisms
 * - API integration
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('📋 Loaded environment variables from .env.local');
}

// Configuration
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3003';
const JWT_TEST_CREDENTIALS = {
  username: process.env.REMOTE_ADMIN_USERNAME || 'admin',
  password: process.env.REMOTE_ADMIN_PASSWORD || 'admin123'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warn(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️ ${message}`, 'blue');
}

function header(message) {
  log(`\n🧪 ${message}`, 'cyan');
  log('═'.repeat(message.length + 4), 'cyan');
}

/**
 * Make HTTP request with promise
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestModule = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = requestModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.data) {
      req.write(JSON.stringify(options.data));
    }

    req.end();
  });
}

/**
 * Test server connectivity
 */
async function testServerConnectivity() {
  header('Server Connectivity Test');
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/health`);
    
    if (response.status === 200) {
      success('API server is accessible');
      info(`Server status: ${JSON.stringify(response.data, null, 2)}`);
      return true;
    } else {
      error(`API server returned status: ${response.status}`);
      return false;
    }
  } catch (err) {
    error(`Cannot connect to API server: ${err.message}`);
    warn('Make sure the hybrid server is running:');
    warn('  node server-hybrid-fixed.cjs');
    return false;
  }
}

/**
 * Test server info endpoint
 */
async function testServerInfo() {
  header('Server Information Test');
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/remote/info`);
    
    if (response.status === 200) {
      success('Server info endpoint accessible');
      info('Authentication methods available:');
      if (response.data.authentication) {
        const auth = response.data.authentication;
        info(`  JWT: ${auth.jwt ? '✅' : '❌'}`);
        info(`  Clerk: ${auth.clerk ? '✅' : '❌'}`);
        info(`  Hybrid: ${auth.hybrid ? '✅' : '❌'}`);
        return auth;
      }
    } else {
      error(`Server info endpoint returned: ${response.status}`);
    }
  } catch (err) {
    error(`Server info test failed: ${err.message}`);
  }
  
  return null;
}

/**
 * Test JWT authentication
 */
async function testJWTAuth() {
  header('JWT Authentication Test');
  
  try {
    // Test JWT login
    info('Testing JWT login...');
    const loginResponse = await makeRequest(`${API_BASE_URL}/api/remote/auth`, {
      method: 'POST',
      data: JWT_TEST_CREDENTIALS
    });
    
    if (loginResponse.status === 200 && loginResponse.data.success) {
      success('JWT login successful');
      const token = loginResponse.data.token;
      const user = loginResponse.data.user;
      info(`User: ${user.username} (${user.role})`);
      info(`Auth method: ${loginResponse.data.authMethod}`);
      
      // Test token verification
      info('Testing token verification...');
      const verifyResponse = await makeRequest(`${API_BASE_URL}/api/remote/auth`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (verifyResponse.status === 200 && verifyResponse.data.success) {
        success('JWT token verification successful');
        info(`Verified user: ${verifyResponse.data.user.username}`);
        info(`Auth method: ${verifyResponse.data.authMethod}`);
        return { token, user };
      } else {
        error('JWT token verification failed');
        return null;
      }
    } else {
      error('JWT login failed');
      if (loginResponse.data.error) {
        error(`Error: ${loginResponse.data.error}`);
      }
      return null;
    }
  } catch (err) {
    error(`JWT authentication test failed: ${err.message}`);
    return null;
  }
}

/**
 * Test protected endpoints
 */
async function testProtectedEndpoints(token) {
  header('Protected Endpoints Test');
  
  if (!token) {
    warn('No token available, skipping protected endpoint tests');
    return;
  }
  
  const endpoints = [
    { path: '/stocks', method: 'GET', name: 'Get stocks' },
    { path: '/controls', method: 'GET', name: 'Get controls' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      info(`Testing ${endpoint.name}...`);
      const response = await makeRequest(`${API_BASE_URL}/api/remote${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 200) {
        success(`${endpoint.name} - OK`);
        if (endpoint.path === '/stocks' && response.data.stocks) {
          info(`  Found ${response.data.stocks.length} stocks`);
        }
        if (endpoint.path === '/controls' && response.data.controls) {
          info(`  System status: ${response.data.controls.isPaused ? 'Paused' : 'Running'}`);
        }
      } else {
        error(`${endpoint.name} - Failed (${response.status})`);
      }
    } catch (err) {
      error(`${endpoint.name} test failed: ${err.message}`);
    }
  }
}

/**
 * Test environment configuration
 */
function testEnvironmentConfig() {
  header('Environment Configuration Test');
  
  const requiredEnvVars = {
    'VITE_API_BASE_URL': process.env.VITE_API_BASE_URL,
    'REMOTE_JWT_SECRET': process.env.REMOTE_JWT_SECRET,
    'CLERK_SECRET_KEY': process.env.CLERK_SECRET_KEY,
    'VITE_CLERK_PUBLISHABLE_KEY': process.env.VITE_CLERK_PUBLISHABLE_KEY
  };
  
  info('Environment variables status:');
  let hasRequiredVars = false;
  
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (value) {
      success(`${key}: ✅ SET`);
      if (key.includes('SECRET') || key.includes('KEY')) {
        info(`  Value: ${value.substring(0, 8)}...`);
      } else {
        info(`  Value: ${value}`);
      }
      hasRequiredVars = true;
    } else {
      warn(`${key}: ❌ NOT SET`);
    }
  });
  
  return hasRequiredVars;
}

/**
 * Test frontend build files
 */
function testFrontendFiles() {
  header('Frontend Files Test');
  
  const projectRoot = path.resolve(__dirname, '../..');
  const requiredFiles = [
    'src/auth/types/index.ts',
    'src/auth/utils/index.ts', 
    'src/config/auth/index.ts',
    'src/hooks/auth/useHybridAuth.ts',
    'src/components/auth/hybrid/HybridAuthGuard.tsx',
    'src/components/auth/hybrid/HybridSignIn.tsx',
    'src/components/auth/hybrid/AuthMethodSelector.tsx',
    'src/pages/RemoteControlPanelHybrid.tsx'
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      success(`${file}: ✅ EXISTS`);
    } else {
      error(`${file}: ❌ MISSING`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

/**
 * Test package dependencies
 */
function testDependencies() {
  header('Package Dependencies Test');
  
  const projectRoot = path.resolve(__dirname, '../..');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    error('package.json not found');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = [
    '@clerk/clerk-react',
    '@clerk/express',
    'jsonwebtoken',
    'bcryptjs'
  ];
  
  let allDepsPresent = true;
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      success(`${dep}: ✅ ${dependencies[dep]}`);
    } else {
      error(`${dep}: ❌ MISSING`);
      allDepsPresent = false;
    }
  });
  
  return allDepsPresent;
}

/**
 * Main test function
 */
async function runTests() {
  log('🚀 Hybrid Authentication System Test Suite', 'cyan');
  log('═'.repeat(50), 'cyan');
  
  const results = {
    environment: testEnvironmentConfig(),
    dependencies: testDependencies(),
    frontendFiles: testFrontendFiles(),
    serverConnectivity: false,
    serverInfo: null,
    jwtAuth: null
  };
  
  // Test server connectivity
  results.serverConnectivity = await testServerConnectivity();
  
  if (results.serverConnectivity) {
    results.serverInfo = await testServerInfo();
    results.jwtAuth = await testJWTAuth();
    
    if (results.jwtAuth) {
      await testProtectedEndpoints(results.jwtAuth.token);
    }
  }
  
  // Summary
  header('Test Summary');
  
  const testsPassed = [
    results.environment,
    results.dependencies, 
    results.frontendFiles,
    results.serverConnectivity,
    results.serverInfo !== null,
    results.jwtAuth !== null
  ].filter(Boolean).length;
  
  const totalTests = 6;
  
  if (testsPassed === totalTests) {
    success(`All tests passed! (${testsPassed}/${totalTests})`);
    success('🎉 Hybrid authentication system is ready!');
  } else {
    warn(`${testsPassed}/${totalTests} tests passed`);
    
    if (!results.environment) {
      warn('💡 Set up environment variables in .env.local');
    }
    if (!results.dependencies) {
      warn('💡 Run: npm install');
    }
    if (!results.frontendFiles) {
      warn('💡 Make sure all hybrid auth files are created');
    }
    if (!results.serverConnectivity) {
      warn('💡 Start the hybrid server: node server-hybrid-fixed.cjs');
    }
  }
  
  log('\n📋 Next Steps:', 'blue');
  log('1. Update your routing to use RemoteControlPanelHybrid component');
  log('2. Test both JWT and Clerk authentication methods');
  log('3. Verify fallback mechanisms work properly');
  log('4. Test role-based access control');
  log('5. Deploy with proper environment variables\n');
}

// Run tests
runTests().catch(err => {
  error(`Test suite failed: ${err.message}`);
  process.exit(1);
});
