const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Import Clerk middleware from the correct package
const { clerkMiddleware, requireAuth } = require('@clerk/express');
const dotenv = require('dotenv');
const path = require('path');

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

// Load environment variables
if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Production mode: Using environment variables');
} else {
  console.log('🔧 Development mode: Loading from .env.local');
  dotenv.config({ path: '.env.local' });
}

const app = express();
const PORT = process.env.PORT || process.env.REMOTE_PORT || 3001;

// Security Configuration
const JWT_SECRET = process.env.REMOTE_JWT_SECRET;
const API_KEY = process.env.REMOTE_API_KEY;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const ALLOWED_ORIGINS = (process.env.REMOTE_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// Debug: Log environment variable status
console.log('🔍 Hybrid Server Environment Variables Check:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  JWT_SECRET:', JWT_SECRET ? '✅ SET' : '❌ MISSING');
console.log('  CLERK_SECRET_KEY:', CLERK_SECRET_KEY ? '✅ SET' : '❌ MISSING');
console.log('  CLERK_PUBLISHABLE_KEY:', CLERK_PUBLISHABLE_KEY ? '✅ SET' : '❌ MISSING');
console.log('  API_KEY:', API_KEY ? '✅ SET' : '❌ MISSING');

// Validate environment variables
if (!JWT_SECRET && !CLERK_SECRET_KEY) {
  console.error('❌ Either REMOTE_JWT_SECRET or CLERK_SECRET_KEY is required');
  process.exit(1);
}

if (CLERK_SECRET_KEY && !CLERK_PUBLISHABLE_KEY) {
  console.error('❌ CLERK_PUBLISHABLE_KEY is required when using Clerk authentication');
  process.exit(1);
}

if (JWT_SECRET && JWT_SECRET.length < 32) {
  console.error('❌ REMOTE_JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

// Initialize Clerk if available
if (CLERK_SECRET_KEY && CLERK_PUBLISHABLE_KEY) {
  console.log('🛡️ Clerk authentication enabled');
  app.use(clerkMiddleware({
    publishableKey: CLERK_PUBLISHABLE_KEY,
    secretKey: CLERK_SECRET_KEY,
  }));
} else if (CLERK_SECRET_KEY && !CLERK_PUBLISHABLE_KEY) {
  console.log('⚠️ Clerk secret key found but publishable key missing');
}

// Enable CORS
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

app.use(express.json());

// User management for JWT authentication
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

// Mock stock data
const defaultStockData = [
  { symbol: 'BNOX', name: 'Bane&Ox Inc.', basePrice: 185.75 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 176.30 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', basePrice: 415.20 },
];

// Initialize stocks with price history
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

// System state
let systemState = {
  isPaused: false,
  updateIntervalMs: 1000,
  selectedCurrency: 'USD',
  lastUpdated: new Date(),
  isEmergencyStopped: false
};

// Hybrid authentication middleware
function hybridAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required', 
      authType: 'hybrid',
      supportedMethods: ['jwt', 'clerk']
    });
  }

  // Try Clerk authentication first (if available)
  if (CLERK_SECRET_KEY && CLERK_PUBLISHABLE_KEY && req.auth) {
    try {
      const { userId, user } = req.auth;
      if (userId) {
        // User is authenticated with Clerk
        req.user = {
          id: userId,
          username: user?.username || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || userId,
          role: user?.publicMetadata?.role || 'user',
          authMethod: 'clerk'
        };
        
        console.log('✅ Clerk authentication successful for user:', req.user.id);
        return next();
      }
    } catch (clerkError) {
      console.log('🔄 Clerk auth failed, trying JWT...', clerkError.message);
      // Fall through to JWT authentication
    }
  }

  // Try JWT authentication
  if (JWT_SECRET) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err && decoded) {
        // JWT authentication successful
        req.user = {
          ...decoded,
          authMethod: 'jwt'
        };
        
        console.log('✅ JWT authentication successful for user:', req.user.username);
        return next();
      }
      
      // Both authentication methods failed
      console.log('❌ Both Clerk and JWT authentication failed');
      return res.status(403).json({ 
        error: 'Authentication failed', 
        details: 'Invalid token for both JWT and Clerk authentication',
        authType: 'hybrid'
      });
    });
  } else {
    // Only Clerk was available and it failed
    return res.status(403).json({ 
      error: 'Authentication failed', 
      details: 'Clerk authentication failed and JWT not configured',
      authType: 'clerk-only'
    });
  }
}

