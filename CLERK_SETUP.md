# Clerk Authentication Setup

This guide will help you set up Clerk authentication for the Stock Ticker application.

## 🚀 What's Been Completed

✅ Clerk packages installed (`@clerk/clerk-react`, `@clerk/themes`)  
✅ Environment configuration files created  
✅ Clerk configuration file with dark theme styling  
✅ TypeScript definitions updated  
✅ ClerkProvider wrapped around the entire app in `main.tsx`  
✅ Authentication components created (SignIn, SignUp, UserProfile)  
✅ Protected routes implemented with AuthGuard  
✅ Custom authentication hooks (`useAuth`, `useAuthState`, `useUserInfo`)  
✅ Authentication UI integrated into main app header  
✅ Loading states and error boundaries added  

## 📋 Next Steps

### 1. Get Your Clerk Keys

1. Go to [https://dashboard.clerk.com/](https://dashboard.clerk.com/)
2. Sign up or log in to your Clerk account
3. Create a new application or select an existing one
4. Go to the "API Keys" section
5. Copy your **Publishable Key** and **Secret Key**

### 2. Configure Environment Variables

1. Copy the template file:
   ```bash
   cp .env.local.template .env.local
   ```

2. Edit `.env.local` and replace the placeholder keys:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your-actual-publishable-key-here
   CLERK_SECRET_KEY=sk_test_your-actual-secret-key-here
   ```

   **Important:** Use your actual Clerk keys from step 1.

### 3. Test the Configuration

Run the development server to verify everything is set up correctly:
```bash
npm run dev
```

The application should start without errors. If you see a Clerk configuration error, double-check your environment variables.

## 📁 Files Created/Modified

### New Files:
- `.env` - Base environment configuration
- `.env.local.template` - Template for local development
- `src/config/clerk.ts` - Clerk configuration with dark theme
- `CLERK_SETUP.md` - This setup guide

### Modified Files:
- `src/vite-env.d.ts` - Added TypeScript definitions for Clerk environment variables

## 🎨 Theme Configuration

The Clerk configuration includes a dark theme that matches your stock ticker application:

- **Primary Color:** Blue (#3B82F6)
- **Background:** Dark gray (#1F2937)
- **Input Styling:** Dark theme with proper contrast
- **Custom Branding:** Stock Ticker specific text and styling

## 🔧 Configuration Details

The Clerk configuration in `src/config/clerk.ts` includes:

- **Appearance Customization:** Dark theme matching your app
- **Localization:** Custom text for sign-in/sign-up pages
- **Redirect URLs:** Configured for your application flow
- **Error Handling:** Validates required environment variables

## 🛠️ Implementation Details

### Authentication Flow
1. **ClerkProvider** wraps the entire app in `main.tsx`
2. **AuthGuard** protects routes that require authentication
3. **SignIn/SignUp** components handle user authentication
4. **UserProfile** component manages user settings
5. **Custom hooks** provide easy access to auth state

### Components Created
- `src/components/auth/SignInPage.tsx` - Sign-in interface
- `src/components/auth/SignUpPage.tsx` - Sign-up interface
- `src/components/auth/AuthGuard.tsx` - Route protection
- `src/components/auth/UserProfile.tsx` - User management
- `src/components/auth/AuthLoading.tsx` - Loading states
- `src/hooks/useAuth.ts` - Authentication utilities

### Protected Routes
- `/` - Main stock ticker dashboard (requires authentication)
- `/remote` - Remote control panel (requires authentication)
- `/profile` - User profile management (requires authentication)

### Public Routes
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page

## 📝 Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for frontend | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key for server-side | Yes |
| `VITE_API_BASE_URL` | Your API base URL | No |
| `NODE_ENV` | Environment (development/production) | No |

## 🚨 Security Notes

- Never commit `.env.local` to version control
- The `.env` file contains placeholder values only
- Use different keys for development and production environments
- Keep your Clerk secret key secure and only use it server-side

## 🐛 Troubleshooting

### "Missing Clerk Publishable Key" Error
- Check that `VITE_CLERK_PUBLISHABLE_KEY` is set in your `.env.local`
- Ensure the key starts with `pk_test_` or `pk_live_`
- Restart your development server after changing environment variables

### Build Errors
- Ensure all TypeScript types are properly defined
- Check that Clerk packages are installed correctly
- Verify environment variables are accessible at build time

## 📞 Support

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk GitHub](https://github.com/clerkinc/clerk-sdk-node)
- [Clerk Community Discord](https://clerk.com/discord)
