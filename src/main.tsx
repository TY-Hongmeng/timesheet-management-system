import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { SimpleStartupProgress } from './components/SimpleStartupProgress'
import './index.css'

// 简单的应用包装器
const AppWrapper: React.FC = () => {
  const [showProgress, setShowProgress] = useState(true)

  const handleProgressComplete = () => {
    setShowProgress(false)
  }

  useEffect(() => {
    // 注册 Service Worker（在生产环境或本地环境均可）
    if ('serviceWorker' in navigator) {
      const basePath = window.location.pathname.includes('/timesheet-management-system') ? '/timesheet-management-system' : ''
      const swUrl = basePath ? `${basePath}/sw.js` : '/sw.js'

      navigator.serviceWorker
        // 依赖默认作用域，避免 GitHub Pages 作用域限制
        .register(swUrl)
        .then(reg => {
          console.log('[SW] Registered:', reg)

          // 如果已有等待中的 SW，通知跳过等待并立即激活
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          }

          // 监听更新事件，安装完成后强制启用新 SW
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing || reg.waiting
            if (!newWorker) return
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                // 如果已有控制器，表示更新，通知跳过等待
                if (navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' })
                  // 刷新页面以让新 SW 接管
                  setTimeout(() => window.location.reload(), 100)
                }
              }
            })
          })
        })
        .catch(err => {
          console.error('[SW] Registration failed:', err)
        })
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
