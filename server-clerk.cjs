const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { clerkMiddleware, requireAuth, getAuth } = require('@clerk/express');
const { createClerkClient } = require('@clerk/backend');

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
} else {
  console.log('🔧 Development mode: Loading from .env.local');
  dotenv.config({ path: '.env.local' });
}

const app = express();
const PORT = process.env.PORT || process.env.REMOTE_PORT || 3001;

// Clerk Configuration
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const ALLOWED_ORIGINS = (process.env.REMOTE_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// Initialize Clerk client
let clerkClient;
if (CLERK_SECRET_KEY && !CLERK_SECRET_KEY.includes('your-actual-secret-key-here') && 
    CLERK_PUBLISHABLE_KEY && !CLERK_PUBLISHABLE_KEY.includes('your-publishable-key-here')) {
  clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });
  console.log('🔐 Clerk authentication initialized');
} else {
  console.warn('⚠️  Clerk keys not configured - authentication will be disabled');
}

// Debug: Log environment variable status
console.log('🔍 Environment Variables Check:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', process.env.PORT);
console.log('  REMOTE_PORT:', process.env.REMOTE_PORT);
console.log('  CLERK_SECRET_KEY:', CLERK_SECRET_KEY ? '✅ SET (' + CLERK_SECRET_KEY.substring(0, 10) + '...)' : '❌ MISSING');
console.log('  CLERK_PUBLISHABLE_KEY:', CLERK_PUBLISHABLE_KEY ? '✅ SET (' + CLERK_PUBLISHABLE_KEY.substring(0, 10) + '...)' : '❌ MISSING');
console.log('  ALLOWED_ORIGINS:', ALLOWED_ORIGINS.length, 'origins');

// Enable CORS for frontend with environment-based origins
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

app.use(express.json());

// Clerk middleware for authentication
if (clerkClient && CLERK_PUBLISHABLE_KEY) {
  app.use(clerkMiddleware({
    publishableKey: CLERK_PUBLISHABLE_KEY,
    secretKey: CLERK_SECRET_KEY
  }));
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

// Custom middleware to handle authentication for API routes
function requireAuthWithFallback(req, res, next) {
  if (!clerkClient) {
    // If Clerk is not configured, allow requests but mark as unauthenticated
    req.user = { id: 'anonymous', username: 'anonymous', role: 'read-only' };
    req.isUnauthenticated = true;
    return next();
  }

  // Use Clerk's requireAuth for authenticated routes
  return requireAuth()(req, res, next);
}

// Custom middleware to get user information from Clerk
async function enrichUserInfo(req, res, next) {
  if (req.isUnauthenticated) {
    return next();
  }

  try {
    const auth = getAuth(req);
    if (auth.userId && clerkClient) {
      const user = await clerkClient.users.getUser(auth.userId);
      
      // Extract user information
      req.user = {
        id: auth.userId,
        username: user.username || user.emailAddresses[0]?.emailAddress || 'user',
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        // All authenticated users get admin privileges
        role: 'admin',
        clerkUser: user
      };
    }
    next();
  } catch (error) {
    console.error('Error enriching user info:', error);
    // Don't fail the request, just continue with basic auth info
    req.user = {
      id: getAuth(req).userId || 'unknown',
      username: 'user',
      role: 'user'
    };
    next();
  }
}

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    authentication: clerkClient ? 'clerk' : 'disabled',
    version: '2.0.0'
  });
});

// Stock endpoints - Public read access, authenticated write access
app.get('/api/remote/stocks', (req, res) => {
  // Allow unauthenticated read access for main app synchronization
  const response = {
    success: true,
    stocks: stocksData,
    meta: {
      count: stocksData.length,
      lastUpdated: new Date(),
      authRequired: false
    }
  };
  
  res.json(response);
});

// Protected endpoints requiring authentication
app.post('/api/remote/stocks', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    if (req.isUnauthenticated) {
      return res.status(401).json({ error: 'Authentication required to add stocks' });
    }

    // All authenticated users can add stocks (no role restriction)

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

// Update individual stock price
app.put('/api/remote/stocks/:symbol', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    if (req.isUnauthenticated) {
      return res.status(401).json({ error: 'Authentication required to update stocks' });
    }

    // All authenticated users can update stocks (no role restriction)

    const { symbol } = req.params;
    const { price } = req.body;

    if (typeof price !== 'number' || price <= 0 || price > 1000000) {
      return res.status(400).json({ error: 'Valid price is required (0.01 - 1,000,000)' });
    }

    const stock = stocksData.find(s => s.symbol === symbol.toUpperCase());
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const previousPrice = stock.currentPrice;
    stock.previousPrice = previousPrice;
    stock.currentPrice = price;
    stock.percentageChange = ((price - stock.initialPrice) / stock.initialPrice) * 100;
    stock.lastUpdated = new Date();

    // Add to price history
    stock.priceHistory.push({
      timestamp: new Date(),
      price: price
    });

    // Keep only last 30 entries
    if (stock.priceHistory.length > 30) {
      stock.priceHistory.shift();
    }

    res.json({
      success: true,
      stock: stock,
      message: `Stock ${symbol} updated successfully`,
      updatedBy: req.user.username
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Bulk price update endpoint
app.put('/api/remote/stocks/bulk', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    if (req.isUnauthenticated) {
      return res.status(401).json({ error: 'Authentication required for bulk updates' });
    }

    // All authenticated users can perform bulk updates (no role restriction)

    const { updateType, percentage } = req.body;

    if (!updateType) {
      return res.status(400).json({ error: 'updateType is required' });
    }

    let updatedStocks = [];
    const changes = [];

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
        stock.percentageChange = ((newPrice - stock.initialPrice) / stock.initialPrice) * 100;
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

    res.json({
      success: true,
      updatedCount: updatedStocks.length,
      updatedStocks: updatedStocks,
      changes: changes,
      updateType: updateType,
      percentage: percentage,
      updatedBy: req.user.username,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ error: 'Failed to perform bulk update' });
  }
});

// Delete stock endpoint
app.delete('/api/remote/stocks/:symbol', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    if (req.isUnauthenticated) {
      return res.status(401).json({ error: 'Authentication required to remove stocks' });
    }

    // Allow all authenticated users to remove stocks
    // No additional role check needed - authentication is already verified above

    const { symbol } = req.params;
    const stockIndex = stocksData.findIndex(s => s.symbol === symbol.toUpperCase());

    if (stockIndex === -1) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const deletedStock = stocksData.splice(stockIndex, 1)[0];

    res.json({
      success: true,
      message: `Stock ${symbol} removed successfully`,
      removedStock: deletedStock,
      removedBy: req.user.username
    });
  } catch (error) {
    console.error('Error removing stock:', error);
    res.status(500).json({ error: 'Failed to remove stock' });
  }
});

