#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Stock Ticker Full System...\n');

// Start backend server
console.log('📡 Starting backend server on port 3001...');
const backend = spawn('node', ['server-clerk-updated.cjs'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Wait a bit for backend to initialize
setTimeout(() => {
  console.log('\n🌐 Starting frontend on port 3000...');
  const frontend = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down services...');
    backend.kill('SIGINT');
    frontend.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down services...');
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
    process.exit(0);
  });

  backend.on('exit', (code) => {
    console.log(`\n❌ Backend process exited with code ${code}`);
    frontend.kill('SIGTERM');
    process.exit(code);
  });

  frontend.on('exit', (code) => {
    console.log(`\n❌ Frontend process exited with code ${code}`);
    backend.kill('SIGTERM');
    process.exit(code);
  });

}, 2000);

console.log('\n✨ System started! Services available at:');
console.log('   Frontend:  http://localhost:3000');
console.log('   Backend:   http://localhost:3001');
console.log('   API Health: http://localhost:3001/api/health');
console.log('\n⚡ Press Ctrl+C to stop all services\n');