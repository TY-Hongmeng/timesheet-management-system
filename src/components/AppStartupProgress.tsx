import React, { useState, useEffect } from 'react'
import { Loader2, Smartphone, Wifi, CheckCircle, AlertTriangle } from 'lucide-react'
import { performanceMonitor } from '@/utils/performanceMonitor'

interface AppStartupProgressProps {
  onComplete?: () => void
  isVisible?: boolean
}

interface ProgressStep {
  id: string
  label: string
  icon: React.ReactNode
  duration: number
  progress: number
}

const AppStartupProgress: React.FC<AppStartupProgressProps> = ({ 
  onComplete, 
  isVisible = true 
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [networkSpeed, setNetworkSpeed] = useState<'fast' | 'slow' | 'offline'>('fast')

  // 根据网络速度调整步骤时长
  const getStepDuration = (baseDuration: number) => {
    switch (networkSpeed) {
      case 'slow': return baseDuration * 1.5
      case 'offline': return baseDuration * 2
      default: return baseDuration
    }
  }

  const steps: ProgressStep[] = [
    {
      id: 'init',
      label: '初始化应用...',
      icon: <Smartphone className="w-6 h-6" />,
      duration: getStepDuration(1200),
      progress: 20
    },
    {
      id: 'network',
      label: networkSpeed === 'offline' ? '检测到离线模式...' : '检查网络连接...',
      icon: networkSpeed === 'offline' ? <AlertTriangle className="w-6 h-6 text-yellow-400" /> : <Wifi className="w-6 h-6" />,
      duration: getStepDuration(1000),
      progress: 40
    },
    {
      id: 'auth',
      label: '加载认证模块...',
      icon: <Loader2 className="w-6 h-6 animate-spin" />,
      duration: getStepDuration(1200),
      progress: 65
    },
    {
      id: 'ui',
      label: '加载用户界面...',
      icon: <Loader2 className="w-6 h-6 animate-spin" />,
      duration: getStepDuration(1300),
      progress: 90
    },
    {
      id: 'ready',
      label: '准备就绪！',
      icon: <CheckCircle className="w-6 h-6 text-green-400" />,
      duration: getStepDuration(800),
      progress: 100
    }
  ]

  useEffect(() => {
    if (!isVisible) return

    console.log('🚀 AppStartupProgress 开始初始化')

    // 开始性能监控
    performanceMonitor.startTiming('app_startup')
    performanceMonitor.recordNetworkInfo()

    // 检测网络状态
    const checkNetworkSpeed = () => {
      if (!navigator.onLine) {
        setNetworkSpeed('offline')
        return
      }

      // 简单的网络速度检测
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      if (connection) {
        const effectiveType = connection.effectiveType
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setNetworkSpeed('slow')
        } else if (effectiveType === '3g') {
          setNetworkSpeed('slow')
        } else {
          setNetworkSpeed('fast')
        }
      }
    }

    checkNetworkSpeed()

    let timeoutId: NodeJS.Timeout
    let intervalId: NodeJS.Timeout

    const runStep = (stepIndex: number) => {
      if (stepIndex >= steps.length) {
        console.log('✅ 所有步骤完成，准备切换到主应用')
        setIsCompleted(true)
        performanceMonitor.endTiming('app_startup')
        setTimeout(() => {
          onComplete?.()
        }, 1000) // 增加完成动画显示时间
        return
      }

      const step = steps[stepIndex]
      setCurrentStep(stepIndex)
      
      console.log(`📋 执行步骤 ${stepIndex + 1}/${steps.length}: ${step.label}`)
      
      // 记录每个步骤的性能
      performanceMonitor.startTiming(`startup_step_${step.id}`)
      
      // 平滑进度动画 - 修复进度计算
      const startProgress = stepIndex === 0 ? 0 : steps[stepIndex - 1].progress
      const targetProgress = step.progress
      const totalSteps = Math.ceil(step.duration / 50) // 每50ms更新一次
      const progressIncrement = (targetProgress - startProgress) / totalSteps
      
      let currentProgressValue = startProgress
      let stepCount = 0
      
      // 立即设置起始进度
      setProgress(startProgress)
      console.log(`📊 进度: ${startProgress}% -> ${targetProgress}%`)
      
      intervalId = setInterval(() => {
        stepCount++
        currentProgressValue = startProgress + (progressIncrement * stepCount)
        
        if (currentProgressValue >= targetProgress || stepCount >= totalSteps) {
          currentProgressValue = targetProgress
          clearInterval(intervalId)
        }
        
        setProgress(Math.min(currentProgressValue, targetProgress))
      }, 50)

      timeoutId = setTimeout(() => {
        clearInterval(intervalId)
        setProgress(targetProgress)
        performanceMonitor.endTiming(`startup_step_${step.id}`)
        console.log(`✅ 步骤 ${stepIndex + 1} 完成: ${targetProgress}%`)
        
        // 在步骤之间添加短暂停顿，让用户看到进度变化
        setTimeout(() => {
          runStep(stepIndex + 1)
        }, 300) // 增加步骤间停顿时间
      }, step.duration)
    }

    // 添加初始延迟，确保组件完全渲染后再开始
    const startDelay = setTimeout(() => {
      try {
        console.log('🎯 开始执行进度步骤')
        runStep(0)
      } catch (error) {
        console.error('启动进度出错:', error)
        setHasError(true)
        setErrorMessage('应用启动过程中出现错误，正在尝试恢复...')
        performanceMonitor.endTiming('app_startup')
        
        // 延迟后仍然完成启动
        setTimeout(() => {
          onComplete?.()
        }, 2000)
      }
    }, 500) // 初始延迟500ms

    return () => {
      clearTimeout(startDelay)
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [isVisible, onComplete, networkSpeed])

  if (!isVisible) return null

  const currentStepData = steps[currentStep]

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* 背景动画 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        {/* Logo区域 */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-green-400 mb-2 font-mono">工时管理系统</h1>
          <p className="text-green-300 text-sm font-mono">正在为您准备最佳体验</p>
        </div>

        {/* 进度条容器 */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          {/* 当前步骤显示 */}
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0 mr-4">
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                {currentStepData?.icon}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-green-400 font-medium font-mono">
                {currentStepData?.label}
              </p>
              <p className="text-green-300 text-sm font-mono mt-1">
                {Math.round(progress)}% 完成
              </p>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mb-6">
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                {/* 进度条光效 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-green-300 text-sm font-mono">{Math.round(progress)}%</span>
              <span className="text-green-300 text-sm font-mono">
                {currentStep + 1} / {steps.length}
              </span>
            </div>
          </div>

          {/* 步骤指示器 */}
          <div className="flex justify-center space-x-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index <= currentStep 
                    ? 'bg-green-500 shadow-lg shadow-green-500/50'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* 移动端友好提示 */}
          <div className="mt-6 text-center">
            {hasError ? (
              <div className="text-yellow-400">
                <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
                <p className="text-xs font-mono">{errorMessage}</p>
              </div>
            ) : (
              <>
                <p className="text-green-500 text-xs font-mono">
                  正在为您准备最佳体验，请稍候...
                </p>
                <p className="text-gray-600 text-xs font-mono mt-1">
                  {networkSpeed === 'slow' && '网络较慢，加载时间可能稍长'}
                  {networkSpeed === 'offline' && '离线模式，使用缓存数据'}
                  {networkSpeed === 'fast' && '首次加载可能需要几秒钟'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-xs font-mono">
            如果加载时间过长，请检查网络连接
          </p>
        </div>
      </div>

      {/* 完成动画 */}
      {isCompleted && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4 animate-bounce" />
            <p className="text-white text-xl font-bold font-mono">启动完成！</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppStartupProgress