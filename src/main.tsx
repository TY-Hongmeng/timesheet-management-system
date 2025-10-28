import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/globals.css";
import { initMobileCompatibility, checkBrowserCompatibility } from './utils/polyfills';
import { mobileOptimization } from './utils/mobileOptimization.js';

// 网络状态检测和应用初始化
class AppInitializer {
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 2000;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeApp();
    this.setupNetworkMonitoring();
    
    // 启动移动端稳定性增强器和资源加载优化
    console.log('🌐 Starting mobile optimization systems');
    this.initializeMobileOptimizations();
  }

  private async initializeMobileOptimizations() {
    try {
      // 基本移动端优化
      console.log('📱 移动端优化系统启动完成');
    } catch (error) {
      console.warn('📱 移动端优化启动失败:', error);
    }
  }

  private setupNetworkMonitoring() {
    // 监听网络状态变化
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // 监听移动端连接状态变化
    window.addEventListener('mobileConnectionChange', (event: any) => {
      const { type, networkState } = event.detail;
      console.log(`📱 移动端连接状态变化: ${type}`, networkState);
      
      switch (type) {
        case 'unstable':
          this.updateLoaderText('检测到网络不稳定，正在优化连接...');
          break;
        case 'restored':
          this.updateLoaderText('网络连接已恢复');
          break;
        case 'stable':
          // 网络稳定，无需特殊处理
          break;
      }
    });
    
    // 定期检查网络连接（降低频率以减少性能开销）
    this.connectionCheckInterval = setInterval(() => {
      this.checkNetworkConnection();
    }, 60000); // 每60秒检查一次，减少性能开销
  }

  private async checkNetworkConnection(): Promise<boolean> {
    try {
      // 简化网络检测，只使用 navigator.onLine
      return navigator.onLine;
    } catch (error) {
      console.warn('网络连接检查失败:', error);
      return navigator.onLine;
    }
  }

  private handleOnline() {
    console.log('网络连接已恢复');
    this.updateLoaderText('网络连接已恢复，正在重新初始化...');
    // 重置重试计数并重新初始化
    this.retryCount = 0;
    setTimeout(() => {
      this.initializeApp();
    }, 1000);
  }

  private handleOffline() {
    console.log('网络连接已断开');
    this.updateLoaderText('网络连接已断开，请检查网络设置');
    this.showNetworkError();
  }

  private async initializeApp() {
    try {
      this.updateLoaderText('正在初始化兼容性支持...');
      
      // 初始化移动端兼容性
      if (typeof initMobileCompatibility === 'function') {
        initMobileCompatibility();
      }
      
      // 检查浏览器兼容性
      if (typeof checkBrowserCompatibility === 'function') {
        const compatibility = checkBrowserCompatibility();
        console.log('浏览器兼容性检测完成:', compatibility);
      }
      
      // 更新加载状态
      this.updateLoaderText('正在初始化应用...');

      // 简单的网络状态检查
      if (!navigator.onLine) {
        this.handleOfflineState();
        return;
      }

      // 预加载关键资源（简化版）
      await this.preloadCriticalResources();

      // 注册 Service Worker
      await this.registerServiceWorker();

      // 渲染应用
      this.renderApp();

    } catch (error) {
      console.error('应用初始化失败:', error);
      this.handleInitializationError(error);
    }
  }

  private async preloadCriticalResources() {
    try {
      this.updateLoaderText('正在加载核心资源...');
      
      // 进一步简化预加载逻辑，减少性能开销
      // 只在必要时预加载，避免影响首屏加载速度
      if (navigator.connection && navigator.connection.effectiveType === '4g') {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = '/timesheet-management-system/favicon.svg';
        document.head.appendChild(link);
      }
      
      // 减少等待时间
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.warn('预加载资源失败:', error);
      // 预加载失败不应该阻止应用启动
    }
  }

  private async registerServiceWorker() {
    // 移动端和生产环境才注册 Service Worker
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isProduction = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    
    if ('serviceWorker' in navigator && (isMobile || isProduction)) {
      try {
        this.updateLoaderText('正在注册服务工作者...');
        
        // 先清理旧的 Service Worker
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.scope.includes('timesheet-management-system')) {
            console.log('清理旧的 Service Worker:', registration.scope);
            await registration.unregister();
          }
        }
        
        // 清理缓存
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            if (cacheName.includes('timesheet-v1.3') || cacheName.includes('static-v1.3') || cacheName.includes('dynamic-v1.3')) {
              console.log('清理旧缓存:', cacheName);
              await caches.delete(cacheName);
            }
          }
        }
        
        const registration = await navigator.serviceWorker.register('/timesheet-management-system/sw.js', {
          scope: '/timesheet-management-system/',
          updateViaCache: 'none' // 强制更新
        });
        
        console.log('Service Worker 注册成功:', registration);
        
        // 监听更新
        registration.addEventListener('updatefound', () => {
          console.log('发现 Service Worker 更新');
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 新的 Service Worker 已安装，提示用户刷新
                console.log('新版本可用，建议刷新页面');
                if (isMobile) {
                  // 移动端自动刷新
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                }
              }
            });
          }
        });
        
      } catch (error) {
        console.warn('Service Worker 注册失败:', error);
        // Service Worker 注册失败不应该阻止应用启动
      }
    } else {
      console.log('跳过 Service Worker 注册 - 非移动端或非生产环境');
    }
  }

  private renderApp() {
    try {
      this.updateLoaderText('正在启动应用...');
      
      // 初始化移动端优化
      console.log('📱 Mobile optimization status:', mobileOptimization.getStatus());
      
      const container = document.getElementById("root");
      if (!container) {
        throw new Error('找不到根容器元素');
      }

      const root = createRoot(container);
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );

      // 隐藏加载屏幕 - 优化跳转时机，减少黑屏
      // 检查加载是否已完成，如果是则立即跳转
      if ((window as any).loadingComplete) {
        // 加载进度已经100%，立即跳转
        if (window.hideInitialLoader) {
          window.hideInitialLoader();
        }
      } else {
        // 加载进度还没到100%，等待一小段时间
        setTimeout(() => {
          if (window.hideInitialLoader) {
            window.hideInitialLoader();
          }
        }, 100); // 大幅减少延迟时间
      }

      console.log('应用启动成功');
      
    } catch (error) {
      console.error('应用渲染失败:', error);
      this.handleInitializationError(error);
    }
  }

  private handleOfflineState() {
    this.updateLoaderText('当前处于离线状态');
    this.showNetworkError();
    
    // 在离线状态下，仍然尝试渲染应用（可能有缓存的资源）
    setTimeout(() => {
      try {
        this.renderApp();
      } catch (error) {
        console.error('离线模式下应用启动失败:', error);
      }
    }, 2000);
  }

  private handleInitializationError(error: any) {
    this.retryCount++;
    
    const isNetworkError = error.message?.includes('fetch') || 
                          error.message?.includes('network') ||
                          error.message?.includes('Failed to import');

    if (isNetworkError && this.retryCount <= this.maxRetries) {
      this.updateLoaderText(`网络连接失败，正在重试... (${this.retryCount}/${this.maxRetries})`);
      
      // 指数退避重试
      const delay = this.retryDelay * Math.pow(1.5, this.retryCount - 1);
      setTimeout(() => {
        this.initializeApp();
      }, delay);
      
    } else if (this.retryCount <= this.maxRetries) {
      this.updateLoaderText(`初始化失败，正在重试... (${this.retryCount}/${this.maxRetries})`);
      
      setTimeout(() => {
        this.initializeApp();
      }, this.retryDelay);
      
    } else {
      this.updateLoaderText('应用启动失败');
      this.showFinalError(error);
    }
  }

  private updateLoaderText(text: string) {
    // 新的加载系统会自动管理文本更新，这里只记录日志
    console.log('加载状态:', text);
  }

  private showNetworkError() {
    const errorMessage = document.getElementById('error-message');
    const retryButton = document.getElementById('retry-button');
    
    if (errorMessage && retryButton) {
      errorMessage.textContent = '网络连接异常，请检查网络设置后重试';
      errorMessage.style.display = 'block';
      retryButton.style.display = 'inline-block';
      
      // 添加重试按钮事件
      retryButton.onclick = () => {
        this.retryCount = 0;
        errorMessage.style.display = 'none';
        retryButton.style.display = 'none';
        this.initializeApp();
      };
    }
  }

  private showFinalError(error: any) {
    const errorMessage = document.getElementById('error-message');
    const retryButton = document.getElementById('retry-button');
    
    if (errorMessage && retryButton) {
      errorMessage.textContent = `应用启动失败: ${error.message || '未知错误'}。请刷新页面重试。`;
      errorMessage.style.display = 'block';
      retryButton.textContent = '刷新页面';
      retryButton.style.display = 'inline-block';
      
      retryButton.onclick = () => {
        window.location.reload();
      };
    }
  }

  // 清理资源
  public cleanup() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
  }
}

// 初始化应用
const appInitializer = new AppInitializer();

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  appInitializer.cleanup();
});

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 错误:', event.reason);
});