// Role-based authorization middleware
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Insufficient permissions', 
        required: allowedRoles,
        current: userRole
      });
    }
    
    next();
  };
}

// Authentication endpoints

// JWT Login endpoint
app.post('/api/remote/auth', async (req, res) => {
  console.log('🔐 JWT Login attempt');
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password required',
        authMethod: 'jwt'
      });
    }
    
    // Find user
    const user = USERS.find(u => u.username === username);
    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        authMethod: 'jwt'
      });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', username);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        authMethod: 'jwt'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ JWT Login successful for user:', username);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      authMethod: 'jwt'
    });
    
  } catch (error) {
    console.error('JWT login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      details: error.message,
      authMethod: 'jwt'
    });
  }
});

// Token verification endpoint
app.get('/api/remote/auth', hybridAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username || req.user.id,
      role: req.user.role
    },
    authMethod: req.user.authMethod,
    timestamp: new Date()
  });
});

// Protected endpoints

// Get stocks (read-only access)
app.get('/api/remote/stocks', hybridAuth, (req, res) => {
  console.log(`📊 Stocks requested by ${req.user.username} (${req.user.authMethod})`);
  
  res.json({
    success: true,
    stocks: stocksData,
    authMethod: req.user.authMethod
  });
});

// Add new stock (requires controller or admin role)
app.post('/api/remote/stocks', hybridAuth, requireRole(['controller', 'admin']), (req, res) => {
  const { symbol, name, initialPrice } = req.body;
  
  console.log(`📈 Adding new stock ${symbol} by ${req.user.username} (${req.user.authMethod})`);
  
  // Validation
  if (!symbol || !name || !initialPrice) {
    return res.status(400).json({ 
      error: 'Symbol, name, and initial price are required',
      authMethod: req.user.authMethod
    });
  }
  
  if (!/^[A-Z]{1,5}$/.test(symbol)) {
    return res.status(400).json({ 
      error: 'Symbol must be 1-5 uppercase letters',
      authMethod: req.user.authMethod
    });
  }
  
  if (isNaN(initialPrice) || initialPrice <= 0 || initialPrice > 1000000) {
    return res.status(400).json({ 
      error: 'Initial price must be between 0.01 and 1,000,000',
      authMethod: req.user.authMethod
    });
  }
  
  // Check if stock already exists
  if (stocksData.some(stock => stock.symbol === symbol)) {
    return res.status(409).json({ 
      error: 'Stock with this symbol already exists',
      authMethod: req.user.authMethod
    });
  }
  
  // Create new stock
  const newStock = {
    symbol: symbol.toUpperCase(),
    name: name.trim(),
    currentPrice: parseFloat(initialPrice),
    previousPrice: parseFloat(initialPrice),
    initialPrice: parseFloat(initialPrice),
    percentageChange: 0,
    lastUpdated: new Date(),
    priceHistory: [{
      timestamp: new Date(),
      price: parseFloat(initialPrice)
    }]
  };
  
  // Add to stocks array
  stocksData.push(newStock);
  
  console.log(`✅ Stock ${symbol} added successfully by ${req.user.username}`);
  
  res.status(201).json({
    success: true,
    stock: newStock,
    message: `Stock ${symbol} added successfully`,
    authMethod: req.user.authMethod
  });
});

