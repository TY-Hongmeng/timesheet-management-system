import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react'

interface NetworkStatusProps {
  onRetry?: () => void
  showRetryButton?: boolean
}

export default function NetworkStatus({ onRetry, showRetryButton = false }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowNotification(true)
    }

    const updateConnectionInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          setConnectionType(connection.effectiveType || 'unknown')
        }
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // 监听网络变化
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', updateConnectionInfo)
        updateConnectionInfo()
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          connection.removeEventListener('change', updateConnectionInfo)
        }
      }
    }
  }, [])

  if (!showNotification && isOnline) {
    return null
  }

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      showNotification ? 'translate-y-0 opacity-100' : 'translate-y-[-100px] opacity-0'
    }`}>
      <div className={`rounded-lg shadow-lg p-4 max-w-sm ${
        isOnline 
          ? 'bg-green-50 border border-green-200 text-green-800' 
          : 'bg-red-50 border border-red-200 text-red-800'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isOnline ? '网络已连接' : '网络连接断开'}
            </p>
            {isOnline && connectionType !== 'unknown' && (
              <p className="text-xs opacity-75">
                连接类型: {connectionType}
              </p>
            )}
            {!isOnline && (
              <p className="text-xs opacity-75">
                请检查网络设置
              </p>
            )}
          </div>
          {!isOnline && showRetryButton && onRetry && (
            <button
              onClick={onRetry}
              className="flex-shrink-0 p-1 rounded-full hover:bg-red-100 transition-colors"
              title="重试连接"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// 网络状态 Hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [isSlowConnection, setIsSlowConnection] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    const updateConnectionInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          const effectiveType = connection.effectiveType || 'unknown'
          setConnectionType(effectiveType)
          
          // 判断是否为慢速连接
          setIsSlowConnection(
            effectiveType === 'slow-2g' || 
            effectiveType === '2g' || 
            (connection.downlink && connection.downlink < 1.5)
          )
        }
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', updateConnectionInfo)
        updateConnectionInfo()
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          connection.removeEventListener('change', updateConnectionInfo)
        }
      }
    }
  }, [])

  return {
    isOnline,
    connectionType,
    isSlowConnection
  }
}