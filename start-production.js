#!/usr/bin/env node

/**
 * Production Server Starter
 * 
 * This script starts the appropriate server based on environment configuration.
 * It supports both hybrid (Clerk + JWT) and legacy JWT authentication.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

// Determine which server to use
function determineServerFile() {
  const possibleServers = [
    'server-hybrid-fixed.cjs',
    'server-enhanced-multiuser.cjs', 
    'server.cjs',
    'server.js'
  ];

  for (const serverFile of possibleServers) {
    const serverPath = path.join(__dirname, serverFile);
    if (fs.existsSync(serverPath)) {
      logInfo(`Found server file: ${serverFile}`);
      return serverFile;
    }
  }

  logError('No server file found!');
  logInfo('Available files in directory:');
  fs.readdirSync(__dirname)
    .filter(file => file.includes('server'))
    .forEach(file => logInfo(`  - ${file}`));
  
  process.exit(1);
}

// Check environment configuration
function checkEnvironmentConfig() {
  logInfo('Checking environment configuration...');
  
  const requiredVars = {
    'NODE_ENV': process.env.NODE_ENV,
    'PORT': process.env.PORT,
  };

  const authVars = {
    'JWT': {
      'REMOTE_JWT_SECRET': process.env.REMOTE_JWT_SECRET,
      'REMOTE_ADMIN_PASSWORD_HASH': process.env.REMOTE_ADMIN_PASSWORD_HASH,
    },
    'CLERK': {
      'CLERK_SECRET_KEY': process.env.CLERK_SECRET_KEY,
      'VITE_CLERK_PUBLISHABLE_KEY': process.env.VITE_CLERK_PUBLISHABLE_KEY,
    }
  };

  // Check required vars
  Object.entries(requiredVars).forEach(([key, value]) => {
    if (value) {
      logSuccess(`${key}: SET`);
    } else {
      logWarning(`${key}: NOT SET (using defaults)`);
    }
  });

  // Check authentication methods
  const hasJWT = authVars.JWT.REMOTE_JWT_SECRET && authVars.JWT.REMOTE_ADMIN_PASSWORD_HASH;
  const hasClerk = authVars.CLERK.CLERK_SECRET_KEY && authVars.CLERK.VITE_CLERK_PUBLISHABLE_KEY;

  if (hasJWT && hasClerk) {
    logSuccess('HYBRID AUTHENTICATION: JWT + Clerk configured');
    return 'hybrid';
  } else if (hasJWT) {
    logSuccess('JWT AUTHENTICATION: JWT configured');
    return 'jwt';
  } else if (hasClerk) {
    logSuccess('CLERK AUTHENTICATION: Clerk configured');
    return 'clerk';
  } else {
    logWarning('NO AUTHENTICATION: Using development mode');
    return 'none';
  }
}

// Start the server
function startServer() {
  log('🚀 Starting Production Server', 'bright');
  log('═'.repeat(50), 'blue');

  const authType = checkEnvironmentConfig();
  const serverFile = determineServerFile();
  
  logInfo(`Authentication: ${authType.toUpperCase()}`);
  logInfo(`Server file: ${serverFile}`);
  logInfo(`Port: ${process.env.PORT || '3001'}`);
  logInfo(`Environment: ${process.env.NODE_ENV || 'development'}`);

  log('\n🔄 Launching server...', 'bright');

  // Start the server process
  const serverProcess = spawn('node', [serverFile], {
    stdio: 'inherit',
    env: process.env
  });

  // Handle server process events
  serverProcess.on('error', (error) => {
    logError(`Failed to start server: ${error.message}`);
    process.exit(1);
  });

  serverProcess.on('exit', (code, signal) => {
    if (signal) {
      logInfo(`Server process killed with signal ${signal}`);
    } else if (code !== 0) {
      logError(`Server process exited with code ${code}`);
      process.exit(code);
    } else {
      logInfo('Server process exited normally');
    }
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    logInfo('Received SIGTERM, shutting down gracefully...');
    serverProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    logInfo('Received SIGINT, shutting down gracefully...');
    serverProcess.kill('SIGINT');
  });

  // Keep the process alive
  process.stdin.resume();
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { startServer, checkEnvironmentConfig, determineServerFile };
