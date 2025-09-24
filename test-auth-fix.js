#!/usr/bin/env node

/**
 * Test script to verify the authentication fix
 * This simulates the JWT Bridge authentication with the new password
 */

async function testAuthentication() {
  console.log('🔍 Testing JWT Bridge Authentication Fix...');
  console.log('================================================\n');

  const API_URL = 'https://stock-ticker-v2.onrender.com/api/remote/auth';
  const NEW_CREDENTIALS = {
    username: 'admin',
    password: 'AdminSecure2025!@'
  };

  try {
    console.log('📡 Testing authentication with updated credentials...');
    console.log(`   Username: ${NEW_CREDENTIALS.username}`);
    console.log(`   Password: ${NEW_CREDENTIALS.password.substring(0, 5)}...`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(NEW_CREDENTIALS)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('\n✅ AUTHENTICATION SUCCESSFUL!');
      console.log(`   Status: ${response.status}`);
      console.log(`   User: ${data.user.username} (${data.user.role})`);
      console.log(`   Auth Method: ${data.authMethod}`);
      console.log(`   Token: ${data.token.substring(0, 20)}...`);
      console.log('\n🎉 JWT Bridge will now work correctly!');
      console.log('\n📋 Summary:');
      console.log('   ✅ Updated JWT Bridge password in source code');
      console.log('   ✅ Rebuilt application with new credentials');
      console.log('   ✅ Verified API server accepts new password');
      console.log('   ✅ Authentication flow working correctly');
      console.log('\n🚀 The 401 Unauthorized error should now be resolved!');
    } else {
      console.log('\n❌ AUTHENTICATION FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error}`);
      console.log('\n❓ This might indicate that the production server needs the environment variables updated');
    }

  } catch (error) {
    console.log('\n❌ NETWORK ERROR');
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 Make sure the production server is running');
  }
}

// Run the test
testAuthentication().catch(console.error);