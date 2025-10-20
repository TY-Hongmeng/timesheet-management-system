import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

interface MobileLoadingSpinnerProps {
  message?: string
  showRetry?: boolean
  onRetry?: () => void
}

export default function MobileLoadingSpinner({ 
  message = '正在加载...', 
  showRetry = false, 
  onRetry 
}: MobileLoadingSpinnerProps) {
  const [loadingText, setLoadingText] = useState(message)
  const [showRetryButton, setShowRetryButton] = useState(showRetry)
  const [isSlowConnection, setIsSlowConnection] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // 检测网络连接类型
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection

    if (connection) {
      const slowTypes = ['slow-2g', '2g', '3g']
      setIsSlowConnection(slowTypes.includes(connection.effectiveType))
    }

    // 模拟加载进度
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 500)

    // 加载超时处理
    const timer1 = setTimeout(() => {
      setLoadingText('加载时间较长，请稍候...')
      setProgress(60)
    }, 3000)

    const timer2 = setTimeout(() => {
      setLoadingText('网络较慢，正在努力加载...')
      setProgress(80)
    }, 8000)

    const timer3 = setTimeout(() => {
      setShowRetryButton(true)
      setLoadingText('加载超时，请检查网络连接')
      setProgress(90)
    }, 15000)

    return () => {
      clearInterval(progressTimer)
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [])

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-4">
      {/* 主加载区域 */}
      <div className="text-center max-w-sm w-full">
        {/* 加载动画 */}
        <div className="relative mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          {isSlowConnection && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <WifiOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* 加载文本 */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2">工时管理系统</h2>
        <p className="text-gray-600 mb-6 text-base">{loadingText}</p>

        {/* 进度条 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* 网络状态提示 */}
        {isSlowConnection && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4 text-orange-600" />
              <p className="text-orange-700 text-sm">
                检测到网络连接较慢，加载可能需要更长时间
              </p>
            </div>
          </div>
        )}

        {/* 重试按钮 */}
        {showRetryButton && (
          <div className="space-y-4">
            <button
              onClick={handleRetry}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>重新加载</span>
            </button>
            <p className="text-gray-500 text-sm">
              如果问题持续存在，请检查网络连接或稍后再试
            </p>
          </div>
        )}

        {/* 加载提示 */}
        {!showRetryButton && (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2 text-gray-500 text-sm">
              <Wifi className="w-4 h-4" />
              <span>正在优化移动端体验...</span>
            </div>
            {isSlowConnection && (
              <p className="text-xs text-gray-400">
                为了更好的体验，我们正在压缩数据传输
              </p>
            )}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="absolute bottom-8 left-4 right-4 text-center">
        <p className="text-xs text-gray-400">
          首次加载可能需要较长时间，后续访问会更快
        </p>
      </div>
    </div>
  )
}