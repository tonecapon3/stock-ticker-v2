const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { clerkMiddleware, requireAuth, getAuth } = require('@clerk/express');
const { createClerkClient } = require('@clerk/backend');

// Price history generation utilities (keeping existing logic)
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

function generateRealisticPriceChange(currentPrice, volatility = 2.0, maxChangePercent = 2) {
  const randomFactor = Math.random();
  let changePercent;
  
  // Apply volatility multiplier
  const volatilityMultiplier = volatility / 2.0; // 2.0 is the default volatility
  
  if (randomFactor < 0.7) {
    changePercent = (Math.random() - 0.5) * 1.0 * volatilityMultiplier; // Small changes
  } else if (randomFactor < 0.9) {
    changePercent = (Math.random() - 0.5) * 3.0 * volatilityMultiplier; // Medium changes
  } else {
    changePercent = (Math.random() - 0.5) * maxChangePercent * 2 * volatilityMultiplier; // Large changes
  }
  
  const newPrice = currentPrice * (1 + changePercent / 100);
  return Math.max(0.01, Math.round(newPrice * 100) / 100);
}

// Load environment variables
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
const ALLOWED_ORIGINS = (process.env.REMOTE_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// Initialize Clerk client
let clerkClient;
if (CLERK_SECRET_KEY && !CLERK_SECRET_KEY.includes('your-actual-secret-key-here')) {
  clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });
  console.log('🔐 Clerk authentication initialized');
} else {
  console.warn('⚠️  Clerk secret key not configured - authentication will be disabled');
}

console.log('🔍 Environment Variables Check:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', process.env.PORT);
console.log('  REMOTE_PORT:', process.env.REMOTE_PORT);
console.log('  CLERK_SECRET_KEY:', CLERK_SECRET_KEY ? '✅ SET (' + CLERK_SECRET_KEY.substring(0, 10) + '...)' : '❌ MISSING');
console.log('  ALLOWED_ORIGINS:', ALLOWED_ORIGINS.length, 'origins');

// Enable CORS
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

app.use(express.json());

// Clerk middleware for authentication
if (clerkClient) {
  app.use(clerkMiddleware());
}

// **USER-SCOPED DATA STORAGE**
// Each user gets their own isolated data
const userDataStore = new Map(); // userId -> userData

// Default stock data template
const getDefaultStocks = () => [
  { symbol: 'BNOX', name: 'Bane&Ox Inc.', basePrice: 185.75 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 176.30 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', basePrice: 415.20 },
];

// Default controls template
const getDefaultControls = () => ({
  isPaused: false,
  updateIntervalMs: 2000,
  volatility: 2.0,
  selectedCurrency: 'USD',
  isEmergencyStopped: false,
  lastUpdated: new Date()
});

// Get or create user data
function getUserData(userId) {
  if (!userDataStore.has(userId)) {
    console.log(`📝 Creating new user data for: ${userId}`);
    
    // Initialize stocks with price history for new user
    const defaultStocks = getDefaultStocks();
    const stocksData = defaultStocks.map(stock => {
      const priceHistory = generateFakePriceHistory(stock.basePrice, 30, 15);
      const mostRecentPrice = priceHistory[priceHistory.length - 1].price;
      
      return {
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: mostRecentPrice,
        previousPrice: priceHistory.length > 1 ? priceHistory[priceHistory.length - 2].price : mostRecentPrice,
        initialPrice: stock.basePrice,
        change: mostRecentPrice - stock.basePrice,
        percentChange: ((mostRecentPrice - stock.basePrice) / stock.basePrice) * 100,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        lastUpdated: new Date(),
        priceHistory: priceHistory,
      };
    });

    const userData = {
      userId: userId,
      stocks: stocksData,
      controls: getDefaultControls(),
      settings: {},
      createdAt: new Date(),
      lastAccessed: new Date()
    };

    userDataStore.set(userId, userData);
    return userData;
  }

  const userData = userDataStore.get(userId);
  userData.lastAccessed = new Date();
  return userData;
}

// Update user stocks data
function updateUserStock(userId, symbol, price) {
  const userData = getUserData(userId);
  const stock = userData.stocks.find(s => s.symbol === symbol.toUpperCase());
  
  if (stock) {
    const previousPrice = stock.currentPrice;
    stock.previousPrice = previousPrice;
    stock.currentPrice = price;
    stock.change = price - stock.initialPrice;
    stock.percentChange = ((price - stock.initialPrice) / stock.initialPrice) * 100;
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
  }
  
  return stock;
}

// Update user controls
function updateUserControls(userId, updates) {
  const userData = getUserData(userId);
  const allowedUpdates = ['isPaused', 'updateIntervalMs', 'volatility', 'selectedCurrency', 'isEmergencyStopped'];
  
  const filteredUpdates = {};
  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  Object.assign(userData.controls, filteredUpdates);
  userData.controls.lastUpdated = new Date();
  
  return userData.controls;
}

// Reset user session (replaces server restart for individual users)
function resetUserSession(userId) {
  console.log(`🔄 Resetting session for user: ${userId}`);
  userDataStore.delete(userId);
  return getUserData(userId); // This will create fresh data
}

// Custom middleware for authentication
function requireAuthWithFallback(req, res, next) {
  if (!clerkClient) {
    return res.status(503).json({ 
      error: 'Authentication service not configured',
      message: 'Clerk authentication is required but not properly configured' 
    });
  }

  return requireAuth()(req, res, next);
}

// Custom middleware to get user information from Clerk
async function enrichUserInfo(req, res, next) {
  try {
    const auth = getAuth(req);
    if (auth.userId && clerkClient) {
      const user = await clerkClient.users.getUser(auth.userId);
      
      req.user = {
        id: auth.userId,
        username: user.username || user.emailAddresses[0]?.emailAddress || 'user',
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        clerkUser: user
      };
    }
    next();
  } catch (error) {
    console.error('Error enriching user info:', error);
    req.user = {
      id: getAuth(req).userId || 'unknown',
      username: 'user'
    };
    next();
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    authentication: clerkClient ? 'clerk' : 'disabled',
    version: '3.0.0',
    userSessions: userDataStore.size
  });
});

