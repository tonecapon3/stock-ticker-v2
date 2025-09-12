#!/usr/bin/env node

/**
 * Production Server Startup with Enhanced Reliability
 * 
 * Features:
 * - Graceful error handling and recovery
 * - Port conflict resolution
 * - Health check validation
 * - Process management integration
 * - Startup retry logic
 * - Resource monitoring
 */

import { createServer } from 'http';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

const MAX_STARTUP_RETRIES = 5;
const STARTUP_RETRY_DELAY = 2000; // 2 seconds
const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds
const PORT_SCAN_RANGE = 10; // Try 10 ports above the default

// Startup configuration
const config = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: parseInt(process.env.PORT || process.env.REMOTE_PORT || '3001'),
  MAX_PORT: parseInt(process.env.PORT || process.env.REMOTE_PORT || '3001') + PORT_SCAN_RANGE,
  HEALTH_PATH: '/status/health',
  PID_FILE: process.env.PID_FILE || './server.pid'
};

console.log('🚀 Starting Stock Ticker Production Server...');
console.log('📋 Configuration:', {
  NODE_ENV: config.NODE_ENV,
  PORT: config.PORT,
  MAX_PORT: config.MAX_PORT,
  HEALTH_PATH: config.HEALTH_PATH
});

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    
    server.on('error', () => resolve(false));
  });
}

/**
 * Find an available port starting from the configured port
 */
async function findAvailablePort(startPort, maxPort) {
  console.log(`🔍 Scanning for available port from ${startPort} to ${maxPort}...`);
  
  for (let port = startPort; port <= maxPort; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      console.log(`✅ Found available port: ${port}`);
      return port;
    }
  }
  
  throw new Error(`❌ No available ports found in range ${startPort}-${maxPort}`);
}

/**
 * Validate server health after startup
 */
async function validateServerHealth(port) {
  console.log(`🏥 Validating server health on port ${port}...`);
  
  const healthUrl = `http://localhost:${port}${config.HEALTH_PATH}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
  
  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.health === 'healthy') {
        console.log('✅ Server health check passed');
        return true;
      }
    }
    
    console.warn('⚠️  Server health check failed - unhealthy response');
    return false;
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ Server health check failed:', error.message);
    return false;
  }
}

/**
 * Write PID file for process management
 */
async function writePidFile(pid) {
  try {
    await fs.writeFile(config.PID_FILE, pid.toString());
    console.log(`📝 PID file written: ${config.PID_FILE} (PID: ${pid})`);
  } catch (error) {
    console.warn('⚠️  Could not write PID file:', error.message);
  }
}

/**
 * Clean up PID file on exit
 */
async function cleanupPidFile() {
  try {
    await fs.unlink(config.PID_FILE);
    console.log('🧹 PID file cleaned up');
  } catch (error) {
    // Ignore errors - file might not exist
  }
}

/**
 * Start the server process with monitoring
 */
async function startServerProcess(port) {
  return new Promise((resolve, reject) => {
    console.log(`🎯 Starting server process on port ${port}...`);
    
    // Set environment for the server process
    const env = {
      ...process.env,
      NODE_ENV: config.NODE_ENV,
      PORT: port.toString(),
      REMOTE_PORT: port.toString()
    };
    
    // Spawn the actual server process
    const serverProcess = spawn('node', ['server.js'], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });
    
    let startupOutput = '';
    let startupError = '';
    
    // Capture startup output
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);
      startupOutput += output;
    });
    
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(output);
      startupError += output;
    });
    
    // Handle process events
    serverProcess.on('spawn', () => {
      console.log(`✅ Server process spawned (PID: ${serverProcess.pid})`);
      writePidFile(serverProcess.pid);
    });
    
    serverProcess.on('error', (error) => {
      console.error('❌ Failed to spawn server process:', error.message);
      reject(error);
    });
    
    serverProcess.on('exit', (code, signal) => {
      cleanupPidFile();
      
      if (code === 0) {
        console.log('✅ Server process exited normally');
      } else {
        console.error(`❌ Server process exited with code ${code} (signal: ${signal})`);
        console.error('Last error output:', startupError);
      }
    });
    
    // Wait for server to be ready
    setTimeout(async () => {
      try {
        const isHealthy = await validateServerHealth(port);
        if (isHealthy) {
          console.log('🎉 Server startup completed successfully!');
          resolve(serverProcess);
        } else {
          serverProcess.kill('SIGTERM');
          reject(new Error('Server health check failed'));
        }
      } catch (error) {
        serverProcess.kill('SIGTERM');
        reject(error);
      }
    }, 3000); // Give server 3 seconds to start
  });
}

/**
 * Main startup function with retry logic
 */
async function startServer() {
  let retries = 0;
  
  while (retries < MAX_STARTUP_RETRIES) {
    try {
      console.log(`🔄 Startup attempt ${retries + 1}/${MAX_STARTUP_RETRIES}`);
      
      // Find available port
      const availablePort = await findAvailablePort(config.PORT, config.MAX_PORT);
      
      // Start server process
      const serverProcess = await startServerProcess(availablePort);
      
      // Setup graceful shutdown handlers
      process.on('SIGTERM', () => {
        console.log('📡 Received SIGTERM, shutting down gracefully...');
        serverProcess.kill('SIGTERM');
        setTimeout(() => process.exit(0), 5000);
      });
      
      process.on('SIGINT', () => {
        console.log('📡 Received SIGINT, shutting down gracefully...');
        serverProcess.kill('SIGTERM');
        setTimeout(() => process.exit(0), 5000);
      });
      
      // Keep the production wrapper running
      console.log('🛡️  Production wrapper active - monitoring server process...');
      return;
      
    } catch (error) {
      retries++;
      console.error(`❌ Startup attempt ${retries} failed:`, error.message);
      
      if (retries < MAX_STARTUP_RETRIES) {
        console.log(`⏳ Retrying in ${STARTUP_RETRY_DELAY / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, STARTUP_RETRY_DELAY));
      } else {
        console.error('💥 All startup attempts failed. Server cannot start.');
        process.exit(1);
      }
    }
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  cleanupPidFile().finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  cleanupPidFile().finally(() => process.exit(1));
});

// Start the server
startServer().catch((error) => {
  console.error('💥 Fatal startup error:', error);
  process.exit(1);
});