#!/usr/bin/env node
/**
 * Password Hash Generator
 * Utility script to generate bcrypt password hashes for secure authentication
 * 
 * Usage: node scripts/generate-password-hash.js [password]
 */

import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const SALT_ROUNDS = 12; // High security salt rounds

/**
 * Generate a secure password hash
 */
function generatePasswordHash(password) {
  if (!password) {
    console.error('❌ Password is required');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters long');
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  return hash;
}

/**
 * Generate secure random secrets
 */
function generateSecrets() {
  const jwtSecret = createHash('sha256').update(Date.now().toString() + Math.random().toString()).digest('base64');
  const apiKey = createHash('sha256').update(Date.now().toString() + Math.random().toString()).digest('base64').substring(0, 32);
  const encryptionKey = createHash('sha256').update(Date.now().toString() + Math.random().toString()).digest('base64').substring(0, 32);
  
  return {
    jwtSecret,
    apiKey,
    encryptionKey
  };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'secrets') {
    console.log('🔑 Generating secure secrets...\n');
    const secrets = generateSecrets();
    
    console.log('# Add these to your .env.local file:');
    console.log(`REMOTE_JWT_SECRET=${secrets.jwtSecret}`);
    console.log(`REMOTE_API_KEY=${secrets.apiKey}`);
    console.log(`VITE_STORAGE_ENCRYPTION_KEY=${secrets.encryptionKey}`);
    console.log();
    console.log('⚠️  Keep these secrets secure and never commit them to version control!');
    return;
  }

  if (command === 'hash') {
    const password = args[1];
    if (!password) {
      console.error('❌ Usage: node scripts/generate-password-hash.js hash <password>');
      process.exit(1);
    }

    console.log('🔐 Generating password hash...\n');
    const hash = generatePasswordHash(password);
    
    console.log('Password Hash:');
    console.log(hash);
    console.log();
    console.log('Add this to your .env.local file:');
    console.log(`REMOTE_ADMIN_PASSWORD_HASH=${hash}`);
    console.log('or');
    console.log(`REMOTE_CONTROLLER_PASSWORD_HASH=${hash}`);
    console.log();
    console.log('⚠️  Keep this hash secure and never commit it to version control!');
    return;
  }

  // Default: show help
  console.log('🔐 Stock Ticker Password Hash Generator\n');
  console.log('Commands:');
  console.log('  hash <password>   Generate bcrypt hash for a password');
  console.log('  secrets           Generate JWT secret, API key, and encryption key');
  console.log();
  console.log('Examples:');
  console.log('  node scripts/generate-password-hash.js hash mySecurePassword123');
  console.log('  node scripts/generate-password-hash.js secrets');
  console.log();
  console.log('Security Notes:');
  console.log('• Use strong, unique passwords (12+ characters)');
  console.log('• Include uppercase, lowercase, numbers, and symbols');
  console.log('• Never reuse passwords across systems');
  console.log('• Store hashes in environment variables only');
}

main();
