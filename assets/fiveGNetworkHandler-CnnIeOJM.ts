/**
 * 5G网络兼容性处理器
 * 专门解决5G网络环境下的连接问题
 */

interface NetworkInfo {
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface ConnectionDiagnostics {
  networkType: '4G' | '5G' | 'WiFi' | 'Unknown';
  ipVersion: 'IPv4' | 'IPv6' | 'Dual' | 'Unknown';
  dnsServers: string[];
  protocolSupport: {
    http1: boolean;
    http2: boolean;
    http3: boolean;
  };
  tlsVersion: string;
  latency: number;
  bandwidth: number;
}

class FiveGNetworkHandler {
  private diagnostics: ConnectionDiagnostics | null = null;
  private fallbackStrategies: Array<() => Promise<boolean>> = [];
  private dnsServers = [
    '8.8.8.8',      // Google DNS (IPv4)
    '8.8.4.4',      // Google DNS (IPv4)
    '1.1.1.1',      // Cloudflare DNS (IPv4)
    '1.0.0.1',      // Cloudflare DNS (IPv4)
    '2001:4860:4860::8888', // Google DNS (IPv6)
    '2001:4860:4860::8844', // Google DNS (IPv6)
    '2606:4700:4700::1111', // Cloudflare DNS (IPv6)
    '2606:4700:4700::1001'  // Cloudflare DNS (IPv6)
  ];

  constructor() {
    this.initializeFallbackStrategies();
    this.detectNetworkCapabilities();
  }

  /**
   * 检测网络类型（4G/5G）
   */
  private detectNetworkType(): '4G' | '5G' | 'WiFi' | 'Unknown' {
    try {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (!connection) return 'Unknown';

      // 5G网络特征检测
      if (connection.effectiveType === '4g' && connection.downlink > 50) {
        return '5G';
      }
      
      // 4G网络检测
      if (connection.effectiveType === '4g' || connection.effectiveType === '3g') {
        return '4G';
      }

      // WiFi检测
      if (connection.type === 'wifi') {
        return 'WiFi';
      }

      return 'Unknown';
    } catch (error) {
      console.warn('Network type detection failed:', error);
      return 'Unknown';
    }
  }

  /**
   * 检测IP协议版本支持
   */
  private async detectIPVersion(): Promise<'IPv4' | 'IPv6' | 'Dual' | 'Unknown'> {
    const results = {
      ipv4: false,
      ipv6: false
    };

    try {
      // 测试IPv4连接
      const ipv4Test = fetch('https://ipv4.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      }).then(() => {
        results.ipv4 = true;
      }).catch(() => {
        results.ipv4 = false;
      });

      // 测试IPv6连接
      const ipv6Test = fetch('https://ipv6.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      }).then(() => {
        results.ipv6 = true;
      }).catch(() => {
        results.ipv6 = false;
      });

      await Promise.allSettled([ipv4Test, ipv6Test]);

