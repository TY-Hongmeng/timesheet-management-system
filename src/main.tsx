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

  constructor() {
    this.initializeApp();
  }

  private async initializeApp() {
    try {
      // 检查网络状态
      if (!navigator.onLine) {
        this.handleOfflineState();
        return;
      }

      // 更新加载状态
      this.updateLoaderText('正在初始化应用...');

      // 预加载关键资源
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
    const criticalResources = [
      // 可以在这里添加需要预加载的关键资源
    ];

    try {
      await Promise.allSettled(
        criticalResources.map(url => 
          fetch(url, { 
            method: 'HEAD',
            cache: 'force-cache'
          }).catch(() => {
            // 忽略预加载失败，不影响主应用启动
            console.warn(`预加载资源失败: ${url}`);
          })
        )
      );
    } catch (error) {
      console.warn('预加载资源时出错:', error);
    }
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      try {
        const registration = await navigator.serviceWorker.register('/timesheet-management-system/sw.js');
        console.log('SW registered: ', registration);
        
        // 监听 Service Worker 更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 有新版本可用
                this.showUpdateAvailable();
              }
            });
          }
        });
      } catch (error) {
        console.log('SW registration failed: ', error);
        // Service Worker 注册失败不影响应用启动
      }
    }
  }

  private renderApp() {
    try {
      this.updateLoaderText('正在启动应用...');
      
      const root = createRoot(document.getElementById("root")!);
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );

      // 应用渲染成功后隐藏加载屏幕
      setTimeout(() => {
        if (typeof window.hideInitialLoader === 'function') {
          window.hideInitialLoader();
        }
      }, 500);

    } catch (error) {
      console.error('应用渲染失败:', error);
      this.handleRenderError(error);
    }
  }

  private handleOfflineState() {
    this.updateLoaderText('网络连接断开');
    this.showRetryButton('网络连接断开，请检查网络后重试');
    
    // 监听网络恢复
    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      this.retryCount = 0;
      this.initializeApp();
    };
    window.addEventListener('online', handleOnline);
  }

  private handleInitializationError(error: any) {
    this.retryCount++;
    
    if (this.retryCount <= this.maxRetries) {
      this.updateLoaderText(`初始化失败，正在重试... (${this.retryCount}/${this.maxRetries})`);
      setTimeout(() => {
        this.initializeApp();
      }, this.retryDelay * this.retryCount);
    } else {
      this.showRetryButton('应用初始化失败，请重试');
    }
  }

  private handleRenderError(error: any) {
    this.showRetryButton('应用启动失败，请刷新页面重试');
  }

  private updateLoaderText(text: string) {
    const loaderText = document.getElementById('loader-text');
    if (loaderText) {
      loaderText.textContent = text;
    }
  }

  private showRetryButton(message: string) {
    if (typeof window.showRetryButton === 'function') {
      window.showRetryButton(message);
    }
  }

  private showUpdateAvailable() {
    // 可以在这里显示更新提示
    console.log('应用有新版本可用');
  }

  // 公共重试方法
  public retry() {
    this.retryCount = 0;
    this.initializeApp();
  }
}

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
  
  // 如果是关键资源加载失败
  if (event.filename && (
    event.filename.includes('main') || 
    event.filename.includes('index') ||
    event.filename.includes('App')
  )) {
    if (typeof window.showRetryButton === 'function') {
      window.showRetryButton('关键资源加载失败，请重试');
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 错误:', event.reason);
  
  // 如果是网络相关错误
  if (event.reason && (
    event.reason.message?.includes('fetch') ||
    event.reason.message?.includes('network') ||
    event.reason.message?.includes('Failed to import')
  )) {
    if (typeof window.showRetryButton === 'function') {
      window.showRetryButton('网络请求失败，请检查网络连接');
    }
  }
});

// 创建应用初始化器实例
const appInitializer = new AppInitializer();

// 将重试方法暴露到全局，供 HTML 中的重试按钮调用
(window as any).retryAppInitialization = () => {
  appInitializer.retry();
};
