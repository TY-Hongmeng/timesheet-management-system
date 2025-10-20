// 连接诊断工具
import { networkManager } from './enhancedNetworkManager'

export interface DiagnosticResult {
  timestamp: number
  testName: string
  success: boolean
  duration: number
  error?: string
  details?: any
}

export interface NetworkDiagnostics {
  overall: 'excellent' | 'good' | 'poor' | 'critical'
  latency: number
  bandwidth: number
  stability: number
  recommendations: string[]
  results: DiagnosticResult[]
}

export class ConnectionDiagnostics {
  private results: DiagnosticResult[] = []
  private isRunning = false

  // 运行完整的网络诊断
  public async runFullDiagnostics(): Promise<NetworkDiagnostics> {
    if (this.isRunning) {
      throw new Error('Diagnostics already running')
    }

    this.isRunning = true
    this.results = []

    console.log('🔍 Starting comprehensive network diagnostics...')

    try {
      // 基础连接测试
      await this.testBasicConnectivity()
      
      // 延迟测试
      await this.testLatency()
      
      // 带宽测试
      await this.testBandwidth()
      
      // 稳定性测试
      await this.testStability()
      
      // DNS解析测试
      await this.testDNSResolution()
      
      // 移动端特殊测试
      if (this.isMobileDevice()) {
        await this.testMobileSpecific()
      }

      return this.generateReport()
    } finally {
      this.isRunning = false
    }
  }

