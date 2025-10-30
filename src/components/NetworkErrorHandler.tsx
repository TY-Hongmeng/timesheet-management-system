import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'

interface NetworkErrorHandlerProps {
  children: React.ReactNode
}

const NetworkErrorHandler: React.FC<NetworkErrorHandlerProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineMessage(false)
      setRetryCount(0)
      console.log('🌐 网络连接已恢复')
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineMessage(true)
      console.log('📡 网络连接已断开')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 检查初始网络状态
    if (!navigator.onLine) {
      setShowOfflineMessage(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    window.location.reload()
  }

  const handleDismiss = () => {
    setShowOfflineMessage(false)
  }

  if (!isOnline && showOfflineMessage) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-900 border border-red-400 rounded-lg p-8 shadow-lg shadow-red-400/20">
            <div className="mb-6">
              <WifiOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-400 mb-2 font-mono">
                网络连接中断
              </h2>
              <p className="text-red-300 font-mono">
                无法连接到服务器，请检查您的网络连接
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleRetry}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors duration-200 font-mono flex items-center justify-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                重试连接 {retryCount > 0 && `(${retryCount})`}
              </button>
              
              <button
                onClick={handleDismiss}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-mono rounded-lg transition-colors duration-200"
              >
                继续离线使用
              </button>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>离线模式下部分功能可能不可用</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {children}
      {/* 网络状态指示器 */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 bg-red-900 border border-red-400 rounded-lg p-3 shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="text-red-300 text-sm font-mono">离线模式</span>
          </div>
        </div>
      )}
    </>
  )
}

export default NetworkErrorHandler