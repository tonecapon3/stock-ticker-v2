module.exports = {
  apps: [
    {
      name: 'stock-ticker-production',
      script: 'server-production.js',
      instances: 1,
      exec_mode: 'cluster',
      
      // Environment configuration
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001,
        REMOTE_ADMIN_PASSWORD_HASH: process.env.REMOTE_ADMIN_PASSWORD_HASH,
        REMOTE_CONTROLLER_PASSWORD_HASH: process.env.REMOTE_CONTROLLER_PASSWORD_HASH,
        JWT_SECRET: process.env.JWT_SECRET,
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      },
      
      // Logging configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      pid_file: './logs/pm2.pid',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring and health checks
      health_check_http: {
        path: '/status/health',
        port: process.env.PORT || 3001,
        interval: 30000, // 30 seconds
        timeout: 5000,   // 5 seconds
        max_failures: 3
      },
      
      // Resource limits
      max_memory_restart: '512M',
      
      // Advanced options
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Auto restart on file changes (development only)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Cron restart (optional - restart every day at 3 AM)
      cron_restart: '0 3 * * *',
      
      // Environment variables that should be interpolated
      append_env_to_name: false,
      
      // Source map support
      source_map_support: true,
      
      // Graceful shutdown
      kill_signal: 'SIGTERM',
      
      // Additional PM2 options
      autorestart: true,
      combine_logs: true,
      merge_logs: true,
      
      // Custom startup script (if needed)
      pre_start: [
        'mkdir -p logs',
        'chmod 755 logs'
      ]
    },
    
    // Development configuration
    {
      name: 'stock-ticker-development',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      
      // Enable file watching in development
      watch: true,
      ignore_watch: ['node_modules', 'logs', 'build', 'public', '*.log'],
      
      // Development logging
      log_file: './logs/dev-combined.log',
      out_file: './logs/dev-out.log',
      error_file: './logs/dev-error.log',
      
      // Less aggressive restart policy for development
      max_restarts: 3,
      min_uptime: '5s',
      restart_delay: 2000,
      
      // No cron restart in development
      cron_restart: null,
      
      // Disable health check in development (optional)
      health_check_http: null
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/stock-ticker.git',
      path: '/var/www/stock-ticker',
      
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      
      // Environment variables for deployment
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/staging',
      repo: 'git@github.com:your-username/stock-ticker.git',
      path: '/var/www/stock-ticker-staging',
      
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};