#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * 
 * This script validates that all required environment variables
 * and security configurations are properly set for production deployment.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production environment requirements
const REQUIRED_ENV_VARS = {
  // Security
  'REMOTE_JWT_SECRET': { minLength: 32, description: 'JWT signing secret' },
  'REMOTE_API_KEY': { minLength: 24, description: 'API access key' },
  'VITE_STORAGE_ENCRYPTION_KEY': { minLength: 16, description: 'Client storage encryption key' },
  
  // Authentication
  'REMOTE_ADMIN_PASSWORD_HASH': { minLength: 50, description: 'Admin password hash (bcrypt)' },
  'REMOTE_CONTROLLER_PASSWORD_HASH': { minLength: 50, description: 'Controller password hash (bcrypt)' },
  
  // Server Configuration
  'REMOTE_PORT': { type: 'number', description: 'Server port number' },
  'REMOTE_ALLOWED_ORIGINS': { description: 'Allowed CORS origins' },
  
  // Optional but recommended
  'VITE_API_BASE_URL': { optional: true, description: 'Frontend API base URL' },
  'NODE_ENV': { optional: true, description: 'Node environment (production)' }
};

const SECURITY_CHECKS = [
  {
    name: 'HTTPS Enforcement',
    check: () => process.env.VITE_ENFORCE_HTTPS !== 'false',
    warning: 'HTTPS enforcement is disabled. Enable for production.'
  },
  {
    name: 'HSTS Headers',
    check: () => process.env.VITE_ENABLE_HSTS !== 'false',
    warning: 'HSTS headers are disabled. Enable for production security.'
  },
  {
    name: 'Content Security Policy',
    check: () => process.env.VITE_ENABLE_CSP !== 'false',
    warning: 'CSP is disabled. Enable for production security.'
  },
  {
    name: 'Debug Mode',
    check: () => process.env.VITE_DEBUG_MODE !== 'true',
    warning: 'Debug mode is enabled. Disable for production.'
  }
];

class ProductionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, type = 'info') {
    const colors = {
      error: '\x1b[31m❌',
      warning: '\x1b[33m⚠️',
      success: '\x1b[32m✅',
      info: '\x1b[36mℹ️'
    };
    
    console.log(`${colors[type]} ${message}\x1b[0m`);
  }

  validateEnvironmentVariables() {
    this.log('Validating environment variables...', 'info');
    
    for (const [varName, config] of Object.entries(REQUIRED_ENV_VARS)) {
      const value = process.env[varName];
      
      if (!value || value.trim() === '') {
        if (config.optional) {
          this.warnings.push(`${varName}: ${config.description} (optional) - not set`);
        } else {
          this.errors.push(`${varName}: ${config.description} - REQUIRED but not set`);
        }
        continue;
      }

      // Type validation
      if (config.type === 'number' && isNaN(parseInt(value))) {
        this.errors.push(`${varName}: Must be a valid number, got: ${value}`);
        continue;
      }

      // Length validation
      if (config.minLength && value.length < config.minLength) {
        this.errors.push(`${varName}: Minimum length ${config.minLength}, got: ${value.length}`);
        continue;
      }

      // Special validations
      if (varName.includes('PASSWORD_HASH') && !value.startsWith('$2')) {
        this.errors.push(`${varName}: Must be a bcrypt hash (starting with $2)`);
        continue;
      }

      this.passed.push(`${varName}: ✓`);
    }
  }

  validateSecurityConfiguration() {
    this.log('Validating security configuration...', 'info');
    
    for (const check of SECURITY_CHECKS) {
      if (check.check()) {
        this.passed.push(`${check.name}: ✓`);
      } else {
        this.warnings.push(`${check.name}: ${check.warning}`);
      }
    }
  }

  validateFileStructure() {
    this.log('Validating file structure...', 'info');
    
    const requiredFiles = [
      'server.js',
      'server-manager.js', 
      'package.json',
      'dist/index.html'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        this.passed.push(`File structure: ${file} ✓`);
      } else {
        this.errors.push(`Missing required file: ${file}`);
      }
    }
  }

  validatePackageJson() {
    this.log('Validating package.json configuration...', 'info');
    
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check required scripts
      const requiredScripts = ['build', 'server', 'server:managed'];
      for (const script of requiredScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.passed.push(`Package script: ${script} ✓`);
        } else {
          this.errors.push(`Missing package script: ${script}`);
        }
      }
      
      // Check dependencies
      const criticalDeps = ['express', 'cors', 'jsonwebtoken', 'bcryptjs'];
      for (const dep of criticalDeps) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          this.passed.push(`Dependency: ${dep} ✓`);
        } else {
          this.errors.push(`Missing critical dependency: ${dep}`);
        }
      }
      
    } catch (error) {
      this.errors.push(`Cannot read package.json: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 PRODUCTION READINESS REPORT');
    console.log('='.repeat(60));
    
    // Summary
    const totalChecks = this.errors.length + this.warnings.length + this.passed.length;
    this.log(`\nTotal checks: ${totalChecks}`, 'info');
    this.log(`Passed: ${this.passed.length}`, 'success');
    this.log(`Warnings: ${this.warnings.length}`, 'warning');
    this.log(`Errors: ${this.errors.length}`, 'error');
    
    // Detailed results
    if (this.errors.length > 0) {
      console.log('\n🚨 CRITICAL ERRORS (Must fix before production):');
      this.errors.forEach(error => this.log(error, 'error'));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (Recommended fixes):');
      this.warnings.forEach(warning => this.log(warning, 'warning'));
    }
    
    if (this.passed.length > 0) {
      console.log('\n✅ PASSED CHECKS:');
      this.passed.forEach(pass => this.log(pass, 'success'));
    }
    
    // Final verdict
    console.log('\n' + '='.repeat(60));
    if (this.errors.length === 0) {
      this.log('🎉 PRODUCTION READY! All critical checks passed.', 'success');
      if (this.warnings.length > 0) {
        this.log(`Consider addressing ${this.warnings.length} warnings for enhanced security.`, 'warning');
      }
      return true;
    } else {
      this.log(`🚫 NOT PRODUCTION READY! ${this.errors.length} critical errors must be fixed.`, 'error');
      return false;
    }
  }

  async run() {
    console.log('🔍 Starting production readiness validation...\n');
    
    this.validateEnvironmentVariables();
    this.validateSecurityConfiguration();
    this.validateFileStructure();
    this.validatePackageJson();
    
    const isReady = this.generateReport();
    process.exit(isReady ? 0 : 1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProductionValidator();
  validator.run().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

export default ProductionValidator;
