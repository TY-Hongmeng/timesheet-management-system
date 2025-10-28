import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/globals.css";
import { initMobileCompatibility, checkBrowserCompatibility } from './utils/polyfills';
import { mobileOptimization } from './utils/mobileOptimization.js';
import { log } from './utils/logger';

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
    log.mobile('🌐 Starting mobile optimization systems');
    mobileOptimization.init();
    this.initializeMobileOptimizations();
  }

  private async initializeMobileOptimizations() {
    try {
      // 基本移动端优化
      log.mobile('📱 移动端优化系统启动完成');
    } catch (error) {
      log.warn('📱 移动端优化启动失败:', error);
    }
  }

  private setupNetworkMonitoring() {
    // 监听网络状态变化
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // 监听移动端连接状态变化
    window.addEventListener('mobileConnectionChange', (event: any) => {
      const { type, networkState } = event.detail;
      log.mobile(`📱 移动端连接状态变化: ${type}`, networkState);
      
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
      const response = await fetch('/manifest.json', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('网络连接检查失败:', error);
      }
      return false;
    }
  }

  private handleOnline() {
    if (import.meta.env.DEV) {
      console.log('网络连接已恢复');
    }
    this.updateLoaderText('网络连接已恢复');
    
    // 清除重试计数
    this.retryCount = 0;
    
    // 重新初始化应用
    this.initializeApp();
  }

  private handleOffline() {
    if (import.meta.env.DEV) {
      console.log('网络连接已断开');
    }
    this.updateLoaderText('网络连接已断开，正在尝试离线模式...');
  }

  private async initializeApp() {
    try {
      this.updateLoaderText('正在初始化兼容性支持...');
      
      // 检查浏览器兼容性
      const compatibility = await checkBrowserCompatibility();
      log.debug('浏览器兼容性检测完成:', compatibility);
      
      // 初始化移动端兼容性
      await initMobileCompatibility();
      
      this.updateLoaderText('正在初始化应用...');
      
      // 预加载关键资源
      await this.preloadCriticalResources();
      
      this.updateLoaderText('正在加载核心资源...');
      
      // 注册 Service Worker
      await this.registerServiceWorker();
      
      this.updateLoaderText('正在注册服务工作者...');
      
      // 启动应用
      this.updateLoaderText('正在启动应用...');
      
      await this.startApp();
      
    } catch (error) {
      console.error('应用初始化失败:', error);
      this.handleInitializationError(error);
    }
  }

  private async preloadCriticalResources() {
    try {
      // 预加载关键资源
      const criticalResources = [
        '/src/contexts/AuthContext.tsx',
        '/src/lib/supabase.ts'
      ];
      
      await Promise.all(
        criticalResources.map(resource => 
          import(resource).catch(() => {})
        )
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('预加载资源失败:', error);
      }
    }
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/timesheet-management-system/sw.js', {
          scope: '/timesheet-management-system/'
        });
        
        log.sw('Service Worker 注册成功:', registration);
        
        registration.addEventListener('updatefound', () => {
          log.sw('发现 Service Worker 更新');
        });
        
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Service Worker 注册失败:', error);
        }
      }
    }
  }

  private async startApp() {
    try {
      // 获取移动端优化状态
      log.mobile('📱 Mobile optimization status:', mobileOptimization.getStatus());
      
      // 渲染应用
      const container = document.getElementById("root");
      if (!container) {
        throw new Error('Root container not found');
      }

      const root = createRoot(container);
      
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );

      // 隐藏加载器
      this.hideLoader();
      
      if (import.meta.env.DEV) {
        console.log('应用启动成功');
      }
      
    } catch (error) {
      console.error('应用渲染失败:', error);
      this.handleInitializationError(error);
    }
  }

  private async handleInitializationError(error: any) {
    this.retryCount++;
    
    if (this.retryCount <= this.maxRetries) {
      this.updateLoaderText(`初始化失败，正在重试... (${this.retryCount}/${this.maxRetries})`);
      
      setTimeout(() => {
        this.initializeApp();
      }, this.retryDelay * this.retryCount);
    } else {
      // 尝试离线模式
      try {
        this.updateLoaderText('正在尝试离线模式...');
        await this.startOfflineMode();
      } catch (offlineError) {
        console.error('离线模式下应用启动失败:', offlineError);
        this.showErrorMessage('应用启动失败，请检查网络连接后刷新页面');
      }
    }
  }

  private async startOfflineMode() {
    // 简化的离线模式启动
    const container = document.getElementById("root");
    if (!container) {
      throw new Error('Root container not found');
    }

    const root = createRoot(container);
    
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    this.hideLoader();
  }

  private updateLoaderText(text: string) {
    const loaderText = document.querySelector('.loader-text');
    if (loaderText) {
      loaderText.textContent = text;
    }
    
    log.debug('加载状态:', text);
  }

  private hideLoader() {
    const loader = document.querySelector('.app-loader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => {
        loader.remove();
      }, 500);
    }
  }

  private showErrorMessage(message: string) {
    const loader = document.querySelector('.app-loader');
    if (loader) {
      loader.innerHTML = `
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <div class="error-message">${message}</div>
          <button onclick="window.location.reload()" class="retry-button">
            重新加载
          </button>
        </div>
      `;
    }
  }
}

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 错误:', event.reason);
});

// 启动应用
new AppInitializer();
