/**
 * 丝滑进度管理器 - 优化版
 * 消除白屏，实现连续流畅的进度动画
 */

export interface SmoothProgressState {
  progress: number // 0-100 的连续进度
  isCompleted: boolean
  hasError: boolean
  errorMessage?: string
  currentPhase: string // 当前阶段描述
}

export type ProgressCallback = (state: SmoothProgressState) => void

class SmoothProgressManager {
  private callbacks: ProgressCallback[] = []
  private isRunning = false
  private currentProgress = 0
  private targetProgress = 0
  private animationId: number | null = null
  private currentPhase = '准备启动...'
  private hasError = false
  private errorMessage?: string

  /**
   * 订阅进度更新
   */
  subscribe(callback: ProgressCallback): () => void {
    this.callbacks.push(callback)
    
    // 立即通知当前状态
    callback(this.getState())
    
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  /**
   * 通知所有订阅者
   */
  private notify() {
    const state = this.getState()
    this.callbacks.forEach(callback => {
      try {
        callback(state)
      } catch (error) {
        console.error('Progress callback error:', error)
      }
    })
  }

  /**
   * 检查是否正在运行
   */
  getIsRunning(): boolean {
    return this.isRunning
  }

  /**
   * 开始丝滑进度
   */

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Smooth progress manager is already running')
      return
    }

    this.isRunning = true
    this.reset()
    
    console.log('🚀 开始丝滑加载进度')

    try {
      // 立即开始动画，避免白屏
      this.startSmoothAnimation()
      
      // 快速启动阶段 (0-30%)
      this.updatePhase('初始化应用...')
      await this.smoothProgressTo(30, 800)
      
      // 并行处理多个任务 (30-70%)
      this.updatePhase('加载核心模块...')
      await Promise.all([
        this.loadRouterSystem(),
        this.checkAuthSystem(),
        this.preloadComponents()
      ])
      await this.smoothProgressTo(70, 600)
      
      // 最终准备 (70-100%)
      this.updatePhase('准备就绪...')
      await this.smoothProgressTo(100, 500)
      
      console.log('✅ 丝滑加载完成')
      
    } catch (error) {
      console.error('❌ 加载过程中出现错误:', error)
      this.setError(error instanceof Error ? error.message : '加载失败')
    } finally {
      this.isRunning = false
    }
  }

  /**
   * 启动平滑动画
   */
  private startSmoothAnimation() {
    const animate = () => {
      if (this.currentProgress < this.targetProgress) {
        // 平滑增长算法
        const diff = this.targetProgress - this.currentProgress
        const increment = Math.max(0.5, diff * 0.1) // 自适应增长速度
        
        this.currentProgress = Math.min(
          this.targetProgress, 
          this.currentProgress + increment
        )
        
        this.notify()
      }
      
      if (this.isRunning && this.currentProgress < 100) {
        this.animationId = requestAnimationFrame(animate)
      } else if (this.currentProgress >= 100) {
        // 完成动画
        setTimeout(() => {
          this.notify()
        }, 200)
      }
    }
    
    this.animationId = requestAnimationFrame(animate)
  }

  /**
   * 平滑进度到目标值
   */
  private async smoothProgressTo(target: number, duration: number): Promise<void> {
    this.targetProgress = target
    
    return new Promise(resolve => {
      const checkComplete = () => {
        if (Math.abs(this.currentProgress - target) < 1) {
          resolve()
        } else {
          setTimeout(checkComplete, 50)
        }
      }
      
      // 设置最大等待时间
      setTimeout(() => {
        this.currentProgress = target
        this.notify()
        resolve()
      }, duration)
      
      checkComplete()
    })
  }

  /**
   * 更新当前阶段
   */
  private updatePhase(phase: string) {
    this.currentPhase = phase
    this.notify()
  }

  /**
   * 加载路由系统 (轻量化)
   */
  private async loadRouterSystem(): Promise<void> {
    try {
      // 简化检查，只验证基本可用性
      if (typeof window !== 'undefined' && window.location) {
        await this.delay(200) // 减少延迟
      }
    } catch (error) {
      console.warn('路由系统检查警告:', error)
    }
  }

  /**
   * 检查认证系统 (轻量化)
   */
  private async checkAuthSystem(): Promise<void> {
    try {
      // 异步检查，不阻塞主流程
      const checkAuth = async () => {
        try {
          const { supabase } = await import('@/lib/supabase')
          // 简单的连接测试，不等待结果
          supabase.from('users').select('count').limit(1)
        } catch (error) {
          console.warn('认证系统检查警告:', error)
        }
      }
      
      // 不等待认证检查完成
      checkAuth()
      await this.delay(150)
      
    } catch (error) {
      console.warn('认证系统加载警告:', error)
    }
  }

  /**
   * 预加载组件 (轻量化)
   */
  private async preloadComponents(): Promise<void> {
    try {
      // 异步预加载，不阻塞主流程
      const preload = async () => {
        try {
          await Promise.all([
            import('@/pages/Login'),
            import('@/contexts/AuthContext')
          ])
        } catch (error) {
          console.warn('组件预加载警告:', error)
        }
      }
      
      // 不等待预加载完成
      preload()
      await this.delay(100)
      
    } catch (error) {
      console.warn('组件预加载失败:', error)
    }
  }

  /**
   * 设置错误状态
   */
  private setError(message: string) {
    this.hasError = true
    this.errorMessage = message
    this.notify()
  }

  /**
   * 获取当前状态
   */
  getState(): SmoothProgressState {
    return {
      progress: Math.round(this.currentProgress),
      isCompleted: this.currentProgress >= 100,
      hasError: this.hasError,
      errorMessage: this.errorMessage,
      currentPhase: this.currentPhase
    }
  }

  /**
   * 重置状态
   */
  private reset() {
    this.currentProgress = 0
    this.targetProgress = 0
    this.currentPhase = '准备启动...'
    this.hasError = false
    this.errorMessage = undefined
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 导出单例实例
export const smoothProgressManager = new SmoothProgressManager()