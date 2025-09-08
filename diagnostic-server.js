const http = require('http');

const server = http.createServer((req, res) => {
  const diagnostics = {
    message: 'Railway Diagnostics Server',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      REMOTE_JWT_SECRET: process.env.REMOTE_JWT_SECRET ? 'SET (length: ' + process.env.REMOTE_JWT_SECRET.length + ')' : 'NOT SET',
      REMOTE_API_KEY: process.env.REMOTE_API_KEY ? 'SET' : 'NOT SET',
      REMOTE_ALLOWED_ORIGINS: process.env.REMOTE_ALLOWED_ORIGINS ? 'SET' : 'NOT SET',
      REMOTE_ADMIN_PASSWORD_HASH: process.env.REMOTE_ADMIN_PASSWORD_HASH ? 'SET' : 'NOT SET',
      REMOTE_CONTROLLER_PASSWORD_HASH: process.env.REMOTE_CONTROLLER_PASSWORD_HASH ? 'SET' : 'NOT SET'
    },
    request: {
      url: req.url,
      method: req.method,
      headers: req.headers
    }
  };

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify(diagnostics, null, 2));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔍 Diagnostic server running on port ${PORT}`);
  console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    REMOTE_JWT_SECRET: process.env.REMOTE_JWT_SECRET ? '✅ SET' : '❌ NOT SET',
    REMOTE_API_KEY: process.env.REMOTE_API_KEY ? '✅ SET' : '❌ NOT SET'
  });
});
