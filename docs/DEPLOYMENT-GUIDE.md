# Stock Ticker Production Deployment Guide

This guide provides comprehensive instructions for deploying the Stock Ticker application in production environments, with enhanced reliability features to prevent connection errors.

## 🎯 What This Guide Solves

The enhanced production setup solves the common "ERR_CONNECTION_REFUSED" error by providing:

1. **Automatic server restart** on crashes or port conflicts
2. **Health monitoring** with retry mechanisms  
3. **Port conflict resolution** with automatic fallback
4. **Process management** integration for zero-downtime deployments
5. **Comprehensive error handling** for all failure scenarios

## 🚀 Deployment Options

### Option 1: Enhanced Production Script (Recommended)

The production script provides built-in reliability features without external dependencies.

```bash
# Production deployment
npm run start:production
```

**Features:**
- ✅ Port conflict detection and automatic fallback
- ✅ Health check validation after startup
- ✅ Retry logic with exponential backoff
- ✅ PID file management
- ✅ Graceful shutdown handling

### Option 2: PM2 Process Manager

PM2 provides advanced process management and monitoring capabilities.

```bash
# Install PM2 globally
npm install -g pm2

# Production with PM2
npm run pm2:start

# Monitor processes
npm run pm2:monit

# View logs
npm run pm2:logs
```

**PM2 Features:**
- ✅ Automatic restart on crash
- ✅ Cluster mode support
- ✅ Built-in log rotation
- ✅ HTTP health monitoring
- ✅ Memory limit enforcement
- ✅ CPU and memory usage tracking

### Option 3: Docker Container

Docker provides consistent environments and resource isolation.

```bash
# Build and run with Docker Compose
docker-compose up --build -d

# View logs
docker-compose logs -f

# Health check
docker-compose ps
```

**Docker Features:**
- ✅ Multi-stage builds for optimization
- ✅ Security hardening with non-root user
- ✅ Built-in health checks
- ✅ Resource limits and monitoring
- ✅ Log management

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration
```bash
# Run the production validation script
npm run validate:production

# Expected output:
# ✅ All required environment variables are set
# ✅ Passwords are securely hashed
# ✅ JWT secret is strong
# ✅ Production environment is ready
```

### 2. Build Assets
```bash
# Build production assets
npm run build

# Verify build
ls -la build/
```

### 3. Test Server Locally
```bash
# Test with enhanced production script
NODE_ENV=production npm run start:production

# Verify health check
curl http://localhost:3001/status/health
```

## 🌐 Cloud Platform Deployment

### Railway

Railway deployment is already configured with the enhanced production script.

```bash
# Deploy to Railway (if connected)
railway up

# Environment variables required:
# - REMOTE_ADMIN_PASSWORD_HASH
# - REMOTE_CONTROLLER_PASSWORD_HASH  
# - JWT_SECRET
```

**railway.json Configuration:**
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:production",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Render

Render deployment uses the production script automatically.

```yaml
# render.yaml
services:
  - type: web
    name: stock-ticker
    runtime: node
    buildCommand: npm run render-build
    startCommand: npm run start:production
    envVars:
      - key: NODE_ENV
        value: production
```

### Heroku

Heroku uses the Procfile configuration:

```
web: npm run start:production
```

**Environment Setup:**
```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set REMOTE_ADMIN_PASSWORD_HASH=your_hash_here
heroku config:set REMOTE_CONTROLLER_PASSWORD_HASH=your_hash_here
heroku config:set JWT_SECRET=your_secret_here

# Deploy
git push heroku main
```

## 🔧 Production Environment Variables

### Required Variables
```bash
# Core configuration
NODE_ENV=production
PORT=3001

# Authentication (use validate:production to generate)
REMOTE_ADMIN_PASSWORD_HASH=your_bcrypt_hash_here
REMOTE_CONTROLLER_PASSWORD_HASH=your_bcrypt_hash_here
JWT_SECRET=your_strong_secret_here
```

### Optional Variables
```bash
# External authentication (if using Clerk)
CLERK_SECRET_KEY=your_clerk_key_here

# Process management
PID_FILE=/app/logs/server.pid

# Advanced settings
HEALTH_CHECK_TIMEOUT=10000
STARTUP_RETRY_DELAY=2000
MAX_STARTUP_RETRIES=5
```

## 📊 Monitoring and Health Checks

### Health Check Endpoints

The application provides multiple health check endpoints:

```bash
# Primary health check (used by production script)
GET  /status/health

# API health check
GET  /api/remote/status/health
POST /api/remote/status/health

# Detailed system status (requires auth)
GET  /api/remote/status
```

### Health Check Response
```json
{
  "success": true,
  "health": "healthy",
  "checks": {
    "api": "ok",
    "responseTime": 15,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "server": "stock-ticker-backend"
  }
}
```

