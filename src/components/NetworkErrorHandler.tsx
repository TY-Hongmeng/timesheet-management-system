import React, { useState, useEffect, useCallback } from 'react'
import { checkNetworkConnection } from '@/lib/supabase'
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react'

interface NetworkErrorHandlerProps {
  children: React.ReactNode
}

const NetworkErrorHandler: React.FC<NetworkErrorHandlerProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastOnlineTime, setLastOnlineTime] = useState(Date.now())
  const [networkCheckTimeout, setNetworkCheckTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [lastCheckAt, setLastCheckAt] = useState(0)
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'ok' | 'fail'>('unknown')

  // 实际网络连接测试
  const testNetworkConnection = useCallback(async () => {
    try {
      if (document.hidden) return navigator.onLine
      if (isChecking) return navigator.onLine
      setIsChecking(true)
      // 只使用浏览器在线状态，避免开发环境HMR引发的资源取消错误
      const online = navigator.onLine
      // 可选：在确认在线时，轻量探测后端
      if (online) {
        const backendOk = await checkNetworkConnection().catch(() => true)
        setBackendStatus(backendOk ? 'ok' : 'fail')
      }
      setIsChecking(false)
      setLastCheckAt(Date.now())
      return online
    } catch {
      setIsChecking(false)
      setLastCheckAt(Date.now())
      return navigator.onLine
    }
  }, [isChecking])

  // 延迟显示离线消息，避免短暂网络波动的误报
  const scheduleOfflineCheck = useCallback(() => {
    if (networkCheckTimeout) {
      clearTimeout(networkCheckTimeout)
    }
    
    const baseDelay = 3000
    const delay = Math.min(baseDelay * Math.pow(2, Math.max(0, retryCount - 1)), 20000)
    const timeout = setTimeout(async () => {
      // 节流：两秒内不重复检测
      if (Date.now() - lastCheckAt < 2000) {
        return
      }
      const isActuallyOnline = await testNetworkConnection()
      if (!isActuallyOnline && !navigator.onLine) {
        setShowOfflineMessage(true)
        
      } else if (isActuallyOnline) {
        setIsOnline(true)
        setShowOfflineMessage(false)
        
      }
    }, delay)
    
    setNetworkCheckTimeout(timeout)
  }, [testNetworkConnection, networkCheckTimeout, lastCheckAt, retryCount])

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
      if (document.hidden) return
      if (Date.now() - lastCheckAt < 2000) return
      if (navigator.onLine) {
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

  const openDiagnostics = () => {
    window.location.hash = '#/diagnostics'
  }

  const clearCaches = async () => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel()
        channel.port1.onmessage = () => {}
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ALL_CACHES' }, [channel.port2])
      }
      const names = await caches.keys()
      await Promise.all(names.map(n => caches.delete(n)))
    } catch {}
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
                onClick={openDiagnostics}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors duration-200"
              >
                打开系统诊断
              </button>
              
              <button
                onClick={handleDismiss}
                className="w-full py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200"
              >
                重试
              </button>
              <button
                onClick={clearCaches}
                className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-green-300 border border-green-400 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />清除缓存
              </button>
            </div>

            <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
              <p>错误详情</p>
              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                <p>状态: 离线</p>
                <p>时间: {new Date().toLocaleString()}</p>
                <p>后端连接: {backendStatus === 'unknown' ? '未知' : backendStatus === 'ok' ? '正常' : '失败'}</p>
              </div>
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
