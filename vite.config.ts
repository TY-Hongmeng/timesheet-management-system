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
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 核心 React 库
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-core';
          }
          
          // 路由相关
          if (id.includes('react-router')) {
            return 'router';
          }
          
          // Excel 处理库 - 单独分割
          if (id.includes('xlsx')) {
            return 'xlsx';
          }
          
          // Supabase 相关
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          
          // DnD 相关库
          if (id.includes('@dnd-kit') || id.includes('react-beautiful-dnd')) {
            return 'dnd';
          }
          
          // UI 组件库
          if (id.includes('lucide-react') || id.includes('sonner')) {
            return 'ui';
          }
          
          // 工具库
          if (id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'utils';
          }
          
          // 其他第三方库
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