### Monitoring Integration

**External Monitoring Services:**
- UptimeRobot: Monitor `/status/health` endpoint
- Pingdom: HTTP check on main application URL
- StatusCake: Multi-location monitoring
- New Relic: Application performance monitoring

**Log Aggregation:**
- PM2: Built-in log rotation and management
- Docker: JSON file driver with rotation
- Cloud Platforms: Native log streaming

## 🛠️ Troubleshooting Production Issues

### Common Issues and Solutions

#### 1. Port Already in Use
```bash
# Automatic resolution with production script
🔍 Scanning for available port from 3001 to 3011...
✅ Found available port: 3003

# Manual resolution
lsof -ti:3001 | xargs kill -9
PORT=3002 npm run start:production
```

#### 2. Environment Variables Missing
```bash
# Run validation script
npm run validate:production

# Check specific variables
echo $REMOTE_ADMIN_PASSWORD_HASH
echo $JWT_SECRET
```

#### 3. Health Check Failures
```bash
# Check server startup logs
tail -f logs/combined.log

# Manual health check
curl -v http://localhost:3001/status/health

# Verify server is listening
netstat -tlnp | grep 3001
```

#### 4. Memory Issues
```bash
# PM2 memory monitoring
pm2 monit

# Docker resource limits
docker stats stock-ticker-app

# Manual memory check
ps aux | grep node
```

### Log Analysis

**Production Script Logs:**
```bash
# View real-time logs
tail -f logs/combined.log

# Search for errors
grep "❌\|💥" logs/combined.log

# Check startup sequence
grep "🚀\|✅\|🎉" logs/combined.log
```

**PM2 Logs:**
```bash
# Real-time logs
pm2 logs stock-ticker-production

# Log files location
ls -la logs/
```

## 🔐 Security Best Practices

### 1. Environment Security
- ✅ Never commit `.env.production` files
- ✅ Use strong, unique passwords (validated by script)
- ✅ Rotate JWT secrets regularly
- ✅ Enable HTTPS in production (reverse proxy)

### 2. Process Security
- ✅ Run as non-root user (Docker)
- ✅ Set resource limits (memory/CPU)
- ✅ Enable security headers
- ✅ Validate all environment variables

### 3. Network Security
- ✅ Use reverse proxy (nginx, cloudflare)
- ✅ Enable rate limiting
- ✅ Configure proper CORS
- ✅ Monitor failed login attempts

## 🔄 Zero-Downtime Deployments

### PM2 Deployment
```bash
# Reload without downtime
pm2 reload ecosystem.config.js --env production

# Deploy from Git repository
pm2 deploy ecosystem.config.js production
```

### Docker Blue-Green Deployment
```bash
# Build new version
docker-compose build

# Rolling update
docker-compose up -d --no-deps stock-ticker
```

### Cloud Platform Rolling Updates
Most cloud platforms (Railway, Render, Heroku) provide automatic rolling updates when configured with health checks.

## 📈 Performance Optimization

### Production Optimizations
- ✅ Multi-stage Docker builds
- ✅ Production-only dependencies
- ✅ Asset compression and caching
- ✅ Process clustering with PM2
- ✅ Health check optimizations

### Resource Management
```bash
# PM2 cluster mode
pm2 start ecosystem.config.js --instances max

# Docker resource limits
docker run --memory=512m --cpus=0.5 stock-ticker

# Memory monitoring
pm2 monit
```

## 🆘 Emergency Procedures

### Emergency Stop
```bash
# API emergency stop (requires authentication)
curl -X POST http://localhost:3001/api/remote/controls/emergency \
  -H "Authorization: Bearer YOUR_TOKEN"

# Process emergency stop
pm2 stop all
docker-compose stop
pkill -f "node server"
```

### Quick Recovery
```bash
# Restart with production script
npm run start:production

# Restart with PM2
pm2 restart all

# Restart with Docker
docker-compose up -d
```

### Rollback Procedures
```bash
# Git rollback
git revert HEAD
git push origin main

# PM2 previous version
pm2 deploy ecosystem.config.js production revert 1

# Docker previous image
docker-compose down
docker-compose up previous-tag
```

## 📞 Support and Maintenance

### Regular Maintenance
- Monitor disk usage (logs directory)
- Check memory usage and optimize if needed
- Update dependencies and security patches
- Review and rotate authentication credentials
- Test backup and recovery procedures

### Performance Monitoring
- Set up alerts for high memory usage
- Monitor response times and error rates
- Track uptime and availability metrics
- Review logs for unusual patterns or errors

This comprehensive deployment guide ensures your Stock Ticker application runs reliably in production with minimal downtime and maximum performance.