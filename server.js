import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express';
import { createClerkClient } from '@clerk/backend';

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

// 🔑 INSTANCE DETECTION MIDDLEWARE
// This is the key component that enables instance-based data isolation
app.use((req, res, next) => {
  const origin = req.get('origin') || req.get('referer') || '';
  
  // Detect instance from origin URL
  if (origin.includes('staging.dv565hju499c6.amplifyapp.com')) {
    req.instanceId = 'staging';
  } else if (origin.includes('main.d7lc7dqjkvbj3.amplifyapp.com')) {
    req.instanceId = 'production';
  } else if (origin.includes('localhost')) {
    req.instanceId = 'development';
  } else {
    req.instanceId = 'unknown';
  }
  
  console.log(`📍 Request from instance: ${req.instanceId} (${origin})`);
  next();
});

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

// 🏗️ INSTANCE + USER SPECIFIC DATA STORAGE
// Key format: "userId_instanceId" for complete isolation
const userSessions = new Map(); // Key: userId_instanceId -> userData

// Initialize default user data
function createDefaultUserData() {
  const stocksData = defaultStockData.map(stock => {
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

  return {
    stocks: stocksData,
    systemState: {
      isPaused: false,
      updateIntervalMs: 1000, // 1 second for smoother updates
      selectedCurrency: 'USD',
      lastUpdated: new Date(),
      isEmergencyStopped: false
    },
    lastActivity: Date.now()
  };
}

// Get or create user session data with instance isolation
function getUserData(userId, instanceId) {
  const sessionKey = `${userId}_${instanceId}`;
  
  if (!userSessions.has(sessionKey)) {
    console.log(`👤 Creating new session for user: ${userId} on instance: ${instanceId}`);
    userSessions.set(sessionKey, createDefaultUserData());
  }
  
  // Update last activity timestamp
  const userData = userSessions.get(sessionKey);
  userData.lastActivity = Date.now();
  
  return userData;
}

// Clean up inactive user sessions (older than 2 hours)
function cleanupInactiveSessions() {
  const maxInactiveTime = 2 * 60 * 60 * 1000; // 2 hours
  const now = Date.now();
  
  for (const [sessionKey, userData] of userSessions.entries()) {
    if (now - userData.lastActivity > maxInactiveTime) {
      console.log(`🧞 Cleaning up inactive session: ${sessionKey}`);
      userSessions.delete(sessionKey);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupInactiveSessions, 30 * 60 * 1000);

// LEGACY GLOBAL DATA (kept for backward compatibility with unauthenticated access)
// Each instance gets its own demo data
const instanceDemoData = new Map(); // instanceId -> demoData

function getInstanceDemoData(instanceId) {
  if (!instanceDemoData.has(instanceId)) {
    console.log(`📊 Creating demo data for instance: ${instanceId}`);
    
    const stocksData = defaultStockData.map(stock => {
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

    instanceDemoData.set(instanceId, {
      stocks: stocksData,
      systemState: {
        isPaused: false,
        updateIntervalMs: 1000,
        selectedCurrency: 'USD',
        lastUpdated: new Date(),
        isEmergencyStopped: false
      }
    });
  }
  
  return instanceDemoData.get(instanceId);
}

// User cache to prevent rate limiting
const userCache = new Map();
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to get cached user or fetch from Clerk
async function getCachedUser(userId) {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
    return cached.user;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    userCache.set(userId, {
      user,
      timestamp: Date.now()
    });
    return user;
  } catch (error) {
    console.error('Error fetching user from Clerk:', error);
    throw error;
  }
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, cached] of userCache.entries()) {
    if (now - cached.timestamp >= USER_CACHE_TTL) {
      userCache.delete(userId);
    }
  }
}, USER_CACHE_TTL); // Clean up every 5 minutes

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

// Custom middleware to get user information from Clerk with caching
async function enrichUserInfo(req, res, next) {
  if (req.isUnauthenticated) {
    return next();
  }

  try {
    const auth = getAuth(req);
    if (auth.userId && clerkClient) {
      // Use cached user data to prevent rate limiting
      const user = await getCachedUser(auth.userId);
      
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
    
    // Handle rate limiting gracefully
    if (error.status === 429) {
      console.warn('⚠️ Clerk rate limit reached, using basic auth info');
    }
    
    // Don't fail the request, just continue with basic auth info
    req.user = {
      id: getAuth(req).userId || 'unknown',
      username: 'user',
      role: 'admin' // Still grant admin role for authenticated users
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
    version: '2.0.0-instance-isolated',
    totalSessions: userSessions.size,
    instancesActive: instanceDemoData.size
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
      version: '2.0.0-instance-isolated',
      server: 'stock-ticker-backend-isolated'
    }
  });
});

// 📊 INSTANCE-ISOLATED STOCK ENDPOINTS
app.get('/api/remote/stocks', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    let stocks, isUserSpecific = false;
    const instanceId = req.instanceId || 'unknown';
    
    if (req.isUnauthenticated) {
      // Unauthenticated users get instance-specific demo data
      const demoData = getInstanceDemoData(instanceId);
      stocks = demoData.stocks;
      console.log(`👥 Serving ${instanceId} demo data to unauthenticated user`);
    } else {
      // Authenticated users get their own isolated data per instance
      const userData = getUserData(req.user.id, instanceId);
      stocks = userData.stocks;
      isUserSpecific = true;
      console.log(`🔒 Serving ${instanceId} data to user: ${req.user.username} (${stocks.length} stocks)`);
    }
    
    const response = {
      success: true,
      stocks: stocks,
      meta: {
        count: stocks.length,
        lastUpdated: new Date(),
        authRequired: false,
        userSpecific: isUserSpecific,
        instanceId: instanceId,
        userId: req.isUnauthenticated ? null : req.user.id,
        sessionKey: req.isUnauthenticated ? null : `${req.user.id}_${instanceId}`
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// Instance-isolated controls endpoint
app.get('/api/remote/controls', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    let controls;
    const instanceId = req.instanceId || 'unknown';
    
    if (req.isUnauthenticated) {
      // Unauthenticated users get instance-specific demo data
      const demoData = getInstanceDemoData(instanceId);
      controls = demoData.systemState;
      console.log(`👥 Serving ${instanceId} demo controls to unauthenticated user`);
    } else {
      // Authenticated users get their own isolated data per instance
      const userData = getUserData(req.user.id, instanceId);
      controls = userData.systemState;
      console.log(`🔒 Serving ${instanceId} controls to user: ${req.user.username}`);
    }
    
    const response = {
      success: true,
      controls: controls,
      meta: {
        instanceId: instanceId,
        userId: req.isUnauthenticated ? null : req.user.id,
        userSpecific: !req.isUnauthenticated
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching controls:', error);
    res.status(500).json({ error: 'Failed to fetch controls' });
  }
});

// Get session info endpoint (for debugging)
app.get('/api/remote/session-info', requireAuthWithFallback, enrichUserInfo, (req, res) => {
  try {
    const instanceId = req.instanceId || 'unknown';
    
    if (req.isUnauthenticated) {
      return res.json({
        success: true,
        instanceId: instanceId,
        authenticated: false,
        message: 'Unauthenticated session - using demo data'
      });
    }

    const sessionKey = `${req.user.id}_${instanceId}`;
    const userData = getUserData(req.user.id, instanceId);
    
    res.json({
      success: true,
      instanceId: instanceId,
      authenticated: true,
      userId: req.user.id,
      username: req.user.username,
      sessionKey: sessionKey,
      stockCount: userData.stocks.length,
      lastActivity: new Date(userData.lastActivity),
      message: `Authenticated session for ${instanceId} instance`
    });
  } catch (error) {
    console.error('Error getting session info:', error);
    res.status(500).json({ error: 'Failed to get session info' });
  }
});

// Root route - API status
app.get('/', (req, res) => {
  res.json({
    name: 'Stock Ticker API',
    version: '2.0.0-instance-isolated',
    status: 'running',
    endpoints: {
      health: '/api/health',
      legacyHealth: '/status/health',
      stocks: '/api/remote/stocks',
      controls: '/api/remote/controls',
      sessionInfo: '/api/remote/session-info'
    },
    features: [
      'Instance-based data isolation',
      'Clerk authentication with fallback',
      'User-specific data storage',
      'Automatic session cleanup'
    ],
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Stock Ticker API v2.0.0',
    instanceIsolation: true,
    authentication: clerkClient ? 'enabled' : 'disabled',
    endpoints: {
      health: 'GET /api/health',
      stocks: 'GET /api/remote/stocks',
      controls: 'GET /api/remote/controls',
      sessionInfo: 'GET /api/remote/session-info'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Stock Ticker API Server Started (Instance Isolated)');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`🔐 Authentication: ${clerkClient ? 'Clerk (Required for admin features)' : 'Disabled'}`);
  console.log(`🏷️  Instance Isolation: Enabled`);
  console.log(`👥 Session Storage: User + Instance specific`);
  console.log(`🔄 Session Cleanup: Every 30 minutes`);
  console.log('');
  console.log('📊 Instance Detection:');
  console.log('  • production: main.d7lc7dqjkvbj3.amplifyapp.com');
  console.log('  • staging: staging.dv565hju499c6.amplifyapp.com');
  console.log('  • development: localhost');
  console.log('');
  console.log('🔒 Data Isolation:');
  console.log('  • Each user gets separate data per instance');
  console.log('  • Production and staging are completely isolated');
  console.log('  • Session key format: userId_instanceId');
  console.log('');
  console.log('✨ Ready to serve isolated data to both instances!');
});