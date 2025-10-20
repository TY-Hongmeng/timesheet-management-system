/**
 * 移动端优化集成管理器
 * 统一协调所有移动端优化策略，专门解决ERR_CONNECTION_RESET等网络问题
 */

import mobileErrorHandler from './mobileErrorHandler';
import networkOptimizer from './networkOptimizer';
import mobileDeviceOptimizer from './mobileDeviceOptimizer';
import connectionStabilityManager from './connectionStabilityManager';

interface OptimizationStatus {
  errorHandler: boolean;
  networkOptimizer: boolean;
  deviceOptimizer: boolean;
  connectionManager: boolean;
  overallHealth: number;
}

interface MobileOptimizationConfig {
  enableErrorHandling: boolean;
  enableNetworkOptimization: boolean;
  enableDeviceOptimization: boolean;
  enableConnectionStability: boolean;
  enableAutoRecovery: boolean;
  enableDiagnostics: boolean;
  monitoringInterval: number;
}

interface DiagnosticResult {
  timestamp: number;
  deviceInfo: any;
  networkMetrics: any;
  connectionMetrics: any;
  errorLog: any[];
  recommendations: string[];
  overallScore: number;
}

class MobileOptimizationManager {
  private config: MobileOptimizationConfig;
  private status: OptimizationStatus;
  private isInitialized: boolean = false;
  private monitoringInterval: number | null = null;
  private diagnosticHistory: DiagnosticResult[] = [];

  constructor(config?: Partial<MobileOptimizationConfig>) {
    this.config = {
      enableErrorHandling: true,
      enableNetworkOptimization: true,
      enableDeviceOptimization: true,
      enableConnectionStability: true,
      enableAutoRecovery: true,
      enableDiagnostics: true,
      monitoringInterval: 60000, // 1分钟
      ...config
    };

    this.status = {
      errorHandler: false,
      networkOptimizer: false,
      deviceOptimizer: false,
      connectionManager: false,
      overallHealth: 0
    };

    this.initialize();
  }

  /**
   * 初始化移动端优化管理器
   */
  private async initialize(): Promise<void> {
    console.log('Initializing Mobile Optimization Manager...');

    try {
      // 初始化各个优化模块
      await this.initializeModules();
      
      // 设置全局错误处理
      this.setupGlobalErrorHandling();
      
      // 设置监控
      if (this.config.enableDiagnostics) {
        this.startMonitoring();
      }
      
      // 设置自动恢复
      if (this.config.enableAutoRecovery) {
        this.setupAutoRecovery();
      }

      this.isInitialized = true;
      console.log('Mobile Optimization Manager initialized successfully');
      
      // 执行初始诊断
      await this.performDiagnostic();
      
    } catch (error) {
      console.error('Failed to initialize Mobile Optimization Manager:', error);
      this.handleInitializationFailure(error as Error);
    }
  }

  /**
   * 初始化各个模块
   */
  private async initializeModules(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    // 初始化错误处理器
    if (this.config.enableErrorHandling) {
      initPromises.push(this.initializeErrorHandler());
    }

    // 初始化网络优化器
    if (this.config.enableNetworkOptimization) {
      initPromises.push(this.initializeNetworkOptimizer());
    }

    // 初始化设备优化器
    if (this.config.enableDeviceOptimization) {
      initPromises.push(this.initializeDeviceOptimizer());
    }

    // 初始化连接稳定性管理器
    if (this.config.enableConnectionStability) {
      initPromises.push(this.initializeConnectionManager());
    }

    await Promise.allSettled(initPromises);
    this.updateOverallHealth();
  }

  /**
   * 初始化错误处理器
   */
  private async initializeErrorHandler(): Promise<void> {
    try {
      // 错误处理器已经自动初始化
      this.status.errorHandler = true;
      console.log('Error handler initialized');
    } catch (error) {
      console.error('Failed to initialize error handler:', error);
      this.status.errorHandler = false;
    }
  }

  /**
   * 初始化网络优化器
   */
  private async initializeNetworkOptimizer(): Promise<void> {
    try {
      // 网络优化器已经自动初始化
      this.status.networkOptimizer = true;
      console.log('Network optimizer initialized');
    } catch (error) {
      console.error('Failed to initialize network optimizer:', error);
      this.status.networkOptimizer = false;
    }
  }

