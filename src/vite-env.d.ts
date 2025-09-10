/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STORAGE_ENCRYPTION_KEY?: string
  readonly VITE_DEBUG_MODE?: string
  readonly VITE_LOG_LEVEL?: string
  readonly VITE_STOCK_API_KEY?: string
  readonly VITE_STOCK_API_URL?: string
  readonly VITE_CURRENCY_API_KEY?: string
  readonly VITE_CURRENCY_API_URL?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_ENFORCE_HTTPS?: string
  readonly VITE_ENABLE_HSTS?: string
  readonly VITE_ENABLE_CSP?: string
  // Clerk Authentication
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
  readonly CLERK_SECRET_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
