import React from 'react'

// 性能监控工具
class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number> = new Map()
  private startTimes: Map<string, number> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // 开始计时
  startTiming(key: string): void {
    this.startTimes.set(key, performance.now())
    console.log(`⏱️ 开始计时: ${key}`)
  }

  // 结束计时
  endTiming(key: string): number {
    const startTime = this.startTimes.get(key)
    if (!startTime) {
      console.warn(`⚠️ 未找到计时起点: ${key}`)
      return 0
    }

    const duration = performance.now() - startTime
    this.metrics.set(key, duration)
    this.startTimes.delete(key)
    
    console.log(`✅ 计时结束: ${key} - ${duration.toFixed(2)}ms`)
    
    // 如果加载时间过长，发出警告
    if (duration > 3000) {
      console.warn(`🐌 加载时间过长: ${key} - ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }

  // 获取指标
  getMetric(key: string): number | undefined {
    return this.metrics.get(key)
  }

  // 获取所有指标
  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics)
  }

  // 记录页面加载性能
  recordPageLoad(pageName: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.fetchStart
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart
        const firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime || 0
        
        console.log(`📊 页面性能指标 - ${pageName}:`, {
          总加载时间: `${loadTime.toFixed(2)}ms`,
          DOM加载时间: `${domContentLoaded.toFixed(2)}ms`,
          首次绘制: `${firstPaint.toFixed(2)}ms`
        })
        
        this.metrics.set(`${pageName}_load_time`, loadTime)
        this.metrics.set(`${pageName}_dom_content_loaded`, domContentLoaded)
        this.metrics.set(`${pageName}_first_paint`, firstPaint)
      }
    }
  }

  // 记录网络状态
  recordNetworkInfo(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        console.log(`🌐 网络状态:`, {
          连接类型: connection.effectiveType,
          下行速度: `${connection.downlink}Mbps`,
          RTT: `${connection.rtt}ms`,
          数据节省: connection.saveData ? '开启' : '关闭'
        })
      }
    }
  }

  // 检测慢速网络
  isSlowNetwork(): boolean {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        // 如果是2G或者下行速度小于1Mbps，认为是慢速网络
        return connection.effectiveType === '2g' || 
               connection.effectiveType === 'slow-2g' ||
               connection.downlink < 1
      }
    }
    return false
  }

  // 清除指标
  clearMetrics(): void {
    this.metrics.clear()
    this.startTimes.clear()
    console.log('🧹 性能指标已清除')
  }

  // 导出性能报告
  exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.getAllMetrics(),
      userAgent: navigator.userAgent,
      networkInfo: this.getNetworkInfo()
    }
    
    return JSON.stringify(report, null, 2)
  }

  private getNetworkInfo(): any {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        return {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        }
      }
    }
    return null
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()

// 页面加载性能监控Hook
export const usePagePerformance = (pageName: string) => {
  React.useEffect(() => {
    performanceMonitor.startTiming(`page_${pageName}`)
    performanceMonitor.recordNetworkInfo()
    
    return () => {
      performanceMonitor.endTiming(`page_${pageName}`)
      performanceMonitor.recordPageLoad(pageName)
    }
  }, [pageName])
}

// 组件加载性能监控Hook
export const useComponentPerformance = (componentName: string) => {
  React.useEffect(() => {
    performanceMonitor.startTiming(`component_${componentName}`)
    
    return () => {
      performanceMonitor.endTiming(`component_${componentName}`)
    }
  }, [componentName])
}

export default performanceMonitor