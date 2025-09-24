#!/bin/bash

# Deploy Instance Isolation Fix to Production Backend
# This script merges the instance isolation code to main branch

set -e

echo "🚀 Deploying Instance Isolation Fix..."
echo ""

# Check current status
echo "📍 Current branch:"
git branch --show-current

echo ""
echo "📋 Recent commits on staging:"
git log --oneline -5 staging

echo ""
echo "🔄 Switching to main branch..."
git checkout main

echo ""
echo "📥 Pulling latest main branch changes..."
git pull origin main

echo ""
echo "🔀 Merging staging instance isolation changes..."
git merge staging -m "🔒 Deploy instance isolation fix to production

- Merge staging branch with instance-based data isolation
- Fixes data sharing issue between staging and production instances  
- Implements server-instance-isolated.cjs with complete data separation
- Each instance now has isolated user data and demo data
- Session key format: userId_instanceId for complete isolation"

echo ""
echo "📤 Pushing to main branch..."
git push origin main

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📊 Next Steps:"
echo "1. Wait 2-3 minutes for Render to redeploy"
echo "2. Test the health endpoint: curl https://stock-ticker-v2.onrender.com/api/health"
echo "3. Verify version shows: 2.0.0-instance-isolated"
echo "4. Test data isolation between instances"
echo ""
echo "🧪 Test Commands:"
echo "# Health check"
echo "curl https://stock-ticker-v2.onrender.com/api/health"
echo ""
echo "# Instance detection test"
echo 'curl "https://stock-ticker-v2.onrender.com/api/remote/session-info" -H "Origin: https://staging.dv565hju499c6.amplifyapp.com"'
echo ""
echo "🎯 Expected Result: Staging and production instances will have separate data!"
echo ""

# Switch back to staging for continued development
echo "🔄 Switching back to staging branch for continued development..."
git checkout staging

echo ""
echo "🎉 Instance isolation fix deployed successfully!"
echo "Data sharing between staging and production should now be resolved."