/**
 * Multi-User JWT Authentication System - Client Integration Example
 * 
 * This demonstrates how to integrate the multi-user authentication system
 * into your client-side application.
 */

class MultiUserAuthClient {
  constructor(apiBaseUrl = 'http://localhost:3001/api/remote') {
    this.apiBaseUrl = apiBaseUrl;
    this.tokenKey = 'jwt_access_token';
    this.sessionKey = 'jwt_session_id';
    this.userKey = 'jwt_user_info';
  }

  /**
   * Generate device fingerprint for session tracking
   */
  generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillText('fingerprint', 10, 50);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Login user and store authentication data
   */
  async login(username, password) {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint();
      
      const response = await fetch(`${this.apiBaseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Fingerprint': deviceFingerprint,
          'User-Agent': `MultiUserClient-${username}`
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.success) {
        // Store authentication data
        localStorage.setItem(this.tokenKey, data.token);
        localStorage.setItem(this.sessionKey, data.user.sessionId);
        localStorage.setItem(this.userKey, JSON.stringify(data.user));
        
        console.log(`✅ User ${username} logged in successfully`);
        console.log(`👤 User ID: ${data.user.id}`);
        console.log(`👑 Role: ${data.user.role}`);
        console.log(`🔗 Session: ${data.user.sessionId}`);
        
        return data.user;
      }
      
      throw new Error('Login failed');
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(logoutAll = false) {
    try {
      const token = this.getToken();
      const sessionId = this.getSessionId();
      
      if (token && sessionId) {
        await fetch(`${this.apiBaseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Session-ID': sessionId
          },
          body: JSON.stringify({ all: logoutAll })
        });
      }
      
      // Clear local storage
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.sessionKey);
      localStorage.removeItem(this.userKey);
      
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error.message);
      // Clear storage anyway
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.sessionKey);
      localStorage.removeItem(this.userKey);
    }
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(method, endpoint, data = null) {
    const token = this.getToken();
    const sessionId = this.getSessionId();
    
    if (!token || !sessionId) {
      throw new Error('Not authenticated');
    }

    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Session-ID': sessionId,
        'X-Device-Fingerprint': this.generateDeviceFingerprint()
      }
    };
    
    if (data) {
      config.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, config);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }
    
    return result;
  }

  /**
   * Get user's stocks
   */
  async getStocks() {
    return this.makeRequest('GET', '/stocks');
  }

  /**
   * Add a stock to user's portfolio
   */
  async addStock(symbol, name, initialPrice) {
    return this.makeRequest('POST', '/stocks', {
      symbol,
      name,
      initialPrice
    });
  }

  /**
   * Update stock price in user's portfolio
   */
  async updateStockPrice(symbol, price) {
    return this.makeRequest('PUT', `/stocks/${symbol}`, { price });
  }

  /**
   * Remove stock from user's portfolio
   */
  async removeStock(symbol) {
    return this.makeRequest('DELETE', `/stocks/${symbol}`);
  }

  /**
   * Get user's controls
   */
  async getControls() {
    return this.makeRequest('GET', '/controls');
  }

  /**
   * Update user's controls
   */
  async updateControls(updates) {
    return this.makeRequest('PUT', '/controls', updates);
  }

  /**
   * Get user sessions (admin access)
   */
  async getSessions() {
    return this.makeRequest('GET', '/sessions');
  }

  /**
   * Get system stats (admin access)
   */
  async getSystemStats() {
    return this.makeRequest('GET', '/admin/stats');
  }

  /**
   * Get all active sessions (admin access)
   */
  async getAllSessions() {
    return this.makeRequest('GET', '/admin/sessions');
  }

  /**
   * Utility methods
   */
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getSessionId() {
    return localStorage.getItem(this.sessionKey);
  }

  getCurrentUser() {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  isAuthenticated() {
    return !!(this.getToken() && this.getSessionId() && this.getCurrentUser());
  }
}

/**
 * Usage Example - Multi-User Demo
 */
async function demonstrateMultiUserSystem() {
  console.log('🚀 Multi-User JWT Authentication System Demo');
  console.log('='.repeat(50));

  // Available users (all have admin access):
  const users = [
    { username: 'admin', password: 'admin123' },
    { username: 'controller', password: 'controller123' },
    { username: 'viewer', password: 'viewer123' },
    { username: 'user1', password: 'user123' },
    { username: 'user2', password: 'demo123' }
  ];

  const clients = {};

  try {
    // Login multiple users
    console.log('\n👥 Logging in multiple users...');
    for (const user of users.slice(0, 3)) { // Login first 3 users
      const client = new MultiUserAuthClient();
      await client.login(user.username, user.password);
      clients[user.username] = client;
    }

    // Demonstrate data isolation
    console.log('\n📊 Demonstrating data isolation...');
    
    // Each user adds their own stock
    await clients.admin.addStock('ADMIN', 'Admin Stock', 100);
    await clients.controller.addStock('CTRL', 'Controller Stock', 200);
    await clients.viewer.addStock('VIEW', 'Viewer Stock', 300);

    // Verify each user only sees their own stocks
    const adminStocks = await clients.admin.getStocks();
    const controllerStocks = await clients.controller.getStocks();
    const viewerStocks = await clients.viewer.getStocks();

    console.log(`Admin has ${adminStocks.stocks.length} stocks:`, adminStocks.stocks.map(s => s.symbol));
    console.log(`Controller has ${controllerStocks.stocks.length} stocks:`, controllerStocks.stocks.map(s => s.symbol));
    console.log(`Viewer has ${viewerStocks.stocks.length} stocks:`, viewerStocks.stocks.map(s => s.symbol));

    // Demonstrate admin access for all users
    console.log('\n👑 Testing admin access (all users have admin role)...');
    
    const adminStats = await clients.admin.getSystemStats();
    const controllerStats = await clients.controller.getSystemStats();
    const viewerStats = await clients.viewer.getSystemStats();

    console.log('✅ Admin can access system stats:', !!adminStats.success);
    console.log('✅ Controller can access system stats:', !!controllerStats.success);
    console.log('✅ Viewer can access system stats:', !!viewerStats.success);

    // Show session information
    console.log('\n🔗 Active sessions:');
    const allSessions = await clients.admin.getAllSessions();
    console.log(`Total active sessions: ${allSessions.sessions.length}`);

    // Clean up - logout all users
    console.log('\n🧹 Logging out all users...');
    for (const client of Object.values(clients)) {
      await client.logout();
    }

    console.log('\n🎉 Multi-user demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MultiUserAuthClient, demonstrateMultiUserSystem };
}

// Auto-run demo if called directly in browser
if (typeof window !== 'undefined' && window.location) {
  console.log('Multi-User JWT Authentication Client loaded');
  console.log('Available functions:');
  console.log('- new MultiUserAuthClient() - Create auth client');
  console.log('- demonstrateMultiUserSystem() - Run demo');
}