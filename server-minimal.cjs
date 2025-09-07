const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3002;

console.log('🚀 Starting minimal Railway server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', PORT);

// CORS headers function
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Mock stock data
const mockStocks = [
  {
    symbol: 'BNOX',
    name: 'Bane&Ox Inc.',
    currentPrice: 185.75,
    previousPrice: 183.20,
    initialPrice: 185.75,
    percentageChange: 1.39,
    lastUpdated: new Date().toISOString(),
    priceHistory: [
      { timestamp: new Date(Date.now() - 60000).toISOString(), price: 183.20 },
      { timestamp: new Date().toISOString(), price: 185.75 }
    ]
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    currentPrice: 176.30,
    previousPrice: 174.50,
    initialPrice: 176.30,
    percentageChange: 1.03,
    lastUpdated: new Date().toISOString(),
    priceHistory: [
      { timestamp: new Date(Date.now() - 60000).toISOString(), price: 174.50 },
      { timestamp: new Date().toISOString(), price: 176.30 }
    ]
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    currentPrice: 415.20,
    previousPrice: 412.80,
    initialPrice: 415.20,
    percentageChange: 0.58,
    lastUpdated: new Date().toISOString(),
    priceHistory: [
      { timestamp: new Date(Date.now() - 60000).toISOString(), price: 412.80 },
      { timestamp: new Date().toISOString(), price: 415.20 }
    ]
  }
];

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Set CORS headers for all responses
  setCorsHeaders(res);

  // Handle preflight OPTIONS requests
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoints (both paths)
  if ((path === '/api/remote/status/health' || path === '/status/health') && (method === 'POST' || method === 'GET')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      health: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }));
    return;
  }

  // Stocks endpoint
  if (path === '/api/remote/stocks' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      stocks: mockStocks,
      meta: {
        count: mockStocks.length,
        lastUpdated: new Date().toISOString()
      }
    }));
    return;
  }

  // Controls endpoint
  if (path === '/api/remote/controls' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      controls: {
        isPaused: false,
        updateIntervalMs: 1000,
        selectedCurrency: 'USD',
        lastUpdated: new Date().toISOString(),
        isEmergencyStopped: false
      },
      requestedBy: 'local-sync',
      isLocalSync: true,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Default 404 response
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Not Found',
    path: path,
    method: method
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal Railway server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/remote/status/health`);
  console.log(`📊 Stocks API: http://localhost:${PORT}/api/remote/stocks`);
  console.log(`🎛️ Controls API: http://localhost:${PORT}/api/remote/controls`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
  });
});
