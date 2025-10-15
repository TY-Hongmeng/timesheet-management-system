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
    host: '0.0.0.0', // 允许外部访问
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  build: {
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
    minify: 'terser',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Excel 处理库 - 最大的库，优先分离
          if (id.includes('xlsx')) {
            return 'excel';
          }
          // React 相关库 - 保持在一起
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // 路由库
          if (id.includes('react-router-dom')) {
            return 'router';
          }
          // Supabase 相关
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }
          // UI 组件库
          if (id.includes('lucide-react') || id.includes('sonner')) {
            return 'ui-components';
          }
          // 拖拽库
          if (id.includes('@dnd-kit')) {
            return 'dnd';
          }
          // 其他第三方库
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/\.(css)$/i.test(assetInfo.name)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js'
      }
    },
    chunkSizeWarningLimit: 500, // 降低警告阈值，鼓励更小的 chunk
    assetsInlineLimit: 2048, // 减少内联资源大小，减少初始包大小
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.warn'],
        passes: 3, // 增加压缩次数
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true
      },
      mangle: {
        safari10: true,
        properties: {
          regex: /^_/
        }
      },
      format: {
        comments: false
      }
    }
  },
  define: {
    global: 'globalThis'
  }
})
