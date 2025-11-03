import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { copyFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { ViteDevServer, PreviewServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

// 复制根目录 404.html 到构建输出的插件
const copyRoot404Plugin = () => {
  return {
    name: 'copy-root-404',
    writeBundle() {
      const rootPath = resolve(__dirname, '404.html');
      const distPath = resolve(__dirname, 'dist', '404.html');
      
      if (existsSync(rootPath)) {
        try {
          copyFileSync(rootPath, distPath);
          console.log('✅ 根目录 404.html 已复制到 dist 目录');
        } catch (error) {
          console.error('❌ 复制根目录 404.html 失败:', error);
        }
      } else {
        console.warn('⚠️ 根目录 404.html 文件不存在');
      }
    }
  };
};

// 强制性 MIME 类型插件 - 确保正确的 Content-Type 头部
const forceMimeTypePlugin = () => {
  return {
    name: 'force-mime-type',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || '';
        
        // 为不同文件类型设置正确的 MIME 类型
        if (url.endsWith('.js') || url.endsWith('.mjs') || url.endsWith('.jsx')) {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        } else if (url.endsWith('.ts') || url.endsWith('.tsx')) {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        } else if (url.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        } else if (url.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        } else if (url.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        
        next();
      });
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || '';
        
        // 为不同文件类型设置正确的 MIME 类型
        if (url.endsWith('.js') || url.endsWith('.mjs') || url.endsWith('.jsx')) {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        } else if (url.endsWith('.ts') || url.endsWith('.tsx')) {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        } else if (url.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        } else if (url.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        } else if (url.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        
        next();
      });
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/timesheet-management-system/' : '/',
  plugins: [
    react(),
    tsconfigPaths(),
    forceMimeTypePlugin(),
    copyRoot404Plugin(),
  ],
  server: {
    host: 'localhost',
    port: 5173,
    cors: true,
    hmr: {
      port: 5173,
      host: 'localhost'
    },
    headers: {
      'Cache-Control': 'no-cache'
    },
    middlewareMode: false,
    fs: {
      strict: false
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
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss: ws:;"
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
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) {
            return `assets/[name]-[hash].[ext]`;
          }
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash].[ext]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash].[ext]`;
          }
          if (/js|mjs|ts|tsx/i.test(ext)) {
            return `assets/js/[name]-[hash].js`;
          }
          return `assets/[name]-[hash].[ext]`;
        },
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
  },
  esbuild: {
    target: 'es2015',
    format: 'esm',
    platform: 'browser'
  }
})
