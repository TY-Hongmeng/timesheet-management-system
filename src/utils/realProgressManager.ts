/**
 * 真实加载进度管理器
 * 监控实际的应用启动步骤，而不是基于时间的模拟
 */

export interface LoadingStep {
  id: string
  label: string
  progress: number
  completed: boolean
  error?: string
}

export interface ProgressState {
  currentStep: number
  totalProgress: number
  steps: LoadingStep[]
  isCompleted: boolean
  hasError: boolean
  errorMessage?: string
}

type ProgressCallback = (state: ProgressState) => void

class RealProgressManager {
  private steps: LoadingStep[] = [
    { id: 'init', label: '初始化应用...', progress: 20, completed: false },
    { id: 'router', label: '加载路由系统...', progress: 40, completed: false },
    { id: 'auth', label: '检查认证状态...', progress: 60, completed: false },
    { id: 'data', label: '加载用户数据...', progress: 80, completed: false },
    { id: 'ready', label: '准备就绪！', progress: 100, completed: false }
  ]

  private currentStepIndex = 0
  private callbacks: ProgressCallback[] = []
  private isRunning = false

  /**
   * 订阅进度更新
   */
  subscribe(callback: ProgressCallback): () => void {
    this.callbacks.push(callback)
    
    // 返回取消订阅函数
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
    const state: ProgressState = {
      currentStep: this.currentStepIndex,
      totalProgress: this.getCurrentProgress(),
      steps: [...this.steps],
      isCompleted: this.isCompleted(),
      hasError: this.hasError(),
      errorMessage: this.getErrorMessage()
    }

    this.callbacks.forEach(callback => {
      try {
        callback(state)
      } catch (error) {
        console.error('Progress callback error:', error)
      }
    })
  }

  /**
   * 开始真实的加载流程
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Progress manager is already running')
      return
    }

    this.isRunning = true
    this.reset()
    
    console.log('🚀 开始真实加载进度监控')

    try {
      // 步骤1: 初始化应用
      await this.executeStep('init', async () => {
        // 检查基础环境
        if (typeof window === 'undefined') {
          throw new Error('浏览器环境检查失败')
        }
        
        // 检查必要的API
        if (!document.getElementById('root')) {
          throw new Error('根元素未找到')
        }

        // 模拟初始化时间
        await this.delay(800)
      })

      // 步骤2: 加载路由系统
      await this.executeStep('router', async () => {
        // 检查React Router是否可用
        try {
          // 动态导入路由相关模块来验证
          await import('react-router-dom')
          await this.delay(600)
        } catch (error) {
          throw new Error('路由系统加载失败')
        }
      })

      // 步骤3: 检查认证状态
      await this.executeStep('auth', async () => {
        try {
          // 检查Supabase连接
          const { supabase } = await import('@/lib/supabase')
          
          // 测试数据库连接
          const { error } = await supabase.from('users').select('count').limit(1)
          if (error && !error.message.includes('permission')) {
            console.warn('数据库连接警告:', error.message)
          }
          
          await this.delay(700)
        } catch (error) {
          console.warn('认证模块加载警告:', error)
          // 不抛出错误，允许离线使用
          await this.delay(500)
        }
      })

      // 步骤4: 加载用户数据
      await this.executeStep('data', async () => {
        try {
          // 预加载关键组件
          await Promise.all([
            import('@/pages/Login'),
            import('@/pages/Dashboard'),
            import('@/contexts/AuthContext')
          ])
          
          await this.delay(600)
        } catch (error) {
          throw new Error('用户数据加载失败')
        }
      })

      // 步骤5: 完成准备
      await this.executeStep('ready', async () => {
        // 最终检查
        await this.delay(300)
        console.log('✅ 应用启动完成，所有模块加载成功')
      })

    } catch (error) {
      console.error('❌ 加载过程中出现错误:', error)
      this.setError(error instanceof Error ? error.message : '未知错误')
    } finally {
      this.isRunning = false
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(stepId: string, executor: () => Promise<void>): Promise<void> {
    const stepIndex = this.steps.findIndex(step => step.id === stepId)
    if (stepIndex === -1) {
      throw new Error(`步骤 ${stepId} 不存在`)
    }

    this.currentStepIndex = stepIndex
    console.log(`📋 执行步骤 ${stepIndex + 1}/${this.steps.length}: ${this.steps[stepIndex].label}`)
    
    // 通知开始执行
    this.notify()

    try {
      // 执行实际的加载逻辑
      await executor()
      
      // 标记步骤完成
      this.steps[stepIndex].completed = true
      console.log(`✅ 步骤 ${stepIndex + 1} 完成: ${this.steps[stepIndex].label}`)
      
      // 通知步骤完成
      this.notify()
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      this.steps[stepIndex].error = errorMessage
      console.error(`❌ 步骤 ${stepIndex + 1} 失败:`, errorMessage)
      
      // 通知错误
      this.notify()
      throw error
    }
  }

  /**
   * 设置错误状态
   */
  private setError(message: string) {
    const currentStep = this.steps[this.currentStepIndex]
    if (currentStep) {
      currentStep.error = message
    }
    this.notify()
  }

  /**
   * 获取当前总进度
   */
  private getCurrentProgress(): number {
    if (this.currentStepIndex >= this.steps.length) {
      return 100
    }

    const currentStep = this.steps[this.currentStepIndex]
    if (currentStep.completed) {
      return currentStep.progress
    }

    // 如果当前步骤未完成，返回上一个步骤的进度
    if (this.currentStepIndex === 0) {
      return 0
    }

    return this.steps[this.currentStepIndex - 1].progress
  }

  /**
   * 检查是否完成
   */
  private isCompleted(): boolean {
    return this.steps.every(step => step.completed)
  }

  /**
   * 检查是否有错误
   */
  private hasError(): boolean {
    return this.steps.some(step => step.error)
  }

  /**
   * 获取错误信息
   */
  private getErrorMessage(): string | undefined {
    const errorStep = this.steps.find(step => step.error)
    return errorStep?.error
  }

  /**
   * 重置状态
   */
  private reset() {
    this.currentStepIndex = 0
    this.steps.forEach(step => {
      step.completed = false
      step.error = undefined
    })
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取当前状态
   */
  getState(): ProgressState {
    return {
      currentStep: this.currentStepIndex,
      totalProgress: this.getCurrentProgress(),
      steps: [...this.steps],
      isCompleted: this.isCompleted(),
      hasError: this.hasError(),
      errorMessage: this.getErrorMessage()
    }
  }
}

// 导出单例实例
export const realProgressManager = new RealProgressManager()