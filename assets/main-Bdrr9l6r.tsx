import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/globals.css";

// 网络状态检测和应用初始化
class AppInitializer {
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 2000;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeApp();
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring() {
    // 监听网络状态变化
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // 定期检查网络连接
    this.connectionCheckInterval = setInterval(() => {
      this.checkNetworkConnection();
    }, 30000); // 每30秒检查一次
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
      // 更新加载状态
      this.updateLoaderText('正在初始化应用...');

      // 检查网络状态
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
      
      // 简化预加载逻辑，只预加载必要的资源
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = '/timesheet-management-system/favicon.svg';
      document.head.appendChild(link);
      
      // 等待一小段时间让预加载开始
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.warn('预加载资源失败:', error);
      // 预加载失败不应该阻止应用启动
    }
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

      // 隐藏加载屏幕
      setTimeout(() => {
        if (window.hideInitialLoader) {
          window.hideInitialLoader();
        }
      }, 500);

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