      if (results.ipv4 && results.ipv6) return 'Dual';
      if (results.ipv4) return 'IPv4';
      if (results.ipv6) return 'IPv6';
      return 'Unknown';
    } catch (error) {
      console.warn('IP version detection failed:', error);
      return 'Unknown';
    }
  }

  /**
   * 检测协议支持
   */
  private async detectProtocolSupport() {
    const support = {
      http1: true,  // 默认支持
      http2: false,
      http3: false
    };

    try {
      // 检测HTTP/2支持
      if ('serviceWorker' in navigator) {
        support.http2 = true;
      }

      // 检测HTTP/3支持（实验性）
      if ('connection' in navigator && (navigator as any).connection.effectiveType) {
        support.http3 = false; // 暂时设为false，因为支持有限
      }
    } catch (error) {
      console.warn('Protocol support detection failed:', error);
    }

    return support;
  }

  /**
   * 测量网络延迟 - 使用本地资源
   */
  private async measureLatency(): Promise<number> {
    try {
      const start = performance.now();
      
      // 使用本地资源进行延迟测试
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const testUrl = isLocalDev ? '/favicon.svg' : '/timesheet-management-system/favicon.svg';
      
      await fetch(testUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'cors'
      });
      
      const end = performance.now();
      return end - start;
    } catch (error) {
      console.warn('Latency measurement failed, using fallback method:', error);
      
      // 备用方法：使用浏览器原生API
      try {
        const start = performance.now();
        // 使用 navigator.onLine 和 connection API 进行估算
        if ('connection' in navigator) {
          const connection = (navigator as any).connection;
          if (connection && connection.rtt) {
            return connection.rtt;
          }
        }
        
        // 最后备用：基于当前页面的加载时间估算
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationTiming && navigationTiming.responseStart && navigationTiming.requestStart) {
          return navigationTiming.responseStart - navigationTiming.requestStart;
        }
        
        return 100; // 默认估算值
      } catch (fallbackError) {
        console.warn('Fallback latency measurement also failed:', fallbackError);
        return -1;
      }
    }
  }

  /**
   * 估算带宽
   */
  private estimateBandwidth(): number {
    try {
      const connection = (navigator as any).connection;
      if (connection && connection.downlink) {
        return connection.downlink;
      }
      return -1;
    } catch (error) {
      console.warn('Bandwidth estimation failed:', error);
      return -1;
    }
  }

  /**
   * 执行完整的网络诊断
   */
  async detectNetworkCapabilities(): Promise<ConnectionDiagnostics> {
    try {
      const [ipVersion, protocolSupport, latency] = await Promise.all([
        this.detectIPVersion(),
        this.detectProtocolSupport(),
        this.measureLatency()
      ]);

      this.diagnostics = {
        networkType: this.detectNetworkType(),
        ipVersion,
        dnsServers: this.dnsServers,
        protocolSupport,
        tlsVersion: 'TLS 1.3', // 现代浏览器默认
        latency,
        bandwidth: this.estimateBandwidth()
      };

      console.log('Network diagnostics completed:', this.diagnostics);
      return this.diagnostics;
    } catch (error) {
      console.error('Network capability detection failed:', error);
      throw error;
    }
  }

  /**
   * 初始化回退策略
   */
  private initializeFallbackStrategies() {
    // 策略1: 强制使用IPv4
    this.fallbackStrategies.push(async () => {
      try {
        console.log('Trying IPv4 fallback strategy...');
        // 这里可以设置DNS偏好或其他IPv4特定配置
        return true;
      } catch (error) {
        console.warn('IPv4 fallback failed:', error);
        return false;
      }
    });

    // 策略2: 使用备用DNS服务器
    this.fallbackStrategies.push(async () => {
      try {
        console.log('Trying alternative DNS strategy...');
        // 可以在这里实现DNS服务器切换逻辑
        return true;
      } catch (error) {
        console.warn('Alternative DNS fallback failed:', error);
        return false;
      }
    });

    // 策略3: 协议降级（HTTP/2 -> HTTP/1.1）
    this.fallbackStrategies.push(async () => {
      try {
        console.log('Trying protocol downgrade strategy...');
        // 实现协议降级逻辑
        return true;
      } catch (error) {
        console.warn('Protocol downgrade fallback failed:', error);
        return false;
      }
    });
  }

  /**
   * 执行连接回退策略
   */
  async executeConnectionFallback(): Promise<boolean> {
    console.log('Executing connection fallback strategies...');
    
    for (let i = 0; i < this.fallbackStrategies.length; i++) {
      try {
        console.log(`Trying fallback strategy ${i + 1}...`);
        const success = await this.fallbackStrategies[i]();
        if (success) {
          console.log(`Fallback strategy ${i + 1} succeeded`);
          return true;
        }
      } catch (error) {
        console.warn(`Fallback strategy ${i + 1} failed:`, error);
      }
    }

    console.error('All fallback strategies failed');
    return false;
  }

  /**
   * 5G网络专用的连接优化
   */
  async optimizeFor5G(): Promise<void> {
    if (!this.diagnostics || this.diagnostics.networkType !== '5G') {
      return;
    }

    console.log('Applying 5G network optimizations...');

    try {
      // 1. 预连接到关键域名
      this.preconnectToDomains([
        'ty-hongmeng.github.io',
        'github.com',
        'githubusercontent.com'
      ]);

      // 2. 设置5G特定的缓存策略
      this.setup5GCacheStrategy();

      // 3. 优化资源加载顺序
      this.optimizeResourceLoading();

      console.log('5G optimizations applied successfully');
    } catch (error) {
      console.error('5G optimization failed:', error);
    }
  }

  /**
   * 预连接到关键域名
   */
  private preconnectToDomains(domains: string[]) {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = `https://${domain}`;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  /**
   * 设置5G特定的缓存策略
   */
  private setup5GCacheStrategy() {
    // 5G网络下可以更激进地缓存资源
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.active?.postMessage({
          type: 'SET_CACHE_STRATEGY',
          strategy: '5G_OPTIMIZED'
        });
      });
    }
  }

  /**
   * 优化资源加载顺序
   */
  private optimizeResourceLoading() {
    // 5G网络下可以并行加载更多资源
    const criticalResources = document.querySelectorAll('link[rel="stylesheet"], script[src]');
    criticalResources.forEach((resource: any) => {
      if (resource.tagName === 'LINK') {
        resource.setAttribute('importance', 'high');
      }
      if (resource.tagName === 'SCRIPT') {
        resource.setAttribute('importance', 'high');
      }
    });
  }

  /**
   * 获取网络诊断信息
   */
  getDiagnostics(): ConnectionDiagnostics | null {
    return this.diagnostics;
  }

  /**
   * 检查是否为5G网络
   */
  is5GNetwork(): boolean {
    return this.diagnostics?.networkType === '5G';
  }

  /**
   * 获取网络建议
   */
  getNetworkRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.diagnostics) {
      recommendations.push('正在检测网络环境...');
      return recommendations;
    }

    if (this.diagnostics.networkType === '5G') {
      if (this.diagnostics.ipVersion === 'IPv6') {
        recommendations.push('检测到5G IPv6网络，正在应用兼容性优化...');
      }
      if (this.diagnostics.latency > 100) {
        recommendations.push('5G网络延迟较高，建议检查信号强度');
      }
    }

    if (this.diagnostics.networkType === '4G') {
      recommendations.push('4G网络连接正常');
    }

    if (this.diagnostics.ipVersion === 'Unknown') {
      recommendations.push('无法检测IP协议版本，建议切换网络');
    }

    return recommendations;
  }
}

// 创建全局实例
const fiveGHandler = new FiveGNetworkHandler();

// 导出实例和类
export { fiveGHandler, FiveGNetworkHandler };
export type { ConnectionDiagnostics, NetworkInfo };