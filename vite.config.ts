import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'

// Force cache-busting with timestamp
const timestamp = Date.now();

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: mode === 'production',
      rollupOptions: {
        output: {
          // Force new filenames on every build
          entryFileNames: `assets/[name]-${timestamp}.[hash].js`,
          chunkFileNames: `assets/[name]-${timestamp}.[hash].js`,
          assetFileNames: `assets/[name]-${timestamp}.[hash].[ext]`
        }
      }
    },
    css: {
      postcss: './postcss.config.js',
    },
    // Define global constants that can be used in the app
    define: {
      __APP_ENV__: JSON.stringify(mode),
    },
  }
})
