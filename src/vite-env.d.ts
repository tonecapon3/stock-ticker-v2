/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACCESS_CODE?: string
  readonly VITE_SESSION_TIMEOUT?: string
  readonly VITE_MAX_LOGIN_ATTEMPTS?: string
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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
