import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? './' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'vendor-router'
            if (id.includes('react-dom') || id.includes('react')) return 'vendor-react'
            if (id.includes('@supabase')) return 'vendor-supabase'
            if (id.includes('xlsx')) return 'vendor-xlsx'
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('@dnd-kit')) return 'vendor-dnd'
            if (id.includes('sonner')) return 'vendor-toast'
            return 'vendor-common'
          }
          if (id.includes('/src/pages/Reports')) return 'chunk-reports'
          if (id.includes('/src/pages/Dashboard')) return 'chunk-dashboard'
          return undefined
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'sonner',
      'lucide-react'
    ]
  }
}))
