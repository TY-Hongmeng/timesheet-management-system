// 错误日志优化工具 - 用于收集和分析加载错误
export interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: number;
  url?: string;
  userAgent?: string;
  networkInfo?: any;
  performanceInfo?: any;
  retryCount?: number;
  context?: string;
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private errors: ErrorInfo[] = [];
  private maxErrors: number = 50; // 最多保存50个错误
  private isEnabled: boolean = true;

  private constructor() {
    this.initializeErrorHandling();
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private initializeErrorHandling() {
    // 全局错误处理
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError({
          message: event.message,
          stack: event.error?.stack,
          timestamp: Date.now(),
          url: event.filename,
          context: '全局错误'
        });
      });

      // Promise 拒绝处理
      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          message: `未处理的Promise拒绝: ${event.reason}`,
          stack: event.reason?.stack,
          timestamp: Date.now(),
          context: 'Promise拒绝'
        });
      });

      // 资源加载错误
      window.addEventListener('error', (event) => {
        if (event.target !== window) {
          this.logError({
            message: `资源加载失败: ${(event.target as any)?.src || (event.target as any)?.href}`,
            timestamp: Date.now(),
            context: '资源加载'
          });
        }
      }, true);
    }
  }

  // 记录错误
  public logError(error: Partial<ErrorInfo>): void {
    if (!this.isEnabled) return;

    const errorInfo: ErrorInfo = {
      message: error.message || '未知错误',
      stack: error.stack,
      timestamp: error.timestamp || Date.now(),
      url: error.url || window.location.href,
      userAgent: navigator.userAgent,
      networkInfo: this.getNetworkInfo(),
      performanceInfo: this.getPerformanceInfo(),
      retryCount: error.retryCount || 0,
      context: error.context || '未知'
    };

    this.errors.push(errorInfo);

    // 保持错误数量在限制内
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // 输出错误信息
    this.outputError(errorInfo);

    // 检查是否需要特殊处理
    this.analyzeError(errorInfo);
  }

  // 输出错误信息
  private outputError(error: ErrorInfo): void {
    console.group(`🚨 错误日志 [${error.context}]`);
    console.error(`消息: ${error.message}`);
    console.log(`时间: ${new Date(error.timestamp).toLocaleString()}`);
    console.log(`URL: ${error.url}`);
    
    if (error.stack) {
      console.log(`堆栈: ${error.stack}`);
    }
    
    if (error.retryCount && error.retryCount > 0) {
      console.log(`重试次数: ${error.retryCount}`);
    }

    if (error.networkInfo) {
      console.log('网络信息:', error.networkInfo);
    }

    if (error.performanceInfo) {
      console.log('性能信息:', error.performanceInfo);
    }

    console.groupEnd();
  }

  // 分析错误
  private analyzeError(error: ErrorInfo): void {
    // 网络相关错误
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout')) {
      console.warn('🌐 检测到网络相关错误，建议检查网络连接');
    }

    // 模块加载错误
    if (error.message.includes('import') || error.message.includes('module') || error.message.includes('chunk')) {
      console.warn('📦 检测到模块加载错误，建议检查代码分割配置');
    }

    // 资源加载错误
    if (error.context === '资源加载') {
      console.warn('🖼️ 检测到资源加载错误，建议检查资源路径和CDN配置');
    }

    // 高频错误检测
    const recentErrors = this.errors.filter(e => 
      Date.now() - e.timestamp < 60000 && // 最近1分钟
      e.message === error.message
    );

    if (recentErrors.length >= 3) {
      console.error('⚠️ 检测到高频错误，可能存在系统性问题');
    }
  }

  // 获取网络信息
  private getNetworkInfo(): any {
    const connection = (navigator as any).connection;
    if (!connection) return null;

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
      online: navigator.onLine
    };
  }

  // 获取性能信息
  private getPerformanceInfo(): any {
    if (!('performance' in window)) return null;

    const memory = (performance as any).memory;
    return {
      memory: memory ? {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      timing: performance.now()
    };
  }

  // 记录加载错误
  public logLoadingError(context: string, error: any, retryCount: number = 0): void {
    this.logError({
      message: error.message || error.toString(),
      stack: error.stack,
      timestamp: Date.now(),
      context: `加载错误-${context}`,
      retryCount
    });
  }

  // 记录网络错误
  public logNetworkError(url: string, error: any, retryCount: number = 0): void {
    this.logError({
      message: `网络请求失败: ${error.message || error.toString()}`,
      stack: error.stack,
      timestamp: Date.now(),
      url,
      context: '网络错误',
      retryCount
    });
  }

  // 记录模块加载错误
  public logModuleError(moduleName: string, error: any, retryCount: number = 0): void {
    this.logError({
      message: `模块加载失败: ${moduleName} - ${error.message || error.toString()}`,
      stack: error.stack,
      timestamp: Date.now(),
      context: '模块加载错误',
      retryCount
    });
  }

  // 获取错误统计
  public getErrorStats(): any {
    const now = Date.now();
    const last24h = this.errors.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000);
    const lastHour = this.errors.filter(e => now - e.timestamp < 60 * 60 * 1000);

    // 按上下文分组
    const byContext = last24h.reduce((acc, error) => {
      acc[error.context] = (acc[error.context] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 按消息分组
    const byMessage = last24h.reduce((acc, error) => {
      const key = error.message.substring(0, 100); // 截取前100个字符
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.errors.length,
      last24h: last24h.length,
      lastHour: lastHour.length,
      byContext,
      byMessage,
      mostRecent: this.errors[this.errors.length - 1]
    };
  }

  // 生成错误报告
  public generateErrorReport(): void {
    const stats = this.getErrorStats();
    
    console.group('📋 错误统计报告');
    console.log(`总错误数: ${stats.total}`);
    console.log(`最近24小时: ${stats.last24h}`);
    console.log(`最近1小时: ${stats.lastHour}`);
    
    console.log('\n📊 按上下文分类:');
    Object.entries(stats.byContext).forEach(([context, count]) => {
      console.log(`  ${context}: ${count}`);
    });

    console.log('\n🔍 高频错误:');
    Object.entries(stats.byMessage)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .forEach(([message, count]) => {
        console.log(`  ${count}x: ${message}`);
      });

    if (stats.mostRecent) {
      console.log(`\n🕐 最近错误: ${new Date(stats.mostRecent.timestamp).toLocaleString()}`);
      console.log(`   ${stats.mostRecent.message}`);
    }

    console.groupEnd();
  }

  // 清除错误日志
  public clearErrors(): void {
    this.errors = [];
    console.log('🧹 错误日志已清除');
  }

  // 获取所有错误
  public getAllErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  // 启用/禁用错误日志
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`📝 错误日志已${enabled ? '启用' : '禁用'}`);
  }

  // 检查是否有严重错误
  public hasCriticalErrors(): boolean {
    const recentErrors = this.errors.filter(e => 
      Date.now() - e.timestamp < 5 * 60 * 1000 // 最近5分钟
    );

    // 检查高频错误
    const errorCounts = recentErrors.reduce((acc, error) => {
      acc[error.message] = (acc[error.message] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.values(errorCounts).some(count => count >= 3);
  }
}

// 导出单例实例
export const errorLogger = ErrorLogger.getInstance();

// 便捷函数
export const logError = (error: Partial<ErrorInfo>) => errorLogger.logError(error);
export const logLoadingError = (context: string, error: any, retryCount?: number) => 
  errorLogger.logLoadingError(context, error, retryCount);
export const logNetworkError = (url: string, error: any, retryCount?: number) => 
  errorLogger.logNetworkError(url, error, retryCount);
export const logModuleError = (moduleName: string, error: any, retryCount?: number) => 
  errorLogger.logModuleError(moduleName, error, retryCount);