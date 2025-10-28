import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/timesheet-management-system/' : '/',
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    hmr: true,
    headers: {
      'Cache-Control': 'no-cache'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    cors: true,
    headers: {
      'Cache-Control': 'no-cache'
    }
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    assetsInlineLimit: 0,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-core';
          }
          if (id.includes('react-router')) {
            return 'router';
          }
          if (id.includes('xlsx')) {
            return 'xlsx';
          }
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          if (id.includes('@dnd-kit') || id.includes('react-beautiful-dnd')) {
            return 'dnd';
          }
          if (id.includes('lucide-react') || id.includes('sonner')) {
            return 'ui';
          }
          if (id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'utils';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  define: {
    global: 'globalThis'
  }
})
