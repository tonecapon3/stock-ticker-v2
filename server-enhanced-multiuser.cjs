const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || process.env.REMOTE_PORT || 3001;

// Configuration
const JWT_SECRET = process.env.REMOTE_JWT_SECRET || 'your-super-secure-jwt-secret-key-at-least-32-characters';
const ALLOWED_ORIGINS = (process.env.REMOTE_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// Rate limiting (more permissive for development)
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs (more permissive)
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many API requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-Device-Fingerprint']
}));

app.use(express.json());

console.log('🔍 Server Configuration:');
console.log('  JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');
console.log('  ALLOWED_ORIGINS:', ALLOWED_ORIGINS.length, 'origins');
console.log('  PORT:', PORT);

// =====================================================================
// ENHANCED SESSION MANAGEMENT SYSTEM
// =====================================================================

class MultiUserSessionManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> UserSession
    this.userSessions = new Map(); // userId -> Set<sessionId>
    this.MAX_SESSIONS_PER_USER = 5;
    this.SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
    this.ACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours of inactivity
    
    // Start cleanup interval
    setInterval(() => this.cleanupExpiredSessions(), 15 * 60 * 1000);
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createSession(user, deviceInfo, tokenPair) {
    const sessionId = this.generateSessionId();
    const userId = user.id;
    
    // Limit sessions per user
    this.limitUserSessions(userId);
    
    const session = {
      userId,
      sessionId,
      username: user.username,
      role: user.role,
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresAt: new Date(Date.now() + tokenPair.expiresIn * 1000),
      lastActivity: new Date(),
      deviceInfo,
      userData: {
        stocks: this.createDefaultStocks(),
        controls: this.createDefaultControls(),
        preferences: {},
        personalSettings: {
          theme: 'dark',
          currency: 'USD',
          autoRefresh: true,
          notifications: true
        }
      }
    };

    // Store session
    this.sessions.set(sessionId, session);
    
    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId).add(sessionId);

    console.log(`👤 Created session for user ${user.username} (${sessionId})`);
    return session;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check expiration
    if (this.isSessionExpired(session)) {
      this.removeSession(sessionId);
      return null;
    }

    // Update activity
    session.lastActivity = new Date();
    return session;
  }

  validateSessionWithToken(sessionId, token) {
    const session = this.getSession(sessionId);
    if (!session || session.token !== token) {
      return null;
    }
    return session;
  }

  getUserSessions(userId) {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];

    const sessions = [];
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && !this.isSessionExpired(session)) {
        sessions.push({
          sessionId: session.sessionId,
          lastActivity: session.lastActivity,
          deviceInfo: session.deviceInfo,
          isCurrent: false // will be set by caller
        });
      }
    }

    return sessions;
  }

  updateSessionData(sessionId, dataUpdates) {
    const session = this.getSession(sessionId);
    if (!session) return false;

    // Deep merge user data
    Object.assign(session.userData, dataUpdates);
    session.lastActivity = new Date();
    
    return true;
  }

  removeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.sessions.delete(sessionId);
    
    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    console.log(`🗑️ Removed session ${sessionId} for user ${session.userId}`);
    return true;
  }

  removeUserSessions(userId) {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return 0;

    let removedCount = 0;
    for (const sessionId of sessionIds) {
      if (this.sessions.delete(sessionId)) {
        removedCount++;
      }
    }

    this.userSessions.delete(userId);
    console.log(`🧹 Removed ${removedCount} sessions for user ${userId}`);
    
    return removedCount;
  }

  limitUserSessions(userId) {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds || sessionIds.size < this.MAX_SESSIONS_PER_USER) {
      return;
    }

    // Remove oldest session
    const sessions = Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter(s => s)
      .sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime());

    if (sessions.length > 0) {
      this.removeSession(sessions[0].sessionId);
    }
  }

  isSessionExpired(session) {
    const now = Date.now();
    
    // Check token expiration
    if (now > session.expiresAt.getTime()) {
      return true;
    }

    // Check activity timeout
    if (now - session.lastActivity.getTime() > this.ACTIVITY_TIMEOUT) {
      return true;
    }

    return false;
  }

  cleanupExpiredSessions() {
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        this.removeSession(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧽 Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  getStats() {
    let activeSessions = 0;
    let expiredSessions = 0;

    for (const session of this.sessions.values()) {
      if (this.isSessionExpired(session)) {
        expiredSessions++;
      } else {
        activeSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      totalUsers: this.userSessions.size,
      activeSessions,
      expiredSessions,
      memoryUsage: process.memoryUsage()
    };
  }

  createDefaultStocks() {
    return [
      {
        symbol: 'BNOX',
        name: 'Bane&Ox Inc.',
        currentPrice: 185.75 + (Math.random() - 0.5) * 10, // Small random variation per user
        previousPrice: 185.75,
        initialPrice: 185.75,
        change: 0,
        percentChange: 0,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        lastUpdated: new Date(),
        priceHistory: []
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        currentPrice: 176.30 + (Math.random() - 0.5) * 8,
        previousPrice: 176.30,
        initialPrice: 176.30,
        change: 0,
        percentChange: 0,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        lastUpdated: new Date(),
        priceHistory: []
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        currentPrice: 415.20 + (Math.random() - 0.5) * 20,
        previousPrice: 415.20,
        initialPrice: 415.20,
        change: 0,
        percentChange: 0,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        lastUpdated: new Date(),
        priceHistory: []
      }
    ];
  }

  createDefaultControls() {
    return {
      isPaused: false,
      updateIntervalMs: 2000,
      volatility: 2.0,
      selectedCurrency: 'USD',
      isEmergencyStopped: false,
      autoRefresh: true,
      lastUpdated: new Date()
    };
  }
}

// Initialize session manager
const sessionManager = new MultiUserSessionManager();

// =====================================================================
// USER AUTHENTICATION SYSTEM
// =====================================================================

// User credentials (in production, these would be in a secure database)
// ALL USERS HAVE ADMIN ACCESS - Complete Multi-User System
const users = [
  {
    id: 'user1',
    username: 'admin',
    passwordHash: process.env.REMOTE_ADMIN_PASSWORD_HASH || '$2b$10$gZ2G6fz2X8K8Zk4dctaazOyH6I2L3gTrEQWRu44i0NnCftds1oOuS',
    role: 'admin',
    email: 'admin@example.com'
  },
  {
    id: 'user2',
    username: 'controller',
    passwordHash: process.env.REMOTE_CONTROLLER_PASSWORD_HASH || '$2b$10$o2WHpulvsFUpQERSNdIo0u4GMNQKB2/qTndXHqfa0Xtbv9EnZ52IO',
    role: 'admin', // Changed to admin for full access
    email: 'controller@example.com'
  },
  {
    id: 'user3',
    username: 'viewer',
    passwordHash: process.env.REMOTE_VIEWER_PASSWORD_HASH || '$2b$10$GXMasDf.wl116ggnPY6oKuBGDdgjHhPqMpCThW4MokP1sGTBoP/E6',
    role: 'admin', // Changed to admin for full access
    email: 'viewer@example.com'
  },
  {
    id: 'user4',
    username: 'user1',
    passwordHash: process.env.REMOTE_USER1_PASSWORD_HASH || '$2b$10$ik4YTOrBh8mfuvWwF86cKu56uLbS7uIpMZzUSuRStlxCfA7WBQiVC',
    role: 'admin', // All users have admin access
    email: 'user1@example.com'
  },
  {
    id: 'user5',
    username: 'user2',
    passwordHash: process.env.REMOTE_USER2_PASSWORD_HASH || '$2b$10$7cNPCNY44fqgCJL7ujQ4u.BC5sgbfOwYGDU/afMOpRbIsGkhmGYoO',
    role: 'admin', // All users have admin access
    email: 'user2@example.com'
  }
];

async function authenticateUser(username, password) {
  const user = users.find(u => u.username === username);
  if (!user) {
    return null;
  }

  try {
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (isValid) {
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      };
    }
  } catch (error) {
    console.error('Password comparison failed:', error);
  }

  return null;
}

function generateTokenPair(user, sessionId) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    sessionId
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h',
    issuer: 'stock-ticker-api',
    audience: 'stock-ticker-client'
  });

  const refreshToken = jwt.sign(
    { id: user.id, sessionId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600 // 1 hour in seconds
  };
}

