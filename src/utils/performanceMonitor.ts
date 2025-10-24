// 性能监控工具 - 用于跟踪加载性能和识别瓶颈
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();
  private isEnabled: boolean = true;

  private constructor() {
    this.initializeMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeMonitoring() {
    // 监控页面加载性能
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        this.recordPageLoadMetrics();
      });
    }
  }

  // 开始计时
  public startTimer(name: string): void {
    if (!this.isEnabled) return;
    this.startTimes.set(name, performance.now());
    console.log(`⏱️ 开始计时: ${name}`);
  }

  // 结束计时并记录
  public endTimer(name: string): number {
    if (!this.isEnabled) return 0;
    
    const startTime = this.startTimes.get(name);
    if (!startTime) {
      console.warn(`⚠️ 未找到计时器: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.metrics.set(name, duration);
    this.startTimes.delete(name);
    
    console.log(`✅ ${name} 完成，耗时: ${Math.round(duration)}ms`);
    return duration;
  }

  // 记录页面加载指标
  private recordPageLoadMetrics(): void {
    if (!('performance' in window) || !window.performance.timing) return;

    const timing = window.performance.timing;
    const navigation = window.performance.navigation;

    // 计算关键指标
    const metrics = {
      'DNS查询': timing.domainLookupEnd - timing.domainLookupStart,
      'TCP连接': timing.connectEnd - timing.connectStart,
      '请求响应': timing.responseEnd - timing.requestStart,
      'DOM解析': timing.domContentLoadedEventEnd - timing.domLoading,
      '页面加载': timing.loadEventEnd - timing.navigationStart,
      '首次渲染': timing.domContentLoadedEventEnd - timing.navigationStart
    };

    // 记录指标
    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        this.metrics.set(name, value);
      }
    });

    // 输出性能报告
    this.generatePerformanceReport();
  }

  // 生成性能报告
  public generatePerformanceReport(): void {
    if (!this.isEnabled) return;

    console.group('📊 性能监控报告');
    
    // 页面加载指标
    const pageMetrics = ['DNS查询', 'TCP连接', '请求响应', 'DOM解析', '页面加载', '首次渲染'];
    pageMetrics.forEach(metric => {
      const value = this.metrics.get(metric);
      if (value !== undefined) {
        const status = this.getPerformanceStatus(metric, value);
        console.log(`${status} ${metric}: ${Math.round(value)}ms`);
      }
    });

    // 应用加载指标
    const appMetrics = Array.from(this.metrics.entries()).filter(([name]) => 
      !pageMetrics.includes(name)
    );
    
    if (appMetrics.length > 0) {
      console.log('\n🚀 应用加载指标:');
      appMetrics.forEach(([name, value]) => {
        const status = this.getPerformanceStatus(name, value);
        console.log(`${status} ${name}: ${Math.round(value)}ms`);
      });
    }

    // 网络信息
    this.logNetworkInfo();
    
    // 设备信息
    this.logDeviceInfo();

    console.groupEnd();
  }

  // 获取性能状态图标
  private getPerformanceStatus(metric: string, value: number): string {
    // 根据不同指标设置不同的阈值
    let threshold = 1000; // 默认阈值
    
    if (metric.includes('DNS') || metric.includes('TCP')) {
      threshold = 200;
    } else if (metric.includes('请求') || metric.includes('响应')) {
      threshold = 500;
    } else if (metric.includes('DOM') || metric.includes('渲染')) {
      threshold = 800;
    } else if (metric.includes('预加载') || metric.includes('模块')) {
      threshold = 2000;
    }

    if (value < threshold * 0.5) return '🟢';
    if (value < threshold) return '🟡';
    return '🔴';
  }

  // 记录网络信息
  private logNetworkInfo(): void {
    const connection = (navigator as any).connection;
    if (connection) {
      console.log('\n🌐 网络信息:');
      console.log(`   类型: ${connection.effectiveType || 'unknown'}`);
      console.log(`   下行速度: ${connection.downlink || 'unknown'}Mbps`);
      console.log(`   RTT: ${connection.rtt || 'unknown'}ms`);
      console.log(`   数据节省: ${connection.saveData ? '开启' : '关闭'}`);
    }
  }

  // 记录设备信息
  private logDeviceInfo(): void {
    console.log('\n📱 设备信息:');
    console.log(`   CPU核心数: ${navigator.hardwareConcurrency || 'unknown'}`);
    console.log(`   内存: ${(navigator as any).deviceMemory || 'unknown'}GB`);
    console.log(`   用户代理: ${navigator.userAgent.includes('Mobile') ? '移动设备' : '桌面设备'}`);
  }

  // 记录自定义指标
  public recordMetric(name: string, value: number): void {
    if (!this.isEnabled) return;
    this.metrics.set(name, value);
    console.log(`📈 记录指标 ${name}: ${Math.round(value)}ms`);
  }

  // 获取指标
  public getMetric(name: string): number | undefined {
    return this.metrics.get(name);
  }

  // 获取所有指标
  public getAllMetrics(): Map<string, number> {
    return new Map(this.metrics);
  }

  // 清除指标
  public clearMetrics(): void {
    this.metrics.clear();
    this.startTimes.clear();
    console.log('🧹 性能指标已清除');
  }

  // 启用/禁用监控
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`📊 性能监控已${enabled ? '启用' : '禁用'}`);
  }

  // 检查是否有性能问题
  public checkPerformanceIssues(): string[] {
    const issues: string[] = [];
    
    // 检查页面加载时间
    const pageLoad = this.metrics.get('页面加载');
    if (pageLoad && pageLoad > 3000) {
      issues.push(`页面加载时间过长: ${Math.round(pageLoad)}ms`);
    }

    // 检查DNS查询时间
    const dnsLookup = this.metrics.get('DNS查询');
    if (dnsLookup && dnsLookup > 500) {
      issues.push(`DNS查询时间过长: ${Math.round(dnsLookup)}ms`);
    }

    // 检查模块加载时间
    this.metrics.forEach((value, name) => {
      if (name.includes('预加载') && value > 5000) {
        issues.push(`${name}时间过长: ${Math.round(value)}ms`);
      }
    });

    return issues;
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();

// 全局性能监控函数
export const startTimer = (name: string) => performanceMonitor.startTimer(name);
export const endTimer = (name: string) => performanceMonitor.endTimer(name);
export const recordMetric = (name: string, value: number) => performanceMonitor.recordMetric(name, value);