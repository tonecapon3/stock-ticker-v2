const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;

console.log('🚀 Starting simple Railway server...');
console.log('Port:', PORT);

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Health check endpoints
app.get('/status/health', (req, res) => {
  res.json({
    success: true,
    health: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.post('/status/health', (req, res) => {
  res.json({
    success: true,
    health: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    server: 'stock-ticker-simple'
  });
});

app.post('/api/remote/status/health', (req, res) => {
  res.json({
    success: true,
    health: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

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
  }
];

// Stocks endpoint
app.get('/api/remote/stocks', (req, res) => {
  res.json({
    success: true,
    stocks: mockStocks,
    meta: {
      count: mockStocks.length,
      lastUpdated: new Date().toISOString()
    }
  });
});

// Controls endpoint
app.get('/api/remote/controls', (req, res) => {
  res.json({
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
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Stock Ticker API Server',
    health: 'OK',
    endpoints: [
      'GET /status/health',
      'POST /status/health',
      'POST /api/remote/status/health', 
      'GET /api/remote/stocks',
      'GET /api/remote/controls'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`✅ Simple Railway server running on port ${PORT}`);
  console.log(`🌐 Root: http://localhost:${PORT}/`);
  console.log(`🌐 Health: http://localhost:${PORT}/status/health`);
});