// =====================================================================
// MIDDLEWARE
// =====================================================================

// Enhanced authentication middleware with session validation
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const sessionId = req.headers['x-session-id'];

  if (!authHeader || !authHeader.startsWith('Bearer ') || !sessionId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_MISSING',
      message: 'Bearer token and session ID required'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Validate session
    const session = sessionManager.validateSessionWithToken(sessionId, token);
    if (!session) {
      return res.status(401).json({
        error: 'Invalid session',
        code: 'SESSION_INVALID',
        message: 'Session expired or invalid'
      });
    }

    // Attach user and session to request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      sessionId: decoded.sessionId
    };
    req.session = session;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired'
      });
    }
    
    return res.status(401).json({
      error: 'Invalid token',
      code: 'TOKEN_INVALID',
      message: 'Authentication token is invalid'
    });
  }
}

// Role-based authorization middleware
// ALL USERS HAVE ADMIN ACCESS - Simplified access control
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // All authenticated users now have admin access
    // No role checking needed since everyone is admin
    console.log(`✅ Admin access granted to user: ${req.user.username} (${req.user.id})`);
    next();
  };
}

// User data isolation middleware
function ensureUserDataIsolation(req, res, next) {
  // Ensure all data operations are scoped to the authenticated user
  req.getUserData = () => {
    const session = sessionManager.getSession(req.user.sessionId);
    return session ? session.userData : null;
  };

  req.updateUserData = (updates) => {
    return sessionManager.updateSessionData(req.user.sessionId, updates);
  };

  next();
}

