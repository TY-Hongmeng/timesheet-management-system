/**
 * 移动端浏览器兼容性优化器
 * 专门解决不同移动浏览器的兼容性问题和ERR_CONNECTION_RESET错误
 */

interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  isWeChat: boolean;
  isQQ: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
}

interface NetworkConfig {
  timeout: number;
  retryCount: number;
  retryDelay: number;
  useKeepAlive: boolean;
  preferHTTP2: boolean;
  enableCompression: boolean;
}

class MobileBrowserOptimizer {
  private browserInfo: BrowserInfo;
  private networkConfig: NetworkConfig;
  private connectionPool: Map<string, AbortController> = new Map();
  private retryAttempts: Map<string, number> = new Map();

  constructor() {
    this.browserInfo = this.detectBrowser();
    this.networkConfig = this.getOptimalNetworkConfig();
    this.initializeOptimizations();
  }

  /**
   * 检测浏览器信息
   */
  private detectBrowser(): BrowserInfo {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    // 检测浏览器类型
    const isWeChat = /MicroMessenger/i.test(userAgent);
    const isQQ = /QQ/i.test(userAgent) && !/MicroMessenger/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent) && !/CriOS/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent) && !/Edg/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);
    const isEdge = /Edg/i.test(userAgent);

    // 提取版本号
    let version = 'unknown';
    let engine = 'unknown';
    let name = 'unknown';

    if (isWeChat) {
      name = 'WeChat';
      const match = userAgent.match(/MicroMessenger\/([0-9.]+)/);
      version = match ? match[1] : 'unknown';
      engine = 'WebKit';
    } else if (isQQ) {
      name = 'QQ Browser';
      const match = userAgent.match(/QQ\/([0-9.]+)/);
      version = match ? match[1] : 'unknown';
      engine = 'WebKit';
    } else if (isSafari) {
      name = 'Safari';
      const match = userAgent.match(/Version\/([0-9.]+)/);
      version = match ? match[1] : 'unknown';
      engine = 'WebKit';
    } else if (isChrome) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/([0-9.]+)/);
      version = match ? match[1] : 'unknown';
      engine = 'Blink';
    } else if (isFirefox) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/([0-9.]+)/);
      version = match ? match[1] : 'unknown';
      engine = 'Gecko';
    } else if (isEdge) {
      name = 'Edge';
      const match = userAgent.match(/Edg\/([0-9.]+)/);
      version = match ? match[1] : 'unknown';
      engine = 'Blink';
    }

    return {
      name,
      version,
      engine,
      platform,
      isWeChat,
      isQQ,
      isSafari,
      isChrome,
      isFirefox,
      isEdge
    };
  }

  /**
   * 获取最优网络配置
   */
  private getOptimalNetworkConfig(): NetworkConfig {
    const baseConfig: NetworkConfig = {
      timeout: 10000,
      retryCount: 3,
      retryDelay: 1000,
      useKeepAlive: true,
      preferHTTP2: true,
      enableCompression: true
    };

    // 根据浏览器类型调整配置
    if (this.browserInfo.isWeChat) {
      // 微信浏览器特殊优化
      return {
        ...baseConfig,
        timeout: 15000, // 微信浏览器网络较慢
        retryCount: 5,
        retryDelay: 2000,
        useKeepAlive: false, // 微信浏览器Keep-Alive支持不稳定
        preferHTTP2: false // 微信浏览器HTTP/2支持有问题
      };
    } else if (this.browserInfo.isQQ) {
      // QQ浏览器优化
      return {
        ...baseConfig,
        timeout: 12000,
        retryCount: 4,
        retryDelay: 1500,
        preferHTTP2: false
      };
    } else if (this.browserInfo.isSafari) {
      // Safari优化
      return {
        ...baseConfig,
        timeout: 8000,
        retryCount: 3,
        retryDelay: 800,
        useKeepAlive: true,
        preferHTTP2: true
      };
    } else if (this.browserInfo.isChrome) {
      // Chrome优化
      return {
        ...baseConfig,
        timeout: 6000,
        retryCount: 2,
        retryDelay: 500,
        useKeepAlive: true,
        preferHTTP2: true
      };
    }

    return baseConfig;
  }

  /**
   * 初始化优化设置
   */
  private initializeOptimizations(): void {
    // 设置全局错误处理
    this.setupGlobalErrorHandling();
    
    // 优化网络连接
    this.optimizeNetworkConnections();
    
    // 设置浏览器特定优化
    this.applyBrowserSpecificOptimizations();
    
    // 监听网络状态变化
    this.setupNetworkMonitoring();
  }

  /**
   * 设置全局错误处理
   */
  private setupGlobalErrorHandling(): void {
    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      console.warn('Unhandled promise rejection:', event.reason);
      
      if (event.reason?.message?.includes('ERR_CONNECTION_RESET')) {
        this.handleConnectionReset(event.reason);
        event.preventDefault();
      }
    });

    // 捕获全局错误
    window.addEventListener('error', (event) => {
      if (event.error?.message?.includes('ERR_CONNECTION_RESET')) {
        this.handleConnectionReset(event.error);
      }
    });
  }

  /**
   * 处理连接重置错误
   */
  private handleConnectionReset(error: Error): void {
    console.warn('Connection reset detected:', error);
    
    // 清理现有连接
    this.connectionPool.forEach((controller) => {
      controller.abort();
    });
    this.connectionPool.clear();
    
    // 延迟重试
    setTimeout(() => {
      this.retryFailedConnections();
    }, this.networkConfig.retryDelay);
  }

  /**
   * 重试失败的连接
   */
  private retryFailedConnections(): void {
    // 这里可以实现重试逻辑
    console.log('Retrying failed connections...');
  }

  /**
   * 优化网络连接
   */
  private optimizeNetworkConnections(): void {
    // 预连接到重要域名
    this.preconnectToDomains([
      'ty-hongmeng.github.io',
      '192.168.60.26:5173'
    ]);

    // 设置DNS预解析
    this.setupDNSPrefetch([
      'ty-hongmeng.github.io',
      'fonts.googleapis.com',
      'cdnjs.cloudflare.com'
    ]);
  }

  /**
   * 预连接到域名
   */
  private preconnectToDomains(domains: string[]): void {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain.startsWith('http') ? domain : `https://${domain}`;
      document.head.appendChild(link);
    });
  }

  /**
   * 设置DNS预解析
   */
  private setupDNSPrefetch(domains: string[]): void {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain.startsWith('http') ? domain : `https://${domain}`;
      document.head.appendChild(link);
    });
  }

  /**
   * 应用浏览器特定优化
   */
  private applyBrowserSpecificOptimizations(): void {
    if (this.browserInfo.isWeChat) {
      this.applyWeChatOptimizations();
    } else if (this.browserInfo.isQQ) {
      this.applyQQBrowserOptimizations();
    } else if (this.browserInfo.isSafari) {
      this.applySafariOptimizations();
    } else if (this.browserInfo.isChrome) {
      this.applyChromeOptimizations();
    }
  }

  /**
   * 微信浏览器优化
   */
  private applyWeChatOptimizations(): void {
    // 禁用某些可能导致问题的功能
    if ('serviceWorker' in navigator) {
      // 微信浏览器Service Worker支持不稳定
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }

    // 设置微信特定的网络配置
    this.setupWeChatNetworkConfig();
  }

  /**
   * 设置微信网络配置
   */
  private setupWeChatNetworkConfig(): void {
    // 微信浏览器特殊处理
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // 为微信浏览器添加特殊头部
      const headers = new Headers(init?.headers);
      headers.set('Cache-Control', 'no-cache');
      headers.set('Pragma', 'no-cache');
      
      const modifiedInit: RequestInit = {
        ...init,
        headers,
        cache: 'no-cache',
        mode: 'cors',
        credentials: 'omit'
      };

      return this.retryFetch(url, modifiedInit, originalFetch);
    };
  }

  /**
   * QQ浏览器优化
   */
  private applyQQBrowserOptimizations(): void {
    // QQ浏览器特定优化
    document.documentElement.style.setProperty('-webkit-tap-highlight-color', 'transparent');
    document.documentElement.style.setProperty('-webkit-touch-callout', 'none');
  }

  /**
   * Safari优化
   */
  private applySafariOptimizations(): void {
    // Safari特定优化
    document.documentElement.style.setProperty('-webkit-overflow-scrolling', 'touch');
    
    // 修复Safari的fetch问题
    this.setupSafariFetchFix();
  }

  /**
   * 设置Safari fetch修复
   */
  private setupSafariFetchFix(): void {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Safari特殊处理
      const modifiedInit: RequestInit = {
        ...init,
        credentials: 'same-origin',
        mode: 'cors'
      };

      return this.retryFetch(url, modifiedInit, originalFetch);
    };
  }

  /**
   * Chrome优化
   */
  private applyChromeOptimizations(): void {
    // Chrome特定优化
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.effectiveType) {
        // 根据网络类型调整配置
        this.adjustConfigForNetworkType(connection.effectiveType);
      }
    }
  }

  /**
   * 根据网络类型调整配置
   */
  private adjustConfigForNetworkType(effectiveType: string): void {
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        this.networkConfig.timeout = 30000;
        this.networkConfig.retryCount = 5;
        this.networkConfig.retryDelay = 3000;
        break;
      case '3g':
        this.networkConfig.timeout = 20000;
        this.networkConfig.retryCount = 4;
        this.networkConfig.retryDelay = 2000;
        break;
      case '4g':
      default:
        // 使用默认配置
        break;
    }
  }

  /**
   * 设置网络监听
   */
  private setupNetworkMonitoring(): void {
    // 监听在线/离线状态
    window.addEventListener('online', () => {
      console.log('Network back online');
      this.handleNetworkReconnect();
    });

    window.addEventListener('offline', () => {
      console.log('Network went offline');
      this.handleNetworkDisconnect();
    });

    // 监听网络变化（如果支持）
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', () => {
          this.handleNetworkChange(connection);
        });
      }
    }
  }

  /**
   * 处理网络重连
   */
  private handleNetworkReconnect(): void {
    // 清理重试计数
    this.retryAttempts.clear();
    
    // 重新初始化连接
    this.optimizeNetworkConnections();
  }

  /**
   * 处理网络断开
   */
  private handleNetworkDisconnect(): void {
    // 取消所有进行中的请求
    this.connectionPool.forEach((controller) => {
      controller.abort();
    });
    this.connectionPool.clear();
  }

  /**
   * 处理网络变化
   */
  private handleNetworkChange(connection: any): void {
    console.log('Network changed:', connection.effectiveType);
    this.adjustConfigForNetworkType(connection.effectiveType);
  }

  /**
   * 带重试的fetch
   */
  private async retryFetch(
    url: string, 
    init: RequestInit, 
    originalFetch: typeof fetch
  ): Promise<Response> {
    const requestId = `${url}_${Date.now()}`;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.networkConfig.retryCount; attempt++) {
      try {
        // 创建AbortController
        const controller = new AbortController();
        this.connectionPool.set(requestId, controller);
        
        // 设置超时
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, this.networkConfig.timeout);
        
        const response = await originalFetch(url, {
          ...init,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        this.connectionPool.delete(requestId);
        
        if (response.ok) {
          // 重置重试计数
          this.retryAttempts.delete(url);
          return response;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (error) {
        lastError = error as Error;
        this.connectionPool.delete(requestId);
        
        console.warn(`Fetch attempt ${attempt + 1} failed for ${url}:`, error);
        
        // 如果是连接重置错误，特殊处理
        if (error instanceof Error && error.message.includes('ERR_CONNECTION_RESET')) {
          this.handleConnectionReset(error);
        }
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.networkConfig.retryCount - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, this.networkConfig.retryDelay * (attempt + 1))
          );
        }
      }
    }
    
    // 记录重试次数
    const currentAttempts = this.retryAttempts.get(url) || 0;
    this.retryAttempts.set(url, currentAttempts + 1);
    
    throw lastError || new Error(`Failed to fetch ${url} after ${this.networkConfig.retryCount} attempts`);
  }

  /**
   * 创建优化的fetch函数
   */
  public createOptimizedFetch(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // 应用浏览器特定的配置
      const optimizedInit: RequestInit = {
        ...init,
        cache: 'no-cache',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          ...init?.headers,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      };
      
      return this.retryFetch(url, optimizedInit, fetch);
    };
  }

  /**
   * 获取浏览器信息
   */
  public getBrowserInfo(): BrowserInfo {
    return this.browserInfo;
  }

  /**
   * 获取网络配置
   */
  public getNetworkConfig(): NetworkConfig {
    return this.networkConfig;
  }

  /**
   * 检查是否为问题浏览器
   */
  public isProblematicBrowser(): boolean {
    return this.browserInfo.isWeChat || this.browserInfo.isQQ;
  }

  /**
   * 获取建议的解决方案
   */
  public getSuggestedSolutions(): string[] {
    const solutions: string[] = [];
    
    if (this.browserInfo.isWeChat) {
      solutions.push('尝试在系统默认浏览器中打开');
      solutions.push('清除微信浏览器缓存');
      solutions.push('更新微信到最新版本');
    } else if (this.browserInfo.isQQ) {
      solutions.push('尝试在Chrome或Safari中打开');
      solutions.push('清除QQ浏览器缓存');
      solutions.push('检查QQ浏览器的网络设置');
    } else if (this.browserInfo.isSafari) {
      solutions.push('检查Safari的隐私设置');
      solutions.push('清除Safari缓存和Cookie');
      solutions.push('更新iOS到最新版本');
    }
    
    solutions.push('尝试切换到移动数据网络');
    solutions.push('重启设备的网络连接');
    solutions.push('联系技术支持获取帮助');
    
    return solutions;
  }
}

// 创建全局实例
const mobileBrowserOptimizer = new MobileBrowserOptimizer();

// 导出优化的fetch函数
export const optimizedFetch = mobileBrowserOptimizer.createOptimizedFetch();

// 导出优化器实例
export default mobileBrowserOptimizer;

// 导出类型
export type { BrowserInfo, NetworkConfig };