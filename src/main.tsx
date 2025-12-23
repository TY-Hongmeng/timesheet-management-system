import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { SimpleStartupProgress } from './components/SimpleStartupProgress'
import { initAutoDeleteTimer } from './utils/recycleBin'
import './index.css'
import './utils/polyfills'
import { initMobileCompatibility, checkBrowserCompatibility } from './utils/polyfills'

// 简单的应用包装器
const AppWrapper: React.FC = () => {
  const [showProgress, setShowProgress] = useState(true)

  const handleProgressComplete = () => {
    setShowProgress(false)
  }

  // 初始化（登录页不触发回收站定时器，以免无关日志）
  useEffect(() => {
    const hash = window.location.hash || ''
    if (!hash.includes('/login')) {
      initAutoDeleteTimer()
    }
    initMobileCompatibility()
    checkBrowserCompatibility()
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // 开发环境：彻底禁用并清理已注册的 Service Worker 与缓存，避免离线页干扰
      if (import.meta.env.DEV) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(r => r.unregister())
        })
        caches.keys().then(names => {
          names.forEach(n => caches.delete(n))
        })
        return
      }

      // 生产环境：正常注册 Service Worker
      if (import.meta.env.PROD) {
        const isWeChat = /MicroMessenger/i.test(navigator.userAgent)
        if (isWeChat) {
          caches.keys().then(names => names.forEach(n => caches.delete(n))).catch(() => {})
          return
        }
        const swUrl = 'sw.js'

        navigator.serviceWorker
          .register(swUrl)
          .then(reg => {
            console.log('[SW] Registered:', reg)

            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' })
            }

            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing || reg.waiting
              if (!newWorker) return
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' })
                  setTimeout(() => window.location.reload(), 100)
                }
              })
            })
          })
          .catch(err => {
            console.error('[SW] Registration failed:', err)
          })
      }
    }
  }, [])

  // 显示进度条或主应用
  return showProgress ? 
    <SimpleStartupProgress onComplete={handleProgressComplete} /> : 
    <App />
}

// 启动应用
const rootElement = document.getElementById('root')
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(<AppWrapper />)
}
