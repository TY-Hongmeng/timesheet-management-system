/**
 * 日志工具 - 根据环境控制日志输出
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = import.meta.env.DEV;
  private isProd = import.meta.env.PROD;

  /**
   * 调试日志 - 仅在开发环境显示
   */
  debug(message: string, ...args: any[]) {
    if (this.isDev) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * 信息日志 - 仅在开发环境显示
   */
  info(message: string, ...args: any[]) {
    if (this.isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * 警告日志 - 开发环境显示详细信息，生产环境静默
   */
  warn(message: string, ...args: any[]) {
    if (this.isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    } else if (this.isProd) {
      // 生产环境可以选择发送到错误监控服务
      // 这里暂时静默处理
    }
  }

  /**
   * 错误日志 - 开发环境显示详细信息，生产环境记录关键错误
   */
  error(message: string, ...args: any[]) {
    if (this.isDev) {
      console.error(`[ERROR] ${message}`, ...args);
    } else if (this.isProd) {
      // 生产环境只记录关键错误，不显示详细堆栈
      console.error(`应用遇到错误: ${message}`);
      
      // 可以在这里集成错误监控服务，如 Sentry
      // this.sendToErrorService(message, args);
    }
  }

  /**
   * 网络错误 - 特殊处理网络相关错误
   */
  networkError(message: string, error?: any) {
    if (this.isDev) {
      console.error(`[NETWORK ERROR] ${message}`, error);
    } else if (this.isProd) {
      console.error('网络连接异常，请检查网络设置');
    }
  }

  /**
   * 用户操作错误 - 用户可见的错误
   */
  userError(message: string, error?: any) {
    if (this.isDev) {
      console.error(`[USER ERROR] ${message}`, error);
    }
    // 生产环境中，用户错误通常通过 toast 显示，不需要控制台输出
  }

  /**
   * 性能日志 - 仅在开发环境显示
   */
  performance(message: string, ...args: any[]) {
    if (this.isDev) {
      console.log(`[PERF] ${message}`, ...args);
    }
  }

  /**
   * 移动端优化日志 - 仅在开发环境显示
   */
  mobile(message: string, ...args: any[]) {
    if (this.isDev) {
      console.log(`[MOBILE] ${message}`, ...args);
    }
  }

  /**
   * Service Worker 日志 - 仅在开发环境显示
   */
  sw(message: string, ...args: any[]) {
    if (this.isDev) {
      console.log(`[SW] ${message}`, ...args);
    }
  }
}

// 导出单例实例
export const logger = new Logger();

// 导出便捷方法
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  networkError: logger.networkError.bind(logger),
  userError: logger.userError.bind(logger),
  performance: logger.performance.bind(logger),
  mobile: logger.mobile.bind(logger),
  sw: logger.sw.bind(logger),
};