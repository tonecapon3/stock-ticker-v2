#!/usr/bin/env node
/**
 * Production Environment Validation Script
 * Validates that all required environment variables are properly set for production deployment
 */

import dotenv from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

const requiredVars = [
  'REMOTE_JWT_SECRET',
  'REMOTE_API_KEY',
  'REMOTE_ADMIN_PASSWORD_HASH',
  'REMOTE_CONTROLLER_PASSWORD_HASH',
  'REMOTE_ALLOWED_ORIGINS'
];

const optionalVars = [
  'PORT',
  'REMOTE_PORT',
  'REMOTE_ADMIN_USERNAME',
  'REMOTE_CONTROLLER_USERNAME'
];

console.log('🔍 Production Environment Validation');
console.log('═══════════════════════════════════════');

let isValid = true;
const issues = [];

// Check required variables
console.log('\n📋 Required Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ❌ ${varName}: MISSING`);
    issues.push(`${varName} is required but not set`);
    isValid = false;
  } else {
    // Check for default/placeholder values
    if (value.includes('defaultHashChangeInProduction')) {
      console.log(`  ⚠️  ${varName}: USING DEFAULT (INSECURE)`);
      issues.push(`${varName} is using default value - change for production`);
      isValid = false;
    } else if (value.includes('YOUR_PRODUCTION_') || value.includes('_HERE')) {
      console.log(`  ⚠️  ${varName}: PLACEHOLDER VALUE`);
      issues.push(`${varName} appears to be a placeholder - set actual value`);
      isValid = false;
    } else {
      console.log(`  ✅ ${varName}: SET (${value.length} chars)`);
    }
  }
});

// Check optional variables
console.log('\n📋 Optional Environment Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName}: ${value}`);
  } else {
    console.log(`  ℹ️  ${varName}: Using default`);
  }
});

// Specific validations
console.log('\n🔒 Security Validations:');

// JWT Secret length
const jwtSecret = process.env.REMOTE_JWT_SECRET;
if (jwtSecret && jwtSecret.length < 32) {
  console.log('  ⚠️  JWT Secret: Too short (minimum 32 characters recommended)');
  issues.push('JWT secret should be at least 32 characters for security');
  isValid = false;
} else if (jwtSecret) {
  console.log('  ✅ JWT Secret: Adequate length');
}

// Check if NODE_ENV is production
if (process.env.NODE_ENV === 'production') {
  console.log('  ✅ NODE_ENV: production');
} else {
  console.log('  ℹ️  NODE_ENV: not production (development mode)');
}

// CORS origins check
const allowedOrigins = process.env.REMOTE_ALLOWED_ORIGINS;
if (allowedOrigins) {
  const origins = allowedOrigins.split(',');
  console.log(`  ✅ CORS Origins: ${origins.length} configured`);
  origins.forEach(origin => {
    if (origin.includes('localhost') && process.env.NODE_ENV === 'production') {
      console.log(`  ⚠️  CORS: localhost origin in production: ${origin}`);
      issues.push('Remove localhost origins from production CORS configuration');
    }
  });
} else {
  console.log('  ⚠️  CORS Origins: Not set (will use default)');
}

// Summary
console.log('\n' + '═'.repeat(50));
if (isValid && issues.length === 0) {
  console.log('✅ All validations passed! Ready for production deployment.');
  process.exit(0);
} else {
  console.log('❌ Validation failed. Issues found:');
  issues.forEach(issue => {
    console.log(`   • ${issue}`);
  });
  console.log('\n💡 Fix these issues before deploying to production.');
  process.exit(1);
}
