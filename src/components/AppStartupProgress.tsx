import React, { useState, useEffect } from 'react'
import { Loader2, Smartphone, Wifi, CheckCircle, AlertTriangle, Router, Database, User } from 'lucide-react'
import { performanceMonitor } from '@/utils/performanceMonitor'
import { smoothProgressManager, type SmoothProgressState } from '@/utils/smoothProgressManager'
import { progressBridge } from '@/utils/progressBridge'

interface AppStartupProgressProps {
  onComplete?: () => void
  isVisible?: boolean
}

const AppStartupProgress: React.FC<AppStartupProgressProps> = ({ 
  onComplete, 
  isVisible = true 
}) => {
  const [progressState, setProgressState] = useState<SmoothProgressState>({
    progress: 0,
    isCompleted: false,
    hasError: false,
    errorMessage: undefined,
    currentPhase: '准备启动...'
  })
   const [networkSpeed, setNetworkSpeed] = useState<'fast' | 'slow' | 'offline'>('fast')

  // 根据进度获取对应的图标
  const getCurrentIcon = () => {
    if (progressState.hasError) {
      return <AlertTriangle className="w-6 h-6 text-red-400" />
    }
    
    if (progressState.isCompleted) {
      return <CheckCircle className="w-6 h-6 text-green-400" />
    }
    
    // 根据进度显示不同图标
    if (progressState.progress < 30) {
      return <Smartphone className="w-6 h-6 text-green-400" />
    } else if (progressState.progress < 70) {
      return <Router className="w-6 h-6 text-green-400" />
    } else {
      return <Database className="w-6 h-6 text-green-400" />
    }
  }

  useEffect(() => {
    if (!isVisible) return

    console.log('🎯 启动丝滑进度监控')
    performanceMonitor.startTiming('app_startup')

    // 注册React进度回调到桥接器
    progressBridge.setReactProgressCallback((progress, phase) => {
      console.log('⚛️ React进度回调被调用:', progress, phase)
      setProgressState(prev => ({
        ...prev,
        progress: Math.round(progress),
        currentPhase: phase
      }))
    })

    // 订阅进度更新
    const unsubscribe = smoothProgressManager.subscribe((state) => {
      setProgressState(state)
      
      // 当进度完成时
      if (state.isCompleted && !state.hasError) {
        console.log('✅ 丝滑进度完成，准备切换到主应用')
        performanceMonitor.endTiming('app_startup')
        
        setTimeout(() => {
          progressBridge.complete() // 完成所有进度条
          onComplete?.()
        }, 300) // 减少延迟
      }
    })

    // 启动进度监控 - 只有在还没有运行时才启动
    if (!smoothProgressManager.getIsRunning()) {
      console.log('🚀 启动smoothProgressManager')
      smoothProgressManager.start().then(() => {
        console.log('✅ 丝滑加载完成')
      })
    } else {
      console.log('⚠️ smoothProgressManager已经在运行')
    }

    return () => {
      unsubscribe()
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  const currentIcon = getCurrentIcon()

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
          {/* 当前阶段显示 */}
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0 mr-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                progressState.hasError ? 'bg-red-700' : 'bg-gray-700'
              }`}>
                {currentIcon}
              </div>
            </div>
            <div className="flex-1">
              <p className={`font-medium font-mono ${
                progressState.hasError ? 'text-red-400' : 'text-green-400'
              }`}>
                {progressState.currentPhase}
              </p>
              <p className="text-green-300 text-sm font-mono mt-1">
                {progressState.progress}% 完成
              </p>
              {progressState.hasError && progressState.errorMessage && (
                <p className="text-red-300 text-xs font-mono mt-1">
                  错误: {progressState.errorMessage}
                </p>
              )}
            </div>
          </div>

          {/* 丝滑进度条 */}
          <div className="mb-6">
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-500 ease-out relative ${
                  progressState.hasError 
                    ? 'bg-gradient-to-r from-red-500 to-red-400' 
                    : 'bg-gradient-to-r from-green-500 to-green-400'
                }`}
                style={{ 
                  width: `${progressState.progress}%`,
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {/* 流动光效 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-300 to-transparent opacity-20 animate-ping"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-green-300 font-mono mt-2">
              <span>进度</span>
              <span>{progressState.progress}%</span>
            </div>
          </div>

          {/* 丝滑加载指示 */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
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