import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/globals.css";
import { initMobileCompatibility, checkBrowserCompatibility } from './utils/polyfills';
import { mobileOptimization } from './utils/mobileOptimization.js';
import { mobileStabilityEnhancer } from './utils/mobileStabilityEnhancer.js';
import { mobileResourceLoader } from './utils/mobileResourceLoader';

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
      // 进一步延迟移动端优化，确保首屏完全加载完成后再执行
      setTimeout(() => {
        // 只在用户交互后或页面空闲时执行移动端优化
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            mobileResourceLoader.optimizeMobileCache();
          }, { timeout: 5000 });
        } else {
          setTimeout(() => {
            mobileResourceLoader.optimizeMobileCache();
          }, 5000);
        }
      }, 3000); // 延迟到3秒后
      
      console.log('📱 移动端优化系统已安排延迟启动（超轻量模式）');
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
    
    // 进一步降低网络检查频率，减少性能开销
    this.connectionCheckInterval = setInterval(() => {
      this.checkNetworkConnection();
    }, 120000); // 每2分钟检查一次，大幅减少性能开销
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
    // 移除favicon预加载逻辑，减少首屏加载时间
    // favicon会在浏览器需要时自动加载，无需预加载
    console.log('跳过非关键资源预加载，优化首屏性能');
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      try {
        this.updateLoaderText('正在注册服务工作者...');
        
        const registration = await navigator.serviceWorker.register('/timesheet-management-system/sw.js', {
          scope: '/timesheet-management-system/'
        });
        
        console.log('Service Worker 注册成功:', registration);
        
        // 监听更新
        registration.addEventListener('updatefound', () => {
          console.log('发现 Service Worker 更新');
        });
        
      } catch (error) {
        console.warn('Service Worker 注册失败:', error);
        // Service Worker 注册失败不应该阻止应用启动
      }
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

      // 更快地隐藏加载屏幕，提升用户体验
      setTimeout(() => {
        if (window.hideInitialLoader) {
          window.hideInitialLoader();
        }
      }, 200);

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
    const loaderText = document.getElementById('loader-text');
    if (loaderText) {
      loaderText.textContent = text;
    }
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
