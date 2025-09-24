#!/usr/bin/env node

/**
 * Start User-Scoped Clerk Server
 * 
 * This script starts the updated Clerk server with user-scoped data isolation.
 * Each authenticated user gets their own personal stock portfolio and control settings.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting User-Scoped Stock Ticker Server...');
console.log('');
console.log('📋 Features:');
console.log('  • User-specific stock portfolios');
console.log('  • Individual control settings per user');
console.log('  • Equal access for all authenticated users');
console.log('  • Session isolation between users');
console.log('  • Clerk authentication integration');
console.log('');

// Check if the updated server file exists
const serverPath = path.join(__dirname, 'server-clerk-updated.cjs');
if (!fs.existsSync(serverPath)) {
  console.error('❌ Error: server-clerk-updated.js not found!');
  console.error('Please make sure the file exists in the project root.');
  process.exit(1);
}

// Set environment variables for the server
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('📂 Server file:', serverPath);
console.log('');

// Start the server
const serverProcess = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

// Handle server process events
serverProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Server stopped gracefully');
  } else {
    console.log(`❌ Server process exited with code ${code}`);
  }
});

serverProcess.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});

console.log('✨ Server starting up...');
console.log('💡 Press Ctrl+C to stop the server');