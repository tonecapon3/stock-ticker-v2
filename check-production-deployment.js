#!/usr/bin/env node

/**
 * Production Deployment Checker
 * 
 * This script checks if the production deployment has been updated
 * with the latest authentication fixes by looking for the new build files.
 */

async function checkProductionDeployment() {
  console.log('🔍 Checking Production Deployment Status');
  console.log('=========================================\n');

  const buildFiles = [
    'index-7FXF0iss.js',  // Current latest build
    'index-B-kC_-89.js',  // Previous build
    'index-n-UKNBLO.js'   // Old cached build (problematic)
  ];

  // Common production URLs - update these with your actual deployment URLs
  const productionUrls = [
    'https://main.d7lc7dqjkvbj3.amplifyapp.com',  // AWS Amplify
    // Add other deployment URLs here if you have them
  ];

  for (const baseUrl of productionUrls) {
    console.log(`🌍 Checking: ${baseUrl}\n`);
    
    let foundLatest = false;
    
    for (const buildFile of buildFiles) {
      const url = `${baseUrl}/assets/${buildFile}`;
      
      try {
        const response = await fetch(url, { method: 'HEAD' });
        
        if (response.ok) {
          const status = buildFile === 'index-7FXF0iss.js' ? '✅ LATEST' : 
                        buildFile === 'index-B-kC_-89.js' ? '⚠️  OLD' : '❌ CACHED';
          
          console.log(`   ${status}: ${buildFile} (${response.status})`);
          
          if (buildFile === 'index-7FXF0iss.js') {
            foundLatest = true;
          }
        }
      } catch (error) {
        // File not found, which is expected for most
      }
    }
    
    if (foundLatest) {
      console.log(`\n🎉 SUCCESS: Production is serving the latest build with authentication fixes!`);
      console.log(`🔧 The 401 errors should now be resolved.`);
    } else {
      console.log(`\n⏳ PENDING: Production is not yet serving the latest build.`);
      console.log(`📱 Please wait for deployment to complete and try refreshing the page.`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }

  console.log('💡 If you still see 401 errors after the latest build is live:');
  console.log('   1. Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)');
  console.log('   2. Clear browser cache');
  console.log('   3. Try an incognito/private browsing window');
}

// Run the check
checkProductionDeployment().catch(console.error);