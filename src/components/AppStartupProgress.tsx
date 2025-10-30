import React, { useState, useEffect } from 'react'
import { Loader2, Smartphone, Wifi, CheckCircle, AlertTriangle, Router, Database, User } from 'lucide-react'
import { performanceMonitor } from '@/utils/performanceMonitor'
import { realProgressManager, type ProgressState } from '@/utils/realProgressManager'

interface AppStartupProgressProps {
  onComplete?: () => void
  isVisible?: boolean
}

const AppStartupProgress: React.FC<AppStartupProgressProps> = ({ 
  onComplete, 
  isVisible = true 
}) => {
  const [progressState, setProgressState] = useState<ProgressState>({
    currentStep: 0,
    totalProgress: 0,
    steps: [],
    isCompleted: false,
    hasError: false
  })
  const [networkSpeed, setNetworkSpeed] = useState<'fast' | 'slow' | 'offline'>('fast')

  // 根据步骤ID获取对应的图标
  const getStepIcon = (stepId: string, hasError: boolean = false) => {
    if (hasError) {
      return <AlertTriangle className="w-6 h-6 text-red-400" />
    }

    switch (stepId) {
      case 'init':
        return <Smartphone className="w-6 h-6" />
      case 'router':
        return <Router className="w-6 h-6" />
      case 'auth':
        return networkSpeed === 'offline' ? 
          <AlertTriangle className="w-6 h-6 text-yellow-400" /> : 
          <Database className="w-6 h-6" />
      case 'data':
        return <User className="w-6 h-6" />
      case 'ready':
        return <CheckCircle className="w-6 h-6 text-green-400" />
      default:
        return <Loader2 className="w-6 h-6 animate-spin" />
    }
  }

  useEffect(() => {
    if (!isVisible) return

    console.log('🚀 AppStartupProgress 开始真实进度监控')

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

    // 订阅真实进度管理器
    const unsubscribe = realProgressManager.subscribe((state: ProgressState) => {
      setProgressState(state)
      
      // 当进度完成时，触发完成回调
      if (state.isCompleted) {
        console.log('✅ 真实进度完成，准备切换到主应用')
        performanceMonitor.endTiming('app_startup')
        setTimeout(() => {
          onComplete?.()
        }, 1000)
      }
    })

    // 启动真实的加载流程
    realProgressManager.start().catch((error) => {
      console.error('❌ 真实进度管理器启动失败:', error)
      // 即使出错也要完成启动
      setTimeout(() => {
        onComplete?.()
      }, 2000)
    })

    return () => {
      unsubscribe()
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  const currentStepData = progressState.steps[progressState.currentStep]
  const currentStepIcon = currentStepData ? getStepIcon(currentStepData.id, !!currentStepData.error) : <Loader2 className="w-6 h-6 animate-spin" />

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
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                currentStepData?.error ? 'bg-red-700' : 'bg-gray-700'
              }`}>
                {currentStepIcon}
              </div>
            </div>
            <div className="flex-1">
              <p className={`font-medium font-mono ${
                currentStepData?.error ? 'text-red-400' : 'text-green-400'
              }`}>
                {currentStepData?.label || '准备中...'}
              </p>
              <p className="text-green-300 text-sm font-mono mt-1">
                {Math.round(progressState.totalProgress)}% 完成
              </p>
              {currentStepData?.error && (
                <p className="text-red-300 text-xs font-mono mt-1">
                  错误: {currentStepData.error}
                </p>
              )}
            </div>
          </div>

          {/* 进度条 */}
          <div className="mb-6">
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-300 ease-out relative ${
                  progressState.hasError 
                    ? 'bg-gradient-to-r from-red-500 to-red-600' 
                    : 'bg-gradient-to-r from-green-500 to-green-600'
                }`}
                style={{ width: `${progressState.totalProgress}%` }}
              >
                {/* 进度条光效 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-green-300 text-sm font-mono">{Math.round(progressState.totalProgress)}%</span>
              <span className="text-green-300 text-sm font-mono">
                {progressState.currentStep + 1} / {progressState.steps.length}
              </span>
            </div>
          </div>

          {/* 步骤指示器 */}
          <div className="flex justify-center space-x-2 mb-6">
            {progressState.steps.map((step, index) => (
              <div
                key={step.id}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  step.error
                    ? 'bg-red-400'
                    : step.completed
                    ? 'bg-green-400'
                    : index === progressState.currentStep
                    ? 'bg-green-500 ring-2 ring-green-400 ring-opacity-50'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* 错误状态显示 */}
          {progressState.hasError && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
                <div>
                  <p className="text-red-400 font-medium font-mono">加载失败</p>
                  <p className="text-red-300 text-sm font-mono mt-1">{progressState.errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* 移动端友好提示 */}
          <div className="mt-6 text-center">
            {progressState.hasError ? (
              <div className="text-yellow-400">
                <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
                <p className="text-xs font-mono">{progressState.errorMessage}</p>
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
      {progressState.isCompleted && (
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