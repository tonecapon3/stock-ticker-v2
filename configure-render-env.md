# 🚀 Configure Render API Server Environment Variables

Your API server is running but needs proper environment variables configured in the Render dashboard.

## 📋 Required Environment Variables

Please go to your [Render Dashboard](https://dashboard.render.com/) → **stock-ticker-api** → **Environment** tab and add/update these variables:

### 🔐 Authentication & Security
```bash
# JWT Secret for API authentication (REQUIRED)
REMOTE_JWT_SECRET=/tZrZx68cxQpZ0WuEoStG4RD85re9sDtrdzwomx3HxU=

# API Key for additional security (REQUIRED)  
REMOTE_API_KEY=LUVNroP7aO2aedMBooqyANXgueM5iAsg

# Admin user credentials (REQUIRED)
REMOTE_ADMIN_USERNAME=admin
REMOTE_ADMIN_PASSWORD_HASH=$2b$10$9kJ/45uz.CnG4Ylj9BfFtOHdMaailgFBvF3l/00UBuKDd3oaAJdXW

# Controller user credentials (REQUIRED)
REMOTE_CONTROLLER_USERNAME=controller
REMOTE_CONTROLLER_PASSWORD_HASH=$2b$10$o2WHpulvsFUpQERSNdIo0u4GMNQKB2/qTndXHqfa0Xtbv9EnZ52IO
```

### 🌐 CORS Configuration (CRITICAL)
```bash
# Frontend domains (MUST INCLUDE YOUR AMPLIFY DOMAIN)
REMOTE_ALLOWED_ORIGINS=https://main.d7lc7dqjkvbj3.amplifyapp.com,https://d7lc7dqjkvbj3.amplifyapp.com,http://localhost:3000
```

### 🔧 Clerk Integration (Optional but Recommended)
```bash
# Clerk keys for enhanced authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_d29ya2FibGUtbWFydGluLTAuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_SThTzDsbXHbUr9wjn1srdFmnMXTrkeAxCu5gOif5uW
```

### 🖥️ Server Configuration
```bash
# Server settings (should already be set)
NODE_ENV=production
PORT=10000
RENDER_SERVICE_TYPE=api
```

## 🧪 Test Credentials

After configuring the environment variables, you can test the API with these credentials:

- **Username:** `admin`
- **Password:** `admin123`

## ⚡ Quick Setup Steps

1. **Go to Render Dashboard:** https://dashboard.render.com/
2. **Find your service:** `stock-ticker-api`
3. **Click Environment tab**
4. **Add each variable above**
5. **Save Changes** (this will trigger a redeploy)
6. **Wait for deployment** to complete (~2-3 minutes)

## 🔍 Verification

Once configured, test the API server:

```bash
# Test health endpoint
curl https://stock-ticker-v2.onrender.com/status/health

# Test authentication
curl -X POST https://stock-ticker-v2.onrender.com/api/remote/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

## ⚠️ Important Notes

- The **REMOTE_ALLOWED_ORIGINS** variable is **critical** - without your Amplify domain, CORS will block frontend requests
- All password hashes are already generated for development passwords
- After saving environment variables, Render will automatically redeploy (~2-3 minutes)
- The API server will only work properly once all required variables are set

---

**Next Step:** After configuring these variables, proceed with testing the API connectivity!