# 🔄 Backend Service Wake-Up Guide

## 🚨 Current Issue Explained

You're seeing CORS errors, but the **real issue** is that your backend service is **hibernating** on Render's free tier.

### What's Actually Happening:

1. **Service Hibernation**: `https://stock-ticker-v2.onrender.com` is sleeping due to inactivity
2. **503 Service Unavailable**: Server returns 503 without CORS headers
3. **Browser Shows CORS Error**: Browser can't process 503 response without proper headers
4. **Hidden Root Cause**: The 503 error is masked by CORS error messages

### Error Headers Seen:
```
HTTP/2 503
x-render-routing: dynamic-hibernate-error-503
```

This confirms the service is hibernating.

## ✅ Solution: Wake Up the Backend Service

### Method 1: Manual Wake-Up (Immediate)

Run these commands to wake up the service:

```bash
# Attempt to wake up the service with multiple requests
echo "Waking up backend service..."
curl https://stock-ticker-v2.onrender.com/api/remote/stocks &
curl https://stock-ticker-v2.onrender.com/api/health &
curl https://stock-ticker-v2.onrender.com/ &

# Wait for wake-up (30-60 seconds)
sleep 60

# Test if service is awake
curl -I https://stock-ticker-v2.onrender.com/api/remote/stocks
```

### Method 2: Wake Up via Browser

1. **Open these URLs** in browser tabs (multiple requests help wake it faster):
   - https://stock-ticker-v2.onrender.com/api/remote/stocks
   - https://stock-ticker-v2.onrender.com/api/remote/controls
   - https://stock-ticker-v2.onrender.com/api/health

2. **Wait 60-90 seconds** for service to fully start

3. **Refresh your staging instance**: https://staging.dv565hju499c6.amplifyapp.com

### Method 3: Render Dashboard Wake-Up

1. **Go to**: https://dashboard.render.com/
2. **Find service**: `stock-ticker-v2`
3. **Look for**: "Service is sleeping" message
4. **Click**: Any logs or restart option to wake it up

## 🧪 Verify Service is Awake

### Test Command:
```bash
curl -s https://stock-ticker-v2.onrender.com/api/remote/stocks | head -5
```

### Expected Response (Service Awake):
```json
{
  "success": true,
  "stocks": [
    {
      "symbol": "BNOX",
```

### Bad Response (Still Sleeping):
```
(empty response or HTML error page)
```

## 📊 Timeline for Wake-Up

- **Initial requests**: 0-30 seconds (service starting)
- **Service fully awake**: 30-60 seconds
- **CORS errors disappear**: Immediately after service is awake
- **Frontend works normally**: After service is awake

## 🔧 Still Need CORS Fix After Wake-Up

Once the service is awake, you **still need** to add your staging URL to CORS:

### Go to Render Dashboard:
1. **Service**: `stock-ticker-v2`
2. **Environment tab**
3. **Variable**: `REMOTE_ALLOWED_ORIGINS`
4. **Add**: `,https://staging.dv565hju499c6.amplifyapp.com` to the end
5. **Save** (triggers redeploy)

### Current Value:
```
http://localhost:3000,http://127.0.0.1:3000,https://main.d7lc7dqjkvbj3.amplifyapp.com
```

### New Value:
```
http://localhost:3000,http://127.0.0.1:3000,https://main.d7lc7dqjkvbj3.amplifyapp.com,https://staging.dv565hju499c6.amplifyapp.com
```

## 🎯 Complete Fix Process

1. **Wake up service** (Methods above) - **Do this first**
2. **Add CORS configuration** (Render dashboard) - **Do this second** 
3. **Wait for redeploy** (2-3 minutes) - **Wait for this**
4. **Test staging instance** - **Should work perfectly**

## 🔍 How to Tell Which Issue You Have

### Service Hibernating (Current):
- Browser shows: CORS policy errors
- Curl shows: `HTTP/2 503` + `x-render-routing: dynamic-hibernate-error-503`
- Solution: Wake up service first

### CORS Configuration Missing (After wake-up):
- Browser shows: CORS policy errors  
- Curl shows: `HTTP/2 200` but no `Access-Control-Allow-Origin` header
- Solution: Update REMOTE_ALLOWED_ORIGINS

### Everything Working:
- Browser shows: No CORS errors
- Curl shows: `HTTP/2 200` + `Access-Control-Allow-Origin: https://staging.dv565hju499c6.amplifyapp.com`
- Result: Staging instance works perfectly

## 🚨 Render Free Tier Hibernation

This hibernation behavior is **normal** for Render's free tier:
- Services sleep after **15 minutes** of inactivity
- **Cold start** takes 30-60 seconds when waking up
- **Upgrade to paid plan** eliminates hibernation

## ⏰ Quick Action Steps

**Right now, do this:**

1. **Open in browser**: https://stock-ticker-v2.onrender.com/api/remote/stocks
2. **Wait 60 seconds** for it to load (will show JSON data)
3. **Refresh staging**: https://staging.dv565hju499c6.amplifyapp.com
4. **If still CORS errors**: Update REMOTE_ALLOWED_ORIGINS in Render dashboard

---

**🎉 Once the service is awake AND CORS is configured, your dual Amplify setup with session isolation will work perfectly!**