// System controls endpoints
app.get('/api/remote/controls', (req, res) => {
  res.json({
    success: true,
    controls: systemState
  });
});

app.put('/api/remote/controls', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    if (req.isUnauthenticated) {
      return res.status(401).json({ error: 'Authentication required to update controls' });
    }

    const allowedUpdates = ['isPaused', 'updateIntervalMs', 'selectedCurrency', 'isEmergencyStopped'];
    const updates = {};

    // Validate and filter updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    // Apply updates
    Object.assign(systemState, updates);
    systemState.lastUpdated = new Date();

    res.json({
      success: true,
      controls: systemState,
      message: 'Controls updated successfully',
      updatedBy: req.user.username
    });
  } catch (error) {
    console.error('Error updating controls:', error);
    res.status(500).json({ error: 'Failed to update controls' });
  }
});

// Authentication verification endpoint for Clerk tokens
app.get('/api/remote/auth', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  if (req.isUnauthenticated) {
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required',
      message: 'Valid Clerk token required'
    });
  }

  res.json({
    success: true,
    authenticated: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role
    },
    message: 'Authentication successful'
  });
});

// User info endpoint
app.get('/api/remote/user', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  if (req.isUnauthenticated) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role
    }
  });
});

// Server restart endpoint (admin only)
app.post('/api/remote/restart', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    if (req.isUnauthenticated) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // All authenticated users can request server restart (no role restriction)

    res.json({
      success: true,
      message: 'Server restart initiated',
      restartedBy: req.user.username,
      timestamp: new Date()
    });

    // Simulate restart delay
    setTimeout(() => {
      console.log(`🔄 Server restart initiated by ${req.user.username}`);
      // In a real scenario, you might trigger a process restart here
      // process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('Error initiating restart:', error);
    res.status(500).json({ error: 'Failed to initiate restart' });
  }
});

// Price update simulation (runs automatically)
function updatePrices() {
  if (systemState.isPaused || systemState.isEmergencyStopped) {
    return;
  }

  stocksData.forEach(stock => {
    const newPrice = generateRealisticPriceChange(stock.currentPrice);
    
    if (newPrice !== stock.currentPrice) {
      stock.previousPrice = stock.currentPrice;
      stock.currentPrice = newPrice;
      stock.percentageChange = ((newPrice - stock.initialPrice) / stock.initialPrice) * 100;
      stock.lastUpdated = new Date();

      // Add to price history
      stock.priceHistory.push({
        timestamp: new Date(),
        price: newPrice
      });

      // Keep only last 30 entries
      if (stock.priceHistory.length > 30) {
        stock.priceHistory.shift();
      }
    }
  });
}

// Start price updates
setInterval(updatePrices, systemState.updateIntervalMs);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Stock Ticker API Server Started');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`🔐 Authentication: ${clerkClient ? 'Clerk (Enabled)' : 'Disabled (Development only)'}`)
  console.log(`📊 Default stocks loaded: ${stocksData.length}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('  GET  /api/health                    - Health check');
  console.log('  GET  /api/remote/auth               - Verify Clerk token (auth)');
  console.log('  GET  /api/remote/stocks             - Get all stocks (public)');
  console.log('  POST /api/remote/stocks             - Add new stock (auth)');
  console.log('  PUT  /api/remote/stocks/:symbol     - Update stock price (auth)');
  console.log('  PUT  /api/remote/stocks/bulk        - Bulk update (auth)');
  console.log('  DEL  /api/remote/stocks/:symbol     - Delete stock (auth)');
  console.log('  GET  /api/remote/controls           - Get system controls');
  console.log('  PUT  /api/remote/controls           - Update controls (auth)');
  console.log('  GET  /api/remote/user               - Get user info (auth)');
  console.log('  POST /api/remote/restart            - Restart server (auth)');
  console.log('');
  
  if (!clerkClient) {
    console.log('⚠️  WARNING: Authentication is disabled!');
    console.log('   Set CLERK_SECRET_KEY in your environment to enable Clerk authentication.');
    console.log('   Current mode: Development/Testing only');
  }
});
