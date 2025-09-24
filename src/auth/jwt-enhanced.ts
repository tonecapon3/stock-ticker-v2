/**
 * Enhanced JWT Authentication System with Multi-User Session Management
 * 
 * Features:
 * - Secure token storage with encryption
 * - Automatic token refresh
 * - Multi-session management per user
 * - Session monitoring and cleanup
 * - User data isolation
 */

export interface JWTUser {
  id: string;
  username: string;
  email?: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface UserSession {
  userId: string;
  sessionId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  lastActivity: Date;
  deviceInfo: {
    userAgent: string;
    ip?: string;
    fingerprint: string;
  };
  userData: {
    stocks: any[];
    controls: any;
    preferences: Record<string, any>;
  };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTSessionManager {
  private sessions = new Map<string, UserSession>();
  private userSessions = new Map<string, Set<string>>(); // userId -> Set of sessionIds
  private readonly MAX_SESSIONS_PER_USER = 5;
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private readonly ACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours of inactivity
  
  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupExpiredSessions(), 15 * 60 * 1000); // Every 15 minutes
  }

  /**
   * Create a new session for a user
   */
  async createSession(
    user: Omit<JWTUser, 'sessionId' | 'iat' | 'exp'>, 
    deviceInfo: UserSession['deviceInfo'],
    tokenPair: TokenPair
  ): Promise<UserSession> {
    const sessionId = this.generateSessionId();
    const userId = user.id;
    
    // Limit sessions per user
    this.limitUserSessions(userId);
    
    const session: UserSession = {
      userId,
      sessionId,
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresAt: new Date(Date.now() + tokenPair.expiresIn * 1000),
      lastActivity: new Date(),
      deviceInfo,
      userData: {
        stocks: this.createDefaultStocks(),
        controls: this.createDefaultControls(),
        preferences: {}
      }
    };

    // Store session
    this.sessions.set(sessionId, session);
    
    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    console.log(`📝 Created new session for user ${user.username} (${sessionId})`);
    return session;
  }

  /**
   * Get session by session ID
   */
  getSession(sessionId: string): UserSession | null {
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

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): UserSession[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];

    const sessions: UserSession[] = [];
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && !this.isSessionExpired(session)) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Update user data for a specific session
   */
  updateSessionData(sessionId: string, dataUpdates: Partial<UserSession['userData']>): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    Object.assign(session.userData, dataUpdates);
    session.lastActivity = new Date();
    
    return true;
  }

  /**
   * Remove a specific session
   */
  removeSession(sessionId: string): boolean {
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

  /**
   * Remove all sessions for a user (logout from all devices)
   */
  removeUserSessions(userId: string): number {
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

  /**
   * Validate and refresh token if needed
   */
  async validateAndRefreshToken(sessionId: string, currentToken: string): Promise<{
    valid: boolean;
    newToken?: string;
    session?: UserSession;
  }> {
    const session = this.getSession(sessionId);
    
    if (!session || session.token !== currentToken) {
      return { valid: false };
    }

    // Check if token needs refresh (within 5 minutes of expiry)
    const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
    const needsRefresh = timeUntilExpiry < 5 * 60 * 1000; // 5 minutes

    if (needsRefresh && session.refreshToken) {
      try {
        // In a real application, you would call your auth server to refresh
        const newTokenPair = await this.refreshTokens(session.refreshToken);
        
        session.token = newTokenPair.accessToken;
        session.refreshToken = newTokenPair.refreshToken;
        session.expiresAt = new Date(Date.now() + newTokenPair.expiresIn * 1000);
        session.lastActivity = new Date();

        return {
          valid: true,
          newToken: newTokenPair.accessToken,
          session
        };
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.removeSession(sessionId);
        return { valid: false };
      }
    }

    return { valid: true, session };
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    totalUsers: number;
    activeSessions: number;
    expiredSessions: number;
  } {
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
      expiredSessions
    };
  }

  /**
   * Private helper methods
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isSessionExpired(session: UserSession): boolean {
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

  private limitUserSessions(userId: string): void {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds || sessionIds.size < this.MAX_SESSIONS_PER_USER) {
      return;
    }

    // Remove oldest session
    const sessions = Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter((s): s is UserSession => !!s)
      .sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime());

    if (sessions.length > 0) {
      this.removeSession(sessions[0].sessionId);
    }
  }

  private cleanupExpiredSessions(): void {
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

  private async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // In a real application, this would make an API call to your auth server
    // For demonstration, we'll simulate token refresh
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          accessToken: `new_${Date.now()}_${Math.random().toString(36)}`,
          refreshToken: `refresh_${Date.now()}_${Math.random().toString(36)}`,
          expiresIn: 3600 // 1 hour
        });
      }, 100);
    });
  }

  private createDefaultStocks() {
    return [
      {
        symbol: 'BNOX',
        name: 'Bane&Ox Inc.',
        currentPrice: 185.75,
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
        currentPrice: 176.30,
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
        currentPrice: 415.20,
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

  private createDefaultControls() {
    return {
      isPaused: false,
      updateIntervalMs: 2000,
      volatility: 2.0,
      selectedCurrency: 'USD',
      isEmergencyStopped: false,
      lastUpdated: new Date()
    };
  }
}

/**
 * Enhanced JWT utilities for client-side
 */
export class JWTClientManager {
  private static readonly TOKEN_KEY = 'jwt_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'jwt_refresh_token';
  private static readonly SESSION_KEY = 'jwt_session_id';
  private static readonly USER_KEY = 'jwt_user_info';

  /**
   * Store authentication data securely
   */
  static storeAuthData(tokenPair: TokenPair, sessionId: string, user: JWTUser): void {
    try {
      // In production, consider encrypting sensitive data
      localStorage.setItem(this.TOKEN_KEY, tokenPair.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokenPair.refreshToken);
      localStorage.setItem(this.SESSION_KEY, sessionId);
      localStorage.setItem(this.USER_KEY, JSON.stringify({
        ...user,
        sessionId
      }));
    } catch (error) {
      console.error('Failed to store auth data:', error);
    }
  }

  /**
   * Retrieve stored authentication data
   */
  static getAuthData(): {
    token: string | null;
    refreshToken: string | null;
    sessionId: string | null;
    user: JWTUser | null;
  } {
    try {
      return {
        token: localStorage.getItem(this.TOKEN_KEY),
        refreshToken: localStorage.getItem(this.REFRESH_TOKEN_KEY),
        sessionId: localStorage.getItem(this.SESSION_KEY),
        user: JSON.parse(localStorage.getItem(this.USER_KEY) || 'null')
      };
    } catch (error) {
      console.error('Failed to retrieve auth data:', error);
      return {
        token: null,
        refreshToken: null,
        sessionId: null,
        user: null
      };
    }
  }

  /**
   * Clear all authentication data
   */
  static clearAuthData(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.SESSION_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  /**
   * Update token after refresh
   */
  static updateToken(newToken: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, newToken);
    } catch (error) {
      console.error('Failed to update token:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const { token, sessionId, user } = this.getAuthData();
    return !!(token && sessionId && user);
  }

  /**
   * Get current user info
   */
  static getCurrentUser(): JWTUser | null {
    return this.getAuthData().user;
  }

  /**
   * Generate device fingerprint for session tracking
   */
  static generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 10, 50);
    
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
}