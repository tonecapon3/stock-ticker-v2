import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Price history generation utilities
function generateFakePriceHistory(basePrice, pointsCount = 30, intervalSeconds = 15) {
  const priceHistory = [];
  const now = new Date();
  
  for (let i = pointsCount - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * intervalSeconds * 1000));
    
    // Generate realistic price variation
    const randomVariation = (Math.random() - 0.5) * 2 * 0.03; // 3% max variation
    
    // Apply smoothing with previous point
    let priceVariation = randomVariation;
    if (priceHistory.length > 0) {
      const prevPrice = priceHistory[priceHistory.length - 1].price;
      const targetPrice = basePrice * (1 + randomVariation);
      const smoothingFactor = 0.7;
      const smoothedPrice = prevPrice * (1 - smoothingFactor) + targetPrice * smoothingFactor;
      priceVariation = (smoothedPrice - basePrice) / basePrice;
    }
    
    const price = Math.max(0.01, basePrice * (1 + priceVariation));
    
    priceHistory.push({
      timestamp,
      price: Math.round(price * 100) / 100
    });
  }
  
  return priceHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function generateRealisticPriceChange(currentPrice, maxChangePercent = 2) {
  const randomFactor = Math.random();
  let changePercent;
  
  if (randomFactor < 0.7) {
    changePercent = (Math.random() - 0.5) * 1.0; // Small changes
  } else if (randomFactor < 0.9) {
    changePercent = (Math.random() - 0.5) * 3.0; // Medium changes
  } else {
    changePercent = (Math.random() - 0.5) * maxChangePercent * 2; // Large changes
  }
  
  const newPrice = currentPrice * (1 + changePercent / 100);
  return Math.max(0.01, Math.round(newPrice * 100) / 100);
}

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Production mode: Using Railway environment variables');
  // In production (Railway), environment variables are already loaded
  // No need to load from file
} else {
  console.log('🔧 Development mode: Loading from .env.local');
  dotenv.config({ path: '.env.local' });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || process.env.REMOTE_PORT || 3001;

// Security Configuration - All secrets from environment variables
const JWT_SECRET = process.env.REMOTE_JWT_SECRET;
const API_KEY = process.env.REMOTE_API_KEY;
const ALLOWED_ORIGINS = (process.env.REMOTE_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// Debug: Log environment variable status
console.log('🔍 Environment Variables Check:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', process.env.PORT);
console.log('  REMOTE_PORT:', process.env.REMOTE_PORT);
console.log('  JWT_SECRET:', JWT_SECRET ? '✅ SET (' + JWT_SECRET.length + ' chars)' : '❌ MISSING');
console.log('  API_KEY:', API_KEY ? '✅ SET' : '❌ MISSING');
console.log('  ALLOWED_ORIGINS:', ALLOWED_ORIGINS.length, 'origins');

// Validate required environment variables
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ REMOTE_JWT_SECRET is required and must be at least 32 characters');
  console.error('   Current value:', JWT_SECRET ? 'SET but too short' : 'NOT SET');
  console.error('Generate one with: openssl rand -base64 32');
  process.exit(1);
}

if (!API_KEY) {
  console.error('❌ REMOTE_API_KEY is required for additional security');
  console.error('Generate one with: openssl rand -base64 24');
  process.exit(1);
}

// Enable CORS for frontend with environment-based origins
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

app.use(express.json());

// User management from environment variables
// In production, use a proper database
const USERS = [
  {
    id: 1,
    username: process.env.REMOTE_ADMIN_USERNAME || 'admin',
    password: process.env.REMOTE_ADMIN_PASSWORD_HASH || '$2a$10$defaultHashChangeInProduction',
    role: 'admin'
  },
  {
    id: 2,
    username: process.env.REMOTE_CONTROLLER_USERNAME || 'controller',
    password: process.env.REMOTE_CONTROLLER_PASSWORD_HASH || '$2a$10$defaultHashChangeInProduction',
    role: 'controller'
  }
];

// Validate user configuration
if (process.env.NODE_ENV === 'production') {
  if (!process.env.REMOTE_ADMIN_PASSWORD_HASH || process.env.REMOTE_ADMIN_PASSWORD_HASH.includes('default')) {
    console.error('❌ REMOTE_ADMIN_PASSWORD_HASH must be set in production');
    console.error('Generate one with: node -e "console.log(require("bcryptjs").hashSync("your-password", 10))"');
    process.exit(1);
  }
  if (!process.env.REMOTE_CONTROLLER_PASSWORD_HASH || process.env.REMOTE_CONTROLLER_PASSWORD_HASH.includes('default')) {
    console.error('❌ REMOTE_CONTROLLER_PASSWORD_HASH must be set in production');
    console.error('Generate one with: node -e "console.log(require("bcryptjs").hashSync("your-password", 10))"');
    process.exit(1);
  }
}

// Mock stock data with rich price history - synchronized with frontend
const defaultStockData = [
  { symbol: 'BNOX', name: 'Bane&Ox Inc.', basePrice: 185.75 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 176.30 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', basePrice: 415.20 },
];

// Initialize stocks with rich price history
let stocksData = defaultStockData.map(stock => {
  const priceHistory = generateFakePriceHistory(stock.basePrice, 30, 15);
  const mostRecentPrice = priceHistory[priceHistory.length - 1].price;
  
  return {
    symbol: stock.symbol,
    name: stock.name,
    currentPrice: mostRecentPrice,
    previousPrice: priceHistory.length > 1 ? priceHistory[priceHistory.length - 2].price : mostRecentPrice,
    initialPrice: stock.basePrice,
    percentageChange: ((mostRecentPrice - stock.basePrice) / stock.basePrice) * 100,
    lastUpdated: new Date(),
    priceHistory: priceHistory,
  };
});

// Mock system state
let systemState = {
  isPaused: false,
  updateIntervalMs: 1000, // 1 second for smoother updates
  selectedCurrency: 'USD',
  lastUpdated: new Date(),
  isEmergencyStopped: false
};

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Special middleware for local sync operations (no auth required)
function allowLocalSync(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    // Local sync request - no authentication required
    req.user = { id: 0, username: 'local-sync', role: 'read-only' };
    req.isLocalSync = true;
    return next();
  }
  
  // If auth header exists, verify it normally
  return verifyToken(req, res, next);
}

// Authentication endpoints
app.post('/api/remote/auth', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = USERS.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/remote/auth', verifyToken, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

// Stock endpoints
app.get('/api/remote/stocks', (req, res) => {
  // Allow unauthenticated read access for main app synchronization
  const authHeader = req.headers['authorization'];
  const isAuthenticated = authHeader && authHeader.startsWith('Bearer ');
  
  const response = {
    success: true,
    stocks: stocksData,
    meta: {
      count: stocksData.length,
      lastUpdated: new Date(),
    }
  };
  
  // Add user info if authenticated (for remote control panel)
  if (isAuthenticated) {
    try {
      const token = authHeader.split(' ')[1];
      const user = jwt.verify(token, JWT_SECRET);
      response.meta.requestedBy = user.username;
    } catch (err) {
      // Ignore auth errors for read-only access
    }
  }
  
  res.json(response);
});

app.post('/api/remote/stocks', verifyToken, (req, res) => {
  try {
    if (req.user.role !== 'controller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { symbol, name, initialPrice } = req.body;

    if (!symbol || !name || typeof initialPrice !== 'number') {
      return res.status(400).json({ error: 'Symbol, name, and initial price are required' });
    }

    if (!/^[A-Z]{1,5}$/.test(symbol)) {
      return res.status(400).json({ error: 'Symbol must be 1-5 uppercase letters' });
    }

    if (initialPrice <= 0 || initialPrice > 1000000) {
      return res.status(400).json({ error: 'Price must be between 0.01 and 1,000,000' });
    }

    if (stocksData.some(stock => stock.symbol === symbol)) {
      return res.status(409).json({ error: 'Stock with this symbol already exists' });
    }

    const newStock = {
      symbol: symbol.toUpperCase(),
      name: name.trim(),
      currentPrice: initialPrice,
      previousPrice: initialPrice,
      initialPrice: initialPrice,
      percentageChange: 0,
      lastUpdated: new Date(),
      priceHistory: [{ timestamp: new Date(), price: initialPrice }],
    };

    stocksData.push(newStock);

    res.status(201).json({
      success: true,
      stock: newStock,
      message: `Stock ${symbol} added successfully`,
      addedBy: req.user.username
    });
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// Bulk price update endpoint
app.put('/api/remote/stocks/bulk', verifyToken, (req, res) => {
  try {
    if (req.user.role !== 'controller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { updates, updateType, percentage } = req.body;

    if (!updates && !updateType) {
      return res.status(400).json({ error: 'Either updates array or updateType is required' });
    }

    let updatedStocks = [];
    const changes = [];

    if (updateType) {
      // Bulk update all stocks with a pattern
      stocksData.forEach((stock, index) => {
        let newPrice;
        const currentPrice = stock.currentPrice;

        switch (updateType) {
          case 'percentage':
            const pct = percentage || 0;
            newPrice = currentPrice * (1 + pct / 100);
            break;
          case 'random':
            // Random fluctuation between -5% and +5%
            const randomPct = (Math.random() * 10) - 5;
            newPrice = currentPrice * (1 + randomPct / 100);
            break;
          case 'reset':
            newPrice = stock.initialPrice;
            break;
          case 'market_crash':
            newPrice = currentPrice * 0.8; // 20% drop
            break;
          case 'market_boom':
            newPrice = currentPrice * 1.2; // 20% increase
            break;
          default:
            newPrice = currentPrice;
        }

        // Ensure price is within bounds
        newPrice = Math.max(0.01, Math.min(1000000, newPrice));
        
        if (newPrice !== currentPrice) {
          const previousPrice = stock.currentPrice;
          stock.previousPrice = previousPrice;
          stock.currentPrice = newPrice;
          stock.percentageChange = ((newPrice - previousPrice) / previousPrice) * 100;
          stock.lastUpdated = new Date();
          
          stock.priceHistory.push({
            timestamp: new Date(),
            price: newPrice
          });

          if (stock.priceHistory.length > 30) {
            stock.priceHistory.shift();
          }

          changes.push(`${stock.symbol}: ${previousPrice.toFixed(2)} → ${newPrice.toFixed(2)}`);
          updatedStocks.push(stock.symbol);
        }
      });
    } else if (updates && Array.isArray(updates)) {
      // Individual stock updates
      updates.forEach(update => {
        const { symbol, price } = update;
        if (!symbol || typeof price !== 'number') {
          return; // Skip invalid updates
        }

        const stockIndex = stocksData.findIndex(s => s.symbol.toUpperCase() === symbol.toUpperCase());
        if (stockIndex !== -1) {
          const stock = stocksData[stockIndex];
          
          if (price <= 0 || price > 1000000) {
            return; // Skip invalid prices
          }

          const previousPrice = stock.currentPrice;
          stock.previousPrice = previousPrice;
          stock.currentPrice = price;
          stock.percentageChange = ((price - previousPrice) / previousPrice) * 100;
          stock.lastUpdated = new Date();
          
          stock.priceHistory.push({
            timestamp: new Date(),
            price: price
          });

          if (stock.priceHistory.length > 30) {
            stock.priceHistory.shift();
          }

          changes.push(`${symbol}: ${previousPrice.toFixed(2)} → ${price.toFixed(2)}`);
          updatedStocks.push(symbol);
        }
      });
    }

    if (changes.length === 0) {
      return res.status(400).json({ error: 'No valid updates were processed' });
    }

    res.json({
      success: true,
      message: `Bulk update completed for ${updatedStocks.length} stocks`,
      updatedStocks,
      changes,
      updateType: updateType || 'individual',
      updatedBy: req.user.username,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ error: 'Failed to perform bulk update' });
  }
});

app.put('/api/remote/stocks/:symbol', verifyToken, (req, res) => {
  try {
    if (req.user.role !== 'controller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { symbol } = req.params;
    const { price, name } = req.body;

    const stockIndex = stocksData.findIndex(s => s.symbol.toUpperCase() === symbol.toUpperCase());
    
    if (stockIndex === -1) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const stock = stocksData[stockIndex];
    let updated = false;
    const changes = [];

    if (price !== undefined) {
      if (typeof price !== 'number' || price <= 0 || price > 1000000) {
        return res.status(400).json({ error: 'Price must be a number between 0.01 and 1,000,000' });
      }

      const previousPrice = stock.currentPrice;
      stock.previousPrice = previousPrice;
      stock.currentPrice = price;
      stock.percentageChange = ((price - previousPrice) / previousPrice) * 100;
      stock.lastUpdated = new Date();
      
      stock.priceHistory.push({
        timestamp: new Date(),
        price: price
      });

      if (stock.priceHistory.length > 30) {
        stock.priceHistory.shift();
      }

      changes.push(`price updated from ${previousPrice} to ${price}`);
      updated = true;
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name must be a non-empty string' });
      }

      const oldName = stock.name;
      stock.name = name.trim();
      changes.push(`name updated from "${oldName}" to "${stock.name}"`);
      updated = true;
    }

    if (!updated) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    stocksData[stockIndex] = stock;

    res.json({
      success: true,
      stock,
      changes,
      updatedBy: req.user.username,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

app.delete('/api/remote/stocks/:symbol', verifyToken, (req, res) => {
  try {
    if (req.user.role !== 'controller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { symbol } = req.params;
    const stockIndex = stocksData.findIndex(s => s.symbol.toUpperCase() === symbol.toUpperCase());
    
    if (stockIndex === -1) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const deletedStock = stocksData[stockIndex];
    stocksData.splice(stockIndex, 1);

    res.json({
      success: true,
      message: `Stock ${symbol} deleted successfully`,
      deletedStock,
      deletedBy: req.user.username,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

// Controls endpoints
app.get('/api/remote/controls', (req, res) => {
  // Check if this is a local sync request (no auth required)
  const authHeader = req.headers.authorization;
  let user = null;
  let isLocalSync = false;
  
  if (!authHeader) {
    // Allow unauthenticated access for local sync
    isLocalSync = true;
    console.debug('🏠 Local controls sync request detected');
  } else {
    // Verify token for authenticated requests
    try {
      const token = authHeader.replace('Bearer ', '');
      user = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
  
  res.json({
    success: true,
    controls: systemState,
    requestedBy: user ? user.username : 'local-sync',
    isLocalSync,
    timestamp: new Date()
  });
});

app.put('/api/remote/controls', verifyToken, (req, res) => {
  try {
    if (req.user.role !== 'controller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updates = req.body;
    const changes = [];

    if (updates.isPaused !== undefined) {
      if (typeof updates.isPaused !== 'boolean') {
        return res.status(400).json({ error: 'isPaused must be a boolean' });
      }
      
      const oldState = systemState.isPaused;
      systemState.isPaused = updates.isPaused;
      changes.push(`Ticker ${updates.isPaused ? 'paused' : 'resumed'} (was ${oldState ? 'paused' : 'running'})`);
    }

    if (updates.updateIntervalMs !== undefined) {
      if (typeof updates.updateIntervalMs !== 'number' || updates.updateIntervalMs < 50 || updates.updateIntervalMs > 10000) {
        return res.status(400).json({ error: 'updateIntervalMs must be a number between 50 and 10000' });
      }
      
      const oldInterval = systemState.updateIntervalMs;
      systemState.updateIntervalMs = updates.updateIntervalMs;
      changes.push(`Update interval changed from ${oldInterval}ms to ${updates.updateIntervalMs}ms`);
    }

    if (updates.selectedCurrency !== undefined) {
      if (typeof updates.selectedCurrency !== 'string') {
        return res.status(400).json({ error: 'selectedCurrency must be a string' });
      }
      
      // Validate currency code (basic validation)
      const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'CHF', 'INR'];
      if (!validCurrencies.includes(updates.selectedCurrency)) {
        return res.status(400).json({ error: `selectedCurrency must be one of: ${validCurrencies.join(', ')}` });
      }
      
      const oldCurrency = systemState.selectedCurrency;
      systemState.selectedCurrency = updates.selectedCurrency;
      changes.push(`Currency changed from ${oldCurrency} to ${updates.selectedCurrency}`);
    }

    if (updates.emergencyStop !== undefined) {
      if (typeof updates.emergencyStop !== 'boolean') {
        return res.status(400).json({ error: 'emergencyStop must be a boolean' });
      }
      
      systemState.isEmergencyStopped = updates.emergencyStop;
      systemState.isPaused = updates.emergencyStop;
      changes.push(`Emergency stop ${updates.emergencyStop ? 'activated' : 'deactivated'}`);
    }

    if (changes.length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    systemState.lastUpdated = new Date();

    res.json({
      success: true,
      controls: systemState,
      changes,
      updatedBy: req.user.username,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error updating controls:', error);
    res.status(500).json({ error: 'Failed to update controls' });
  }
});

// Emergency stop endpoint
app.post('/api/remote/controls/emergency', verifyToken, (req, res) => {
  try {
    systemState.isEmergencyStopped = true;
    systemState.isPaused = true;
    systemState.lastUpdated = new Date();

    res.json({
      success: true,
      message: 'Emergency stop activated',
      controls: systemState,
      triggeredBy: req.user.username,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error triggering emergency stop:', error);
    res.status(500).json({ error: 'Failed to trigger emergency stop' });
  }
});

// Status endpoints
app.get('/api/remote/status', verifyToken, (req, res) => {
  const uptime = process.uptime() * 1000;
  
  const statusResponse = {
    timestamp: new Date(),
    uptime: {
      milliseconds: uptime,
      seconds: Math.floor(uptime / 1000),
      minutes: Math.floor(uptime / (1000 * 60)),
      hours: Math.floor(uptime / (1000 * 60 * 60)),
      formatted: formatUptime(uptime)
    },
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    },
    health: {
      status: 'healthy',
      checks: {
        api: 'ok',
        authentication: 'ok',
        storage: 'ok'
      }
    },
    user: {
      username: req.user.username,
      role: req.user.role,
      requestTime: new Date()
    }
  };

  res.json({
    success: true,
    status: statusResponse
  });
});

app.post('/api/remote/status/health', (req, res) => {
  const startTime = Date.now();
  
  const healthChecks = {
    api: 'ok',
    responseTime: Date.now() - startTime,
    timestamp: new Date(),
    version: '1.0.0'
  };

  res.json({
    success: true,
    health: 'healthy',
    checks: healthChecks
  });
});

// GET endpoint for health check (used by Render health checks)
app.get('/api/remote/status/health', (req, res) => {
  const startTime = Date.now();
  
  const healthChecks = {
    api: 'ok',
    responseTime: Date.now() - startTime,
    timestamp: new Date(),
    version: '1.0.0'
  };

  res.json({
    success: true,
    health: 'healthy',
    checks: healthChecks
  });
});

// Server restart endpoint
app.post('/api/remote/restart', verifyToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can restart the server' });
    }

    console.log(`🔄 Server restart requested by ${req.user.username}`);
    
    // Send response before restarting
    res.json({
      success: true,
      message: 'Server restart initiated',
      restartedBy: req.user.username,
      timestamp: new Date()
    });

    // Graceful shutdown with delay to allow response to be sent
    setTimeout(() => {
      console.log('🔄 Gracefully shutting down server for restart...');
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('Error restarting server:', error);
    res.status(500).json({ error: 'Failed to restart server' });
  }
});

function formatUptime(uptimeMs) {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Remote Control Panel API Server running on http://0.0.0.0:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  POST /api/remote/auth - Login');
  console.log('  GET  /api/remote/auth - Verify token');
  console.log('  GET  /api/remote/stocks - Get all stocks');
  console.log('  POST /api/remote/stocks - Add stock');
  console.log('  PUT  /api/remote/stocks/:symbol - Update stock');
  console.log('  DELETE /api/remote/stocks/:symbol - Delete stock');
  console.log('  GET  /api/remote/controls - Get system controls');
  console.log('  PUT  /api/remote/controls - Update controls');
  console.log('  POST /api/remote/controls/emergency - Emergency stop');
  console.log('  GET  /api/remote/status - Get system status');
  console.log('  GET  /api/remote/status/health - Health check');
  console.log('  POST /api/remote/status/health - Health check');
  console.log('  POST /api/remote/restart - Restart server (admin only)');
  console.log('\n🔑 Available accounts:');
  console.log('  Username: admin (full access)');
  console.log('  Username: controller (control access)');
  console.log('  ⚠️  Use environment-configured passwords');
  
  // Debug: Show if environment variables are loaded
  if (process.env.NODE_ENV === 'development') {
    console.log('\n🔧 Environment Status:');
    console.log('  Admin hash:', process.env.REMOTE_ADMIN_PASSWORD_HASH ? '✅ SET' : '❌ MISSING');
    console.log('  Controller hash:', process.env.REMOTE_CONTROLLER_PASSWORD_HASH ? '✅ SET' : '❌ MISSING');
    
    console.log('\n📊 Stock Data Initialized:');
    stocksData.forEach(stock => {
      console.log(`  ${stock.symbol}: ${stock.priceHistory.length} price points`);
    });
  }
  
  // Start real-time price updates
  console.log('\n🔄 Starting real-time price updates...');
  const priceUpdateInterval = setInterval(() => {
    if (!systemState.isPaused && !systemState.isEmergencyStopped) {
      stocksData.forEach(stock => {
        // Generate realistic price change
        const newPrice = generateRealisticPriceChange(stock.currentPrice, 2);
        
        // Update stock data
        stock.previousPrice = stock.currentPrice;
        stock.currentPrice = newPrice;
        stock.percentageChange = ((newPrice - stock.initialPrice) / stock.initialPrice) * 100;
        stock.lastUpdated = new Date();
        
        // Add to price history and maintain limit
        stock.priceHistory.push({
          timestamp: new Date(),
          price: newPrice
        });
        
        if (stock.priceHistory.length > 30) {
          stock.priceHistory.shift(); // Remove oldest point
        }
      });
    }
  }, systemState.updateIntervalMs);
  
  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    clearInterval(priceUpdateInterval);
    console.log('🛑 Price update interval cleared');
  });
  
  process.on('SIGINT', () => {
    clearInterval(priceUpdateInterval);
    console.log('🛑 Price update interval cleared');
  });
});
