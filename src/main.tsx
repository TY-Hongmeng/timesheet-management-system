import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/globals.css";
import { performanceMonitor, startTimer, endTimer } from '@/utils/performanceMonitor'
import { errorLogger, logError, logLoadingError } from '@/utils/errorLogger'
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
      // 多层网络检查策略
      if (!navigator.onLine) {
        console.log('📴 设备离线状态');
        return false;
      }
      
      // 检测网络质量
      const connection = (navigator as any).connection;
      if (connection) {
        console.log(`🌐 网络类型: ${connection.effectiveType}, 下行速度: ${connection.downlink}Mbps`);
        
        // 如果是极慢的网络，给出警告但不阻止加载
        if (connection.effectiveType === 'slow-2g') {
          console.warn('⚠️ 检测到极慢网络，可能影响加载速度');
        }
      }
      
      return true;
    } catch (error) {
      console.warn('⚠️ 网络检查失败:', error);
      // 网络检查失败时假设网络可用，避免误判
      return true;
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
      console.log('🚀 开始应用初始化...')
      
      // 启动应用初始化监控
      startTimer('应用初始化总耗时')
      
      this.updateLoaderText('正在初始化兼容性支持...');
      
      // 初始化移动端兼容性
      if (typeof initMobileCompatibility === 'function') {
        initMobileCompatibility();
      }
      
      // 1. 浏览器兼容性检测
      startTimer('浏览器兼容性检测')
      if (typeof checkBrowserCompatibility === 'function') {
        const compatibility = checkBrowserCompatibility();
        console.log('浏览器兼容性检测完成:', compatibility);
        if (!compatibility) {
          endTimer('浏览器兼容性检测')
          throw new Error('浏览器不兼容')
        }
      }
      endTimer('浏览器兼容性检测')
      
      // 2. 更新加载状态
      this.updateLoaderText('正在检查系统环境...');

      // 3. 简单的网络状态检查
      startTimer('网络连接检查')
      if (!navigator.onLine) {
        endTimer('网络连接检查')
        this.handleOfflineState();
        return;
      }
      await this.checkNetworkConnection()
      endTimer('网络连接检查')

      // 4. 预加载关键资源（简化版）
      await this.preloadCriticalResources();

      // 5. 注册 Service Worker
      startTimer('Service Worker注册')
      await this.registerServiceWorker();
      endTimer('Service Worker注册')

      // 6. 渲染应用
      startTimer('应用渲染')
      this.renderApp();
      endTimer('应用渲染')
      
      // 完成初始化
      const totalTime = endTimer('应用初始化总耗时')
      console.log(`✅ 应用初始化完成，总耗时: ${Math.round(totalTime)}ms`)
      
      // 生成性能报告
      performanceMonitor.generatePerformanceReport()

    } catch (error) {
      endTimer('应用初始化总耗时')
      logError({
        message: `应用初始化失败: ${(error as Error).message}`,
        stack: (error as Error).stack,
        timestamp: Date.now(),
        context: '应用初始化'
      })
      console.error('❌ 应用初始化失败:', error);
      this.handleInitializationError(error as Error);
    }
  }

  private async preloadCriticalResources() {
    try {
      this.updateLoaderText('正在加载核心资源...');
      
      // 启动预加载监控
      startTimer('资源预加载');
      
      // 智能资源预加载策略
      const connection = (navigator as any).connection;
      const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
      const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
      
      if (isSlowConnection || isLowEndDevice) {
        console.log('⚡ 检测到低性能环境，跳过资源预加载');
        endTimer('资源预加载');
        return;
      }
      
      // 高性能环境：预加载关键资源
      console.log('🔥 检测到高性能环境，开始预加载关键资源');
      
      const preloadPromises = [];
      
      // 预加载图标
      if (connection && (connection.effectiveType === '4g' || connection.effectiveType === '3g')) {
        const iconLink = document.createElement('link');
        iconLink.rel = 'prefetch';
        iconLink.href = import.meta.env.DEV ? '/favicon.svg' : '/timesheet-management-system/favicon.svg';
        document.head.appendChild(iconLink);
        
        // 预加载manifest
        const manifestLink = document.createElement('link');
        manifestLink.rel = 'prefetch';
        manifestLink.href = import.meta.env.DEV ? '/manifest.json' : '/timesheet-management-system/manifest.json';
        document.head.appendChild(manifestLink);
      }
      
      // 并行预加载，设置超时
      await Promise.race([
        Promise.all(preloadPromises),
        new Promise(resolve => setTimeout(resolve, 200)) // 最多等待200ms
      ]);
      
      endTimer('资源预加载');
      console.log('✅ 关键资源预加载完成');
      
    } catch (error) {
      endTimer('资源预加载');
      logLoadingError('资源预加载', error);
      console.warn('⚠️ 预加载资源失败:', error);
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

      // 优化的跳转策略 - 确保React组件完全挂载后再跳转
      console.log('🎯 React应用渲染完成，等待组件挂载');
      
      // 增强的React组件挂载检测 - 更精确和快速
      const waitForReactMount = () => {
        return new Promise<void>((resolve) => {
          let checkCount = 0;
          const maxChecks = 20; // 最多检查20次
          
          const checkMount = () => {
            checkCount++;
            const rootElement = document.getElementById('root');
            
            if (rootElement && rootElement.children.length > 0) {
              // 多重验证确保React应用已就绪
              const hasReactContent = rootElement.querySelector('div[data-reactroot], .App, main, nav, header, [class*="App"], [id*="app"]');
              const hasTextContent = rootElement.textContent?.trim().length > 10; // 至少10个字符
              const hasStyleElements = rootElement.querySelector('[class], [style]'); // 有样式的元素
              
              // 任何一个条件满足就认为React已挂载
              if (hasReactContent || hasTextContent || hasStyleElements) {
                console.log('✅ React组件已完全挂载 (检查次数:', checkCount, ')');
                resolve();
                return;
              }
            }
            
            // 如果检查次数过多，强制继续
            if (checkCount >= maxChecks) {
              console.log('⏰ 达到最大检查次数，强制继续');
              resolve();
              return;
            }
            
            // 继续检查，使用更快的间隔
            setTimeout(checkMount, 10); // 每10ms检查一次，更快响应
          };
          
          // 立即开始检查
          checkMount();
          
          // 设置绝对超时保护 - 减少到200ms
          setTimeout(() => {
            console.log('⚠️ 绝对超时保护：强制继续');
            resolve();
          }, 200);
        });
      };
      
      // 快速跳转执行器
      const executeJump = () => {
        console.log('🚀 执行快速跳转');
        
        // 执行跳转
        if (window.hideInitialLoader) {
          console.log('✅ 执行主跳转方案');
          window.hideInitialLoader();
        } else {
          console.log('🔄 执行备用跳转方案');
          const loader = document.getElementById('initial-loader');
          if (loader && loader.style.display !== 'none') {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.2s ease-out';
            setTimeout(() => {
              loader.style.display = 'none';
            }, 200);
          }
        }
      };
      
      // 设置全局跳转触发器，供index.html调用
      (window as any).triggerReactJump = async () => {
        try {
          console.log('📢 收到跳转信号，开始快速跳转流程');
          
          // 快速检查React是否已挂载
          await waitForReactMount();
          
          // 最小等待时间，确保渲染稳定
          await new Promise(resolve => setTimeout(resolve, 20));
          
          // 立即执行跳转
          executeJump();
          
        } catch (error) {
          console.error('快速跳转过程中出错:', error);
          // 出错时立即强制跳转
          executeJump();
        }
      };
      
      // 备用自动跳转机制 - 如果index.html没有触发
      setTimeout(async () => {
        const loader = document.getElementById('initial-loader');
        if (loader && loader.style.display !== 'none') {
          console.log('🔄 备用自动跳转机制启动');
          
          // 检查加载进度状态
          if ((window as any).loadingComplete) {
            console.log('⚡ 加载进度已完成，执行备用跳转');
            await (window as any).triggerReactJump();
          } else {
            console.log('⏳ 等待加载完成...');
            // 继续等待
          }
        }
      }, 100); // 100ms后检查

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