// **PUBLIC DEMO ENDPOINTS** - For anonymous users (main stock ticker)
// These endpoints provide shared demo data for non-authenticated users

// Shared demo data for anonymous users
let demoStocksData = null;
let demoControlsData = {
  isPaused: false,
  updateIntervalMs: 2000,
  volatility: 2.0,
  selectedCurrency: 'USD',
  isEmergencyStopped: false,
  lastUpdated: new Date()
};

// Initialize demo data
function initializeDemoData() {
  if (!demoStocksData) {
    const defaultStocks = getDefaultStocks();
    demoStocksData = defaultStocks.map(stock => {
      const priceHistory = generateFakePriceHistory(stock.basePrice, 30, 15);
      const mostRecentPrice = priceHistory[priceHistory.length - 1].price;
      
      return {
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: mostRecentPrice,
        previousPrice: priceHistory.length > 1 ? priceHistory[priceHistory.length - 2].price : mostRecentPrice,
        initialPrice: stock.basePrice,
        change: mostRecentPrice - stock.basePrice,
        percentChange: ((mostRecentPrice - stock.basePrice) / stock.basePrice) * 100,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        lastUpdated: new Date(),
        priceHistory: priceHistory,
      };
    });
    console.log('📊 Demo stock data initialized for anonymous users');
  }
  return demoStocksData;
}

