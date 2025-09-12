# Stock Ticker Production Server

A production-ready server startup script with enhanced reliability features for the Stock Ticker application.

## Features

### 🛡️ **Enhanced Reliability**
- **Port conflict resolution**: Automatically scans for available ports if the default is occupied
- **Health check validation**: Validates server health after startup with timeout handling
- **Startup retry logic**: Attempts startup up to 5 times with exponential backoff
- **Graceful shutdown**: Handles SIGTERM/SIGINT signals properly
- **Process monitoring**: Creates PID files for external process management

### 🔧 **Production Ready**
- **Error recovery**: Comprehensive error handling for all failure modes
- **Resource monitoring**: Tracks server process health and output
- **Configuration flexibility**: Environment-driven configuration
- **Logging**: Detailed startup logs with emojis for easy scanning

### 📊 **Process Management**
- **PID file generation**: For integration with process managers (PM2, systemd)
- **Graceful restarts**: Clean shutdown handling for zero-downtime deployments
- **Exit code management**: Proper exit codes for CI/CD integration

## Usage

### Development
```bash
npm run dev        # Standard development server
npm run server     # Basic production server
```

### Production
```bash
npm run start:production    # Enhanced production server with monitoring
```

### Environment Variables

The production server respects all the same environment variables as the standard server, plus:

```bash
# Core Configuration
NODE_ENV=production           # Environment mode
PORT=3001                    # Primary port (will scan up if occupied)
REMOTE_PORT=3001            # Alternative port specification

# Production Features
PID_FILE=./server.pid       # PID file location for process management
```

## Production Deployment

### Manual Deployment
```bash
# Set environment variables
export NODE_ENV=production
export PORT=3001

# Start with production wrapper
npm run start:production
```

### Process Manager Integration

#### PM2
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server-production.js --name "stock-ticker" --env production

# Monitor
pm2 monit
pm2 logs stock-ticker
```

#### Docker
```dockerfile
# Add to your Dockerfile
COPY server-production.js .
CMD ["node", "server-production.js"]
```

### Cloud Platform Integration

The production server works seamlessly with:
- **Railway**: Update your `Procfile` to use `web: npm run start:production`
- **Render**: Update build command to use `npm run start:production`
- **Heroku**: Compatible with existing Procfile structure

## Monitoring & Health Checks

### Health Check Endpoint
The server validates health using the existing `/status/health` endpoint:
```
GET http://localhost:3001/status/health
```

Expected response:
```json
{
  "success": true,
  "health": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Process Monitoring
- **PID file**: Created at `./server.pid` for external monitoring
- **Exit codes**: Proper codes for different failure scenarios
- **Logging**: Structured logs for production monitoring

## Troubleshooting

### Port Conflicts
The production server automatically scans for available ports:
```
🔍 Scanning for available port from 3001 to 3011...
✅ Found available port: 3003
```

### Startup Failures
Failed attempts are logged with retry information:
```
❌ Startup attempt 1 failed: Server health check failed
⏳ Retrying in 2 seconds...
```

### Health Check Issues
If the server starts but health checks fail:
```
⚠️  Server health check failed - unhealthy response
❌ Server health check failed: fetch failed
```

Check that:
1. The `/status/health` endpoint is implemented
2. The server is responding within 10 seconds
3. Environment variables are correctly set

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Port handling | Fixed port | Dynamic port scanning |
| Error recovery | Basic | Comprehensive with retries |
| Health checks | Manual | Automatic validation |
| Process management | None | PID files + graceful shutdown |
| Logging | Simple | Structured with emojis |
| Resource monitoring | None | Process output capture |

## Integration with Existing Infrastructure

The production server is a drop-in enhancement that:
- ✅ Uses the same `server.js` file as the core
- ✅ Respects all existing environment variables
- ✅ Works with current deployment configurations
- ✅ Maintains compatibility with frontend API expectations
- ✅ Supports existing authentication and database connections

Simply replace `node server.js` with `node server-production.js` in your deployment configuration to gain all the production reliability features.