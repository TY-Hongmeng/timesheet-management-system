import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/globals.css";
import { initMobileCompatibility, checkBrowserCompatibility } from './utils/polyfills';
import { mobileOptimization } from './utils/mobileOptimization.js';
import { mobileStabilityEnhancer } from './utils/mobileStabilityEnhancer.js';
import { mobileResourceLoader } from './utils/mobileResourceLoader';
import mobileOptimizationManager from './utils/mobileOptimizationManager';
import mobileBrowserOptimizer from './utils/mobileBrowserOptimizer';

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
      console.log('📱 启动移动端优化管理器...');
      
      // 检测是否为移动设备
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
      
      if (isMobile) {
        // 移动端特殊优化
        this.updateLoaderText('正在优化移动端体验...');
        
        // 启用移动端资源压缩
        if (navigator.connection) {
          const connection = navigator.connection;
          if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            this.updateLoaderText('检测到慢速网络，正在压缩资源...');
            // 启用极简模式
            document.documentElement.classList.add('mobile-minimal-mode');
          }
        }
        
        // 预热移动端组件
        this.updateLoaderText('预加载移动端组件...');
        await this.preloadMobileComponents();
      }
      
      // 获取移动端优化管理器状态
      const optimizationStatus = mobileOptimizationManager.getOptimizationStatus();
      console.log('📱 优化模块状态:', optimizationStatus);
      
      // 获取浏览器信息和建议
      const browserInfo = mobileBrowserOptimizer.getBrowserInfo();
      console.log('📱 浏览器信息:', browserInfo);
      
      if (mobileBrowserOptimizer.isProblematicBrowser()) {
        console.warn('📱 检测到问题浏览器，应用特殊优化策略');
        const solutions = mobileBrowserOptimizer.getSuggestedSolutions();
        console.log('📱 建议解决方案:', solutions);
        
        // 应用问题浏览器的特殊优化
        this.applyProblematicBrowserOptimizations();
      }
      
      // 优化移动端缓存策略
      mobileResourceLoader.optimizeMobileCache();
      
      // 预加载关键资源
      await mobileResourceLoader.preloadCriticalResources();
      
      // 执行移动端诊断
      const diagnostic = await mobileOptimizationManager.triggerDiagnostic();
      console.log('📱 移动端诊断结果:', diagnostic);
      
      console.log('📱 移动端优化系统启动完成');
    } catch (error) {
      console.warn('📱 移动端优化启动失败:', error);
      // 即使优化失败，也不应该阻止应用启动
    }
  }

  private async preloadMobileComponents() {
    try {
      // 动态导入移动端关键组件
      const mobileComponents = [
        () => import('./components/MobileLoadingSpinner'),
        () => import('./components/MobileErrorPage'),
        () => import('./components/MobileDiagnostic')
      ];
      
      // 并行预加载
      await Promise.allSettled(mobileComponents.map(loader => loader()));
      console.log('📱 移动端组件预加载完成');
    } catch (error) {
      console.warn('📱 移动端组件预加载失败:', error);
    }
  }

  private applyProblematicBrowserOptimizations() {
    try {
      // 禁用一些可能导致问题的特性
      document.documentElement.classList.add('problematic-browser');
      
      // 减少动画和过渡效果
      const style = document.createElement('style');
      style.textContent = `
        .problematic-browser * {
          animation-duration: 0.01ms !important;
          animation-delay: 0.01ms !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0.01ms !important;
        }
      `;
      document.head.appendChild(style);
      
      console.log('📱 已应用问题浏览器优化策略');
    } catch (error) {
      console.warn('📱 应用问题浏览器优化失败:', error);
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
                          error.message?.includes('Failed to import') ||
                          error.message?.includes('ERR_CONNECTION_RESET');

    // 检查是否为连接重置错误
    if (error.message?.includes('ERR_CONNECTION_RESET')) {
      console.warn('📱 检测到ERR_CONNECTION_RESET错误，启动恢复策略');
      this.updateLoaderText('检测到连接重置错误，正在应用修复策略...');
      
      // 触发移动端优化管理器的恢复机制
      mobileOptimizationManager.triggerRecovery().then(() => {
        console.log('📱 恢复策略执行完成，重新初始化应用');
        setTimeout(() => {
          this.initializeApp();
        }, 2000);
      }).catch((recoveryError) => {
        console.error('📱 恢复策略执行失败:', recoveryError);
        this.continueWithStandardRetry(error);
      });
      
      return;
    }

    this.continueWithStandardRetry(error);
  }

  private continueWithStandardRetry(error: any) {
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
    
    // 检查是否为移动端且为连接重置错误
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768;
    const isConnectionResetError = error.message?.includes('ERR_CONNECTION_RESET') || 
                                  error.message?.includes('net::ERR_CONNECTION_RESET');
    
    if (isMobile && isConnectionResetError) {
      // 移动端连接重置错误，跳转到专门的错误页面
      this.redirectToMobileErrorPage(error);
      return;
    }
    
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

  private redirectToMobileErrorPage(error: any) {
    // 创建移动端错误页面的HTML
    const errorPageHTML = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>网络连接问题</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .icon {
            text-align: center;
            font-size: 48px;
            margin-bottom: 16px;
          }
          .title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 12px;
            color: #e74c3c;
          }
          .description {
            text-align: center;
            color: #666;
            margin-bottom: 24px;
          }
          .error-details {
            background: #ffeaa7;
            border: 1px solid #fdcb6e;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 24px;
            font-size: 14px;
          }
          .button {
            display: block;
            width: 100%;
            padding: 12px;
            margin-bottom: 12px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            text-align: center;
            transition: background-color 0.2s;
          }
          .button-primary {
            background-color: #3498db;
            color: white;
          }
          .button-primary:hover {
            background-color: #2980b9;
          }
          .button-secondary {
            background-color: #95a5a6;
            color: white;
          }
          .button-secondary:hover {
            background-color: #7f8c8d;
          }
          .solutions {
            background: #e8f5e8;
            border: 1px solid #27ae60;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .solutions h3 {
            margin-top: 0;
            color: #27ae60;
          }
          .solutions ul {
            margin: 0;
            padding-left: 20px;
          }
          .solutions li {
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⚠️</div>
          <h1 class="title">网络连接被重置</h1>
          <p class="description">
            检测到 ERR_CONNECTION_RESET 错误，这通常是由于网络不稳定或移动端浏览器兼容性问题导致的。
          </p>
          
          <div class="error-details">
            <strong>错误信息:</strong><br>
            ${error.message || 'ERR_CONNECTION_RESET'}
          </div>

          <div class="solutions">
            <h3>建议解决方案:</h3>
            <ul>
              <li>尝试在系统默认浏览器中打开</li>
              <li>清除浏览器缓存和Cookie</li>
              <li>切换到移动数据网络或WiFi</li>
              <li>重启设备的网络连接</li>
              <li>更新浏览器到最新版本</li>
            </ul>
          </div>

          <button class="button button-primary" onclick="window.location.reload()">
            🔄 重试连接
          </button>
          
          <a href="/mobile-diagnostic" class="button button-secondary">
            🔧 网络诊断
          </a>
          
          <button class="button button-secondary" onclick="copyErrorInfo()">
            📋 复制错误信息
          </button>
        </div>

        <script>
          function copyErrorInfo() {
            const errorInfo = \`错误类型: ERR_CONNECTION_RESET
错误信息: ${error.message || 'ERR_CONNECTION_RESET'}
浏览器: \${navigator.userAgent}
时间: \${new Date().toLocaleString()}\`;
            
            if (navigator.clipboard) {
              navigator.clipboard.writeText(errorInfo).then(() => {
                alert('错误信息已复制到剪贴板');
              });
            } else {
              // 降级方案
              const textArea = document.createElement('textarea');
              textArea.value = errorInfo;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              alert('错误信息已复制到剪贴板');
            }
          }
        </script>
      </body>
      </html>
    `;

    // 替换当前页面内容
    document.open();
    document.write(errorPageHTML);
    document.close();
  }

  // 清理资源
  public cleanup() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    // 清理移动端优化管理器
    try {
      mobileOptimizationManager.cleanup();
    } catch (error) {
      console.warn('📱 移动端优化管理器清理失败:', error);
    }
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