// Bulk stock operations (requires controller or admin role)
app.put('/api/remote/stocks/bulk', hybridAuth, requireRole(['controller', 'admin']), (req, res) => {
  const { updateType, percentage } = req.body;
  
  console.log(`🚀 Bulk operation ${updateType} by ${req.user.username} (${req.user.authMethod})`);
  
  if (!updateType) {
    return res.status(400).json({ 
      error: 'updateType is required',
      authMethod: req.user.authMethod
    });
  }
  
  let updatedStocks = [];
  const changes = [];
  
  stocksData.forEach((stock) => {
    let newPrice;
    const currentPrice = stock.currentPrice;
    
    switch (updateType) {
      case 'percentage':
        const pct = percentage || 0;
        newPrice = currentPrice * (1 + pct / 100);
        break;
      case 'random':
      case 'simulate':
        // Random fluctuation between -5% and +5%
        const randomPct = (Math.random() * 10) - 5;
        newPrice = currentPrice * (1 + randomPct / 100);
        break;
      case 'reset':
        newPrice = stock.initialPrice;
        break;
      case 'bull':
      case 'market_boom':
        newPrice = currentPrice * 1.2; // 20% increase
        break;
      case 'bear':
      case 'market_crash':
        newPrice = currentPrice * 0.8; // 20% decrease
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
      stock.percentageChange = ((newPrice - stock.initialPrice) / stock.initialPrice) * 100;
      stock.lastUpdated = new Date();
      
      // Add to price history
      stock.priceHistory.push({
        timestamp: new Date(),
        price: newPrice
      });
      
      // Keep only last 100 points
      if (stock.priceHistory.length > 100) {
        stock.priceHistory = stock.priceHistory.slice(-100);
      }
      
      changes.push(`${stock.symbol}: ${previousPrice.toFixed(2)} → ${newPrice.toFixed(2)}`);
      updatedStocks.push(stock.symbol);
    }
  });
  
  console.log(`✅ Bulk ${updateType} completed - updated ${updatedStocks.length} stocks`);
  
  res.json({
    success: true,
    updatedCount: updatedStocks.length,
    updatedStocks: updatedStocks,
    changes: changes,
    updateType: updateType,
    percentage: percentage,
    updatedBy: req.user.username,
    authMethod: req.user.authMethod,
    timestamp: new Date()
  });
});

// Get system controls
app.get('/api/remote/controls', hybridAuth, (req, res) => {
  console.log(`⚙️ Controls requested by ${req.user.username} (${req.user.authMethod})`);
  
  res.json({
    success: true,
    controls: systemState,
    authMethod: req.user.authMethod
  });
});