// Update demo stock prices
function updateDemoStockPrices() {
  if (!demoStocksData) return;
  
  if (demoControlsData.isPaused || demoControlsData.isEmergencyStopped) {
    return;
  }

  demoStocksData.forEach(stock => {
    const newPrice = generateRealisticPriceChange(
      stock.currentPrice, 
      demoControlsData.volatility || 2.0
    );
    
    if (newPrice !== stock.currentPrice) {
      stock.previousPrice = stock.currentPrice;
      stock.currentPrice = newPrice;
      stock.change = newPrice - stock.initialPrice;
      stock.percentChange = ((newPrice - stock.initialPrice) / stock.initialPrice) * 100;
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

// Get demo stocks (public endpoint)
app.get('/api/remote/stocks', (req, res) => {
  // Check if request has authentication
  const auth = getAuth(req);
  
  if (auth.userId && clerkClient) {
    // User is authenticated - redirect to authenticated endpoint
    return requireAuthWithFallback(req, res, () => {
      enrichUserInfo(req, res, () => {
        const userData = getUserData(req.user.id);
        res.json({
          success: true,
          stocks: userData.stocks,
          meta: {
            count: userData.stocks.length,
            lastUpdated: userData.lastAccessed,
            userId: req.user.id,
            userScoped: true
          }
        });
      });
    });
  }
  
  // Anonymous user - serve demo data
  try {
    const stocks = initializeDemoData();
    res.json({
      success: true,
      stocks: stocks,
      meta: {
        count: stocks.length,
        lastUpdated: new Date(),
        userScoped: false,
        demo: true
      }
    });
  } catch (error) {
    console.error('Error getting demo stocks:', error);
    res.status(500).json({ error: 'Failed to get demo stocks' });
  }
});

// Get demo controls (public endpoint)
app.get('/api/remote/controls', (req, res) => {
  // Check if request has authentication
  const auth = getAuth(req);
  
  if (auth.userId && clerkClient) {
    // User is authenticated - redirect to authenticated endpoint
    return requireAuthWithFallback(req, res, () => {
      enrichUserInfo(req, res, () => {
        const userData = getUserData(req.user.id);
        res.json({
          success: true,
          controls: userData.controls,
          userScoped: true
        });
      });
    });
  }
  
  // Anonymous user - serve demo controls
  try {
    res.json({
      success: true,
      controls: demoControlsData,
      userScoped: false,
      demo: true
    });
  } catch (error) {
    console.error('Error getting demo controls:', error);
    res.status(500).json({ error: 'Failed to get demo controls' });
  }
});

// **DEMO DATA CONTROL ENDPOINTS** - Allow authenticated users to control shared demo data
// These endpoints let authenticated users control what anonymous users see

// Bulk update demo stocks (authenticated users only)
// IMPORTANT: Place this BEFORE the single stock endpoint to avoid route conflicts
app.put('/api/demo/stocks/bulk', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    const { updateType, percentage } = req.body;

    if (!updateType) {
      return res.status(400).json({ error: 'updateType is required' });
    }

    // Initialize demo data if needed
    initializeDemoData();
    
    let updatedStocks = [];
    const changes = [];

    demoStocksData.forEach((stock) => {
      let newPrice;
      const currentPrice = stock.currentPrice;

      switch (updateType) {
        case 'percentage':
          const pct = percentage || 0;
          newPrice = currentPrice * (1 + pct / 100);
          break;
        case 'simulate':
          newPrice = generateRealisticPriceChange(currentPrice, demoControlsData.volatility);
          break;
        case 'bull':
          newPrice = currentPrice * 1.2; // 20% increase
          break;
        case 'bear':
          newPrice = currentPrice * 0.8; // 20% decrease
          break;
        case 'reset':
          newPrice = stock.initialPrice;
          break;
        default:
          newPrice = currentPrice;
      }

      // Ensure price is within bounds
      newPrice = Math.max(0.01, Math.min(1000000, newPrice));
      
      if (newPrice !== currentPrice) {
        stock.previousPrice = stock.currentPrice;
        stock.currentPrice = newPrice;
        stock.change = newPrice - stock.initialPrice;
        stock.percentChange = ((newPrice - stock.initialPrice) / stock.initialPrice) * 100;
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
        
        changes.push(`${stock.symbol}: ${currentPrice.toFixed(2)} → ${newPrice.toFixed(2)}`);
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
      message: 'Demo data updated - changes visible to all users',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in demo bulk update:', error);
    res.status(500).json({ error: 'Failed to perform demo bulk update' });
  }
});

// Update demo stock price (authenticated users only)
app.put('/api/demo/stocks/:symbol', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    const { symbol } = req.params;
    const { price } = req.body;

    if (typeof price !== 'number' || price <= 0 || price > 1000000) {
      return res.status(400).json({ error: 'Valid price is required (0.01 - 1,000,000)' });
    }

    // Initialize demo data if needed
    initializeDemoData();
    
    // Find and update the demo stock
    const demoStock = demoStocksData.find(s => s.symbol === symbol.toUpperCase());
    
    if (!demoStock) {
      return res.status(404).json({ error: 'Demo stock not found' });
    }

    // Update the demo stock price
    demoStock.previousPrice = demoStock.currentPrice;
    demoStock.currentPrice = price;
    demoStock.change = price - demoStock.initialPrice;
    demoStock.percentChange = ((price - demoStock.initialPrice) / demoStock.initialPrice) * 100;
    demoStock.lastUpdated = new Date();

    // Add to price history
    demoStock.priceHistory.push({
      timestamp: new Date(),
      price: price
    });

    // Keep only last 30 entries
    if (demoStock.priceHistory.length > 30) {
      demoStock.priceHistory.shift();
    }

    res.json({
      success: true,
      stock: demoStock,
      message: `Demo stock ${symbol} updated - visible to all users`,
      updatedBy: req.user.username
    });
  } catch (error) {
    console.error('Error updating demo stock:', error);
    res.status(500).json({ error: 'Failed to update demo stock' });
  }
});

// Update demo controls (authenticated users only)
app.put('/api/demo/controls', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    const allowedUpdates = ['isPaused', 'updateIntervalMs', 'volatility', 'selectedCurrency', 'isEmergencyStopped'];
    const filteredUpdates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = req.body[key];
      }
    });

    Object.assign(demoControlsData, filteredUpdates);
    demoControlsData.lastUpdated = new Date();

    res.json({
      success: true,
      controls: demoControlsData,
      message: 'Demo controls updated - affects all users',
      updatedBy: req.user.username
    });
  } catch (error) {
    console.error('Error updating demo controls:', error);
    res.status(500).json({ error: 'Failed to update demo controls' });
  }
});

