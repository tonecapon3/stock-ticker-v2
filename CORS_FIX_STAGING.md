# 🔧 CORS Fix for Staging Instance

## 🚨 Current Issue

Your staging instance at `https://staging.dv565hju499c6.amplifyapp.com` is getting CORS errors because the backend API server doesn't allow requests from this domain.

**Error seen in browser console:**
```
Access to fetch at 'https://stock-ticker-v2.onrender.com/api/remote/controls' 
from origin 'https://staging.dv565hju499c6.amplifyapp.com' has been blocked by CORS policy
```

## ✅ Solution: Update Backend CORS Configuration

### Step 1: Go to Render Dashboard

1. **Open**: https://dashboard.render.com/
2. **Login** with your credentials
3. **Find service**: `stock-ticker-v2` (your API server)
4. **Click** on the service to open it

### Step 2: Update Environment Variables

1. **Click** on the "Environment" tab
2. **Find** the variable: `REMOTE_ALLOWED_ORIGINS`
3. **Current value**:
   ```
   http://localhost:3000,http://127.0.0.1:3000,https://main.d7lc7dqjkvbj3.amplifyapp.com
   ```
4. **Update to** (add your staging URL):
   ```
   http://localhost:3000,http://127.0.0.1:3000,https://main.d7lc7dqjkvbj3.amplifyapp.com,https://staging.dv565hju499c6.amplifyapp.com
   ```

### Step 3: Save and Redeploy

1. **Click "Save Changes"**
2. **Wait for automatic redeploy** (~2-3 minutes)
3. **Monitor the deploy logs** to ensure it completes successfully

### Step 4: Test the Fix

After the redeploy completes:

1. **Refresh your staging instance**: https://staging.dv565hju499c6.amplifyapp.com
2. **Open browser console** (F12)
3. **Check for API connectivity** - CORS errors should be gone
4. **Verify data loading** - stocks and controls should load from API

## 🧪 Verify CORS Fix

You can test if CORS is working with this command:

```bash
curl -H "Origin: https://staging.dv565hju499c6.amplifyapp.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://stock-ticker-v2.onrender.com/api/remote/stocks -v
```

**Before fix**: No `Access-Control-Allow-Origin` header
**After fix**: Should include `Access-Control-Allow-Origin: https://staging.dv565hju499c6.amplifyapp.com`

## 📊 Expected Results

After applying the fix:

### ✅ What Should Work:
- ✅ Staging instance loads without CORS errors
- ✅ Stock data updates from API server
- ✅ Controls panel shows "API server is Online"  
- ✅ Session isolation still works (separate from production)
- ✅ Authentication works independently on both instances

### 🔍 Browser Console Should Show:
- `🌐 Production API server configured`
- `✅ API server is healthy`
- `🔒 Serving isolated data to user: [username]`

Instead of:
- ❌ `Access to fetch... has been blocked by CORS policy`
- ❌ `Could not fetch from API, using local data`

## 🚨 Important Notes

1. **Both Instances Will Work**: After this fix, both production and staging will connect to the same API server
2. **Session Isolation Maintained**: Each instance still has separate sessions due to `VITE_INSTANCE_ID` configuration
3. **Same Backend Data**: Both instances will show the same stock data (this is expected)
4. **Independent Authentication**: Users can be logged in to both instances simultaneously

## 🔄 Rollback Plan

If something goes wrong, you can quickly rollback:

1. **Go back to Render dashboard**
2. **Remove staging URL** from `REMOTE_ALLOWED_ORIGINS`:
   ```
   http://localhost:3000,http://127.0.0.1:3000,https://main.d7lc7dqjkvbj3.amplifyapp.com
   ```
3. **Save changes** to redeploy
4. **Production will continue working** normally

## ⏱️ Timeline

- **Environment variable update**: 30 seconds
- **Automatic redeploy**: 2-3 minutes  
- **CORS fix active**: Immediately after redeploy
- **Total time**: ~3-4 minutes

## 📞 Need Help?

If you encounter issues:

1. **Check Render deploy logs** for any errors
2. **Verify the environment variable** was saved correctly
3. **Test production instance** to ensure it still works
4. **Clear browser cache** on staging instance and try again

---

**🎯 This fix will enable your dual Amplify setup with session isolation to work perfectly!**