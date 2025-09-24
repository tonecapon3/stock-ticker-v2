#!/usr/bin/env node

/**
 * Setup Script for Complete Multi-User JWT Authentication System
 * 
 * This script helps set up and validate the multi-user authentication system
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString().substr(11, 8);
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

class MultiUserSetup {
  constructor() {
    this.rootDir = process.cwd();
    this.envFile = path.join(this.rootDir, '.env.local');
    this.serverFile = path.join(this.rootDir, 'server-enhanced-multiuser.cjs');
    this.testFile = path.join(this.rootDir, 'test-multiuser-isolation.cjs');
  }

  async run() {
    console.log(`${colors.bright}${colors.cyan}`);
    console.log('🚀 Complete Multi-User JWT Authentication System Setup');
    console.log('='.repeat(60));
    console.log(colors.reset);

    try {
      await this.checkPrerequisites();
      await this.validateEnvironment();
      await this.checkServerFiles();
      await this.displaySystemInfo();
      await this.offerQuickStart();
    } catch (error) {
      logError(`Setup failed: ${error.message}`);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    logInfo('Checking prerequisites...');

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      logWarning(`Node.js ${nodeVersion} detected. Recommended: Node.js 18+`);
    } else {
      logSuccess(`Node.js ${nodeVersion} ✅`);
    }

    // Check required dependencies
    const requiredDeps = [
      'express',
      'jsonwebtoken', 
      'bcryptjs',
      'cors',
      'express-rate-limit',
      'dotenv'
    ];

    const packageJsonPath = path.join(this.rootDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found. Run npm init first.');
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const installedDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const missingDeps = requiredDeps.filter(dep => !installedDeps[dep]);
    
    if (missingDeps.length > 0) {
      logWarning(`Missing dependencies: ${missingDeps.join(', ')}`);
      logInfo('Install with: npm install ' + missingDeps.join(' '));
    } else {
      logSuccess('All required dependencies are installed');
    }
  }

  async validateEnvironment() {
    logInfo('Validating environment configuration...');

    if (!fs.existsSync(this.envFile)) {
      logWarning('.env.local not found, creating default configuration...');
      await this.createDefaultEnvFile();
    }

    const envContent = fs.readFileSync(this.envFile, 'utf8');
    
    // Check critical environment variables
    const requiredVars = [
      'REMOTE_JWT_SECRET',
      'REMOTE_ADMIN_PASSWORD_HASH',
      'REMOTE_CONTROLLER_PASSWORD_HASH',
      'REMOTE_VIEWER_PASSWORD_HASH'
    ];

    const missingVars = requiredVars.filter(varName => !envContent.includes(varName));
    
    if (missingVars.length > 0) {
      logWarning(`Missing environment variables: ${missingVars.join(', ')}`);
      await this.updateEnvFile();
    } else {
      logSuccess('Environment configuration is complete');
    }

    // Validate JWT secret strength
    const jwtSecretMatch = envContent.match(/REMOTE_JWT_SECRET=(.+)/);
    if (jwtSecretMatch) {
      const jwtSecret = jwtSecretMatch[1];
      if (jwtSecret.length < 32) {
        logWarning('JWT secret is too short (recommended: 32+ characters)');
      } else {
        logSuccess('JWT secret is adequately strong');
      }
    }
  }

  async checkServerFiles() {
    logInfo('Checking server files...');

    const requiredFiles = [
      { path: this.serverFile, name: 'Enhanced Multi-User Server' },
      { path: this.testFile, name: 'Test Suite' },
      { path: path.join(this.rootDir, 'src/auth/jwt-enhanced.ts'), name: 'JWT Client Utilities' }
    ];

    for (const file of requiredFiles) {
      if (fs.existsSync(file.path)) {
        logSuccess(`${file.name} exists`);
      } else {
        logWarning(`${file.name} not found at: ${file.path}`);
      }
    }
  }

  async createDefaultEnvFile() {
    const defaultEnv = `# Multi-User JWT Authentication System Configuration
# Generated on ${new Date().toISOString()}

# JWT Configuration
REMOTE_JWT_SECRET=${this.generateSecureSecret(64)}

# Server Configuration
PORT=3001
REMOTE_PORT=3001
REMOTE_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
NODE_ENV=development

# User Passwords (bcrypt hashed)
# Default passwords: admin123, controller123, viewer123, user123, demo123
REMOTE_ADMIN_PASSWORD_HASH=${await this.hashPassword('admin123')}
REMOTE_CONTROLLER_PASSWORD_HASH=${await this.hashPassword('controller123')}
REMOTE_VIEWER_PASSWORD_HASH=${await this.hashPassword('viewer123')}
REMOTE_USER1_PASSWORD_HASH=${await this.hashPassword('user123')}
REMOTE_USER2_PASSWORD_HASH=${await this.hashPassword('demo123')}

# API Base URL for client connections
VITE_API_BASE_URL=http://localhost:3001

# Rate Limiting
REMOTE_RATE_LIMIT_REQUESTS=100
REMOTE_RATE_LIMIT_WINDOW=60000
`;

    fs.writeFileSync(this.envFile, defaultEnv);
    logSuccess('Created default .env.local file');
  }

  async updateEnvFile() {
    // This would update missing environment variables
    logInfo('Environment file needs updates - please check the configuration');
  }

  generateSecureSecret(length = 64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  async displaySystemInfo() {
    console.log(`\n${colors.bright}${colors.blue}📋 Multi-User System Information${colors.reset}`);
    console.log('─'.repeat(50));

    console.log(`\n👥 Available Users (all have admin access):`);
    console.log('  • admin       (password: admin123)');
    console.log('  • controller  (password: controller123)');
    console.log('  • viewer      (password: viewer123)');
    console.log('  • user1       (password: user123)');
    console.log('  • user2       (password: demo123)');

    console.log(`\n🔐 Authentication Features:`);
    console.log('  • Complete data isolation per user');
    console.log('  • Multiple sessions per user');
    console.log('  • Automatic session cleanup');
    console.log('  • Rate limiting protection');
    console.log('  • JWT token security');
    console.log('  • Admin access for all users');

    console.log(`\n🛠️ API Endpoints:`);
    console.log('  • POST /api/remote/auth              - Login');
    console.log('  • GET  /api/remote/stocks            - Get user stocks');
    console.log('  • POST /api/remote/stocks            - Add stock');
    console.log('  • GET  /api/remote/admin/stats       - System stats');
    console.log('  • GET  /api/remote/sessions          - User sessions');

    console.log(`\n📊 Testing:`);
    console.log('  • Comprehensive test suite available');
    console.log('  • Data isolation verification');
    console.log('  • Security validation tests');
    console.log('  • Multi-user scenario testing');
  }

  async offerQuickStart() {
    console.log(`\n${colors.bright}${colors.green}🚀 Quick Start Options${colors.reset}`);
    console.log('─'.repeat(50));

    console.log('\n1. Start the Enhanced Multi-User Server:');
    console.log(`   ${colors.cyan}node server-enhanced-multiuser.cjs${colors.reset}`);

    console.log('\n2. Run the comprehensive test suite:');
    console.log(`   ${colors.cyan}node test-multiuser-isolation.cjs${colors.reset}`);

    console.log('\n3. Test client integration:');
    console.log(`   ${colors.cyan}node multiuser-client-example.js${colors.reset}`);

    console.log('\n4. Start with package.json scripts:');
    console.log(`   ${colors.cyan}npm run server:enhanced${colors.reset} (if defined)`);

    // Check if we can auto-start
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('\n❓ Would you like to start the server now? (y/n): ', (answer) => {
        rl.close();
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          this.startServer();
        } else {
          console.log('\n✅ Setup complete! Use the commands above to start the system.');
        }
        resolve();
      });
    });
  }

  startServer() {
    console.log(`\n${colors.bright}${colors.green}🚀 Starting Multi-User Server...${colors.reset}\n`);
    
    if (!fs.existsSync(this.serverFile)) {
      logError(`Server file not found: ${this.serverFile}`);
      return;
    }

    const serverProcess = spawn('node', [this.serverFile], {
      stdio: 'inherit',
      cwd: this.rootDir
    });

    serverProcess.on('error', (error) => {
      logError(`Failed to start server: ${error.message}`);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down server...');
      serverProcess.kill('SIGTERM');
      process.exit(0);
    });
  }

  async runTests() {
    console.log(`\n${colors.bright}${colors.blue}🧪 Running Test Suite...${colors.reset}\n`);
    
    return new Promise((resolve) => {
      const testProcess = spawn('node', [this.testFile], {
        stdio: 'inherit',
        cwd: this.rootDir
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          logSuccess('All tests passed!');
        } else {
          logError('Some tests failed.');
        }
        resolve(code === 0);
      });

      testProcess.on('error', (error) => {
        logError(`Test execution failed: ${error.message}`);
        resolve(false);
      });
    });
  }
}

// Main execution
if (require.main === module) {
  const setup = new MultiUserSetup();
  setup.run().catch((error) => {
    console.error(`\n${colors.red}❌ Setup failed:${colors.reset}`, error.message);
    process.exit(1);
  });
}

module.exports = MultiUserSetup;