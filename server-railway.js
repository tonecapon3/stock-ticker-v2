import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3002;

console.log('🚀 Starting Railway server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', PORT);

// Basic CORS setup
app.use(cors({
  origin: ['https://staging.d49gw0148cutm.amplifyapp.com', 'http://localhost:4173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.post('/api/remote/status/health', (req, res) => {
  res.json({
    success: true,
    health: 'healthy',
    timestamp: new Date(),
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
    lastUpdated: new Date(),
    priceHistory: [
      { timestamp: new Date(Date.now() - 60000), price: 183.20 },
      { timestamp: new Date(), price: 185.75 }
    ]
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    currentPrice: 176.30,
    previousPrice: 174.50,
    initialPrice: 176.30,
    percentageChange: 1.03,
    lastUpdated: new Date(),
    priceHistory: [
      { timestamp: new Date(Date.now() - 60000), price: 174.50 },
      { timestamp: new Date(), price: 176.30 }
    ]
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    currentPrice: 415.20,
    previousPrice: 412.80,
    initialPrice: 415.20,
    percentageChange: 0.58,
    lastUpdated: new Date(),
    priceHistory: [
      { timestamp: new Date(Date.now() - 60000), price: 412.80 },
      { timestamp: new Date(), price: 415.20 }
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
      lastUpdated: new Date()
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
      lastUpdated: new Date(),
      isEmergencyStopped: false
    },
    requestedBy: 'local-sync',
    isLocalSync: true,
    timestamp: new Date()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Railway server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/remote/status/health`);
  console.log(`📊 Stocks API: http://localhost:${PORT}/api/remote/stocks`);
  console.log(`🎛️ Controls API: http://localhost:${PORT}/api/remote/controls`);
});
