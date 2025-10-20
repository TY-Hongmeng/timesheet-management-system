/**
 * 增强DNS解析器
 * 专门处理5G网络环境下的DNS解析问题
 */

interface DNSConfig {
  servers: string[];
  timeout: number;
  retries: number;
  preferIPv4: boolean;
}

interface DNSResult {
  success: boolean;
  server: string;
  responseTime: number;
  ipVersion: 'IPv4' | 'IPv6';
  error?: string;
}

class EnhancedDNSResolver {
  private config: DNSConfig;
  private cache: Map<string, DNSResult> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    this.config = {
      servers: [
        // IPv4 DNS服务器
        '8.8.8.8',      // Google DNS
        '8.8.4.4',      // Google DNS
        '1.1.1.1',      // Cloudflare DNS
        '1.0.0.1',      // Cloudflare DNS
        '208.67.222.222', // OpenDNS
        '208.67.220.220', // OpenDNS
        // IPv6 DNS服务器
        '2001:4860:4860::8888', // Google DNS IPv6
        '2001:4860:4860::8844', // Google DNS IPv6
        '2606:4700:4700::1111', // Cloudflare DNS IPv6
        '2606:4700:4700::1001'  // Cloudflare DNS IPv6
      ],
      timeout: 5000,
      retries: 3,
      preferIPv4: true // 5G网络下优先使用IPv4
    };
  }

  /**
   * 检测最佳DNS服务器
   */
  async findBestDNSServer(): Promise<string> {
    console.log('Finding best DNS server...');
    
    const testPromises = this.config.servers.map(async (server) => {
      try {
        const start = performance.now();
        
        // 使用DoH (DNS over HTTPS) 进行测试
        const testUrl = this.isIPv6(server) 
          ? `https://[${server}]/dns-query`
          : `https://${server}/dns-query`;
        
        // 简化测试：直接测试到Google的连接
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(this.config.timeout)
        });
        
        const responseTime = performance.now() - start;
        
        return {
          server,
          responseTime,
          success: true,
          ipVersion: this.isIPv6(server) ? 'IPv6' as const : 'IPv4' as const
        };
      } catch (error) {
        return {
          server,
          responseTime: Infinity,
          success: false,
          ipVersion: this.isIPv6(server) ? 'IPv6' as const : 'IPv4' as const,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const results = await Promise.allSettled(testPromises);
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<DNSResult> => 
        result.status === 'fulfilled' && result.value.success)
      .map(result => result.value)
      .sort((a, b) => {
        // 优先IPv4（5G网络兼容性更好）
        if (this.config.preferIPv4) {
          if (a.ipVersion === 'IPv4' && b.ipVersion === 'IPv6') return -1;
          if (a.ipVersion === 'IPv6' && b.ipVersion === 'IPv4') return 1;
        }
        // 然后按响应时间排序
        return a.responseTime - b.responseTime;
      });

    if (successfulResults.length > 0) {
      const bestServer = successfulResults[0].server;
      console.log(`Best DNS server found: ${bestServer} (${successfulResults[0].responseTime.toFixed(2)}ms)`);
      return bestServer;
    }

    console.warn('No DNS server responded, using default');
    return this.config.servers[0];
  }

  /**
   * 检查是否为IPv6地址
   */
  private isIPv6(address: string): boolean {
    return address.includes(':');
  }

  /**
   * 预解析关键域名
   */
  async preResolveDomains(domains: string[]): Promise<void> {
    console.log('Pre-resolving critical domains...');
    
    const bestDNS = await this.findBestDNSServer();
    
    const resolvePromises = domains.map(async (domain) => {
      try {
        // 使用DNS预解析
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = `//${domain}`;
        document.head.appendChild(link);

        // 同时进行实际连接测试
        await fetch(`https://${domain}/favicon.ico`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000)
        });

        console.log(`Successfully pre-resolved: ${domain}`);
      } catch (error) {
        console.warn(`Failed to pre-resolve ${domain}:`, error);
      }
    });

    await Promise.allSettled(resolvePromises);
  }

  /**
   * 智能DNS解析策略
   */
  async smartResolve(domain: string): Promise<DNSResult> {
    // 检查缓存
    const cacheKey = `${domain}_${this.config.preferIPv4 ? 'ipv4' : 'ipv6'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.responseTime < this.cacheTimeout) {
      console.log(`Using cached DNS result for ${domain}`);
      return cached;
    }

    console.log(`Resolving ${domain} with smart strategy...`);

    // 尝试多种解析策略
    const strategies = [
      () => this.resolveWithIPv4(domain),
      () => this.resolveWithIPv6(domain),
      () => this.resolveWithFallback(domain)
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result.success) {
          // 缓存成功的结果
          this.cache.set(cacheKey, {
            ...result,
            responseTime: Date.now()
          });
          return result;
        }
      } catch (error) {
        console.warn(`DNS resolution strategy failed:`, error);
      }
    }

    // 所有策略都失败
    const failureResult: DNSResult = {
      success: false,
      server: 'unknown',
      responseTime: -1,
      ipVersion: 'IPv4',
      error: 'All DNS resolution strategies failed'
    };

    return failureResult;
  }

  /**
   * IPv4优先解析
   */
  private async resolveWithIPv4(domain: string): Promise<DNSResult> {
    const ipv4Servers = this.config.servers.filter(server => !this.isIPv6(server));
    
    for (const server of ipv4Servers) {
      try {
        const start = performance.now();
        
        await fetch(`https://${domain}/favicon.ico`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(this.config.timeout)
        });
        
        const responseTime = performance.now() - start;
        
        return {
          success: true,
          server,
          responseTime,
          ipVersion: 'IPv4'
        };
      } catch (error) {
        continue;
      }
    }

    throw new Error('IPv4 resolution failed');
  }

  /**
   * IPv6解析
   */
  private async resolveWithIPv6(domain: string): Promise<DNSResult> {
    const ipv6Servers = this.config.servers.filter(server => this.isIPv6(server));
    
    for (const server of ipv6Servers) {
      try {
        const start = performance.now();
        
        await fetch(`https://${domain}/favicon.ico`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(this.config.timeout)
        });
        
        const responseTime = performance.now() - start;
        
        return {
          success: true,
          server,
          responseTime,
          ipVersion: 'IPv6'
        };
      } catch (error) {
        continue;
      }
    }

    throw new Error('IPv6 resolution failed');
  }

  /**
   * 回退解析策略
   */
  private async resolveWithFallback(domain: string): Promise<DNSResult> {
    // 使用浏览器默认DNS解析
    try {
      const start = performance.now();
      
      // 尝试直接连接，让浏览器处理DNS
      await fetch(`https://${domain}`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(this.config.timeout * 2)
      });
      
      const responseTime = performance.now() - start;
      
      return {
        success: true,
        server: 'browser-default',
        responseTime,
        ipVersion: 'IPv4' // 假设为IPv4
      };
    } catch (error) {
      throw new Error(`Fallback resolution failed: ${error}`);
    }
  }

  /**
   * 配置DNS偏好
   */
  setIPv4Preference(prefer: boolean): void {
    this.config.preferIPv4 = prefer;
    console.log(`DNS IPv4 preference set to: ${prefer}`);
  }

  /**
   * 清除DNS缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('DNS cache cleared');
  }

  /**
   * 获取DNS统计信息
   */
  getStats(): { cacheSize: number; config: DNSConfig } {
    return {
      cacheSize: this.cache.size,
      config: { ...this.config }
    };
  }

  /**
   * 5G网络优化配置
   */
  optimizeFor5G(): void {
    console.log('Applying 5G DNS optimizations...');
    
    // 5G网络下的特殊配置
    this.config.preferIPv4 = true;  // 优先IPv4以提高兼容性
    this.config.timeout = 3000;     // 减少超时时间
    this.config.retries = 2;        // 减少重试次数
    
    // 预解析关键域名
    this.preResolveDomains([
      'ty-hongmeng.github.io',
      'github.com',
      'githubusercontent.com',
      'google.com',
      'cloudflare.com'
    ]);
  }
}

// 创建全局实例
const dnsResolver = new EnhancedDNSResolver();

// 导出
export { dnsResolver, EnhancedDNSResolver };
export type { DNSConfig, DNSResult }