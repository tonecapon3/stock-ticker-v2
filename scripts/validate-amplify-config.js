#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.amplify
dotenv.config({ path: resolve(__dirname, '../.env.amplify') });

console.log('🔍 Validating AWS Amplify configuration...\n');

// Check if using SSO or access keys
const usingSSO = process.env.USE_SSO === 'true';
console.log(`🔐 Authentication Mode: ${usingSSO ? 'AWS SSO' : 'Access Keys'}\n`);

const requiredVars = usingSSO
  ? [
      'AMPLIFY_APP_ID',
      'VITE_CLERK_PUBLISHABLE_KEY'
    ]
  : [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY', 
      'AMPLIFY_APP_ID',
      'VITE_CLERK_PUBLISHABLE_KEY'
    ];

const optionalVars = usingSSO
  ? [
      'AWS_REGION',
      'AWS_PROFILE',
      'AMPLIFY_BRANCH',
      'VITE_API_BASE_URL',
      'VITE_DEBUG_MODE',
      'VITE_LOG_LEVEL'
    ]
  : [
      'AWS_REGION',
      'AMPLIFY_BRANCH',
      'VITE_API_BASE_URL',
      'VITE_DEBUG_MODE',
      'VITE_LOG_LEVEL'
    ];

let hasErrors = false;

// Check required variables
console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value === `your_${varName.toLowerCase().replace(/_/g, '_')}_here` || value.includes('your_')) {
    console.log(`❌ ${varName}: Missing or using placeholder value`);
    hasErrors = true;
  } else {
    // Mask sensitive values
    const displayValue = varName.includes('KEY') || varName.includes('SECRET') 
      ? `${value.substring(0, 8)}...` 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value && !value.includes('your_')) {
    const displayValue = varName.includes('KEY') || varName.includes('SECRET') 
      ? `${value.substring(0, 8)}...` 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`⚠️  ${varName}: Using default or placeholder value`);
  }
});

if (hasErrors) {
  console.log('\n❌ Configuration validation failed!');
  console.log('Please edit .env.amplify with your actual values before deploying.');
  process.exit(1);
} else {
  console.log('\n✅ Configuration validation passed!');
  console.log('Ready to deploy environment variables to AWS Amplify.');
}