// Update system controls (requires controller or admin role)
app.put('/api/remote/controls', hybridAuth, requireRole(['controller', 'admin']), (req, res) => {
  const updates = req.body;
  
  console.log(`🔧 Controls update by ${req.user.username} (${req.user.authMethod}):`, updates);
  
  const changes = [];
  
  // Validate and update isPaused
  if (updates.isPaused !== undefined) {
    if (typeof updates.isPaused !== 'boolean') {
      return res.status(400).json({ 
        error: 'isPaused must be a boolean',
        authMethod: req.user.authMethod
      });
    }
    const oldState = systemState.isPaused;
    systemState.isPaused = updates.isPaused;
    changes.push(`System ${updates.isPaused ? 'paused' : 'resumed'} (was ${oldState ? 'paused' : 'running'})`);
  }
  
  // Validate and update updateIntervalMs
  if (updates.updateIntervalMs !== undefined) {
    if (typeof updates.updateIntervalMs !== 'number' || updates.updateIntervalMs < 100 || updates.updateIntervalMs > 10000) {
      return res.status(400).json({ 
        error: 'updateIntervalMs must be a number between 100 and 10000',
        authMethod: req.user.authMethod
      });
    }
    const oldInterval = systemState.updateIntervalMs;
    systemState.updateIntervalMs = updates.updateIntervalMs;
    changes.push(`Update interval changed from ${oldInterval}ms to ${updates.updateIntervalMs}ms`);
  }
  
  // Validate and update selectedCurrency
  if (updates.selectedCurrency !== undefined) {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'CHF', 'INR'];
    if (typeof updates.selectedCurrency !== 'string' || !validCurrencies.includes(updates.selectedCurrency)) {
      return res.status(400).json({ 
        error: `selectedCurrency must be one of: ${validCurrencies.join(', ')}`,
        authMethod: req.user.authMethod
      });
    }
    const oldCurrency = systemState.selectedCurrency;
    systemState.selectedCurrency = updates.selectedCurrency;
    changes.push(`Currency changed from ${oldCurrency} to ${updates.selectedCurrency}`);
  }
  
  // Validate and update volatility
  if (updates.volatility !== undefined) {
    if (typeof updates.volatility !== 'number' || updates.volatility < 0.1 || updates.volatility > 10.0) {
      return res.status(400).json({ 
        error: 'volatility must be a number between 0.1 and 10.0',
        authMethod: req.user.authMethod
      });
    }
    const oldVolatility = systemState.volatility;
    systemState.volatility = updates.volatility;
    changes.push(`Volatility changed from ${oldVolatility}% to ${updates.volatility}%`);
  }
  
  // Validate and update emergency stop
  if (updates.isEmergencyStopped !== undefined) {
    if (typeof updates.isEmergencyStopped !== 'boolean') {
      return res.status(400).json({ 
        error: 'isEmergencyStopped must be a boolean',
        authMethod: req.user.authMethod
      });
    }
    systemState.isEmergencyStopped = updates.isEmergencyStopped;
    if (updates.isEmergencyStopped) {
      systemState.isPaused = true; // Emergency stop also pauses
    }
    changes.push(`Emergency stop ${updates.isEmergencyStopped ? 'activated' : 'deactivated'}`);
  }
  
  if (changes.length === 0) {
    return res.status(400).json({ 
      error: 'No valid update fields provided',
      authMethod: req.user.authMethod
    });
  }
  
  systemState.lastUpdated = new Date();
  
  console.log(`✅ Controls updated by ${req.user.username}: ${changes.join(', ')}`);
  
  res.json({
    success: true,
    controls: systemState,
    changes: changes,
    updatedBy: req.user.username,
    authMethod: req.user.authMethod,
    timestamp: new Date()
  });
});

// Update individual stock (requires controller or admin role)
app.put('/api/remote/stocks/:symbol', hybridAuth, requireRole(['controller', 'admin']), (req, res) => {
  const { symbol } = req.params;
  const { price } = req.body;
  
  console.log(`💰 Stock update for ${symbol} by ${req.user.username} (${req.user.authMethod}): ${price}`);
  
  if (!price || isNaN(price) || price <= 0) {
    return res.status(400).json({ 
      error: 'Valid price required',
      authMethod: req.user.authMethod
    });
  }
  
  const stock = stocksData.find(s => s.symbol === symbol.toUpperCase());
  if (!stock) {
    return res.status(404).json({ 
      error: 'Stock not found',
      authMethod: req.user.authMethod
    });
  }
  
  stock.previousPrice = stock.currentPrice;
  stock.currentPrice = parseFloat(price);
  stock.percentageChange = ((stock.currentPrice - stock.initialPrice) / stock.initialPrice) * 100;
  stock.lastUpdated = new Date();
  
  // Add to price history
  stock.priceHistory.push({
    timestamp: new Date(),
    price: stock.currentPrice
  });
  
  // Keep only last 100 points
  if (stock.priceHistory.length > 100) {
    stock.priceHistory = stock.priceHistory.slice(-100);
  }
  
  res.json({
    success: true,
    stock,
    authMethod: req.user.authMethod
  });
});

