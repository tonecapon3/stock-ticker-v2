// Absolute minimal server for Railway testing
const http = require('http');

console.log('🚀 Starting minimal test server...');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

const server = http.createServer((req, res) => {
  console.log('📨 Request received:', req.method, req.url);
  
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  
  res.end(JSON.stringify({ 
    status: 'success', 
    message: 'Railway minimal test server is working!',
    timestamp: new Date().toISOString(),
    port: process.env.PORT
  }));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal server listening on 0.0.0.0:${PORT}`);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