// Apply rate limiting
app.use('/api/remote/auth', authLimiter);
app.use('/api/remote', apiLimiter);

// =====================================================================
// API ENDPOINTS
// =====================================================================

// Health check
app.get('/api/health', (req, res) => {
  const stats = sessionManager.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.0.0-enhanced',
    sessions: stats,
    uptime: process.uptime()
  });
});

// Authentication endpoint
app.post('/api/remote/auth', async (req, res) => {
  try {
    const { username, password } = req.body;
    const deviceFingerprint = req.headers['x-device-fingerprint'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection.remoteAddress;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Authenticate user
    const user = await authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Create session
    const tokenPair = generateTokenPair(user, 'temp');
    const session = sessionManager.createSession(user, {
      userAgent,
      ip,
      fingerprint: deviceFingerprint
    }, tokenPair);

    // Update token with actual session ID
    const finalTokenPair = generateTokenPair(user, session.sessionId);
    session.token = finalTokenPair.accessToken;
    session.refreshToken = finalTokenPair.refreshToken;

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        sessionId: session.sessionId
      },
      token: finalTokenPair.accessToken,
      refreshToken: finalTokenPair.refreshToken,
      expiresIn: finalTokenPair.expiresIn
    });

    console.log(`✅ User ${username} authenticated successfully (${session.sessionId})`);
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
});

// Token validation endpoint
app.get('/api/remote/auth', authenticateJWT, (req, res) => {
  const session = req.session;
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      sessionId: req.user.sessionId
    },
    session: {
      expiresAt: session.expiresAt,
      lastActivity: session.lastActivity,
      deviceInfo: session.deviceInfo
    }
  });
});

// Logout endpoint
app.post('/api/remote/auth/logout', authenticateJWT, (req, res) => {
  const { all = false } = req.body;

  if (all) {
    // Logout from all devices
    const removedCount = sessionManager.removeUserSessions(req.user.id);
    res.json({
      success: true,
      message: `Logged out from ${removedCount} sessions`
    });
  } else {
    // Logout from current session only
    const removed = sessionManager.removeSession(req.user.sessionId);
    res.json({
      success: true,
      message: removed ? 'Logged out successfully' : 'Session not found'
    });
  }
});

// User session management
app.get('/api/remote/sessions', authenticateJWT, (req, res) => {
  const sessions = sessionManager.getUserSessions(req.user.id);
  const currentSessionId = req.user.sessionId;
  
  const sessionsWithStatus = sessions.map(session => ({
    ...session,
    isCurrent: session.sessionId === currentSessionId
  }));

  res.json({
    success: true,
    sessions: sessionsWithStatus,
    current: currentSessionId
  });
});

// Remove specific session
app.delete('/api/remote/sessions/:sessionId', authenticateJWT, (req, res) => {
  const { sessionId } = req.params;
  
  // Verify the session belongs to the user
  const session = sessionManager.getSession(sessionId);
  if (!session || session.userId !== req.user.id) {
    return res.status(404).json({
      error: 'Session not found',
      code: 'SESSION_NOT_FOUND'
    });
  }

  const removed = sessionManager.removeSession(sessionId);
  res.json({
    success: true,
    message: removed ? 'Session removed successfully' : 'Session not found'
  });
});

// =====================================================================
// USER-SCOPED STOCK DATA ENDPOINTS
// =====================================================================

// Get user's stock data
app.get('/api/remote/stocks', authenticateJWT, ensureUserDataIsolation, (req, res) => {
  const userData = req.getUserData();
  if (!userData) {
    return res.status(500).json({ error: 'User data not available' });
  }

  res.json({
    success: true,
    stocks: userData.stocks,
    meta: {
      count: userData.stocks.length,
      lastUpdated: new Date(),
      userId: req.user.id,
      sessionId: req.user.sessionId
    }
  });
});