  /**
   * 初始化设备优化器
   */
  private async initializeDeviceOptimizer(): Promise<void> {
    try {
      // 设备优化器已经自动初始化
      this.status.deviceOptimizer = true;
      console.log('Device optimizer initialized');
    } catch (error) {
      console.error('Failed to initialize device optimizer:', error);
      this.status.deviceOptimizer = false;
    }
  }

  /**
   * 初始化连接管理器
   */
  private async initializeConnectionManager(): Promise<void> {
    try {
      // 连接稳定性管理器已经自动初始化
      this.status.connectionManager = true;
      console.log('Connection manager initialized');
    } catch (error) {
      console.error('Failed to initialize connection manager:', error);
      this.status.connectionManager = false;
    }
  }

  /**
   * 设置全局错误处理
   */
  private setupGlobalErrorHandling(): void {
    // 处理未捕获的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      console.warn('Unhandled promise rejection:', event.reason);
      this.handleGlobalError(event.reason);
    });

    // 处理全局错误
    window.addEventListener('error', (event) => {
      console.warn('Global error:', event.error);
      this.handleGlobalError(event.error);
    });

    // 处理资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        console.warn('Resource loading error:', event.target);
        this.handleResourceError(event.target as HTMLElement);
      }
    }, true);
  }

  /**
   * 处理全局错误
   */
  private async handleGlobalError(error: Error): Promise<void> {
    // 检查是否为连接重置错误
    if (this.isConnectionResetError(error)) {
      console.warn('ERR_CONNECTION_RESET detected, applying recovery strategies');
      await this.handleConnectionResetError(error);
    } else if (this.isNetworkError(error)) {
      console.warn('Network error detected, applying network recovery');
      await this.handleNetworkError(error);
    } else {
      console.warn('Generic error detected, applying general recovery');
      await this.handleGenericError(error);
    }
  }

  /**
   * 处理资源错误
   */
  private handleResourceError(element: HTMLElement): void {
    const tagName = element.tagName.toLowerCase();
    const src = element.getAttribute('src') || element.getAttribute('href');
    
    console.warn(`Resource error: ${tagName} - ${src}`);
    
    // 尝试重新加载资源
    this.retryResourceLoading(element);
  }

  /**
   * 重试资源加载
   */
  private retryResourceLoading(element: HTMLElement): void {
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'script') {
      this.retryScriptLoading(element as HTMLScriptElement);
    } else if (tagName === 'link') {
      this.retryStylesheetLoading(element as HTMLLinkElement);
    } else if (tagName === 'img') {
      this.retryImageLoading(element as HTMLImageElement);
    }
  }

  /**
   * 重试脚本加载
   */
  private retryScriptLoading(script: HTMLScriptElement): void {
    const newScript = document.createElement('script');
    newScript.src = script.src;
    newScript.async = script.async;
    newScript.defer = script.defer;
    
    newScript.onload = () => {
      console.log('Script reloaded successfully:', script.src);
    };
    
    newScript.onerror = () => {
      console.error('Script reload failed:', script.src);
      // 尝试从备用URL加载
      this.tryAlternativeScriptSources(newScript);
    };

    script.parentNode?.replaceChild(newScript, script);
  }

  /**
   * 重试样式表加载
   */
  private retryStylesheetLoading(link: HTMLLinkElement): void {
    const newLink = document.createElement('link');
    newLink.rel = link.rel;
    newLink.href = link.href;
    newLink.type = link.type;
    
    newLink.onload = () => {
      console.log('Stylesheet reloaded successfully:', link.href);
    };
    
    newLink.onerror = () => {
      console.error('Stylesheet reload failed:', link.href);
    };

    link.parentNode?.replaceChild(newLink, link);
  }

  /**
   * 重试图片加载
   */
  private retryImageLoading(img: HTMLImageElement): void {
    const originalSrc = img.src;
    
    // 添加时间戳避免缓存
    const separator = originalSrc.includes('?') ? '&' : '?';
    img.src = `${originalSrc}${separator}_retry=${Date.now()}`;
    
    img.onerror = () => {
      // 显示占位图
      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
    };
  }

  /**
   * 尝试备用脚本源
   */
  private tryAlternativeScriptSources(script: HTMLScriptElement): void {
    // 移除外部CDN源，只使用协议切换
    const alternativeSources = [
      script.src.replace('https://', 'http://'),
      script.src.replace('http://', 'https://')
    ];

    let currentIndex = 0;
    
    const tryNext = () => {
      if (currentIndex >= alternativeSources.length) {
        console.error('All alternative script sources failed');
        return;
      }

      const newScript = document.createElement('script');
      newScript.src = alternativeSources[currentIndex];
      newScript.async = script.async;
      newScript.defer = script.defer;
      
      newScript.onload = () => {
        console.log('Alternative script source succeeded:', newScript.src);
      };
      
      newScript.onerror = () => {
        currentIndex++;
        tryNext();
      };

      script.parentNode?.appendChild(newScript);
    };

    tryNext();
  }

  /**
   * 处理连接重置错误
   */
  private async handleConnectionResetError(error: Error): Promise<void> {
    console.log('Handling ERR_CONNECTION_RESET error');
    
    // 应用所有可用的恢复策略
    const recoveryStrategies = [
      () => this.switchProtocol(),
      () => this.retryWithDelay(),
      () => this.useAlternativeEndpoint(),
      () => this.enableOfflineMode()
    ];

    for (const strategy of recoveryStrategies) {
      try {
        const success = await strategy();
        if (success) {
          console.log('Recovery strategy succeeded');
          break;
        }
      } catch (strategyError) {
        console.warn('Recovery strategy failed:', strategyError);
      }
    }
  }

  /**
   * 处理网络错误
   */
  private async handleNetworkError(error: Error): Promise<void> {
    console.log('Handling network error');
    
    // 检查网络状态
    if (!navigator.onLine) {
      await this.enableOfflineMode();
      return;
    }

    // 尝试网络恢复策略
    await this.retryWithDelay();
  }

  /**
   * 处理通用错误
   */
  private async handleGenericError(error: Error): Promise<void> {
    console.log('Handling generic error');
    
    // 记录错误
    console.error('Generic error:', error);
    
    // 尝试页面刷新
    if (this.shouldRefreshPage(error)) {
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  }

  /**
   * 切换协议
   */
  private async switchProtocol(): Promise<boolean> {
    const currentUrl = window.location.href;
    let newUrl: string;

    if (currentUrl.startsWith('https://')) {
      newUrl = currentUrl.replace('https://', 'http://');
    } else {
      newUrl = currentUrl.replace('http://', 'https://');
    }

    try {
      const response = await fetch(newUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        window.location.href = newUrl;
        return true;
      }
    } catch (error) {
      console.warn('Protocol switch failed:', error);
    }

    return false;
  }

  /**
   * 延迟重试
   */
  private async retryWithDelay(): Promise<boolean> {
    await this.delay(2000);
    
    try {
      const response = await fetch(window.location.href, { 
        method: 'HEAD', 
        signal: AbortSignal.timeout(10000) 
      });
      
      if (response.ok) {
        window.location.reload();
        return true;
      }
    } catch (error) {
      console.warn('Retry with delay failed:', error);
    }

    return false;
  }

  /**
   * 使用备用端点
   */
  private async useAlternativeEndpoint(): Promise<boolean> {
    const alternativeUrls = [
      'http://192.168.60.26:5173/',
      'http://localhost:5173/',
      'https://ty-hongmeng.github.io/'
    ];

    for (const url of alternativeUrls) {
      try {
        const response = await fetch(url, { 
          method: 'HEAD', 
          signal: AbortSignal.timeout(5000) 
        });
        
        if (response.ok) {
          window.location.href = url;
          return true;
        }
      } catch (error) {
        console.warn(`Alternative endpoint ${url} failed:`, error);
      }
    }

    return false;
  }

  /**
   * 启用离线模式
   */
  private async enableOfflineMode(): Promise<boolean> {
    console.log('Enabling offline mode');
    
    // 显示离线通知
    this.showOfflineNotification();
    
    // 尝试加载缓存内容
    return await this.loadCachedContent();
  }

  /**
   * 显示离线通知
   */
  private showOfflineNotification(): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #fed7d7;
      color: #c53030;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    notification.innerHTML = `
      ⚠️ 网络连接问题，正在尝试恢复...
      <button onclick="window.location.reload()" style="margin-left: 10px; padding: 4px 8px; background: white; color: #c53030; border: none; border-radius: 4px; cursor: pointer;">重试</button>
    `;
    
    document.body.appendChild(notification);
    
    // 10秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  }

  /**
   * 加载缓存内容
   */
  private async loadCachedContent(): Promise<boolean> {
    try {
      if ('caches' in window) {
        const cache = await caches.open('app-cache-v1');
        const cachedResponse = await cache.match(window.location.href);
        
        if (cachedResponse) {
          const content = await cachedResponse.text();
          document.documentElement.innerHTML = content;
          return true;
        }
      }
    } catch (error) {
      console.warn('Failed to load cached content:', error);
    }
    
    return false;
  }

  /**
   * 设置自动恢复
   */
  private setupAutoRecovery(): void {
    // 监听网络状态变化
    window.addEventListener('online', () => {
      console.log('Network back online, attempting recovery');
      this.performAutoRecovery();
    });

    // 定期健康检查
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // 每30秒检查一次
  }

  /**
   * 执行自动恢复
   */
  private async performAutoRecovery(): Promise<void> {
    try {
      // 重新初始化失败的模块
      await this.reinitializeFailedModules();
      
      // 清理错误状态
      this.clearErrorStates();
      
      // 重新加载页面（如果需要）
      if (this.shouldReloadAfterRecovery()) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Auto recovery failed:', error);
    }
  }

  /**
   * 重新初始化失败的模块
   */
  private async reinitializeFailedModules(): Promise<void> {
    if (!this.status.errorHandler && this.config.enableErrorHandling) {
      await this.initializeErrorHandler();
    }
    
    if (!this.status.networkOptimizer && this.config.enableNetworkOptimization) {
      await this.initializeNetworkOptimizer();
    }
    
    if (!this.status.deviceOptimizer && this.config.enableDeviceOptimization) {
      await this.initializeDeviceOptimizer();
    }
    
    if (!this.status.connectionManager && this.config.enableConnectionStability) {
      await this.initializeConnectionManager();
    }

    this.updateOverallHealth();
  }

  /**
   * 清理错误状态
   */
  private clearErrorStates(): void {
    // 清理错误日志
    if (this.status.errorHandler) {
      mobileErrorHandler.clearErrorLog();
    }
    
    // 移除错误通知
    const errorNotifications = document.querySelectorAll('[id*="error"], [id*="offline"]');
    errorNotifications.forEach(notification => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }

  /**
   * 开始监控
   */
  private startMonitoring(): void {
    this.monitoringInterval = window.setInterval(() => {
      this.performDiagnostic();
    }, this.config.monitoringInterval);
  }

  /**
   * 执行诊断
   */
  private async performDiagnostic(): Promise<DiagnosticResult> {
    const diagnostic: DiagnosticResult = {
      timestamp: Date.now(),
      deviceInfo: this.status.deviceOptimizer ? mobileDeviceOptimizer.getDeviceInfo() : null,
      networkMetrics: this.status.networkOptimizer ? networkOptimizer.getNetworkMetrics() : null,
      connectionMetrics: this.status.connectionManager ? connectionStabilityManager.getConnectionMetrics() : null,
      errorLog: this.status.errorHandler ? mobileErrorHandler.getErrorLog() : [],
      recommendations: [],
      overallScore: 0
    };

    // 生成建议
    diagnostic.recommendations = this.generateRecommendations(diagnostic);
    
    // 计算总体评分
    diagnostic.overallScore = this.calculateOverallScore(diagnostic);

    // 保存诊断结果
    this.diagnosticHistory.push(diagnostic);
    
    // 保持历史记录在合理范围内
    if (this.diagnosticHistory.length > 50) {
      this.diagnosticHistory = this.diagnosticHistory.slice(-25);
    }

    console.log('Diagnostic completed:', diagnostic);
    return diagnostic;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(diagnostic: DiagnosticResult): string[] {
    const recommendations: string[] = [];

    // 检查错误率
    if (diagnostic.errorLog.length > 5) {
      recommendations.push('检测到较多错误，建议检查网络连接');
    }

    // 检查网络延迟
    if (diagnostic.networkMetrics && diagnostic.networkMetrics.latency > 1000) {
      recommendations.push('网络延迟较高，建议切换到更稳定的网络');
    }

    // 检查连接稳定性
    if (diagnostic.connectionMetrics && diagnostic.connectionMetrics.stability < 0.5) {
      recommendations.push('连接不稳定，建议启用离线模式');
    }

    // 检查设备性能
    if (diagnostic.deviceInfo && diagnostic.deviceInfo.isLowEnd) {
      recommendations.push('检测到低端设备，已启用性能优化模式');
    }

    return recommendations;
  }

  /**
   * 计算总体评分
   */
  private calculateOverallScore(diagnostic: DiagnosticResult): number {
    let score = 100;

    // 错误扣分
    score -= diagnostic.errorLog.length * 2;

    // 网络延迟扣分
    if (diagnostic.networkMetrics) {
      score -= Math.min(diagnostic.networkMetrics.latency / 10, 30);
    }

    // 连接稳定性加分
    if (diagnostic.connectionMetrics) {
      score = score * diagnostic.connectionMetrics.stability;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    this.updateOverallHealth();
    
    if (this.status.overallHealth < 0.5) {
      console.warn('System health is low, attempting recovery');
      await this.performAutoRecovery();
    }
  }

  /**
   * 更新总体健康状态
   */
  private updateOverallHealth(): void {
    const modules = [
      this.status.errorHandler,
      this.status.networkOptimizer,
      this.status.deviceOptimizer,
      this.status.connectionManager
    ];

    const healthyModules = modules.filter(Boolean).length;
    this.status.overallHealth = healthyModules / modules.length;
  }

  /**
   * 处理初始化失败
   */
  private handleInitializationFailure(error: Error): void {
    console.error('Initialization failed, entering safe mode');
    
    // 显示初始化失败通知
    this.showInitializationFailureNotification();
    
    // 尝试基本的错误恢复
    setTimeout(() => {
      this.initialize();
    }, 5000);
  }

  /**
   * 显示初始化失败通知
   */
  private showInitializationFailureNotification(): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #f56565;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    notification.textContent = '⚠️ 移动端优化初始化失败，正在重试...';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * 检查是否为连接重置错误
   */
  private isConnectionResetError(error: Error): boolean {
    return error.message.includes('ERR_CONNECTION_RESET') ||
           error.message.includes('ECONNRESET') ||
           error.message.includes('Connection reset');
  }

  /**
   * 检查是否为网络错误
   */
  private isNetworkError(error: Error): boolean {
    return error.message.includes('NetworkError') ||
           error.message.includes('Failed to fetch') ||
           error.message.includes('ERR_NETWORK');
  }

  /**
   * 检查是否应该刷新页面
   */
  private shouldRefreshPage(error: Error): boolean {
    return error.message.includes('ChunkLoadError') ||
           error.message.includes('Loading chunk') ||
           error.message.includes('Loading CSS chunk');
  }

  /**
   * 检查是否应该在恢复后重新加载
   */
  private shouldReloadAfterRecovery(): boolean {
    return this.status.overallHealth < 0.7;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取优化状态
   */
  public getOptimizationStatus(): OptimizationStatus {
    return { ...this.status };
  }

  /**
   * 获取配置
   */
  public getConfig(): MobileOptimizationConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<MobileOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取诊断历史
   */
  public getDiagnosticHistory(): DiagnosticResult[] {
    return [...this.diagnosticHistory];
  }

  /**
   * 获取最新诊断结果
   */
  public getLatestDiagnostic(): DiagnosticResult | null {
    return this.diagnosticHistory.length > 0 ? this.diagnosticHistory[this.diagnosticHistory.length - 1] : null;
  }

  /**
   * 手动触发诊断
   */
  public async triggerDiagnostic(): Promise<DiagnosticResult> {
    return await this.performDiagnostic();
  }

  /**
   * 手动触发恢复
   */
  public async triggerRecovery(): Promise<void> {
    await this.performAutoRecovery();
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // 清理各个模块
    if (this.status.errorHandler) {
      // mobileErrorHandler 没有 cleanup 方法，但可以清理错误日志
      mobileErrorHandler.clearErrorLog();
    }

    if (this.status.networkOptimizer) {
      networkOptimizer.cleanup();
    }

    if (this.status.deviceOptimizer) {
      mobileDeviceOptimizer.cleanup();
    }

    if (this.status.connectionManager) {
      connectionStabilityManager.cleanup();
    }
  }
}

// 创建全局实例
const mobileOptimizationManager = new MobileOptimizationManager();

// 导出实例和类型
export default mobileOptimizationManager;
export type { OptimizationStatus, MobileOptimizationConfig, DiagnosticResult };