import React, { useState, useEffect, useCallback } from 'react'
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'

interface NetworkErrorHandlerProps {
  children: React.ReactNode
}

const NetworkErrorHandler: React.FC<NetworkErrorHandlerProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastOnlineTime, setLastOnlineTime] = useState(Date.now())
  const [networkCheckTimeout, setNetworkCheckTimeout] = useState<NodeJS.Timeout | null>(null)

  // 实际网络连接测试
  const testNetworkConnection = useCallback(async () => {
    try {
      // 使用navigator.onLine作为主要的网络状态检测方法
      // 这是最可靠且不会产生网络请求错误的方法
      return navigator.onLine
    } catch (error) {
      console.warn('网络连接测试失败:', error)
      // 如果测试失败，默认认为在线
      return true
    }
  }, [])

  // 延迟显示离线消息，避免短暂网络波动的误报
  const scheduleOfflineCheck = useCallback(() => {
    if (networkCheckTimeout) {
      clearTimeout(networkCheckTimeout)
    }
    
    const timeout = setTimeout(async () => {
      const isActuallyOnline = await testNetworkConnection()
      if (!isActuallyOnline && !navigator.onLine) {
        setShowOfflineMessage(true)
        console.log('📡 确认网络连接已断开')
      } else if (isActuallyOnline) {
        setIsOnline(true)
        setShowOfflineMessage(false)
        console.log('🌐 网络连接正常')
      }
    }, 3000) // 3秒延迟，避免短暂断网的误报
    
    setNetworkCheckTimeout(timeout)
  }, [testNetworkConnection, networkCheckTimeout])

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      setShowOfflineMessage(false)
      setRetryCount(0)
      setLastOnlineTime(Date.now())
      
      if (networkCheckTimeout) {
        clearTimeout(networkCheckTimeout)
        setNetworkCheckTimeout(null)
      }
      
      // 双重确认网络连接
      const isActuallyOnline = await testNetworkConnection()
      if (isActuallyOnline) {
        console.log('🌐 网络连接已恢复')
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('📡 检测到网络状态变化，正在验证...')
      
      // 不立即显示离线消息，而是延迟检查
      scheduleOfflineCheck()
    }

    // 页面可见性变化时重新检查网络状态
    const handleVisibilityChange = async () => {
      if (!document.hidden && navigator.onLine) {
        const isActuallyOnline = await testNetworkConnection()
        if (!isActuallyOnline) {
          setIsOnline(false)
          scheduleOfflineCheck()
        }
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 初始网络状态检查 - 延迟执行避免页面加载时的误报
    const initialCheck = setTimeout(async () => {
      if (!navigator.onLine) {
        const isActuallyOnline = await testNetworkConnection()
        if (!isActuallyOnline) {
          scheduleOfflineCheck()
        }
      }
    }, 2000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      if (networkCheckTimeout) {
        clearTimeout(networkCheckTimeout)
      }
      clearTimeout(initialCheck)
    }
  }, [scheduleOfflineCheck, testNetworkConnection, networkCheckTimeout])

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1)
    
    // 先测试网络连接
    const isActuallyOnline = await testNetworkConnection()
    if (isActuallyOnline) {
      setIsOnline(true)
      setShowOfflineMessage(false)
      setRetryCount(0)
      console.log('🌐 网络连接已恢复，无需重新加载')
    } else {
      // 只有在确认网络仍然有问题时才重新加载
      if (retryCount >= 2) {
        window.location.reload()
      } else {
        console.log('🔄 重试网络连接...')
        setTimeout(() => {
          scheduleOfflineCheck()
        }, 1000)
      }
    }
  }

  const handleDismiss = () => {
    setShowOfflineMessage(false)
    setLastOnlineTime(Date.now())
  }

  // 只有在确认离线且显示消息时才显示错误页面
  if (!isOnline && showOfflineMessage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-8 shadow-lg">
            <div className="mb-6">
              <WifiOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                网络错误
              </h2>
              <p className="text-red-600 dark:text-red-300">
                网络连接出现问题，请检查网络后重试
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleRetry}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                重新连接 {retryCount > 0 && `(${retryCount})`}
              </button>
              
              <button
                onClick={handleDismiss}
                className="w-full py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200"
              >
                重试
              </button>
            </div>

            <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
              <p>错误详情</p>
              <details className="mt-2 text-left">
                <summary className="cursor-pointer text-gray-600 dark:text-gray-300">
                  ▼ 错误详情
                </summary>
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                  <p>模块: https://ty-hongmeng.github.io/timesheet-management-system/assets/index-mCFu98em.js</p>
                  <p>错误: Loading chunk 2 failed.</p>
                  <p>时间: {new Date().toLocaleString()}</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {children}
      {/* 网络状态指示器 - 只在确认离线时显示 */}
      {!isOnline && !showOfflineMessage && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-yellow-800 dark:text-yellow-200 text-sm">检查网络中...</span>
          </div>
        </div>
      )}
    </>
  )
}

export default NetworkErrorHandler