// Update stock price (user-scoped)
app.put('/api/remote/stocks/:symbol', authenticateJWT, ensureUserDataIsolation, requireRole('controller'), (req, res) => {
  const { symbol } = req.params;
  const { price } = req.body;
  
  const userData = req.getUserData();
  if (!userData) {
    return res.status(500).json({ error: 'User data not available' });
  }

  const stock = userData.stocks.find(s => s.symbol === symbol.toUpperCase());
  if (!stock) {
    return res.status(404).json({ error: 'Stock not found in your portfolio' });
  }

  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Invalid price value' });
  }

  // Update stock data
  stock.previousPrice = stock.currentPrice;
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

  // Save updated data
  req.updateUserData({ stocks: userData.stocks });

  res.json({
    success: true,
    stock: stock,
    message: `Updated ${symbol} price to $${price}`
  });
});

// Add new stock (user-scoped)
app.post('/api/remote/stocks', authenticateJWT, ensureUserDataIsolation, requireRole('controller'), (req, res) => {
  const { symbol, name, initialPrice } = req.body;
  
  if (!symbol || !name || typeof initialPrice !== 'number') {
    return res.status(400).json({ 
      error: 'Symbol, name, and initialPrice are required',
      received: { symbol, name, initialPrice }
    });
  }

  const userData = req.getUserData();
  if (!userData) {
    return res.status(500).json({ error: 'User data not available' });
  }

  const symbolUpper = symbol.toUpperCase();
  
  // Check if stock already exists for this user
  if (userData.stocks.find(s => s.symbol === symbolUpper)) {
    return res.status(409).json({ error: 'Stock already exists in your portfolio' });
  }

  const newStock = {
    symbol: symbolUpper,
    name,
    currentPrice: initialPrice,
    previousPrice: initialPrice,
    initialPrice,
    change: 0,
    percentChange: 0,
    volume: Math.floor(Math.random() * 1000000) + 100000,
    lastUpdated: new Date(),
    priceHistory: [{
      timestamp: new Date(),
      price: initialPrice
    }]
  };

  userData.stocks.push(newStock);
  req.updateUserData({ stocks: userData.stocks });

  res.json({
    success: true,
    stock: newStock,
    message: `Added ${symbolUpper} to your portfolio`
  });
});

// Remove stock (user-scoped)
app.delete('/api/remote/stocks/:symbol', authenticateJWT, ensureUserDataIsolation, requireRole('controller'), (req, res) => {
  const { symbol } = req.params;
  
  const userData = req.getUserData();
  if (!userData) {
    return res.status(500).json({ error: 'User data not available' });
  }

  const symbolUpper = symbol.toUpperCase();
  const stockIndex = userData.stocks.findIndex(s => s.symbol === symbolUpper);
  
  if (stockIndex === -1) {
    return res.status(404).json({ error: 'Stock not found in your portfolio' });
  }

  const removedStock = userData.stocks.splice(stockIndex, 1)[0];
  req.updateUserData({ stocks: userData.stocks });

  res.json({
    success: true,
    removed: removedStock,
    message: `Removed ${symbolUpper} from your portfolio`
  });
});

// Bulk stock operations (user-scoped)
app.put('/api/remote/stocks/bulk', authenticateJWT, ensureUserDataIsolation, requireRole('controller'), (req, res) => {
  const { updateType, percentage } = req.body;
  
  const userData = req.getUserData();
  if (!userData) {
    return res.status(500).json({ error: 'User data not available' });
  }

  let updated = 0;
  const now = new Date();

  userData.stocks.forEach(stock => {
    let newPrice = stock.currentPrice;
    
    switch (updateType) {
      case 'bull':
        newPrice = stock.currentPrice * (1 + (Math.random() * 0.05 + 0.01)); // +1% to +6%
        break;
      case 'bear':
        newPrice = stock.currentPrice * (1 - (Math.random() * 0.05 + 0.01)); // -1% to -6%
        break;
      case 'simulate':
        newPrice = stock.currentPrice * (1 + (Math.random() - 0.5) * 0.04); // ±2%
        break;
      case 'percentage':
        if (typeof percentage === 'number') {
          newPrice = stock.currentPrice * (1 + percentage / 100);
        }
        break;
    }

    if (newPrice !== stock.currentPrice && newPrice > 0) {
      stock.previousPrice = stock.currentPrice;
      stock.currentPrice = Math.max(0.01, Math.round(newPrice * 100) / 100);
      stock.change = stock.currentPrice - stock.initialPrice;
      stock.percentChange = ((stock.currentPrice - stock.initialPrice) / stock.initialPrice) * 100;
      stock.lastUpdated = now;

      // Add to price history
      stock.priceHistory.push({
        timestamp: now,
        price: stock.currentPrice
      });

      // Keep only last 30 entries
      if (stock.priceHistory.length > 30) {
        stock.priceHistory.shift();
      }

      updated++;
    }
  });

  req.updateUserData({ stocks: userData.stocks });

  res.json({
    success: true,
    updated,
    total: userData.stocks.length,
    updateType,
    message: `Updated ${updated} stocks with ${updateType} operation`
  });
});

