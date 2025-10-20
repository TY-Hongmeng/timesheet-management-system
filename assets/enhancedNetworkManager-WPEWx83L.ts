import { connectionDiagnostics } from './connectionDiagnostics'
import { nativeNetworkDetector } from './nativeNetworkDetector'

// 增强的网络连接管理器
export class EnhancedNetworkManager {
  private retryCount = 0
  private maxRetries = 5
  private baseDelay = 1000
  private maxDelay = 30000
  private isOnline = navigator.onLine
  private networkListeners: Array<(online: boolean) => void> = []
  private connectionQuality: 'fast' | 'slow' | 'offline' = 'fast'
  private lastSuccessfulConnection = Date.now()
  private connectionAttempts = 0
  private failureStreak = 0

  // 移动端检测
  private isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  // 网络质量检测
  private networkInfo = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  constructor() {
    this.setupNetworkListeners()
    this.setupVisibilityListener()
    this.setupConnectionMonitoring()
    this.detectNetworkQuality()
  }

  private setupNetworkListeners() {
    // 标准网络状态监听
    window.addEventListener('online', () => {
      console.log('🌐 Network: Online detected')
      this.handleOnlineEvent()
    })

    window.addEventListener('offline', () => {
      console.log('🔴 Network: Offline detected')
      this.handleOfflineEvent()
    })

    // 移动端特殊处理
    if (this.isMobile) {
      // iOS Safari 特殊处理
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          console.log('📱 Mobile: Page restored from cache')
          setTimeout(() => this.checkNetworkStatus(), 500)
        }
      })

      // 移动端焦点变化
      window.addEventListener('focus', () => {
        console.log('📱 Mobile: Window focused')
        setTimeout(() => this.checkNetworkStatus(), 300)
      })
    }

    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👁️ Page: Visibility changed to visible')
        setTimeout(() => this.checkNetworkStatus(), 200)
      }
    })
  }

  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.connectionQuality !== 'offline') {
        this.performHealthCheck()
      }
    })
  }

  private setupConnectionMonitoring() {
    // 定期健康检查
    setInterval(() => {
      if (this.isOnline) {
        this.performHealthCheck()
      }
    }, this.isMobile ? 15000 : 10000) // 移动端检查频率稍低

    // 监听网络信息变化
    if (this.networkInfo) {
      this.networkInfo.addEventListener('change', () => {
        this.detectNetworkQuality()
        this.checkNetworkStatus()
      })
    }
  }

  private detectNetworkQuality() {
    if (!this.networkInfo) return

    const { effectiveType, downlink, rtt } = this.networkInfo

    // 根据网络类型和指标判断质量
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5 || rtt > 2000) {
      this.connectionQuality = 'slow'
      console.log('🐌 Network: Slow connection detected')
    } else if (effectiveType === '4g' || downlink > 2) {
      this.connectionQuality = 'fast'
      console.log('🚀 Network: Fast connection detected')
    } else {
      this.connectionQuality = 'slow'
      console.log('⚡ Network: Medium connection detected')
    }
  }

  private handleOnlineEvent() {
    this.isOnline = true
    this.failureStreak = 0
    this.retryCount = 0
    this.lastSuccessfulConnection = Date.now()
    this.notifyListeners(true)
    
    // 立即进行健康检查
    this.performHealthCheck()
  }

  private handleOfflineEvent() {
    this.isOnline = false
    this.connectionQuality = 'offline'
    this.failureStreak++
    this.notifyListeners(false)
  }

  private async performHealthCheck() {
    try {
      const isHealthy = await this.checkNetworkStatus()
      if (isHealthy) {
        this.lastSuccessfulConnection = Date.now()
        this.failureStreak = 0
      }
    } catch (error) {
      console.warn('🔍 Health check failed:', error)
    }
  }

  // 指数退避算法 - 增强版
  private calculateRetryDelay(): number {
    // 基础指数退避
    const exponentialDelay = this.baseDelay * Math.pow(2, this.retryCount)
    
    // 添加随机抖动避免雷群效应
    const jitter = Math.random() * 1000
    
    // 根据网络质量调整延迟
    let qualityMultiplier = 1
    if (this.connectionQuality === 'slow') {
      qualityMultiplier = 2
    } else if (this.failureStreak > 3) {
      qualityMultiplier = 1.5
    }
    
    const baseDelay = Math.min(exponentialDelay + jitter, this.maxDelay) * qualityMultiplier
    
    // 移动端延迟稍长，特别是在网络不稳定时
    const mobileMultiplier = this.isMobile ? (this.failureStreak > 2 ? 2 : 1.5) : 1
    
    return Math.min(baseDelay * mobileMultiplier, this.maxDelay)
  }

  public async checkNetworkStatus(): Promise<boolean> {
    this.connectionAttempts++
    
    try {
      const controller = new AbortController()
      
      // 智能超时配置 - 针对5G网络优化
      let timeout = 5000 // 默认超时
      
      if (this.networkInfo) {
        const effectiveType = this.networkInfo.effectiveType
        if (effectiveType === '5g') {
          timeout = 3000 // 5G网络响应更快，但可能不稳定
        } else if (effectiveType === '4g') {
          timeout = 4000
        } else if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          timeout = 15000
        } else if (this.connectionQuality === 'slow') {
          timeout = 10000
        }
      } else if (this.connectionQuality === 'slow') {
        timeout = 10000
      }
      
      // 移动端适当延长超时
      if (this.isMobile && this.failureStreak > 1) {
        timeout = Math.min(timeout * 1.5, 12000)
      }
      
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      // 多重检测策略 - 优化错误处理
      const testUrls = this.getTestUrls()
      let success = false
      let lastError: Error | null = null

      for (const { url, options } of testUrls) {
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            // 添加5G网络优化的请求头
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              ...options.headers
            }
          })
          
          if (response.ok || response.status === 304) {
            success = true
            console.debug(`✅ Network test successful: ${url}`)
            break
          } else {
            console.debug(`⚠️ Test URL returned ${response.status}: ${url}`)
          }
        } catch (error: any) {
          lastError = error
          
          // 静默处理常见的网络错误，避免控制台污染
          if (error.name === 'AbortError') {
            console.debug(`⏰ Test URL timeout: ${url}`)
          } else if (error.message?.includes('ERR_ABORTED')) {
            console.debug(`🚫 Test URL aborted: ${url}`)
          } else if (error.message?.includes('ERR_FAILED')) {
            console.debug(`❌ Test URL failed: ${url}`)
          } else {
            console.debug(`🔗 Test URL error: ${url}`, error.message)
          }
          continue
        }
      }

      clearTimeout(timeoutId)
      
      if (success) {
        if (!this.isOnline) {
          this.handleOnlineEvent()
        }
        this.retryCount = 0
        return true
      } else {
        throw new Error('All test URLs failed')
      }
      
    } catch (error) {
      console.warn('🚨 Network check failed:', error)
      this.failureStreak++
      
      if (this.isOnline) {
        this.isOnline = false
        this.connectionQuality = 'offline'
        this.notifyListeners(false)
      }
      
      return false
    }
  }

  private getTestUrls() {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    return [
      {
        url: '/manifest.json',
        options: {
          method: 'HEAD',
          cache: 'no-cache',
          timeout: 2000
        }
      },
      {
        url: '/',
        options: {
          method: 'HEAD',
          cache: 'no-cache',
          timeout: 2000
        }
      }
    ]
  }

  // 智能重试机制
  public async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting ${context} (${attempt + 1}/${this.maxRetries + 1})`)
        
        // 在重试前检查网络状态
        if (attempt > 0) {
          const isOnline = await this.checkNetworkStatus()
          if (!isOnline) {
            throw new Error('Network is offline')
          }
        }

        const result = await operation()
        
        if (attempt > 0) {
          console.log(`✅ ${context} succeeded after ${attempt} retries`)
        }
        
        this.retryCount = 0
        return result
        
      } catch (error) {
        lastError = error as Error
        console.warn(`❌ ${context} failed (attempt ${attempt + 1}):`, error)
        
        if (attempt < this.maxRetries) {
          const delay = this.calculateRetryDelay()
          console.log(`⏳ Waiting ${delay}ms before retry...`)
          await this.sleep(delay)
          this.retryCount++
        }
      }
    }

    console.error(`🔥 ${context} failed after ${this.maxRetries + 1} attempts`)
    throw lastError!
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 获取连接质量信息
  public getConnectionInfo() {
    return {
      isOnline: this.isOnline,
      quality: this.connectionQuality,
      isMobile: this.isMobile,
      lastSuccessfulConnection: this.lastSuccessfulConnection,
      failureStreak: this.failureStreak,
      connectionAttempts: this.connectionAttempts,
      networkInfo: this.networkInfo ? {
        effectiveType: this.networkInfo.effectiveType,
        downlink: this.networkInfo.downlink,
        rtt: this.networkInfo.rtt
      } : null
    }
  }

  // 手动重连
  public async forceReconnect(): Promise<boolean> {
    console.log('🔄 Force reconnection initiated')
    this.retryCount = 0
    this.failureStreak = 0
    
    return await this.retryWithBackoff(
      () => this.checkNetworkStatus(),
      'force reconnection'
    )
  }

  // 监听器管理
  public addNetworkListener(callback: (online: boolean) => void) {
    this.networkListeners.push(callback)
  }

  public removeNetworkListener(callback: (online: boolean) => void) {
    const index = this.networkListeners.indexOf(callback)
    if (index > -1) {
      this.networkListeners.splice(index, 1)
    }
  }

  private notifyListeners(online: boolean) {
    this.networkListeners.forEach(callback => {
      try {
        callback(online)
      } catch (error) {
        console.error('Network listener error:', error)
      }
    })
  }

  // 获取推荐的超时时间
  public getRecommendedTimeout(): number {
    switch (this.connectionQuality) {
      case 'fast': return this.isMobile ? 8000 : 5000
      case 'slow': return this.isMobile ? 20000 : 15000
      case 'offline': return 30000
      default: return 10000
    }
  }

  // 是否应该使用低网速模式
  public shouldUseLowSpeedMode(): boolean {
    return this.connectionQuality === 'slow' || this.isMobile
  }

  /**
   * 使用原生检测器进行网络质量评估
   */
  public async performNativeNetworkCheck(): Promise<boolean> {
    try {
      const quality = await nativeNetworkDetector.measureNetworkQuality()
      
      // 更新连接质量
      if (quality.level === 'offline') {
        this.connectionQuality = 'offline'
        this.isOnline = false
      } else if (quality.score >= 60) {
        this.connectionQuality = 'fast'
        this.isOnline = true
      } else {
        this.connectionQuality = 'slow'
        this.isOnline = true
      }

      // 重置失败计数
      if (this.isOnline) {
        this.failureStreak = 0
        this.lastSuccessfulConnection = Date.now()
      }

      this.notifyListeners(this.isOnline)
      return this.isOnline
    } catch (error) {
      console.warn('Native network check failed:', error)
      return false
    }
  }

  /**
   * 获取5G网络优化建议
   */
  public get5GOptimizationTips(): string[] {
    return nativeNetworkDetector.get5GOptimizationTips()
  }
}

// 全局实例
export const networkManager = new EnhancedNetworkManager()