  // 基础连接测试 - 仅使用本地资源
  private async testBasicConnectivity(): Promise<void> {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    const testUrls = isLocalDev ? [
      window.location.origin + '/manifest.json',
      window.location.origin + '/favicon.svg',
      window.location.origin + '/'
    ] : [
      window.location.origin + '/timesheet-management-system/manifest.json',
      window.location.origin + '/timesheet-management-system/favicon.svg',
      window.location.origin + '/timesheet-management-system/'
    ];

    for (const url of testUrls) {
      await this.runTest(`Local Connectivity - ${new URL(url).pathname}`, async () => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        try {
          const response = await fetch(url, {
            method: 'HEAD',
            cache: 'no-cache',
            signal: controller.signal,
            mode: 'cors',
            credentials: 'same-origin'
          })
          
          clearTimeout(timeout)
          return { success: true, status: response.status }
        } catch (error) {
          clearTimeout(timeout)
          throw error
        }
      })
    }
  }

  // 延迟测试
  private async testLatency(): Promise<void> {
    const testCount = 5
    const latencies: number[] = []

    for (let i = 0; i < testCount; i++) {
      await this.runTest(`Latency Test ${i + 1}`, async () => {
        const start = performance.now()
        
        try {
          await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            cache: 'no-cache',
            mode: 'no-cors'
          })
          
          const latency = performance.now() - start
          latencies.push(latency)
          return { latency }
        } catch (error) {
          throw error
        }
      })

      // 测试间隔
      if (i < testCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // 计算平均延迟
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
    this.results.push({
      timestamp: Date.now(),
      testName: 'Average Latency',
      success: true,
      duration: avgLatency,
      details: { latencies, average: avgLatency }
    })
  }

  // 带宽测试（简化版）
  private async testBandwidth(): Promise<void> {
    await this.runTest('Bandwidth Test', async () => {
      const testUrl = 'https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js'
      const start = performance.now()
      
      try {
        const response = await fetch(testUrl, { cache: 'no-cache' })
        const data = await response.text()
        const duration = performance.now() - start
        const sizeKB = data.length / 1024
        const speedKBps = sizeKB / (duration / 1000)
        
        return { 
          sizeKB: Math.round(sizeKB), 
          duration: Math.round(duration),
          speedKBps: Math.round(speedKBps)
        }
      } catch (error) {
        throw error
      }
    })
  }

  // 稳定性测试
  private async testStability(): Promise<void> {
    const testCount = 10
    let successCount = 0

    for (let i = 0; i < testCount; i++) {
      try {
        await this.runTest(`Stability Test ${i + 1}`, async () => {
          const response = await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            cache: 'no-cache',
            mode: 'no-cors'
          })
          successCount++
          return { success: true }
        })
      } catch (error) {
        // 记录失败但继续测试
        this.results.push({
          timestamp: Date.now(),
          testName: `Stability Test ${i + 1}`,
          success: false,
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // 快速连续测试
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // 计算稳定性
    const stabilityRate = (successCount / testCount) * 100
    this.results.push({
      timestamp: Date.now(),
      testName: 'Connection Stability',
      success: stabilityRate > 80,
      duration: 0,
      details: { 
        successCount, 
        totalCount: testCount, 
        stabilityRate: Math.round(stabilityRate) 
      }
    })
  }

  // DNS解析测试
  private async testDNSResolution(): Promise<void> {
    const domains = [
      'www.google.com',
      'cdn.jsdelivr.net',
      'fonts.googleapis.com'
    ]

    for (const domain of domains) {
      await this.runTest(`DNS Resolution - ${domain}`, async () => {
        const start = performance.now()
        
        try {
          // 使用图片加载来测试DNS解析
          const img = new Image()
          const promise = new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            setTimeout(() => reject(new Error('DNS timeout')), 3000)
          })
          
          img.src = `https://${domain}/favicon.ico?t=${Date.now()}`
          await promise
          
          const duration = performance.now() - start
          return { dnsTime: Math.round(duration) }
        } catch (error) {
          throw error
        }
      })
    }
  }

  // 移动端特殊测试
  private async testMobileSpecific(): Promise<void> {
    // 测试页面可见性变化后的连接恢复
    await this.runTest('Mobile Visibility Recovery', async () => {
      // 模拟页面隐藏和显示
      document.dispatchEvent(new Event('visibilitychange'))
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'no-cors'
      })
      
      return { recovered: true }
    })

    // 测试网络信息API（如果可用）
    const connection = (navigator as any).connection
    if (connection) {
      this.results.push({
        timestamp: Date.now(),
        testName: 'Network Information API',
        success: true,
        duration: 0,
        details: {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        }
      })
    }
  }

  // 运行单个测试
  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const start = performance.now()
    
    try {
      const result = await testFn()
      const duration = performance.now() - start
      
      this.results.push({
        timestamp: Date.now(),
        testName,
        success: true,
        duration: Math.round(duration),
        details: result
      })
      
      console.log(`✅ ${testName}: ${Math.round(duration)}ms`)
    } catch (error) {
      const duration = performance.now() - start
      
      this.results.push({
        timestamp: Date.now(),
        testName,
        success: false,
        duration: Math.round(duration),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      console.warn(`❌ ${testName}: ${error}`)
    }
  }

  // 生成诊断报告
  private generateReport(): NetworkDiagnostics {
    const successRate = this.results.filter(r => r.success).length / this.results.length
    const avgLatency = this.getAverageLatency()
    const bandwidth = this.getBandwidth()
    const stability = this.getStability()

    // 评估整体网络质量
    let overall: NetworkDiagnostics['overall']
    if (successRate > 0.9 && avgLatency < 200 && stability > 90) {
      overall = 'excellent'
    } else if (successRate > 0.8 && avgLatency < 500 && stability > 80) {
      overall = 'good'
    } else if (successRate > 0.6 && avgLatency < 1000 && stability > 60) {
      overall = 'poor'
    } else {
      overall = 'critical'
    }

    // 生成建议
    const recommendations = this.generateRecommendations(overall, avgLatency, bandwidth, stability)

    return {
      overall,
      latency: Math.round(avgLatency),
      bandwidth: Math.round(bandwidth),
      stability: Math.round(stability),
      recommendations,
      results: this.results
    }
  }

  private getAverageLatency(): number {
    const latencyResults = this.results.filter(r => 
      r.testName.includes('Latency') && r.success && r.details?.latency
    )
    
    if (latencyResults.length === 0) return 0
    
    const total = latencyResults.reduce((sum, r) => sum + (r.details?.latency || r.duration), 0)
    return total / latencyResults.length
  }

  private getBandwidth(): number {
    const bandwidthResult = this.results.find(r => 
      r.testName === 'Bandwidth Test' && r.success
    )
    
    return bandwidthResult?.details?.speedKBps || 0
  }

  private getStability(): number {
    const stabilityResult = this.results.find(r => 
      r.testName === 'Connection Stability'
    )
    
    return stabilityResult?.details?.stabilityRate || 0
  }

  // 生成建议 - 增强版
  private generateRecommendations(
    overall: string, 
    latency: number, 
    bandwidth: number, 
    stability: number
  ): string[] {
    const recommendations: string[] = []

    if (overall === 'critical') {
      recommendations.push('🚨 网络连接严重不稳定，建议检查网络设置或联系网络服务提供商')
      recommendations.push('🔄 尝试重启路由器或切换到移动数据网络')
    }

    if (latency > 1000) {
      recommendations.push('⏰ 网络延迟过高，建议切换到更稳定的网络环境')
      recommendations.push('📍 如果使用WiFi，尝试靠近路由器或使用5GHz频段')
    } else if (latency > 500) {
      recommendations.push('⚡ 网络延迟较高，可能影响应用响应速度')
    }

    if (bandwidth < 100) {
      recommendations.push('📊 网络带宽较低，建议启用数据节省模式')
      recommendations.push('💾 启用离线缓存以减少数据使用')
    }

    if (stability < 80) {
      recommendations.push('📶 网络连接不稳定，建议启用离线模式或重试机制')
      recommendations.push('🔁 应用将自动重试失败的请求')
    }

    if (this.isMobileDevice()) {
      recommendations.push('📱 检测到移动设备，建议在WiFi环境下使用以获得更好体验')
      
      const connection = (navigator as any).connection
      if (connection && connection.saveData) {
        recommendations.push('💡 检测到数据节省模式，应用将优化资源加载')
      }
    }

    // GitHub Pages 特殊建议
    if (window.location.hostname.includes('github.io')) {
      recommendations.push('🌐 使用GitHub Pages托管，某些地区可能访问较慢')
      if (overall === 'poor' || overall === 'critical') {
        recommendations.push('🔧 建议使用VPN或代理服务改善连接质量')
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 网络连接状态良好，应用应该能正常运行')
    }

    return recommendations
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // 获取简化的连接状态 - 使用本地资源和浏览器API
  public async getQuickStatus(): Promise<{
    online: boolean
    quality: 'fast' | 'slow' | 'offline'
    latency?: number
  }> {
    // 首先检查浏览器的在线状态
    if (!navigator.onLine) {
      return {
        online: false,
        quality: 'offline'
      }
    }

    try {
      const start = performance.now()
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const testUrl = isLocalDev ? '/favicon.svg' : '/timesheet-management-system/favicon.svg';
      
      await fetch(testUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'cors',
        credentials: 'same-origin'
      })
      const latency = performance.now() - start

      return {
        online: true,
        quality: latency < 300 ? 'fast' : 'slow',
        latency: Math.round(latency)
      }
    } catch (error) {
      // 备用检查：使用浏览器连接API
      try {
        if ('connection' in navigator) {
          const connection = (navigator as any).connection;
          if (connection) {
            const effectiveType = connection.effectiveType;
            const rtt = connection.rtt || 0;
            
            return {
              online: true,
              quality: (effectiveType === '4g' || rtt < 300) ? 'fast' : 'slow',
              latency: rtt
            }
          }
        }
        
        // 最后备用：基于navigator.onLine
        return {
          online: navigator.onLine,
          quality: navigator.onLine ? 'slow' : 'offline'
        }
      } catch (fallbackError) {
        return {
          online: false,
          quality: 'offline'
        }
      }
    }
  }
}

// 全局实例
export const connectionDiagnostics = new ConnectionDiagnostics()