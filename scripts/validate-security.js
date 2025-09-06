#!/usr/bin/env node
/**
 * Security Configuration Validator
 * Validates that all required environment variables and security settings are properly configured
 * 
 * Usage: node scripts/validate-security.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Load and parse environment file
 */
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
          env[key] = values.join('=');
        }
      }
    });
    
    return env;
  } catch (error) {
    return null;
  }
}

/**
 * Security validation tests
 */
const validations = [
  {
    name: 'Environment file exists',
    test: () => {
      const envLocal = path.join(rootDir, '.env.local');
      return fs.existsSync(envLocal);
    },
    critical: true,
    fix: 'Create .env.local file from .env.example template'
  },
  
  {
    name: 'VITE_ACCESS_CODE is set',
    test: (env) => env && env.VITE_ACCESS_CODE && env.VITE_ACCESS_CODE !== 'CHANGE_ME_TO_SECURE_ACCESS_CODE',
    critical: true,
    fix: 'Set VITE_ACCESS_CODE to a strong, unique access code'
  },
  
  {
    name: 'REMOTE_JWT_SECRET is set and strong',
    test: (env) => env && env.REMOTE_JWT_SECRET && env.REMOTE_JWT_SECRET.length >= 32 && !env.REMOTE_JWT_SECRET.includes('CHANGE_ME'),
    critical: true,
    fix: 'Generate strong JWT secret with: openssl rand -base64 32'
  },
  
  {
    name: 'REMOTE_API_KEY is set',
    test: (env) => env && env.REMOTE_API_KEY && env.REMOTE_API_KEY.length >= 24 && !env.REMOTE_API_KEY.includes('CHANGE_ME'),
    critical: true,
    fix: 'Generate API key with: openssl rand -base64 24'
  },
  
  {
    name: 'VITE_STORAGE_ENCRYPTION_KEY is set',
    test: (env) => env && env.VITE_STORAGE_ENCRYPTION_KEY && env.VITE_STORAGE_ENCRYPTION_KEY.length >= 32 && !env.VITE_STORAGE_ENCRYPTION_KEY.includes('CHANGE_ME'),
    critical: true,
    fix: 'Generate encryption key with: openssl rand -base64 32'
  },
  
  {
    name: 'Admin password hash is set',
    test: (env) => env && env.REMOTE_ADMIN_PASSWORD_HASH && (env.REMOTE_ADMIN_PASSWORD_HASH.startsWith('$2a$') || env.REMOTE_ADMIN_PASSWORD_HASH.startsWith('$2b$')) && !env.REMOTE_ADMIN_PASSWORD_HASH.includes('CHANGE_ME'),
    critical: true,
    fix: 'Generate password hash with: node scripts/generate-password-hash.js hash yourPassword'
  },
  
  {
    name: 'Controller password hash is set',
    test: (env) => env && env.REMOTE_CONTROLLER_PASSWORD_HASH && (env.REMOTE_CONTROLLER_PASSWORD_HASH.startsWith('$2a$') || env.REMOTE_CONTROLLER_PASSWORD_HASH.startsWith('$2b$')) && !env.REMOTE_CONTROLLER_PASSWORD_HASH.includes('CHANGE_ME'),
    critical: true,
    fix: 'Generate password hash with: node scripts/generate-password-hash.js hash yourPassword'
  },
  
  {
    name: 'Session timeout is reasonable',
    test: (env) => env && env.VITE_SESSION_TIMEOUT && parseInt(env.VITE_SESSION_TIMEOUT) >= 300000 && parseInt(env.VITE_SESSION_TIMEOUT) <= 86400000,
    critical: false,
    fix: 'Set VITE_SESSION_TIMEOUT between 300000 (5 min) and 86400000 (24 hours)'
  },
  
  {
    name: 'Max login attempts is set',
    test: (env) => env && env.VITE_MAX_LOGIN_ATTEMPTS && parseInt(env.VITE_MAX_LOGIN_ATTEMPTS) >= 3 && parseInt(env.VITE_MAX_LOGIN_ATTEMPTS) <= 10,
    critical: false,
    fix: 'Set VITE_MAX_LOGIN_ATTEMPTS between 3 and 10'
  },
  
  {
    name: 'CORS origins are configured',
    test: (env) => env && env.REMOTE_ALLOWED_ORIGINS && env.REMOTE_ALLOWED_ORIGINS.includes('localhost'),
    critical: false,
    fix: 'Configure REMOTE_ALLOWED_ORIGINS with allowed domains'
  },
  
  {
    name: '.env.local is in .gitignore',
    test: () => {
      const gitignorePath = path.join(rootDir, '.gitignore');
      try {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        return content.includes('.env.local');
      } catch {
        return false;
      }
    },
    critical: true,
    fix: 'Add .env.local to .gitignore to prevent committing secrets'
  },
  
  {
    name: 'No default passwords in source code',
    test: () => {
      const serverPath = path.join(rootDir, 'server.js');
      try {
        const content = fs.readFileSync(serverPath, 'utf-8');
        return !content.includes('$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
      } catch {
        return true; // File not found is OK
      }
    },
    critical: true,
    fix: 'Remove hardcoded password hashes from source code'
  },
  
  {
    name: 'No dummy tokens in source code',
    test: () => {
      const serverPath = path.join(rootDir, 'server.js');
      try {
        const content = fs.readFileSync(serverPath, 'utf-8');
        return !content.includes('dummy-token-for-now');
      } catch {
        return true; // File not found is OK
      }
    },
    critical: true,
    fix: 'Remove dummy authentication tokens from source code'
  }
];

/**
 * Run security validation
 */
function runValidation() {
  console.log('🔒 Stock Ticker Security Validation\n');
  console.log('=' .repeat(50));
  
  const envFile = path.join(rootDir, '.env.local');
  const env = loadEnvFile(envFile);
  
  let passed = 0;
  let failed = 0;
  let criticalFailed = 0;
  
  validations.forEach((validation, index) => {
    const result = validation.test(env);
    const status = result ? '✅ PASS' : '❌ FAIL';
    const priority = validation.critical ? '[CRITICAL]' : '[WARNING]';
    
    console.log(`${status} ${priority} ${validation.name}`);
    
    if (result) {
      passed++;
    } else {
      failed++;
      if (validation.critical) {
        criticalFailed++;
      }
      console.log(`   💡 Fix: ${validation.fix}`);
    }
    
    console.log();
  });
  
  console.log('=' .repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  
  if (criticalFailed > 0) {
    console.log(`\n⚠️  ${criticalFailed} critical security issues found!`);
    console.log('🚨 Application is NOT SECURE for production use');
    console.log('\nFix critical issues before deploying to production.');
    process.exit(1);
  } else if (failed > 0) {
    console.log(`\n⚠️  ${failed} warnings found`);
    console.log('🟡 Application has minor security improvements available');
    console.log('\nRecommend fixing warnings for enhanced security.');
    process.exit(0);
  } else {
    console.log('\n✅ All security validations passed!');
    console.log('🛡️  Application is properly configured for secure operation');
    process.exit(0);
  }
}

/**
 * Generate security report
 */
function generateReport() {
  const envFile = path.join(rootDir, '.env.local');
  const env = loadEnvFile(envFile);
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: env ? 'configured' : 'missing',
    validations: validations.map(v => ({
      name: v.name,
      passed: v.test(env),
      critical: v.critical,
      fix: v.fix
    }))
  };
  
  const reportPath = path.join(rootDir, 'security-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Security report generated: ${reportPath}`);
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'report') {
    generateReport();
    return;
  }
  
  if (command === 'help' || command === '-h' || command === '--help') {
    console.log('🔒 Security Validation Tool\n');
    console.log('Usage:');
    console.log('  node scripts/validate-security.js        Run security validation');
    console.log('  node scripts/validate-security.js report Generate JSON report');
    console.log('  node scripts/validate-security.js help   Show this help');
    return;
  }
  
  runValidation();
}

main();
