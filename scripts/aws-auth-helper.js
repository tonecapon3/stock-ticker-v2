#!/usr/bin/env node

import { AmplifyClient, ListAppsCommand } from '@aws-sdk/client-amplify';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.amplify
dotenv.config({ path: resolve(__dirname, '../.env.amplify') });

async function testAWSConnection() {
  console.log('🧪 Testing AWS connection and permissions...\n');
  
  const region = process.env.AWS_REGION || 'us-east-1';
  console.log(`📍 Region: ${region}`);
  
  try {
    // Try default credential chain first
    console.log('🔐 Attempting to use default AWS credential chain...');
    const client = new AmplifyClient({ region });
    
    // Test connection by listing apps
    const command = new ListAppsCommand({});
    const response = await client.send(command);
    
    console.log('✅ AWS connection successful!');
    console.log(`📱 Found ${response.apps.length} Amplify apps in your account:`);
    
    if (response.apps.length > 0) {
      response.apps.forEach((app, index) => {
        console.log(`${index + 1}. ${app.name} (ID: ${app.appId})`);
      });
      
      console.log('\n💡 Copy one of the App IDs above to your .env.amplify file');
      console.log('   AMPLIFY_APP_ID=your_app_id_here');
    } else {
      console.log('⚠️  No Amplify apps found. Make sure you have apps deployed.');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ AWS connection failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure you have AWS credentials configured');
    console.log('2. Check if you have the correct region set');
    console.log('3. Verify your AWS user has Amplify permissions');
    console.log('4. Try: aws configure (to set up basic credentials)');
    console.log('5. Or: aws configure sso (for SSO setup)');
    return false;
  }
}

async function showCredentialOptions() {
  console.log('\n🔐 AWS Authentication Options:\n');
  
  console.log('Option 1: Basic AWS Credentials');
  console.log('   Run: aws configure');
  console.log('   Enter: Access Key ID, Secret Key, Region, Output format\n');
  
  console.log('Option 2: AWS SSO');
  console.log('   Run: aws configure sso');
  console.log('   Enter: SSO start URL, region, account, role\n');
  
  console.log('Option 3: Environment Variables');
  console.log('   Set: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
  console.log('   In your shell or .env.amplify file\n');
  
  console.log('Option 4: IAM Roles (for EC2/Lambda)');
  console.log('   Automatically used if running on AWS services\n');
}

// Run the test
const connectionWorked = await testAWSConnection();

if (!connectionWorked) {
  await showCredentialOptions();
  console.log('\nAfter setting up credentials, run this script again to test:');
  console.log('npm run test:aws');
}