// **USER-SCOPED API ENDPOINTS** - For authenticated users only
// Note: GET endpoints for stocks and controls are now handled by the hybrid endpoints above

// Add new stock to user's portfolio
app.post('/api/remote/stocks', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
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

    const userData = getUserData(req.user.id);
    
    if (userData.stocks.some(stock => stock.symbol === symbol)) {
      return res.status(409).json({ error: 'Stock with this symbol already exists in your portfolio' });
    }

    const newStock = {
      symbol: symbol.toUpperCase(),
      name: name.trim(),
      currentPrice: initialPrice,
      previousPrice: initialPrice,
      initialPrice: initialPrice,
      change: 0,
      percentChange: 0,
      volume: Math.floor(Math.random() * 1000000) + 100000,
      lastUpdated: new Date(),
      priceHistory: [{ timestamp: new Date(), price: initialPrice }],
    };

    userData.stocks.push(newStock);

    res.status(201).json({
      success: true,
      stock: newStock,
      message: `Stock ${symbol} added to your portfolio`,
      addedBy: req.user.username
    });
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// Update stock price in user's portfolio
app.put('/api/remote/stocks/:symbol', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    const { symbol } = req.params;
    const { price } = req.body;

    if (typeof price !== 'number' || price <= 0 || price > 1000000) {
      return res.status(400).json({ error: 'Valid price is required (0.01 - 1,000,000)' });
    }

    const updatedStock = updateUserStock(req.user.id, symbol, price);
    
    if (!updatedStock) {
      return res.status(404).json({ error: 'Stock not found in your portfolio' });
    }

    res.json({
      success: true,
      stock: updatedStock,
      message: `Stock ${symbol} updated in your portfolio`,
      updatedBy: req.user.username
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Bulk update stocks in user's portfolio
app.put('/api/remote/stocks/bulk', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    const { updateType, percentage } = req.body;

    if (!updateType) {
      return res.status(400).json({ error: 'updateType is required' });
    }

    const userData = getUserData(req.user.id);
    let updatedStocks = [];
    const changes = [];

    userData.stocks.forEach((stock) => {
      let newPrice;
      const currentPrice = stock.currentPrice;

      switch (updateType) {
        case 'percentage':
          const pct = percentage || 0;
          newPrice = currentPrice * (1 + pct / 100);
          break;
        case 'simulate':
          // Apply user's volatility setting
          newPrice = generateRealisticPriceChange(currentPrice, userData.controls.volatility);
          break;
        case 'bull':
          newPrice = currentPrice * 1.2; // 20% increase
          break;
        case 'bear':
          newPrice = currentPrice * 0.8; // 20% decrease
          break;
        case 'reset':
          newPrice = stock.initialPrice;
          break;
        default:
          newPrice = currentPrice;
      }

      // Ensure price is within bounds
      newPrice = Math.max(0.01, Math.min(1000000, newPrice));
      
      if (newPrice !== currentPrice) {
        updateUserStock(req.user.id, stock.symbol, newPrice);
        changes.push(`${stock.symbol}: ${currentPrice.toFixed(2)} → ${newPrice.toFixed(2)}`);
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

// Delete stock from user's portfolio
app.delete('/api/remote/stocks/:symbol', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    const { symbol } = req.params;
    const userData = getUserData(req.user.id);
    const stockIndex = userData.stocks.findIndex(s => s.symbol === symbol.toUpperCase());

    if (stockIndex === -1) {
      return res.status(404).json({ error: 'Stock not found in your portfolio' });
    }

    const deletedStock = userData.stocks.splice(stockIndex, 1)[0];

    res.json({
      success: true,
      message: `Stock ${symbol} removed from your portfolio`,
      deletedStock: deletedStock,
      deletedBy: req.user.username
    });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

// Note: GET /api/remote/controls is handled by the hybrid endpoint above

// Update user's controls
app.put('/api/remote/controls', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    const updatedControls = updateUserControls(req.user.id, req.body);

    res.json({
      success: true,
      controls: updatedControls,
      message: 'Your controls updated successfully',
      updatedBy: req.user.username
    });
  } catch (error) {
    console.error('Error updating controls:', error);
    res.status(500).json({ error: 'Failed to update controls' });
  }
});

// User info endpoint
app.get('/api/remote/user', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    const userData = getUserData(req.user.id);
    
    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      stats: {
        stockCount: userData.stocks.length,
        portfolioValue: userData.stocks.reduce((sum, stock) => sum + stock.currentPrice, 0),
        lastAccessed: userData.lastAccessed,
        sessionAge: new Date() - userData.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Reset user's session (replaces server restart)
app.post('/api/remote/restart', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    const newUserData = resetUserSession(req.user.id);

    res.json({
      success: true,
      message: 'Your session has been reset with fresh data',
      resetBy: req.user.username,
      timestamp: new Date(),
      newStockCount: newUserData.stocks.length
    });
  } catch (error) {
    console.error('Error resetting user session:', error);
    res.status(500).json({ error: 'Failed to reset session' });
  }
});

// **USER-SPECIFIC PRICE UPDATES**
// Each user's stocks update independently based on their volatility settings
function updateUserPrices() {
  userDataStore.forEach((userData, userId) => {
    if (userData.controls.isPaused || userData.controls.isEmergencyStopped) {
      return;
    }

    userData.stocks.forEach(stock => {
      const newPrice = generateRealisticPriceChange(
        stock.currentPrice, 
        userData.controls.volatility || 2.0
      );
      
      if (newPrice !== stock.currentPrice) {
        stock.previousPrice = stock.currentPrice;
        stock.currentPrice = newPrice;
        stock.change = newPrice - stock.initialPrice;
        stock.percentChange = ((newPrice - stock.initialPrice) / stock.initialPrice) * 100;
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
  });
}

// Start user-specific price updates
setInterval(updateUserPrices, 2000); // Default 2 second updates

// Start demo data updates for anonymous users
setInterval(updateDemoStockPrices, 2000); // Update demo data every 2 seconds

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
  console.log('🚀 Stock Ticker API Server Started (User-Scoped)');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`🔐 Authentication: ${clerkClient ? 'Clerk (Required for all users)' : 'Disabled'}`);
  console.log(`👥 User Sessions: Individual data isolation enabled`);
  console.log(`🎯 Access Level: All authenticated users have equal privileges`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('  GET  /api/health                    - Health check');
  console.log('  GET  /api/remote/stocks             - Get stocks (demo for anonymous, user data for authenticated)');
  console.log('  GET  /api/remote/controls           - Get controls (demo for anonymous, user data for authenticated)');
  console.log('');
  console.log('🎮 Demo Control Endpoints (Authenticated Users):');
  console.log('  PUT  /api/demo/stocks/:symbol       - Update demo stock price (affects all users)');
  console.log('  PUT  /api/demo/stocks/bulk          - Bulk update demo stocks (affects all users)');
  console.log('  PUT  /api/demo/controls             - Update demo controls (affects all users)');
  console.log('');
  console.log('👤 User-Scoped Endpoints (Authenticated Users):');
  console.log('  POST /api/remote/stocks             - Add stock to personal portfolio');
  console.log('  PUT  /api/remote/stocks/:symbol     - Update personal stock price');
  console.log('  PUT  /api/remote/stocks/bulk        - Bulk update personal stocks');
  console.log('  DEL  /api/remote/stocks/:symbol     - Delete personal stock');
  console.log('  PUT  /api/remote/controls           - Update personal controls');
  console.log('  GET  /api/remote/user               - Get user info & stats');
  console.log('  POST /api/remote/restart            - Reset personal session');
  console.log('');
  console.log('🔐 Demo control endpoints allow authenticated users to control what anonymous users see!');
  console.log('📱 Anonymous users see shared demo data, authenticated users can have personal data');
});