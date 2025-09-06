#!/usr/bin/env node

/**
 * Server Manager for Stock Ticker API
 * 
 * This script provides a simple process manager for the API server
 * that supports automatic restart functionality.
 * 
 * Usage:
 *   node server-manager.js
 * 
 * Features:
 * - Automatic restart on crash
 * - Graceful shutdown handling
 * - Process monitoring
 * - Restart via API endpoint
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess = null;
let restartCount = 0;
const MAX_RESTARTS = 10;
const RESTART_DELAY = 2000; // 2 seconds

console.log('🎛️  Stock Ticker API Server Manager Starting...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

function startServer() {
  console.log(`🚀 Starting API server (attempt ${restartCount + 1}/${MAX_RESTARTS})...`);
  
  serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  serverProcess.on('close', (code, signal) => {
    console.log(`\n📊 Server process exited with code ${code} and signal ${signal}`);
    
    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      console.log('✅ Server gracefully shut down by signal');
      process.exit(0);
    }
    
    if (code === 0) {
      console.log('🔄 Server requested restart...');
      restartCount++;
      
      if (restartCount <= MAX_RESTARTS) {
        console.log(`⏳ Waiting ${RESTART_DELAY/1000}s before restart...`);
        setTimeout(() => {
          startServer();
        }, RESTART_DELAY);
      } else {
        console.error(`❌ Maximum restart attempts (${MAX_RESTARTS}) exceeded`);
        console.error('💡 Please check the server logs and fix any issues before restarting');
        process.exit(1);
      }
    } else {
      console.error(`❌ Server crashed with code ${code}`);
      restartCount++;
      
      if (restartCount <= MAX_RESTARTS) {
        console.log(`⏳ Waiting ${RESTART_DELAY/1000}s before restart...`);
        setTimeout(() => {
          startServer();
        }, RESTART_DELAY);
      } else {
        console.error(`❌ Maximum restart attempts (${MAX_RESTARTS}) exceeded`);
        process.exit(1);
      }
    }
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server process:', error);
    process.exit(1);
  });

  // Reset restart count on successful start (after 30 seconds of uptime)
  setTimeout(() => {
    if (serverProcess && !serverProcess.killed) {
      restartCount = 0;
      console.log('✅ Server running stably - restart counter reset');
    }
  }, 30000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down server manager...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down server manager...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 1000);
});

// Start the server
startServer();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Manager Commands:');
console.log('   Ctrl+C - Graceful shutdown');
console.log('   API endpoint: POST /api/remote/restart - Restart via web interface');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