// Update stock price (legacy endpoint - requires controller or admin role)
app.put('/api/remote/stocks/:symbol/price', hybridAuth, requireRole(['controller', 'admin']), (req, res) => {
  const { symbol } = req.params;
  const { price } = req.body;
  
  console.log(`💰 Price update for ${symbol} by ${req.user.username} (${req.user.authMethod}): ${price}`);
  
  if (!price || isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'Valid price required' });
  }
  
  const stock = stocksData.find(s => s.symbol === symbol);
  if (!stock) {
    return res.status(404).json({ error: 'Stock not found' });
  }
  
  stock.previousPrice = stock.currentPrice;
  stock.currentPrice = parseFloat(price);
  stock.percentageChange = ((stock.currentPrice - stock.initialPrice) / stock.initialPrice) * 100;
  stock.lastUpdated = new Date();
  
  // Add to price history
  stock.priceHistory.push({
    timestamp: new Date(),
    price: stock.currentPrice
  });
  
  // Keep only last 100 points
  if (stock.priceHistory.length > 100) {
    stock.priceHistory = stock.priceHistory.slice(-100);
  }
  
  res.json({
    success: true,
    stock,
    authMethod: req.user.authMethod
  });
});

// Delete stock (admin role required for hybrid system)
app.delete('/api/remote/stocks/:symbol', hybridAuth, requireRole('admin'), (req, res) => {
  const { symbol } = req.params;
  
  console.log(`🗑️ Deleting stock ${symbol} by ${req.user.username} (${req.user.authMethod})`);
  
  const index = stocksData.findIndex(s => s.symbol === symbol);
  if (index === -1) {
    return res.status(404).json({ error: 'Stock not found' });
  }
  
  const deletedStock = stocksData.splice(index, 1)[0];
  
  res.json({
    success: true,
    deletedStock,
    authMethod: req.user.authMethod
  });
});

// Server info endpoint (public)
app.get('/api/remote/info', (req, res) => {
  res.json({
    success: true,
    server: 'Hybrid Stock Ticker API',
    version: '1.0.0',
    authentication: {
      jwt: Boolean(JWT_SECRET),
      clerk: Boolean(CLERK_SECRET_KEY),
      hybrid: Boolean(JWT_SECRET && CLERK_SECRET_KEY)
    },
    timestamp: new Date()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    authentication: {
      jwt: Boolean(JWT_SECRET),
      clerk: Boolean(CLERK_SECRET_KEY)
    }
  });
});

// Legacy health check endpoint for render.yaml compatibility
app.get('/status/health', (req, res) => {
  res.json({
    success: true,
    health: 'healthy',
    checks: {
      api: 'ok',
      responseTime: 0,
      timestamp: new Date().toISOString(),
      version: '1.0.0-hybrid',
      server: 'stock-ticker-backend-hybrid'
    },
    authentication: {
      jwt: Boolean(JWT_SECRET),
      clerk: Boolean(CLERK_SECRET_KEY)
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Hybrid Stock Ticker API Server running on port ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Authentication methods: ${JWT_SECRET ? 'JWT' : ''} ${CLERK_SECRET_KEY ? 'Clerk' : ''}`);
  console.log(`🌍 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

// Price update simulation (for development)
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    if (!systemState.isPaused && !systemState.isEmergencyStopped) {
      stocksData = stocksData.map(stock => {
        const newPrice = generateRealisticPriceChange(stock.currentPrice);
        
        const updatedStock = {
          ...stock,
          previousPrice: stock.currentPrice,
          currentPrice: newPrice,
          percentageChange: ((newPrice - stock.initialPrice) / stock.initialPrice) * 100,
          lastUpdated: new Date(),
        };
        
        // Add to price history
        updatedStock.priceHistory.push({
          timestamp: new Date(),
          price: newPrice
        });
        
        // Keep only last 100 points
        if (updatedStock.priceHistory.length > 100) {
          updatedStock.priceHistory = updatedStock.priceHistory.slice(-100);
        }
        
        return updatedStock;
      });
    }
  }, systemState.updateIntervalMs);
}

module.exports = app;