// =====================================================================
// USER-SCOPED CONTROLS ENDPOINTS
// =====================================================================

// Get user's controls
app.get('/api/remote/controls', authenticateJWT, ensureUserDataIsolation, (req, res) => {
  const userData = req.getUserData();
  if (!userData) {
    return res.status(500).json({ error: 'User data not available' });
  }

  res.json({
    success: true,
    controls: userData.controls,
    preferences: userData.personalSettings
  });
});

// Update user's controls
app.put('/api/remote/controls', authenticateJWT, ensureUserDataIsolation, requireRole('controller'), (req, res) => {
  const updates = req.body;
  
  const userData = req.getUserData();
  if (!userData) {
    return res.status(500).json({ error: 'User data not available' });
  }

  // Allowed control updates
  const allowedUpdates = ['isPaused', 'updateIntervalMs', 'volatility', 'selectedCurrency', 'isEmergencyStopped', 'autoRefresh'];
  
  const filteredUpdates = {};
  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  Object.assign(userData.controls, filteredUpdates);
  userData.controls.lastUpdated = new Date();
  
  req.updateUserData({ controls: userData.controls });

  res.json({
    success: true,
    controls: userData.controls,
    message: 'Controls updated successfully'
  });
});

// Update user preferences
app.put('/api/remote/preferences', authenticateJWT, ensureUserDataIsolation, (req, res) => {
  const updates = req.body;
  
  const userData = req.getUserData();
  if (!userData) {
    return res.status(500).json({ error: 'User data not available' });
  }

  Object.assign(userData.personalSettings, updates);
  req.updateUserData({ personalSettings: userData.personalSettings });

  res.json({
    success: true,
    preferences: userData.personalSettings,
    message: 'Preferences updated successfully'
  });
});

// =====================================================================
// ADMIN ENDPOINTS
// =====================================================================

// System statistics (admin only)
app.get('/api/remote/admin/stats', authenticateJWT, requireRole('admin'), (req, res) => {
  const stats = sessionManager.getStats();
  
  res.json({
    success: true,
    stats,
    timestamp: new Date().toISOString()
  });
});

// List all active sessions (admin only)
app.get('/api/remote/admin/sessions', authenticateJWT, requireRole('admin'), (req, res) => {
  const allSessions = [];
  
  for (const session of sessionManager.sessions.values()) {
    allSessions.push({
      sessionId: session.sessionId,
      userId: session.userId,
      username: session.username,
      role: session.role,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt,
      deviceInfo: session.deviceInfo,
      stockCount: session.userData.stocks.length
    });
  }

  res.json({
    success: true,
    sessions: allSessions,
    total: allSessions.length
  });
});

// Force logout user (admin only)
app.delete('/api/remote/admin/sessions/:userId', authenticateJWT, requireRole('admin'), (req, res) => {
  const { userId } = req.params;
  
  const removedCount = sessionManager.removeUserSessions(userId);
  
  res.json({
    success: true,
    message: `Removed ${removedCount} sessions for user ${userId}`
  });
});

// =====================================================================
// ERROR HANDLING AND START SERVER
// =====================================================================

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Enhanced Multi-User Stock Ticker Server running on port ${PORT}`);
  console.log(`📊 Session management: Active`);
  console.log(`🔐 JWT authentication: Enabled`);
  console.log(`👥 Multi-user support: Enabled with complete data isolation`);
  console.log(`👑 User permissions: ALL USERS HAVE ADMIN ACCESS`);
  console.log(`📝 Available users: admin, controller, viewer, user1, user2`);
  console.log(`⏰ Session cleanup: Every 15 minutes`);
  console.log(`🛡️  Rate limiting: Enabled`);
});

module.exports = app;