#!/usr/bin/env node

import { AmplifyClient, UpdateAppCommand, UpdateBranchCommand } from '@aws-sdk/client-amplify';
import { fromSSO } from '@aws-sdk/credential-providers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.amplify
dotenv.config({ path: resolve(__dirname, '../.env.amplify') });

// Create Amplify client with SSO credentials support
let client;
try {
  // Try to use SSO credentials first
  if (process.env.AWS_PROFILE || process.env.USE_SSO === 'true') {
    console.log('🔐 Using AWS SSO credentials...');
    client = new AmplifyClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: fromSSO({
        profile: process.env.AWS_PROFILE || 'default'
      })
    });
  } else {
    // Fallback to standard credentials
    console.log('🔐 Using AWS access key credentials...');
    client = new AmplifyClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }
} catch (error) {
  // Final fallback - use default credential chain
  console.log('🔐 Using default AWS credential chain...');
  client = new AmplifyClient({ region: process.env.AWS_REGION || 'us-east-1' });
}

const APP_ID = process.env.AMPLIFY_APP_ID;
const BRANCH_NAME = process.env.AMPLIFY_BRANCH || 'main';

// App-level environment variables
const appEnvironmentVariables = {
  'VITE_CLERK_PUBLISHABLE_KEY': process.env.VITE_CLERK_PUBLISHABLE_KEY,
  'VITE_API_BASE_URL': process.env.VITE_API_BASE_URL,
  'VITE_DEBUG_MODE': process.env.VITE_DEBUG_MODE || 'false',
  'VITE_LOG_LEVEL': process.env.VITE_LOG_LEVEL || 'warn',
  'NODE_ENV': 'production'
};

// Branch-level environment variables
const branchEnvironmentVariables = {
  'VITE_ENFORCE_HTTPS': 'true',
  'VITE_ENABLE_HSTS': 'true',
  'VITE_ENABLE_CSP': 'true'
};

async function deployEnvironmentVariables() {
  try {
    console.log('🚀 Deploying environment variables to AWS Amplify...');
    
    // Update app-level environment variables
    const updateAppCommand = new UpdateAppCommand({
      appId: APP_ID,
      environmentVariables: appEnvironmentVariables
    });
    
    await client.send(updateAppCommand);
    console.log('✅ App-level environment variables updated');
    
    // Update branch-level environment variables
    const updateBranchCommand = new UpdateBranchCommand({
      appId: APP_ID,
      branchName: BRANCH_NAME,
      environmentVariables: branchEnvironmentVariables
    });
    
    await client.send(updateBranchCommand);
    console.log('✅ Branch-level environment variables updated');
    
    console.log('🎉 Environment variables deployment completed!');
    
    // Log the variables (without sensitive values)
    console.log('\n📊 Deployed Variables:');
    Object.keys(appEnvironmentVariables).forEach(key => {
      const value = key.includes('KEY') || key.includes('SECRET') 
        ? '********' 
        : appEnvironmentVariables[key];
      console.log(`  ${key}: ${value}`);
    });
    
    Object.keys(branchEnvironmentVariables).forEach(key => {
      console.log(`  ${key}: ${branchEnvironmentVariables[key]}`);
    });
    
  } catch (error) {
    console.error('❌ Error deploying environment variables:', error);
    process.exit(1);
  }
}

if (!APP_ID) {
  console.error('❌ Error: AMPLIFY_APP_ID environment variable is required');
  process.exit(1);
}

deployEnvironmentVariables();
